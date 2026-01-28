import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  TrendingUp,
  BarChart3,
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
  Shield,
  Calculator
} from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { useToast } from '@/hooks/use-toast';

interface OptimizationResult {
  id: string;
  originalPlan: any;
  optimizedPlan: any;
  improvements: {
    efficacy: number;
    safety: number;
    cost: number;
    adherence: number;
    overall: number;
  };
  rationale: string;
  predictedOutcomes: {
    successRate: number;
    complicationRate: number;
    hospitalStay: number;
    costSavings: number;
    qualityOfLife: number;
  };
  alternatives: any[];
  confidence: number;
}

interface PatientData {
  age: number;
  gender: string;
  weight: number;
  comorbidities: string[];
  allergies: string[];
  currentMedications: string[];
  vitals: {
    bloodPressure: string;
    heartRate: number;
    oxygenSaturation: number;
  };
  labResults: Record<string, any>;
  socioeconomicFactors: {
    insurance: string;
    income: string;
    transportation: string;
    support: string;
  };
}

export default function TreatmentPlanOptimizationEngine() {
  const { optimizeTreatmentPlan, isLoading } = useAI();
  const { toast } = useToast();

  const [patientData, setPatientData] = useState<PatientData>({
    age: 0,
    gender: '',
    weight: 0,
    comorbidities: [],
    allergies: [],
    currentMedications: [],
    vitals: {
      bloodPressure: '',
      heartRate: 0,
      oxygenSaturation: 0,
    },
    labResults: {},
    socioeconomicFactors: {
      insurance: '',
      income: '',
      transportation: '',
      support: ''
    }
  });

  const [currentTreatmentPlan, setCurrentTreatmentPlan] = useState<string>('');
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);
  const [selectedOptimization, setSelectedOptimization] = useState<OptimizationResult | null>(null);
  const [optimizationCriteria, setOptimizationCriteria] = useState({
    prioritizeEfficacy: true,
    prioritizeSafety: true,
    prioritizeCost: false,
    prioritizeAdherence: true,
    considerSocioeconomic: true
  });

  const handleOptimizePlan = async () => {
    if (!currentTreatmentPlan.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter the current treatment plan to optimize.",
        variant: "destructive"
      });
      return;
    }

    if (!diagnoses.length) {
      toast({
        title: "Missing Information",
        description: "Please enter at least one diagnosis.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await optimizeTreatmentPlan({
        patientData,
        currentPlan: currentTreatmentPlan,
        diagnoses,
        criteria: optimizationCriteria,
        context: 'treatment plan optimization with outcome prediction'
      });

      if (result.success && result.optimizations) {
        setOptimizationResults(result.optimizations);
        if (result.optimizations.length > 0) {
          setSelectedOptimization(result.optimizations[0]);
        }
        toast({
          title: "Optimization Complete",
          description: `Generated ${result.optimizations.length} optimized treatment plans.`,
        });
      } else {
        throw new Error(result.error || 'Failed to optimize treatment plan');
      }
    } catch (error) {
      console.error('Treatment optimization error:', error);
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize treatment plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getImprovementColor = (value: number) => {
    if (value > 15) return 'text-green-600';
    if (value > 5) return 'text-blue-600';
    if (value > -5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImprovementIcon = (value: number) => {
    if (value > 10) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value > 0) return <BarChart3 className="h-4 w-4 text-blue-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            Treatment Plan Optimization Engine
          </CardTitle>
          <CardDescription>
            AI-powered treatment plan optimization with outcome prediction and multi-criteria decision analysis
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Patient Information & Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Age</label>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={patientData.age || ''}
                onChange={(e) => setPatientData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                placeholder="Enter age"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Gender</label>
              <Select value={patientData.gender} onValueChange={(value) => setPatientData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Insurance Type</label>
              <Select value={patientData.socioeconomicFactors.insurance} onValueChange={(value) => setPatientData(prev => ({
                ...prev,
                socioeconomicFactors: { ...prev.socioeconomicFactors, insurance: value }
              }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select insurance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="medicare">Medicare</SelectItem>
                  <SelectItem value="medicaid">Medicaid</SelectItem>
                  <SelectItem value="uninsured">Uninsured</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Support System</label>
              <Select value={patientData.socioeconomicFactors.support} onValueChange={(value) => setPatientData(prev => ({
                ...prev,
                socioeconomicFactors: { ...prev.socioeconomicFactors, support: value }
              }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select support" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Diagnoses (one per line)</label>
            <Textarea
              className="mt-1"
              rows={3}
              value={diagnoses.join('\n')}
              onChange={(e) => setDiagnoses(e.target.value.split('\n').filter(d => d.trim()))}
              placeholder="Enter diagnosed conditions..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Current Treatment Plan</label>
            <Textarea
              className="mt-1"
              rows={6}
              value={currentTreatmentPlan}
              onChange={(e) => setCurrentTreatmentPlan(e.target.value)}
              placeholder="Enter the current treatment plan including medications, therapies, and follow-up..."
            />
          </div>

          {/* Optimization Criteria */}
          <div>
            <h4 className="text-sm font-medium mb-3">Optimization Criteria</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={optimizationCriteria.prioritizeEfficacy}
                  onChange={(e) => setOptimizationCriteria(prev => ({ ...prev, prioritizeEfficacy: e.target.checked }))}
                />
                <span className="text-sm">Prioritize Efficacy</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={optimizationCriteria.prioritizeSafety}
                  onChange={(e) => setOptimizationCriteria(prev => ({ ...prev, prioritizeSafety: e.target.checked }))}
                />
                <span className="text-sm">Prioritize Safety</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={optimizationCriteria.prioritizeCost}
                  onChange={(e) => setOptimizationCriteria(prev => ({ ...prev, prioritizeCost: e.target.checked }))}
                />
                <span className="text-sm">Prioritize Cost</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={optimizationCriteria.prioritizeAdherence}
                  onChange={(e) => setOptimizationCriteria(prev => ({ ...prev, prioritizeAdherence: e.target.checked }))}
                />
                <span className="text-sm">Prioritize Adherence</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={optimizationCriteria.considerSocioeconomic}
                  onChange={(e) => setOptimizationCriteria(prev => ({ ...prev, considerSocioeconomic: e.target.checked }))}
                />
                <span className="text-sm">Consider Socioeconomic Factors</span>
              </label>
            </div>
          </div>

          <Button
            onClick={handleOptimizePlan}
            disabled={isLoading || !currentTreatmentPlan.trim() || !diagnoses.length}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Calculator className="h-4 w-4 mr-2 animate-spin" />
                Optimizing Treatment Plan...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Optimize Treatment Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {optimizationResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Optimization Results</CardTitle>
                <CardDescription>
                  {optimizationResults.length} optimized treatment plans generated
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={selectedOptimization?.id || ''} onValueChange={(value) => {
                  const opt = optimizationResults.find(o => o.id === value);
                  setSelectedOptimization(opt || null);
                }}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select optimization plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {optimizationResults.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        Plan {opt.id} - {formatPercentage(opt.improvements.overall)} improvement
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedOptimization && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="improvements">Improvements</TabsTrigger>
                  <TabsTrigger value="outcomes">Predicted Outcomes</TabsTrigger>
                  <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Original Plan</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {JSON.stringify(selectedOptimization.originalPlan, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Optimized Plan</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm whitespace-pre-wrap">
                          {JSON.stringify(selectedOptimization.optimizedPlan, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Optimization Rationale</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{selectedOptimization.rationale}</p>
                      <div className="mt-3">
                        <Badge variant="outline" className="text-xs">
                          Confidence: {selectedOptimization.confidence}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="improvements" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          {getImprovementIcon(selectedOptimization.improvements.efficacy)}
                          <div>
                            <div className={`text-2xl font-bold ${getImprovementColor(selectedOptimization.improvements.efficacy)}`}>
                              {formatPercentage(selectedOptimization.improvements.efficacy)}
                            </div>
                            <p className="text-xs text-muted-foreground">Efficacy</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          {getImprovementIcon(selectedOptimization.improvements.safety)}
                          <div>
                            <div className={`text-2xl font-bold ${getImprovementColor(selectedOptimization.improvements.safety)}`}>
                              {formatPercentage(selectedOptimization.improvements.safety)}
                            </div>
                            <p className="text-xs text-muted-foreground">Safety</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          {getImprovementIcon(selectedOptimization.improvements.cost)}
                          <div>
                            <div className={`text-2xl font-bold ${getImprovementColor(selectedOptimization.improvements.cost)}`}>
                              {formatPercentage(selectedOptimization.improvements.cost)}
                            </div>
                            <p className="text-xs text-muted-foreground">Cost Reduction</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          {getImprovementIcon(selectedOptimization.improvements.adherence)}
                          <div>
                            <div className={`text-2xl font-bold ${getImprovementColor(selectedOptimization.improvements.adherence)}`}>
                              {formatPercentage(selectedOptimization.improvements.adherence)}
                            </div>
                            <p className="text-xs text-muted-foreground">Adherence</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Overall Improvement: {formatPercentage(selectedOptimization.improvements.overall)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress value={Math.max(0, selectedOptimization.improvements.overall + 50)} className="w-full" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Overall treatment plan effectiveness improvement compared to original plan
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="outcomes" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedOptimization.predictedOutcomes.successRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Predicted Success Rate</p>
                        <Progress value={selectedOptimization.predictedOutcomes.successRate} className="mt-2" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">
                          {selectedOptimization.predictedOutcomes.complicationRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Predicted Complication Rate</p>
                        <Progress value={selectedOptimization.predictedOutcomes.complicationRate} className="mt-2" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedOptimization.predictedOutcomes.hospitalStay.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground">Predicted Hospital Stay (days)</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(selectedOptimization.predictedOutcomes.costSavings)}
                        </div>
                        <p className="text-xs text-muted-foreground">Predicted Cost Savings</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-purple-600">
                          {selectedOptimization.predictedOutcomes.qualityOfLife.toFixed(1)}/10
                        </div>
                        <p className="text-xs text-muted-foreground">Predicted Quality of Life</p>
                        <Progress value={selectedOptimization.predictedOutcomes.qualityOfLife * 10} className="mt-2" />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="alternatives" className="space-y-4">
                  {selectedOptimization.alternatives.map((alt, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-base">Alternative Plan {idx + 1}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {JSON.stringify(alt, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clinical Decision Support Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Advanced Clinical Decision Support</AlertTitle>
        <AlertDescription>
          Treatment plan optimization uses predictive analytics and multi-criteria decision analysis.
          All recommendations should be reviewed by qualified healthcare professionals and validated
          against current clinical evidence and patient-specific factors.
        </AlertDescription>
      </Alert>
    </div>
  );
}