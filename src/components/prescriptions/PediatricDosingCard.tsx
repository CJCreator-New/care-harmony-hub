import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Baby, AlertTriangle, Calculator, Info } from 'lucide-react';
import { PediatricDosing, DoseCalculation } from '@/types/pharmacy';

interface PediatricDosingCardProps {
  drugName: string;
  patientData: {
    weight_kg: number;
    age_months: number;
    age_years: number;
  };
  onDoseCalculated: (calculation: DoseCalculation) => void;
}

export const PediatricDosingCard: React.FC<PediatricDosingCardProps> = ({
  drugName,
  patientData,
  onDoseCalculated
}) => {
  const [pediatricProtocols, setPediatricProtocols] = useState<PediatricDosing[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<PediatricDosing | null>(null);
  const [calculation, setCalculation] = useState<DoseCalculation | null>(null);
  const [indication, setIndication] = useState<string>('');

  // Mock pediatric dosing data (in real app, fetch from database)
  const getPediatricProtocols = (drug: string): PediatricDosing[] => {
    const mockProtocols: Record<string, PediatricDosing[]> = {
      'Acetaminophen': [
        {
          id: '1',
          drug_name: 'Acetaminophen',
          age_group: 'infant',
          weight_based_dose: {
            dose_mg_per_kg: 15,
            min_weight_kg: 3,
            min_age_months: 2
          },
          max_dose: {
            max_single_dose_mg: 160,
            max_daily_dose_mg: 800
          },
          frequency: 'q4-6h',
          route: 'PO',
          special_considerations: [
            'Do not exceed 5 doses in 24h',
            'Use weight-based dosing when possible',
            'Avoid in severe hepatic impairment'
          ],
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          drug_name: 'Acetaminophen',
          age_group: 'child',
          weight_based_dose: {
            dose_mg_per_kg: 15,
            min_weight_kg: 10,
            min_age_months: 24
          },
          max_dose: {
            max_single_dose_mg: 650,
            max_daily_dose_mg: 3000
          },
          frequency: 'q4-6h',
          route: 'PO',
          special_considerations: [
            'Do not exceed 5 doses in 24h',
            'Check for other acetaminophen-containing products'
          ],
          created_at: new Date().toISOString()
        }
      ],
      'Amoxicillin': [
        {
          id: '3',
          drug_name: 'Amoxicillin',
          age_group: 'infant',
          weight_based_dose: {
            dose_mg_per_kg: 45,
            min_weight_kg: 3,
            min_age_months: 3
          },
          max_dose: {
            max_daily_dose_mg: 3000
          },
          frequency: 'BID',
          route: 'PO',
          special_considerations: [
            'Adjust for severe infections (90 mg/kg/day)',
            'Complete full course',
            'Monitor for allergic reactions'
          ],
          created_at: new Date().toISOString()
        }
      ],
      'Ibuprofen': [
        {
          id: '4',
          drug_name: 'Ibuprofen',
          age_group: 'infant',
          weight_based_dose: {
            dose_mg_per_kg: 10,
            min_weight_kg: 5,
            min_age_months: 6
          },
          max_dose: {
            max_single_dose_mg: 200,
            max_daily_dose_mg: 800
          },
          frequency: 'q6-8h',
          route: 'PO',
          special_considerations: [
            'Avoid in dehydration',
            'Take with food',
            'Monitor renal function'
          ],
          created_at: new Date().toISOString()
        }
      ]
    };

    return mockProtocols[drug] || [];
  };

  const getAgeGroup = (ageMonths: number): string => {
    if (ageMonths < 1) return 'neonate';
    if (ageMonths < 24) return 'infant';
    if (ageMonths < 144) return 'child'; // < 12 years
    return 'adolescent';
  };

  const calculatePediatricDose = (protocol: PediatricDosing) => {
    const { weight_kg, age_months } = patientData;
    
    // Check age and weight minimums
    if (protocol.weight_based_dose.min_age_months && age_months < protocol.weight_based_dose.min_age_months) {
      return null;
    }
    
    if (protocol.weight_based_dose.min_weight_kg && weight_kg < protocol.weight_based_dose.min_weight_kg) {
      return null;
    }

    // Calculate weight-based dose
    const calculatedDose = weight_kg * protocol.weight_based_dose.dose_mg_per_kg;
    
    // Apply maximum dose limits
    let finalDose = calculatedDose;
    let warnings: string[] = [];
    let adjustmentsApplied: string[] = [];

    if (protocol.max_dose.max_single_dose_mg && calculatedDose > protocol.max_dose.max_single_dose_mg) {
      finalDose = protocol.max_dose.max_single_dose_mg;
      warnings.push(`Dose capped at maximum single dose of ${protocol.max_dose.max_single_dose_mg} mg`);
      adjustmentsApplied.push('Applied maximum single dose limit');
    }

    // Calculate daily dose based on frequency
    const frequencyMap: Record<string, number> = {
      'q4h': 6,
      'q4-6h': 5,
      'q6h': 4,
      'q6-8h': 3,
      'q8h': 3,
      'BID': 2,
      'TID': 3,
      'QID': 4,
      'daily': 1
    };

    const dosesPerDay = frequencyMap[protocol.frequency] || 1;
    const dailyDose = finalDose * dosesPerDay;

    if (protocol.max_dose.max_daily_dose_mg && dailyDose > protocol.max_dose.max_daily_dose_mg) {
      const adjustedSingleDose = protocol.max_dose.max_daily_dose_mg / dosesPerDay;
      finalDose = Math.round(adjustedSingleDose * 10) / 10;
      warnings.push(`Daily dose capped at ${protocol.max_dose.max_daily_dose_mg} mg/day`);
      adjustmentsApplied.push('Applied maximum daily dose limit');
    }

    const result: DoseCalculation = {
      patient_weight_kg: weight_kg,
      patient_age_years: Math.floor(age_months / 12),
      indication,
      calculated_dose: {
        amount: Math.round(finalDose * 10) / 10,
        unit: 'mg',
        frequency: protocol.frequency
      },
      max_dose: {
        amount: dailyDose,
        unit: 'mg',
        period: 'daily'
      },
      adjustments_applied: adjustmentsApplied,
      warnings
    };

    return result;
  };

  const handleProtocolSelect = (protocolId: string) => {
    const protocol = pediatricProtocols.find(p => p.id === protocolId);
    if (protocol) {
      setSelectedProtocol(protocol);
      const calc = calculatePediatricDose(protocol);
      setCalculation(calc);
      if (calc) {
        onDoseCalculated(calc);
      }
    }
  };

  useEffect(() => {
    const protocols = getPediatricProtocols(drugName);
    const ageGroup = getAgeGroup(patientData.age_months);
    const filteredProtocols = protocols.filter(p => p.age_group === ageGroup);
    setPediatricProtocols(filteredProtocols);
    
    if (filteredProtocols.length === 1) {
      setSelectedProtocol(filteredProtocols[0]);
      const calc = calculatePediatricDose(filteredProtocols[0]);
      setCalculation(calc);
      if (calc) {
        onDoseCalculated(calc);
      }
    }
  }, [drugName, patientData]);

  const ageGroup = getAgeGroup(patientData.age_months);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Baby className="h-5 w-5" />
          Pediatric Dosing - {drugName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient Information */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 rounded-lg">
          <div>
            <Label className="text-xs text-blue-600">Weight</Label>
            <p className="font-semibold">{patientData.weight_kg} kg</p>
          </div>
          <div>
            <Label className="text-xs text-blue-600">Age</Label>
            <p className="font-semibold">{patientData.age_years} years ({patientData.age_months} months)</p>
          </div>
          <div>
            <Label className="text-xs text-blue-600">Age Group</Label>
            <p className="font-semibold capitalize">{ageGroup}</p>
          </div>
        </div>

        {/* Indication */}
        <div>
          <Label>Indication</Label>
          <Input
            value={indication}
            onChange={(e) => setIndication(e.target.value)}
            placeholder="Enter indication for dosing"
          />
        </div>

        {/* Protocol Selection */}
        {pediatricProtocols.length > 1 && (
          <div>
            <Label>Dosing Protocol</Label>
            <Select onValueChange={handleProtocolSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select dosing protocol" />
              </SelectTrigger>
              <SelectContent>
                {pediatricProtocols.map((protocol) => (
                  <SelectItem key={protocol.id} value={protocol.id}>
                    {protocol.weight_based_dose.dose_mg_per_kg} mg/kg {protocol.frequency} ({protocol.route})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Age/Weight Eligibility Check */}
        {selectedProtocol && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Eligibility:</strong> 
              {selectedProtocol.weight_based_dose.min_age_months && (
                <span> Minimum age: {selectedProtocol.weight_based_dose.min_age_months} months</span>
              )}
              {selectedProtocol.weight_based_dose.min_weight_kg && (
                <span> | Minimum weight: {selectedProtocol.weight_based_dose.min_weight_kg} kg</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Dose Calculation */}
        {calculation && selectedProtocol && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm text-gray-600 mb-2">Calculated Dose</h4>
                <p className="text-xl font-bold text-green-600">
                  {calculation.calculated_dose.amount} mg
                </p>
                <p className="text-sm text-gray-500">{calculation.calculated_dose.frequency}</p>
                <p className="text-xs text-gray-400">
                  ({selectedProtocol.weight_based_dose.dose_mg_per_kg} mg/kg × {patientData.weight_kg} kg)
                </p>
              </div>
              
              {calculation.max_dose && (
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm text-gray-600 mb-2">Daily Total</h4>
                  <p className="text-xl font-bold text-blue-600">
                    {calculation.max_dose.amount} mg/day
                  </p>
                  <p className="text-sm text-gray-500">Maximum daily dose</p>
                </div>
              )}
            </div>

            {/* Warnings */}
            {calculation.warnings.length > 0 && (
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

            {/* Adjustments Applied */}
            {calculation.adjustments_applied.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Adjustments Applied:</h4>
                <ul className="space-y-1">
                  {calculation.adjustments_applied.map((adjustment, index) => (
                    <li key={index} className="text-sm text-orange-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      {adjustment}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Special Considerations */}
        {selectedProtocol && selectedProtocol.special_considerations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Special Considerations:</h4>
            <ul className="space-y-1">
              {selectedProtocol.special_considerations.map((consideration, index) => (
                <li key={index} className="text-sm text-purple-700 flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                  {consideration}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* No Protocols Available */}
        {pediatricProtocols.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No pediatric dosing protocols available for {drugName} in the {ageGroup} age group.
              Please consult pediatric references or contact pharmacy.
            </AlertDescription>
          </Alert>
        )}

        {/* Recalculate Button */}
        {selectedProtocol && (
          <Button 
            onClick={() => {
              const calc = calculatePediatricDose(selectedProtocol);
              setCalculation(calc);
              if (calc) onDoseCalculated(calc);
            }}
            className="w-full"
            variant="outline"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Recalculate Dose
          </Button>
        )}
      </CardContent>
    </Card>
  );
};