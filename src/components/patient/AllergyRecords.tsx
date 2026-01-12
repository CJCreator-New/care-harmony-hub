import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Pill, Leaf, Bug, Utensils } from 'lucide-react';

interface Allergy {
  id: string;
  allergen: string;
  type: 'medication' | 'food' | 'environmental' | 'other';
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
  diagnosed_date: string;
}

interface AllergyRecordsProps {
  allergies: Allergy[];
}

const ALLERGY_ICONS = {
  medication: Pill,
  food: Utensils,
  environmental: Leaf,
  other: Bug,
};

const SEVERITY_COLORS = {
  mild: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  moderate: 'bg-orange-100 text-orange-800 border-orange-300',
  severe: 'bg-red-100 text-red-800 border-red-300',
};

export function AllergyRecords({ allergies }: AllergyRecordsProps) {
  if (!allergies || allergies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Allergies
          </CardTitle>
          <CardDescription>Your allergy information</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No allergies recorded
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Allergies
        </CardTitle>
        <CardDescription>
          {allergies.length} {allergies.length === 1 ? 'allergy' : 'allergies'} on record
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {allergies.map((allergy) => {
          const Icon = ALLERGY_ICONS[allergy.type];
          return (
            <Alert key={allergy.id} className={SEVERITY_COLORS[allergy.severity]}>
              <Icon className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">{allergy.allergen}</p>
                    <p className="text-sm mt-1">
                      <span className="font-medium">Reaction:</span> {allergy.reaction}
                    </p>
                    <p className="text-xs mt-1 opacity-75">
                      Diagnosed: {new Date(allergy.diagnosed_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline" className="capitalize">
                      {allergy.type}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {allergy.severity}
                    </Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
}
