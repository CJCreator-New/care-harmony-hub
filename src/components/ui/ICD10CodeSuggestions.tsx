import React, { useState, useEffect, useCallback } from 'react';
import { useClinicalCodingService, ClinicalCodeMapping } from '@/lib/medical/ClinicalCodingService';
import { ICD10Suggestion } from '@/lib/medical/ICD10Service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Search, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ICD10CodeSuggestionsProps {
  clinicalText: string;
  onCodeSelected?: (code: ICD10Suggestion) => void;
  onCodesConfirmed?: (codes: ICD10Suggestion[]) => void;
  selectedCodes?: ICD10Suggestion[];
  className?: string;
}

export const ICD10CodeSuggestions: React.FC<ICD10CodeSuggestionsProps> = ({
  clinicalText,
  onCodeSelected,
  onCodesConfirmed,
  selectedCodes = [],
  className,
}) => {
  const [analysis, setAnalysis] = useState<ClinicalCodeMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSelectedCodes, setLocalSelectedCodes] = useState<ICD10Suggestion[]>(selectedCodes);

  const clinicalCodingService = useClinicalCodingService();

  // Update local state when selectedCodes prop changes
  useEffect(() => {
    setLocalSelectedCodes(selectedCodes);
  }, [selectedCodes]);

  const analyzeText = useCallback(async () => {
    if (!clinicalText.trim()) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await clinicalCodingService.analyzeClinicalText(clinicalText);
      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze clinical text for ICD-10 codes');
      console.error('ICD-10 analysis error:', err);
    } finally {
      setLoading(false);
    }
  }, [clinicalText, clinicalCodingService]);

  // Analyze text when clinicalText changes
  useEffect(() => {
    const debounceTimer = setTimeout(analyzeText, 500);
    return () => clearTimeout(debounceTimer);
  }, [analyzeText]);

  const handleCodeToggle = (code: ICD10Suggestion) => {
    const isSelected = localSelectedCodes.some(selected => selected.code === code.code);

    let newSelectedCodes: ICD10Suggestion[];
    if (isSelected) {
      newSelectedCodes = localSelectedCodes.filter(selected => selected.code !== code.code);
    } else {
      newSelectedCodes = [...localSelectedCodes, code];
    }

    setLocalSelectedCodes(newSelectedCodes);
    onCodeSelected?.(code);
  };

  const handleConfirmCodes = () => {
    onCodesConfirmed?.(localSelectedCodes);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 0.8) return 'default';
    if (confidence >= 0.6) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Analyzing clinical text...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span className="text-sm">Enter clinical text to get ICD-10 code suggestions</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>ICD-10 Code Suggestions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clinical Context Summary */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Clinical Context Detected:</h4>
          <div className="flex flex-wrap gap-1">
            {analysis.clinicalContext.symptoms.length > 0 && (
              <Badge variant="outline" className="text-xs">
                Symptoms: {analysis.clinicalContext.symptoms.slice(0, 3).join(', ')}
                {analysis.clinicalContext.symptoms.length > 3 && '...'}
              </Badge>
            )}
            {analysis.clinicalContext.diagnoses.length > 0 && (
              <Badge variant="outline" className="text-xs">
                Diagnoses: {analysis.clinicalContext.diagnoses.slice(0, 2).join(', ')}
                {analysis.clinicalContext.diagnoses.length > 2 && '...'}
              </Badge>
            )}
            {analysis.clinicalContext.procedures.length > 0 && (
              <Badge variant="outline" className="text-xs">
                Procedures: {analysis.clinicalContext.procedures.slice(0, 2).join(', ')}
                {analysis.clinicalContext.procedures.length > 2 && '...'}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Primary Code */}
        {analysis.primaryCode && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Primary Code Recommendation:</h4>
            <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-mono text-sm font-bold">{analysis.primaryCode.code}</span>
                    <Badge variant={getConfidenceBadgeVariant(analysis.primaryCode.confidence)} className="text-xs">
                      {Math.round(analysis.primaryCode.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.primaryCode.description}</p>
                  {analysis.primaryCode.matchedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {analysis.primaryCode.matchedKeywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={localSelectedCodes.some(c => c.code === analysis.primaryCode!.code) ? "secondary" : "default"}
                  onClick={() => handleCodeToggle(analysis.primaryCode!)}
                >
                  {localSelectedCodes.some(c => c.code === analysis.primaryCode!.code) ? (
                    <X className="h-3 w-3" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Codes */}
        {analysis.secondaryCodes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Additional Suggestions:</h4>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {analysis.secondaryCodes.map((code, index) => (
                  <div key={code.code} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-mono text-sm font-bold">{code.code}</span>
                          <Badge variant={getConfidenceBadgeVariant(code.confidence)} className="text-xs">
                            {Math.round(code.confidence * 100)}%
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {code.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{code.description}</p>
                        {code.matchedKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {code.matchedKeywords.slice(0, 3).map((keyword) => (
                              <Badge key={keyword} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={localSelectedCodes.some(c => c.code === code.code) ? "secondary" : "outline"}
                        onClick={() => handleCodeToggle(code)}
                      >
                        {localSelectedCodes.some(c => c.code === code.code) ? (
                          <X className="h-3 w-3" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Selected Codes Summary */}
        {localSelectedCodes.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Selected Codes ({localSelectedCodes.length}):</h4>
              <div className="flex flex-wrap gap-2">
                {localSelectedCodes.map((code) => (
                  <Badge key={code.code} variant="default" className="cursor-pointer" onClick={() => handleCodeToggle(code)}>
                    {code.code} - {code.description.slice(0, 30)}...
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <Button onClick={handleConfirmCodes} className="w-full" size="sm">
                Confirm Selected Codes
              </Button>
            </div>
          </>
        )}

        {/* Reasoning */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>AI Reasoning:</strong> {analysis.reasoning}
        </div>
      </CardContent>
    </Card>
  );
};
