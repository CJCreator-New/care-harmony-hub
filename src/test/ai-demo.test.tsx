import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AIDemoPage from '@/pages/AIDemoPage';

// Mock the AI hooks
vi.mock('@/hooks/useAI', () => ({
  useAI: () => ({
    diagnosePatient: vi.fn(),
    createTreatmentPlan: vi.fn(),
    reviewMedications: vi.fn(),
    summarizeClinicalData: vi.fn(),
    isLoading: false,
    lastResponse: null,
    error: null,
    complianceStatus: { status: 'compliant', issues: [] },
    clearError: vi.fn(),
  }),
  useAIProviders: () => ({
    providers: [
      { name: 'OpenAI', model: 'gpt-4', status: 'available' },
      { name: 'Anthropic', model: 'claude-3', status: 'available' },
    ],
  }),
  useAIAudit: () => ({
    auditHistory: [],
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </QueryClientProvider>
);

describe('AIDemoPage', () => {
  it('renders the AI demo page correctly', () => {
    render(<AIDemoPage />, { wrapper });

    expect(screen.getByText('AI Clinical Assistant Demo')).toBeInTheDocument();
    expect(screen.getByText('HIPAA-compliant AI assistance for clinical decision support')).toBeInTheDocument();
    expect(screen.getByText('Patient Information')).toBeInTheDocument();
    expect(screen.getByText('AI Analysis')).toBeInTheDocument();
  });

  it('displays security features', () => {
    render(<AIDemoPage />, { wrapper });

    expect(screen.getByText('HIPAA Compliant')).toBeInTheDocument();
    expect(screen.getByText('End-to-End Encryption')).toBeInTheDocument();
    expect(screen.getByText('Full Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('Real-time Monitoring')).toBeInTheDocument();
  });

  it('shows demo environment warning', () => {
    render(<AIDemoPage />, { wrapper });

    expect(screen.getByText('Demo Environment Notice')).toBeInTheDocument();
    expect(screen.getByText('This is a demonstration environment.')).toBeInTheDocument();
  });
});