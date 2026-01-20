import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';

interface ChecklistItem {
  id: string;
  description: string;
  required: boolean;
  completed: boolean;
}

export const AutomatedChecklist = ({ items, onUpdate }: { items: ChecklistItem[], onUpdate: (items: ChecklistItem[]) => void }) => {
  const [checklist, setChecklist] = useState(items);

  const toggleItem = (id: string) => {
    const updated = checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    onUpdate(updated);
  };

  const completionRate = (checklist.filter(i => i.completed).length / checklist.length) * 100;

  return (
    <Card className="p-4">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Checklist</h3>
          <span className="text-sm text-muted-foreground">{completionRate.toFixed(0)}% Complete</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
        </div>
      </div>
      <div className="space-y-3">
        {checklist.map(item => (
          <div key={item.id} className="flex items-start gap-3">
            <Checkbox 
              checked={item.completed} 
              onCheckedChange={() => toggleItem(item.id)}
              id={item.id}
            />
            <label htmlFor={item.id} className="text-sm cursor-pointer flex-1">
              {item.description}
              {item.required && <span className="text-destructive ml-1">*</span>}
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
};
