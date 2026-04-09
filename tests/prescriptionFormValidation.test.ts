import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  PrescriptionSchema,
  PrescriptionItemSchema,
  DrugSchema,
  validateClinicalSafety,
  getAgeAppropriateStrengths,
} from '@/lib/schemas/prescriptionSchema';

describe('Prescription Validation (Clinical Forms — HP-2 PR1)', () => {
  describe('DrugSchema validation', () => {
    it('should accept valid drug with all properties', () => {
      const validDrug = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Lisinopril',
        genericName: 'Lisinopril',
        dosageForms: ['Tablet'],
        strengths: ['10 mg'],
        ageRestrictions: { minAge: 18, category: 'adult' as const },
        pregnancyCategory: 'D' as const,
      };
      expect(() => DrugSchema.parse(validDrug)).not.toThrow();
    });

    it('should reject drug with invalid UUID', () => {
      const invalidDrug = {
        id: 'not-a-uuid',
        name: 'Lisinopril',
        genericName: 'Lisinopril',
        dosageForms: ['Tablet'],
        strengths: ['10 mg'],
      };
      expect(() => DrugSchema.parse(invalidDrug)).toThrow();
    });

    it('should reject drug without dosage forms', () => {
      const invalidDrug = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Lisinopril',
        genericName: 'Lisinopril',
        dosageForms: [],
        strengths: ['10 mg'],
      };
      expect(() => DrugSchema.parse(invalidDrug)).toThrow();
    });
  });

  describe('PrescriptionItemSchema validation', () => {
    const validDrug = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      dosageForms: ['Tablet'],
      strengths: ['10 mg'],
    };

    it('should accept valid prescription item', () => {
      const validItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        drug: validDrug,
        strength: '10 mg',
        dosage: '10',
        dosageUnit: 'mg' as const,
        frequency: 'once_daily' as const,
        route: 'oral' as const,
        duration: '7_days' as const,
        quantity: 30,
        refills: 0,
      };
      expect(() => PrescriptionItemSchema.parse(validItem)).not.toThrow();
    });

    it('should reject item with invalid dosage format', () => {
      const invalidItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        drug: validDrug,
        strength: 'invalid mg',
        dosage: 'abc',
        dosageUnit: 'mg' as const,
        frequency: 'once_daily' as const,
        route: 'oral' as const,
        duration: '7_days' as const,
        quantity: 30,
        refills: 0,
      };
      expect(() => PrescriptionItemSchema.parse(invalidItem)).toThrow();
    });

    it('should reject item with zero quantity', () => {
      const invalidItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        drug: validDrug,
        strength: '10 mg',
        dosage: '10',
        dosageUnit: 'mg' as const,
        frequency: 'once_daily' as const,
        route: 'oral' as const,
        duration: '7_days' as const,
        quantity: 0,
        refills: 0,
      };
      expect(() => PrescriptionItemSchema.parse(invalidItem)).toThrow();
    });

    it('should reject item with refills > 11 (DEA limit)', () => {
      const invalidItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        drug: validDrug,
        strength: '10 mg',
        dosage: '10',
        dosageUnit: 'mg' as const,
        frequency: 'once_daily' as const,
        route: 'oral' as const,
        duration: '7_days' as const,
        quantity: 30,
        refills: 12, // Exceeds DEA limit
      };
      expect(() => PrescriptionItemSchema.parse(invalidItem)).toThrow();
    });

    it('should accept default values for optional fields', () => {
      const itemWithDefaults = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        drug: validDrug,
        strength: '10 mg',
        dosage: '10',
        dosageUnit: 'mg' as const,
        frequency: 'once_daily' as const,
        route: 'oral' as const,
        duration: '7_days' as const,
        quantity: 30,
        refills: 0,
        // instructions, specialInstructions, notes omitted → should use defaults
      };
      const parsed = PrescriptionItemSchema.parse(itemWithDefaults);
      expect(parsed.instructions).toBe('');
      expect(parsed.specialInstructions).toBe('');
    });
  });

  describe('PrescriptionSchema validation', () => {
    const validDrug = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      dosageForms: ['Tablet'],
      strengths: ['10 mg'],
      pregnancyCategory: 'D' as const,
    };

    const validItem = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      drug: validDrug,
      strength: '10 mg',
      dosage: '10',
      dosageUnit: 'mg' as const,
      frequency: 'once_daily' as const,
      route: 'oral' as const,
      duration: '7_days' as const,
      quantity: 30,
      refills: 0,
    };

    it('should accept valid complete prescription', () => {
      const validRx = {
        patientId: '550e8400-e29b-41d4-a716-446655440002',
        patientAge: 45,
        items: [validItem],
        prescriber: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          firstName: 'John',
          lastName: 'Doe',
          licenseNumber: 'LIC123456',
        },
        facility: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'General Hospital',
          hospitalId: '550e8400-e29b-41d4-a716-446655440005',
        },
      };
      expect(() => PrescriptionSchema.parse(validRx)).not.toThrow();
    });

    it('should reject prescription with zero items', () => {
      const invalidRx = {
        patientId: '550e8400-e29b-41d4-a716-446655440002',
        patientAge: 45,
        items: [],
        prescriber: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          firstName: 'John',
          lastName: 'Doe',
          licenseNumber: 'LIC123456',
        },
        facility: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'General Hospital',
          hospitalId: '550e8400-e29b-41d4-a716-446655440005',
        },
      };
      expect(() => PrescriptionSchema.parse(invalidRx)).toThrow();
    });

    it('should reject prescription with > 20 items', () => {
      const manyItems = Array(21).fill(validItem);
      const invalidRx = {
        patientId: '550e8400-e29b-41d4-a716-446655440002',
        patientAge: 45,
        items: manyItems,
        prescriber: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          firstName: 'John',
          lastName: 'Doe',
          licenseNumber: 'LIC123456',
        },
        facility: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'General Hospital',
          hospitalId: '550e8400-e29b-41d4-a716-446655440005',
        },
      };
      expect(() => PrescriptionSchema.parse(invalidRx)).toThrow();
    });

    it('should reject prescription with invalid patient age', () => {
      const invalidRx = {
        patientId: '550e8400-e29b-41d4-a716-446655440002',
        patientAge: 200, // Exceeds realistic age
        items: [validItem],
        prescriber: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          firstName: 'John',
          lastName: 'Doe',
          licenseNumber: 'LIC123456',
        },
        facility: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'General Hospital',
          hospitalId: '550e8400-e29b-41d4-a716-446655440005',
        },
      };
      expect(() => PrescriptionSchema.parse(invalidRx)).toThrow();
    });
  });

  describe('Clinical Safety — Pregnancy Restrictions', () => {
    it('should reject Category X drug for pregnant patient', () => {
      const categoryXDrug = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Thalidomide',
        genericName: 'Thalidomide',
        dosageForms: ['Capsule'],
        strengths: ['50 mg'],
        pregnancyCategory: 'X' as const,
      };

      const itemWithCategoryX = {
        id: '550e8400-e29b-41d4-a716-446655440011',
        drug: categoryXDrug,
        strength: '50 mg',
        dosage: '50',
        dosageUnit: 'mg' as const,
        frequency: 'once_daily' as const,
        route: 'oral' as const,
        duration: '7_days' as const,
        quantity: 10,
        refills: 0,
      };

      const pregnantRx = {
        patientId: '550e8400-e29b-41d4-a716-446655440002',
        patientAge: 30,
        patientPregnant: true,
        items: [itemWithCategoryX],
        prescriber: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          firstName: 'John',
          lastName: 'Doe',
          licenseNumber: 'LIC123456',
        },
        facility: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'General Hospital',
          hospitalId: '550e8400-e29b-41d4-a716-446655440005',
        },
      };

      expect(() => PrescriptionSchema.parse(pregnantRx)).toThrow();
    });

    it('should accept Category B drug for pregnant patient', () => {
      const categoryBDrug = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Amoxicillin',
        genericName: 'Amoxicillin',
        dosageForms: ['Tablet'],
        strengths: ['500 mg'],
        pregnancyCategory: 'B' as const,
      };

      const itemCategoryB = {
        id: '550e8400-e29b-41d4-a716-446655440011',
        drug: categoryBDrug,
        strength: '500 mg',
        dosage: '500',
        dosageUnit: 'mg' as const,
        frequency: 'three_times_daily' as const,
        route: 'oral' as const,
        duration: '7_days' as const,
        quantity: 21,
        refills: 0,
      };

      const pregnantRx = {
        patientId: '550e8400-e29b-41d4-a716-446655440002',
        patientAge: 30,
        patientPregnant: true,
        items: [itemCategoryB],
        prescriber: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          firstName: 'John',
          lastName: 'Doe',
          licenseNumber: 'LIC123456',
        },
        facility: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'General Hospital',
          hospitalId: '550e8400-e29b-41d4-a716-446655440005',
        },
      };

      expect(() => PrescriptionSchema.parse(pregnantRx)).not.toThrow();
    });
  });

  describe('Clinical Safety Validation Function', () => {
    const amoxicillin = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      name: 'Amoxicillin',
      genericName: 'Amoxicillin',
      dosageForms: ['Tablet'],
      strengths: ['500 mg'],
      pregnancyCategory: 'B' as const,
    };

    const lisinopril = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      dosageForms: ['Tablet'],
      strengths: ['10 mg'],
      ageRestrictions: { minAge: 18, category: 'adult' as const },
      pregnancyCategory: 'D' as const,
    };

    it('should return safe=true for valid prescription', () => {
      const items = [
        {
          id: '1',
          drug: amoxicillin,
          strength: '500 mg',
          dosage: '500',
          dosageUnit: 'mg' as const,
          frequency: 'three_times_daily' as const,
          route: 'oral' as const,
          duration: '7_days' as const,
          quantity: 21,
          refills: 0,
          skipDuplicationCheck: false,
          skipInteractionCheck: false,
        },
      ];

      const { safe, warnings } = validateClinicalSafety(items, 35, false, false, []);
      expect(safe).toBe(true);
      expect(warnings.length).toBe(0);
    });

    it('should warn for Category X drug in pregnancy', () => {
      const thalidomide = {
        id: '550e8400-e29b-41d4-a716-446655440020',
        name: 'Thalidomide',
        genericName: 'Thalidomide',
        dosageForms: ['Capsule'],
        strengths: ['50 mg'],
        pregnancyCategory: 'X' as const,
      };

      const items = [
        {
          id: '1',
          drug: thalidomide,
          strength: '50 mg',
          dosage: '50',
          dosageUnit: 'mg' as const,
          frequency: 'once_daily' as const,
          route: 'oral' as const,
          duration: '7_days' as const,
          quantity: 10,
          refills: 0,
          skipDuplicationCheck: false,
          skipInteractionCheck: false,
        },
      ];

      const { safe, warnings } = validateClinicalSafety(items, 25, true, false, []);
      expect(safe).toBe(false);
      expect(warnings.some(w => w.includes('CONTRAINDICATED in pregnancy'))).toBe(true);
    });

    it('should warn for allergy match', () => {
      const items = [
        {
          id: '1',
          drug: amoxicillin,
          strength: '500 mg',
          dosage: '500',
          dosageUnit: 'mg' as const,
          frequency: 'three_times_daily' as const,
          route: 'oral' as const,
          duration: '7_days' as const,
          quantity: 21,
          refills: 0,
          skipDuplicationCheck: false,
          skipInteractionCheck: false,
        },
      ];

      const { safe, warnings } = validateClinicalSafety(
        items,
        35,
        false,
        false,
        ['Amoxicillin'] // Patient allergic to amoxicillin
      );
      expect(safe).toBe(false);
      expect(warnings.some(w => w.includes('Patient allergic'))).toBe(true);
    });

    it('should warn for age-inappropriate drug', () => {
      const items = [
        {
          id: '1',
          drug: lisinopril,
          strength: '10 mg',
          dosage: '10',
          dosageUnit: 'mg' as const,
          frequency: 'once_daily' as const,
          route: 'oral' as const,
          duration: '7_days' as const,
          quantity: 30,
          refills: 0,
          skipDuplicationCheck: false,
          skipInteractionCheck: false,
        },
      ];

      const { safe, warnings } = validateClinicalSafety(items, 15, false, false, []); // 15 years old
      expect(safe).toBe(false);
      expect(warnings.some(w => w.includes('not recommended for patient age'))).toBe(true);
    });
  });

  describe('getAgeAppropriateStrengths utility', () => {
    it('should return all strengths for unrestricted drug', () => {
      const drug = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Amoxicillin',
        genericName: 'Amoxicillin',
        dosageForms: ['Tablet'],
        strengths: ['250 mg', '500 mg', '875 mg'],
        ageRestrictions: { minAge: 0, category: 'unrestricted' as const },
      };

      const result = getAgeAppropriateStrengths(drug, 5);
      expect(result.length).toBe(3);
    });

    it('should return empty array if patient age is below minimum', () => {
      const drug = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Lisinopril',
        genericName: 'Lisinopril',
        dosageForms: ['Tablet'],
        strengths: ['10 mg', '20 mg', '40 mg'],
        ageRestrictions: { minAge: 18, category: 'adult' as const },
      };

      const result = getAgeAppropriateStrengths(drug, 15);
      expect(result.length).toBe(0);
    });

    it('should return strengths if patient age is within range', () => {
      const drug = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'Lisinopril',
        genericName: 'Lisinopril',
        dosageForms: ['Tablet'],
        strengths: ['10 mg', '20 mg', '40 mg'],
        ageRestrictions: { minAge: 18, maxAge: 65, category: 'adult' as const },
      };

      const result = getAgeAppropriateStrengths(drug, 45);
      expect(result.length).toBe(3);
    });
  });
});
