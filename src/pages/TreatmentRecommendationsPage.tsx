import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill, Brain, Shield, BookOpen, TrendingUp, AlertTriangle, Target, Activity } from 'lucide-react';
import TreatmentRecommendationsEngine from '@/components/ai/TreatmentRecommendationsEngine';

export default function TreatmentRecommendationsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
          <Pill className="h-10 w-10 text-blue-600" />
          Treatment Recommendations Engine
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          AI-powered evidence-based treatment planning with clinical guidelines,
          drug interactions, and personalized care recommendations.
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Evidence-Based
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Recommendations grounded in clinical guidelines and medical literature.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Personalized Care
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tailored treatment plans based on patient-specific factors and comorbidities.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Drug Safety
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Comprehensive drug interaction checking and contraindication analysis.
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
              All AI-generated treatment recommendations should be reviewed and validated
              by qualified healthcare professionals.
            </p>
            <p>
              The system considers patient allergies, current medications, comorbidities,
              and evidence-based guidelines to provide comprehensive treatment planning.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Treatment Recommendations Engine */}
      <Suspense fallback={
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-600" />
              <p className="text-muted-foreground">Loading Treatment Recommendations Engine...</p>
            </div>
          </CardContent>
        </Card>
      }>
        <TreatmentRecommendationsEngine />
      </Suspense>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>How the treatment recommendations engine works</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">AI Processing Pipeline</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Patient Profiling:</strong> Comprehensive patient data analysis</li>
                <li>• <strong>Evidence Synthesis:</strong> Integration of clinical guidelines</li>
                <li>• <strong>Risk Assessment:</strong> Drug interactions and contraindications</li>
                <li>• <strong>Personalization:</strong> Individualized treatment recommendations</li>
                <li>• <strong>Validation:</strong> Cross-referencing with medical literature</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Clinical Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Treatment Categories:</strong> Pharmacological, non-pharmacological, lifestyle, monitoring</li>
                <li>• <strong>Priority Levels:</strong> High, medium, low priority recommendations</li>
                <li>• <strong>Evidence Grading:</strong> Level A-D evidence classification</li>
                <li>• <strong>Safety Checks:</strong> Allergy screening and drug interaction analysis</li>
                <li>• <strong>Monitoring Plans:</strong> Follow-up schedules and outcome measures</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Supported Treatment Types</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Acute Care</Badge>
              <Badge variant="outline">Chronic Disease Management</Badge>
              <Badge variant="outline">Preventive Care</Badge>
              <Badge variant="outline">Palliative Care</Badge>
              <Badge variant="outline">Rehabilitation</Badge>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">AI Providers</h4>
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