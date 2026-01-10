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
          appointment_type: string
          cancellation_reason: string | null
          check_in_time: string | null
          created_at: string
          created_by: string | null
          doctor_id: string | null
          duration_minutes: number | null
          end_time: string | null
          follow_up_required: boolean | null
          hospital_id: string
          id: string
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
          appointment_type: string
          cancellation_reason?: string | null
          check_in_time?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          follow_up_required?: boolean | null
          hospital_id: string
          id?: string
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
          appointment_type?: string
          cancellation_reason?: string | null
          check_in_time?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          follow_up_required?: boolean | null
          hospital_id?: string
          id?: string
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
      consultations: {
        Row: {
          appointment_id: string | null
          auto_save_data: Json | null
          billing_notified: boolean | null
          chief_complaint: string | null
          clinical_notes: string | null
          clinical_reasoning: string | null
          completed_at: string | null
          cpt_codes: string[] | null
          created_at: string
          current_step: number | null
          diagnoses: Json | null
          doctor_id: string
          final_diagnosis: string[] | null
          follow_up_date: string | null
          follow_up_notes: string | null
          handoff_notes: string | null
          history_of_present_illness: string | null
          hpi_data: Json | null
          hpi_notes: string | null
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
          review_of_systems: Json | null
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
          clinical_reasoning?: string | null
          completed_at?: string | null
          cpt_codes?: string[] | null
          created_at?: string
          current_step?: number | null
          diagnoses?: Json | null
          doctor_id: string
          final_diagnosis?: string[] | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          handoff_notes?: string | null
          history_of_present_illness?: string | null
          hpi_data?: Json | null
          hpi_notes?: string | null
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
          review_of_systems?: Json | null
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
      clinical_templates: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          name: string
          specialty: string | null
          template_data: Json
          type: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          name: string
          specialty?: string | null
          template_data: Json
          type: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          name?: string
          specialty?: string | null
          template_data?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_templates_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      cpt_codes: {
        Row: {
          base_fee: number | null
          category: string | null
          code: string
          created_at: string
          description: string
          hospital_id: string | null
        }
        Insert: {
          base_fee?: number | null
          category?: string | null
          code: string
          created_at?: string
          description: string
          hospital_id?: string | null
        }
        Update: {
          base_fee?: number | null
          category?: string | null
          code?: string
          created_at?: string
          description?: string
          hospital_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cpt_codes_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
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
      lab_orders: {
        Row: {
          collected_at: string | null
          collected_by: string | null
          completed_at: string | null
          consultation_id: string | null
          created_at: string
          critical_notified: boolean | null
          critical_notified_at: string | null
          hospital_id: string
          id: string
          is_critical: boolean | null
          normal_range: string | null
          ordered_at: string
          ordered_by: string
          patient_id: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          processed_by: string | null
          result_notes: string | null
          results: Json | null
          sample_type: string | null
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
          completed_at?: string | null
          consultation_id?: string | null
          created_at?: string
          critical_notified?: boolean | null
          critical_notified_at?: string | null
          hospital_id: string
          id?: string
          is_critical?: boolean | null
          normal_range?: string | null
          ordered_at?: string
          ordered_by: string
          patient_id: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          processed_by?: string | null
          result_notes?: string | null
          results?: Json | null
          sample_type?: string | null
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
          completed_at?: string | null
          consultation_id?: string | null
          created_at?: string
          critical_notified?: boolean | null
          critical_notified_at?: string | null
          hospital_id?: string
          id?: string
          is_critical?: boolean | null
          normal_range?: string | null
          ordered_at?: string
          ordered_by?: string
          patient_id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          processed_by?: string | null
          result_notes?: string | null
          results?: Json | null
          sample_type?: string | null
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
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      prescription_items: {
        Row: {
          created_at: string
          dosage: string
          duration: string
          frequency: string
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
        }
        Insert: {
          allergy_alerts?: Json | null
          consultation_id?: string | null
          created_at?: string
          dispensed_at?: string | null
          dispensed_by?: string | null
          drug_interactions?: Json | null
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
        }
        Update: {
          allergy_alerts?: Json | null
          consultation_id?: string | null
          created_at?: string
          dispensed_at?: string | null
          dispensed_by?: string | null
          drug_interactions?: Json | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          failed_login_attempts: number | null
          first_name: string
          hospital_id: string | null
          id: string
          is_staff: boolean | null
          last_login: string | null
          last_name: string
          locked_until: string | null
          password_changed_at: string | null
          phone: string | null
          security_answer: string | null
          security_question: string | null
          two_factor_enabled: boolean | null
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
          is_staff?: boolean | null
          last_login?: string | null
          last_name: string
          locked_until?: string | null
          password_changed_at?: string | null
          phone?: string | null
          security_answer?: string | null
          security_question?: string | null
          two_factor_enabled?: boolean | null
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
          is_staff?: boolean | null
          last_login?: string | null
          last_name?: string
          locked_until?: string | null
          password_changed_at?: string | null
          phone?: string | null
          security_answer?: string | null
          security_question?: string | null
          two_factor_enabled?: boolean | null
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
          created_at: string
          id: string
          secret: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[]
          created_at?: string
          id?: string
          secret: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[]
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
          id: string
          notes: string | null
          oxygen_saturation: number | null
          pain_level: number | null
          patient_id: string
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
          id?: string
          notes?: string | null
          oxygen_saturation?: number | null
          pain_level?: number | null
          patient_id: string
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
          id?: string
          notes?: string | null
          oxygen_saturation?: number | null
          pain_level?: number | null
          patient_id?: string
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
      get_next_queue_number: {
        Args: { p_hospital_id: string }
        Returns: number
      }
      get_user_hospital_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_failed_login: { Args: { _user_id: string }; Returns: undefined }
      is_account_locked: { Args: { _user_id: string }; Returns: boolean }
      reset_failed_login: { Args: { _user_id: string }; Returns: undefined }
      user_belongs_to_hospital: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
