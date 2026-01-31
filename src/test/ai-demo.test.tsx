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

    // Check for the card title with shield icon
    expect(screen.getByText('All data is encrypted and PHI is automatically sanitized before AI processing.')).toBeInTheDocument();
    expect(screen.getByText('Patient data is encrypted using AES-GCM with unique keys per session.')).toBeInTheDocument();
    expect(screen.getByText('Every AI operation is logged with compliance status and data retention policies.')).toBeInTheDocument();
    expect(screen.getByText('Continuous compliance monitoring with automatic alerts for policy violations.')).toBeInTheDocument();
  });

  it('shows demo environment warning', () => {
    render(<AIDemoPage />, { wrapper });

    expect(screen.getByText('Demo Environment Notice')).toBeInTheDocument();
    expect(screen.getByText('This is a demonstration environment.')).toBeInTheDocument();
  });
});