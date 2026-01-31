import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useClinicalPredictiveAnalytics } from '@/hooks/useClinicalPredictiveAnalytics';
import { Brain, TrendingUp, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface PredictiveAnalyticsPanelProps {
  patientId: string;
}

export function PredictiveAnalyticsPanel({ patientId }: PredictiveAnalyticsPanelProps) {
  const {
    predictiveInsights,
    isLoading,
    predictOutcome,
    assessReadmissionRisk,
    predictLengthOfStay
  } = useClinicalPredictiveAnalytics(patientId);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'improvement': return 'bg-green-100 text-green-800';
      case 'stable': return 'bg-blue-100 text-blue-800';
      case 'decline': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Clinical Predictions
          </CardTitle>
          <CardDescription>Analyzing patient trajectory...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Outcome Prediction */}
      {predictiveInsights.outcomePrediction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Clinical Outcome Prediction
            </CardTitle>
            <CardDescription>
              AI analysis of patient trajectory over {predictiveInsights.outcomePrediction.timeFrame}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Badge className={getOutcomeColor(predictiveInsights.outcomePrediction.predictedOutcome)}>
                  {predictiveInsights.outcomePrediction.predictedOutcome.toUpperCase()}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Confidence: {Math.round(predictiveInsights.outcomePrediction.confidence * 100)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {Math.round(predictiveInsights.outcomePrediction.riskScore * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Risk Score</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Key Factors:</h4>
              <ul className="text-sm space-y-1">
                {predictiveInsights.outcomePrediction.factors.map((factor, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Recommendations:</h4>
              <ul className="text-sm space-y-1">
                {predictiveInsights.outcomePrediction.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Readmission Risk */}
      {predictiveInsights.readmissionRisk && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Readmission Risk Assessment
            </CardTitle>
            <CardDescription>
              30-day hospital readmission risk analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className={getRiskColor(predictiveInsights.readmissionRisk.riskLevel)}>
                {predictiveInsights.readmissionRisk.riskLevel.toUpperCase()} RISK
              </Badge>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {Math.round(predictiveInsights.readmissionRisk.riskScore * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Risk Score</p>
              </div>
            </div>

            <Progress
              value={predictiveInsights.readmissionRisk.riskScore * 100}
              className="w-full"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Predicted Timeline</p>
                <p className="text-lg">{predictiveInsights.readmissionRisk.predictedDays} days</p>
              </div>
              <div>
                <p className="text-sm font-medium">Confidence</p>
                <p className="text-lg">{Math.round(predictiveInsights.readmissionRisk.confidence * 100)}%</p>
              </div>
            </div>

            {(predictiveInsights.readmissionRisk.riskLevel === 'high' ||
              predictiveInsights.readmissionRisk.riskLevel === 'critical') && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>High Readmission Risk</AlertTitle>
                <AlertDescription>
                  This patient has elevated risk of readmission. Consider enhanced discharge planning and follow-up care.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h4 className="font-medium mb-2">Risk Factors:</h4>
              <ul className="text-sm space-y-1">
                {predictiveInsights.readmissionRisk.riskFactors.map((factor, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Prevention Strategies:</h4>
              <ul className="text-sm space-y-1">
                {predictiveInsights.readmissionRisk.preventionStrategies.map((strategy, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    {strategy}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Length of Stay */}
      {predictiveInsights.lengthOfStay && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Length of Stay Prediction
            </CardTitle>
            <CardDescription>
              Expected hospital stay duration based on clinical factors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{predictiveInsights.lengthOfStay.predictedDays}</p>
                <p className="text-sm text-muted-foreground">Predicted Days</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-medium">
                  {Math.round(predictiveInsights.lengthOfStay.confidence * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Confidence</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Contributing Factors:</h4>
              <ul className="text-sm space-y-1">
                {predictiveInsights.lengthOfStay.factors.map((factor, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Optimization Recommendations:</h4>
              <ul className="text-sm space-y-1">
                {predictiveInsights.lengthOfStay.optimizationRecommendations.map((rec, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis Actions</CardTitle>
          <CardDescription>Generate real-time predictions and assessments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => predictOutcome.mutate({ patientId, timeFrame: '30 days' })}
              disabled={predictOutcome.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${predictOutcome.isPending ? 'animate-spin' : ''}`} />
              Update Outcome
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => assessReadmissionRisk.mutate({ patientId, admissionData: {} })}
              disabled={assessReadmissionRisk.isPending}
            >
              <AlertTriangle className={`h-4 w-4 mr-2 ${assessReadmissionRisk.isPending ? 'animate-spin' : ''}`} />
              Assess Readmission
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => predictLengthOfStay.mutate({ patientId, admissionData: {} })}
              disabled={predictLengthOfStay.isPending}
            >
              <Clock className={`h-4 w-4 mr-2 ${predictLengthOfStay.isPending ? 'animate-spin' : ''}`} />
              Predict LOS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}