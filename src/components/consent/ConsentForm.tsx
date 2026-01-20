import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

interface ConsentFormProps {
  patientId: string;
  onComplete: () => void;
}

export function ConsentForm({ patientId, onComplete }: ConsentFormProps) {
  const [consents, setConsents] = useState({
    treatment: false,
    dataProcessing: false,
    telemedicine: false,
    dataSharing: false,
  });

  const handleSubmit = async () => {
    await supabase.from('patient_consents').insert({
      patient_id: patientId,
      treatment_consent: consents.treatment,
      data_processing_consent: consents.dataProcessing,
      telemedicine_consent: consents.telemedicine,
      data_sharing_consent: consents.dataSharing,
      consent_date: new Date().toISOString(),
    });
    onComplete();
  };

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold">Patient Consent</h2>
      
      <div className="space-y-3">
        <label className="flex items-start gap-3">
          <Checkbox
            checked={consents.treatment}
            onCheckedChange={(checked) => 
              setConsents(prev => ({ ...prev, treatment: !!checked }))
            }
          />
          <span>I consent to treatment and medical procedures</span>
        </label>

        <label className="flex items-start gap-3">
          <Checkbox
            checked={consents.dataProcessing}
            onCheckedChange={(checked) => 
              setConsents(prev => ({ ...prev, dataProcessing: !!checked }))
            }
          />
          <span>I consent to processing of my health data (HIPAA)</span>
        </label>

        <label className="flex items-start gap-3">
          <Checkbox
            checked={consents.telemedicine}
            onCheckedChange={(checked) => 
              setConsents(prev => ({ ...prev, telemedicine: !!checked }))
            }
          />
          <span>I consent to telemedicine services</span>
        </label>

        <label className="flex items-start gap-3">
          <Checkbox
            checked={consents.dataSharing}
            onCheckedChange={(checked) => 
              setConsents(prev => ({ ...prev, dataSharing: !!checked }))
            }
          />
          <span>I consent to sharing data with insurance providers</span>
        </label>
      </div>

      <Button 
        onClick={handleSubmit}
        disabled={!consents.treatment || !consents.dataProcessing}
        className="w-full"
      >
        Submit Consent
      </Button>
    </div>
  );
}
