-- Fix: get_dashboard_stats RPC references non-existent `last_seen` column on profiles
-- Root cause: activeStaff subquery used `last_seen` which was never added to profiles.
--             The column is `is_staff` (bool) added in earlier migrations.
--             When the function errored, ALL KPI cards showed 0.

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_hospital_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
    v_week_start DATE := DATE_TRUNC('week', CURRENT_DATE);
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        -- Patient Statistics
        'totalPatients', COALESCE((
            SELECT COUNT(*)
            FROM patients
            WHERE hospital_id = p_hospital_id
            AND is_active = true
        ), 0),

        'newPatientsThisMonth', COALESCE((
            SELECT COUNT(*)
            FROM patients
            WHERE hospital_id = p_hospital_id
            AND created_at >= v_month_start
        ), 0),

        -- Appointment Statistics
        'todayAppointments', COALESCE((
            SELECT COUNT(*)
            FROM appointments
            WHERE hospital_id = p_hospital_id
            AND scheduled_date = v_today
        ), 0),

        'completedToday', COALESCE((
            SELECT COUNT(*)
            FROM appointments
            WHERE hospital_id = p_hospital_id
            AND scheduled_date = v_today
            AND status = 'completed'
        ), 0),

        'cancelledToday', COALESCE((
            SELECT COUNT(*)
            FROM appointments
            WHERE hospital_id = p_hospital_id
            AND scheduled_date = v_today
            AND status = 'cancelled'
        ), 0),

        -- Staff Statistics  (FIXED: was using non-existent `last_seen` column)
        'activeStaff', COALESCE((
            SELECT COUNT(*)
            FROM profiles
            WHERE hospital_id = p_hospital_id
            AND is_staff = true
            AND COALESCE(is_active, true) = true
        ), 0),

        'staffByRole', COALESCE((
            SELECT jsonb_object_agg(role, cnt)
            FROM (
                SELECT ur.role, COUNT(*) AS cnt
                FROM user_roles ur
                JOIN profiles p ON p.user_id = ur.user_id
                WHERE ur.hospital_id = p_hospital_id
                AND COALESCE(p.is_active, true) = true
                GROUP BY ur.role
            ) subq
        ), '{}'::JSONB),

        -- Financial Statistics
        'monthlyRevenue', COALESCE((
            SELECT SUM(paid_amount)
            FROM invoices
            WHERE hospital_id = p_hospital_id
            AND created_at >= v_month_start
        ), 0),

        'pendingInvoices', COALESCE((
            SELECT COUNT(*)
            FROM invoices
            WHERE hospital_id = p_hospital_id
            AND status = 'pending'
        ), 0),

        'pendingAmount', COALESCE((
            SELECT SUM(total)
            FROM invoices
            WHERE hospital_id = p_hospital_id
            AND status = 'pending'
        ), 0),

        -- Clinical Statistics
        'pendingPrescriptions', COALESCE((
            SELECT COUNT(*)
            FROM prescriptions
            WHERE hospital_id = p_hospital_id
            AND status = 'pending'
        ), 0),

        'pendingLabOrders', COALESCE((
            SELECT COUNT(*)
            FROM lab_orders
            WHERE hospital_id = p_hospital_id
            AND status IN ('pending', 'in_progress')
        ), 0),

        'criticalLabOrders', COALESCE((
            SELECT COUNT(*)
            FROM lab_orders
            WHERE hospital_id = p_hospital_id
            AND is_critical = true
            AND status != 'completed'
        ), 0),

        -- Queue Statistics
        'queueWaiting', COALESCE((
            SELECT COUNT(*)
            FROM patient_queue
            WHERE hospital_id = p_hospital_id
            AND status IN ('waiting', 'called')
        ), 0),

        'queueInService', COALESCE((
            SELECT COUNT(*)
            FROM patient_queue
            WHERE hospital_id = p_hospital_id
            AND status = 'in_service'
        ), 0),

        -- Resource Statistics
        'bedOccupancy', COALESCE((
            SELECT CASE
                WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND(
                    COUNT(*) FILTER (WHERE status = 'occupied') * 100.0 / COUNT(*)
                )
            END
            FROM hospital_resources
            WHERE hospital_id = p_hospital_id
            AND resource_type = 'bed'
        ), 0),

        -- Weekly Trend Data
        'weeklyTrend', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'day', day_name,
                'scheduled', scheduled_count,
                'completed', completed_count,
                'cancelled', cancelled_count
            ) ORDER BY day_num)
            FROM (
                SELECT
                    TO_CHAR(scheduled_date, 'Dy') AS day_name,
                    EXTRACT(DOW FROM scheduled_date) AS day_num,
                    COUNT(*) AS scheduled_count,
                    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
                    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count
                FROM appointments
                WHERE hospital_id = p_hospital_id
                AND scheduled_date >= v_week_start
                AND scheduled_date < v_week_start + INTERVAL '7 days'
                GROUP BY scheduled_date
            ) trend_data
        ), '[]'::JSONB),

        -- Performance Metrics
        'avgWaitTime', COALESCE((
            SELECT ROUND(AVG(
                EXTRACT(EPOCH FROM (service_start_time - check_in_time)) / 60
            ))
            FROM patient_queue
            WHERE hospital_id = p_hospital_id
            AND check_in_time >= v_today
            AND service_start_time IS NOT NULL
        ), 15),

        -- Timestamp for cache validation
        'generatedAt', EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Ensure permissions are set
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO anon;

COMMENT ON FUNCTION get_dashboard_stats(UUID) IS
'Returns comprehensive dashboard statistics for a hospital in a single query.
Replaces 14+ individual API calls with one database function call.
Fix (2026-02-22): removed non-existent last_seen column; use is_staff = true for activeStaff.';
