-- Escalate unresolved workflow action failures older than one hour to admin
-- staff. If pg_cron is available, schedule the escalation routine to run
-- every 15 minutes.

CREATE OR REPLACE FUNCTION public.escalate_stale_workflow_action_failures(
  p_threshold INTERVAL DEFAULT INTERVAL '1 hour',
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_failure_count INTEGER := 0;
  v_notification_count INTEGER := 0;
BEGIN
  WITH stale_failures AS (
    SELECT waf.id,
           waf.hospital_id,
           waf.workflow_event_id,
           waf.action_type,
           waf.error_message,
           waf.retry_attempts,
           waf.patient_id,
           COALESCE(we.event_type, waf.workflow_event_id) AS event_type
    FROM public.workflow_action_failures waf
    LEFT JOIN public.workflow_events we
      ON we.id::text = waf.workflow_event_id
    WHERE waf.resolved = FALSE
      AND waf.created_at <= v_now - p_threshold
      AND COALESCE(waf.action_metadata ->> 'escalated_at', '') = ''
    ORDER BY waf.created_at ASC
    LIMIT p_limit
  ),
  admin_recipients AS (
    SELECT DISTINCT p.hospital_id, p.user_id
    FROM public.profiles p
    JOIN public.user_roles ur
      ON ur.user_id = p.user_id
     AND ur.hospital_id = p.hospital_id
    WHERE ur.role IN ('admin', 'super_admin')
  ),
  inserted_notifications AS (
    INSERT INTO public.notifications (
      hospital_id,
      recipient_id,
      sender_id,
      type,
      title,
      message,
      priority,
      category,
      action_url,
      metadata
    )
    SELECT
      sf.hospital_id,
      ar.user_id,
      NULL,
      'alert',
      'Workflow action failure requires review',
      format(
        'Workflow event %s failed action %s after %s retries: %s',
        sf.event_type,
        sf.action_type,
        sf.retry_attempts,
        sf.error_message
      ),
      'urgent',
      'system',
      '/integration/workflow',
      jsonb_build_object(
        'workflow_action_failure_id', sf.id,
        'workflow_event_id', sf.workflow_event_id,
        'event_type', sf.event_type,
        'action_type', sf.action_type,
        'patient_id', sf.patient_id,
        'escalated_at', v_now
      )
    FROM stale_failures sf
    JOIN admin_recipients ar
      ON ar.hospital_id = sf.hospital_id
    RETURNING 1
  ),
  updated_failures AS (
    UPDATE public.workflow_action_failures waf
    SET action_metadata = COALESCE(waf.action_metadata, '{}'::jsonb) || jsonb_build_object(
          'escalated_at', v_now,
          'escalation_target', 'admin'
        ),
        updated_at = v_now
    WHERE waf.id IN (SELECT id FROM stale_failures)
    RETURNING 1
  )
  SELECT
    (SELECT COUNT(*) FROM updated_failures),
    (SELECT COUNT(*) FROM inserted_notifications)
  INTO v_failure_count, v_notification_count;

  RETURN jsonb_build_object(
    'checked_at', v_now,
    'escalated_failures', COALESCE(v_failure_count, 0),
    'notifications_created', COALESCE(v_notification_count, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.escalate_stale_workflow_action_failures(INTERVAL, INTEGER) IS
  'Escalates unresolved workflow_action_failures older than the threshold to admin users via notifications.';

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN insufficient_privilege OR undefined_file THEN
    RAISE NOTICE 'pg_cron unavailable in this environment; workflow failure escalation must be invoked manually or via Edge Function scheduler.';
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'workflow-action-failure-escalation-hourly'
    ) THEN
      PERFORM cron.schedule(
        'workflow-action-failure-escalation-hourly',
        '*/15 * * * *',
        $cron$SELECT public.escalate_stale_workflow_action_failures(INTERVAL '1 hour', 100);$cron$
      );
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'cron.job table unavailable; workflow failure escalation schedule not installed.';
END;
$$;
