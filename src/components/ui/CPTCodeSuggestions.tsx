import React, { useState, useEffect, useCallback } from 'react';
import { useClinicalCodingService, ClinicalCodeMapping } from '@/lib/medical/ClinicalCodingService';
import { CPTSuggestion } from '@/lib/medical/CPTService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Search, Plus, X, Clock, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CPTCodeSuggestionsProps {
  clinicalText: string;
  onCodeSelected?: (code: CPTSuggestion) => void;
  onCodesConfirmed?: (codes: CPTSuggestion[]) => void;
  selectedCodes?: CPTSuggestion[];
  className?: string;
}

export const CPTCodeSuggestions: React.FC<CPTCodeSuggestionsProps> = ({
  clinicalText,
  onCodeSelected,
  onCodesConfirmed,
  selectedCodes = [],
  className,
}) => {
  const [analysis, setAnalysis] = useState<ClinicalCodeMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingIssues, setBillingIssues] = useState<string[]>([]);

  const clinicalCodingService = useClinicalCodingService();

  const analyzeText = useCallback(async () => {
    if (!clinicalText.trim()) {
      setAnalysis(null);
      setBillingIssues([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await clinicalCodingService.analyzeClinicalText(clinicalText);
      setAnalysis(result);
      const validation = clinicalCodingService.validateBillingAccuracy(result.cptCodes);
      setBillingIssues(validation.issues);
    } catch (err) {
      console.error('Error analyzing clinical text for CPT codes:', err);
      setError('Failed to analyze clinical text for CPT codes');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [clinicalText, clinicalCodingService]);

  useEffect(() => {
    analyzeText();
  }, [analyzeText]);

  const handleCodeSelect = (code: CPTSuggestion) => {
    onCodeSelected?.(code);
  };

  const handleConfirmCodes = () => {
    onCodesConfirmed?.(selectedCodes);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (confidence >= 0.6) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'surgery':
        return <Stethoscope className="w-4 h-4" />;
      case 'radiology':
        return <Search className="w-4 h-4" />;
      case 'pathology and laboratory':
        return <Search className="w-4 h-4" />;
      case 'medicine':
        return <Clock className="w-4 h-4" />;
      case 'anesthesia':
        return <Clock className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Analyzing for CPT Codes...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full border-red-200', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            CPT Code Analysis Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const suggestions = analysis?.cptCodes || [];

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            CPT Code Suggestions
          </div>
          {selectedCodes.length > 0 && (
            <Badge variant="secondary">
              {selectedCodes.length} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {billingIssues.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
            <strong>Billing validation:</strong> {billingIssues.join(' ')}
          </div>
        )}
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No CPT code suggestions found for the provided clinical text.</p>
            <p className="text-sm mt-2">Try including procedure names or diagnoses.</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => {
                  const isSelected = selectedCodes.some(code => code.code === suggestion.code);

                  return (
                    <div
                      key={`${suggestion.code}-${index}`}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                      onClick={() => handleCodeSelect(suggestion)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(suggestion.category)}
                            <code className="font-mono font-semibold text-primary">
                              {suggestion.code}
                            </code>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {suggestion.description}
                          </p>
                          {suggestion.notes && (
                            <p className="text-xs text-muted-foreground italic">
                              {suggestion.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          {getConfidenceIcon(suggestion.confidence)}
                          <span className={cn('text-xs font-medium', getConfidenceColor(suggestion.confidence))}>
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {selectedCodes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium">Selected CPT Codes:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCodes.map((code) => (
                      <Badge key={code.code} variant="default" className="flex items-center gap-1">
                        {code.code}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newSelected = selectedCodes.filter(c => c.code !== code.code);
                            onCodesConfirmed?.(newSelected);
                          }}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Button
                    onClick={handleConfirmCodes}
                    className="w-full"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm CPT Codes ({selectedCodes.length})
                  </Button>
                </div>
              </>
            )}

            {analysis?.reasoning && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <strong>AI Reasoning:</strong> {analysis.reasoning}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
