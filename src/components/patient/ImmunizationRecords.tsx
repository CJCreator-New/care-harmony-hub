import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Syringe, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Immunization {
  id: string;
  vaccine_name: string;
  date_administered: string;
  dose_number?: number;
  total_doses?: number;
  next_dose_due?: string;
  administered_by: string;
  lot_number?: string;
  site?: string;
  notes?: string;
}

interface ImmunizationRecordsProps {
  immunizations: Immunization[];
}

export function ImmunizationRecords({ immunizations }: ImmunizationRecordsProps) {
  const upToDate = immunizations?.filter(i => !i.next_dose_due || new Date(i.next_dose_due) > new Date());
  const dueOrOverdue = immunizations?.filter(i => i.next_dose_due && new Date(i.next_dose_due) <= new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Syringe className="h-5 w-5" />
          Immunization Records
        </CardTitle>
        <CardDescription>
          Your vaccination history and upcoming doses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alerts for due/overdue */}
        {dueOrOverdue && dueOrOverdue.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">
                  {dueOrOverdue.length} {dueOrOverdue.length === 1 ? 'dose' : 'doses'} due
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Please schedule an appointment to receive your upcoming vaccinations
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Immunization List */}
        {!immunizations || immunizations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No immunization records found
          </p>
        ) : (
          <div className="space-y-3">
            {immunizations.map((imm) => {
              const isDue = imm.next_dose_due && new Date(imm.next_dose_due) <= new Date();
              const isComplete = imm.dose_number === imm.total_doses;

              return (
                <div
                  key={imm.id}
                  className={`p-4 border rounded-lg ${isDue ? 'border-yellow-300 bg-yellow-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{imm.vaccine_name}</h4>
                        {isComplete ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {imm.dose_number}/{imm.total_doses} doses
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium">Administered:</span>{' '}
                          {format(new Date(imm.date_administered), 'MMM d, yyyy')}
                        </p>
                        {imm.administered_by && (
                          <p>
                            <span className="font-medium">By:</span> {imm.administered_by}
                          </p>
                        )}
                        {imm.site && (
                          <p>
                            <span className="font-medium">Site:</span> {imm.site}
                          </p>
                        )}
                        {imm.lot_number && (
                          <p className="text-xs">
                            Lot: {imm.lot_number}
                          </p>
                        )}
                      </div>

                      {imm.next_dose_due && !isComplete && (
                        <div className={`mt-3 flex items-center gap-2 text-sm ${isDue ? 'text-yellow-700' : 'text-muted-foreground'}`}>
                          <Clock className="h-4 w-4" />
                          <span>
                            Next dose {isDue ? 'due' : 'scheduled for'}:{' '}
                            {format(new Date(imm.next_dose_due), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}

                      {imm.notes && (
                        <p className="mt-2 text-sm text-muted-foreground italic">
                          {imm.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
