import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'staff-1', hospital_id: 'h-1' } }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useActivityLog', () => ({ useActivityLog: () => ({ logActivity: vi.fn() }) }));
vi.mock('@/hooks/useDataProtection', () => ({
  useHIPAACompliance: () => ({
    encryptPHI: vi.fn(),
    prepareSecureLog: vi.fn(),
    validateCompliance: vi.fn(),
  }),
}));

import { PatientRegistrationModal } from '@/components/patients/PatientRegistrationModal';

describe('PatientRegistrationModal (shared FormField)', () => {
  it('marks the required personal fields and leaves optional fields unmarked', () => {
    render(<PatientRegistrationModal open onOpenChange={() => {}} onSuccess={() => {}} />);

    expect(screen.getByLabelText(/First Name/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/Last Name/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/Date of Birth/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-required');
  });
});
