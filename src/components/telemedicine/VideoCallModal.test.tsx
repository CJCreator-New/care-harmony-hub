import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoCallModal } from './VideoCallModal';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// A chainable stand-in for the Supabase query builder. Every query resolves to no data.
vi.mock('@/integrations/supabase/client', () => {
  const builder = (): any => {
    const b: any = {};
    for (const m of [
      'select',
      'eq',
      'insert',
      'update',
      'order',
      'limit',
      'maybeSingle',
      'single',
    ]) {
      b[m] = () => b;
    }
    b.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve, reject);
    return b;
  };
  return {
    supabase: {
      from: () => builder(),
      channel: () => ({
        on: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }) }),
        send: () => {},
      }),
      removeChannel: () => {},
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          createSignedUrl: async () => ({ data: { signedUrl: 'https://example.test/x' } }),
        }),
      },
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'u1' }, hospital: { id: 'h1' } }),
}));

vi.mock('./TelemedicineChat', () => ({ TelemedicineChat: () => null }));
vi.mock('./SessionNotes', () => ({ SessionNotes: () => null }));

const patient = { id: 'p1', first_name: 'Asha', last_name: 'Rao' } as any;

function renderModal() {
  return render(
    <VideoCallModal open onOpenChange={() => {}} patient={patient} appointmentId="a1" />
  );
}

describe('VideoCallModal call lifecycle', () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
    });
  });

  it('offers the start button in the idle state', () => {
    renderModal();
    const start = screen.getByRole('button', { name: /Start Video Call/ });
    expect((start as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows connecting and disables the button while camera access is pending', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => new Promise(() => {}) },
      configurable: true,
    });
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Start Video Call/ }));

    const connecting = await screen.findByRole('button', { name: /Connecting/ });
    expect((connecting as HTMLButtonElement).disabled).toBe(true);
  });

  it('returns to the idle start button when the camera request fails', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(new Error('denied')) },
      configurable: true,
    });
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Start Video Call/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to start call'));
    const start = screen.getByRole('button', { name: /Start Video Call/ });
    expect((start as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: /Connecting/ })).toBeNull();
  });
});
