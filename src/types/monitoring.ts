// Real-time Monitoring System Types
// Phase 1: Admin Real-time Monitoring Dashboard

export interface SystemMetric {
  id: string;
  timestamp: string;
  service: string;
  metric_name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

export interface SystemAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  category: 'system' | 'security' | 'performance' | 'clinical';
  source: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric_name: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notification_channels: ('email' | 'sms' | 'in_app')[];
}

export interface StaffProductivityMetric {
  staff_id: string;
  staff_name: string;
  role: string;
  metrics: {
    patients_seen: number;
    avg_consultation_time: number;
    tasks_completed: number;
    response_time_avg: number;
  };
  performance_score: number;
  timestamp: string;
}

export interface PatientFlowMetric {
  timestamp: string;
  waiting_patients: number;
  in_consultation: number;
  completed_today: number;
  avg_wait_time: number;
  bottlenecks: Array<{
    location: string;
    severity: 'low' | 'medium' | 'high';
    count: number;
  }>;
}

export interface SystemHealthStatus {
  overall_status: 'healthy' | 'degraded' | 'critical';
  uptime_percentage: number;
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    response_time: number;
    last_check: string;
  }>;
  database: {
    status: 'healthy' | 'slow' | 'critical';
    connections: number;
    query_performance: number;
  };
  api: {
    requests_per_minute: number;
    error_rate: number;
    avg_response_time: number;
  };
}

export interface RealTimeDashboardData {
  system_health: SystemHealthStatus;
  active_alerts: SystemAlert[];
  staff_productivity: StaffProductivityMetric[];
  patient_flow: PatientFlowMetric;
  recent_metrics: SystemMetric[];
}
