/**
 * CLIN-27 regression: the prescription-dispensing and critical-lab hooks built
 * the actor from `profile.role` (does not exist) and `user.role` (always
 * 'authenticated'), and fell back to the tenant 'default-hospital'.
 *
 * The actor now comes from `useClinicalActor()`: a role the user holds and the
 * user's own `profile.hospital_id`. With no tenant the hooks fail closed and
 * make no request.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { resolveClinicalActor } from '@/hooks/useClinicalActor';
import {
  usePrescriptionDispensing,
  type PrescriptionDispensingEngine,
} from '@/modules/prescription-dispensing';
import {
  useCriticalLabEscalation,
  type CriticalLabEscalationEngine,
} from '@/modules/critical-lab-escalation';

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));

vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: vi.fn(), subscribe: vi.fn() };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  return { supabase: { channel: vi.fn(() => channel), removeChannel: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

/** Real AuthContext shape: Supabase user.role is the Postgres role. */
function authAs(roles: string[], hospitalId: string | null) {
  return {
    user: { id: 'user-1', role: 'authenticated' },
    profile: { id: 'profile-1', user_id: 'user-1', hospital_id: hospitalId },
    roles,
    primaryRole: roles[0] ?? null,
  };
}

const pendingWorkflow = {
  id: 'wf-1',
  status: 'pending_approval',
  current_step: 2,
};

function makePrescriptionEngine() {
  return {
    getWorkflow: vi.fn().mockResolvedValue(pendingWorkflow),
    getWorkflowByPrescriptionId: vi.fn().mockResolvedValue(pendingWorkflow),
    approve: vi.fn().mockResolvedValue({
      success: true,
      workflow: { ...pendingWorkflow, status: 'approved' },
    }),
  };
}

function makeLabEngine() {
  return {
    getActiveAlerts: vi.fn().mockResolvedValue([]),
    acknowledgeAlert: vi.fn().mockResolvedValue({ success: true }),
    resolveAlert: vi.fn().mockResolvedValue({ success: true }),
  };
}

describe('resolveClinicalActor', () => {
  it('uses a held role and the profile tenant, never user.role', () => {
    const r = resolveClinicalActor({
      userId: 'u',
      hospitalId: 'h',
      roles: ['pharmacist'],
      primaryRole: 'pharmacist',
    });
    expect(r.actor).toEqual({ id: 'u', hospitalId: 'h', role: 'pharmacist' });
  });

  it('prefers the acting role only when the user holds it', () => {
    const base = { userId: 'u', hospitalId: 'h', primaryRole: 'nurse' };
    expect(
      resolveClinicalActor({ ...base, roles: ['nurse', 'doctor'], actingRole: 'doctor' }).role
    ).toBe('doctor');
    expect(resolveClinicalActor({ ...base, roles: ['nurse'], actingRole: 'doctor' }).role).toBe(
      'nurse'
    );
  });

  it('fails closed with no tenant or no role', () => {
    expect(
      resolveClinicalActor({ userId: 'u', hospitalId: null, roles: ['doctor'] }).actor
    ).toBeNull();
    expect(resolveClinicalActor({ userId: 'u', hospitalId: 'h', roles: [] }).actor).toBeNull();
  });
});

describe('usePrescriptionDispensing actor (CLIN-27)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('a pharmacist acts as pharmacist and may approve', async () => {
    mockUseAuth.mockReturnValue(authAs(['pharmacist'], 'hospital-1'));
    const engine = makePrescriptionEngine();
    const { result } = renderHook(() =>
      usePrescriptionDispensing({
        workflowId: 'wf-1',
        engine: engine as unknown as PrescriptionDispensingEngine,
      })
    );
    await waitFor(() => expect(result.current.workflow?.id).toBe('wf-1'));
    expect(result.current.canApprove()).toBe(true);

    await act(async () => {
      await result.current.advanceStep('approve');
    });
    expect(engine.approve).toHaveBeenCalledWith(
      { id: 'user-1', hospitalId: 'hospital-1', role: 'pharmacist' },
      expect.objectContaining({ workflowId: 'wf-1' })
    );
  });

  it('with no hospital it returns an error and never calls the engine', async () => {
    mockUseAuth.mockReturnValue(authAs(['pharmacist'], null));
    const engine = makePrescriptionEngine();
    const { result } = renderHook(() =>
      usePrescriptionDispensing({
        workflowId: 'wf-1',
        engine: engine as unknown as PrescriptionDispensingEngine,
      })
    );
    let outcome: { success: boolean; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.advanceStep('approve');
    });
    expect(outcome?.success).toBe(false);
    expect(engine.approve).not.toHaveBeenCalled();
  });
});

describe('useCriticalLabEscalation actor (CLIN-27)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('a doctor fetches alerts for their own tenant and id', async () => {
    mockUseAuth.mockReturnValue(authAs(['doctor'], 'hospital-1'));
    const engine = makeLabEngine();
    renderHook(() =>
      useCriticalLabEscalation({ engine: engine as unknown as CriticalLabEscalationEngine })
    );
    await waitFor(() =>
      expect(engine.getActiveAlerts).toHaveBeenCalledWith('hospital-1', 'user-1')
    );
  });

  it('with no hospital it shows an error and makes no default-tenant request', async () => {
    mockUseAuth.mockReturnValue(authAs(['doctor'], null));
    const engine = makeLabEngine();
    const { result } = renderHook(() =>
      useCriticalLabEscalation({ engine: engine as unknown as CriticalLabEscalationEngine })
    );
    await waitFor(() => expect(result.current.error).toMatch(/hospital/i));
    expect(engine.getActiveAlerts).not.toHaveBeenCalled();

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.acknowledgeAlert('alert-1');
    });
    expect(outcome?.success).toBe(false);
    expect(engine.acknowledgeAlert).not.toHaveBeenCalled();
  });
});
