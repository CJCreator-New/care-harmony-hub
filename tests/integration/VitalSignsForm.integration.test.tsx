import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitalSignsForm } from '@/components/nurse/VitalSignsForm';

describe('VitalSignsForm Integration Tests', () => {
  it('renders key inputs and actions', () => {
    render(
      <VitalSignsForm patientId="patient-123" patientName="John Doe" onSave={vi.fn()} />
    );

    expect(screen.getByRole('spinbutton', { name: /temperature value/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save vital signs/i })).toBeInTheDocument();
  });

  it('submits captured vitals through onSave callback', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <VitalSignsForm patientId="patient-123" patientName="John Doe" onSave={onSave} />
    );

    const inputs = screen.getAllByRole('spinbutton');
    for (const input of inputs) {
      await user.clear(input);
      await user.type(input, '98');
    }

    await user.click(screen.getByRole('button', { name: /save vital signs/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: expect.any(Number),
          systolic: expect.any(Number),
          diastolic: expect.any(Number),
          pulse: expect.any(Number),
          respiration: expect.any(Number),
          spo2: expect.any(Number),
        })
      );
    });
  });
});
