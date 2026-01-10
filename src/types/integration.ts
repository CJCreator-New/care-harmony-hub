// Phase 8: Cross-Role Integration Types
export interface TaskAssignment {
  id: string;
  title: string;
  description?: string;
  assigned_by: string;
  assigned_to: string;
  patient_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  assigned_by_profile?: {
    full_name: string;
    role: string;
  };
  assigned_to_profile?: {
    full_name: string;
    role: string;
  };
  patient?: {
    full_name: string;
    mrn: string;
  };
}

export interface PatientStatusBoard {
  id: string;
  patient_id: string;
  current_location: string;
  status: 'waiting' | 'in_progress' | 'ready' | 'completed';
  assigned_staff?: string;
  estimated_duration?: number;
  actual_start_time?: string;
  estimated_completion?: string;
  notes?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  patient: {
    full_name: string;
    mrn: string;
    date_of_birth: string;
  };
  staff?: {
    full_name: string;
    role: string;
  };
}

export interface ResourceAvailability {
  id: string;
  resource_type: 'room' | 'equipment' | 'staff';
  resource_id: string;
  resource_name: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  occupied_by?: string;
  available_from?: string;
  available_until?: string;
  hospital_id: string;
  updated_at: string;
  
  // Joined data
  occupant?: {
    full_name: string;
    mrn: string;
  };
}

export interface WorkflowQueue {
  id: string;
  queue_name: string;
  department: string;
  patient_id: string;
  priority_score: number;
  wait_time_minutes: number;
  queue_position: number;
  status: 'waiting' | 'called' | 'in_service' | 'completed';
  hospital_id: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  patient: {
    full_name: string;
    mrn: string;
    date_of_birth: string;
  };
}

export interface InterRoleMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  patient_id?: string;
  message_type: 'general' | 'urgent' | 'handoff' | 'alert';
  subject?: string;
  content: string;
  read_at?: string;
  acknowledged_at?: string;
  hospital_id: string;
  created_at: string;
  
  // Joined data
  sender: {
    full_name: string;
    role: string;
  };
  recipient: {
    full_name: string;
    role: string;
  };
  patient?: {
    full_name: string;
    mrn: string;
  };
}

export interface WorkflowMetric {
  id: string;
  metric_type: string;
  department?: string;
  staff_id?: string;
  patient_id?: string;
  metric_value: number;
  measurement_unit: string;
  recorded_date: string;
  hospital_id: string;
  created_at: string;
}

// Dashboard interfaces
export interface StatusBoardData {
  patients: PatientStatusBoard[];
  resources: ResourceAvailability[];
  queues: WorkflowQueue[];
  tasks: TaskAssignment[];
  messages: InterRoleMessage[];
}

export interface DepartmentMetrics {
  department: string;
  total_patients: number;
  average_wait_time: number;
  completion_rate: number;
  staff_utilization: number;
  resource_utilization: number;
}

export interface TaskSummary {
  total_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completed_today: number;
  high_priority_tasks: number;
}

export interface QueueMetrics {
  queue_name: string;
  current_count: number;
  average_wait_time: number;
  longest_wait: number;
  throughput_per_hour: number;
}

// Form interfaces
export interface CreateTaskForm {
  title: string;
  description?: string;
  assigned_to: string;
  patient_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: string;
}

export interface UpdatePatientStatusForm {
  current_location: string;
  status: 'waiting' | 'in_progress' | 'ready' | 'completed';
  assigned_staff?: string;
  estimated_duration?: number;
  notes?: string;
}

export interface SendMessageForm {
  recipient_id: string;
  patient_id?: string;
  message_type: 'general' | 'urgent' | 'handoff' | 'alert';
  subject?: string;
  content: string;
}

export interface ResourceUpdateForm {
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  occupied_by?: string;
  available_from?: string;
  available_until?: string;
}

// Filter and search interfaces
export interface TaskFilters {
  status?: string[];
  priority?: string[];
  assigned_to?: string;
  patient_id?: string;
  due_date_from?: string;
  due_date_to?: string;
}

export interface StatusBoardFilters {
  location?: string[];
  status?: string[];
  department?: string[];
  staff_id?: string;
}

export interface MessageFilters {
  message_type?: string[];
  unread_only?: boolean;
  sender_id?: string;
  patient_id?: string;
  date_from?: string;
  date_to?: string;
}

// Real-time update interfaces
export interface StatusUpdate {
  type: 'patient_status' | 'task_assignment' | 'resource_availability' | 'queue_update' | 'new_message';
  data: any;
  timestamp: string;
}

export interface NotificationPreferences {
  task_assignments: boolean;
  urgent_messages: boolean;
  patient_status_changes: boolean;
  queue_alerts: boolean;
  resource_conflicts: boolean;
}