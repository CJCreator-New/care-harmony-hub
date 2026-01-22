import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRealtimeUpdates } from '../useRealtimeUpdates';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase Realtime
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  }
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hospital: { id: 'hosp-123' },
    profile: { user_id: 'user-456' },
    primaryRole: 'doctor'
  })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useRealtimeUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to hospital-scoped postgres changes', () => {
    renderHook(() => useRealtimeUpdates(), { wrapper: createWrapper() });

    // Verify channel creation for each table
    expect(supabase.channel).toHaveBeenCalledWith('public:patient_queue');
    expect(supabase.channel).toHaveBeenCalledWith('public:lab_orders');
    expect(supabase.channel).toHaveBeenCalledWith('public:prescriptions');
    expect(supabase.channel).toHaveBeenCalledWith('public:critical_value_alerts');

    // Verify subscriptions for core tables
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'patient_queue', filter: 'hospital_id=eq.hosp-123' }),
      expect.any(Function)
    );

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'lab_orders', filter: 'hospital_id=eq.hosp-123' }),
      expect.any(Function)
    );

    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should cleanup subscription on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeUpdates(), { wrapper: createWrapper() });
    
    unmount();
    
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
