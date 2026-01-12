import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueuePrediction } from '@/hooks/useQueuePrediction';
import { TrendingUp, Clock, AlertTriangle, Users, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PredictiveAnalyticsDashboard = () => {
  const { predictions, optimizeQueue, isOptimizing, predictNoShow, isPredictingNoShow } = useQueuePrediction();
  const [selectedAppointment, setSelectedAppointment] = useState('');
  const [noShowResult, setNoShowResult] = useState<any>(null);

  const handleNoShowPrediction = async () => {
    if (!selectedAppointment) return;
    
    try {
      const result = await predictNoShow(selectedAppointment);
      setNoShowResult(result);
    } catch (error) {
      console.error('No-show prediction failed:', error);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      case 'very_high': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Predictive Analytics Dashboard
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue Predictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Queue Wait Time Predictions
              </span>
              <Button 
                onClick={() => optimizeQueue()}
                disabled={isOptimizing}
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isOptimizing ? 'Optimizing...' : 'Optimize Queue'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {predictions.map((prediction, index) => (
                <div key={prediction.patient_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">Patient {prediction.patient_id.slice(0, 8)}...</p>
                      <p className="text-sm text-gray-600">
                        Position: {prediction.prediction_factors.queue_position}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {prediction.estimated_wait_time} min
                      </p>
                      <p className={`text-sm ${getConfidenceColor(prediction.confidence_score)}`}>
                        {Math.round(prediction.confidence_score * 100)}% confidence
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Avg consultation: {Math.round(prediction.prediction_factors.avg_consultation_time)} min
                  </div>
                </div>
              ))}
              {predictions.length === 0 && (
                <p className="text-gray-500 text-center py-8">No queue predictions available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* No-Show Prediction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              No-Show Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Appointment ID</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={selectedAppointment}
                  onChange={(e) => setSelectedAppointment(e.target.value)}
                  placeholder="Enter appointment ID"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <Button 
                  onClick={handleNoShowPrediction}
                  disabled={isPredictingNoShow || !selectedAppointment}
                  size="sm"
                >
                  {isPredictingNoShow ? 'Analyzing...' : 'Predict'}
                </Button>
              </div>
            </div>

            {noShowResult && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Risk Assessment</h4>
                  <Badge variant={getRiskColor(noShowResult.risk_level)}>
                    {noShowResult.risk_level.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">No-show probability:</span>
                    <span className="ml-2 font-medium">
                      {Math.round(noShowResult.probability * 100)}%
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Patient history:</span>
                    <span className="ml-2">
                      {noShowResult.previous_no_shows} no-shows in {noShowResult.total_appointments} appointments
                    </span>
                  </div>

                  {noShowResult.risk_factors.length > 0 && (
                    <div>
                      <span className="text-gray-600">Risk factors:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {noShowResult.risk_factors.map((factor: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Predictive Analytics Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {predictions.length}
              </div>
              <div className="text-sm text-gray-600">Active Predictions</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {predictions.length > 0 
                  ? Math.round(predictions.reduce((sum, p) => sum + p.confidence_score, 0) / predictions.length * 100)
                  : 0}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {predictions.length > 0 
                  ? Math.round(predictions.reduce((sum, p) => sum + p.estimated_wait_time, 0) / predictions.length)
                  : 0} min
              </div>
              <div className="text-sm text-gray-600">Avg Wait Time</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveAnalyticsDashboard;