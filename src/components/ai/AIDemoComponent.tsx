import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAI, useAIProviders, useAIAudit } from '@/hooks/useAI';
import { Loader2, Brain, Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface DemoPatientData {
  age: number;
  gender: string;
  chiefComplaint: string;
  symptoms: string[];
  vitalSigns: {
    temperature?: number;
    bloodPressure?: string;
    heartRate?: number;
  };
  medicalHistory: string[];
  currentMedications: string[];
}

export default function AIDemoComponent() {
  const [patientData, setPatientData] = useState<DemoPatientData>({
    age: 45,
    gender: 'Female',
    chiefComplaint: 'Persistent cough and shortness of breath for 3 days',
    symptoms: ['Cough', 'Shortness of breath', 'Fever', 'Fatigue'],
    vitalSigns: {
      temperature: 101.2,
      bloodPressure: '120/80',
      heartRate: 88,
    },
    medicalHistory: ['Hypertension', 'Type 2 Diabetes'],
    currentMedications: ['Lisinopril 10mg daily', 'Metformin 500mg twice daily'],
  });

  const [customContext, setCustomContext] = useState('');
  const [activeTab, setActiveTab] = useState('diagnosis');

  const {
    diagnosePatient,
    createTreatmentPlan,
    reviewMedications,
    summarizeClinicalData,
    isLoading,
    lastResponse,
    error,
    complianceStatus,
    clearError,
  } = useAI({ purpose: 'diagnosis', dataRetentionDays: 30 });

  const { providers } = useAIProviders();
  const { auditHistory } = useAIAudit();

  const handleAIDiagnosis = async () => {
    try {
      await diagnosePatient(patientData, customContext);
    } catch (err) {
      console.error('AI Diagnosis failed:', err);
    }
  };

  const handleTreatmentPlan = async () => {
    try {
      await createTreatmentPlan(patientData, customContext);
    } catch (err) {
      console.error('Treatment plan failed:', err);
    }
  };

  const handleMedicationReview = async () => {
    try {
      await reviewMedications(patientData, patientData.currentMedications);
    } catch (err) {
      console.error('Medication review failed:', err);
    }
  };

  const handleClinicalSummary = async () => {
    try {
      await summarizeClinicalData(patientData);
    } catch (err) {
      console.error('Clinical summary failed:', err);
    }
  };

  const getComplianceBadgeVariant = (status: string) => {
    switch (status) {
      case 'compliant': return 'default';
      case 'warning': return 'secondary';
      case 'violation': return 'destructive';
      default: return 'outline';
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'violation': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            AI Clinical Assistant
          </h1>
          <p className="text-muted-foreground">
            HIPAA-compliant AI assistance for clinical decision support
          </p>
        </div>

        {/* Compliance Status */}
        {complianceStatus && (
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <Badge variant={getComplianceBadgeVariant(complianceStatus.status)}>
              {getComplianceIcon(complianceStatus.status)}
              <span className="ml-1 capitalize">{complianceStatus.status}</span>
            </Badge>
          </div>
        )}
      </div>

      {/* Compliance Warnings */}
      {complianceStatus?.issues && complianceStatus.issues.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Compliance Issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside">
              {complianceStatus.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Data Input */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
            <CardDescription>
              Enter patient data for AI analysis (automatically sanitized for HIPAA compliance)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Age</label>
                <input
                  type="number"
                  value={patientData.age}
                  onChange={(e) => setPatientData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <select
                  value={patientData.gender}
                  onChange={(e) => setPatientData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Chief Complaint</label>
              <Textarea
                value={patientData.chiefComplaint}
                onChange={(e) => setPatientData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                placeholder="Describe the patient's main complaint..."
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Symptoms</label>
              <Textarea
                value={patientData.symptoms.join(', ')}
                onChange={(e) => setPatientData(prev => ({
                  ...prev,
                  symptoms: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                }))}
                placeholder="Enter symptoms separated by commas..."
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Additional Context (Optional)</label>
              <Textarea
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="Any additional clinical context..."
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Operations */}
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
            <CardDescription>
              Select the type of AI assistance needed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                <TabsTrigger value="treatment">Treatment</TabsTrigger>
              </TabsList>

              <TabsContent value="diagnosis" className="space-y-4">
                <div className="space-y-2">
                  <Button
                    onClick={handleAIDiagnosis}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Generate Differential Diagnosis
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleClinicalSummary}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Clinical Summary
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="treatment" className="space-y-4">
                <div className="space-y-2">
                  <Button
                    onClick={handleTreatmentPlan}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Create Treatment Plan
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleMedicationReview}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Review Medications
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Available Providers */}
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Available AI Providers:</p>
              <div className="flex flex-wrap gap-2">
                {providers.map((provider) => (
                  <Badge key={provider.name} variant="outline">
                    {provider.name} ({provider.model})
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Response */}
      {lastResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Response
              <Badge variant="outline" className="ml-auto">
                {Math.round(lastResponse.confidence * 100)}% confidence
              </Badge>
            </CardTitle>
            <CardDescription>
              Generated using {lastResponse.metadata.provider} ({lastResponse.metadata.model})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{lastResponse.response}</p>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Tokens used: {lastResponse.metadata.tokensUsed}</span>
              <span>Processing time: {lastResponse.metadata.processingTime}ms</span>
              <span>Cost: ${lastResponse.metadata.cost.toFixed(4)}</span>
            </div>

            {lastResponse.warnings && lastResponse.warnings.length > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warnings</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {lastResponse.warnings.map((warning: string) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>AI Operation Failed</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Audit History */}
      {auditHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent AI Operations</CardTitle>
            <CardDescription>
              Audit trail of AI operations (last {auditHistory.length} entries)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditHistory.slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getComplianceBadgeVariant(entry.compliance_status)}>
                        {entry.operation}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {entry.user?.first_name} {entry.user?.last_name}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{entry.result_summary}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {format(new Date(entry.timestamp), 'MMM dd, HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
