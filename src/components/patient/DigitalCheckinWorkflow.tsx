import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  User, 
  CreditCard, 
  FileText, 
  Shield,
  Smartphone,
  MapPin,
  Calendar
} from 'lucide-react';
import { DigitalCheckinSession, CheckinWorkflow, PreVisitQuestionnaire } from '@/types/patient-portal';

interface DigitalCheckinWorkflowProps {
  sessionToken: string;
  appointmentData: {
    id: string;
    patient_name: string;
    doctor_name: string;
    appointment_time: string;
    location: string;
    specialty: string;
  };
  onStepComplete: (stepId: string, data: any) => void;
  onCheckinComplete: (sessionId: string) => void;
}

export const DigitalCheckinWorkflow: React.FC<DigitalCheckinWorkflowProps> = ({
  sessionToken,
  appointmentData,
  onStepComplete,
  onCheckinComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [workflow, setWorkflow] = useState<CheckinWorkflow | null>(null);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Mock workflow configuration
  const mockWorkflow: CheckinWorkflow = {
    session_id: sessionToken,
    current_step: 0,
    total_steps: 5,
    steps: [
      {
        id: 'demographics',
        title: 'Confirm Information',
        component: 'DemographicsConfirmation',
        required: true,
        completed: false
      },
      {
        id: 'insurance',
        title: 'Insurance Verification',
        component: 'InsuranceVerification',
        required: true,
        completed: false
      },
      {
        id: 'questionnaire',
        title: 'Health Questionnaire',
        component: 'PreVisitQuestionnaire',
        required: true,
        completed: false
      },
      {
        id: 'consent',
        title: 'Digital Consent',
        component: 'ConsentForms',
        required: true,
        completed: false
      },
      {
        id: 'arrival',
        title: 'Confirm Arrival',
        component: 'ArrivalConfirmation',
        required: true,
        completed: false
      }
    ],
    can_proceed: true,
    estimated_completion_time: 8
  };

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'demographics': return <User className="h-5 w-5" />;
      case 'insurance': return <CreditCard className="h-5 w-5" />;
      case 'questionnaire': return <FileText className="h-5 w-5" />;
      case 'consent': return <Shield className="h-5 w-5" />;
      case 'arrival': return <MapPin className="h-5 w-5" />;
      default: return <CheckCircle className="h-5 w-5" />;
    }
  };

  const handleStepComplete = (stepId: string, data: any) => {
    setStepData(prev => ({ ...prev, [stepId]: data }));
    
    if (workflow) {
      const updatedWorkflow = {
        ...workflow,
        steps: workflow.steps.map(step => 
          step.id === stepId ? { ...step, completed: true } : step
        )
      };
      setWorkflow(updatedWorkflow);
    }
    
    onStepComplete(stepId, data);
    
    // Move to next step
    if (currentStep < mockWorkflow.total_steps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCompleteCheckin = () => {
    setIsLoading(true);
    setTimeout(() => {
      onCheckinComplete(sessionToken);
      setIsLoading(false);
    }, 1000);
  };

  const renderStepContent = () => {
    if (!workflow) return null;
    
    const step = workflow.steps[currentStep];
    
    switch (step.id) {
      case 'demographics':
        return <DemographicsConfirmationStep onComplete={(data) => handleStepComplete(step.id, data)} />;
      case 'insurance':
        return <InsuranceVerificationStep onComplete={(data) => handleStepComplete(step.id, data)} />;
      case 'questionnaire':
        return <QuestionnaireStep onComplete={(data) => handleStepComplete(step.id, data)} />;
      case 'consent':
        return <ConsentStep onComplete={(data) => handleStepComplete(step.id, data)} />;
      case 'arrival':
        return <ArrivalConfirmationStep onComplete={(data) => handleStepComplete(step.id, data)} />;
      default:
        return null;
    }
  };

  const getCompletedSteps = () => {
    return workflow?.steps.filter(step => step.completed).length || 0;
  };

  const getProgressPercentage = () => {
    if (!workflow) return 0;
    return (getCompletedSteps() / workflow.total_steps) * 100;
  };

  const isAllStepsCompleted = () => {
    return workflow?.steps.every(step => step.completed) || false;
  };

  useEffect(() => {
    setWorkflow(mockWorkflow);
  }, []);

  if (!workflow) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Digital Check-In
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Complete your check-in process before your appointment
              </p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{workflow.estimated_completion_time} min
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs text-gray-500">Patient</Label>
              <p className="font-medium">{appointmentData.patient_name}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Doctor</Label>
              <p className="font-medium">{appointmentData.doctor_name}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Appointment</Label>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(appointmentData.appointment_time).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Location</Label>
              <p className="font-medium">{appointmentData.location}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{getCompletedSteps()} of {workflow.total_steps} completed</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Step Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {workflow.steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step.completed 
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : index === currentStep
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}>
                  {step.completed ? <CheckCircle className="h-5 w-5" /> : getStepIcon(step.id)}
                </div>
                <div className="ml-2 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    step.completed ? 'text-green-700' : index === currentStep ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < workflow.steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{workflow.steps[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousStep}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        
        {isAllStepsCompleted() ? (
          <Button
            onClick={handleCompleteCheckin}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Completing...' : 'Complete Check-In'}
          </Button>
        ) : (
          <Button
            disabled={!workflow.steps[currentStep].completed}
            onClick={() => {
              if (currentStep < workflow.total_steps - 1) {
                setCurrentStep(prev => prev + 1);
              }
            }}
          >
            Next Step
          </Button>
        )}
      </div>
    </div>
  );
};

// Individual step components
const DemographicsConfirmationStep: React.FC<{ onComplete: (data: any) => void }> = ({ onComplete }) => {
  const [confirmed, setConfirmed] = useState(false);
  
  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Please confirm your demographic information is correct.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Full Name</Label>
          <Input value="John Doe" readOnly className="bg-gray-50" />
        </div>
        <div>
          <Label>Date of Birth</Label>
          <Input value="01/15/1985" readOnly className="bg-gray-50" />
        </div>
        <div>
          <Label>Phone Number</Label>
          <Input value="(555) 123-4567" readOnly className="bg-gray-50" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value="john.doe@email.com" readOnly className="bg-gray-50" />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={confirmed}
          onCheckedChange={setConfirmed}
        />
        <Label>I confirm this information is accurate</Label>
      </div>
      
      <Button
        onClick={() => onComplete({ demographics_confirmed: true })}
        disabled={!confirmed}
        className="w-full"
      >
        Confirm Information
      </Button>
    </div>
  );
};

const InsuranceVerificationStep: React.FC<{ onComplete: (data: any) => void }> = ({ onComplete }) => {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Your insurance has been verified and is active.
        </AlertDescription>
      </Alert>
      
      <div className="p-4 bg-green-50 rounded-lg">
        <h4 className="font-medium text-green-800">Insurance Details</h4>
        <p className="text-sm text-green-700">Blue Cross Blue Shield - Active</p>
        <p className="text-sm text-green-700">Copay: $25</p>
      </div>
      
      <Button
        onClick={() => onComplete({ insurance_verified: true })}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
};

const QuestionnaireStep: React.FC<{ onComplete: (data: any) => void }> = ({ onComplete }) => {
  const [responses, setResponses] = useState<Record<string, any>>({});
  
  return (
    <div className="space-y-4">
      <div>
        <Label>What is the main reason for your visit today?</Label>
        <Input
          value={responses.chief_complaint || ''}
          onChange={(e) => setResponses(prev => ({ ...prev, chief_complaint: e.target.value }))}
          placeholder="Describe your symptoms or concerns"
        />
      </div>
      
      <div>
        <Label>Rate your pain level (0-10)</Label>
        <Input
          type="number"
          min="0"
          max="10"
          value={responses.pain_level || ''}
          onChange={(e) => setResponses(prev => ({ ...prev, pain_level: e.target.value }))}
        />
      </div>
      
      <Button
        onClick={() => onComplete({ questionnaire_completed: true, responses })}
        disabled={!responses.chief_complaint}
        className="w-full"
      >
        Submit Questionnaire
      </Button>
    </div>
  );
};

const ConsentStep: React.FC<{ onComplete: (data: any) => void }> = ({ onComplete }) => {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <Checkbox
            checked={consents.treatment || false}
            onCheckedChange={(checked) => setConsents(prev => ({ ...prev, treatment: checked as boolean }))}
          />
          <Label className="text-sm">
            I consent to medical treatment and procedures recommended by my healthcare provider
          </Label>
        </div>
        
        <div className="flex items-start space-x-2">
          <Checkbox
            checked={consents.privacy || false}
            onCheckedChange={(checked) => setConsents(prev => ({ ...prev, privacy: checked as boolean }))}
          />
          <Label className="text-sm">
            I acknowledge receipt of the HIPAA Privacy Notice
          </Label>
        </div>
      </div>
      
      <Button
        onClick={() => onComplete({ consent_signed: true, consents })}
        disabled={!consents.treatment || !consents.privacy}
        className="w-full"
      >
        Sign Consent Forms
      </Button>
    </div>
  );
};

const ArrivalConfirmationStep: React.FC<{ onComplete: (data: any) => void }> = ({ onComplete }) => {
  return (
    <div className="space-y-4 text-center">
      <div className="p-6 bg-blue-50 rounded-lg">
        <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-blue-800">Almost Done!</h3>
        <p className="text-blue-700">
          Please confirm your arrival at the clinic to complete check-in.
        </p>
      </div>
      
      <Button
        onClick={() => onComplete({ arrival_confirmed: true, arrival_time: new Date().toISOString() })}
        className="w-full"
        size="lg"
      >
        I Have Arrived
      </Button>
    </div>
  );
};