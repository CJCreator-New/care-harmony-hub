import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { MedicationReconciliation, HomeMedication, DiscontinuedMedication, NewMedication } from '@/types/nursing';

interface MedicationReconciliationCardProps {
  patientId: string;
  appointmentId?: string;
  onSave: (reconciliation: Partial<MedicationReconciliation>) => void;
  existingReconciliation?: MedicationReconciliation;
}

export const MedicationReconciliationCard: React.FC<MedicationReconciliationCardProps> = ({
  patientId,
  appointmentId,
  onSave,
  existingReconciliation
}) => {
  const [reconciliation, setReconciliation] = useState<Partial<MedicationReconciliation>>(
    existingReconciliation || {
      patient_id: patientId,
      appointment_id: appointmentId,
      home_medications: [],
      discontinued_medications: [],
      new_medications: [],
      patient_verified: false,
      pharmacy_verified: false,
      physician_reviewed: false,
      discrepancies_found: false
    }
  );

  const [newHomeMed, setNewHomeMed] = useState<Partial<HomeMedication>>({
    name: '',
    dosage: '',
    frequency: '',
    route: '',
    still_taking: true
  });

  const addHomeMedication = () => {
    if (newHomeMed.name && newHomeMed.dosage) {
      setReconciliation(prev => ({
        ...prev,
        home_medications: [...(prev.home_medications || []), newHomeMed as HomeMedication]
      }));
      setNewHomeMed({ name: '', dosage: '', frequency: '', route: '', still_taking: true });
    }
  };

  const removeHomeMedication = (index: number) => {
    setReconciliation(prev => ({
      ...prev,
      home_medications: prev.home_medications?.filter((_, i) => i !== index)
    }));
  };

  const discontinueMedication = (med: HomeMedication, reason: string) => {
    const discontinued: DiscontinuedMedication = {
      name: med.name,
      dosage: med.dosage,
      reason_discontinued: reason,
      discontinued_date: new Date().toISOString().split('T')[0],
      discontinued_by: 'Current User' // Should be actual user
    };

    setReconciliation(prev => ({
      ...prev,
      discontinued_medications: [...(prev.discontinued_medications || []), discontinued],
      home_medications: prev.home_medications?.filter(m => m !== med)
    }));
  };

  const handleVerificationChange = (field: 'patient_verified' | 'pharmacy_verified' | 'physician_reviewed') => {
    setReconciliation(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = () => {
    onSave({
      ...reconciliation,
      completed_at: new Date().toISOString()
    });
  };

  const isComplete = reconciliation.patient_verified && 
                   reconciliation.pharmacy_verified && 
                   reconciliation.physician_reviewed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Medication Reconciliation</span>
          <div className="flex items-center gap-2">
            {isComplete ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                In Progress
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="home">
              Home Medications ({reconciliation.home_medications?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="discontinued">
              Discontinued ({reconciliation.discontinued_medications?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="new">
              New Medications ({reconciliation.new_medications?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-4">
            {/* Add New Home Medication */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-3">Add Home Medication</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label>Medication Name</Label>
                  <Input
                    value={newHomeMed.name}
                    onChange={(e) => setNewHomeMed(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Lisinopril"
                  />
                </div>
                <div>
                  <Label>Dosage</Label>
                  <Input
                    value={newHomeMed.dosage}
                    onChange={(e) => setNewHomeMed(prev => ({ ...prev, dosage: e.target.value }))}
                    placeholder="e.g., 10mg"
                  />
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Input
                    value={newHomeMed.frequency}
                    onChange={(e) => setNewHomeMed(prev => ({ ...prev, frequency: e.target.value }))}
                    placeholder="e.g., Once daily"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addHomeMedication} disabled={!newHomeMed.name || !newHomeMed.dosage}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Home Medications List */}
            <div className="space-y-2">
              {reconciliation.home_medications?.map((med, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{med.name} {med.dosage}</div>
                    <div className="text-sm text-muted-foreground">
                      {med.frequency} • {med.route}
                      {med.prescriber && ` • Prescribed by: ${med.prescriber}`}
                    </div>
                    {!med.still_taking && (
                      <Badge variant="destructive" className="mt-1">Not Currently Taking</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => discontinueMedication(med, 'Patient request')}
                    >
                      Discontinue
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHomeMedication(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!reconciliation.home_medications || reconciliation.home_medications.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No home medications recorded
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="discontinued" className="space-y-4">
            <div className="space-y-2">
              {reconciliation.discontinued_medications?.map((med, index) => (
                <div key={index} className="p-3 border rounded-lg bg-red-50">
                  <div className="font-medium">{med.name} {med.dosage}</div>
                  <div className="text-sm text-muted-foreground">
                    Discontinued: {med.discontinued_date} • Reason: {med.reason_discontinued}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    By: {med.discontinued_by}
                  </div>
                </div>
              ))}
              {(!reconciliation.discontinued_medications || reconciliation.discontinued_medications.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No discontinued medications
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="space-y-2">
              {reconciliation.new_medications?.map((med, index) => (
                <div key={index} className="p-3 border rounded-lg bg-green-50">
                  <div className="font-medium">{med.name} {med.dosage}</div>
                  <div className="text-sm text-muted-foreground">
                    {med.frequency} • Start: {med.start_date}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Indication: {med.indication} • Prescribed by: {med.prescriber}
                  </div>
                </div>
              ))}
              {(!reconciliation.new_medications || reconciliation.new_medications.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No new medications prescribed
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Verification Section */}
        <div className="mt-6 space-y-4">
          <h4 className="font-medium">Verification Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="patient_verified"
                checked={reconciliation.patient_verified}
                onCheckedChange={() => handleVerificationChange('patient_verified')}
              />
              <Label htmlFor="patient_verified">Patient Verified</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pharmacy_verified"
                checked={reconciliation.pharmacy_verified}
                onCheckedChange={() => handleVerificationChange('pharmacy_verified')}
              />
              <Label htmlFor="pharmacy_verified">Pharmacy Verified</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="physician_reviewed"
                checked={reconciliation.physician_reviewed}
                onCheckedChange={() => handleVerificationChange('physician_reviewed')}
              />
              <Label htmlFor="physician_reviewed">Physician Reviewed</Label>
            </div>
          </div>
        </div>

        {/* Discrepancies */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="discrepancies_found"
              checked={reconciliation.discrepancies_found}
              onCheckedChange={(checked) => 
                setReconciliation(prev => ({ ...prev, discrepancies_found: checked as boolean }))
              }
            />
            <Label htmlFor="discrepancies_found" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Discrepancies Found
            </Label>
          </div>
          
          {reconciliation.discrepancies_found && (
            <div className="space-y-2">
              <div>
                <Label htmlFor="discrepancy_details">Discrepancy Details</Label>
                <Textarea
                  id="discrepancy_details"
                  value={reconciliation.discrepancy_details || ''}
                  onChange={(e) => setReconciliation(prev => ({ 
                    ...prev, 
                    discrepancy_details: e.target.value 
                  }))}
                  placeholder="Describe the discrepancies found..."
                />
              </div>
              <div>
                <Label htmlFor="resolution_notes">Resolution Notes</Label>
                <Textarea
                  id="resolution_notes"
                  value={reconciliation.resolution_notes || ''}
                  onChange={(e) => setReconciliation(prev => ({ 
                    ...prev, 
                    resolution_notes: e.target.value 
                  }))}
                  placeholder="How were the discrepancies resolved?"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={!isComplete}>
            {isComplete ? 'Save Reconciliation' : 'Complete All Verifications'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};