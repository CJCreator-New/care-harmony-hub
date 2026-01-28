import React, { useState, useCallback, useEffect } from 'react';
import { automatedResponseService, PersonalizedResponse, PatientContext } from '@/lib/patient/AutomatedResponseService';
import { PatientQuery } from '@/lib/patient/PatientQueryService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Settings,
  Copy,
  Edit,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponseGeneratorProps {
  patientQuery: PatientQuery;
  patientContext?: PatientContext;
  onResponseGenerated?: (response: PersonalizedResponse) => void;
  onResponseSent?: (response: PersonalizedResponse) => void;
  className?: string;
  autoGenerate?: boolean;
}

export const ResponseGenerator: React.FC<ResponseGeneratorProps> = ({
  patientQuery,
  patientContext,
  onResponseGenerated,
  onResponseSent,
  className,
  autoGenerate = true,
}) => {
  const [generatedResponse, setGeneratedResponse] = useState<PersonalizedResponse | null>(null);
  const [customResponse, setCustomResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'generated' | 'custom'>('generated');
  const [editingResponse, setEditingResponse] = useState(false);
  const [editedText, setEditedText] = useState('');

  // Auto-generate response on mount
  useEffect(() => {
    if (autoGenerate && patientQuery) {
      generateResponse();
    }
  }, [autoGenerate, patientQuery]);

  const generateResponse = useCallback(async () => {
    setLoading(true);
    try {
      const response = await automatedResponseService.generateResponse(
        patientQuery,
        patientContext
      );
      setGeneratedResponse(response);
      setEditedText(response.text);
      onResponseGenerated?.(response);
    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      setLoading(false);
    }
  }, [patientQuery, patientContext, onResponseGenerated]);

  const handleSendResponse = useCallback(() => {
    const responseToSend = activeTab === 'generated' && !editingResponse
      ? generatedResponse
      : {
          ...generatedResponse!,
          text: activeTab === 'custom' ? customResponse : editedText,
        };

    if (responseToSend) {
      onResponseSent?.(responseToSend);
    }
  }, [activeTab, generatedResponse, customResponse, editedText, editingResponse, onResponseSent]);

  const handleCopyResponse = useCallback(() => {
    const textToCopy = activeTab === 'generated'
      ? (editingResponse ? editedText : generatedResponse?.text)
      : customResponse;

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
    }
  }, [activeTab, generatedResponse, editedText, customResponse, editingResponse]);

  const handleEditResponse = useCallback(() => {
    setEditingResponse(true);
    setEditedText(generatedResponse?.text || '');
  }, [generatedResponse]);

  const handleSaveEdit = useCallback(() => {
    if (generatedResponse) {
      setGeneratedResponse({
        ...generatedResponse,
        text: editedText,
      });
    }
    setEditingResponse(false);
  }, [generatedResponse, editedText]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      default:
        return 'green';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4" />;
      case 'high':
      case 'medium':
        return <Clock className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={cn('w-full max-w-4xl', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Response Generator
          </CardTitle>
          <div className="flex items-center gap-2">
            {getUrgencyIcon(patientQuery.urgency)}
            <Badge variant={getUrgencyColor(patientQuery.urgency) as any}>
              {patientQuery.urgency.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Query Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Query Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Original Query:</p>
              <p className="font-medium">"{patientQuery.originalQuery}"</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="outline">{patientQuery.category.replace('_', ' ')}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Primary Intent</p>
                <Badge variant="secondary">{patientQuery.intent.primary.replace('_', ' ')}</Badge>
              </div>
            </div>
            {patientQuery.entities.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Extracted Entities:</p>
                <div className="flex flex-wrap gap-1">
                  {patientQuery.entities.map((entity, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {entity.type}: {entity.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Generation */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'generated' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generated" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              AI Generated
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Custom Response
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generated" className="space-y-4">
            {!generatedResponse && !loading && (
              <div className="text-center py-8">
                <Button onClick={generateResponse} disabled={loading}>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate AI Response
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Generating personalized response...</span>
              </div>
            )}

            {generatedResponse && (
              <div className="space-y-4">
                {/* Response Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Confidence:</span>
                    <span className={cn('text-sm font-bold', getConfidenceColor(generatedResponse.confidence))}>
                      {Math.round(generatedResponse.confidence * 100)}%
                    </span>
                    {generatedResponse.escalationRequired && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        ESCALATION REQUIRED
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyResponse}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    {!editingResponse && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditResponse}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    {editingResponse && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveEdit}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    )}
                  </div>
                </div>

                {/* Response Text */}
                {editingResponse ? (
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="min-h-32"
                    placeholder="Edit the response..."
                  />
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm leading-relaxed">{generatedResponse.text}</p>
                  </div>
                )}

                {/* Escalation Warning */}
                {generatedResponse.escalationRequired && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Escalation Required</span>
                    </div>
                    <p className="text-sm text-red-600">
                      {generatedResponse.escalationReason}
                    </p>
                  </div>
                )}

                {/* Follow-up Questions */}
                {generatedResponse.followUpQuestions && generatedResponse.followUpQuestions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Suggested Follow-up Questions:</h4>
                    <ul className="space-y-1">
                      {generatedResponse.followUpQuestions.map((question, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-muted-foreground">
                  <p>Template: {generatedResponse.metadata.templateId}</p>
                  <p>Generated: {generatedResponse.metadata.generatedAt.toLocaleString()}</p>
                  {generatedResponse.metadata.personalizationFactors.length > 0 && (
                    <p>Personalization: {generatedResponse.metadata.personalizationFactors.join(', ')}</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <Textarea
              value={customResponse}
              onChange={(e) => setCustomResponse(e.target.value)}
              placeholder="Type your custom response here..."
              className="min-h-32"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyResponse}
                disabled={!customResponse}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        {(generatedResponse || customResponse) && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCopyResponse}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Response
            </Button>
            <Button
              onClick={handleSendResponse}
              disabled={activeTab === 'custom' && !customResponse.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Response
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};