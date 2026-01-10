import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, Target, Activity, AlertCircle } from 'lucide-react';
import { PopulationHealthSummary, PopulationCohort, PatientRiskProfile } from '@/types/analytics';

interface PopulationHealthDashboardProps {
  hospitalId: string;
}

export const PopulationHealthDashboard: React.FC<PopulationHealthDashboardProps> = ({ hospitalId }) => {
  const [summary, setSummary] = useState<PopulationHealthSummary | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mockSummary: PopulationHealthSummary = {
    hospital_id: hospitalId,
    total_population: 15420,
    active_cohorts: 8,
    high_risk_patients: 1247,
    interventions_active: 12,
    cohort_summaries: [
      {
        cohort_id: '1',
        cohort_name: 'Diabetes Management',
        total_patients: 500,
        risk_distribution: { high: 125, medium: 250, low: 125 },
        recent_outcomes: { improved: 180, stable: 250, declined: 70 }
      },
      {
        cohort_id: '2',
        cohort_name: 'Hypertension Control',
        total_patients: 300,
        risk_distribution: { high: 75, medium: 150, low: 75 },
        recent_outcomes: { improved: 120, stable: 150, declined: 30 }
      }
    ],
    intervention_effectiveness: [
      {
        intervention_id: '1',
        intervention_name: 'Diabetes Self-Management Education',
        participants: 150,
        completion_rate: 85.3,
        outcome_achievement_rate: 72.4,
        cost_per_outcome: 245.50
      }
    ]
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeColor = (type: string) => {
    switch (type) {
      case 'improved': return 'text-green-600';
      case 'stable': return 'text-blue-600';
      case 'declined': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  useEffect(() => {
    setTimeout(() => {
      setSummary(mockSummary);
      setLoading(false);
    }, 1000);
  }, [hospitalId]);

  if (loading || !summary) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Population</p>
                <p className="text-2xl font-bold">{summary.total_population.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Active Cohorts</p>
                <p className="text-2xl font-bold">{summary.active_cohorts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">High Risk Patients</p>
                <p className="text-2xl font-bold">{summary.high_risk_patients.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Active Interventions</p>
                <p className="text-2xl font-bold">{summary.interventions_active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Summaries */}
      <Card>
        <CardHeader>
          <CardTitle>Population Cohorts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {summary.cohort_summaries.map((cohort) => (
              <div key={cohort.cohort_id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{cohort.cohort_name}</h3>
                  <Badge variant="outline">{cohort.total_patients} patients</Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Risk Distribution</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{cohort.risk_distribution.high}</div>
                        <Badge className={getRiskColor('high')} variant="outline">High</Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">{cohort.risk_distribution.medium}</div>
                        <Badge className={getRiskColor('medium')} variant="outline">Medium</Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{cohort.risk_distribution.low}</div>
                        <Badge className={getRiskColor('low')} variant="outline">Low</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Recent Outcomes</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className={`text-lg font-bold ${getOutcomeColor('improved')}`}>
                          {cohort.recent_outcomes.improved}
                        </div>
                        <div className="text-xs text-gray-600">Improved</div>
                      </div>
                      <div>
                        <div className={`text-lg font-bold ${getOutcomeColor('stable')}`}>
                          {cohort.recent_outcomes.stable}
                        </div>
                        <div className="text-xs text-gray-600">Stable</div>
                      </div>
                      <div>
                        <div className={`text-lg font-bold ${getOutcomeColor('declined')}`}>
                          {cohort.recent_outcomes.declined}
                        </div>
                        <div className="text-xs text-gray-600">Declined</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full mt-4">
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Intervention Effectiveness */}
      <Card>
        <CardHeader>
          <CardTitle>Intervention Effectiveness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.intervention_effectiveness.map((intervention) => (
              <div key={intervention.intervention_id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{intervention.intervention_name}</h3>
                  <Badge variant="outline">{intervention.participants} participants</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <div className="flex items-center gap-2">
                      <Progress value={intervention.completion_rate} className="flex-1" />
                      <span className="text-sm font-medium">{intervention.completion_rate.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Outcome Achievement</p>
                    <div className="flex items-center gap-2">
                      <Progress value={intervention.outcome_achievement_rate} className="flex-1" />
                      <span className="text-sm font-medium">{intervention.outcome_achievement_rate.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Cost per Outcome</p>
                    <p className="text-lg font-bold text-green-600">${intervention.cost_per_outcome.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};