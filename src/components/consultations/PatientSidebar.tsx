import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Phone, Mail, AlertTriangle, Pill } from "lucide-react";
import { format, differenceInYears } from "date-fns";

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
}

export function PatientSidebar({ patient }: PatientSidebarProps) {
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
              {format(new Date(patient.date_of_birth), "MMM d, yyyy")} ({age} yrs)
            </span>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="capitalize">
              {patient.gender}
            </Badge>
            {patient.blood_type && (
              <Badge variant="outline">{patient.blood_type}</Badge>
            )}
          </div>
        </div>

        <Separator />

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
              {patient.allergies.map((allergy, index) => (
                <Badge key={index} variant="destructive" className="text-xs">
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
          <h4 className="text-sm font-medium text-foreground">
            Chronic Conditions
          </h4>
          {patient.chronic_conditions && patient.chronic_conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {patient.chronic_conditions.map((condition, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
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
              {patient.current_medications.map((med: any, index: number) => (
                <li key={index}>
                  {typeof med === "string" ? med : med.name || "Unknown"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None recorded</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
