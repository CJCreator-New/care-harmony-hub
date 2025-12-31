import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Scale,
  Ruler,
  Calendar,
  User,
  AlertTriangle,
  Pill,
} from 'lucide-react';
import { usePatientProfile, usePatientVitals } from '@/hooks/usePatientPortal';
import { format, parseISO, differenceInYears } from 'date-fns';

export default function PatientMedicalHistoryPage() {
  const { data: profile, isLoading: profileLoading } = usePatientProfile();
  const { data: vitals = [], isLoading: vitalsLoading } = usePatientVitals();

  const latestVitals = vitals[0];

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medical History</h1>
          <p className="text-muted-foreground">Your health profile and vital signs</p>
        </div>

        {profileLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : profile ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MRN</p>
                    <p className="font-medium">{profile.mrn}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {format(parseISO(profile.date_of_birth), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p className="font-medium">
                      {differenceInYears(new Date(), parseISO(profile.date_of_birth))} years
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium capitalize">{profile.gender?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Blood Type</p>
                    <p className="font-medium">{profile.blood_type || 'Not recorded'}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Contact</p>
                  <p className="font-medium">{profile.phone || 'No phone'}</p>
                  <p className="text-sm text-muted-foreground">{profile.email || 'No email'}</p>
                </div>

                {(profile.address || profile.city) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Address</p>
                    <p className="font-medium">
                      {[profile.address, profile.city, profile.state, profile.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact & Insurance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Emergency & Insurance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Emergency Contact</p>
                  {profile.emergency_contact_name ? (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium">{profile.emergency_contact_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.emergency_contact_relationship}
                      </p>
                      <p className="text-sm">{profile.emergency_contact_phone}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No emergency contact on file</p>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Insurance Information</p>
                  {profile.insurance_provider ? (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium">{profile.insurance_provider}</p>
                      <p className="text-sm text-muted-foreground">
                        Policy: {profile.insurance_policy_number}
                      </p>
                      {profile.insurance_group_number && (
                        <p className="text-sm text-muted-foreground">
                          Group: {profile.insurance_group_number}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No insurance on file</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Allergies & Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Allergies & Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Known Allergies</p>
                  {profile.allergies && profile.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No known allergies</p>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Chronic Conditions</p>
                  {profile.chronic_conditions && profile.chronic_conditions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.chronic_conditions.map((condition, index) => (
                        <Badge key={index} variant="outline">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No chronic conditions</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Latest Vitals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Latest Vital Signs
                </CardTitle>
                {latestVitals && (
                  <CardDescription>
                    Recorded on {format(parseISO(latestVitals.recorded_at), 'MMMM d, yyyy')}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {vitalsLoading ? (
                  <Skeleton className="h-32" />
                ) : latestVitals ? (
                  <div className="grid grid-cols-2 gap-4">
                    {latestVitals.blood_pressure_systolic && latestVitals.blood_pressure_diastolic && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Heart className="h-4 w-4" />
                          Blood Pressure
                        </div>
                        <p className="text-lg font-semibold">
                          {latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic}
                          <span className="text-sm font-normal text-muted-foreground ml-1">mmHg</span>
                        </p>
                      </div>
                    )}
                    {latestVitals.heart_rate && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Activity className="h-4 w-4" />
                          Heart Rate
                        </div>
                        <p className="text-lg font-semibold">
                          {latestVitals.heart_rate}
                          <span className="text-sm font-normal text-muted-foreground ml-1">bpm</span>
                        </p>
                      </div>
                    )}
                    {latestVitals.temperature && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Thermometer className="h-4 w-4" />
                          Temperature
                        </div>
                        <p className="text-lg font-semibold">
                          {latestVitals.temperature}
                          <span className="text-sm font-normal text-muted-foreground ml-1">°F</span>
                        </p>
                      </div>
                    )}
                    {latestVitals.oxygen_saturation && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Droplets className="h-4 w-4" />
                          O₂ Saturation
                        </div>
                        <p className="text-lg font-semibold">
                          {latestVitals.oxygen_saturation}
                          <span className="text-sm font-normal text-muted-foreground ml-1">%</span>
                        </p>
                      </div>
                    )}
                    {latestVitals.weight && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Scale className="h-4 w-4" />
                          Weight
                        </div>
                        <p className="text-lg font-semibold">
                          {latestVitals.weight}
                          <span className="text-sm font-normal text-muted-foreground ml-1">lbs</span>
                        </p>
                      </div>
                    )}
                    {latestVitals.height && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Ruler className="h-4 w-4" />
                          Height
                        </div>
                        <p className="text-lg font-semibold">
                          {latestVitals.height}
                          <span className="text-sm font-normal text-muted-foreground ml-1">in</span>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No vital signs recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No patient profile found</h3>
              <p className="text-muted-foreground text-center">
                Your patient profile has not been created yet. Please contact the hospital.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
