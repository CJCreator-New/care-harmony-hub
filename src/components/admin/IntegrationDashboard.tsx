import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useFHIRIntegration } from '@/hooks/useFHIRIntegration';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Share2, Download, Upload, CheckCircle, 
  AlertCircle, Clock, ExternalLink 
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { FHIRPatient } from '@/hooks/useFHIRIntegration';

interface OperationOutcomeIssue {
  severity?: string;
  code?: string;
  diagnostics?: string;
}

interface OperationOutcomeResource {
  resourceType: 'OperationOutcome';
  issue?: OperationOutcomeIssue[];
}

interface ImportFeedback {
  tone: 'success' | 'error' | 'info';
  title: string;
  details: string[];
}

interface ImportValidationResult {
  isValid: boolean;
  parsedPatient: FHIRPatient | null;
  errors: string[];
  warnings: string[];
}

const DEFAULT_FHIR_PATIENT_JSON = `{
  "resourceType": "Patient",
  "name": [
    {
      "family": "Doe",
      "given": ["Jane"]
    }
  ],
  "gender": "female",
  "birthDate": "1990-01-01",
  "telecom": [
    { "system": "phone", "value": "+15551234567" },
    { "system": "email", "value": "jane.doe@example.com" }
  ]
}`;

function getOperationOutcome(payload: unknown): OperationOutcomeResource | null {
  if (!payload || typeof payload !== 'object') return null;
  if ((payload as { resourceType?: string }).resourceType !== 'OperationOutcome') return null;
  return payload as OperationOutcomeResource;
}

function lineColumnAtPosition(source: string, index: number): { line: number; column: number } {
  const safeIndex = Math.max(0, Math.min(index, source.length));
  const linesUntilIndex = source.slice(0, safeIndex).split('\n');
  const line = linesUntilIndex.length;
  const column = linesUntilIndex[linesUntilIndex.length - 1].length + 1;
  return { line, column };
}

function validateImportJsonPayload(rawJson: string): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawJson.trim()) {
    return {
      isValid: false,
      parsedPatient: null,
      errors: ['FHIR JSON payload is required.'],
      warnings,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON.';
    const match = message.match(/position\s+(\d+)/i);
    if (match) {
      const position = Number(match[1]);
      if (Number.isFinite(position)) {
        const { line, column } = lineColumnAtPosition(rawJson, position);
        errors.push(`Invalid JSON at line ${line}, column ${column}.`);
      } else {
        errors.push('Invalid JSON syntax.');
      }
    } else {
      errors.push('Invalid JSON syntax.');
    }

    return {
      isValid: false,
      parsedPatient: null,
      errors,
      warnings,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      parsedPatient: null,
      errors: ['FHIR payload must be a JSON object.'],
      warnings,
    };
  }

  const candidate = parsed as FHIRPatient;
  if (candidate.resourceType !== 'Patient') {
    errors.push("FHIR payload must have resourceType set to 'Patient'.");
  }

  const hasName = Array.isArray(candidate.name) && candidate.name.length > 0;
  if (!hasName) {
    warnings.push('Patient.name is missing. Server will use fallback name values.');
  }

  if (!candidate.birthDate) {
    warnings.push('Patient.birthDate is missing and import will fail on submit.');
  }

  if (candidate.gender && !['male', 'female', 'other', 'unknown'].includes(candidate.gender)) {
    warnings.push(`Patient.gender '${candidate.gender}' is non-standard for FHIR R4.`);
  }

  return {
    isValid: errors.length === 0,
    parsedPatient: errors.length === 0 ? candidate : null,
    errors,
    warnings,
  };
}

export function IntegrationDashboard() {
  const { profile, hospital } = useAuth();
  const { exportPatient, importPatient, exportEncounter, isExporting, isImporting } = useFHIRIntegration();
  const hospitalId = hospital?.id || profile?.hospital_id || '';
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [importJson, setImportJson] = useState<string>(DEFAULT_FHIR_PATIENT_JSON);
  const [importFeedback, setImportFeedback] = useState<ImportFeedback | null>(null);
  const importValidation = useMemo(() => validateImportJsonPayload(importJson), [importJson]);

  const integrations = [
    {
      name: 'FHIR R4',
      status: 'connected',
      type: 'Healthcare Data Exchange',
      lastSync: '2024-12-20 14:30',
      records: 1250,
    },
    {
      name: 'Insurance Claims',
      status: 'connected',
      type: 'Claims Processing',
      lastSync: '2024-12-20 15:45',
      records: 89,
    },
    {
      name: 'Lab Equipment',
      status: 'pending',
      type: 'Device Integration',
      lastSync: 'Never',
      records: 0,
    },
    {
      name: 'Pharmacy Network',
      status: 'error',
      type: 'Prescription Management',
      lastSync: '2024-12-19 09:15',
      records: 456,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleImportPatient = () => {
    if (!hospitalId) {
      const message = 'No active hospital context found. Re-authenticate and try again.';
      setImportFeedback({
        tone: 'error',
        title: 'Import failed',
        details: [message],
      });
      toast.error(message);
      return;
    }

    if (!importValidation.isValid || !importValidation.parsedPatient) {
      const message = importValidation.errors[0] || 'Invalid FHIR payload.';
      setImportFeedback({
        tone: 'error',
        title: 'Import failed',
        details: [message],
      });
      toast.error(message);
      return;
    }

    if (importValidation.warnings.length > 0) {
      const message = importValidation.warnings[0];
      setImportFeedback({
        tone: 'info',
        title: 'Validation warning',
        details: [message],
      });
      toast.warning(message);
    }

    setImportFeedback({
      tone: 'info',
      title: 'Import in progress',
      details: [`Submitting Patient resource for hospital ${hospitalId}`],
    });

    importPatient(
      {
        fhirPatient: importValidation.parsedPatient,
        hospitalId,
      },
      {
        onSuccess: (result) => {
          const operationOutcome = getOperationOutcome(result);
          if (operationOutcome) {
            const details = (operationOutcome.issue || [])
              .map((issue) => issue.diagnostics?.trim())
              .filter((line): line is string => Boolean(line));

            setImportFeedback({
              tone: 'info',
              title: 'FHIR OperationOutcome',
              details: details.length > 0 ? details : ['Import returned OperationOutcome with no diagnostics.'],
            });
            toast.info('FHIR import returned OperationOutcome');
            return;
          }

          const importedPatient = result as { id?: string; identifier?: Array<{ value?: string }> };
          const mrn = importedPatient.identifier?.find((entry) => entry?.value)?.value;
          const details = [
            importedPatient.id ? `Patient ID: ${importedPatient.id}` : 'Patient imported successfully.',
            mrn ? `MRN: ${mrn}` : '',
          ].filter(Boolean);

          setImportFeedback({
            tone: 'success',
            title: 'Patient import successful',
            details,
          });
          toast.success('FHIR patient imported successfully');
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : 'FHIR import failed.';
          setImportFeedback({
            tone: 'error',
            title: 'Import failed',
            details: [message],
          });
          toast.error(message);
        },
      },
    );
  };

  const handleFormatImportJson = () => {
    if (!importValidation.parsedPatient) {
      const message = 'Fix JSON errors before formatting.';
      toast.error(message);
      return;
    }
    setImportJson(JSON.stringify(importValidation.parsedPatient, null, 2));
    toast.success('FHIR JSON formatted');
  };

  const importFeedbackStyles =
    importFeedback?.tone === 'error'
      ? 'border-red-300 bg-red-50 text-red-800'
      : importFeedback?.tone === 'success'
      ? 'border-green-300 bg-green-50 text-green-800'
      : 'border-blue-300 bg-blue-50 text-blue-800';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Integration Hub</h2>
        <Button>
          <ExternalLink className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{integration.name}</CardTitle>
              {getStatusIcon(integration.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge className={getStatusColor(integration.status)}>
                  {integration.status}
                </Badge>
                <p className="text-xs text-muted-foreground">{integration.type}</p>
                <p className="text-xs text-muted-foreground">
                  {integration.records} records synced
                </p>
                <p className="text-xs text-muted-foreground">
                  Last sync: {integration.lastSync}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FHIR Integration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>FHIR Data Exchange</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Patient ID</label>
              <input
                type="text"
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                placeholder="Enter patient ID"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={() => selectedPatient && exportPatient(selectedPatient)}
                disabled={!selectedPatient || isExporting}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Patient
              </Button>
              <Button
                onClick={() => selectedPatient && exportEncounter(selectedPatient)}
                disabled={!selectedPatient}
                variant="outline"
                size="sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Export Encounter
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Import FHIR Data</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Hospital context: {hospitalId || 'Unavailable'}
              </p>
              <Textarea
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value);
                  if (importFeedback) setImportFeedback(null);
                }}
                rows={12}
                className={`font-mono text-xs ${
                  importValidation.errors.length > 0
                    ? 'border-red-500 focus-visible:ring-red-400'
                    : 'border-green-500'
                }`}
                placeholder="Paste FHIR Patient JSON"
              />
              <div className="mt-2 space-y-1">
                {importValidation.errors.map((error, index) => (
                  <p key={`import-error-${index}`} className="text-xs text-red-600">
                    {error}
                  </p>
                ))}
                {importValidation.warnings.map((warning, index) => (
                  <p key={`import-warning-${index}`} className="text-xs text-amber-700">
                    {warning}
                  </p>
                ))}
                {importValidation.errors.length === 0 && (
                  <p className="text-xs text-green-700">FHIR payload syntax is valid.</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFormatImportJson}
                    disabled={importValidation.errors.length > 0}
                  >
                    Format JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImportPatient}
                    disabled={
                      isImporting ||
                      !hospitalId ||
                      importValidation.errors.length > 0
                    }
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isImporting ? 'Importing...' : 'Import Patient Data'}
                  </Button>
                </div>
              </div>
              {importFeedback && (
                <div className={`mt-3 rounded-md border p-3 ${importFeedbackStyles}`}>
                  <p className="text-sm font-semibold">{importFeedback.title}</p>
                  <div className="mt-1 space-y-1">
                    {importFeedback.details.map((detail, idx) => (
                      <p key={`${detail}-${idx}`} className="text-xs">
                        {detail}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insurance Claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">89</div>
                <div className="text-sm text-muted-foreground">Approved Claims</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">12</div>
                <div className="text-sm text-muted-foreground">Pending Claims</div>
              </div>
            </div>

            <div className="space-y-2">
              <Button className="w-full" size="sm">
                Verify Eligibility
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                Submit New Claim
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                Check Claim Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Integration Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'FHIR Patient Export', time: '2 minutes ago', status: 'success' },
              { action: 'Insurance Claim Submitted', time: '15 minutes ago', status: 'success' },
              { action: 'Lab Result Import', time: '1 hour ago', status: 'failed' },
              { action: 'Pharmacy Sync', time: '2 hours ago', status: 'success' },
            ].map((activity) => (
              <div key={`${activity.action}-${activity.time}`} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(activity.status === 'success' ? 'connected' : 'error')}
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(activity.status === 'success' ? 'connected' : 'error')}>
                  {activity.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
