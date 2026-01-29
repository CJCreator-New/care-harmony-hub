import { Consultation, CreateConsultation, UpdateConsultation, ClinicalWorkflow, MedicalRecord } from '@/types/clinical';

const CLINICAL_SERVICE_URL = import.meta.env.VITE_CLINICAL_SERVICE_URL || 'http://localhost:8000/api/clinical';

class ClinicalApiClient {
  private authHeaders: Record<string, string> = {};

  /**
   * Set authentication headers from the current session
   * Call this method when user logs in or session changes
   */
  setAuthHeaders(session: { access_token?: string } | null) {
    const apiKey = import.meta.env.VITE_API_KEY || 'caresync_frontend_key_2026_secure';

    this.authHeaders = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    };

    if (session?.access_token) {
      this.authHeaders['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  /**
   * Clear authentication headers (e.g., on logout)
   */
  clearAuthHeaders() {
    this.authHeaders = {
      'Content-Type': 'application/json',
      'X-API-Key': import.meta.env.VITE_API_KEY || 'caresync_frontend_key_2026_secure',
    };
  }

  private async getAuthHeaders() {
    return this.authHeaders;
  }

  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${CLINICAL_SERVICE_URL}${endpoint}`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Consultation methods
  async getConsultations(params?: {
    patient_id?: string;
    provider_id?: string;
    status?: string;
    consultation_type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Consultation[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const result = await this.apiCall<{ data: Consultation[]; total: number; success: true }>(
      `/consultations?${queryParams.toString()}`
    );

    return { data: result.data, total: result.total };
  }

  async getConsultation(id: string): Promise<Consultation> {
    const result = await this.apiCall<{ data: Consultation; success: true }>(`/consultations/${id}`);
    return result.data;
  }

  async createConsultation(data: CreateConsultation): Promise<Consultation> {
    const result = await this.apiCall<{ data: Consultation; success: true }>(
      '/consultations',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return result.data;
  }

  async updateConsultation(id: string, data: UpdateConsultation): Promise<Consultation> {
    const result = await this.apiCall<{ data: Consultation; success: true }>(
      `/consultations/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return result.data;
  }

  // Medical records methods
  async getMedicalRecords(params?: {
    patient_id?: string;
    record_type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: MedicalRecord[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const result = await this.apiCall<{ data: MedicalRecord[]; total: number; success: true }>(
      `/records?${queryParams.toString()}`
    );

    return { data: result.data, total: result.total };
  }

  async getMedicalRecord(id: string): Promise<MedicalRecord> {
    const result = await this.apiCall<{ data: MedicalRecord; success: true }>(`/records/${id}`);
    return result.data;
  }

  async createMedicalRecord(data: any): Promise<MedicalRecord> {
    const result = await this.apiCall<{ data: MedicalRecord; success: true }>(
      '/records',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return result.data;
  }

  // Clinical workflows methods
  async getClinicalWorkflows(params?: {
    patient_id?: string;
    status?: string;
    workflow_type?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ClinicalWorkflow[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const result = await this.apiCall<{ data: ClinicalWorkflow[]; total: number; success: true }>(
      `/workflows?${queryParams.toString()}`
    );

    return { data: result.data, total: result.total };
  }

  async getClinicalWorkflow(id: string): Promise<ClinicalWorkflow> {
    const result = await this.apiCall<{ data: ClinicalWorkflow; success: true }>(`/workflows/${id}`);
    return result.data;
  }

  async createClinicalWorkflow(data: any): Promise<ClinicalWorkflow> {
    const result = await this.apiCall<{ data: ClinicalWorkflow; success: true }>(
      '/workflows',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return result.data;
  }

  async updateClinicalWorkflow(id: string, data: any): Promise<ClinicalWorkflow> {
    const result = await this.apiCall<{ data: ClinicalWorkflow; success: true }>(
      `/workflows/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return result.data;
  }

  // Advanced Workflow State Management Methods
  async getWorkflowState(workflowId: string): Promise<any> {
    const result = await this.apiCall<{ data: any; success: true }>(`/workflows/${workflowId}/state`);
    return result.data;
  }

  async transitionWorkflowState(
    workflowId: string,
    newState: string,
    newCurrentStep: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    const result = await this.apiCall<{ data: any; success: true }>(
      `/workflows/${workflowId}/state/transition`,
      {
        method: 'POST',
        body: JSON.stringify({
          newState,
          newCurrentStep,
          reason,
          metadata,
        }),
      }
    );
    return result.data;
  }

  async getWorkflowHistory(workflowId: string, limit: number = 50): Promise<any[]> {
    const result = await this.apiCall<{ data: any[]; success: true }>(
      `/workflows/${workflowId}/history?limit=${limit}`
    );
    return result.data;
  }

  async recoverWorkflowState(
    workflowId: string,
    targetVersion: number,
    reason: string
  ): Promise<any> {
    const result = await this.apiCall<{ data: any; success: true }>(
      `/workflows/${workflowId}/state/recover`,
      {
        method: 'POST',
        body: JSON.stringify({
          targetVersion,
          reason,
        }),
      }
    );
    return result.data;
  }

  async validateWorkflowStateIntegrity(workflowId: string): Promise<boolean> {
    const result = await this.apiCall<{ data: { integrity_valid: boolean }; success: true }>(
      `/workflows/${workflowId}/state/validate`
    );
    return result.data.integrity_valid;
  }

  async getWorkflowStateStatistics(workflowId: string): Promise<{
    total_versions: number;
    current_version: number;
    state_changes: number;
    last_modified: string;
    integrity_valid: boolean;
  }> {
    const result = await this.apiCall<{ data: any; success: true }>(
      `/workflows/${workflowId}/state/statistics`
    );
    return result.data;
  }
}

export const clinicalApiClient = new ClinicalApiClient();