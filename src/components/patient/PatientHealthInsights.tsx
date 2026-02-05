import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Brain, 
  Activity, 
  ArrowUpRight, 
  Droplets, 
  Zap, 
  Heart,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Info
} from 'lucide-react';

export function PatientHealthInsights() {
  // Mock AI generated insights
  const insights = [
    {
      type: 'vital',
      title: 'Blood Pressure Trend',
      description: 'Your blood pressure has shown a consistent 5% decrease over the last 3 months. This is a positive sign reflecting your medication adherence and lifestyle changes.',
      severity: 'success',
      icon: Heart,
      metric: '128/82 mmHg',
      trend: 'down'
    },
    {
      type: 'lab',
      title: 'Vitamin D Levels',
      description: 'Your recent blood work shows slightly low Vitamin D (22 ng/mL). We recommend daily supplement of 2000 IU and 15 mins of sun exposure.',
      severity: 'warning',
      icon: Droplets,
      metric: '22 ng/mL',
      trend: 'low'
    },
    {
      type: 'wellness',
      title: 'Sleep Quality',
      description: 'Based on your reported data, increasing your deep sleep by 20 mins could improve your morning focus levels by up to 15%.',
      severity: 'info',
      icon: Activity,
      metric: '6h 45m',
      trend: 'stable'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Health Insights Hub</h2>
          <p className="text-muted-foreground">AI-powered analysis of your medical data and wellness trends</p>
        </div>
        <Badge variant="outline" className="gap-1.5 py-1 px-3 border-primary/50 bg-primary/5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI Analysis Active
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {insights.map((insight) => (
          <Card key={insight.title} className={`border-l-4 ${
            insight.severity === 'success' ? 'border-l-green-500' : 
            insight.severity === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${
                  insight.severity === 'success' ? 'bg-green-100 text-green-700' : 
                  insight.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <insight.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="capitalize">{insight.type}</Badge>
              </div>
              <CardTitle className="text-lg">{insight.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {insight.description}
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-muted">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium uppercase">Current Value</p>
                  <p className="text-lg font-bold">{insight.metric}</p>
                </div>
                {insight.trend === 'down' && <TrendingDown className="h-5 w-5 text-green-500" />}
                {insight.trend === 'up' && <TrendingUp className="h-5 w-5 text-red-500" />}
                {insight.trend === 'low' && <AlertCircle className="h-5 w-5 text-amber-500" />}
              </div>
              <Button variant="ghost" size="sm" className="w-full gap-2">
                View Full Analysis
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Condition Predictions
            </CardTitle>
            <CardDescription>Based on your family history and current vitals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cardiovascular Health</span>
                <span className="font-medium">Excellent (88/100)</span>
              </div>
              <Progress value={88} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Metabolic Stability</span>
                <span className="font-medium">Good (72/100)</span>
              </div>
              <Progress value={72} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Bone Density Risk</span>
                <span className="font-medium">Moderate (45/100)</span>
              </div>
              <Progress value={45} className="h-2 bg-amber-100" />
            </div>
            <div className="pt-4 p-3 rounded-lg bg-primary/5 flex gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground italic">
                These predictions are for informational purposes only and do not constitute a medical diagnosis. Please consult with your physician.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Smart Care Recommendations
            </CardTitle>
            <CardDescription>Actions you can take today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-4 hover:bg-primary/10 transition-colors cursor-pointer">
              <div className="p-2 rounded-full bg-primary/20">
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Schedule Dental Cleaning</p>
                <p className="text-xs text-muted-foreground">It has been 7 months since your last visit. Optimal frequency is every 6 months.</p>
              </div>
            </div>
            <div className="p-4 rounded-lg border flex items-start gap-4 hover:bg-muted transition-colors cursor-pointer">
              <div className="p-2 rounded-full bg-blue-100">
                <Droplets className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Hydration Goal</p>
                <p className="text-xs text-muted-foreground">Increase daily water intake to 2.5L to improve kidney function metrics.</p>
              </div>
            </div>
            <div className="p-4 rounded-lg border flex items-start gap-4 hover:bg-muted transition-colors cursor-pointer">
              <div className="p-2 rounded-full bg-amber-100">
                <Activity className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Meditation Focus</p>
                <p className="text-xs text-muted-foreground">Try 5 minutes of mindful breathing to lower resting heart rate.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
