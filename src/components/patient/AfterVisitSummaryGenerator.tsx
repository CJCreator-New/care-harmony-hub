import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Send, Download, Eye, Calendar, Pill, AlertTriangle } from 'lucide-react';
import { AfterVisitSummary, AVSTemplate, PatientEducationMaterial } from '@/types/patient-portal';

interface AfterVisitSummaryGeneratorProps {
  patientId: string;
  consultationId: string;
  patientName: string;
  visitData: {
    chief_complaint: string;
    diagnosis: string;
    treatment_plan: string;
    prescriptions: Array<{
      medication_name: string;
      dosage: string;
      frequency: string;
      instructions: string;
    }>;
  };
  onGenerate: (summary: Partial<AfterVisitSummary>) => void;
  onDeliver: (summaryId: string, method: string) => void;
}

export const AfterVisitSummaryGenerator: React.FC<AfterVisitSummaryGeneratorProps> = ({
  patientId,
  consultationId,
  patientName,
  visitData,
  onGenerate,
  onDeliver
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<AVSTemplate | null>(null);
  const [summaryContent, setSummaryContent] = useState<Partial<AfterVisitSummary>>({});
  const [educationalMaterials, setEducationalMaterials] = useState<PatientEducationMaterial[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'sms' | 'portal' | 'print'>('portal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Mock templates (in real app, fetch from database)
  const mockTemplates: AVSTemplate[] = [
    {
      id: '1',
      template_name: 'General Visit Summary',
      template_type: 'visit_summary',
      content_sections: {
        sections: [
          { id: 'visit_info', title: 'Visit Information', required: true },
          { id: 'chief_complaint', title: 'Reason for Visit', required: true },
          { id: 'diagnosis', title: 'Diagnosis', required: true },
          { id: 'treatment', title: 'Treatment Plan', required: true },
          { id: 'medications', title: 'Medications', required: false },
          { id: 'follow_up', title: 'Follow-up Instructions', required: true },
          { id: 'emergency', title: 'When to Seek Emergency Care', required: true }
        ]
      },
      is_active: true,
      hospital_id: 'current',
      created_at: new Date().toISOString()
    }
  ];

  // Mock educational materials
  const mockEducationalMaterials: PatientEducationMaterial[] = [
    {
      id: '1',
      title: 'Understanding Your Blood Pressure',
      content_type: 'article',
      category: 'condition',
      content_url: '/education/blood-pressure',
      reading_level: 8,
      languages: ['en'],
      tags: ['hypertension', 'cardiovascular'],
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Medication Safety Tips',
      content_type: 'checklist',
      category: 'medication',
      content_url: '/education/medication-safety',
      reading_level: 6,
      languages: ['en'],
      tags: ['medication_safety', 'adherence'],
      is_active: true,
      created_at: new Date().toISOString()
    }
  ];

  const generateSummaryContent = () => {
    setIsGenerating(true);
    
    // Auto-populate based on visit data
    const generatedContent: Partial<AfterVisitSummary> = {
      patient_id: patientId,
      consultation_id: consultationId,
      visit_date: new Date().toISOString().split('T')[0],
      chief_complaint: visitData.chief_complaint,
      diagnosis_summary: visitData.diagnosis,
      treatment_plan: visitData.treatment_plan,
      medications_prescribed: visitData.prescriptions.map(rx => ({
        medication_name: rx.medication_name,
        dosage: rx.dosage,
        frequency: rx.frequency,
        instructions: rx.instructions,
        new_medication: true
      })),
      follow_up_instructions: generateFollowUpInstructions(),
      emergency_instructions: generateEmergencyInstructions(),
      educational_materials: selectedMaterials.map(materialId => {
        const material = mockEducationalMaterials.find(m => m.id === materialId);
        return {
          title: material?.title || '',
          url: material?.content_url,
          type: material?.content_type || ''
        };
      })
    };

    setSummaryContent(generatedContent);
    setIsGenerating(false);
  };

  const generateFollowUpInstructions = (): string => {
    const instructions = [
      'Continue taking all prescribed medications as directed',
      'Monitor your symptoms and report any worsening',
      'Follow up with your primary care physician in 2-4 weeks'
    ];
    
    if (visitData.prescriptions.length > 0) {
      instructions.push('Review medication instructions and potential side effects');
    }
    
    return instructions.join('\n• ');
  };

  const generateEmergencyInstructions = (): string => {
    return `Seek immediate medical attention if you experience:
• Severe chest pain or difficulty breathing
• High fever (over 101°F) that doesn't respond to medication
• Severe allergic reactions (rash, swelling, difficulty breathing)
• Any symptoms that worsen rapidly or cause concern

For emergencies, call 911 or go to the nearest emergency room.
For urgent questions, contact our on-call service at (555) 123-4567.`;
  };

  const handleMaterialToggle = (materialId: string) => {
    setSelectedMaterials(prev => 
      prev.includes(materialId) 
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const handleGenerate = () => {
    generateSummaryContent();
    onGenerate(summaryContent);
  };

  const handleDeliver = () => {
    if (summaryContent.id) {
      onDeliver(summaryContent.id, deliveryMethod);
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      generateSummaryContent();
    }
  }, [selectedTemplate, selectedMaterials]);

  useEffect(() => {
    // Auto-select first template
    if (mockTemplates.length > 0) {
      setSelectedTemplate(mockTemplates[0]);
    }
    setEducationalMaterials(mockEducationalMaterials);
  }, []);

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            After Visit Summary Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Template</label>
            <Select 
              value={selectedTemplate?.id} 
              onValueChange={(value) => {
                const template = mockTemplates.find(t => t.id === value);
                setSelectedTemplate(template || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {mockTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium">Patient:</span>
              <p className="text-lg font-semibold">{patientName}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Visit Date:</span>
              <p>{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Educational Materials Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Educational Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {educationalMaterials.map((material) => (
              <div key={material.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  checked={selectedMaterials.includes(material.id)}
                  onCheckedChange={() => handleMaterialToggle(material.id)}
                />
                <div className="flex-1">
                  <h4 className="font-medium">{material.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {material.content_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Grade {material.reading_level}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {material.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Content Preview */}
      {summaryContent.chief_complaint && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Summary Preview</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {previewMode ? 'Edit' : 'Preview'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewMode ? (
              <div className="prose max-w-none">
                <h3>Visit Summary for {patientName}</h3>
                <p><strong>Date:</strong> {summaryContent.visit_date}</p>
                
                <h4>Reason for Visit</h4>
                <p>{summaryContent.chief_complaint}</p>
                
                <h4>Diagnosis</h4>
                <p>{summaryContent.diagnosis_summary}</p>
                
                <h4>Treatment Plan</h4>
                <p>{summaryContent.treatment_plan}</p>
                
                {summaryContent.medications_prescribed && summaryContent.medications_prescribed.length > 0 && (
                  <>
                    <h4>Medications</h4>
                    <ul>
                      {summaryContent.medications_prescribed.map((med) => (
                        <li key={`${med.medication_name}-${med.dosage}-${med.frequency}`}>
                          <strong>{med.medication_name}</strong> - {med.dosage}, {med.frequency}
                          <br />
                          <em>{med.instructions}</em>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                
                <h4>Follow-up Instructions</h4>
                <p style={{ whiteSpace: 'pre-line' }}>• {summaryContent.follow_up_instructions}</p>
                
                <h4>When to Seek Emergency Care</h4>
                <p style={{ whiteSpace: 'pre-line' }}>{summaryContent.emergency_instructions}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Chief Complaint</label>
                  <Textarea
                    value={summaryContent.chief_complaint || ''}
                    onChange={(e) => setSummaryContent(prev => ({ ...prev, chief_complaint: e.target.value }))}
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Diagnosis</label>
                  <Textarea
                    value={summaryContent.diagnosis_summary || ''}
                    onChange={(e) => setSummaryContent(prev => ({ ...prev, diagnosis_summary: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Treatment Plan</label>
                  <Textarea
                    value={summaryContent.treatment_plan || ''}
                    onChange={(e) => setSummaryContent(prev => ({ ...prev, treatment_plan: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Follow-up Instructions</label>
                  <Textarea
                    value={summaryContent.follow_up_instructions || ''}
                    onChange={(e) => setSummaryContent(prev => ({ ...prev, follow_up_instructions: e.target.value }))}
                    rows={4}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Delivery Method</label>
            <Select value={deliveryMethod} onValueChange={(value: any) => setDeliveryMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portal">Patient Portal</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="print">Print</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !selectedTemplate}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Summary'}
            </Button>
            
            <Button 
              onClick={handleDeliver}
              disabled={!summaryContent.chief_complaint}
              variant="outline"
            >
              <Send className="h-4 w-4 mr-2" />
              Deliver
            </Button>
            
            <Button variant="outline" size="icon" aria-label="Download summary">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
