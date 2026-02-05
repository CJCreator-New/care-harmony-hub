import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Layers, X, CheckCircle } from 'lucide-react';
import { TherapeuticClass } from '@/types/pharmacy';

interface TherapeuticDuplicationAlertProps {
  currentMedications: Array<{
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
  }>;
  newMedication: {
    medication_name: string;
    dosage: string;
    frequency: string;
  };
  onDuplicationResolved?: (action: 'continue' | 'replace' | 'cancel', medicationToReplace?: string) => void;
}

interface DuplicationAlert {
  type: 'exact' | 'therapeutic' | 'mechanism';
  severity: 'high' | 'moderate' | 'low';
  existing_medication: string;
  new_medication: string;
  therapeutic_class: string;
  mechanism: string;
  recommendation: string;
  clinical_significance: string;
}

export const TherapeuticDuplicationAlert: React.FC<TherapeuticDuplicationAlertProps> = ({
  currentMedications,
  newMedication,
  onDuplicationResolved
}) => {
  const [duplications, setDuplications] = useState<DuplicationAlert[]>([]);
  const [therapeuticClasses, setTherapeuticClasses] = useState<TherapeuticClass[]>([]);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // Mock therapeutic class data (in real app, fetch from database)
  const getTherapeuticClasses = (): TherapeuticClass[] => {
    return [
      {
        id: '1',
        drug_name: 'Lisinopril',
        therapeutic_class: 'ACE Inhibitor',
        subclass: 'Cardiovascular',
        mechanism_of_action: 'Blocks angiotensin-converting enzyme',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        drug_name: 'Enalapril',
        therapeutic_class: 'ACE Inhibitor',
        subclass: 'Cardiovascular',
        mechanism_of_action: 'Blocks angiotensin-converting enzyme',
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        drug_name: 'Losartan',
        therapeutic_class: 'ARB',
        subclass: 'Cardiovascular',
        mechanism_of_action: 'Blocks angiotensin II receptor',
        created_at: new Date().toISOString()
      },
      {
        id: '4',
        drug_name: 'Valsartan',
        therapeutic_class: 'ARB',
        subclass: 'Cardiovascular',
        mechanism_of_action: 'Blocks angiotensin II receptor',
        created_at: new Date().toISOString()
      },
      {
        id: '5',
        drug_name: 'Amlodipine',
        therapeutic_class: 'Calcium Channel Blocker',
        subclass: 'Cardiovascular',
        mechanism_of_action: 'Blocks calcium channels',
        created_at: new Date().toISOString()
      },
      {
        id: '6',
        drug_name: 'Nifedipine',
        therapeutic_class: 'Calcium Channel Blocker',
        subclass: 'Cardiovascular',
        mechanism_of_action: 'Blocks calcium channels',
        created_at: new Date().toISOString()
      },
      {
        id: '7',
        drug_name: 'Metoprolol',
        therapeutic_class: 'Beta Blocker',
        subclass: 'Cardiovascular',
        mechanism_of_action: 'Blocks beta-adrenergic receptors',
        created_at: new Date().toISOString()
      },
      {
        id: '8',
        drug_name: 'Propranolol',
        therapeutic_class: 'Beta Blocker',
        subclass: 'Cardiovascular',
        mechanism_of_action: 'Blocks beta-adrenergic receptors',
        created_at: new Date().toISOString()
      },
      {
        id: '9',
        drug_name: 'Atorvastatin',
        therapeutic_class: 'Statin',
        subclass: 'Lipid-lowering',
        mechanism_of_action: 'Inhibits HMG-CoA reductase',
        created_at: new Date().toISOString()
      },
      {
        id: '10',
        drug_name: 'Simvastatin',
        therapeutic_class: 'Statin',
        subclass: 'Lipid-lowering',
        mechanism_of_action: 'Inhibits HMG-CoA reductase',
        created_at: new Date().toISOString()
      },
      {
        id: '11',
        drug_name: 'Omeprazole',
        therapeutic_class: 'PPI',
        subclass: 'Gastrointestinal',
        mechanism_of_action: 'Inhibits proton pump',
        created_at: new Date().toISOString()
      },
      {
        id: '12',
        drug_name: 'Pantoprazole',
        therapeutic_class: 'PPI',
        subclass: 'Gastrointestinal',
        mechanism_of_action: 'Inhibits proton pump',
        created_at: new Date().toISOString()
      }
    ];
  };

  const findDrugClass = (drugName: string): TherapeuticClass | null => {
    return therapeuticClasses.find(tc => 
      tc.drug_name.toLowerCase() === drugName.toLowerCase()
    ) || null;
  };

  const checkForDuplications = () => {
    const classes = getTherapeuticClasses();
    setTherapeuticClasses(classes);

    const newDrugClass = findDrugClass(newMedication.medication_name);
    if (!newDrugClass) return;

    const foundDuplications: DuplicationAlert[] = [];

    currentMedications.forEach(currentMed => {
      const currentDrugClass = findDrugClass(currentMed.medication_name);
      if (!currentDrugClass) return;

      // Check for exact drug duplication
      if (currentMed.medication_name.toLowerCase() === newMedication.medication_name.toLowerCase()) {
        foundDuplications.push({
          type: 'exact',
          severity: 'high',
          existing_medication: currentMed.medication_name,
          new_medication: newMedication.medication_name,
          therapeutic_class: currentDrugClass.therapeutic_class,
          mechanism: currentDrugClass.mechanism_of_action,
          recommendation: 'Consider adjusting dose of existing medication instead of adding duplicate',
          clinical_significance: 'High risk of overdose and adverse effects'
        });
      }
      // Check for therapeutic class duplication
      else if (currentDrugClass.therapeutic_class === newDrugClass.therapeutic_class) {
        const severity = getSeverityByClass(currentDrugClass.therapeutic_class);
        foundDuplications.push({
          type: 'therapeutic',
          severity,
          existing_medication: currentMed.medication_name,
          new_medication: newMedication.medication_name,
          therapeutic_class: currentDrugClass.therapeutic_class,
          mechanism: currentDrugClass.mechanism_of_action,
          recommendation: getRecommendationByClass(currentDrugClass.therapeutic_class),
          clinical_significance: getClinicalSignificance(currentDrugClass.therapeutic_class)
        });
      }
      // Check for mechanism duplication (different class, same mechanism)
      else if (currentDrugClass.mechanism_of_action === newDrugClass.mechanism_of_action) {
        foundDuplications.push({
          type: 'mechanism',
          severity: 'moderate',
          existing_medication: currentMed.medication_name,
          new_medication: newMedication.medication_name,
          therapeutic_class: `${currentDrugClass.therapeutic_class} / ${newDrugClass.therapeutic_class}`,
          mechanism: currentDrugClass.mechanism_of_action,
          recommendation: 'Monitor for additive effects and consider dose adjustments',
          clinical_significance: 'Potential for additive pharmacological effects'
        });
      }
    });

    setDuplications(foundDuplications);
  };

  const getSeverityByClass = (therapeuticClass: string): 'high' | 'moderate' | 'low' => {
    const highRiskClasses = ['Anticoagulant', 'Insulin', 'Opioid', 'Benzodiazepine'];
    const moderateRiskClasses = ['ACE Inhibitor', 'ARB', 'Beta Blocker', 'Statin'];
    
    if (highRiskClasses.includes(therapeuticClass)) return 'high';
    if (moderateRiskClasses.includes(therapeuticClass)) return 'moderate';
    return 'low';
  };

  const getRecommendationByClass = (therapeuticClass: string): string => {
    const recommendations: Record<string, string> = {
      'ACE Inhibitor': 'Consider replacing existing ACE inhibitor rather than adding another',
      'ARB': 'Consider replacing existing ARB rather than adding another',
      'Beta Blocker': 'Evaluate if combination therapy is clinically indicated',
      'Statin': 'Consider discontinuing existing statin before starting new one',
      'PPI': 'Consider using existing PPI at higher dose instead of adding second PPI',
      'Calcium Channel Blocker': 'Monitor for excessive hypotension with combination'
    };
    return recommendations[therapeuticClass] || 'Review clinical necessity of combination therapy';
  };

  const getClinicalSignificance = (therapeuticClass: string): string => {
    const significance: Record<string, string> = {
      'ACE Inhibitor': 'Increased risk of hyperkalemia and hypotension',
      'ARB': 'Increased risk of hyperkalemia and hypotension',
      'Beta Blocker': 'Excessive bradycardia and hypotension risk',
      'Statin': 'Increased risk of myopathy and rhabdomyolysis',
      'PPI': 'No significant additional benefit, increased cost',
      'Calcium Channel Blocker': 'Excessive vasodilation and hypotension'
    };
    return significance[therapeuticClass] || 'Potential for additive effects and increased adverse reactions';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'exact': return <X className="h-4 w-4" />;
      case 'therapeutic': return <Layers className="h-4 w-4" />;
      case 'mechanism': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const toggleDetails = (index: number) => {
    setShowDetails(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  useEffect(() => {
    checkForDuplications();
  }, [currentMedications, newMedication]);

  if (duplications.length === 0) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          No therapeutic duplications detected for {newMedication.medication_name}.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Therapeutic Duplication Alert
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{duplications.length} potential duplication(s) detected</strong> when adding {newMedication.medication_name} to current medications.
          </AlertDescription>
        </Alert>

        {duplications.map((duplication, index) => (
          <div
            key={`${duplication.existing_medication}-${duplication.new_medication}-${duplication.type}`}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTypeIcon(duplication.type)}
                <Badge className={getSeverityColor(duplication.severity)}>
                  {duplication.severity.toUpperCase()} RISK
                </Badge>
                <Badge variant="outline">
                  {duplication.type.charAt(0).toUpperCase() + duplication.type.slice(1)} Duplication
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails(index)}
              >
                {showDetails[index] ? 'Hide' : 'Show'} Details
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-gray-600">Existing Medication</h4>
                <p className="font-semibold">{duplication.existing_medication}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-600">New Medication</h4>
                <p className="font-semibold">{duplication.new_medication}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-600">Therapeutic Class</h4>
              <p className="text-sm">{duplication.therapeutic_class}</p>
            </div>

            {showDetails[index] && (
              <div className="space-y-3 pt-3 border-t">
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Mechanism of Action</h4>
                  <p className="text-sm">{duplication.mechanism}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Clinical Significance</h4>
                  <p className="text-sm text-orange-700">{duplication.clinical_significance}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Recommendation</h4>
                  <p className="text-sm text-blue-700">{duplication.recommendation}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDuplicationResolved?.('replace', duplication.existing_medication)}
              >
                Replace {duplication.existing_medication}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDuplicationResolved?.('continue')}
              >
                Continue Anyway
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDuplicationResolved?.('cancel')}
              >
                Cancel New Medication
              </Button>
            </div>
          </div>
        ))}

        {/* Summary Actions */}
        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm mb-3">Resolve All Duplications:</h4>
          <div className="flex gap-2">
            <Button
              onClick={() => onDuplicationResolved?.('continue')}
              variant="outline"
            >
              Continue with All Medications
            </Button>
            <Button
              onClick={() => onDuplicationResolved?.('cancel')}
              variant="destructive"
            >
              Cancel New Prescription
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
