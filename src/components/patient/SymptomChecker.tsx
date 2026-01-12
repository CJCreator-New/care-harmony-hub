import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Plus, Search, Clock, Activity, Heart, Thermometer, Weight, Droplets, Moon, Flame } from 'lucide-react';
import { useSymptomAnalysis } from '@/hooks/useSymptomAnalysis';
import { Symptom, SymptomAnalysis, PossibleCondition } from '@/hooks/useSymptomAnalysis';

const SYMPTOM_CATEGORIES = [
  { id: 'general', name: 'General', icon: Activity },
  { id: 'cardiovascular', name: 'Heart & Blood', icon: Heart },
  { id: 'respiratory', name: 'Breathing', icon: Activity },
  { id: 'neurological', name: 'Brain & Nerves', icon: Activity },
  { id: 'gastrointestinal', name: 'Digestive', icon: Activity },
  { id: 'musculoskeletal', name: 'Bones & Muscles', icon: Activity },
  { id: 'skin', name: 'Skin', icon: Activity },
  { id: 'mental', name: 'Mental Health', icon: Activity },
];

const COMMON_SYMPTOMS = {
  general: [
    'Fatigue', 'Fever', 'Chills', 'Sweating', 'Weight loss', 'Weight gain',
    'Loss of appetite', 'Nausea', 'Vomiting', 'Dizziness', 'Headache'
  ],
  cardiovascular: [
    'Chest pain', 'Palpitations', 'Shortness of breath', 'Swelling in legs',
    'High blood pressure', 'Irregular heartbeat', 'Fainting'
  ],
  respiratory: [
    'Cough', 'Sore throat', 'Runny nose', 'Congestion', 'Wheezing',
    'Difficulty breathing', 'Chest tightness'
  ],
  neurological: [
    'Headache', 'Dizziness', 'Confusion', 'Memory problems', 'Seizures',
    'Numbness', 'Tingling', 'Weakness', 'Vision changes'
  ],
  gastrointestinal: [
    'Abdominal pain', 'Diarrhea', 'Constipation', 'Heartburn', 'Nausea',
    'Vomiting', 'Blood in stool', 'Difficulty swallowing'
  ],
  musculoskeletal: [
    'Joint pain', 'Muscle pain', 'Back pain', 'Neck pain', 'Stiffness',
    'Swelling', 'Limited mobility', 'Muscle weakness'
  ],
  skin: [
    'Rash', 'Itching', 'Redness', 'Swelling', 'Bruising', 'Ulcers',
    'Hair loss', 'Nail changes'
  ],
  mental: [
    'Anxiety', 'Depression', 'Insomnia', 'Mood changes', 'Confusion',
    'Memory loss', 'Hallucinations', 'Suicidal thoughts'
  ],
};

export function SymptomChecker() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom[]>([]);
  const [currentCategory, setCurrentCategory] = useState('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [customSymptom, setCustomSymptom] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<SymptomAnalysis | null>(null);

  const {
    symptomHistory,
    isLoading,
    analyzeSymptoms,
    getSymptomsByCategoryQuery,
    getTriageRecommendation,
    checkForEmergency,
    isAnalyzing,
    lastAnalysis,
  } = useSymptomAnalysis();

  const { data: categorySymptoms } = useQuery(getSymptomsByCategoryQuery(currentCategory));

  const handleSymptomSelect = (symptomName: string) => {
    if (selectedSymptoms.find(s => s.name === symptomName)) {
      setSelectedSymptoms(prev => prev.filter(s => s.name !== symptomName));
    } else {
      const newSymptom: Symptom = {
        id: Date.now().toString(),
        name: symptomName,
        category: currentCategory,
        severity: 'moderate',
        duration: '1-3 days',
      };
      setSelectedSymptoms(prev => [...prev, newSymptom]);
    }
  };

  const handleCustomSymptomAdd = () => {
    if (customSymptom.trim()) {
      const newSymptom: Symptom = {
        id: Date.now().toString(),
        name: customSymptom.trim(),
        category: 'custom',
        severity: 'moderate',
        duration: '1-3 days',
      };
      setSelectedSymptoms(prev => [...prev, newSymptom]);
      setCustomSymptom('');
    }
  };

  const handleSymptomUpdate = (id: string, field: keyof Symptom, value: any) => {
    setSelectedSymptoms(prev =>
      prev.map(s => s.id === id ? { ...s, [field]: value } : s)
    );
  };

  const handleRemoveSymptom = (id: string) => {
    setSelectedSymptoms(prev => prev.filter(s => s.id !== id));
  };

  const handleAnalyze = () => {
    if (selectedSymptoms.length === 0) return;

    // Check for emergency symptoms
    if (checkForEmergency(selectedSymptoms)) {
      alert('EMERGENCY: Your symptoms suggest a medical emergency. Please call 911 or go to the nearest emergency room immediately!');
      return;
    }

    analyzeSymptoms(selectedSymptoms);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'severe': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredSymptoms = categorySymptoms?.filter(symptom =>
    symptom.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Symptom Checker
          </CardTitle>
          <CardDescription>
            Describe your symptoms to get AI-powered analysis and triage recommendations.
            This tool is for informational purposes only and does not replace professional medical advice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={currentCategory} onValueChange={setCurrentCategory}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              {SYMPTOM_CATEGORIES.map((category) => (
                <TabsTrigger key={category.id} value={category.id} className="text-xs">
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-6 space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search symptoms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom symptom..."
                    value={customSymptom}
                    onChange={(e) => setCustomSymptom(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomSymptomAdd()}
                  />
                  <Button onClick={handleCustomSymptomAdd} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <TabsContent value={currentCategory} className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredSymptoms.map((symptom) => (
                    <Button
                      key={symptom.id}
                      variant={selectedSymptoms.find(s => s.name === symptom.name) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSymptomSelect(symptom.name)}
                      className="text-left justify-start h-auto py-2 px-3"
                    >
                      {symptom.name}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {selectedSymptoms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Symptoms ({selectedSymptoms.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedSymptoms.map((symptom) => (
                <div key={symptom.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{symptom.name}</span>
                      <Badge className={getSeverityColor(symptom.severity)}>
                        {symptom.severity}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label>Severity</Label>
                        <Select
                          value={symptom.severity}
                          onValueChange={(value) => handleSymptomUpdate(symptom.id, 'severity', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mild">Mild</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="severe">Severe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Duration</Label>
                        <Select
                          value={symptom.duration}
                          onValueChange={(value) => handleSymptomUpdate(symptom.id, 'duration', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="1-3 days">1-3 days</SelectItem>
                            <SelectItem value="1 week">1 week</SelectItem>
                            <SelectItem value="2-4 weeks">2-4 weeks</SelectItem>
                            <SelectItem value="months">Months</SelectItem>
                            <SelectItem value="years">Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveSymptom(symptom.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <div className="flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="min-w-32"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Symptoms'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {lastAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Analysis Results
            </CardTitle>
            <CardDescription>
              AI-powered analysis based on your reported symptoms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Alert className={getUrgencyColor(lastAnalysis.urgency_level)}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {lastAnalysis.urgency_level.toUpperCase()} PRIORITY
                </AlertTitle>
                <AlertDescription>
                  {getTriageRecommendation(lastAnalysis).action}
                </AlertDescription>
              </Alert>

              <div>
                <h4 className="font-semibold mb-3">Possible Conditions</h4>
                <div className="space-y-3">
                  {lastAnalysis.possible_conditions.slice(0, 3).map((condition, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium">{condition.condition}</h5>
                        <Badge variant="outline">
                          {Math.round(condition.probability * 100)}% probability
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {condition.description}
                      </p>
                      <p className="text-sm font-medium text-blue-600">
                        Recommended: {condition.recommended_action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {lastAnalysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important Disclaimer</AlertTitle>
                <AlertDescription>
                  {lastAnalysis.disclaimer}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {symptomHistory && symptomHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis History</CardTitle>
            <CardDescription>Your previous symptom analyses</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {symptomHistory.slice(1).map((analysis) => (
                  <div
                    key={analysis.id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedAnalysis(analysis)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">
                        {new Date(analysis.analyzed_at).toLocaleDateString()}
                      </span>
                      <Badge className={getUrgencyColor(analysis.urgency_level)}>
                        {analysis.urgency_level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {analysis.symptoms.length} symptoms analyzed
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {selectedAnalysis && (
        <Dialog open={!!selectedAnalysis} onOpenChange={() => setSelectedAnalysis(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Analysis Details</DialogTitle>
              <DialogDescription>
                Analysis from {new Date(selectedAnalysis.analyzed_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Symptoms Reported</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnalysis.symptoms.map((symptom, index) => (
                      <Badge key={index} variant="outline">
                        {symptom.name} ({symptom.severity})
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Possible Conditions</h4>
                  <div className="space-y-2">
                    {selectedAnalysis.possible_conditions.map((condition, index) => (
                      <div key={index} className="p-3 border rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{condition.condition}</span>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(condition.probability * 100)}%
                          </span>
                        </div>
                        <p className="text-sm mt-1">{condition.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {selectedAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm">• {rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}