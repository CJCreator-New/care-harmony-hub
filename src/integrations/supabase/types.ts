export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type AppRole =
  | 'admin'
  | 'super_admin'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'pharmacist'
  | 'lab_technician'
  | 'patient';

export type Database = {
  public: {
    Tables: {
      [key: string]: GenericTable;
      discharge_workflows: {
        Row: {
          id: string;
          hospital_id: string;
          patient_id: string;
          consultation_id: string | null;
          initiated_by: string;
          current_step: 'doctor' | 'pharmacist' | 'billing' | 'nurse' | 'completed' | 'cancelled';
          status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
          last_action_by: string | null;
          last_action_at: string | null;
          rejection_reason: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hospital_id: string;
          patient_id: string;
          consultation_id?: string | null;
          initiated_by: string;
          current_step?: 'doctor' | 'pharmacist' | 'billing' | 'nurse' | 'completed' | 'cancelled';
          status?: 'draft' | 'in_progress' | 'completed' | 'cancelled';
          last_action_by?: string | null;
          last_action_at?: string | null;
          rejection_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          hospital_id?: string;
          patient_id?: string;
          consultation_id?: string | null;
          initiated_by?: string;
          current_step?: 'doctor' | 'pharmacist' | 'billing' | 'nurse' | 'completed' | 'cancelled';
          status?: 'draft' | 'in_progress' | 'completed' | 'cancelled';
          last_action_by?: string | null;
          last_action_at?: string | null;
          rejection_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      discharge_workflow_audit: {
        Row: {
          id: string;
          workflow_id: string;
          hospital_id: string;
          patient_id: string;
          actor_id: string;
          actor_role: string;
          transition_action: 'initiate' | 'approve' | 'reject' | 'cancel';
          from_step: string | null;
          to_step: string | null;
          reason: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          hospital_id: string;
          patient_id: string;
          actor_id: string;
          actor_role: string;
          transition_action: 'initiate' | 'approve' | 'reject' | 'cancel';
          from_step?: string | null;
          to_step?: string | null;
          reason?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          hospital_id?: string;
          patient_id?: string;
          actor_id?: string;
          actor_role?: string;
          transition_action?: 'initiate' | 'approve' | 'reject' | 'cancel';
          from_step?: string | null;
          to_step?: string | null;
          reason?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      patients: GenericTable;
      appointments: GenericTable;
      consultations: GenericTable;
      prescriptions: GenericTable;
      lab_orders: GenericTable;
      profiles: GenericTable;
      user_roles: GenericTable;
      notifications: GenericTable;
      activity_logs: GenericTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      [key: string]: string;
    };
    CompositeTypes: Record<string, never>;
  };
};
