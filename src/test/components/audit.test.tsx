import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { DataExportTool } from '@/components/audit/DataExportTool';
import { Pagination } from '@/components/ui/pagination';

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { hospital_id: 'test-hospital' }
  })
}));

// Mock hooks
vi.mock('@/hooks/usePaginatedQuery', () => ({
  usePaginatedQuery: () => ({
    data: [
      {
        id: '1',
        user_email: 'test@example.com',
        action_type: 'login',
        entity_type: 'user',
        severity: 'info',
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
        details: { test: 'data' }
      }
    ],
    count: 1,
    totalPages: 1,
    currentPage: 0,
    pageSize: 50,
    isLoading: false,
    nextPage: vi.fn(),
    prevPage: vi.fn(),
    goToPage: vi.fn()
  })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AuditLogViewer', () => {
  it('renders audit logs table', () => {
    render(<AuditLogViewer />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('filters logs by search query', () => {
    render(<AuditLogViewer />, { wrapper: createWrapper() });
    
    const searchInput = screen.getByPlaceholderText(/search by user/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(searchInput).toHaveValue('test');
  });
});

describe('DataExportTool', () => {
  it('renders export options', () => {
    render(<DataExportTool />, { wrapper: createWrapper() });
    
    expect(screen.getByText('HIPAA-Compliant Data Export')).toBeInTheDocument();
    expect(screen.getByText('Export Data')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 0,
    totalPages: 5,
    onPageChange: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    pageSize: 25,
    totalCount: 100
  };

  it('renders pagination controls', () => {
    render(<Pagination {...defaultProps} />);
    
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 to 25 of 100 results')).toBeInTheDocument();
  });

  it('calls onNext when next button clicked', () => {
    render(<Pagination {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[2]; // Third button is next
    fireEvent.click(nextButton);
    
    expect(defaultProps.onNext).toHaveBeenCalled();
  });
});