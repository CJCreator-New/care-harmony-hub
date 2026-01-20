import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestTube2, Pill, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface OrderTemplate {
  id: string;
  name: string;
  category: string;
  items: string[];
}

const LAB_TEMPLATES: OrderTemplate[] = [
  { id: 'cbc', name: 'Complete Blood Count', category: 'Hematology', items: ['WBC', 'RBC', 'Hemoglobin', 'Hematocrit', 'Platelets'] },
  { id: 'cmp', name: 'Comprehensive Metabolic Panel', category: 'Chemistry', items: ['Glucose', 'Calcium', 'Sodium', 'Potassium', 'CO2', 'Chloride', 'BUN', 'Creatinine'] },
  { id: 'lipid', name: 'Lipid Panel', category: 'Chemistry', items: ['Total Cholesterol', 'HDL', 'LDL', 'Triglycerides'] },
  { id: 'thyroid', name: 'Thyroid Function', category: 'Endocrine', items: ['TSH', 'Free T4', 'Free T3'] },
];

const RX_TEMPLATES: OrderTemplate[] = [
  { id: 'hypertension', name: 'Hypertension', category: 'Cardiovascular', items: ['Amlodipine 5mg', 'Lisinopril 10mg', 'Hydrochlorothiazide 25mg'] },
  { id: 'diabetes', name: 'Diabetes', category: 'Endocrine', items: ['Metformin 500mg', 'Glipizide 5mg', 'Insulin Glargine'] },
  { id: 'infection', name: 'Common Infections', category: 'Antibiotics', items: ['Amoxicillin 500mg', 'Azithromycin 250mg', 'Ciprofloxacin 500mg'] },
  { id: 'pain', name: 'Pain Management', category: 'Analgesics', items: ['Ibuprofen 400mg', 'Acetaminophen 500mg', 'Tramadol 50mg'] },
];

export function QuickOrderTemplates({ onOrderSelect }: { onOrderSelect: (type: 'lab' | 'rx', items: string[]) => void }) {
  const [selectedTab, setSelectedTab] = useState<'lab' | 'rx'>('lab');

  const handleTemplateClick = (template: OrderTemplate) => {
    onOrderSelect(selectedTab, template.items);
    toast.success(`${template.name} template applied`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Order Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'lab' | 'rx')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lab" className="flex items-center gap-2">
              <TestTube2 className="h-4 w-4" />
              Lab Orders
            </TabsTrigger>
            <TabsTrigger value="rx" className="flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Prescriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lab" className="space-y-2 mt-4">
            {LAB_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => handleTemplateClick(template)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{template.name}</span>
                  <Badge variant="secondary">{template.category}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {template.items.join(', ')}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="rx" className="space-y-2 mt-4">
            {RX_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => handleTemplateClick(template)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{template.name}</span>
                  <Badge variant="secondary">{template.category}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {template.items.join(', ')}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
