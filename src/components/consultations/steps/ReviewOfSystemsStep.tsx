import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ReviewOfSystems } from '@/types/soap';

interface ReviewOfSystemsStepProps {
  value: ReviewOfSystems;
  onChange: (ros: ReviewOfSystems) => void;
}

const SYSTEMS = [
  { key: 'constitutional', label: 'Constitutional', description: 'Fever, chills, weight loss/gain, fatigue' },
  { key: 'eyes', label: 'Eyes', description: 'Vision changes, pain, discharge' },
  { key: 'ent', label: 'ENT', description: 'Hearing, tinnitus, sore throat, congestion' },
  { key: 'cardiovascular', label: 'Cardiovascular', description: 'Chest pain, palpitations, shortness of breath' },
  { key: 'respiratory', label: 'Respiratory', description: 'Cough, dyspnea, wheezing' },
  { key: 'gastrointestinal', label: 'Gastrointestinal', description: 'Nausea, vomiting, diarrhea, constipation' },
  { key: 'genitourinary', label: 'Genitourinary', description: 'Dysuria, frequency, urgency' },
  { key: 'musculoskeletal', label: 'Musculoskeletal', description: 'Joint pain, muscle weakness, stiffness' },
  { key: 'integumentary', label: 'Skin', description: 'Rash, lesions, itching' },
  { key: 'neurological', label: 'Neurological', description: 'Headache, dizziness, numbness, weakness' },
  { key: 'psychiatric', label: 'Psychiatric', description: 'Mood changes, anxiety, depression' },
  { key: 'endocrine', label: 'Endocrine', description: 'Heat/cold intolerance, polyuria, polydipsia' },
  { key: 'hematologic', label: 'Hematologic', description: 'Easy bruising, bleeding' },
  { key: 'allergic', label: 'Allergic/Immunologic', description: 'Allergic reactions, frequent infections' }
];

export const ReviewOfSystemsStep: React.FC<ReviewOfSystemsStepProps> = ({ value, onChange }) => {
  const handleSystemChange = (system: string, checked: boolean) => {
    onChange({ ...value, [system]: checked });
  };

  const handleNotesChange = (notes: string) => {
    onChange({ ...value, notes });
  };

  const positiveCount = SYSTEMS.filter(system => value[system.key as keyof ReviewOfSystems]).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Review of Systems
          <span className="text-sm font-normal text-muted-foreground">
            {positiveCount} positive findings
          </span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Check all systems with positive findings. Leave unchecked for negative/normal findings.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SYSTEMS.map((system) => (
            <div key={system.key} className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox
                id={system.key}
                checked={Boolean(value[system.key as keyof ReviewOfSystems])}
                onCheckedChange={(checked) => handleSystemChange(system.key, Boolean(checked))}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor={system.key} className="font-medium cursor-pointer">
                  {system.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {system.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ros-notes">Additional Notes</Label>
          <Textarea
            id="ros-notes"
            value={value.notes || ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Document any additional positive findings or pertinent negatives..."
            rows={3}
          />
        </div>

        {positiveCount > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Positive findings detected:</strong> Ensure detailed documentation in HPI and physical exam.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};