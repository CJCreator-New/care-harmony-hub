-- Migration: 20260909000004_discharge_workflow_row_locking.sql
-- Description: Enforce row-level locking (SELECT ... FOR UPDATE) and hospital scoping
-- on multi-role discharge workflow transitions to prevent concurrency races.

CREATE OR REPLACE FUNCTION public.transition_discharge_workflow(
  p_workflow_id UUID,
  p_hospital_id UUID,
  p_expected_step TEXT,
  p_next_step TEXT,
  p_next_status TEXT,
  p_actor_id UUID,
  p_rejection_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.discharge_workflows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow public.discharge_workflows;
BEGIN
  -- Row-level locking to prevent race conditions during concurrent approvals (ADR-0003)
  SELECT * INTO v_workflow
  FROM public.discharge_workflows
  WHERE id = p_workflow_id
    AND hospital_id = p_hospital_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORKFLOW_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_workflow.current_step != p_expected_step THEN
    RAISE EXCEPTION 'STEP_MISMATCH: expected %, got %', p_expected_step, v_workflow.current_step
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.discharge_workflows
  SET current_step = p_next_step,
      status = p_next_status,
      last_action_by = p_actor_id,
      last_action_at = NOW(),
      rejection_reason = p_rejection_reason,
      metadata = COALESCE(v_workflow.metadata, '{}'::jsonb) || p_metadata,
      updated_at = NOW()
  WHERE id = p_workflow_id
    AND hospital_id = p_hospital_id
    AND current_step = p_expected_step
  RETURNING * INTO v_workflow;

  RETURN v_workflow;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_discharge_workflow TO authenticated, service_role;

COMMENT ON FUNCTION public.transition_discharge_workflow IS
  'Atomic, row-locked transition for multi-role discharge workflows preventing race conditions.';
