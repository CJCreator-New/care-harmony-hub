import React, { useState } from 'react';
import { useForm, useFieldArray, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Phone, Mail, MapPin, Shield } from 'lucide-react';
import {
  PatientRegistrationSchema,
  PatientRegistrationFormData,
  calculateAge,
  formatPhoneNumber,
  shouldUseAddressAutocomplete,
  DEFAULT_INSURANCE,
  DEFAULT_EMERGENCY_CONTACT,
} from '../../lib/schemas/patientRegistrationSchema';
import { sanitizeForLog } from '../../utils/sanitize';

/**
 * HP-2 PR2: EnhancedPatientRegistrationForm Component
 * 
 * Multi-step patient registration form with:
 * - Step 1: Basic info (name, DOB, gender, email, phone)
 * - Step 2: Address entry with country-specific postal validation
 * - Step 3: Optional emergency contact and insurance info
 * - Field-level error display
 * - Real-time validation feedback
 * - Hospital context enforcement
 * - HIPAA-safe logging
 */

interface EnhancedPatientRegistrationFormProps {
  hospitalId: string;
  onSuccess?: (patient: PatientRegistrationFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitButtonLabel?: string;
}

type RegistrationStep = 'basic' | 'address' | 'optional';

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'JP', label: 'Japan' },
  { code: 'IN', label: 'India' },
  { code: 'OTHER', label: 'Other' },
];

const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];

const RELATIONSHIPS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other', label: 'Other' },
];

export const EnhancedPatientRegistrationForm: React.FC<EnhancedPatientRegistrationFormProps> = ({
  hospitalId,
  onSuccess,
  onCancel,
  isLoading = false,
  submitButtonLabel = 'Register Patient',
}) => {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('basic');
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [includeEmergencyContact, setIncludeEmergencyContact] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const methods = useForm<PatientRegistrationFormData>({
    resolver: zodResolver(PatientRegistrationSchema),
    mode: 'onBlur',
    defaultValues: {
      hospitalId,
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      },
      insurance: includeInsurance ? DEFAULT_INSURANCE : undefined,
      emergencyContact: includeEmergencyContact ? DEFAULT_EMERGENCY_CONTACT : undefined,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    getValues,
  } = methods;

  const selectedCountry = watch('address.country');
  const dobValue = watch('dateOfBirth');
  const phoneValue = watch('phoneNumber');

  // Calculate age display
  const ageDisplay = dobValue
    ? `(Age: ${calculateAge(new Date(dobValue))} years)`
    : '';

  // Determine if address autocomplete is recommended
  const recommendAutocomplete = shouldUseAddressAutocomplete(selectedCountry);

  const handleStepChange = async (nextStep: RegistrationStep) => {
    // Validate current step before moving
    if (currentStep === 'basic') {
      const isValid = await methods.trigger(['firstName', 'lastName', 'dateOfBirth', 'gender', 'email', 'phoneNumber']);
      if (isValid) {
        setCurrentStep(nextStep);
        setSubmissionError(null);
      }
    } else if (currentStep === 'address') {
      const isValid = await methods.trigger(['address']);
      if (isValid) {
        setCurrentStep(nextStep);
        setSubmissionError(null);
      }
    } else {
      setCurrentStep(nextStep);
      setSubmissionError(null);
    }
  };

  const handleFormSubmit = async (data: PatientRegistrationFormData) => {
    try {
      setSubmissionError(null);
      
      // Add optional fields conditionally
      if (!includeInsurance) {
        data.insurance = undefined;
      }
      if (!includeEmergencyContact) {
        data.emergencyContact = undefined;
      }

      // Log sanitized submission info (no PHI)
      console.log(
        `[PatientRegistration] Submitting patient registration for hospital ${data.hospitalId}`
      );

      // Call success handler
      onSuccess?.(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setSubmissionError(message);
      console.error('Patient registration error:', sanitizeForLog(error));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* Header */}
          <div className="border-b pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Registration</h1>
            <p className="text-gray-600">Step-by-step registration for new patients</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8">
            <div className={`flex-1 h-2 rounded-full ${currentStep === 'basic' || currentStep === 'address' || currentStep === 'optional' ? 'bg-blue-500' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${currentStep === 'address' || currentStep === 'optional' ? 'bg-blue-500' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${currentStep === 'optional' ? 'bg-blue-500' : 'bg-gray-200'}`} />
          </div>

          {/* Error Alert */}
          {submissionError && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Registration Error</h3>
                <p className="text-sm text-red-800 mt-1">{submissionError}</p>
              </div>
            </div>
          )}

          {/* STEP 1: BASIC INFORMATION */}
          {currentStep === 'basic' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    placeholder="John"
                    {...register('firstName')}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    {...register('lastName')}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth * {ageDisplay && <span className="text-gray-500 text-xs font-normal">{ageDisplay}</span>}
                  </label>
                  <input
                    type="date"
                    {...register('dateOfBirth', { valueAsDate: true })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.dateOfBirth ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender Identity *
                  </label>
                  <select
                    {...register('gender')}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.gender ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select...</option>
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  {errors.gender && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.gender.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="john.doe@example.com"
                  {...register('email')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number * <span className="text-xs text-gray-500 font-normal">(International format: +1-234-567-8900)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  {...register('phoneNumber')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.phoneNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {phoneValue && !errors.phoneNumber && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Format: {phoneValue}
                  </p>
                )}
                {errors.phoneNumber && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStepChange('address')}
                  className="ml-auto px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-medium transition"
                >
                  Next: Address
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ADDRESS INFORMATION */}
          {currentStep === 'address' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Address Information</h2>
              </div>

              {recommendAutocomplete && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  💡 Address autocomplete recommended for your country
                </div>
              )}

              {/* Street Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Street Address *
                </label>
                <input
                  type="text"
                  placeholder="123 Main Street, Apt 4B"
                  {...register('address.street')}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.address?.street ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.address?.street && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.address.street.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    placeholder="New York"
                    {...register('address.city')}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.address?.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.address?.city && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.address.city.message}
                    </p>
                  )}
                </div>

                {/* State/Province */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State/Province *</label>
                  <input
                    type="text"
                    placeholder="NY"
                    {...register('address.state')}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.address?.state ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.address?.state && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.address.state.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                  <select
                    {...register('address.country')}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.address?.country ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {errors.address?.country && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.address.country.message}
                    </p>
                  )}
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                  <input
                    type="text"
                    placeholder="10001"
                    {...register('address.postalCode')}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.address?.postalCode ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.address?.postalCode && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.address.postalCode.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => handleStepChange('basic')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleStepChange('optional')}
                  className="ml-auto px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-medium transition"
                >
                  Next: Optional Info
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: OPTIONAL INFORMATION */}
          {currentStep === 'optional' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Optional Information</h2>
              </div>

              {/* Emergency Contact Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="includeEC"
                    checked={includeEmergencyContact}
                    onChange={(e) => setIncludeEmergencyContact(e.target.checked)}
                    className="w-4 h-4 text-blue-500 rounded border-gray-300"
                  />
                  <label htmlFor="includeEC" className="font-medium text-gray-900">
                    Add Emergency Contact
                  </label>
                </div>

                {includeEmergencyContact && (
                  <div className="ml-6 p-4 border rounded-lg space-y-4 bg-gray-50">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        placeholder="Jane Doe"
                        {...register('emergencyContact.fullName')}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.emergencyContact?.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {errors.emergencyContact?.fullName && (
                        <p className="text-sm text-red-600 mt-1">{errors.emergencyContact.fullName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Relationship
                      </label>
                      <select
                        {...register('emergencyContact.relationship')}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.emergencyContact?.relationship ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      >
                        <option value="">Select...</option>
                        {RELATIONSHIPS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      {errors.emergencyContact?.relationship && (
                        <p className="text-sm text-red-600 mt-1">{errors.emergencyContact.relationship.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 987-6543"
                        {...register('emergencyContact.phoneNumber')}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.emergencyContact?.phoneNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {errors.emergencyContact?.phoneNumber && (
                        <p className="text-sm text-red-600 mt-1">{errors.emergencyContact.phoneNumber.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Insurance Section */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="includeINS"
                    checked={includeInsurance}
                    onChange={(e) => setIncludeInsurance(e.target.checked)}
                    className="w-4 h-4 text-blue-500 rounded border-gray-300"
                  />
                  <label htmlFor="includeINS" className="font-medium text-gray-900 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Add Insurance Information
                  </label>
                </div>

                {includeInsurance && (
                  <div className="ml-6 p-4 border rounded-lg space-y-4 bg-gray-50">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider ID
                      </label>
                      <input
                        type="text"
                        placeholder="BCBS, AETNA, etc."
                        {...register('insurance.providerId')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.insurance?.providerId && (
                        <p className="text-sm text-red-600 mt-1">{errors.insurance.providerId.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Policy Number
                      </label>
                      <input
                        type="text"
                        placeholder="Your policy number"
                        {...register('insurance.policyNumber')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors.insurance?.policyNumber && (
                        <p className="text-sm text-red-600 mt-1">{errors.insurance.policyNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group Number
                      </label>
                      <input
                        type="text"
                        placeholder="Optional group number"
                        {...register('insurance.groupNumber')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => handleStepChange('address')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                >
                  Back
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
            </div>
          )}

          {/* Hidden field for hospitalId */}
          <input type="hidden" {...register('hospitalId')} />
        </form>
      </FormProvider>
    </div>
  );
};

export default EnhancedPatientRegistrationForm;
