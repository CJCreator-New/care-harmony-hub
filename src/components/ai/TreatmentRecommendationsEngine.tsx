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
  Pill,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen,
  Target,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { useToast } from '@/hooks/use-toast';

interface TreatmentRecommendation {
  id: string;
  condition: string;
  treatment: string;
  category: 'pharmacological' | 'non-pharmacological' | 'lifestyle' | 'monitoring';
  priority: 'high' | 'medium' | 'low';
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  confidence: number;
  rationale: string;
  references: string[];
  contraindications: string[];
  monitoring: string[];
  duration: string;
  followUp: string;
}

interface PatientData {
  age: number;
  gender: string;
  weight: number;
  allergies: string[];
  comorbidities: string[];
  medications: string[];
  vitals: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    oxygenSaturation: number;
  };
  labResults: Record<string, any>;
}

export default function TreatmentRecommendationsEngine() {
  const { generateTreatmentRecommendations, isLoading } = useAI({ purpose: 'treatment' });
  const { toast } = useToast();

  const [patientData, setPatientData] = useState<PatientData>({
    age: 0,
    gender: '',
    weight: 0,
    allergies: [],
    comorbidities: [],
    medications: [],
    vitals: {
      bloodPressure: '',
      heartRate: 0,
      temperature: 0,
      oxygenSaturation: 0
    },
    labResults: {}
  });

  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<TreatmentRecommendation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const handleGenerateRecommendations = async () => {
    if (!diagnoses.length) {
      toast({
        title: "Missing Information",
        description: "Please enter at least one diagnosis to generate treatment recommendations.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await generateTreatmentRecommendations({
        patientData,
        diagnoses,
        context: 'evidence-based treatment planning'
      });

      if (result.success && result.recommendations) {
        setRecommendations(result.recommendations);
        toast({
          title: "Recommendations Generated",
          description: `Generated ${result.recommendations.length} treatment recommendations.`,
        });
      } else {
        throw new Error(result.error || 'Failed to generate recommendations');
      }
    } catch (error) {
      console.error('Treatment recommendation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate treatment recommendations. Please try again.",
        variant: "destructive"
      });
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    const categoryMatch = selectedCategory === 'all' || rec.category === selectedCategory;
    const priorityMatch = selectedPriority === 'all' || rec.priority === selectedPriority;
    return categoryMatch && priorityMatch;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getEvidenceColor = (level: string) => {
    switch (level) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pharmacological': return <Pill className="h-4 w-4" />;
      case 'non-pharmacological': return <Activity className="h-4 w-4" />;
      case 'lifestyle': return <Target className="h-4 w-4" />;
      case 'monitoring': return <TrendingUp className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-6 w-6 text-blue-600" />
            Evidence-Based Treatment Recommendations
          </CardTitle>
          <CardDescription>
            AI-powered treatment planning with clinical guidelines and evidence-based recommendations
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Patient Information & Diagnoses</CardTitle>
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
              <label className="text-sm font-medium">Weight (kg)</label>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={patientData.weight || ''}
                onChange={(e) => setPatientData(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                placeholder="Enter weight"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Blood Pressure</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={patientData.vitals.bloodPressure}
                onChange={(e) => setPatientData(prev => ({
                  ...prev,
                  vitals: { ...prev.vitals, bloodPressure: e.target.value }
                }))}
                placeholder="120/80"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Diagnoses (one per line)</label>
            <Textarea
              className="mt-1"
              rows={4}
              value={diagnoses.join('\n')}
              onChange={(e) => setDiagnoses(e.target.value.split('\n').filter(d => d.trim()))}
              placeholder="Enter diagnosed conditions..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Current Medications</label>
              <Textarea
                className="mt-1"
                rows={3}
                value={patientData.medications.join('\n')}
                onChange={(e) => setPatientData(prev => ({
                  ...prev,
                  medications: e.target.value.split('\n').filter(m => m.trim())
                }))}
                placeholder="List current medications..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Allergies</label>
              <Textarea
                className="mt-1"
                rows={3}
                value={patientData.allergies.join('\n')}
                onChange={(e) => setPatientData(prev => ({
                  ...prev,
                  allergies: e.target.value.split('\n').filter(a => a.trim())
                }))}
                placeholder="List allergies..."
              />
            </div>
          </div>

          <Button
            onClick={handleGenerateRecommendations}
            disabled={isLoading || !diagnoses.length}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Generating Recommendations...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate Treatment Recommendations
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Treatment Recommendations</CardTitle>
                <CardDescription>
                  {filteredRecommendations.length} recommendations generated
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="pharmacological">Pharmacological</SelectItem>
                    <SelectItem value="non-pharmacological">Non-Pharmacological</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="summary">Summary View</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                {filteredRecommendations.map((rec, idx) => (
                  <Card key={`rec-${idx}`} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(rec.category)}
                          <div>
                            <CardTitle className="text-base">{rec.treatment}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Badge variant={getPriorityColor(rec.priority)}>
                                {rec.priority.toUpperCase()} PRIORITY
                              </Badge>
                              <Badge variant="outline" className={getEvidenceColor(rec.evidenceLevel)}>
                                Level {rec.evidenceLevel} Evidence
                              </Badge>
                              <span className="text-sm">Confidence: {rec.confidence}%</span>
                            </CardDescription>
                          </div>
                        </div>
                        <Progress value={rec.confidence} className="w-20" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm mb-1">Rationale</h4>
                        <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration & Follow-up
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            <strong>Duration:</strong> {rec.duration}<br />
                            <strong>Follow-up:</strong> {rec.followUp}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Monitoring
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {rec.monitoring.map((item, idx) => (
                              <li key={`monitor-${idx}`}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {rec.contraindications.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Contraindications</AlertTitle>
                          <AlertDescription>
                            <ul className="space-y-1">
                              {rec.contraindications.map((item, idx) => (
                                <li key={`contra-${idx}`}>• {item}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {rec.references.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-1 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            References
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {rec.references.map((ref, idx) => (
                              <li key={`ref-${idx}`}>• {ref}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">
                        {filteredRecommendations.filter(r => r.priority === 'high').length}
                      </div>
                      <p className="text-xs text-muted-foreground">High Priority</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">
                        {filteredRecommendations.filter(r => r.category === 'pharmacological').length}
                      </div>
                      <p className="text-xs text-muted-foreground">Pharmacological</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        {filteredRecommendations.filter(r => r.evidenceLevel === 'A').length}
                      </div>
                      <p className="text-xs text-muted-foreground">Level A Evidence</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(filteredRecommendations.reduce((acc, r) => acc + r.confidence, 0) / filteredRecommendations.length)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Avg Confidence</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Treatment Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {['pharmacological', 'non-pharmacological', 'lifestyle', 'monitoring'].map(category => {
                        const count = filteredRecommendations.filter(r => r.category === category).length;
                        const percentage = Math.round((count / filteredRecommendations.length) * 100);
                        return (
                          <div key={category} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(category)}
                              <span className="capitalize">{category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={percentage} className="w-20" />
                              <span className="text-sm text-muted-foreground w-12">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Clinical Decision Support Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Clinical Decision Support Tool</AlertTitle>
        <AlertDescription>
          These recommendations are generated using AI and should be reviewed and validated by qualified healthcare professionals.
          Individual patient factors, clinical judgment, and the latest medical evidence should always take precedence.
        </AlertDescription>
      </Alert>
    </div>
  );
}