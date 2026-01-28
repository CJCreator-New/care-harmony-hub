import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Brain, Lock, Eye, AlertTriangle } from 'lucide-react';
import AIDemoComponent from '@/components/ai/AIDemoComponent';

export default function AIDemoPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
          <Brain className="h-10 w-10 text-blue-600" />
          AI Clinical Assistant Demo
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Experience HIPAA-compliant AI assistance for clinical decision support.
          All patient data is automatically encrypted, sanitized, and audited.
        </p>
      </div>

      {/* Security Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              HIPAA Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All data is encrypted and PHI is automatically sanitized before AI processing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              End-to-End Encryption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Patient data is encrypted using AES-GCM with unique keys per session.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              Full Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Every AI operation is logged with compliance status and data retention policies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Real-time Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Continuous compliance monitoring with automatic alerts for policy violations.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Demo Warning */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Demo Environment Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-orange-700">
            <p>
              <strong>This is a demonstration environment.</strong> The AI responses shown are
              simulated for educational purposes and should not be used for actual clinical decisions.
            </p>
            <p>
              In production, this system would integrate with real AI providers (OpenAI, Anthropic, etc.)
              while maintaining full HIPAA compliance through our security framework.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Demo Component */}
      <Suspense fallback={
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-600" />
              <p className="text-muted-foreground">Loading AI Demo...</p>
            </div>
          </CardContent>
        </Card>
      }>
        <AIDemoComponent />
      </Suspense>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>
            How our HIPAA-compliant AI system works
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Security Layers</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Data Sanitization:</strong> PHI automatically removed or masked</li>
                <li>• <strong>Encryption:</strong> AES-GCM encryption with unique session keys</li>
                <li>• <strong>Integrity:</strong> HMAC signatures for data integrity</li>
                <li>• <strong>Audit Logging:</strong> Complete operation history with compliance status</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">AI Operations</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Differential Diagnosis:</strong> AI-assisted diagnosis suggestions</li>
                <li>• <strong>Treatment Planning:</strong> Evidence-based treatment recommendations</li>
                <li>• <strong>Medication Review:</strong> Drug interaction and safety analysis</li>
                <li>• <strong>Clinical Summaries:</strong> Automated documentation assistance</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Compliance Features</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">HIPAA Compliant</Badge>
              <Badge variant="outline">PHI Sanitization</Badge>
              <Badge variant="outline">Audit Trails</Badge>
              <Badge variant="outline">Data Retention Policies</Badge>
              <Badge variant="outline">Real-time Monitoring</Badge>
              <Badge variant="outline">Role-based Access</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}