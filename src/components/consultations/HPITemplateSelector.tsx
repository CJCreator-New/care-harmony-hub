import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { HPIData, TemplateField } from '@/types/soap';

interface HPITemplateSelectorProps {
  value: HPIData;
  onChange: (hpi: HPIData) => void;
}

const TEMPLATES = {
  OLDCARTS: {
    name: 'OLDCARTS',
    description: 'Onset, Location, Duration, Character, Aggravating factors, Relieving factors, Timing, Severity',
    fields: [
      { key: 'onset', label: 'Onset', type: 'text' as const, required: true },
      { key: 'location', label: 'Location', type: 'text' as const, required: true },
      { key: 'duration', label: 'Duration', type: 'text' as const, required: true },
      { key: 'character', label: 'Character', type: 'text' as const, required: true },
      { key: 'aggravating', label: 'Aggravating Factors', type: 'text' as const },
      { key: 'relieving', label: 'Relieving Factors', type: 'text' as const },
      { key: 'timing', label: 'Timing', type: 'text' as const },
      { key: 'severity', label: 'Severity (1-10)', type: 'number' as const, min: 1, max: 10 }
    ]
  },
  OPQRST: {
    name: 'OPQRST',
    description: 'Onset, Provocation, Quality, Radiation, Severity, Timing',
    fields: [
      { key: 'onset', label: 'Onset', type: 'text' as const, required: true },
      { key: 'provocation', label: 'Provocation/Palliation', type: 'text' as const },
      { key: 'quality', label: 'Quality', type: 'text' as const, required: true },
      { key: 'radiation', label: 'Radiation', type: 'text' as const },
      { key: 'severity', label: 'Severity (1-10)', type: 'number' as const, min: 1, max: 10, required: true },
      { key: 'timing', label: 'Timing', type: 'text' as const, required: true }
    ]
  }
};

export const HPITemplateSelector: React.FC<HPITemplateSelectorProps> = ({ value, onChange }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<'OLDCARTS' | 'OPQRST'>(value.template_type || 'OLDCARTS');

  const handleTemplateChange = (template: 'OLDCARTS' | 'OPQRST') => {
    setSelectedTemplate(template);
    onChange({ ...value, template_type: template });
  };

  const handleFieldChange = (key: string, fieldValue: string | number) => {
    onChange({ ...value, [key]: fieldValue });
  };

  const renderField = (field: TemplateField) => {
    const fieldValue = value[field.key as keyof HPIData] || '';

    if (field.type === 'number') {
      return (
        <Input
          type="number"
          value={fieldValue}
          onChange={(e) => handleFieldChange(field.key, parseInt(e.target.value) || 0)}
          min={field.min}
          max={field.max}
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      );
    }

    return (
      <Textarea
        value={fieldValue}
        onChange={(e) => handleFieldChange(field.key, e.target.value)}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        rows={2}
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>History of Present Illness (HPI)</CardTitle>
        <div className="flex gap-2">
          {Object.entries(TEMPLATES).map(([key, template]) => (
            <Button
              key={key}
              variant={selectedTemplate === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTemplateChange(key as 'OLDCARTS' | 'OPQRST')}
            >
              {template.name}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {TEMPLATES[selectedTemplate].description}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {TEMPLATES[selectedTemplate].fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key} className="flex items-center gap-2">
              {field.label}
              {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
            </Label>
            {renderField(field)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};