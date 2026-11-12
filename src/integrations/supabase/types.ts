export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          hospital_id: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          severity: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          hospital_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          hospital_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      appointment_no_shows: {
        Row: {
          appointment_id: string
          flagged_at: string | null
          flagged_by: string
          follow_up_notes: string | null
          follow_up_status: string | null
          hospital_id: string
          id: string
          patient_notification_channel: string | null
          patient_notified_at: string | null
          reason_code: string
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          flagged_at?: string | null
          flagged_by: string
          follow_up_notes?: string | null
          follow_up_status?: string | null
          hospital_id: string
          id?: string
          patient_notification_channel?: string | null
          patient_notified_at?: string | null
          reason_code: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          flagged_at?: string | null
          flagged_by?: string
          follow_up_notes?: string | null
          follow_up_status?: string | null
          hospital_id?: string
          id?: string
          patient_notification_channel?: string | null
          patient_notified_at?: string | null
          reason_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_no_shows_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_no_shows_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_no_shows_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_recurrence_patterns: {
        Row: {
          appointment_id: string
          created_at: string | null
          created_by: string
          end_date: string | null
          exceptions: Json | null
          hospital_id: string
          id: string
          max_occurrences: number | null
          pattern_type: string
          recurrence_rule: Json
          start_date: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          created_by: string
          end_date?: string | null
          exceptions?: Json | null
          hospital_id: string
          id?: string
          max_occurrences?: number | null
          pattern_type: string
          recurrence_rule?: Json
          start_date: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          created_by?: string
          end_date?: string | null
          exceptions?: Json | null
          hospital_id?: string
          id?: string
          max_occurrences?: number | null
          pattern_type?: string
          recurrence_rule?: Json
          start_date?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_recurrence_patterns_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_recurrence_patterns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_recurrence_patterns_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_recurrence_patterns_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_requests: {
        Row: {
          alternate_date: string | null
          alternate_time: string | null
          appointment_type: string
          created_appointment_id: string | null
          created_at: string
          doctor_id: string | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          preferred_date: string
          preferred_time: string | null
          reason_for_visit: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alternate_date?: string | null
          alternate_time?: string | null
          appointment_type: string
          created_appointment_id?: string | null
          created_at?: string
          doctor_id?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          preferred_date: string
          preferred_time?: string | null
          reason_for_visit?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alternate_date?: string | null
          alternate_time?: string | null
          appointment_type?: string
          created_appointment_id?: string | null
          created_at?: string
          doctor_id?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          preferred_date?: string
          preferred_time?: string | null
          reason_for_visit?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_created_appointment_id_fkey"
            columns: ["created_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string | null
          appointment_type: string
          attended_at: string | null
          attended_by: string | null
          cancellation_reason: string | null
          check_in_time: string | null
          created_at: string
          created_by: string | null
          doctor_id: string | null
          duration_minutes: number | null
          end_time: string | null
          follow_up_contact_sent: boolean | null
          follow_up_required: boolean | null
          hospital_id: string
          id: string
          no_show_flagged_at: string | null
          notes: string | null
          patient_id: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          queue_number: number | null
          reason_for_visit: string | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          room_number: string | null
          scheduled_date: string
          scheduled_time: string
          start_time: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string
          waitlist_position: number | null
        }
        Insert: {
          appointment_date?: string | null
          appointment_type: string
          attended_at?: string | null
          attended_by?: string | null
          cancellation_reason?: string | null
          check_in_time?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          follow_up_contact_sent?: boolean | null
          follow_up_required?: boolean | null
          hospital_id: string
          id?: string
          no_show_flagged_at?: string | null
          notes?: string | null
          patient_id: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          queue_number?: number | null
          reason_for_visit?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          room_number?: string | null
          scheduled_date: string
          scheduled_time: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
          waitlist_position?: number | null
        }
        Update: {
          appointment_date?: string | null
          appointment_type?: string
          attended_at?: string | null
          attended_by?: string | null
          cancellation_reason?: string | null
          check_in_time?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          follow_up_contact_sent?: boolean | null
          follow_up_required?: boolean | null
          hospital_id?: string
          id?: string
          no_show_flagged_at?: string | null
          notes?: string | null
          patient_id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          queue_number?: number | null
          reason_for_visit?: string | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          room_number?: string | null
          scheduled_date?: string
          scheduled_time?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_attended_by_fkey"
            columns: ["attended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          action_type: string | null
          actor_id: string | null
          changes: Json | null
          created_at: string
          details: Json | null
          hospital_id: string
          id: string
          ip_address: string | null
          performed_by: string | null
          record_id: string | null
          resource: string | null
          resource_id: string | null
          resource_type: string | null
          severity: string | null
          table_name: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          action_type?: string | null
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          details?: Json | null
          hospital_id: string
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          record_id?: string | null
          resource?: string | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string | null
          table_name?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          action_type?: string | null
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          details?: Json | null
          hospital_id?: string
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          record_id?: string | null
          resource?: string | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string | null
          table_name?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      break_glass_overrides: {
        Row: {
          approved_by_role: string
          created_at: string
          emergency_level: string
          escalated_to_admin: boolean | null
          escalation_timestamp: string | null
          expires_at: string
          hospital_id: string
          id: string
          override_type: string
          patient_id: string
          reason_hash: string
          reason_sanitized: string
          status: string
          triggered_by_user_id: string
          updated_at: string | null
        }
        Insert: {
          approved_by_role: string
          created_at?: string
          emergency_level: string
          escalated_to_admin?: boolean | null
          escalation_timestamp?: string | null
          expires_at: string
          hospital_id: string
          id?: string
          override_type: string
          patient_id: string
          reason_hash: string
          reason_sanitized: string
          status?: string
          triggered_by_user_id: string
          updated_at?: string | null
        }
        Update: {
          approved_by_role?: string
          created_at?: string
          emergency_level?: string
          escalated_to_admin?: boolean | null
          escalation_timestamp?: string | null
          expires_at?: string
          hospital_id?: string
          id?: string
          override_type?: string
          patient_id?: string
          reason_hash?: string
          reason_sanitized?: string
          status?: string
          triggered_by_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "break_glass_overrides_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "break_glass_overrides_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "break_glass_overrides_triggered_by_user_id_fkey"
            columns: ["triggered_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      consultations: {
        Row: {
          appointment_id: string | null
          auto_save_data: Json | null
          billing_notified: boolean | null
          chief_complaint: string | null
          clinical_notes: string | null
          completed_at: string | null
          created_at: string
          current_step: number | null
          diagnoses: Json | null
          doctor_id: string
          encryption_metadata: Json | null
          final_diagnosis: string[] | null
          follow_up_date: string | null
          follow_up_notes: string | null
          handoff_notes: string | null
          history_of_present_illness: string | null
          hospital_id: string
          id: string
          lab_notified: boolean | null
          lab_orders: Json | null
          last_auto_save: string | null
          nurse_id: string | null
          patient_id: string
          pharmacy_notified: boolean | null
          physical_examination: Json | null
          prescriptions: Json | null
          provisional_diagnosis: string[] | null
          referrals: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["consultation_status"] | null
          symptoms: string[] | null
          treatment_plan: string | null
          updated_at: string
          vitals: Json | null
        }
        Insert: {
          appointment_id?: string | null
          auto_save_data?: Json | null
          billing_notified?: boolean | null
          chief_complaint?: string | null
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          diagnoses?: Json | null
          doctor_id: string
          encryption_metadata?: Json | null
          final_diagnosis?: string[] | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          handoff_notes?: string | null
          history_of_present_illness?: string | null
          hospital_id: string
          id?: string
          lab_notified?: boolean | null
          lab_orders?: Json | null
          last_auto_save?: string | null
          nurse_id?: string | null
          patient_id: string
          pharmacy_notified?: boolean | null
          physical_examination?: Json | null
          prescriptions?: Json | null
          provisional_diagnosis?: string[] | null
          referrals?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"] | null
          symptoms?: string[] | null
          treatment_plan?: string | null
          updated_at?: string
          vitals?: Json | null
        }
        Update: {
          appointment_id?: string | null
          auto_save_data?: Json | null
          billing_notified?: boolean | null
          chief_complaint?: string | null
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          diagnoses?: Json | null
          doctor_id?: string
          encryption_metadata?: Json | null
          final_diagnosis?: string[] | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          handoff_notes?: string | null
          history_of_present_illness?: string | null
          hospital_id?: string
          id?: string
          lab_notified?: boolean | null
          lab_orders?: Json | null
          last_auto_save?: string | null
          nurse_id?: string | null
          patient_id?: string
          pharmacy_notified?: boolean | null
          physical_examination?: Json | null
          prescriptions?: Json | null
          provisional_diagnosis?: string[] | null
          referrals?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"] | null
          symptoms?: string[] | null
          treatment_plan?: string | null
          updated_at?: string
          vitals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      critical_value_notifications: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          critical_value: string
          escalated_at: string | null
          escalation_level: number | null
          hospital_id: string | null
          id: string
          lab_result_id: string | null
          loinc_code: string | null
          notification_level: number | null
          notified_at: string | null
          patient_id: string | null
          read_back_verified: boolean | null
          resolution_notes: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          critical_value: string
          escalated_at?: string | null
          escalation_level?: number | null
          hospital_id?: string | null
          id?: string
          lab_result_id?: string | null
          loinc_code?: string | null
          notification_level?: number | null
          notified_at?: string | null
          patient_id?: string | null
          read_back_verified?: boolean | null
          resolution_notes?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          critical_value?: string
          escalated_at?: string | null
          escalation_level?: number | null
          hospital_id?: string | null
          id?: string
          lab_result_id?: string | null
          loinc_code?: string | null
          notification_level?: number | null
          notified_at?: string | null
          patient_id?: string | null
          read_back_verified?: boolean | null
          resolution_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "critical_value_notifications_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_value_notifications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_value_notifications_lab_result_id_fkey"
            columns: ["lab_result_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_value_notifications_loinc_code_fkey"
            columns: ["loinc_code"]
            isOneToOne: false
            referencedRelation: "loinc_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "critical_value_notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          head_of_department: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          head_of_department?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          head_of_department?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_of_department_fkey"
            columns: ["head_of_department"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      discharge_workflow_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          discharge_workflow_id: string
          evidence_data: Json | null
          hospital_id: string
          id: string
          notes: string | null
          status: string
          step_number: number
          task_category: string
          task_name: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          discharge_workflow_id: string
          evidence_data?: Json | null
          hospital_id: string
          id?: string
          notes?: string | null
          status?: string
          step_number: number
          task_category: string
          task_name: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          discharge_workflow_id?: string
          evidence_data?: Json | null
          hospital_id?: string
          id?: string
          notes?: string | null
          status?: string
          step_number?: number
          task_category?: string
          task_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discharge_workflow_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflow_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflow_tasks_discharge_workflow_id_fkey"
            columns: ["discharge_workflow_id"]
            isOneToOne: false
            referencedRelation: "discharge_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflow_tasks_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      discharge_workflows: {
        Row: {
          admission_id: string
          billing_clearance_at: string | null
          billing_clearance_by: string | null
          cancellation_reason: string | null
          checkout_details: Json | null
          clinical_notes: Json | null
          created_at: string | null
          current_step: number
          doctor_clearance_at: string | null
          doctor_clearance_by: string | null
          financial_details: Json | null
          hospital_id: string
          id: string
          initiated_by: string
          last_action_at: string | null
          last_action_by: string | null
          medication_reconciliation: Json | null
          metadata: Json | null
          nurse_confirmed_at: string | null
          nurse_confirmed_by: string | null
          patient_id: string
          pharmacist_reconciliation_at: string | null
          pharmacist_reconciliation_by: string | null
          receptionist_checkout_at: string | null
          receptionist_checkout_by: string | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admission_id: string
          billing_clearance_at?: string | null
          billing_clearance_by?: string | null
          cancellation_reason?: string | null
          checkout_details?: Json | null
          clinical_notes?: Json | null
          created_at?: string | null
          current_step?: number
          doctor_clearance_at?: string | null
          doctor_clearance_by?: string | null
          financial_details?: Json | null
          hospital_id: string
          id?: string
          initiated_by: string
          last_action_at?: string | null
          last_action_by?: string | null
          medication_reconciliation?: Json | null
          metadata?: Json | null
          nurse_confirmed_at?: string | null
          nurse_confirmed_by?: string | null
          patient_id: string
          pharmacist_reconciliation_at?: string | null
          pharmacist_reconciliation_by?: string | null
          receptionist_checkout_at?: string | null
          receptionist_checkout_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admission_id?: string
          billing_clearance_at?: string | null
          billing_clearance_by?: string | null
          cancellation_reason?: string | null
          checkout_details?: Json | null
          clinical_notes?: Json | null
          created_at?: string | null
          current_step?: number
          doctor_clearance_at?: string | null
          doctor_clearance_by?: string | null
          financial_details?: Json | null
          hospital_id?: string
          id?: string
          initiated_by?: string
          last_action_at?: string | null
          last_action_by?: string | null
          medication_reconciliation?: Json | null
          metadata?: Json | null
          nurse_confirmed_at?: string | null
          nurse_confirmed_by?: string | null
          patient_id?: string
          pharmacist_reconciliation_at?: string | null
          pharmacist_reconciliation_by?: string | null
          receptionist_checkout_at?: string | null
          receptionist_checkout_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discharge_workflows_billing_clearance_by_fkey"
            columns: ["billing_clearance_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflows_doctor_clearance_by_fkey"
            columns: ["doctor_clearance_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflows_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflows_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflows_last_action_by_fkey"
            columns: ["last_action_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflows_nurse_confirmed_by_fkey"
            columns: ["nurse_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflows_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflows_pharmacist_reconciliation_by_fkey"
            columns: ["pharmacist_reconciliation_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_workflows_receptionist_checkout_by_fkey"
            columns: ["receptionist_checkout_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          doctor_id: string
          end_time: string
          hospital_id: string
          id: string
          is_active: boolean | null
          is_telemedicine: boolean | null
          slot_duration_minutes: number | null
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          doctor_id: string
          end_time: string
          hospital_id: string
          id?: string
          is_active?: boolean | null
          is_telemedicine?: boolean | null
          slot_duration_minutes?: number | null
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          is_telemedicine?: boolean | null
          slot_duration_minutes?: number | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_availability_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_availability_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          consultation_id: string | null
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          hospital_id: string
          id: string
          is_confidential: boolean | null
          mime_type: string | null
          patient_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string
          description?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          hospital_id: string
          id?: string
          is_confidential?: boolean | null
          mime_type?: string | null
          patient_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          consultation_id?: string | null
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          hospital_id?: string
          id?: string
          is_confidential?: boolean | null
          mime_type?: string | null
          patient_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_interaction_cache: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          details: Json | null
          expires_at: string | null
          hospital_id: string
          id: string
          interactions_found: number | null
          new_drug_name: string
          new_drug_rxcui: string
          patient_id: string
          severity_max: string | null
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          details?: Json | null
          expires_at?: string | null
          hospital_id: string
          id?: string
          interactions_found?: number | null
          new_drug_name: string
          new_drug_rxcui: string
          patient_id: string
          severity_max?: string | null
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          details?: Json | null
          expires_at?: string | null
          hospital_id?: string
          id?: string
          interactions_found?: number | null
          new_drug_name?: string
          new_drug_rxcui?: string
          patient_id?: string
          severity_max?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_interaction_cache_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_interaction_cache_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_interaction_cache_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_interactions: {
        Row: {
          age_ranges: Json | null
          clinical_recommendation: string | null
          contraindicated_in_lactation: boolean | null
          contraindicated_in_pregnancy: boolean | null
          created_at: string | null
          description: string
          drug1_name: string
          drug1_rxcui: string
          drug2_name: string
          drug2_rxcui: string
          evidence_level: string | null
          excludes_formulations: string[] | null
          excludes_routes: string[] | null
          external_id: string | null
          hospital_id: string
          id: string
          mechanism: string | null
          pregnancy_note: string | null
          severity: string
          source: string
          updated_at: string | null
        }
        Insert: {
          age_ranges?: Json | null
          clinical_recommendation?: string | null
          contraindicated_in_lactation?: boolean | null
          contraindicated_in_pregnancy?: boolean | null
          created_at?: string | null
          description: string
          drug1_name: string
          drug1_rxcui: string
          drug2_name: string
          drug2_rxcui: string
          evidence_level?: string | null
          excludes_formulations?: string[] | null
          excludes_routes?: string[] | null
          external_id?: string | null
          hospital_id: string
          id?: string
          mechanism?: string | null
          pregnancy_note?: string | null
          severity?: string
          source?: string
          updated_at?: string | null
        }
        Update: {
          age_ranges?: Json | null
          clinical_recommendation?: string | null
          contraindicated_in_lactation?: boolean | null
          contraindicated_in_pregnancy?: boolean | null
          created_at?: string | null
          description?: string
          drug1_name?: string
          drug1_rxcui?: string
          drug2_name?: string
          drug2_rxcui?: string
          evidence_level?: string | null
          excludes_formulations?: string[] | null
          excludes_routes?: string[] | null
          external_id?: string | null
          hospital_id?: string
          id?: string
          mechanism?: string | null
          pregnancy_note?: string | null
          severity?: string
          source?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_interactions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          flag_name: string
          hospital_id: string
          id: string
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag_name: string
          hospital_id: string
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag_name?: string
          hospital_id?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_resources: {
        Row: {
          capacity: number | null
          code: string | null
          created_at: string | null
          current_patient_id: string | null
          department_id: string | null
          floor: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          resource_type: string
          status: string | null
          updated_at: string | null
          wing: string | null
        }
        Insert: {
          capacity?: number | null
          code?: string | null
          created_at?: string | null
          current_patient_id?: string | null
          department_id?: string | null
          floor?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          resource_type: string
          status?: string | null
          updated_at?: string | null
          wing?: string | null
        }
        Update: {
          capacity?: number | null
          code?: string | null
          created_at?: string | null
          current_patient_id?: string | null
          department_id?: string | null
          floor?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          resource_type?: string
          status?: string | null
          updated_at?: string | null
          wing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_resources_current_patient_id_fkey"
            columns: ["current_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_resources_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospital_resources_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          license_number: string | null
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      icd10_codes: {
        Row: {
          category: string | null
          chapter: string | null
          code: string
          created_at: string | null
          id: string
          is_billable: boolean | null
          long_description: string | null
          short_description: string
        }
        Insert: {
          category?: string | null
          chapter?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_billable?: boolean | null
          long_description?: string | null
          short_description: string
        }
        Update: {
          category?: string | null
          chapter?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_billable?: boolean | null
          long_description?: string | null
          short_description?: string
        }
        Relationships: []
      }
      insurance_claims: {
        Row: {
          approved_amount: number | null
          claim_amount: number
          claim_number: string
          created_at: string
          denial_reason: string | null
          diagnosis_codes: string[] | null
          group_number: string | null
          hospital_id: string
          id: string
          insurance_provider: string
          invoice_id: string | null
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          patient_id: string
          patient_responsibility: number | null
          policy_number: string | null
          procedure_codes: string[] | null
          reviewed_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          claim_amount?: number
          claim_number: string
          created_at?: string
          denial_reason?: string | null
          diagnosis_codes?: string[] | null
          group_number?: string | null
          hospital_id: string
          id?: string
          insurance_provider: string
          invoice_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          patient_id: string
          patient_responsibility?: number | null
          policy_number?: string | null
          procedure_codes?: string[] | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          claim_amount?: number
          claim_number?: string
          created_at?: string
          denial_reason?: string | null
          diagnosis_codes?: string[] | null
          group_number?: string | null
          hospital_id?: string
          id?: string
          insurance_provider?: string
          invoice_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          patient_id?: string
          patient_responsibility?: number | null
          policy_number?: string | null
          procedure_codes?: string[] | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          item_type: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          item_type?: string
          quantity?: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_id: string | null
          consultation_id: string | null
          created_at: string
          created_by: string | null
          discount: number
          due_date: string | null
          hospital_id: string
          id: string
          invoice_number: string
          notes: string | null
          paid_amount: number
          patient_id: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          due_date?: string | null
          hospital_id: string
          id?: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number
          patient_id: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          due_date?: string | null
          hospital_id?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number
          patient_id?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_alert_escalations: {
        Row: {
          alert_id: string
          attempt_count: number
          created_at: string
          delivery_log: Json
          dispatched_at: string | null
          error_message: string | null
          escalation_level: string
          hospital_id: string
          id: string
          last_attempt_at: string | null
          scheduled_for: string
          status: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          alert_id: string
          attempt_count?: number
          created_at?: string
          delivery_log?: Json
          dispatched_at?: string | null
          error_message?: string | null
          escalation_level: string
          hospital_id: string
          id?: string
          last_attempt_at?: string | null
          scheduled_for: string
          status?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          alert_id?: string
          attempt_count?: number
          created_at?: string
          delivery_log?: Json
          dispatched_at?: string | null
          error_message?: string | null
          escalation_level?: string
          hospital_id?: string
          id?: string
          last_attempt_at?: string | null
          scheduled_for?: string
          status?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_alert_escalations_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "lab_critical_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_alert_escalations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_alert_escalations_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_critical_acknowledgements: {
        Row: {
          ack_deadline: string
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledgement_note: string | null
          alert_sent_at: string
          created_at: string
          critical_values: Json
          escalated_at: string | null
          escalated_to: string | null
          escalation_level: number
          escalation_reason: string | null
          hospital_id: string
          id: string
          lab_order_id: string
          notified_physician: string
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          ack_deadline?: string
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgement_note?: string | null
          alert_sent_at?: string
          created_at?: string
          critical_values?: Json
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_level?: number
          escalation_reason?: string | null
          hospital_id: string
          id?: string
          lab_order_id: string
          notified_physician: string
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          ack_deadline?: string
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgement_note?: string | null
          alert_sent_at?: string
          created_at?: string
          critical_values?: Json
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_level?: number
          escalation_reason?: string | null
          hospital_id?: string
          id?: string
          lab_order_id?: string
          notified_physician?: string
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_critical_acknowledgements_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_acknowledgements_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_acknowledgements_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_acknowledgements_lab_order_id_fkey"
            columns: ["lab_order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_acknowledgements_notified_physician_fkey"
            columns: ["notified_physician"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_acknowledgements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_critical_alert_events: {
        Row: {
          actor_profile_id: string | null
          actor_user_id: string | null
          alert_id: string
          created_at: string
          details: Json
          escalation_id: string | null
          escalation_level: string | null
          event_type: string
          from_status: string | null
          hospital_id: string
          id: number
          to_status: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          actor_user_id?: string | null
          alert_id: string
          created_at?: string
          details?: Json
          escalation_id?: string | null
          escalation_level?: string | null
          event_type: string
          from_status?: string | null
          hospital_id: string
          id?: never
          to_status?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          actor_user_id?: string | null
          alert_id?: string
          created_at?: string
          details?: Json
          escalation_id?: string | null
          escalation_level?: string | null
          event_type?: string
          from_status?: string | null
          hospital_id?: string
          id?: never
          to_status?: string | null
        }
        Relationships: []
      }
      lab_critical_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledgment_channel: string | null
          acknowledgment_details: Json
          acknowledgment_notes: string | null
          created_at: string | null
          created_by: string | null
          critical_range_id: string | null
          er_acknowledged_at: string | null
          er_action_notes: string | null
          er_action_taken: boolean | null
          er_notified_at: string | null
          hospital_id: string
          id: string
          is_resolved: boolean
          lab_order_id: string | null
          lab_result_id: string | null
          metadata: Json | null
          on_call_acknowledged_at: string | null
          on_call_action_notes: string | null
          on_call_action_taken: boolean | null
          on_call_id: string | null
          on_call_notified_at: string | null
          patient_id: string
          primary_acknowledged_at: string | null
          primary_action_notes: string | null
          primary_action_taken: boolean | null
          primary_doctor_id: string | null
          primary_notified_at: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          result_text: string | null
          result_value: number | null
          severity: string
          test_code: string
          test_name: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgment_channel?: string | null
          acknowledgment_details?: Json
          acknowledgment_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          critical_range_id?: string | null
          er_acknowledged_at?: string | null
          er_action_notes?: string | null
          er_action_taken?: boolean | null
          er_notified_at?: string | null
          hospital_id: string
          id?: string
          is_resolved?: boolean
          lab_order_id?: string | null
          lab_result_id?: string | null
          metadata?: Json | null
          on_call_acknowledged_at?: string | null
          on_call_action_notes?: string | null
          on_call_action_taken?: boolean | null
          on_call_id?: string | null
          on_call_notified_at?: string | null
          patient_id: string
          primary_acknowledged_at?: string | null
          primary_action_notes?: string | null
          primary_action_taken?: boolean | null
          primary_doctor_id?: string | null
          primary_notified_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          result_text?: string | null
          result_value?: number | null
          severity?: string
          test_code: string
          test_name: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledgment_channel?: string | null
          acknowledgment_details?: Json
          acknowledgment_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          critical_range_id?: string | null
          er_acknowledged_at?: string | null
          er_action_notes?: string | null
          er_action_taken?: boolean | null
          er_notified_at?: string | null
          hospital_id?: string
          id?: string
          is_resolved?: boolean
          lab_order_id?: string | null
          lab_result_id?: string | null
          metadata?: Json | null
          on_call_acknowledged_at?: string | null
          on_call_action_notes?: string | null
          on_call_action_taken?: boolean | null
          on_call_id?: string | null
          on_call_notified_at?: string | null
          patient_id?: string
          primary_acknowledged_at?: string | null
          primary_action_notes?: string | null
          primary_action_taken?: boolean | null
          primary_doctor_id?: string | null
          primary_notified_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          result_text?: string | null
          result_value?: number | null
          severity?: string
          test_code?: string
          test_name?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_critical_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_alerts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_alerts_critical_range_id_fkey"
            columns: ["critical_range_id"]
            isOneToOne: false
            referencedRelation: "lab_critical_ranges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_alerts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_alerts_lab_order_id_fkey"
            columns: ["lab_order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_alerts_lab_result_id_fkey"
            columns: ["lab_result_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_alerts_on_call_id_fkey"
            columns: ["on_call_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_alerts_primary_doctor_id_fkey"
            columns: ["primary_doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_critical_escalation_log: {
        Row: {
          ack_id: string
          created_at: string
          escalation_level: number
          hospital_id: string
          id: string
          notification_id: string | null
          notified_to: string
          reason: string | null
        }
        Insert: {
          ack_id: string
          created_at?: string
          escalation_level: number
          hospital_id: string
          id?: string
          notification_id?: string | null
          notified_to: string
          reason?: string | null
        }
        Update: {
          ack_id?: string
          created_at?: string
          escalation_level?: number
          hospital_id?: string
          id?: string
          notification_id?: string | null
          notified_to?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_critical_escalation_log_ack_id_fkey"
            columns: ["ack_id"]
            isOneToOne: false
            referencedRelation: "lab_critical_acknowledgements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_escalation_log_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_escalation_log_notified_to_fkey"
            columns: ["notified_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_critical_ranges: {
        Row: {
          age_group: string | null
          created_at: string | null
          created_by: string
          critical_high: number | null
          critical_low: number | null
          gender: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          notes: string | null
          test_code: string
          test_name: string
          unit_of_measure: string | null
          updated_at: string | null
          warning_high: number | null
          warning_low: number | null
        }
        Insert: {
          age_group?: string | null
          created_at?: string | null
          created_by: string
          critical_high?: number | null
          critical_low?: number | null
          gender?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          test_code: string
          test_name: string
          unit_of_measure?: string | null
          updated_at?: string | null
          warning_high?: number | null
          warning_low?: number | null
        }
        Update: {
          age_group?: string | null
          created_at?: string | null
          created_by?: string
          critical_high?: number | null
          critical_low?: number | null
          gender?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          test_code?: string
          test_name?: string
          unit_of_measure?: string | null
          updated_at?: string | null
          warning_high?: number | null
          warning_low?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_critical_ranges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_critical_ranges_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_interpretation_rules: {
        Row: {
          auto_flag: boolean | null
          condition_criteria: Json
          condition_type: string
          created_at: string | null
          id: string
          interpretation_text: string
          loinc_code: string | null
          severity_level: string | null
        }
        Insert: {
          auto_flag?: boolean | null
          condition_criteria: Json
          condition_type: string
          created_at?: string | null
          id?: string
          interpretation_text: string
          loinc_code?: string | null
          severity_level?: string | null
        }
        Update: {
          auto_flag?: boolean | null
          condition_criteria?: Json
          condition_type?: string
          created_at?: string | null
          id?: string
          interpretation_text?: string
          loinc_code?: string | null
          severity_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_interpretation_rules_loinc_code_fkey"
            columns: ["loinc_code"]
            isOneToOne: false
            referencedRelation: "loinc_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      lab_orders: {
        Row: {
          collected_at: string | null
          collected_by: string | null
          collection_notes: string | null
          completed_at: string | null
          consultation_id: string | null
          created_at: string
          critical_notified: boolean | null
          critical_notified_at: string | null
          hospital_id: string
          id: string
          is_critical: boolean | null
          loinc_code: string | null
          normal_range: string | null
          ordered_at: string
          ordered_by: string
          patient_id: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          processed_by: string | null
          result_notes: string | null
          results: Json | null
          sample_type: string | null
          specimen_collected_at: string | null
          specimen_type: string | null
          status: string
          test_category: string | null
          test_code: string | null
          test_name: string
          updated_at: string
        }
        Insert: {
          collected_at?: string | null
          collected_by?: string | null
          collection_notes?: string | null
          completed_at?: string | null
          consultation_id?: string | null
          created_at?: string
          critical_notified?: boolean | null
          critical_notified_at?: string | null
          hospital_id: string
          id?: string
          is_critical?: boolean | null
          loinc_code?: string | null
          normal_range?: string | null
          ordered_at?: string
          ordered_by: string
          patient_id: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          processed_by?: string | null
          result_notes?: string | null
          results?: Json | null
          sample_type?: string | null
          specimen_collected_at?: string | null
          specimen_type?: string | null
          status?: string
          test_category?: string | null
          test_code?: string | null
          test_name: string
          updated_at?: string
        }
        Update: {
          collected_at?: string | null
          collected_by?: string | null
          collection_notes?: string | null
          completed_at?: string | null
          consultation_id?: string | null
          created_at?: string
          critical_notified?: boolean | null
          critical_notified_at?: string | null
          hospital_id?: string
          id?: string
          is_critical?: boolean | null
          loinc_code?: string | null
          normal_range?: string | null
          ordered_at?: string
          ordered_by?: string
          patient_id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          processed_by?: string | null
          result_notes?: string | null
          results?: Json | null
          sample_type?: string | null
          specimen_collected_at?: string | null
          specimen_type?: string | null
          status?: string
          test_category?: string | null
          test_code?: string | null
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_loinc_code_fkey"
            columns: ["loinc_code"]
            isOneToOne: false
            referencedRelation: "loinc_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_qc_results: {
        Row: {
          actual_value: number | null
          created_at: string | null
          expected_value: number | null
          hospital_id: string | null
          id: string
          instrument_id: string | null
          loinc_code: string | null
          lot_number: string | null
          qc_level: string
          run_date: string
          technician_id: string | null
          variance_percent: number | null
          within_limits: boolean | null
        }
        Insert: {
          actual_value?: number | null
          created_at?: string | null
          expected_value?: number | null
          hospital_id?: string | null
          id?: string
          instrument_id?: string | null
          loinc_code?: string | null
          lot_number?: string | null
          qc_level: string
          run_date: string
          technician_id?: string | null
          variance_percent?: number | null
          within_limits?: boolean | null
        }
        Update: {
          actual_value?: number | null
          created_at?: string | null
          expected_value?: number | null
          hospital_id?: string | null
          id?: string
          instrument_id?: string | null
          loinc_code?: string | null
          lot_number?: string | null
          qc_level?: string
          run_date?: string
          technician_id?: string | null
          variance_percent?: number | null
          within_limits?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_qc_results_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_qc_results_loinc_code_fkey"
            columns: ["loinc_code"]
            isOneToOne: false
            referencedRelation: "loinc_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "lab_qc_results_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_result_notifications: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          acted_upon_at: string | null
          action_notes: string | null
          consent_logged: boolean | null
          consent_logged_at: string | null
          created_at: string | null
          hospital_id: string
          id: string
          is_critical: boolean | null
          lab_result_id: string
          metadata: Json | null
          notification_method: string | null
          notified_at: string | null
          ordering_doctor_id: string
          patient_id: string
          requires_immediate_action: boolean | null
          status: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acted_upon_at?: string | null
          action_notes?: string | null
          consent_logged?: boolean | null
          consent_logged_at?: string | null
          created_at?: string | null
          hospital_id: string
          id?: string
          is_critical?: boolean | null
          lab_result_id: string
          metadata?: Json | null
          notification_method?: string | null
          notified_at?: string | null
          ordering_doctor_id: string
          patient_id: string
          requires_immediate_action?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acted_upon_at?: string | null
          action_notes?: string | null
          consent_logged?: boolean | null
          consent_logged_at?: string | null
          created_at?: string | null
          hospital_id?: string
          id?: string
          is_critical?: boolean | null
          lab_result_id?: string
          metadata?: Json | null
          notification_method?: string | null
          notified_at?: string | null
          ordering_doctor_id?: string
          patient_id?: string
          requires_immediate_action?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_result_notifications_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_result_notifications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_result_notifications_lab_result_id_fkey"
            columns: ["lab_result_id"]
            isOneToOne: false
            referencedRelation: "lab_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_result_notifications_ordering_doctor_id_fkey"
            columns: ["ordering_doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_result_notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          abnormal_flag: string | null
          created_at: string | null
          critical_flag: boolean | null
          hospital_id: string | null
          id: string
          interpretation: string | null
          lab_order_id: string | null
          lab_result: string | null
          loinc_code: string | null
          performed_at: string | null
          reference_range: string | null
          result_numeric: number | null
          result_status: string | null
          result_unit: string | null
          result_value: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          abnormal_flag?: string | null
          created_at?: string | null
          critical_flag?: boolean | null
          hospital_id?: string | null
          id?: string
          interpretation?: string | null
          lab_order_id?: string | null
          lab_result?: string | null
          loinc_code?: string | null
          performed_at?: string | null
          reference_range?: string | null
          result_numeric?: number | null
          result_status?: string | null
          result_unit?: string | null
          result_value: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          abnormal_flag?: string | null
          created_at?: string | null
          critical_flag?: boolean | null
          hospital_id?: string | null
          id?: string
          interpretation?: string | null
          lab_order_id?: string | null
          lab_result?: string | null
          loinc_code?: string | null
          performed_at?: string | null
          reference_range?: string | null
          result_numeric?: number | null
          result_status?: string | null
          result_unit?: string | null
          result_value?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_lab_order_id_fkey"
            columns: ["lab_order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_loinc_code_fkey"
            columns: ["loinc_code"]
            isOneToOne: false
            referencedRelation: "loinc_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "lab_results_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_trends: {
        Row: {
          calculated_at: string | null
          created_at: string | null
          hospital_id: string | null
          id: string
          loinc_code: string | null
          patient_id: string | null
          trend_data: Json | null
          trend_direction: string | null
          trend_period: string
          trend_significance: string | null
        }
        Insert: {
          calculated_at?: string | null
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          loinc_code?: string | null
          patient_id?: string | null
          trend_data?: Json | null
          trend_direction?: string | null
          trend_period: string
          trend_significance?: string | null
        }
        Update: {
          calculated_at?: string | null
          created_at?: string | null
          hospital_id?: string | null
          id?: string
          loinc_code?: string | null
          patient_id?: string | null
          trend_data?: Json | null
          trend_direction?: string | null
          trend_period?: string
          trend_significance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_trends_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_trends_loinc_code_fkey"
            columns: ["loinc_code"]
            isOneToOne: false
            referencedRelation: "loinc_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "lab_trends_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      loinc_codes: {
        Row: {
          class: string | null
          code: string
          component: string
          created_at: string | null
          critical_values: Json | null
          method_type: string | null
          property: string | null
          reference_range: Json | null
          scale_type: string | null
          specimen_type: string | null
          system_type: string | null
          time_aspect: string | null
          units: string | null
        }
        Insert: {
          class?: string | null
          code: string
          component: string
          created_at?: string | null
          critical_values?: Json | null
          method_type?: string | null
          property?: string | null
          reference_range?: Json | null
          scale_type?: string | null
          specimen_type?: string | null
          system_type?: string | null
          time_aspect?: string | null
          units?: string | null
        }
        Update: {
          class?: string | null
          code?: string
          component?: string
          created_at?: string | null
          critical_values?: Json | null
          method_type?: string | null
          property?: string | null
          reference_range?: Json | null
          scale_type?: string | null
          specimen_type?: string | null
          system_type?: string | null
          time_aspect?: string | null
          units?: string | null
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          consultation_id: string | null
          created_at: string
          data: Json | null
          description: string | null
          hospital_id: string
          id: string
          is_confidential: boolean | null
          onset_date: string | null
          patient_id: string
          record_type: string
          recorded_by: string | null
          resolution_date: string | null
          severity: string | null
          source: string | null
          status: string | null
          title: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          hospital_id: string
          id?: string
          is_confidential?: boolean | null
          onset_date?: string | null
          patient_id: string
          record_type: string
          recorded_by?: string | null
          resolution_date?: string | null
          severity?: string | null
          source?: string | null
          status?: string | null
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          consultation_id?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          hospital_id?: string
          id?: string
          is_confidential?: boolean | null
          onset_date?: string | null
          patient_id?: string
          record_type?: string
          recorded_by?: string | null
          resolution_date?: string | null
          severity?: string | null
          source?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_administrations: {
        Row: {
          administered_at: string
          administered_by: string
          created_at: string
          dosage: string
          hospital_id: string
          id: string
          medication_name: string
          notes: string | null
          patient_id: string
          prescription_id: string | null
          prescription_item_id: string | null
          route: string | null
          scheduled_time: string | null
          status: string
          witness_id: string | null
        }
        Insert: {
          administered_at?: string
          administered_by: string
          created_at?: string
          dosage: string
          hospital_id: string
          id?: string
          medication_name: string
          notes?: string | null
          patient_id: string
          prescription_id?: string | null
          prescription_item_id?: string | null
          route?: string | null
          scheduled_time?: string | null
          status?: string
          witness_id?: string | null
        }
        Update: {
          administered_at?: string
          administered_by?: string
          created_at?: string
          dosage?: string
          hospital_id?: string
          id?: string
          medication_name?: string
          notes?: string | null
          patient_id?: string
          prescription_id?: string | null
          prescription_item_id?: string | null
          route?: string | null
          scheduled_time?: string | null
          status?: string
          witness_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_administrations_administered_by_fkey"
            columns: ["administered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_prescription_item_id_fkey"
            columns: ["prescription_item_id"]
            isOneToOne: false
            referencedRelation: "prescription_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_witness_id_fkey"
            columns: ["witness_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_reconciliation_audit: {
        Row: {
          action: string
          actor_id: string
          actor_role: string
          created_at: string
          discrepancies_resolved: number | null
          from_status: string | null
          hospital_id: string
          id: string
          notes: string | null
          to_status: string | null
          workflow_id: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_role: string
          created_at?: string
          discrepancies_resolved?: number | null
          from_status?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          to_status?: string | null
          workflow_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string
          created_at?: string
          discrepancies_resolved?: number | null
          from_status?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          to_status?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_reconciliation_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_reconciliation_audit_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_reconciliation_audit_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "medication_reconciliation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_reconciliation_workflows: {
        Row: {
          active_orders: Json
          admission_type: string
          created_at: string
          current_step: number
          discrepancies: Json
          doctor_reviewed_at: string | null
          doctor_reviewed_by: string | null
          home_medications: Json
          hospital_id: string
          id: string
          initiated_by: string
          interactions_found: Json
          metadata: Json | null
          notes: string | null
          nurse_reconciled_at: string | null
          nurse_reconciled_by: string | null
          patient_id: string
          pharmacist_reviewed_at: string | null
          pharmacist_reviewed_by: string | null
          reconciled_list: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          active_orders?: Json
          admission_type?: string
          created_at?: string
          current_step?: number
          discrepancies?: Json
          doctor_reviewed_at?: string | null
          doctor_reviewed_by?: string | null
          home_medications?: Json
          hospital_id: string
          id?: string
          initiated_by: string
          interactions_found?: Json
          metadata?: Json | null
          notes?: string | null
          nurse_reconciled_at?: string | null
          nurse_reconciled_by?: string | null
          patient_id: string
          pharmacist_reviewed_at?: string | null
          pharmacist_reviewed_by?: string | null
          reconciled_list?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          active_orders?: Json
          admission_type?: string
          created_at?: string
          current_step?: number
          discrepancies?: Json
          doctor_reviewed_at?: string | null
          doctor_reviewed_by?: string | null
          home_medications?: Json
          hospital_id?: string
          id?: string
          initiated_by?: string
          interactions_found?: Json
          metadata?: Json | null
          notes?: string | null
          nurse_reconciled_at?: string | null
          nurse_reconciled_by?: string | null
          patient_id?: string
          pharmacist_reviewed_at?: string | null
          pharmacist_reviewed_by?: string | null
          reconciled_list?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_reconciliation_workflows_doctor_reviewed_by_fkey"
            columns: ["doctor_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_reconciliation_workflows_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_reconciliation_workflows_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_reconciliation_workflows_nurse_reconciled_by_fkey"
            columns: ["nurse_reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_reconciliation_workflows_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_reconciliation_workflows_pharmacist_reviewed_by_fkey"
            columns: ["pharmacist_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          batch_number: string | null
          category: string | null
          created_at: string
          current_stock: number
          expiry_date: string | null
          form: string | null
          generic_name: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          manufacturer: string | null
          minimum_stock: number
          name: string
          strength: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          category?: string | null
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          form?: string | null
          generic_name?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          minimum_stock?: number
          name: string
          strength?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          category?: string | null
          created_at?: string
          current_stock?: number
          expiry_date?: string | null
          form?: string | null
          generic_name?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          minimum_stock?: number
          name?: string
          strength?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          hospital_id: string
          id: string
          is_read: boolean
          parent_message_id: string | null
          patient_id: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          hospital_id: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          patient_id?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          hospital_id?: string
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          patient_id?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_code_attempts: {
        Row: {
          attempted_at: string
          id: number
          succeeded: boolean
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: never
          succeeded: boolean
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: never
          succeeded?: boolean
          user_id?: string
        }
        Relationships: []
      }
      mfa_backup_codes: {
        Row: {
          batch_id: string
          code_hash: string
          created_at: string
          hash_version: string
          id: string
          pepper_id: string
          salt: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          batch_id: string
          code_hash: string
          created_at?: string
          hash_version?: string
          id?: string
          pepper_id: string
          salt: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          batch_id?: string
          code_hash?: string
          created_at?: string
          hash_version?: string
          id?: string
          pepper_id?: string
          salt?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string
          expires_at: string | null
          hospital_id: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: string
          read_at: string | null
          recipient_id: string
          sender_id: string | null
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          hospital_id: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          recipient_id: string
          sender_id?: string | null
          title: string
          type: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          expires_at?: string | null
          hospital_id?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      on_call_schedule: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          hospital_id: string
          id: string
          is_active: boolean
          notes: string | null
          profile_id: string
          specialty: string
          starts_at: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          hospital_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          profile_id: string
          specialty?: string
          starts_at: string
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          profile_id?: string
          specialty?: string
          starts_at?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "on_call_schedule_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_call_schedule_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_call_schedule_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_claim_attempts: {
        Row: {
          attempted_at: string
          client_key: string
          hospital_id: string | null
          id: number
          record_key: string
          succeeded: boolean
        }
        Insert: {
          attempted_at?: string
          client_key: string
          hospital_id?: string | null
          id?: never
          record_key: string
          succeeded: boolean
        }
        Update: {
          attempted_at?: string
          client_key?: string
          hospital_id?: string | null
          id?: never
          record_key?: string
          succeeded?: boolean
        }
        Relationships: []
      }
      patient_consents: {
        Row: {
          consent_date: string
          created_at: string
          data_processing_consent: boolean | null
          data_sharing_consent: boolean | null
          hospital_id: string
          id: string
          patient_id: string
          telemedicine_consent: boolean | null
          treatment_consent: boolean | null
          updated_at: string
        }
        Insert: {
          consent_date?: string
          created_at?: string
          data_processing_consent?: boolean | null
          data_sharing_consent?: boolean | null
          hospital_id: string
          id?: string
          patient_id: string
          telemedicine_consent?: boolean | null
          treatment_consent?: boolean | null
          updated_at?: string
        }
        Update: {
          consent_date?: string
          created_at?: string
          data_processing_consent?: boolean | null
          data_sharing_consent?: boolean | null
          hospital_id?: string
          id?: string
          patient_id?: string
          telemedicine_consent?: boolean | null
          treatment_consent?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_consents_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_prep_checklists: {
        Row: {
          allergies_verified: boolean | null
          appointment_id: string | null
          chief_complaint_recorded: boolean | null
          completed_at: string | null
          consent_obtained: boolean | null
          created_at: string
          hospital_id: string
          id: string
          medications_reviewed: boolean | null
          notes: string | null
          nurse_id: string | null
          patient_id: string
          queue_entry_id: string | null
          ready_for_doctor: boolean | null
          updated_at: string
          vitals_completed: boolean | null
        }
        Insert: {
          allergies_verified?: boolean | null
          appointment_id?: string | null
          chief_complaint_recorded?: boolean | null
          completed_at?: string | null
          consent_obtained?: boolean | null
          created_at?: string
          hospital_id: string
          id?: string
          medications_reviewed?: boolean | null
          notes?: string | null
          nurse_id?: string | null
          patient_id: string
          queue_entry_id?: string | null
          ready_for_doctor?: boolean | null
          updated_at?: string
          vitals_completed?: boolean | null
        }
        Update: {
          allergies_verified?: boolean | null
          appointment_id?: string | null
          chief_complaint_recorded?: boolean | null
          completed_at?: string | null
          consent_obtained?: boolean | null
          created_at?: string
          hospital_id?: string
          id?: string
          medications_reviewed?: boolean | null
          notes?: string | null
          nurse_id?: string | null
          patient_id?: string
          queue_entry_id?: string | null
          ready_for_doctor?: boolean | null
          updated_at?: string
          vitals_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_prep_checklists_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_prep_checklists_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_prep_checklists_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_prep_checklists_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_prep_checklists_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "patient_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_queue: {
        Row: {
          appointment_id: string | null
          assigned_to: string | null
          called_time: string | null
          check_in_time: string
          created_at: string
          department: string | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          queue_number: number
          service_end_time: string | null
          service_start_time: string | null
          status: string | null
        }
        Insert: {
          appointment_id?: string | null
          assigned_to?: string | null
          called_time?: string | null
          check_in_time?: string
          created_at?: string
          department?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          queue_number: number
          service_end_time?: string | null
          service_start_time?: string | null
          status?: string | null
        }
        Update: {
          appointment_id?: string | null
          assigned_to?: string | null
          called_time?: string | null
          check_in_time?: string
          created_at?: string
          department?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          queue_number?: number
          service_end_time?: string | null
          service_start_time?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_queue_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string[] | null
          blood_type: string | null
          chronic_conditions: string[] | null
          city: string | null
          created_at: string
          current_medications: Json | null
          date_of_birth: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          hospital_id: string
          id: string
          insurance_group_number: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          is_active: boolean | null
          last_name: string
          mrn: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          city?: string | null
          created_at?: string
          current_medications?: Json | null
          date_of_birth: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          hospital_id: string
          id?: string
          insurance_group_number?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_active?: boolean | null
          last_name: string
          mrn: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          city?: string | null
          created_at?: string
          current_medications?: Json | null
          date_of_birth?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"]
          hospital_id?: string
          id?: string
          insurance_group_number?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_active?: boolean | null
          last_name?: string
          mrn?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          created_at: string
          created_by: string | null
          down_payment: number | null
          hospital_id: string
          id: string
          installment_amount: number
          installment_frequency: string
          invoice_id: string | null
          next_due_date: string | null
          notes: string | null
          paid_installments: number | null
          patient_id: string
          remaining_balance: number
          status: string
          total_amount: number
          total_installments: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          down_payment?: number | null
          hospital_id: string
          id?: string
          installment_amount: number
          installment_frequency?: string
          invoice_id?: string | null
          next_due_date?: string | null
          notes?: string | null
          paid_installments?: number | null
          patient_id: string
          remaining_balance: number
          status?: string
          total_amount: number
          total_installments: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          down_payment?: number | null
          hospital_id?: string
          id?: string
          installment_amount?: number
          installment_frequency?: string
          invoice_id?: string | null
          next_due_date?: string | null
          notes?: string | null
          paid_installments?: number | null
          patient_id?: string
          remaining_balance?: number
          status?: string
          total_amount?: number
          total_installments?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          hospital_id: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          received_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          hospital_id: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          hospital_id?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_approval_workflows: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          clarification_notes: string | null
          created_at: string | null
          current_step: number
          dur_check_passed: boolean | null
          dur_warnings: string[] | null
          hospital_id: string
          id: string
          initiated_by: string
          metadata: Json | null
          patient_id: string
          prescription_id: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          clarification_notes?: string | null
          created_at?: string | null
          current_step?: number
          dur_check_passed?: boolean | null
          dur_warnings?: string[] | null
          hospital_id: string
          id?: string
          initiated_by: string
          metadata?: Json | null
          patient_id: string
          prescription_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          clarification_notes?: string | null
          created_at?: string | null
          current_step?: number
          dur_check_passed?: boolean | null
          dur_warnings?: string[] | null
          hospital_id?: string
          id?: string
          initiated_by?: string
          metadata?: Json | null
          patient_id?: string
          prescription_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_approval_workflows_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_approval_workflows_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_approval_workflows_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_approval_workflows_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_approval_workflows_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_dur_reviews: {
        Row: {
          age_appropriate: boolean | null
          age_checked: boolean | null
          age_note: string | null
          allergy_checked: boolean | null
          allergy_conflicts: string[] | null
          created_at: string | null
          ddi_checked: boolean | null
          ddi_details: Json | null
          ddi_severity: string | null
          doctor_approval_at: string | null
          doctor_approval_note: string | null
          doctor_approval_status: string | null
          doctor_approved_by: string | null
          hepatic_checked: boolean | null
          hepatic_dosage_ok: boolean | null
          hepatic_note: string | null
          hospital_id: string
          id: string
          patient_child_pugh_score: string | null
          patient_egfr: number | null
          patient_id: string
          pharmacist_notes: string | null
          pharmacist_recommendation: string | null
          pregnancy_checked: boolean | null
          pregnancy_note: string | null
          pregnancy_safe: boolean | null
          prescription_id: string
          renal_checked: boolean | null
          renal_dosage_ok: boolean | null
          renal_note: string | null
          requires_doctor_approval: boolean | null
          reviewed_at: string | null
          reviewed_by: string
          status: string
          updated_at: string | null
        }
        Insert: {
          age_appropriate?: boolean | null
          age_checked?: boolean | null
          age_note?: string | null
          allergy_checked?: boolean | null
          allergy_conflicts?: string[] | null
          created_at?: string | null
          ddi_checked?: boolean | null
          ddi_details?: Json | null
          ddi_severity?: string | null
          doctor_approval_at?: string | null
          doctor_approval_note?: string | null
          doctor_approval_status?: string | null
          doctor_approved_by?: string | null
          hepatic_checked?: boolean | null
          hepatic_dosage_ok?: boolean | null
          hepatic_note?: string | null
          hospital_id: string
          id?: string
          patient_child_pugh_score?: string | null
          patient_egfr?: number | null
          patient_id: string
          pharmacist_notes?: string | null
          pharmacist_recommendation?: string | null
          pregnancy_checked?: boolean | null
          pregnancy_note?: string | null
          pregnancy_safe?: boolean | null
          prescription_id: string
          renal_checked?: boolean | null
          renal_dosage_ok?: boolean | null
          renal_note?: string | null
          requires_doctor_approval?: boolean | null
          reviewed_at?: string | null
          reviewed_by: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          age_appropriate?: boolean | null
          age_checked?: boolean | null
          age_note?: string | null
          allergy_checked?: boolean | null
          allergy_conflicts?: string[] | null
          created_at?: string | null
          ddi_checked?: boolean | null
          ddi_details?: Json | null
          ddi_severity?: string | null
          doctor_approval_at?: string | null
          doctor_approval_note?: string | null
          doctor_approval_status?: string | null
          doctor_approved_by?: string | null
          hepatic_checked?: boolean | null
          hepatic_dosage_ok?: boolean | null
          hepatic_note?: string | null
          hospital_id?: string
          id?: string
          patient_child_pugh_score?: string | null
          patient_egfr?: number | null
          patient_id?: string
          pharmacist_notes?: string | null
          pharmacist_recommendation?: string | null
          pregnancy_checked?: boolean | null
          pregnancy_note?: string | null
          pregnancy_safe?: boolean | null
          prescription_id?: string
          renal_checked?: boolean | null
          renal_dosage_ok?: boolean | null
          renal_note?: string | null
          requires_doctor_approval?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_dur_reviews_doctor_approved_by_fkey"
            columns: ["doctor_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_dur_reviews_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_dur_reviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_dur_reviews_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_dur_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string
          duration: string
          frequency: string
          hospital_id: string
          id: string
          instructions: string | null
          is_dispensed: boolean | null
          medication_id: string | null
          medication_name: string
          prescription_id: string
          quantity: number | null
        }
        Insert: {
          created_at?: string
          dosage: string
          duration: string
          frequency: string
          hospital_id: string
          id?: string
          instructions?: string | null
          is_dispensed?: boolean | null
          medication_id?: string | null
          medication_name: string
          prescription_id: string
          quantity?: number | null
        }
        Update: {
          created_at?: string
          dosage?: string
          duration?: string
          frequency?: string
          hospital_id?: string
          id?: string
          instructions?: string | null
          is_dispensed?: boolean | null
          medication_id?: string | null
          medication_name?: string
          prescription_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_refill_requests: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          prescription_id: string
          reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          prescription_id: string
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          prescription_id?: string
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_refill_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_refill_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_refill_requests_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_refill_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          allergy_alerts: Json | null
          consultation_id: string | null
          created_at: string
          dispensed_at: string | null
          dispensed_by: string | null
          drug_interactions: Json | null
          encryption_metadata: Json | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string
          prescribed_by: string
          priority: string | null
          status: string
          updated_at: string
          verification_required: boolean | null
          verified_at: string | null
          verified_by: string | null
          version: number
        }
        Insert: {
          allergy_alerts?: Json | null
          consultation_id?: string | null
          created_at?: string
          dispensed_at?: string | null
          dispensed_by?: string | null
          drug_interactions?: Json | null
          encryption_metadata?: Json | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id: string
          prescribed_by: string
          priority?: string | null
          status?: string
          updated_at?: string
          verification_required?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Update: {
          allergy_alerts?: Json | null
          consultation_id?: string | null
          created_at?: string
          dispensed_at?: string | null
          dispensed_by?: string | null
          drug_interactions?: Json | null
          encryption_metadata?: Json | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          prescribed_by?: string
          priority?: string | null
          status?: string
          updated_at?: string
          verification_required?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_security_answers: {
        Row: {
          answer_hash: string
          hash_scheme: string
          migrated_at: string
          question: string | null
          user_id: string
        }
        Insert: {
          answer_hash: string
          hash_scheme?: string
          migrated_at?: string
          question?: string | null
          user_id: string
        }
        Update: {
          answer_hash?: string
          hash_scheme?: string
          migrated_at?: string
          question?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          failed_login_attempts: number | null
          first_name: string
          hospital_id: string | null
          id: string
          is_active: boolean
          is_staff: boolean | null
          last_login: string | null
          last_name: string
          locked_until: string | null
          password_changed_at: string | null
          phone: string | null
          two_factor_enabled: boolean | null
          two_factor_required: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          failed_login_attempts?: number | null
          first_name: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          is_staff?: boolean | null
          last_login?: string | null
          last_name: string
          locked_until?: string | null
          password_changed_at?: string | null
          phone?: string | null
          two_factor_enabled?: boolean | null
          two_factor_required?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          failed_login_attempts?: number | null
          first_name?: string
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          is_staff?: boolean | null
          last_login?: string | null
          last_name?: string
          locked_until?: string | null
          password_changed_at?: string | null
          phone?: string | null
          two_factor_enabled?: boolean | null
          two_factor_required?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_legacy_2fa_archive: {
        Row: {
          archived_at: string
          backup_codes: string[] | null
          two_factor_secret: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string
          backup_codes?: string[] | null
          two_factor_secret?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string
          backup_codes?: string[] | null
          two_factor_secret?: string | null
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          medication_id: string | null
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          medication_id?: string | null
          purchase_order_id: string
          quantity?: number
          received_quantity?: number | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          medication_id?: string | null
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          expected_delivery_date: string | null
          hospital_id: string
          id: string
          notes: string | null
          order_number: string
          ordered_at: string
          ordered_by: string | null
          received_at: string | null
          received_by: string | null
          status: string
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_delivery_date?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          order_number: string
          ordered_at?: string
          ordered_by?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: string
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_delivery_date?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          order_number?: string
          ordered_at?: string
          ordered_by?: string | null
          received_at?: string | null
          received_by?: string | null
          status?: string
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      reorder_rules: {
        Row: {
          auto_reorder: boolean | null
          created_at: string
          hospital_id: string
          id: string
          is_active: boolean | null
          last_auto_order_date: string | null
          medication_id: string
          preferred_supplier_id: string | null
          reorder_point: number
          reorder_quantity: number
          updated_at: string
        }
        Insert: {
          auto_reorder?: boolean | null
          created_at?: string
          hospital_id: string
          id?: string
          is_active?: boolean | null
          last_auto_order_date?: string | null
          medication_id: string
          preferred_supplier_id?: string | null
          reorder_point?: number
          reorder_quantity?: number
          updated_at?: string
        }
        Update: {
          auto_reorder?: boolean | null
          created_at?: string
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          last_auto_order_date?: string | null
          medication_id?: string
          preferred_supplier_id?: string | null
          reorder_point?: number
          reorder_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reorder_rules_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handovers: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          critical_patients: Json | null
          handover_time: string | null
          hospital_id: string
          id: string
          incoming_nurse_id: string | null
          notes: string | null
          outgoing_nurse_id: string
          pending_tasks: Json | null
          shift_date: string
          shift_type: string
          status: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          critical_patients?: Json | null
          handover_time?: string | null
          hospital_id: string
          id?: string
          incoming_nurse_id?: string | null
          notes?: string | null
          outgoing_nurse_id: string
          pending_tasks?: Json | null
          shift_date?: string
          shift_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          critical_patients?: Json | null
          handover_time?: string | null
          hospital_id?: string
          id?: string
          incoming_nurse_id?: string | null
          notes?: string | null
          outgoing_nurse_id?: string
          pending_tasks?: Json | null
          shift_date?: string
          shift_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_handovers_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handovers_incoming_nurse_id_fkey"
            columns: ["incoming_nurse_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handovers_outgoing_nurse_id_fkey"
            columns: ["outgoing_nurse_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_schedules: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          end_time: string
          hospital_id: string
          id: string
          notes: string | null
          shift_date: string
          shift_type: string | null
          staff_id: string
          start_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          end_time: string
          hospital_id: string
          id?: string
          notes?: string | null
          shift_date: string
          shift_type?: string | null
          staff_id: string
          start_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          end_time?: string
          hospital_id?: string
          id?: string
          notes?: string | null
          shift_date?: string
          shift_type?: string | null
          staff_id?: string
          start_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          hospital_id: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          hospital_id: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          hospital_id?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          auto_order_created: boolean | null
          created_at: string
          current_quantity: number
          hospital_id: string
          id: string
          medication_id: string
          purchase_order_id: string | null
          resolved_at: string | null
          status: string
          threshold_quantity: number
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          auto_order_created?: boolean | null
          created_at?: string
          current_quantity: number
          hospital_id: string
          id?: string
          medication_id: string
          purchase_order_id?: string | null
          resolved_at?: string | null
          status?: string
          threshold_quantity: number
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          auto_order_created?: boolean | null
          created_at?: string
          current_quantity?: number
          hospital_id?: string
          id?: string
          medication_id?: string
          purchase_order_id?: string | null
          resolved_at?: string | null
          status?: string
          threshold_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          hospital_id: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          hospital_id: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          hospital_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          category: string | null
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          hospital_id: string
          id: string
          is_sensitive: boolean | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          hospital_id: string
          id?: string
          is_sensitive?: boolean | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          hospital_id?: string
          id?: string
          is_sensitive?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_config_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      system_metrics: {
        Row: {
          ai_calls_count: number | null
          ai_cost_estimate: number | null
          ai_feature: string | null
          ai_model: string | null
          ai_tokens_used: number | null
          created_at: string | null
          hospital_id: string
          id: string
          measured_at: string
          memory_usage_mb: number | null
          notes: string | null
          response_time_ms: number | null
        }
        Insert: {
          ai_calls_count?: number | null
          ai_cost_estimate?: number | null
          ai_feature?: string | null
          ai_model?: string | null
          ai_tokens_used?: number | null
          created_at?: string | null
          hospital_id: string
          id?: string
          measured_at?: string
          memory_usage_mb?: number | null
          notes?: string | null
          response_time_ms?: number | null
        }
        Update: {
          ai_calls_count?: number | null
          ai_cost_estimate?: number | null
          ai_feature?: string | null
          ai_model?: string | null
          ai_tokens_used?: number | null
          created_at?: string | null
          hospital_id?: string
          id?: string
          measured_at?: string
          memory_usage_mb?: number | null
          notes?: string | null
          response_time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "system_metrics_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          hospital_id: string
          id: string
          notes: string | null
          patient_id: string | null
          priority: string
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          hospital_id: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          priority?: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          priority?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      telehealth_messages: {
        Row: {
          attachment_name: string | null
          attachment_size_bytes: number | null
          attachment_url: string | null
          created_at: string | null
          deleted_at: string | null
          encryption_algorithm: string | null
          hospital_id: string
          id: string
          is_deleted: boolean | null
          is_encrypted: boolean | null
          message_content: string
          message_type: string | null
          read_at: string | null
          sender_id: string
          sender_role: string
          telehealth_session_id: string
          updated_at: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_size_bytes?: number | null
          attachment_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          encryption_algorithm?: string | null
          hospital_id: string
          id?: string
          is_deleted?: boolean | null
          is_encrypted?: boolean | null
          message_content: string
          message_type?: string | null
          read_at?: string | null
          sender_id: string
          sender_role: string
          telehealth_session_id: string
          updated_at?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_size_bytes?: number | null
          attachment_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          encryption_algorithm?: string | null
          hospital_id?: string
          id?: string
          is_deleted?: boolean | null
          is_encrypted?: boolean | null
          message_content?: string
          message_type?: string | null
          read_at?: string | null
          sender_id?: string
          sender_role?: string
          telehealth_session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telehealth_messages_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telehealth_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telehealth_messages_telehealth_session_id_fkey"
            columns: ["telehealth_session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      telehealth_screen_shares: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiated_by: string
          is_encrypted: boolean | null
          recording_url: string | null
          started_at: string | null
          telehealth_session_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by: string
          is_encrypted?: boolean | null
          recording_url?: string | null
          started_at?: string | null
          telehealth_session_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by?: string
          is_encrypted?: boolean | null
          recording_url?: string | null
          started_at?: string | null
          telehealth_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telehealth_screen_shares_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telehealth_screen_shares_telehealth_session_id_fkey"
            columns: ["telehealth_session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      telehealth_sessions: {
        Row: {
          actual_end_at: string | null
          actual_start_at: string | null
          allow_recording: boolean | null
          allow_screen_share: boolean | null
          appointment_id: string
          created_at: string | null
          duration_minutes: number | null
          encrypted_end_to_end: boolean | null
          has_recording: boolean | null
          hospital_id: string
          host_id: string
          id: string
          max_participants: number | null
          prescription_ids: Json | null
          provider: string
          provider_session_id: string
          recording_duration_minutes: number | null
          recording_encrypted: boolean | null
          recording_url: string | null
          scheduled_start_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          allow_recording?: boolean | null
          allow_screen_share?: boolean | null
          appointment_id: string
          created_at?: string | null
          duration_minutes?: number | null
          encrypted_end_to_end?: boolean | null
          has_recording?: boolean | null
          hospital_id: string
          host_id: string
          id?: string
          max_participants?: number | null
          prescription_ids?: Json | null
          provider: string
          provider_session_id: string
          recording_duration_minutes?: number | null
          recording_encrypted?: boolean | null
          recording_url?: string | null
          scheduled_start_at: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          allow_recording?: boolean | null
          allow_screen_share?: boolean | null
          appointment_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          encrypted_end_to_end?: boolean | null
          has_recording?: boolean | null
          hospital_id?: string
          host_id?: string
          id?: string
          max_participants?: number | null
          prescription_ids?: Json | null
          provider?: string
          provider_session_id?: string
          recording_duration_minutes?: number | null
          recording_encrypted?: boolean | null
          recording_url?: string | null
          scheduled_start_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telehealth_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telehealth_sessions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telehealth_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telemedicine_sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          appointment_id: string | null
          created_at: string
          doctor_id: string
          hospital_id: string
          id: string
          meeting_url: string | null
          notes: string | null
          patient_id: string
          recording_url: string | null
          room_id: string | null
          scheduled_end: string
          scheduled_start: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          appointment_id?: string | null
          created_at?: string
          doctor_id: string
          hospital_id: string
          id?: string
          meeting_url?: string | null
          notes?: string | null
          patient_id: string
          recording_url?: string | null
          room_id?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          appointment_id?: string | null
          created_at?: string
          doctor_id?: string
          hospital_id?: string
          id?: string
          meeting_url?: string | null
          notes?: string | null
          patient_id?: string
          recording_url?: string | null
          room_id?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemedicine_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_sessions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_sessions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemedicine_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          appointment_id: string | null
          created_at: string
          doctor_id: string
          end_time: string
          hospital_id: string
          id: string
          is_booked: boolean | null
          is_telemedicine: boolean | null
          slot_date: string
          start_time: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          doctor_id: string
          end_time: string
          hospital_id: string
          id?: string
          is_booked?: boolean | null
          is_telemedicine?: boolean | null
          slot_date: string
          start_time: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          doctor_id?: string
          end_time?: string
          hospital_id?: string
          id?: string
          is_booked?: boolean | null
          is_telemedicine?: boolean | null
          slot_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_slots_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_slots_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      two_factor_secrets: {
        Row: {
          backup_codes: string[]
          backup_codes_salt: string | null
          created_at: string
          id: string
          secret: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[]
          backup_codes_salt?: string | null
          created_at?: string
          id?: string
          secret: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[]
          backup_codes_salt?: string | null
          created_at?: string
          id?: string
          secret?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          hospital_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      vital_signs: {
        Row: {
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          bmi: number | null
          consultation_id: string | null
          heart_rate: number | null
          height: number | null
          hospital_id: string | null
          id: string
          notes: string | null
          oxygen_saturation: number | null
          pain_level: number | null
          patient_id: string
          pulse: number | null
          recorded_at: string
          recorded_by: string | null
          respiratory_rate: number | null
          temperature: number | null
          weight: number | null
        }
        Insert: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          bmi?: number | null
          consultation_id?: string | null
          heart_rate?: number | null
          height?: number | null
          hospital_id?: string | null
          id?: string
          notes?: string | null
          oxygen_saturation?: number | null
          pain_level?: number | null
          patient_id: string
          pulse?: number | null
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Update: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          bmi?: number | null
          consultation_id?: string | null
          heart_rate?: number | null
          height?: number | null
          hospital_id?: string | null
          id?: string
          notes?: string | null
          oxygen_saturation?: number | null
          pain_level?: number | null
          patient_id?: string
          pulse?: number | null
          recorded_at?: string
          recorded_by?: string | null
          respiratory_rate?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vital_signs_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vital_signs_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vital_signs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vital_signs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_staff_invitation: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_token: string
          p_user_id: string
        }
        Returns: Json
      }
      assign_patient_role: { Args: { p_user_id: string }; Returns: undefined }
      consume_mfa_backup_code: {
        Args: { p_code_hashes: string[]; p_user_id: string }
        Returns: Json
      }
      create_hospital_with_admin: {
        Args: {
          p_address: string
          p_city: string
          p_email: string
          p_license_number: string
          p_name: string
          p_phone: string
          p_state: string
          p_user_id: string
          p_zip: string
        }
        Returns: string
      }
      current_profile_id: { Args: never; Returns: string }
      expire_break_glass_overrides: { Args: never; Returns: undefined }
      generate_claim_number: {
        Args: { p_hospital_id: string }
        Returns: string
      }
      generate_invoice_number: {
        Args: { p_hospital_id: string }
        Returns: string
      }
      generate_mrn: { Args: { hospital_id: string }; Returns: string }
      generate_po_number: { Args: { p_hospital_id: string }; Returns: string }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          hospital_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invitation_status"]
        }[]
      }
      get_next_queue_number: {
        Args: { p_hospital_id: string }
        Returns: number
      }
      get_user_hospital_id: { Args: { _user_id: string }; Returns: string }
      has_any_role: {
        Args: { _hospital_id?: string; _roles: string[] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_failed_login: { Args: { _user_id: string }; Returns: undefined }
      invoice_hospital_id: { Args: { _invoice_id: string }; Returns: string }
      invoice_patient_id: { Args: { _invoice_id: string }; Returns: string }
      invoke_critical_lab_escalation_worker: { Args: never; Returns: number }
      is_account_locked: { Args: { _user_id: string }; Returns: boolean }
      is_active_principal: { Args: never; Returns: boolean }
      is_active_staff_of: {
        Args: { _hospital_id: string; _roles?: string[] }
        Returns: boolean
      }
      is_patient_self: { Args: { _patient_id: string }; Returns: boolean }
      lab_rls_can_access: {
        Args: { _hospital_id: string; _roles: string[] }
        Returns: boolean
      }
      lab_rls_is_active_admin: { Args: never; Returns: boolean }
      lab_rls_profile_active: { Args: { _user_id: string }; Returns: boolean }
      lab_rls_result_access: {
        Args: { _hospital_id: string; _lab_order_id: string; _roles: string[] }
        Returns: boolean
      }
      lab_rls_staff_hospital_ids: {
        Args: { _roles: string[] }
        Returns: string[]
      }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_severity?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      mfa_satisfied: { Args: never; Returns: boolean }
      my_mfa_backup_codes_remaining: { Args: never; Returns: number }
      my_patient_hospital_ids: { Args: never; Returns: string[] }
      my_patient_ids: { Args: never; Returns: string[] }
      my_staff_hospital_ids: { Args: { _roles?: string[] }; Returns: string[] }
      patient_claim_candidates: {
        Args: {
          p_date_of_birth: string
          p_email: string
          p_hospital_code: string
          p_last_name: string
          p_mrn: string
        }
        Returns: {
          hospital_id: string
          patient_id: string
        }[]
      }
      patient_dob_as_date:
        | { Args: { p_text: string }; Returns: string }
        | { Args: { p_value: string }; Returns: string }
      patient_hospital_id: { Args: { _patient_id: string }; Returns: string }
      prescription_hospital_id: {
        Args: { _prescription_id: string }
        Returns: string
      }
      prescription_patient_id: {
        Args: { _prescription_id: string }
        Returns: string
      }
      profile_is_active: { Args: { _user_id: string }; Returns: boolean }
      purchase_order_hospital_id: {
        Args: { _purchase_order_id: string }
        Returns: string
      }
      recompute_two_factor_required: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      register_patient: {
        Args: {
          p_date_of_birth: string
          p_email: string
          p_hospital_code: string
          p_last_name: string
          p_mrn: string
          p_user_id: string
        }
        Returns: Json
      }
      replace_mfa_backup_codes: {
        Args: {
          p_code_hashes: string[]
          p_pepper_id: string
          p_salt: string
          p_user_id: string
        }
        Returns: number
      }
      reset_failed_login: { Args: { _user_id: string }; Returns: undefined }
      role_requires_2fa: { Args: { p_role: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      transition_discharge_workflow: {
        Args: {
          p_actor_id: string
          p_expected_step: string
          p_hospital_id: string
          p_metadata?: Json
          p_next_status: string
          p_next_step: string
          p_rejection_reason?: string
          p_workflow_id: string
        }
        Returns: {
          admission_id: string
          billing_clearance_at: string | null
          billing_clearance_by: string | null
          cancellation_reason: string | null
          checkout_details: Json | null
          clinical_notes: Json | null
          created_at: string | null
          current_step: number
          doctor_clearance_at: string | null
          doctor_clearance_by: string | null
          financial_details: Json | null
          hospital_id: string
          id: string
          initiated_by: string
          last_action_at: string | null
          last_action_by: string | null
          medication_reconciliation: Json | null
          metadata: Json | null
          nurse_confirmed_at: string | null
          nurse_confirmed_by: string | null
          patient_id: string
          pharmacist_reconciliation_at: string | null
          pharmacist_reconciliation_by: string | null
          receptionist_checkout_at: string | null
          receptionist_checkout_by: string | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "discharge_workflows"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_belongs_to_hospital: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_member_of: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_staff_of: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      verify_patient_claim: {
        Args: {
          p_client_key: string
          p_date_of_birth: string
          p_email: string
          p_hospital_code: string
          p_last_name: string
          p_mrn: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "doctor"
        | "nurse"
        | "receptionist"
        | "pharmacist"
        | "lab_technician"
        | "patient"
      appointment_status:
        | "scheduled"
        | "checked_in"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      consultation_status:
        | "pending"
        | "patient_overview"
        | "clinical_assessment"
        | "treatment_planning"
        | "final_review"
        | "handoff"
        | "completed"
      gender_type: "male" | "female" | "other" | "prefer_not_to_say"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      priority_level: "low" | "normal" | "high" | "urgent" | "emergency"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "doctor",
        "nurse",
        "receptionist",
        "pharmacist",
        "lab_technician",
        "patient",
      ],
      appointment_status: [
        "scheduled",
        "checked_in",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      consultation_status: [
        "pending",
        "patient_overview",
        "clinical_assessment",
        "treatment_planning",
        "final_review",
        "handoff",
        "completed",
      ],
      gender_type: ["male", "female", "other", "prefer_not_to_say"],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      priority_level: ["low", "normal", "high", "urgent", "emergency"],
    },
  },
} as const
