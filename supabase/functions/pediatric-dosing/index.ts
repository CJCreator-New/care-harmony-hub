/**
 * Pediatric Dosing Validation Edge Function
 * Validates pediatric prescription dosages against AAP guidelines.
 */

// @ts-ignore — Deno types
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getAuthorizedActor } from '../_shared/authorize.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const ALLOWED_ROLES = ['admin', 'doctor', 'pharmacist', 'nurse'];

const schema = z.object({
  drugName: z.string().min(1).max(255),
  weightKg: z.number().positive().max(200),
  ageMonths: z.number().nonnegative().max(240).optional(),
  ageYears: z.number().nonnegative().max(20).optional(),
  prescribedDoseMg: z.number().positive().optional(),
  frequency: z.string().max(64).optional(),
  isHighDoseProtocol: z.boolean().optional(),
  clinicalOverrideReason: z.string().max(1000).optional(),
});

interface AAPRule {
  drugName: string;
  doseMgPerKg: number;
  highDoseMgPerKg?: number;
  maxSafeDailyMgPerKg: number;
  defaultFrequency: string;
  dosesPerDay: number;
  maxSingleDoseMg: number;
  maxDailyDoseMg: number;
  adultMaxSingleDoseMg: number;
  adultMaxDailyDoseMg: number;
}

const RULES: Record<string, AAPRule> = {
  amoxicillin: {
    drugName: 'Amoxicillin',
    doseMgPerKg: 22.5,
    highDoseMgPerKg: 45,
    maxSafeDailyMgPerKg: 90,
    defaultFrequency: 'BID',
    dosesPerDay: 2,
    maxSingleDoseMg: 1000,
    maxDailyDoseMg: 2000,
    adultMaxSingleDoseMg: 1000,
    adultMaxDailyDoseMg: 2000,
  },
  acetaminophen: {
    drugName: 'Acetaminophen',
    doseMgPerKg: 15,
    maxSafeDailyMgPerKg: 75,
    defaultFrequency: 'q4-6h',
    dosesPerDay: 5,
    maxSingleDoseMg: 650,
    maxDailyDoseMg: 3000,
    adultMaxSingleDoseMg: 1000,
    adultMaxDailyDoseMg: 4000,
  },
  ibuprofen: {
    drugName: 'Ibuprofen',
    doseMgPerKg: 10,
    maxSafeDailyMgPerKg: 40,
    defaultFrequency: 'q6-8h',
    dosesPerDay: 3,
    maxSingleDoseMg: 400,
    maxDailyDoseMg: 1200,
    adultMaxSingleDoseMg: 800,
    adultMaxDailyDoseMg: 2400,
  },
  azithromycin: {
    drugName: 'Azithromycin',
    doseMgPerKg: 10,
    maxSafeDailyMgPerKg: 10,
    defaultFrequency: 'daily',
    dosesPerDay: 1,
    maxSingleDoseMg: 500,
    maxDailyDoseMg: 500,
    adultMaxSingleDoseMg: 500,
    adultMaxDailyDoseMg: 500,
  },
  cephalexin: {
    drugName: 'Cephalexin',
    doseMgPerKg: 12.5,
    highDoseMgPerKg: 25,
    maxSafeDailyMgPerKg: 100,
    defaultFrequency: 'QID',
    dosesPerDay: 4,
    maxSingleDoseMg: 500,
    maxDailyDoseMg: 2000,
    adultMaxSingleDoseMg: 1000,
    adultMaxDailyDoseMg: 4000,
  },
  prednisolone: {
    drugName: 'Prednisolone',
    doseMgPerKg: 1,
    highDoseMgPerKg: 2,
    maxSafeDailyMgPerKg: 2,
    defaultFrequency: 'daily',
    dosesPerDay: 1,
    maxSingleDoseMg: 60,
    maxDailyDoseMg: 60,
    adultMaxSingleDoseMg: 60,
    adultMaxDailyDoseMg: 60,
  },
};

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { actor, response: authErr } = await getAuthorizedActor(req, ALLOWED_ROLES);
    if (authErr) return authErr;

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json(400, {
        error: 'Validation failed',
        details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      });
    }

    const {
      drugName,
      weightKg,
      ageMonths = parsed.data.ageYears ? parsed.data.ageYears * 12 : 24,
      prescribedDoseMg,
      frequency,
      isHighDoseProtocol = false,
      clinicalOverrideReason,
    } = parsed.data;

    const key = drugName.toLowerCase().trim();
    const matchedKey = Object.keys(RULES).find((k) => key.includes(k));
    const rule = matchedKey ? RULES[matchedKey] : null;

    if (!rule) {
      return json(200, {
        drugName,
        patientWeightKg: weightKg,
        ageMonths,
        isValid: false,
        requiresOverride: true,
        warnings: [`No AAP dosing guideline configured for "${drugName}". Manual clinical pharmacist review required.`],
      });
    }

    const dosePerKg = isHighDoseProtocol && rule.highDoseMgPerKg ? rule.highDoseMgPerKg : rule.doseMgPerKg;
    let singleDose = Math.round(weightKg * dosePerKg * 10) / 10;
    const dosesPerDay = rule.dosesPerDay;
    let dailyDose = Math.round(singleDose * dosesPerDay * 10) / 10;

    const adjustmentsApplied: string[] = [];
    if (singleDose > rule.adultMaxSingleDoseMg) {
      singleDose = rule.adultMaxSingleDoseMg;
      adjustmentsApplied.push(`Single dose capped at standard adult maximum (${rule.adultMaxSingleDoseMg} mg)`);
    }
    if (dailyDose > rule.adultMaxDailyDoseMg) {
      dailyDose = rule.adultMaxDailyDoseMg;
      singleDose = Math.round((rule.adultMaxDailyDoseMg / dosesPerDay) * 10) / 10;
      adjustmentsApplied.push(`Daily dose capped at standard adult maximum (${rule.adultMaxDailyDoseMg} mg/day)`);
    }

    const warnings: string[] = [];
    let isValid = true;
    let isHardStop = false;
    let requiresOverride = false;
    let errorMsg: string | undefined;

    if (prescribedDoseMg !== undefined && prescribedDoseMg > 0) {
      const prescribedDaily = prescribedDoseMg * dosesPerDay;
      const prescribedMgKgDay = prescribedDaily / weightKg;
      const maxSafeDaily = weightKg * rule.maxSafeDailyMgPerKg;

      if (prescribedDaily > maxSafeDaily * 2.0) {
        isHardStop = true;
        isValid = false;
        errorMsg = `🚨 CRITICAL SAFETY STOP: Prescribed dose exceeds 200% of maximum safety threshold (${rule.maxSafeDailyMgPerKg} mg/kg/day). Prescribing blocked.`;
        warnings.push(errorMsg);
      } else if (prescribedDaily > maxSafeDaily * 1.1) {
        requiresOverride = true;
        const hasValidOverride = Boolean(clinicalOverrideReason && clinicalOverrideReason.trim().length >= 10);
        if (!hasValidOverride) {
          isValid = false;
          errorMsg = `Dose exceeds 110% of AAP maximum guideline (${Math.round(prescribedMgKgDay)} mg/kg/day vs max ${rule.maxSafeDailyMgPerKg} mg/kg/day). Clinical override justification required.`;
          warnings.push(errorMsg);
        }
      }
    }

    return json(200, {
      drugName: rule.drugName,
      patientWeightKg: weightKg,
      ageMonths,
      recommendedSingleDoseMg: singleDose,
      recommendedDailyDoseMg: dailyDose,
      maxSingleDoseMg: rule.maxSingleDoseMg,
      maxDailyDoseMg: rule.maxDailyDoseMg,
      frequency: frequency || rule.defaultFrequency,
      isValid,
      isHardStop,
      requiresOverride,
      adjustmentsApplied,
      warnings,
      error: errorMsg,
    });
  } catch (err: any) {
    return json(500, { error: 'Pediatric dosing calculation failed', details: err.message });
  }
});
