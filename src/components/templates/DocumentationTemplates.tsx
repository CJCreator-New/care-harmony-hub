import { Card } from '@/components/ui/card';
import { FileText, ClipboardList, Pill, LogOut } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  type: 'assessment' | 'procedure' | 'medication' | 'discharge';
  icon: any;
}

const templates: Template[] = [
  { id: '1', name: 'Patient Assessment', type: 'assessment', icon: ClipboardList },
  { id: '2', name: 'Procedure Notes', type: 'procedure', icon: FileText },
  { id: '3', name: 'Medication Administration', type: 'medication', icon: Pill },
  { id: '4', name: 'Discharge Summary', type: 'discharge', icon: LogOut }
];

export const DocumentationTemplates = ({ onSelect }: { onSelect: (template: Template) => void }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((template) => {
        const Icon = template.icon;
        return (
          <Card key={template.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(template)}>
            <div className="flex items-center gap-3">
              <Icon className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.type}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
