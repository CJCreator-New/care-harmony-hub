import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, AlertTriangle, CheckCircle, X, Shield, Users } from 'lucide-react';
import { MedicationSchedule, MARAdministration } from '@/types/nursing';

interface MARComponentProps {
  patientId: string;
  selectedDate: string;
  medications: MedicationSchedule[];
  administrations: MARAdministration[];
  onAdminister: (administration: Partial<MARAdministration>) => void;
  onUpdateAdministration: (id: string, updates: Partial<MARAdministration>) => void;
}

export const MARComponent: React.FC<MARComponentProps> = ({
  patientId,
  selectedDate,
  medications,
  administrations,
  onAdminister,
  onUpdateAdministration
}) => {
  const [selectedMed, setSelectedMed] = useState<MedicationSchedule | null>(null);
  const [adminModal, setAdminModal] = useState(false);
  const [adminData, setAdminData] = useState<Partial<MARAdministration>>({});

  const getAdministrationStatus = (medId: string, scheduledTime: string) => {
    return administrations.find(
      admin => admin.medication_schedule_id === medId && 
               admin.scheduled_time.includes(scheduledTime)
    );
  };

  const openAdministrationModal = (medication: MedicationSchedule, scheduledTime: string) => {
    const existingAdmin = getAdministrationStatus(medication.id, scheduledTime);
    
    setSelectedMed(medication);
    setAdminData({
      medication_schedule_id: medication.id,
      patient_id: patientId,
      scheduled_time: `${selectedDate}T${scheduledTime}:00`,
      status: existingAdmin?.status || 'scheduled',
      administration_notes: existingAdmin?.administration_notes || '',
      reason_not_given: existingAdmin?.reason_not_given || ''
    });
    setAdminModal(true);
  };

  const handleAdministration = () => {
    if (selectedMed && adminData.status) {
      const administration: Partial<MARAdministration> = {
        ...adminData,
        actual_time: adminData.status === 'given' ? new Date().toISOString() : undefined
      };
      
      onAdminister(administration);
      setAdminModal(false);
      setSelectedMed(null);
      setAdminData({});
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'given': return 'bg-green-100 text-green-800';
      case 'refused': return 'bg-red-100 text-red-800';
      case 'held': return 'bg-yellow-100 text-yellow-800';
      case 'missed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'given': return <CheckCircle className="h-3 w-3" />;
      case 'refused': return <X className="h-3 w-3" />;
      case 'held': return <AlertTriangle className="h-3 w-3" />;
      case 'missed': return <Clock className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const timeSlots = ['06:00', '08:00', '12:00', '14:00', '18:00', '20:00', '22:00'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Medication Administration Record (MAR)</span>
            <Badge variant="outline">{selectedDate}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Medication</th>
                  <th className="text-left p-2 font-medium">Dosage/Route</th>
                  {timeSlots.map(time => (
                    <th key={time} className="text-center p-2 font-medium min-w-[80px]">
                      {time}
                    </th>
                  ))}
                  <th className="text-left p-2 font-medium">PRN</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((medication) => (
                  <tr key={medication.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="font-medium">{medication.medication_name}</div>
                      {medication.high_alert_medication && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          High Alert
                        </Badge>
                      )}
                      {medication.requires_double_check && (
                        <Badge variant="outline" className="text-xs mt-1 ml-1">
                          <Users className="h-3 w-3 mr-1" />
                          Double Check
                        </Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="text-sm">{medication.dosage}</div>
                      <div className="text-xs text-muted-foreground">{medication.route}</div>
                    </td>
                    {timeSlots.map(time => {
                      const isScheduled = medication.scheduled_times.includes(time);
                      const administration = getAdministrationStatus(medication.id, time);
                      
                      return (
                        <td key={time} className="p-2 text-center">
                          {isScheduled ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className={`w-16 h-8 ${administration ? getStatusColor(administration.status) : ''}`}
                              onClick={() => openAdministrationModal(medication, time)}
                            >
                              {administration ? (
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(administration.status)}
                                  <span className="text-xs">
                                    {administration.status === 'given' ? '✓' : 
                                     administration.status === 'refused' ? 'R' :
                                     administration.status === 'held' ? 'H' :
                                     administration.status === 'missed' ? 'M' : '○'}
                                  </span>
                                </div>
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2">
                      {medication.frequency === 'prn' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdministrationModal(medication, 'PRN')}
                        >
                          Give PRN
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {medications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No medications scheduled for this date
            </div>
          )}
        </CardContent>
      </Card>

      {/* Administration Modal */}
      <Dialog open={adminModal} onOpenChange={setAdminModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Medication Administration</DialogTitle>
          </DialogHeader>
          
          {selectedMed && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{selectedMed.medication_name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedMed.dosage} • {selectedMed.route}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Scheduled: {adminData.scheduled_time?.split('T')[1]?.substring(0, 5)}
                </div>
                {selectedMed.instructions && (
                  <div className="text-xs mt-2 p-2 bg-blue-50 rounded">
                    <strong>Instructions:</strong> {selectedMed.instructions}
                  </div>
                )}
              </div>

              {selectedMed.high_alert_medication && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">High Alert Medication</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Extra caution required. Verify patient identity and dosage.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="status">Administration Status</Label>
                <Select
                  value={adminData.status}
                  onValueChange={(value) => setAdminData(prev => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="given">Given</SelectItem>
                    <SelectItem value="refused">Patient Refused</SelectItem>
                    <SelectItem value="held">Held</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {adminData.status !== 'given' && (
                <div>
                  <Label htmlFor="reason">Reason Not Given</Label>
                  <Textarea
                    id="reason"
                    value={adminData.reason_not_given}
                    onChange={(e) => setAdminData(prev => ({ ...prev, reason_not_given: e.target.value }))}
                    placeholder="Explain why medication was not administered..."
                    rows={2}
                  />
                </div>
              )}

              {selectedMed.frequency === 'prn' && adminData.status === 'given' && (
                <div>
                  <Label htmlFor="effectiveness">Effectiveness (1-10)</Label>
                  <Input
                    id="effectiveness"
                    type="number"
                    min="1"
                    max="10"
                    value={adminData.effectiveness_score || ''}
                    onChange={(e) => setAdminData(prev => ({ 
                      ...prev, 
                      effectiveness_score: parseInt(e.target.value) || undefined 
                    }))}
                    placeholder="Rate effectiveness..."
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes">Administration Notes</Label>
                <Textarea
                  id="notes"
                  value={adminData.administration_notes}
                  onChange={(e) => setAdminData(prev => ({ ...prev, administration_notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              {selectedMed.requires_double_check && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Double Check Required</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    A second nurse must verify this administration.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAdminModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdministration} disabled={!adminData.status}>
                  Record Administration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};