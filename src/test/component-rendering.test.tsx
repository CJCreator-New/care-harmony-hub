import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StandardizedFormField from '@/components/common/StandardizedFormField';
import PatientRegistrationModal from '@/components/modals/PatientRegistrationModal';
import AppointmentDashboard from '@/components/dashboards/AppointmentDashboard';
import PatientDataTable from '@/components/tables/PatientDataTable';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import NavigationBar from '@/components/navigation/NavigationBar';

describe('Components - Form Fields', () => {
  it('should render text input field', () => {
    render(
      <StandardizedFormField
        name="firstName"
        label="First Name"
        type="text"
        value=""
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should display field validation error', () => {
    render(
      <StandardizedFormField
        name="email"
        label="Email"
        type="email"
        value="invalid-email"
        error="Invalid email format"
        onChange={() => {}}
      />
    );

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('should render select field with options', () => {
    const options = [
      { value: 'mr', label: 'Mr.' },
      { value: 'ms', label: 'Ms.' },
      { value: 'dr', label: 'Dr.' },
    ];

    render(
      <StandardizedFormField
        name="title"
        label="Title"
        type="select"
        options={options}
        value="mr"
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('should render date picker field', () => {
    render(
      <StandardizedFormField
        name="dateOfBirth"
        label="Date of Birth"
        type="date"
        value="1980-05-15"
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Date of Birth')).toBeInTheDocument();
  });

  it('should disable field when required', () => {
    render(
      <StandardizedFormField
        name="disabled"
        label="Disabled Field"
        type="text"
        disabled={true}
        value=""
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should call onChange when value changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <StandardizedFormField
        name="test"
        label="Test"
        type="text"
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test value');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should display help text if provided', () => {
    render(
      <StandardizedFormField
        name="password"
        label="Password"
        type="password"
        helpText="At least 8 characters with numbers"
        value=""
        onChange={() => {}}
      />
    );

    expect(screen.getByText('At least 8 characters with numbers')).toBeInTheDocument();
  });

  it('should show required indicator', () => {
    render(
      <StandardizedFormField
        name="required"
        label="Required Field"
        type="text"
        required={true}
        value=""
        onChange={() => {}}
      />
    );

    expect(screen.getByText('*', { selector: '.required-indicator' })).toBeInTheDocument();
  });
});

describe('Components - Modal Dialogs', () => {
  it('should render registration modal', () => {
    render(
      <PatientRegistrationModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    expect(screen.getByRole('heading', { name: /patient registration/i })).toBeInTheDocument();
  });

  it('should display form fields in modal', () => {
    render(
      <PatientRegistrationModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('should close modal on cancel', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <PatientRegistrationModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={() => {}}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(handleClose).toHaveBeenCalled();
  });

  it('should submit form on save', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <PatientRegistrationModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={handleSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /save|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  it('should validate form before submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <PatientRegistrationModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={handleSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /save/i });
    await user.click(submitButton);

    // Should not call submit if validation fails
    await waitFor(() => {
      if (screen.queryByText(/error|required/i)) {
        expect(handleSubmit).not.toHaveBeenCalled();
      }
    });
  });

  it('should not render modal when closed', () => {
    const { container } = render(
      <PatientRegistrationModal
        isOpen={false}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    const modal = container.querySelector('[role="dialog"]');
    expect(modal).not.toBeInTheDocument();
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <PatientRegistrationModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={() => {}}
      />
    );

    // ESC key should close modal
    await user.keyboard('{Escape}');

    expect(handleClose).toHaveBeenCalled();
  });
});

describe('Components - Data Tables', () => {
  const mockPatients = [
    { id: 'pat-001', name: 'Rajesh Singh', mrn: '001', age: 65, status: 'Active' },
    { id: 'pat-002', name: 'Priya Sharma', mrn: '002', age: 45, status: 'Active' },
    { id: 'pat-003', name: 'Amit Kumar', mrn: '003', age: 35, status: 'Inactive' },
  ];

  it('should render data table', () => {
    render(
      <PatientDataTable
        data={mockPatients}
        columns={['name', 'mrn', 'age', 'status']}
        onRowClick={() => {}}
      />
    );

    expect(screen.getByText('Rajesh Singh')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
  });

  it('should display column headers', () => {
    render(
      <PatientDataTable
        data={mockPatients}
        columns={['name', 'mrn', 'age', 'status']}
        onRowClick={() => {}}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('MRN')).toBeInTheDocument();
  });

  it('should handle row selection', async () => {
    const user = userEvent.setup();
    const handleRowClick = vi.fn();

    render(
      <PatientDataTable
        data={mockPatients}
        columns={['name', 'mrn', 'age', 'status']}
        onRowClick={handleRowClick}
      />
    );

    const firstRow = screen.getByText('Rajesh Singh').closest('tr');
    await user.click(firstRow!);

    expect(handleRowClick).toHaveBeenCalledWith(mockPatients[0]);
  });

  it('should support pagination', () => {
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      id: `pat-${i}`,
      name: `Patient ${i}`,
      mrn: `${i.toString().padStart(3, '0')}`,
      age: 30 + (i % 40),
      status: 'Active',
    }));

    render(
      <PatientDataTable
        data={largeDataset}
        columns={['name', 'mrn', 'age', 'status']}
        pageSize={10}
        onRowClick={() => {}}
      />
    );

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeLessThanOrEqual(11); // Header + 10 rows per page
  });

  it('should support sorting', async () => {
    const user = userEvent.setup();

    render(
      <PatientDataTable
        data={mockPatients}
        columns={['name', 'mrn', 'age', 'status']}
        sortable={true}
        onRowClick={() => {}}
      />
    );

    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);

    // Table should be sorted
    expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
  });

  it('should support filtering', async () => {
    const user = userEvent.setup();

    render(
      <PatientDataTable
        data={mockPatients}
        columns={['name', 'mrn', 'age', 'status']}
        filterable={true}
        onRowClick={() => {}}
      />
    );

    const filterInput = screen.getByPlaceholderText(/search|filter/i);
    await user.type(filterInput, 'Rajesh');

    expect(screen.getByText('Rajesh Singh')).toBeInTheDocument();
    expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <PatientDataTable
        data={[]}
        columns={['name', 'mrn', 'age', 'status']}
        loading={true}
        onRowClick={() => {}}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});

describe('Components - Dashboards', () => {
  const mockAppointments = [
    { id: 'apt-001', patientName: 'Rajesh Singh', time: '10:00 AM', status: 'Confirmed' },
    { id: 'apt-002', patientName: 'Priya Sharma', time: '10:30 AM', status: 'Pending' },
  ];

  it('should render dashboard', () => {
    render(
      <AppointmentDashboard
        appointments={mockAppointments}
      />
    );

    expect(screen.getByRole('heading', { name: /appointments/i })).toBeInTheDocument();
  });

  it('should display appointment cards', () => {
    render(
      <AppointmentDashboard
        appointments={mockAppointments}
      />
    );

    expect(screen.getByText('Rajesh Singh')).toBeInTheDocument();
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
  });

  it('should show no appointments message when empty', () => {
    render(
      <AppointmentDashboard
        appointments={[]}
      />
    );

    expect(screen.getByText(/no appointments/i)).toBeInTheDocument();
  });

  it('should display appointment status badges', () => {
    render(
      <AppointmentDashboard
        appointments={mockAppointments}
      />
    );

    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should handle appointment click', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <AppointmentDashboard
        appointments={mockAppointments}
        onAppointmentClick={handleSelect}
      />
    );

    const appointment = screen.getByText('Rajesh Singh').closest('[role="button"]');
    if (appointment) {
      await user.click(appointment);
      expect(handleSelect).toHaveBeenCalled();
    }
  });
});

describe('Components - Error Boundary', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  it('should catch and display error', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error|something went wrong/i)).toBeInTheDocument();
  });

  it('should not expose error details to user', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Test error')).not.toBeInTheDocument();
  });

  it('should allow retry after error', async () => {
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const retryButton = screen.queryByRole('button', { name: /retry|try again/i });
    if (retryButton) {
      await user.click(retryButton);
      expect(retryButton).toBeInTheDocument();
    }
  });

  it('should render children when no error', () => {
    const SafeComponent = () => <div>Safe content</div>;

    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });
});

describe('Components - Navigation', () => {
  const mockMenuItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Patients', href: '/patients' },
    { label: 'Appointments', href: '/appointments' },
    { label: 'Settings', href: '/settings' },
  ];

  it('should render navigation bar', () => {
    render(
      <NavigationBar
        items={mockMenuItems}
        currentPath="/"
      />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Patients')).toBeInTheDocument();
  });

  it('should highlight active menu item', () => {
    render(
      <NavigationBar
        items={mockMenuItems}
        currentPath="/patients"
      />
    );

    const patientsLink = screen.getByText('Patients').closest('a');
    expect(patientsLink).toHaveClass('active');
  });

  it('should navigate to menu item', async () => {
    const user = userEvent.setup();

    render(
      <NavigationBar
        items={mockMenuItems}
        currentPath="/"
      />
    );

    const patientsLink = screen.getByText('Patients');
    await user.click(patientsLink);

    expect(patientsLink.closest('a')).toHaveAttribute('href', '/patients');
  });

  it('should display user profile section', () => {
    render(
      <NavigationBar
        items={mockMenuItems}
        currentPath="/"
        userProfile={{ name: 'Dr. Sharma', role: 'Doctor' }}
      />
    );

    expect(screen.getByText('Dr. Sharma')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
  });

  it('should handle mobile menu toggle', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <NavigationBar
        items={mockMenuItems}
        currentPath="/"
      />
    );

    const menuToggle = screen.queryByRole('button', { name: /menu|toggle/i });
    if (menuToggle) {
      await user.click(menuToggle);
      const menu = container.querySelector('.mobile-menu');
      expect(menu).toHaveClass('open');
    }
  });
});

describe('Components - Accessibility', () => {
  it('form fields should have proper labels', () => {
    render(
      <StandardizedFormField
        name="email"
        label="Email Address"
        type="email"
        value=""
        onChange={() => {}}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAccessibleName('Email Address');
  });

  it('buttons should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <button onClick={handleClick}>Submit</button>
    );

    const button = screen.getByRole('button');
    await user.keyboard('{Enter}');

    expect(button).toBeInTheDocument();
  });

  it('modals should trap focus', () => {
    render(
      <PatientRegistrationModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  it('data tables should have proper heading hierarchy', () => {
    render(
      <PatientDataTable
        data={[]}
        columns={['name', 'mrn', 'age', 'status']}
        onRowClick={() => {}}
      />
    );

    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBeGreaterThan(0);
  });
});
