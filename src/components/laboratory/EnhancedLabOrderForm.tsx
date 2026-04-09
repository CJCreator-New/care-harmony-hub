import React, { useState } from 'react';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Clock, Beaker, AlertTriangle } from 'lucide-react';
import {
  LabOrderSchema,
  LabOrderFormData,
  COMMON_LAB_TESTS,
  COLLECTION_METHODS,
  PRIORITY_LEVELS,
  getTestDetails,
  isFastingRequired,
  getTurnaroundDisplay,
  getFastingRecommendation,
  isStatOrder,
  getRecommendedFastingHours,
} from '../../lib/schemas/labOrderSchema';
import { sanitizeForLog } from '../../utils/sanitize';

/**
 * HP-2 PR3: EnhancedLabOrderForm Component
 * 
 * Lab order form with:
 * - Test selection from approved list
 * - Specimen type and collection method
 * - Fasting requirement handling
 * - Clinical indication requirement
 * - Priority/urgency selection
 * - Turnaround time display
 * - Cross-field validation
 * - Hospital context enforcement
 * - STAT order warnings
 * - HIPAA-safe logging
 */

interface EnhancedLabOrderFormProps {
  hospitalId: string;
  orderingProviderId: string;
  patientId: string;
  patientName?: string;
  onSuccess?: (order: LabOrderFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitButtonLabel?: string;
}

const SPECIMEN_TYPES = [
  { value: 'blood', label: 'Blood' },
  { value: 'urine', label: 'Urine' },
  { value: 'stool', label: 'Stool' },
  { value: 'saliva', label: 'Saliva' },
  { value: 'sputum', label: 'Sputum' },
  { value: 'other', label: 'Other' },
];

export const EnhancedLabOrderForm: React.FC<EnhancedLabOrderFormProps> = ({
  hospitalId,
  orderingProviderId,
  patientId,
  patientName,
  onSuccess,
  onCancel,
  isLoading = false,
  submitButtonLabel = 'Place Lab Order',
}) => {
  const [testSearch, setTestSearch] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const methods = useForm<LabOrderFormData>({
    resolver: zodResolver(LabOrderSchema),
    mode: 'onBlur',
    defaultValues: {
      hospitalId,
      orderingProviderId,
      patientId,
      priority: 'ROUTINE',
      requiresFasting: false,
      fastingHours: 0,
      collectionMethod: 'VENIPUNCTURE',
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = methods;

  const selectedTestCode = watch('testCode');
  const selectedPriority = watch('priority');
  const selectedSpecimen = watch('specimenType');
  const clinicalIndication = watch('clinicalIndication');
  const requiresFasting = watch('requiresFasting');

  // Get test details to show fasting requirement
  const testDetails = selectedTestCode ? getTestDetails(selectedTestCode) : null;
  const fastingRequired = testDetails?.fasting;
  const turnaroundDisplay = selectedTestCode ? getTurnaroundDisplay(selectedTestCode, selectedPriority) : null;
  const isStatOrder = isStatOrder(selectedPriority);

  // Filter tests based on search
  const filteredTests = testSearch.length > 0
    ? COMMON_LAB_TESTS.filter(
        (t) =>
          t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
          t.code.toLowerCase().includes(testSearch.toLowerCase())
      )
    : COMMON_LAB_TESTS;

  // Filter collection methods based on specimen type
  const compatibleMethods = selectedSpecimen
    ? COLLECTION_METHODS.filter((m) => {
        const compatibility: Record<string, string[]> = {
          blood: ['VENIPUNCTURE', 'CAPILLARY'],
          urine: ['MIDSTREAM', 'CLEAN_CATCH', 'CATHETER'],
          stool: ['STOOL_SAMPLE'],
          saliva: ['SALIVA'],
          sputum: ['SPUTUM'],
        };
        return compatibility[selectedSpecimen]?.includes(m.code);
      })
    : COLLECTION_METHODS;

  const handleFormSubmit = async (data: LabOrderFormData) => {
    try {
      setSubmissionError(null);

      // Log sanitized submission info (no PHI)
      console.log(
        `[LabOrder] Placing lab order for patient ${patientId} at hospital ${hospitalId}`
      );

      // Call success handler
      onSuccess?.(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lab order submission failed';
      setSubmissionError(message);
      console.error('Lab order error:', sanitizeForLog(error));
    }
  };

  const handleTestSelect = (testCode: string) => {
    setValue('testCode', testCode);
    const test = getTestDetails(testCode);
    if (test) {
      setValue('specimenType', test.specimen as any);
      // Auto-set fasting if required
      if (test.fasting) {
        setValue('requiresFasting', true);
        setValue('fastingHours', getRecommendedFastingHours(testCode));
      }
    }
    setTestSearch('');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* Header */}
          <div className="border-b pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Lab Order</h1>
            {patientName && <p className="text-gray-600">Patient: {patientName}</p>}
            <p className="text-gray-500 text-sm">Order laboratory tests for clinical evaluation</p>
          </div>

          {/* STAT Order Warning */}
          {isStatOrder && (
            <div className="flex gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">STAT Order</h3>
                <p className="text-sm text-red-800 mt-1">
                  This order will be processed within 4 hours. Ensure clinical indication is comprehensive.
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {submissionError && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Order Error</h3>
                <p className="text-sm text-red-800 mt-1">{submissionError}</p>
              </div>
            </div>
          )}

          {/* TEST SELECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Beaker className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Test Selection</h2>
            </div>

            {/* Test Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search or Select Test *
              </label>
              <input
                type="text"
                placeholder="Search by test name or code (e.g., CBC, glucose)"
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />

              {/* Test List Dropdown */}
              {testSearch.length > 0 && (
                <div className="border border-gray-200 rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto z-10">
                  {filteredTests.length > 0 ? (
                    filteredTests.map((test) => (
                      <button
                        key={test.code}
                        type="button"
                        onClick={() => handleTestSelect(test.code)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex justify-between items-start"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{test.name}</p>
                          <p className="text-xs text-gray-600">Code: {test.code}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Specimen: {test.specimen} | Turnaround: {test.turnaroundDays} day(s)
                            {test.fasting && ' | Fasting required'}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-sm">No tests found</div>
                  )}
                </div>
              )}

              {/* Hidden select for form binding */}
              <select {...register('testCode')} className="hidden" />

              {/* Display selected test */}
              {selectedTestCode && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">{testDetails?.name}</p>
                    <p className="text-sm text-blue-700">{testDetails?.code}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue('testCode', '' as any)}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Change
                  </button>
                </div>
              )}

              {errors.testCode && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.testCode.message}
                </p>
              )}
            </div>
          </div>

          {/* SPECIMEN & COLLECTION */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900">Specimen Information</h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Specimen Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specimen Type *
                </label>
                <select
                  {...register('specimenType')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.specimenType ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Select...</option>
                  {SPECIMEN_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {errors.specimenType && (
                  <p className="text-sm text-red-600 mt-1">{errors.specimenType.message}</p>
                )}
              </div>

              {/* Collection Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Method *
                </label>
                <select
                  {...register('collectionMethod')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.collectionMethod ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Select...</option>
                  {compatibleMethods.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {errors.collectionMethod && (
                  <p className="text-sm text-red-600 mt-1">{errors.collectionMethod.message}</p>
                )}
              </div>
            </div>

            {/* Special Handling */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Handling Instructions
              </label>
              <textarea
                placeholder="e.g., Keep on ice, protect from light, etc."
                rows={2}
                {...register('specialHandling')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.specialHandling ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.specialHandling && (
                <p className="text-sm text-red-600 mt-1">{errors.specialHandling.message}</p>
              )}
            </div>
          </div>

          {/* PATIENT PREPARATION */}
          {fastingRequired && (
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900">Patient Preparation</h2>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <p className="font-semibold mb-1">⚠️ Fasting Required</p>
                <p>{getFastingRecommendation(selectedTestCode)}</p>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('requiresFasting')}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Patient has fasted appropriately
                  </span>
                </label>
                {errors.requiresFasting && (
                  <p className="text-sm text-red-600 mt-1">{errors.requiresFasting.message}</p>
                )}
              </div>

              {requiresFasting && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fasting Duration (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    {...register('fastingHours', { valueAsNumber: true })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.fastingHours ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.fastingHours && (
                    <p className="text-sm text-red-600 mt-1">{errors.fastingHours.message}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CLINICAL CONTEXT */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900">Clinical Context</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinical Indication * <span className="text-red-600">(required, min 10 chars)</span>
              </label>
              <textarea
                placeholder="Reason for ordering this test (e.g., abnormal vital signs, patient symptoms, routine screening)"
                rows={3}
                {...register('clinicalIndication')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.clinicalIndication ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                {clinicalIndication?.length || 0} / 500 characters
              </p>
              {errors.clinicalIndication && (
                <p className="text-sm text-red-600 mt-1">{errors.clinicalIndication.message}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Priority *
              </label>
              <div className="space-y-2">
                {PRIORITY_LEVELS.map((level) => (
                  <label key={level.code} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      value={level.code}
                      {...register('priority')}
                      className="w-4 h-4 text-blue-600 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-900">{level.label}</span>
                    {level.urgent && <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">URGENT</span>}
                  </label>
                ))}
              </div>
              {errors.priority && (
                <p className="text-sm text-red-600 mt-2">{errors.priority.message}</p>
              )}
            </div>

            {/* Turnaround Display */}
            {turnaroundDisplay && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                <Clock className="w-4 h-4" />
                <span>Expected turnaround: <strong>{turnaroundDisplay}</strong></span>
              </div>
            )}
          </div>

          {/* ADDITIONAL NOTES */}
          <div className="space-y-2 border-t pt-6">
            <label className="block text-sm font-medium text-gray-700">
              Additional Notes
            </label>
            <textarea
              placeholder="Any additional clinical notes or special instructions"
              rows={2}
              {...register('additionalNotes')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.additionalNotes ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.additionalNotes && (
              <p className="text-sm text-red-600 mt-1">{errors.additionalNotes.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="ml-auto px-6 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 rounded-lg font-medium transition flex items-center gap-2"
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {submitButtonLabel}
                </>
              )}
            </button>
          </div>

          {/* Hidden fields */}
          <input type="hidden" {...register('hospitalId')} />
          <input type="hidden" {...register('orderingProviderId')} />
          <input type="hidden" {...register('patientId')} />
        </form>
      </FormProvider>
    </div>
  );
};

export default EnhancedLabOrderForm;
