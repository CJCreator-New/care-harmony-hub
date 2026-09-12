import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Calendar,
  Phone,
  Mail,
  AlertTriangle,
  Pill,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { useEffect, useMemo } from 'react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useDataMasking } from '@/hooks/useDataProtection';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { evaluateVitalSigns, type VitalSignsEvaluation } from '@/modules/vital-signs';

interface PatientSidebarProps {
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    date_of_birth: string;
    gender: string;
    allergies?: string[];
    chronic_conditions?: string[];
    current_medications?: any[];
    blood_type?: string;
    phone?: string;
    email?: string;
  };
  vitals?: Record<string, any>;
}

export function PatientSidebar({ patient, vitals }: PatientSidebarProps) {
  const { logActivity } = useActivityLog();
  const { maskData } = useDataMasking();

  const vitalEval: VitalSignsEvaluation | null = useMemo(() => {
    if (!vitals || Object.keys(vitals).length === 0) return null;
    return evaluateVitalSigns(vitals);
  }, [vitals]);

  useEffect(() => {
    if (patient) {
      // Log patient record access with masked data for audit purposes
      const maskedPatientData = maskData({
        patient_name: `${patient.first_name} ${patient.last_name}`,
        mrn: patient.mrn,
        age: differenceInYears(new Date(), new Date(patient.date_of_birth)),
        gender: patient.gender,
        blood_type: patient.blood_type,
        allergies_count: patient.allergies?.length || 0,
        chronic_conditions_count: patient.chronic_conditions?.length || 0,
        medications_count: patient.current_medications?.length || 0,
      });

      logActivity({
        actionType: 'patient_record_view',
        entityType: 'patient',
        entityId: patient.id,
        details: maskedPatientData,
      });
    }
  }, [patient, logActivity, maskData]);

  // Get task summary for this patient
  const { data: taskSummary } = useQuery({
    queryKey: ['patient-task-summary', patient?.id],
    queryFn: async () => {
      if (!patient?.id) return null;

      const { data, error } = await supabase
        .from('task_assignments')
        .select('status')
        .eq('patient_id', patient.id);

      if (error) throw error;

      const summary = {
        pending: data.filter((task) => task.status === 'pending').length,
        in_progress: data.filter((task) => task.status === 'in_progress').length,
        completed: data.filter((task) => task.status === 'completed').length,
        total: data.length,
      };

      return summary;
    },
    enabled: !!patient?.id,
  });

  if (!patient) return null;

  const age = differenceInYears(new Date(), new Date(patient.date_of_birth));

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-4 w-4" />
          Patient Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">
            {patient.first_name} {patient.last_name}
          </h3>
          <p className="text-sm text-muted-foreground">MRN: {patient.mrn}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(patient.date_of_birth), 'MMM d, yyyy')} ({age} yrs)
            </span>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="capitalize">
              {patient.gender}
            </Badge>
            {patient.blood_type && <Badge variant="outline">{patient.blood_type}</Badge>}
          </div>
        </div>

        <Separator />

        {/* Triage Vitals & Deterioration Status */}
        {vitalEval && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-primary" />
                  Triage Vitals & NEWS2
                </h4>
                <Badge
                  variant={
                    vitalEval.news2.riskLevel === 'high'
                      ? 'destructive'
                      : vitalEval.news2.riskLevel === 'medium'
                        ? 'secondary'
                        : 'outline'
                  }
                  className={
                    vitalEval.news2.riskLevel === 'high'
                      ? 'bg-red-600 text-white font-bold animate-pulse'
                      : vitalEval.news2.riskLevel === 'medium'
                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                  }
                >
                  Score: {vitalEval.news2.totalScore} ({vitalEval.news2.riskLevel.toUpperCase()})
                </Badge>
              </div>

              {vitalEval.news2.totalScore >= 5 && (
                <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-red-600 shrink-0" />
                  <div>
                    <span className="font-semibold">Response: </span>
                    {vitalEval.news2.clinicalResponse}
                  </div>
                </div>
              )}

              {vitalEval.criticalAlert.criticalFlags.length > 0 && (
                <div className="space-y-1">
                  {vitalEval.criticalAlert.criticalFlags.map((flag, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1"
                    >
                      <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground pt-1">
                {vitals?.temperature && (
                  <div>
                    Temp:{' '}
                    <span className="font-medium text-foreground">{vitals.temperature}°C</span>
                  </div>
                )}
                {(vitals?.blood_pressure || (vitals?.systolic_bp && vitals?.diastolic_bp)) && (
                  <div>
                    BP:{' '}
                    <span className="font-medium text-foreground">
                      {vitals.blood_pressure || `${vitals.systolic_bp}/${vitals.diastolic_bp}`}
                    </span>
                  </div>
                )}
                {(vitals?.heart_rate || vitals?.pulse) && (
                  <div>
                    HR:{' '}
                    <span className="font-medium text-foreground">
                      {vitals.heart_rate || vitals.pulse} bpm
                    </span>
                  </div>
                )}
                {vitals?.oxygen_saturation && (
                  <div>
                    SpO₂:{' '}
                    <span className="font-medium text-foreground">{vitals.oxygen_saturation}%</span>
                  </div>
                )}
                {vitals?.respiratory_rate && (
                  <div>
                    RR:{' '}
                    <span className="font-medium text-foreground">
                      {vitals.respiratory_rate}/min
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Contact */}
        {(patient.phone || patient.email) && (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Contact</h4>
              {patient.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{patient.email}</span>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Allergies */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            Allergies
          </h4>
          {patient.allergies && patient.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {patient.allergies.map((allergy) => (
                <Badge key={allergy} variant="destructive" className="text-xs">
                  {allergy}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No known allergies</p>
          )}
        </div>

        <Separator />

        {/* Chronic Conditions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Chronic Conditions</h4>
          {patient.chronic_conditions && patient.chronic_conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {patient.chronic_conditions.map((condition) => (
                <Badge key={condition} variant="secondary" className="text-xs">
                  {condition}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">None recorded</p>
          )}
        </div>

        <Separator />

        {/* Current Medications */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Pill className="h-3 w-3" />
            Current Medications
          </h4>
          {patient.current_medications && patient.current_medications.length > 0 ? (
            <ul className="text-sm text-muted-foreground space-y-1">
              {patient.current_medications.map((med: any) => (
                <li key={med?.id ?? med?.name ?? String(med)}>
                  {typeof med === 'string' ? med : med.name || 'Unknown'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None recorded</p>
          )}
        </div>

        <Separator />

        {/* Task Summary */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Active Tasks</h4>
          {taskSummary ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 bg-orange-50 rounded-md">
                <AlertCircle className="h-4 w-4 text-orange-600 mb-1" />
                <span className="text-xs font-medium text-orange-700">{taskSummary.pending}</span>
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-blue-50 rounded-md">
                <Clock className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-xs font-medium text-blue-700">{taskSummary.in_progress}</span>
                <span className="text-xs text-muted-foreground">In Progress</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-green-50 rounded-md">
                <CheckCircle2 className="h-4 w-4 text-green-600 mb-1" />
                <span className="text-xs font-medium text-green-700">{taskSummary.completed}</span>
                <span className="text-xs text-muted-foreground">Completed</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
