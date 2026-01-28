import { Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  TrendingUp,
  Brain,
  Shield,
  Target,
  Activity,
  Users,
  AlertTriangle,
  Calculator,
  Clock
} from 'lucide-react';

const PredictiveAnalyticsEngine = lazy(() => import('@/components/ai/PredictiveAnalyticsEngine'));

export default function PredictiveAnalyticsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          Predictive Analytics Engine
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Advanced machine learning-powered patient outcome prediction and clinical risk assessment
          for proactive healthcare delivery and improved patient care.
        </p>
      </div>

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Predictive Analytics Capabilities
          </CardTitle>
          <CardDescription>
            Comprehensive ML-driven clinical prediction models for patient outcomes and risk assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-1" />
              <div>
                <h4 className="font-medium">Readmission Risk Prediction</h4>
                <p className="text-sm text-muted-foreground">
                  30-day hospital readmission risk assessment using advanced ML algorithms
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium">Length of Stay Forecasting</h4>
                <p className="text-sm text-muted-foreground">
                  Predicted hospital stay duration based on patient characteristics and clinical data
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium">Clinical Outcome Prediction</h4>
                <p className="text-sm text-muted-foreground">
                  Multi-outcome prediction including complications, recovery time, and quality of life
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium">Patient Stratification</h4>
                <p className="text-sm text-muted-foreground">
                  Risk stratification and patient grouping for targeted interventions
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-orange-600 mt-1" />
              <div>
                <h4 className="font-medium">Real-time Risk Monitoring</h4>
                <p className="text-sm text-muted-foreground">
                  Continuous risk assessment with automated alerts for high-risk patients
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calculator className="h-5 w-5 text-indigo-600 mt-1" />
              <div>
                <h4 className="font-medium">Intervention Impact Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Quantified impact assessment of preventive interventions on patient outcomes
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
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            Machine Learning Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Readmission Risk Model</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Gradient Boosting Machines (XGBoost/LightGBM)</li>
                <li>• Random Forest Classification</li>
                <li>• Neural Network Models</li>
                <li>• Ensemble Learning Techniques</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Model Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Patient demographics and clinical history</li>
                <li>• Vital signs and laboratory results</li>
                <li>• Medication history and comorbidities</li>
                <li>• Socioeconomic and support factors</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Performance Metrics</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• AUC Score: Target &gt;0.85</li>
                <li>• Accuracy: &gt;80% on validation</li>
                <li>• Precision/Recall: Balanced metrics</li>
                <li>• Clinical utility validation</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Data Processing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Feature engineering and selection</li>
                <li>• Missing data imputation</li>
                <li>• Categorical variable encoding</li>
                <li>• Feature scaling and normalization</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Analytics Engine */}
      <Suspense fallback={
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Calculator className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-muted-foreground">Loading Predictive Analytics Engine...</p>
            </div>
          </CardContent>
        </Card>
      }>
        <PredictiveAnalyticsEngine />
      </Suspense>

      {/* Clinical Validation Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Clinical Decision Support Notice</h4>
              <p className="text-sm text-amber-700 mt-1">
                Predictive analytics models provide evidence-based risk assessments and should be used
                as decision support tools. All predictions must be validated by qualified healthcare
                professionals and considered alongside comprehensive clinical evaluation.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  ML-Powered
                </Badge>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  Evidence-Based
                </Badge>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  Clinical Validation Required
                </Badge>
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  Continuous Monitoring
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}