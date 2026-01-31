import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, Users } from 'lucide-react';
import { QualityDashboardData } from '@/types/analytics';

interface QualityMeasuresDashboardProps {
  hospitalId: string;
}

export const QualityMeasuresDashboard: React.FC<QualityMeasuresDashboardProps> = ({ hospitalId }) => {
  const [dashboardData, setDashboardData] = useState<QualityDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const mockData: QualityDashboardData = {
    hospital_id: hospitalId,
    reporting_period: { start_date: '2024-01-01', end_date: '2024-12-31' },
    overall_quality_score: 87.5,
    measure_performance: [
      { measure_code: 'CDC-A1C-9', measure_name: 'Diabetes HbA1c Control', current_rate: 82.3, target_rate: 80.0, trend: 'improving', patients_compliant: 247, total_patients: 300 },
      { measure_code: 'BCS-E', measure_name: 'Breast Cancer Screening', current_rate: 73.8, target_rate: 75.0, trend: 'stable', patients_compliant: 369, total_patients: 500 }
    ],
    care_gaps_summary: { total_gaps: 1247, overdue_gaps: 342, high_priority_gaps: 89, gaps_by_category: { preventive: 567, chronic_care: 423, screening: 257 } },
    top_performing_providers: [
      { provider_id: '1', provider_name: 'Dr. Sarah Johnson', overall_score: 94.2, specialty: 'Internal Medicine' }
    ],
    improvement_opportunities: [
      { area: 'Colorectal Cancer Screening', current_performance: 68.2, potential_improvement: 5.8, estimated_impact: '29 additional patients screened' }
    ]
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  useEffect(() => {
    setTimeout(() => {
      setDashboardData(mockData);
      setLoading(false);
    }, 1000);
  }, [hospitalId]);

  if (loading || !dashboardData) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Overall Quality Score</h3>
              <span className="text-3xl font-bold text-blue-600">{dashboardData.overall_quality_score}%</span>
            </div>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Award key={`star-${star}`} className={`h-6 w-6 ${star <= Math.floor(dashboardData.overall_quality_score / 20) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Quality Measure Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.measure_performance.map((measure) => (
                <div key={measure.measure_code} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{measure.measure_name}</span>
                      {getTrendIcon(measure.trend)}
                    </div>
                    <span className="font-bold text-blue-600">{measure.current_rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={(measure.current_rate / measure.target_rate) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Care Gaps Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{dashboardData.care_gaps_summary.total_gaps}</div>
                <div className="text-sm text-blue-700">Total Gaps</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{dashboardData.care_gaps_summary.overdue_gaps}</div>
                <div className="text-sm text-red-700">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};