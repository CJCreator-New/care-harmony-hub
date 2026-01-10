import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, AlertTriangle, Info } from 'lucide-react';
import { DoseCalculation, DoseAdjustment } from '@/types/pharmacy';

interface DoseAdjustmentCalculatorProps {
  drugName: string;
  standardDose: {
    amount: number;
    unit: string;
    frequency: string;
  };
  patientData: {
    weight_kg?: number;
    age_years?: number;
    creatinine_mg_dl?: number;
    gender?: 'M' | 'F';
  };
  onCalculationComplete: (calculation: DoseCalculation) => void;
}

export const DoseAdjustmentCalculator: React.FC<DoseAdjustmentCalculatorProps> = ({
  drugName,
  standardDose,
  patientData,
  onCalculationComplete
}) => {
  const [calculation, setCalculation] = useState<DoseCalculation | null>(null);
  const [adjustments, setAdjustments] = useState<DoseAdjustment[]>([]);
  const [creatinineClearance, setCreatinineClearance] = useState<number | null>(null);

  // Calculate creatinine clearance using Cockcroft-Gault equation
  const calculateCreatinineClearance = () => {
    if (!patientData.weight_kg || !patientData.age_years || !patientData.creatinine_mg_dl) {
      return null;
    }

    const { weight_kg, age_years, creatinine_mg_dl, gender } = patientData;
    const genderFactor = gender === 'F' ? 0.85 : 1.0;
    
    const clcr = ((140 - age_years) * weight_kg * genderFactor) / (72 * creatinine_mg_dl);
    return Math.round(clcr * 10) / 10;
  };

  // Mock dose adjustment data (in real app, fetch from database)
  const getDoseAdjustments = (drug: string): DoseAdjustment[] => {
    const mockAdjustments: Record<string, DoseAdjustment[]> = {
      'Digoxin': [{
        id: '1',
        drug_name: 'Digoxin',
        adjustment_type: 'renal',
        condition_criteria: {
          creatinine_clearance: {
            '<30': 'reduce_50_percent',
            '30-50': 'reduce_25_percent',
            '>50': 'no_adjustment'
          }
        },
        dose_modification: {
          percentage_reduction: 50,
          frequency_change: 'daily_to_every_other_day'
        },
        monitoring_requirements: ['Serum digoxin level', 'Serum creatinine'],
        contraindications: ['Severe renal impairment'],
        created_at: new Date().toISOString()
      }],
      'Metformin': [{
        id: '2',
        drug_name: 'Metformin',
        adjustment_type: 'renal',
        condition_criteria: {
          egfr: {
            '<30': 'contraindicated',
            '30-45': 'reduce_50_percent',
            '>45': 'no_adjustment'
          }
        },
        dose_modification: {
          max_dose: '1000mg_daily'
        },
        monitoring_requirements: ['eGFR', 'Lactic acid level'],
        contraindications: ['Severe renal impairment', 'Metabolic acidosis'],
        created_at: new Date().toISOString()
      }],
      'Gabapentin': [{
        id: '3',
        drug_name: 'Gabapentin',
        adjustment_type: 'renal',
        condition_criteria: {
          creatinine_clearance: {
            '<15': 'reduce_75_percent',
            '15-30': 'reduce_50_percent',
            '30-60': 'reduce_25_percent',
            '>60': 'no_adjustment'
          }
        },
        dose_modification: {
          frequency_change: 'tid_to_daily'
        },
        monitoring_requirements: ['Serum creatinine', 'Neurological status'],
        contraindications: [],
        created_at: new Date().toISOString()
      }]
    };

    return mockAdjustments[drug] || [];
  };

  const calculateAdjustedDose = () => {
    const clcr = calculateCreatinineClearance();
    if (!clcr) return;

    setCreatinineClearance(clcr);
    const drugAdjustments = getDoseAdjustments(drugName);
    setAdjustments(drugAdjustments);

    let adjustedDose = { ...standardDose };
    let adjustmentsApplied: string[] = [];
    let warnings: string[] = [];

    // Apply renal adjustments
    drugAdjustments.forEach(adjustment => {
      if (adjustment.adjustment_type === 'renal' && adjustment.condition_criteria.creatinine_clearance) {
        const criteria = adjustment.condition_criteria.creatinine_clearance;
        
        Object.entries(criteria).forEach(([range, action]) => {
          if (isInRange(clcr, range)) {
            if (action === 'contraindicated') {
              warnings.push(`${drugName} is contraindicated with CrCl < 30 mL/min`);
            } else if (action.includes('reduce')) {
              const reduction = parseInt(action.match(/\d+/)?.[0] || '0');
              adjustedDose.amount = Math.round(standardDose.amount * (1 - reduction / 100) * 10) / 10;
              adjustmentsApplied.push(`${reduction}% dose reduction for renal impairment`);
            }
            
            if (adjustment.dose_modification.frequency_change) {
              adjustmentsApplied.push(`Frequency adjusted: ${adjustment.dose_modification.frequency_change}`);
            }
          }
        });
      }
    });

    // Age-based adjustments for elderly
    if (patientData.age_years && patientData.age_years >= 65) {
      adjustedDose.amount = Math.round(adjustedDose.amount * 0.8 * 10) / 10;
      adjustmentsApplied.push('20% reduction for elderly patient');
    }

    const result: DoseCalculation = {
      patient_weight_kg: patientData.weight_kg,
      patient_age_years: patientData.age_years,
      creatinine_clearance: clcr,
      indication: 'Standard therapy',
      calculated_dose: adjustedDose,
      adjustments_applied: adjustmentsApplied,
      warnings
    };

    setCalculation(result);
    onCalculationComplete(result);
  };

  const isInRange = (value: number, range: string): boolean => {
    if (range.startsWith('<')) {
      return value < parseFloat(range.substring(1));
    } else if (range.startsWith('>')) {
      return value > parseFloat(range.substring(1));
    } else if (range.includes('-')) {
      const [min, max] = range.split('-').map(parseFloat);
      return value >= min && value <= max;
    }
    return false;
  };

  useEffect(() => {
    if (patientData.weight_kg && patientData.age_years && patientData.creatinine_mg_dl) {
      calculateAdjustedDose();
    }
  }, [patientData, drugName, standardDose]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Dose Adjustment Calculator - {drugName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient Parameters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              value={patientData.weight_kg || ''}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>Age (years)</Label>
            <Input
              type="number"
              value={patientData.age_years || ''}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>Serum Creatinine (mg/dL)</Label>
            <Input
              type="number"
              step="0.1"
              value={patientData.creatinine_mg_dl || ''}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>Gender</Label>
            <Input
              value={patientData.gender || ''}
              readOnly
              className="bg-gray-50"
            />
          </div>
        </div>

        {/* Calculated Creatinine Clearance */}
        {creatinineClearance && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Calculated Creatinine Clearance: <strong>{creatinineClearance} mL/min</strong>
              <br />
              <small>Using Cockcroft-Gault equation</small>
            </AlertDescription>
          </Alert>
        )}

        {/* Standard vs Adjusted Dose */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium text-sm text-gray-600 mb-2">Standard Dose</h4>
            <p className="text-lg font-semibold">
              {standardDose.amount} {standardDose.unit}
            </p>
            <p className="text-sm text-gray-500">{standardDose.frequency}</p>
          </div>
          
          {calculation && (
            <div className="p-3 border rounded-lg bg-blue-50">
              <h4 className="font-medium text-sm text-blue-600 mb-2">Adjusted Dose</h4>
              <p className="text-lg font-semibold text-blue-800">
                {calculation.calculated_dose.amount} {calculation.calculated_dose.unit}
              </p>
              <p className="text-sm text-blue-600">{calculation.calculated_dose.frequency}</p>
            </div>
          )}
        </div>

        {/* Adjustments Applied */}
        {calculation && calculation.adjustments_applied.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Adjustments Applied:</h4>
            <ul className="space-y-1">
              {calculation.adjustments_applied.map((adjustment, index) => (
                <li key={index} className="text-sm text-green-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  {adjustment}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {calculation && calculation.warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warnings:</strong>
              <ul className="mt-1 space-y-1">
                {calculation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Monitoring Requirements */}
        {adjustments.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Monitoring Requirements:</h4>
            <div className="flex flex-wrap gap-2">
              {adjustments.flatMap(adj => adj.monitoring_requirements).map((req, index) => (
                <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  {req}
                </span>
              ))}
            </div>
          </div>
        )}

        <Button 
          onClick={calculateAdjustedDose}
          className="w-full"
          disabled={!patientData.weight_kg || !patientData.age_years || !patientData.creatinine_mg_dl}
        >
          Recalculate Dose
        </Button>
      </CardContent>
    </Card>
  );
};