/**
 * In-Memory Test Adapters for OrderSafetyEngine Ports
 * Fast, deterministic test doubles enabling complete testability without network I/O.
 */

import {
  ActivePatientMedication,
  AuditLoggerPort,
  AuditSafetyEvent,
  LocalContraindicationRule,
  LocalDdiRepositoryPort,
  RxNormTerminologyPort,
  TerminologyInteraction,
} from '../ports';

export class InMemoryLocalDdiAdapter implements LocalDdiRepositoryPort {
  private activeMeds = new Map<string, ActivePatientMedication[]>();
  private contraindications: LocalContraindicationRule[] = [];

  setActiveMeds(patientKey: string, meds: ActivePatientMedication[]) {
    this.activeMeds.set(patientKey, meds);
  }

  addContraindication(rule: LocalContraindicationRule) {
    this.contraindications.push(rule);
  }

  async getPatientActiveMedications(
    patientId: string,
    hospitalId: string
  ): Promise<readonly ActivePatientMedication[]> {
    const key = `${hospitalId}:${patientId}`;
    return this.activeMeds.get(key) || [];
  }

  async findLocalContraindications(
    drugNameOrRxcui: string,
    _hospitalId: string
  ): Promise<readonly LocalContraindicationRule[]> {
    const term = drugNameOrRxcui.toLowerCase();
    return this.contraindications.filter(
      (c) =>
        c.primaryDrug.toLowerCase().includes(term) || term.includes(c.primaryDrug.toLowerCase())
    );
  }
}

export class MockRxNormAdapter implements RxNormTerminologyPort {
  private mockedInteractions: TerminologyInteraction[] = [];
  public shouldSimulateTimeout = false;
  public shouldSimulateError = false;

  setInteractions(interactions: TerminologyInteraction[]) {
    this.mockedInteractions = interactions;
  }

  async checkInteractions(
    _rxcuis: readonly string[],
    _signal?: AbortSignal
  ): Promise<{
    readonly interactions: readonly TerminologyInteraction[];
    readonly isDegraded: boolean;
    readonly error?: string;
  }> {
    if (this.shouldSimulateTimeout) {
      return {
        interactions: [],
        isDegraded: true,
        error: 'Simulated RxNorm timeout (5000ms elapsed)',
      };
    }

    if (this.shouldSimulateError) {
      return {
        interactions: [],
        isDegraded: true,
        error: 'Simulated RxNorm 500 Internal Server Error',
      };
    }

    return {
      interactions: this.mockedInteractions,
      isDegraded: false,
    };
  }
}

export class SpyAuditLoggerAdapter implements AuditLoggerPort {
  public loggedEvents: AuditSafetyEvent[] = [];

  async logSafetyEvent(event: AuditSafetyEvent): Promise<string> {
    this.loggedEvents.push(event);
    return `audit-spy-${this.loggedEvents.length}`;
  }

  clear() {
    this.loggedEvents = [];
  }
}
