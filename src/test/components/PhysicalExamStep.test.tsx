import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { PhysicalExamStep } from '@/components/consultations/steps/PhysicalExamStep';

describe('PhysicalExamStep', () => {
  it('adds a symptom when Enter is pressed', async () => {
    const onUpdate = vi.fn();
    const { getByPlaceholderText } = render(
      <PhysicalExamStep data={{ symptoms: [] }} onUpdate={onUpdate} />
    );

    const input = getByPlaceholderText('Add a symptom...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Cough' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('symptoms', ['Cough']);
    });
  });

  it('removes a symptom when remove button is clicked', async () => {
    const onUpdate = vi.fn();
    const { getByText } = render(
      <PhysicalExamStep data={{ symptoms: ['Fever'] }} onUpdate={onUpdate} />
    );

    const removeBtn = getByText('Fever').querySelector('button') as HTMLButtonElement;
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('symptoms', []);
    });
  });
});
