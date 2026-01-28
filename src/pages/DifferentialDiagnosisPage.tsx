import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Brain, Shield, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react';
import DifferentialDiagnosisEngine from '@/components/ai/DifferentialDiagnosisEngine';

export default function DifferentialDiagnosisPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
          <Stethoscope className="h-10 w-10 text-blue-600" />
          Advanced Differential Diagnosis
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          AI-powered clinical decision support with evidence-based differential diagnosis,
          confidence scoring, and medical literature integration.
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              AI-Powered Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Advanced machine learning models analyze patient data for comprehensive differential diagnosis.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Confidence Scoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Each diagnosis includes confidence levels and uncertainty quantification.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Evidence-Based
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Recommendations grounded in medical literature and clinical guidelines.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              HIPAA Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All patient data is encrypted and processed with full HIPAA compliance.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clinical Validation Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Clinical Decision Support Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-blue-700">
            <p>
              <strong>This tool is designed to assist, not replace, clinical judgment.</strong>
              All AI-generated diagnoses and recommendations should be reviewed and validated
              by qualified healthcare professionals.
            </p>
            <p>
              The system provides evidence-based suggestions but cannot account for all
              individual patient factors or the latest clinical research.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Differential Diagnosis Engine */}
      <Suspense fallback={
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-600" />
              <p className="text-muted-foreground">Loading Differential Diagnosis Engine...</p>
            </div>
          </CardContent>
        </Card>
      }>
        <DifferentialDiagnosisEngine />
      </Suspense>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>How the differential diagnosis engine works</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">AI Processing Pipeline</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Data Sanitization:</strong> PHI removal and anonymization</li>
                <li>• <strong>Clinical Context:</strong> Structured patient data formatting</li>
                <li>• <strong>AI Analysis:</strong> Multi-model diagnosis generation</li>
                <li>• <strong>Confidence Scoring:</strong> Uncertainty quantification</li>
                <li>• <strong>Evidence Integration:</strong> Medical literature correlation</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Clinical Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Differential Diagnosis:</strong> Top 5 conditions with likelihood</li>
                <li>• <strong>Clinical Reasoning:</strong> Evidence-based explanations</li>
                <li>• <strong>Urgency Assessment:</strong> Routine, urgent, emergent classification</li>
                <li>• <strong>Management Plan:</strong> Diagnostic and treatment recommendations</li>
                <li>• <strong>Literature References:</strong> Supporting medical evidence</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Supported AI Providers</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">OpenAI GPT-4 Turbo</Badge>
              <Badge variant="outline">Anthropic Claude 3</Badge>
              <Badge variant="outline">Google Vertex AI (Future)</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}