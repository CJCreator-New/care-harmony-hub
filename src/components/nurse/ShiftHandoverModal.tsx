import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, AlertTriangle, CheckCircle2, Plus, X, Loader2, ClipboardList } from 'lucide-react';
import { useCreateHandover, usePendingHandovers, useAcknowledgeHandover } from '@/hooks/useNurseWorkflow';
import { useActiveQueue } from '@/hooks/useQueue';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ShiftHandoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'view';
}

interface CriticalPatient {
  patient_id: string;
  patient_name: string;
  notes: string;
}

interface PendingTask {
  task: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export function ShiftHandoverModal({ open, onOpenChange, mode }: ShiftHandoverModalProps) {
  const { profile, hospital } = useAuth();
  const [shiftType, setShiftType] = useState<string>('day');
  const [criticalPatients, setCriticalPatients] = useState<CriticalPatient[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [notes, setNotes] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientNotes, setNewPatientNotes] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  const { data: queue = [] } = useActiveQueue();
  const { handovers: pendingHandovers = [] } = usePendingHandovers();
  const createHandover = useCreateHandover();
  const acknowledgeHandover = useAcknowledgeHandover();

  useEffect(() => {
    if (!open) {
      setCriticalPatients([]);
      setPendingTasks([]);
      setNotes('');
      setNewPatientName('');
      setNewPatientNotes('');
      setNewTask('');
      return;
    }

    if (mode === 'create' && queue.length > 0) {
      const criticalFromQueue = queue
        .filter((entry) => entry.priority === 'emergency' || entry.priority === 'urgent')
        .map((entry) => ({
          patient_id: entry.patient?.id || '',
          patient_name: `${entry.patient?.first_name || ''} ${entry.patient?.last_name || ''}`.trim() || 'Unknown Patient',
          notes: `Priority: ${entry.priority}, Status: ${entry.status}`,
        }));

      setCriticalPatients(criticalFromQueue);

      const queueSummary = `Current queue: ${queue.length} patients. ${queue.filter((p) => p.status === 'waiting').length} waiting, ${queue.filter((p) => p.status === 'called').length} called, ${queue.filter((p) => p.status === 'in_service').length} in service.`;
      const criticalSummary = criticalFromQueue.length > 0
        ? `Critical patients: ${criticalFromQueue.map((p) => p.patient_name).join(', ')}.`
        : '';
      setNotes(`${queueSummary}${criticalSummary ? ` ${criticalSummary}` : ''}`);
    }
  }, [open, mode, queue]);

  const handleAddCriticalPatient = () => {
    if (!newPatientName.trim()) {
      toast.error('Patient name is required');
      return;
    }
    setCriticalPatients([...criticalPatients, { patient_id: '', patient_name: newPatientName.trim(), notes: newPatientNotes.trim() }]);
    setNewPatientName('');
    setNewPatientNotes('');
  };

  const handleAddTask = () => {
    if (!newTask.trim()) {
      toast.error('Task description is required');
      return;
    }
    setPendingTasks([...pendingTasks, { task: newTask.trim(), priority: newTaskPriority }]);
    setNewTask('');
    setNewTaskPriority('normal');
  };

  const handleSubmit = async () => {
    if (!profile?.id || !hospital?.id) {
      toast.error('Missing user or hospital context');
      return;
    }

    if (!notes.trim() && criticalPatients.length === 0 && pendingTasks.length === 0) {
      toast.error('Add notes, critical patients, or pending tasks before submitting');
      return;
    }

    const handoverNotes = [
      notes.trim(),
      criticalPatients.length ? `Critical: ${criticalPatients.map((cp) => `${cp.patient_name}${cp.notes ? ` (${cp.notes})` : ''}`).join('; ')}` : '',
      pendingTasks.length ? `Pending tasks: ${pendingTasks.map((task) => `${task.task} [${task.priority}]`).join('; ')}` : '',
      `Shift: ${shiftType}`,
    ].filter(Boolean).join('\n\n');

    try {
      await createHandover.mutateAsync({
        outgoing_nurse_id: profile.id,
        shift_date: new Date().toISOString().slice(0, 10),
        shift_type: shiftType,
        notes: handoverNotes,
        pending_tasks: pendingTasks.map((task) => task.task),
        status: 'pending',
        hospital_id: hospital.id,
      } as any);
      toast.success('Handover submitted');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message ? `Failed to submit handover: ${error.message}` : 'Failed to submit handover');
    }
  };

  const handleAcknowledge = async (handoverId: string) => {
    try {
      await acknowledgeHandover.mutateAsync(handoverId);
      toast.success('Handover acknowledged');
    } catch (error: any) {
      toast.error(error?.message ? `Failed to acknowledge handover: ${error.message}` : 'Failed to acknowledge handover');
    }
  };

  if (mode === 'view') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Pending Handovers
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {pendingHandovers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending handovers</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingHandovers.map((handover) => (
                  <Card key={handover.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Shift Handover</CardTitle>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Date: {handover.shift_date ? format(new Date(handover.shift_date), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(handover as any).pending_tasks?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Priority Items</p>
                          <div className="space-y-1">
                            {(handover as any).pending_tasks.map((task: string) => (
                              <div key={task} className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">Pending</Badge>
                                <span className="text-sm">{task}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {handover.notes && (
                        <div>
                          <p className="text-sm font-medium mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{handover.notes}</p>
                        </div>
                      )}

                      <Button className="w-full" onClick={() => handleAcknowledge(handover.id)} disabled={acknowledgeHandover.isPending}>
                        {acknowledgeHandover.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Acknowledge Handover
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Create Shift Handover
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Shift Type</Label>
              <Select value={shiftType} onValueChange={setShiftType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift (7 AM - 3 PM)</SelectItem>
                  <SelectItem value="evening">Evening Shift (3 PM - 11 PM)</SelectItem>
                  <SelectItem value="night">Night Shift (11 PM - 7 AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Critical Patients
              </Label>

              {criticalPatients.map((cp, index) => (
                <Card key={`${cp.patient_name}-${cp.notes}-${index}`} className="bg-destructive/5 border-destructive/20">
                  <CardContent className="p-3 flex items-start justify-between">
                    <div>
                      <p className="font-medium">{cp.patient_name}</p>
                      <p className="text-sm text-muted-foreground">{cp.notes}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setCriticalPatients(criticalPatients.filter((_, i) => i !== index))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                <Input placeholder="Patient name" value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} />
                <Textarea placeholder="Critical notes..." value={newPatientNotes} onChange={(e) => setNewPatientNotes(e.target.value)} rows={2} />
                <Button variant="outline" size="sm" onClick={handleAddCriticalPatient}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Critical Patient
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Pending Tasks</Label>

              {pendingTasks.map((task, index) => (
                <div key={`${task.task}-${task.priority}-${index}`} className="flex items-center gap-2 p-2 border rounded-lg">
                  <Badge variant="secondary">{task.priority}</Badge>
                  <span className="flex-1 text-sm">{task.task}</span>
                  <Button variant="ghost" size="icon" onClick={() => setPendingTasks(pendingTasks.filter((_, i) => i !== index))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex gap-2">
                <Input placeholder="Task description" value={newTask} onChange={(e) => setNewTask(e.target.value)} className="flex-1" />
                <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as 'low' | 'normal' | 'high' | 'urgent')}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleAddTask} aria-label="Add task">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>General Notes</Label>
              <Textarea
                placeholder="Any additional notes for the incoming shift..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createHandover.isPending}>
            {createHandover.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Handover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
