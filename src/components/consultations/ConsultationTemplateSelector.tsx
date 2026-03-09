import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Heart,
  Baby,
  Bone,
  Brain,
  Stethoscope,
  Eye,
  Ear,
  Wind,
  Syringe,
  Activity,
  Search,
  Layers,
} from 'lucide-react';

export interface ConsultationTemplate {
  id: string;
  specialty: string;
  icon: React.ReactNode;
  description: string;
  chiefComplaint: string;
  hpi: string;
  physicalExamination: Record<string, string>;
  suggestedDiagnoses: string[];
  suggestedLabOrders: string[];
  clinicalNotes: string;
}

const TEMPLATES: ConsultationTemplate[] = [
  {
    id: 'cardiology',
    specialty: 'Cardiology',
    icon: <Heart className="h-5 w-5" />,
    description: 'Chest pain, palpitations, dyspnea, hypertension',
    chiefComplaint: 'Patient presents with chest pain',
    hpi: 'Patient reports chest pain. Describe: onset, character (pressure/sharp/burning), radiation, severity (1-10), associated symptoms (dyspnea, diaphoresis, nausea, palpitations).',
    physicalExamination: {
      cardiovascular: 'Regular rate and rhythm. No murmurs, gallops, or rubs.',
      respiratory: 'Clear to auscultation bilaterally. No wheezes, crackles.',
      general: 'No acute distress. Alert and oriented.',
    },
    suggestedDiagnoses: ['I20.9 - Angina pectoris', 'I21.9 - Acute myocardial infarction', 'I10 - Essential hypertension', 'R07.9 - Chest pain'],
    suggestedLabOrders: ['Troponin I', 'BNP', 'CK-MB', 'Lipid Panel', 'CBC', 'BMP', 'Coagulation studies'],
    clinicalNotes: 'ECG ordered. Cardiac monitoring initiated. Patient advised to avoid strenuous activity.',
  },
  {
    id: 'pediatrics',
    specialty: 'Pediatrics',
    icon: <Baby className="h-5 w-5" />,
    description: 'Well-child visits, fever, infections, developmental',
    chiefComplaint: 'Child presents for evaluation',
    hpi: 'Parent/guardian reports concern about child. Describe: symptom onset, duration, fever (temperature), feeding tolerance, activity level, immunization status, developmental milestones.',
    physicalExamination: {
      general: 'Alert, active, appropriate for age. No acute distress.',
      HEENT: 'Normocephalic, atraumatic. TMs clear bilaterally. Oropharynx clear.',
      abdomen: 'Soft, non-tender, non-distended. Bowel sounds present.',
      skin: 'Warm, dry, intact. No rash or lesions.',
    },
    suggestedDiagnoses: ['Z00.129 - Encounter for routine child health exam', 'J06.9 - Upper respiratory infection', 'R50.9 - Fever', 'J18.9 - Pneumonia'],
    suggestedLabOrders: ['CBC with differential', 'Throat culture', 'Rapid strep', 'Urinalysis'],
    clinicalNotes: 'Growth and developmental milestones reviewed. Immunizations updated as appropriate.',
  },
  {
    id: 'orthopedics',
    specialty: 'Orthopedics',
    icon: <Bone className="h-5 w-5" />,
    description: 'Joint pain, fractures, musculoskeletal injuries',
    chiefComplaint: 'Patient presents with musculoskeletal complaint',
    hpi: 'Patient reports pain/injury to [location]. Describe: mechanism of injury, onset, severity, swelling/bruising, range of motion limitation, exacerbating/relieving factors, prior injuries.',
    physicalExamination: {
      musculoskeletal: 'Area of complaint: Inspection, palpation, range of motion, strength testing, special tests as applicable.',
      neurovascular: 'Sensation, circulation, and motor function intact distally.',
    },
    suggestedDiagnoses: ['M54.5 - Low back pain', 'M79.3 - Panniculitis', 'S62.009A - Fracture', 'M25.511 - Pain in shoulder'],
    suggestedLabOrders: ['X-ray affected area', 'MRI if soft tissue injury suspected', 'CBC', 'ESR', 'CRP'],
    clinicalNotes: 'Imaging ordered. RICE (Rest, Ice, Compression, Elevation) advised. Referral to physical therapy considered.',
  },
  {
    id: 'neurology',
    specialty: 'Neurology',
    icon: <Brain className="h-5 w-5" />,
    description: 'Headache, seizures, stroke, neuropathy',
    chiefComplaint: 'Patient presents with neurological symptoms',
    hpi: 'Patient reports neurological symptoms. Describe: headache (location, character, severity, duration, aura, triggers), seizure activity, weakness/numbness, vision changes, speech difficulties, changes in cognition.',
    physicalExamination: {
      neurological: 'Alert and oriented x4. Cranial nerves II-XII intact. Motor: 5/5 strength all extremities. Sensation: intact. Coordination: normal. Reflexes: 2+ symmetric.',
      mental_status: 'MMSE normal. Speech fluent. No focal deficits.',
    },
    suggestedDiagnoses: ['G43.909 - Migraine', 'G40.909 - Epilepsy', 'G35 - Multiple sclerosis', 'G62.9 - Peripheral neuropathy'],
    suggestedLabOrders: ['CBC', 'BMP', 'TSH', 'B12', 'Folate', 'HbA1c', 'MRI Brain'],
    clinicalNotes: 'Neurological examination completed. Imaging and further workup ordered as clinically indicated.',
  },
  {
    id: 'general',
    specialty: 'General Medicine',
    icon: <Stethoscope className="h-5 w-5" />,
    description: 'Annual physicals, chronic disease management',
    chiefComplaint: 'Patient presents for general evaluation',
    hpi: 'Patient presents for evaluation of [complaint]. Describe onset, duration, severity, associated symptoms, past medical history, medications, allergies, family history, social history.',
    physicalExamination: {
      general: 'Well-developed, well-nourished. No acute distress.',
      HEENT: 'Normocephalic, atraumatic. PERRL. TMs clear. Oropharynx clear.',
      cardiovascular: 'Regular rate and rhythm. No murmurs.',
      respiratory: 'Clear to auscultation bilaterally.',
      abdomen: 'Soft, non-tender, non-distended. Bowel sounds present.',
      extremities: 'No edema. Pulses intact.',
    },
    suggestedDiagnoses: ['Z00.00 - Encounter for general exam', 'Z72.0 - Tobacco use', 'E11.9 - Type 2 diabetes'],
    suggestedLabOrders: ['CBC', 'CMP', 'Lipid Panel', 'HbA1c', 'TSH', 'Urinalysis'],
    clinicalNotes: 'Complete history and physical performed. Preventive care measures reviewed.',
  },
  {
    id: 'pulmonology',
    specialty: 'Pulmonology',
    icon: <Wind className="h-5 w-5" />,
    description: 'Asthma, COPD, respiratory infections, dyspnea',
    chiefComplaint: 'Patient presents with respiratory complaint',
    hpi: 'Patient reports respiratory symptoms. Describe: dyspnea (exertional/rest), cough (productive/dry), wheezing, chest tightness, fever, sputum production, oxygen requirement, smoking history, exposures.',
    physicalExamination: {
      respiratory: 'Inspection: use of accessory muscles, pursed lip breathing. Palpation: tactile fremitus. Percussion: resonance. Auscultation: breath sounds, wheeze, crackles.',
      cardiovascular: 'Regular rate and rhythm. No JVD.',
    },
    suggestedDiagnoses: ['J45.909 - Unspecified asthma', 'J44.1 - COPD with exacerbation', 'J18.9 - Pneumonia', 'J22 - Acute lower respiratory infection'],
    suggestedLabOrders: ['Chest X-ray', 'CBC', 'ABG', 'Sputum culture', 'Spirometry', 'Pulse oximetry'],
    clinicalNotes: 'Respiratory function assessed. Bronchodilator therapy considered. Follow-up PFTs scheduled.',
  },
  {
    id: 'ophthalmology',
    specialty: 'Ophthalmology',
    icon: <Eye className="h-5 w-5" />,
    description: 'Vision changes, eye pain, glaucoma, cataracts',
    chiefComplaint: 'Patient presents with ocular complaint',
    hpi: 'Patient reports eye symptoms. Describe: visual acuity changes, pain, redness, discharge, photophobia, diplopia, floaters, flashes of light, trauma history.',
    physicalExamination: {
      eyes: 'Visual acuity: OD 20/__ OS 20/__. Pupils: equal, round, reactive. EOMs: full. Confrontation visual fields: full. Slit lamp: clear anterior segment, normal fundus.',
    },
    suggestedDiagnoses: ['H40.9 - Glaucoma', 'H26.9 - Cataract', 'H10.9 - Conjunctivitis', 'H53.9 - Visual disturbance'],
    suggestedLabOrders: ['IOP measurement', 'Visual field testing', 'OCT', 'Fundus photography'],
    clinicalNotes: 'Comprehensive eye exam performed. Intraocular pressure measured. Referral to ophthalmologist if indicated.',
  },
  {
    id: 'ent',
    specialty: 'ENT',
    icon: <Ear className="h-5 w-5" />,
    description: 'Ear, nose, throat conditions and infections',
    chiefComplaint: 'Patient presents with ENT complaint',
    hpi: 'Patient reports ear/nose/throat symptoms. Describe: hearing loss, tinnitus, vertigo, ear pain/discharge, nasal congestion/discharge, epistaxis, sore throat, dysphagia, hoarseness.',
    physicalExamination: {
      HEENT: 'Ears: TMs clear bilaterally, no fluid, no perforation. Nose: mucosa pink/moist, no polyps. Oropharynx: tonsils 2/4, no exudate. Neck: no LAD.',
    },
    suggestedDiagnoses: ['J35.01 - Tonsillitis', 'H66.90 - Otitis media', 'J30.1 - Allergic rhinitis', 'H83.09 - Labyrinthitis'],
    suggestedLabOrders: ['Throat culture', 'Audiogram', 'Tympanometry', 'Allergy panel'],
    clinicalNotes: 'ENT examination completed. Audiometry ordered if hearing loss suspected.',
  },
  {
    id: 'endocrinology',
    specialty: 'Endocrinology',
    icon: <Syringe className="h-5 w-5" />,
    description: 'Diabetes, thyroid disorders, hormonal conditions',
    chiefComplaint: 'Patient presents for endocrine evaluation',
    hpi: 'Patient reports endocrine-related symptoms. Describe: fatigue, weight changes, polyuria/polydipsia (diabetes), temperature intolerance, tremor, hair/skin changes, menstrual irregularities, medication changes.',
    physicalExamination: {
      thyroid: 'Palpation: size, consistency, nodules.',
      general: 'No acute distress. BMI noted. Signs of thyroid disease: exophthalmos, tremor, skin changes.',
    },
    suggestedDiagnoses: ['E11.9 - Type 2 diabetes', 'E03.9 - Hypothyroidism', 'E05.90 - Hyperthyroidism', 'E27.49 - Adrenal disorder'],
    suggestedLabOrders: ['HbA1c', 'Fasting glucose', 'TSH', 'Free T4', 'Cortisol', 'Thyroid antibodies'],
    clinicalNotes: 'Endocrine panel ordered. Medication adjustments as per lab results. Patient education on diet and lifestyle.',
  },
  {
    id: 'emergency',
    specialty: 'Emergency Medicine',
    icon: <Activity className="h-5 w-5" />,
    description: 'Acute illness, trauma, urgent conditions',
    chiefComplaint: 'Patient presents with urgent/acute complaint',
    hpi: 'Patient presents acutely ill/injured. Describe: mechanism of injury or acute onset, current status, vital signs, pain level, pertinent positives and negatives, last oral intake, allergies, current medications.',
    physicalExamination: {
      primary_survey: 'Airway: patent. Breathing: present, adequate. Circulation: pulse present, hemostasis secured. Disability: GCS 15, pupils equal. Exposure: completed.',
      secondary_survey: 'Head-to-toe examination completed. Pertinent findings documented.',
    },
    suggestedDiagnoses: ['R55 - Syncope', 'S09.90XA - Unspecified injury', 'R07.9 - Chest pain', 'R51 - Headache'],
    suggestedLabOrders: ['CBC', 'BMP', 'Troponin', 'Lactate', 'PT/INR', 'Type & Screen', 'UA', 'Chest X-ray', 'ECG'],
    clinicalNotes: 'Emergency evaluation completed. Continuous monitoring. IV access established. Patient stabilized.',
  },
];

interface ConsultationTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (template: ConsultationTemplate) => void;
}

export function ConsultationTemplateSelector({ open, onOpenChange, onApply }: ConsultationTemplateSelectorProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ConsultationTemplate | null>(null);

  const filtered = TEMPLATES.filter(t =>
    !search ||
    t.specialty.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleApply = () => {
    if (selected) {
      onApply(selected);
      onOpenChange(false);
      setSelected(null);
      setSearch('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Consultation Templates by Specialty
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search specialty..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pr-1">
          {filtered.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelected(template)}
              className={cn(
                'text-left p-4 rounded-lg border-2 transition-all hover:border-primary/50 hover:bg-primary/5',
                selected?.id === template.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-primary">{template.icon}</span>
                <span className="font-semibold text-sm">{template.specialty}</span>
              </div>
              <p className="text-xs text-muted-foreground">{template.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {template.suggestedLabOrders.slice(0, 2).map((lab) => (
                  <Badge key={lab} variant="outline" className="text-[10px] px-1.5 py-0">
                    {lab}
                  </Badge>
                ))}
                {template.suggestedLabOrders.length > 2 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +{template.suggestedLabOrders.length - 2} more
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">
              Apply <span className="text-primary">{selected.specialty}</span> template?
            </p>
            <p className="text-xs text-muted-foreground">
              This will pre-fill chief complaint, HPI, physical exam structure, and suggested orders. 
              You can edit all fields after applying.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelected(null)} size="sm">
                Cancel
              </Button>
              <Button onClick={handleApply} size="sm">
                Apply Template
              </Button>
            </div>
          </div>
        )}

        {!selected && (
          <div className="border-t pt-4 flex justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} size="sm">
              Skip — Start Blank
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
