import React, { useState, useCallback } from 'react';
import { patientQueryService, PatientQuery, QueryCategory } from '@/lib/patient/PatientQueryService';
import { ResponseGenerator } from './ResponseGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Send,
  RefreshCw,
  User,
  Stethoscope,
  Pill,
  Calendar,
  FileText,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientQueryParserProps {
  onQueryParsed?: (query: PatientQuery) => void;
  onActionSelected?: (action: string, query: PatientQuery) => void;
  onResponseGenerated?: (response: any) => void;
  onResponseSent?: (response: any) => void;
  patientContext?: any;
  className?: string;
  placeholder?: string;
  showSuggestions?: boolean;
  showResponseGenerator?: boolean;
  autoParse?: boolean;
}

export const PatientQueryParser: React.FC<PatientQueryParserProps> = ({
  onQueryParsed,
  onActionSelected,
  onResponseGenerated,
  onResponseSent,
  patientContext,
  className,
  placeholder = "Ask me anything about your healthcare...",
  showSuggestions = true,
  showResponseGenerator = true,
  autoParse = false,
}) => {
  const [query, setQuery] = useState('');
  const [parsedQuery, setParsedQuery] = useState<PatientQuery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParseQuery = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await patientQueryService.parseQuery(query);
      setParsedQuery(result);
      onQueryParsed?.(result);
    } catch (err) {
      console.error('Error parsing patient query:', err);
      setError('Failed to analyze your query. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query, onQueryParsed]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleParseQuery();
  }, [handleParseQuery]);

  const handleActionClick = useCallback((actionType: string) => {
    if (parsedQuery) {
      onActionSelected?.(actionType, parsedQuery);
    }
  }, [parsedQuery, onActionSelected]);

  const handleClear = useCallback(() => {
    setQuery('');
    setParsedQuery(null);
    setError(null);
  }, []);

  const getCategoryIcon = (category: QueryCategory) => {
    switch (category) {
      case 'appointment_scheduling':
        return <Calendar className="w-4 h-4" />;
      case 'prescription_request':
        return <Pill className="w-4 h-4" />;
      case 'test_results':
        return <FileText className="w-4 h-4" />;
      case 'symptom_assessment':
        return <Stethoscope className="w-4 h-4" />;
      case 'emergency':
        return <AlertTriangle className="w-4 h-4" />;
      case 'billing_question':
        return <FileText className="w-4 h-4" />;
      case 'technical_support':
        return <Phone className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: QueryCategory) => {
    switch (category) {
      case 'emergency':
        return 'destructive';
      case 'appointment_scheduling':
        return 'default';
      case 'prescription_request':
        return 'secondary';
      case 'test_results':
        return 'outline';
      case 'symptom_assessment':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'symptom':
        return <Stethoscope className="w-3 h-3" />;
      case 'medication':
        return <Pill className="w-3 h-3" />;
      case 'appointment':
        return <Calendar className="w-3 h-3" />;
      case 'test':
        return <FileText className="w-3 h-3" />;
      case 'provider':
        return <User className="w-3 h-3" />;
      case 'time':
        return <Clock className="w-3 h-3" />;
      default:
        return <MessageSquare className="w-3 h-3" />;
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'schedule_appointment':
        return <Calendar className="w-4 h-4" />;
      case 'request_prescription':
        return <Pill className="w-4 h-4" />;
      case 'view_results':
        return <FileText className="w-4 h-4" />;
      case 'emergency':
        return <AlertTriangle className="w-4 h-4" />;
      case 'contact_provider':
        return <Phone className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <Card className={cn('w-full max-w-4xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Patient Query Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Query Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="min-h-24 resize-none"
              disabled={loading}
            />
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {query.length} characters
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={loading || !query}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || !query.trim()}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Analyze Query
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">Analysis Error</span>
            </div>
            <p className="text-sm text-destructive mt-1">{error}</p>
          </div>
        )}

        {/* Parsed Query Results */}
        {parsedQuery && (
          <div className="space-y-6">
            {/* Query Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(parsedQuery.category)}
                    Query Analysis
                  </div>
                  <div className="flex items-center gap-2">
                    {getUrgencyIcon(parsedQuery.urgency)}
                    <Badge variant={getCategoryColor(parsedQuery.category)}>
                      {parsedQuery.category.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Intent */}
                <div>
                  <h4 className="font-medium mb-2">Primary Intent</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {parsedQuery.intent.primary.replace('_', ' ')}
                    </Badge>
                    {parsedQuery.intent.secondary && (
                      <Badge variant="outline" className="text-muted-foreground">
                        {parsedQuery.intent.secondary.replace('_', ' ')}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {Math.round(parsedQuery.intent.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>

                {/* Urgency */}
                <div>
                  <h4 className="font-medium mb-2">Urgency Level</h4>
                  <div className="flex items-center gap-2">
                    {getUrgencyIcon(parsedQuery.urgency)}
                    <span className="capitalize font-medium">{parsedQuery.urgency}</span>
                  </div>
                </div>

                {/* Overall Confidence */}
                <div>
                  <h4 className="font-medium mb-2">Analysis Confidence</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${parsedQuery.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(parsedQuery.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Extracted Entities */}
            {parsedQuery.entities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Extracted Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {parsedQuery.entities.map((entity) => (
                      <div
                        key={`${entity.type}-${entity.value}`}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getEntityIcon(entity.type)}
                          <div>
                            <span className="font-medium capitalize">{entity.type}</span>
                            <p className="text-sm text-muted-foreground">{entity.value}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(entity.confidence * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggested Actions */}
            {parsedQuery.suggestedActions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parsedQuery.suggestedActions.map((action) => (
                      <div
                        key={action.type}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getActionIcon(action.type)}
                          <div>
                            <p className="font-medium">{action.description}</p>
                            {action.requiredEntities.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                Requires: {action.requiredEntities.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleActionClick(action.type)}
                          variant={action.priority > 1 ? "default" : "outline"}
                        >
                          {action.priority > 1 ? 'Take Action' : 'Select'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Automated Response Generator */}
            {showResponseGenerator && parsedQuery && (
              <ResponseGenerator
                patientQuery={parsedQuery}
                patientContext={patientContext}
                onResponseGenerated={onResponseGenerated}
                onResponseSent={onResponseSent}
              />
            )}

            {/* Suggested Responses (Legacy) */}
            {showSuggestions && !showResponseGenerator && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Suggested Responses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {patientQueryService.getSuggestedResponses(parsedQuery).map((response) => (
                        <div
                          key={response}
                          className="p-3 bg-muted/50 rounded-lg text-sm"
                        >
                          {response}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
