import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Baby, Heart, Info, ExternalLink } from 'lucide-react';
import { PregnancyLactationSafety } from '@/types/pharmacy';

interface PregnancyLactationWarningsProps {
  drugName: string;
  patientData: {
    is_pregnant?: boolean;
    is_breastfeeding?: boolean;
    gestational_age_weeks?: number;
    trimester?: 1 | 2 | 3;
  };
  onAlternativeSelected?: (alternativeDrug: string) => void;
}

export const PregnancyLactationWarnings: React.FC<PregnancyLactationWarningsProps> = ({
  drugName,
  patientData,
  onAlternativeSelected
}) => {
  const [safetyData, setSafetyData] = useState<PregnancyLactationSafety | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Mock pregnancy/lactation safety data (in real app, fetch from database)
  const getSafetyData = (drug: string): PregnancyLactationSafety | null => {
    const mockSafetyData: Record<string, PregnancyLactationSafety> = {
      'Warfarin': {
        id: '1',
        drug_name: 'Warfarin',
        pregnancy_category: 'X',
        lactation_risk: 'contraindicated',
        trimester_specific_risks: {
          first_trimester: 'Teratogenic - causes warfarin embryopathy (nasal hypoplasia, stippled epiphyses)',
          second_trimester: 'CNS abnormalities, intellectual disability',
          third_trimester: 'Fetal and maternal bleeding complications'
        },
        lactation_considerations: 'Passes into breast milk. Risk of bleeding in nursing infant.',
        alternative_drugs: ['Heparin', 'Enoxaparin', 'Dalteparin'],
        created_at: new Date().toISOString()
      },
      'Lisinopril': {
        id: '2',
        drug_name: 'Lisinopril',
        pregnancy_category: 'D',
        lactation_risk: 'caution',
        trimester_specific_risks: {
          first_trimester: 'Generally safe, limited data',
          second_trimester: 'Oligohydramnios, fetal growth restriction',
          third_trimester: 'Renal dysgenesis, anuria, hypotension, skull hypoplasia'
        },
        lactation_considerations: 'Unknown excretion in breast milk. Monitor infant for hypotension.',
        alternative_drugs: ['Methyldopa', 'Labetalol', 'Nifedipine'],
        created_at: new Date().toISOString()
      },
      'Metformin': {
        id: '3',
        drug_name: 'Metformin',
        pregnancy_category: 'B',
        lactation_risk: 'compatible',
        trimester_specific_risks: {
          all_trimesters: 'Generally safe. May reduce risk of gestational diabetes complications.'
        },
        lactation_considerations: 'Minimal transfer to breast milk. Compatible with breastfeeding.',
        alternative_drugs: ['Insulin'],
        created_at: new Date().toISOString()
      },
      'Ibuprofen': {
        id: '4',
        drug_name: 'Ibuprofen',
        pregnancy_category: 'C',
        lactation_risk: 'compatible',
        trimester_specific_risks: {
          first_trimester: 'Possible increased risk of miscarriage',
          second_trimester: 'Generally safe for short-term use',
          third_trimester: 'Premature closure of ductus arteriosus, oligohydramnios'
        },
        lactation_considerations: 'Minimal excretion in breast milk. Short-term use compatible.',
        alternative_drugs: ['Acetaminophen'],
        created_at: new Date().toISOString()
      },
      'Tetracycline': {
        id: '5',
        drug_name: 'Tetracycline',
        pregnancy_category: 'D',
        lactation_risk: 'contraindicated',
        trimester_specific_risks: {
          all_trimesters: 'Tooth discoloration, enamel defects, bone growth inhibition'
        },
        lactation_considerations: 'Tooth discoloration and enamel defects in nursing infant.',
        alternative_drugs: ['Amoxicillin', 'Azithromycin', 'Cephalexin'],
        created_at: new Date().toISOString()
      }
    };

    return mockSafetyData[drug] || null;
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'X': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLactationColor = (risk: string): string => {
    switch (risk) {
      case 'compatible': return 'bg-green-100 text-green-800';
      case 'caution': return 'bg-yellow-100 text-yellow-800';
      case 'contraindicated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryDescription = (category: string): string => {
    const descriptions = {
      'A': 'Adequate, well-controlled studies in pregnant women have not shown increased risk',
      'B': 'Animal studies show no risk, but no adequate human studies OR animal studies show risk but human studies do not',
      'C': 'Animal studies show adverse effects, no adequate human studies OR no animal or human studies available',
      'D': 'Evidence of human fetal risk, but benefits may warrant use despite potential risks',
      'X': 'Studies show fetal abnormalities OR evidence of fetal risk. Risks outweigh any possible benefit'
    };
    return descriptions[category as keyof typeof descriptions] || 'Unknown category';
  };

  const getCurrentTrimesterRisk = (): string | null => {
    if (!safetyData || !patientData.is_pregnant) return null;
    
    const { trimester_specific_risks } = safetyData;
    
    if (trimester_specific_risks.all_trimesters) {
      return trimester_specific_risks.all_trimesters;
    }
    
    switch (patientData.trimester) {
      case 1:
        return trimester_specific_risks.first_trimester || null;
      case 2:
        return trimester_specific_risks.second_trimester || null;
      case 3:
        return trimester_specific_risks.third_trimester || null;
      default:
        return null;
    }
  };

  const shouldShowWarning = (): boolean => {
    if (!safetyData) return false;
    
    if (patientData.is_pregnant && ['D', 'X'].includes(safetyData.pregnancy_category)) {
      return true;
    }
    
    if (patientData.is_breastfeeding && safetyData.lactation_risk === 'contraindicated') {
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    const data = getSafetyData(drugName);
    setSafetyData(data);
  }, [drugName]);

  if (!safetyData) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No pregnancy/lactation safety data available for {drugName}.
          Please consult drug references or contact pharmacy.
        </AlertDescription>
      </Alert>
    );
  }

  const currentTrimesterRisk = getCurrentTrimesterRisk();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Pregnancy & Lactation Safety - {drugName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Warning */}
        {shouldShowWarning() && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>CONTRAINDICATED:</strong> This medication is not recommended for use in 
              {patientData.is_pregnant && ['D', 'X'].includes(safetyData.pregnancy_category) && ' pregnant women'}
              {patientData.is_pregnant && patientData.is_breastfeeding && ' and'}
              {patientData.is_breastfeeding && safetyData.lactation_risk === 'contraindicated' && ' breastfeeding women'}.
              Consider alternatives below.
            </AlertDescription>
          </Alert>
        )}

        {/* Pregnancy Information */}
        {patientData.is_pregnant && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Baby className="h-4 w-4" />
              <h3 className="font-semibold">Pregnancy Safety</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">FDA Category</Label>
                <Badge className={getCategoryColor(safetyData.pregnancy_category)}>
                  Category {safetyData.pregnancy_category}
                </Badge>
                <p className="text-xs text-gray-600 mt-1">
                  {getCategoryDescription(safetyData.pregnancy_category)}
                </p>
              </div>
              
              {patientData.trimester && (
                <div>
                  <Label className="text-sm font-medium">Current Trimester</Label>
                  <p className="font-semibold">Trimester {patientData.trimester}</p>
                  {patientData.gestational_age_weeks && (
                    <p className="text-sm text-gray-600">{patientData.gestational_age_weeks} weeks</p>
                  )}
                </div>
              )}
            </div>

            {/* Trimester-Specific Risks */}
            {currentTrimesterRisk && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Trimester {patientData.trimester} Risk:</strong> {currentTrimesterRisk}
                </AlertDescription>
              </Alert>
            )}

            {/* All Trimester Risks */}
            {Object.entries(safetyData.trimester_specific_risks).map(([trimester, risk]) => {
              if (trimester === 'all_trimesters' || !risk) return null;
              
              const trimesterNum = trimester.includes('first') ? 1 : 
                                 trimester.includes('second') ? 2 : 3;
              
              return (
                <div key={trimester} className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm mb-1">
                    Trimester {trimesterNum} 
                    {patientData.trimester === trimesterNum && (
                      <Badge variant="outline" className="ml-2">Current</Badge>
                    )}
                  </h4>
                  <p className="text-sm text-gray-700">{risk}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Lactation Information */}
        {patientData.is_breastfeeding && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Baby className="h-4 w-4" />
              <h3 className="font-semibold">Breastfeeding Safety</h3>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Lactation Risk</Label>
              <Badge className={getLactationColor(safetyData.lactation_risk)}>
                {safetyData.lactation_risk.charAt(0).toUpperCase() + safetyData.lactation_risk.slice(1)}
              </Badge>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Lactation Considerations:</strong> {safetyData.lactation_considerations}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Alternative Medications */}
        {safetyData.alternative_drugs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Safer Alternatives</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAlternatives(!showAlternatives)}
              >
                {showAlternatives ? 'Hide' : 'Show'} Alternatives
              </Button>
            </div>
            
            {showAlternatives && (
              <div className="grid grid-cols-1 gap-2">
                {safetyData.alternative_drugs.map((drug) => (
                  <div key={drug} className="flex items-center justify-between p-2 border rounded-lg">
                    <span className="font-medium">{drug}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAlternativeSelected?.(drug)}
                    >
                      Select Alternative
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* External Resources */}
        <div className="pt-3 border-t">
          <h4 className="font-medium text-sm mb-2">Additional Resources</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              LactMed Database
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              MotherToBaby
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              Reprotox
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface LabelProps {
  className?: string;
  children: React.ReactNode;
}

const Label: React.FC<LabelProps> = ({ className = '', children }) => (
  <label className={`block text-sm font-medium text-gray-700 ${className}`}>
    {children}
  </label>
);
