import { Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  TrendingUp,
  BarChart3,
  Zap,
  Shield,
  Calculator,
  Brain,
  Activity,
  Clock,
  DollarSign
} from 'lucide-react';

const TreatmentPlanOptimizationEngine = lazy(() => import('@/components/ai/TreatmentPlanOptimizationEngine'));

export default function TreatmentPlanOptimizationPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <Target className="h-8 w-8 text-blue-600" />
          Treatment Plan Optimization
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Advanced AI-powered treatment plan optimization with predictive analytics,
          outcome modeling, and multi-criteria decision analysis for enhanced clinical outcomes.
        </p>
      </div>

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Advanced Optimization Features
          </CardTitle>
          <CardDescription>
            Comprehensive treatment plan optimization with evidence-based algorithms and predictive modeling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Calculator className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium">Multi-Criteria Optimization</h4>
                <p className="text-sm text-muted-foreground">
                  Balances efficacy, safety, cost, and adherence based on patient-specific factors
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium">Outcome Prediction</h4>
                <p className="text-sm text-muted-foreground">
                  Predicts treatment success rates, complications, and quality of life improvements
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium">Cost-Benefit Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Analyzes treatment costs, hospital stays, and long-term healthcare savings
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-orange-600 mt-1" />
              <div>
                <h4 className="font-medium">Patient Profiling</h4>
                <p className="text-sm text-muted-foreground">
                  Considers age, comorbidities, socioeconomic factors, and support systems
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-indigo-600 mt-1" />
              <div>
                <h4 className="font-medium">Adherence Optimization</h4>
                <p className="text-sm text-muted-foreground">
                  Optimizes medication schedules and follow-up plans for better patient compliance
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium">Resource Optimization</h4>
                <p className="text-sm text-muted-foreground">
                  Minimizes healthcare resource utilization while maximizing clinical outcomes
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Technical Specifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">AI Algorithms</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Multi-objective optimization algorithms</li>
                <li>• Machine learning outcome prediction models</li>
                <li>• Evidence-based clinical guideline integration</li>
                <li>• Patient-specific risk stratification</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Data Integration</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Real-time patient data processing</li>
                <li>• Electronic health record integration</li>
                <li>• Laboratory results analysis</li>
                <li>• Vital signs monitoring</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Optimization Criteria</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Clinical efficacy maximization</li>
                <li>• Safety and risk minimization</li>
                <li>• Cost-effectiveness analysis</li>
                <li>• Patient adherence optimization</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Output Metrics</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Predicted success rates</li>
                <li>• Complication risk assessment</li>
                <li>• Quality of life projections</li>
                <li>• Healthcare cost savings</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Engine */}
      <Suspense fallback={
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Calculator className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-muted-foreground">Loading Treatment Plan Optimization Engine...</p>
            </div>
          </CardContent>
        </Card>
      }>
        <TreatmentPlanOptimizationEngine />
      </Suspense>

      {/* Clinical Validation Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Clinical Decision Support Notice</h4>
              <p className="text-sm text-amber-700 mt-1">
                Treatment plan optimization provides evidence-based recommendations using advanced AI algorithms.
                All optimized plans must be reviewed and approved by qualified healthcare professionals.
                Clinical judgment should always take precedence over algorithmic recommendations.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  Evidence-Based
                </Badge>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  AI-Assisted
                </Badge>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  Clinical Validation Required
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}