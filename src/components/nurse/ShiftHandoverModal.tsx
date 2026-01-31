import { useState, useEffect } from 'react';
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
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  Loader2,
  ClipboardList,
  User,
} from 'lucide-react';
import { useCreateHandover, usePendingHandovers, useAcknowledgeHandover } from '@/hooks/useNurseWorkflow';
import { useActiveQueue } from '@/hooks/useQueue';
import { format } from 'date-fns';

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
  patient_id?: string;
}

export function ShiftHandoverModal({ open, onOpenChange, mode }: ShiftHandoverModalProps) {
  const [shiftType, setShiftType] = useState<string>('day');
  const [criticalPatients, setCriticalPatients] = useState<CriticalPatient[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [notes, setNotes] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientNotes, setNewPatientNotes] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  const { data: queue = [] } = useActiveQueue();
  const { data: pendingHandovers = [] } = usePendingHandovers();
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
    } else if (open && mode === 'create' && queue.length > 0) {
      // Auto-populate critical patients from queue
      const criticalFromQueue = queue
        .filter(entry => entry.priority === 'emergency' || entry.priority === 'urgent')
        .map(entry => ({
          patient_id: entry.patient?.id || '',
          patient_name: `${entry.patient?.first_name} ${entry.patient?.last_name}`,
          notes: `Priority: ${entry.priority}, Status: ${entry.status}, Reason: ${entry.appointment?.reason_for_visit || 'Not specified'}`
        }));

      setCriticalPatients(criticalFromQueue);

      // Auto-generate handover notes
      const queueSummary = `Current queue: ${queue.length} patients. ${queue.filter(p => p.status === 'waiting').length} waiting, ${queue.filter(p => p.status === 'called').length} called, ${queue.filter(p => p.status === 'in_prep').length} in prep.`;
      const criticalSummary = criticalFromQueue.length > 0 ?
        `Critical patients requiring immediate attention: ${criticalFromQueue.map(p => p.patient_name).join(', ')}.` : '';

      setNotes(`${queueSummary}${criticalSummary ? ' ' + criticalSummary : ''}`);
    }
  }, [open, mode, queue]);

  const handleAddCriticalPatient = () => {
    if (!newPatientName.trim()) return;
    setCriticalPatients([
      ...criticalPatients,
      { patient_id: '', patient_name: newPatientName, notes: newPatientNotes },
    ]);
    setNewPatientName('');
    setNewPatientNotes('');
  };

  const handleRemoveCriticalPatient = (index: number) => {
    setCriticalPatients(criticalPatients.filter((_, i) => i !== index));
  };

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    setPendingTasks([...pendingTasks, { task: newTask, priority: newTaskPriority }]);
    setNewTask('');
    setNewTaskPriority('normal');
  };

  const handleRemoveTask = (index: number) => {
    setPendingTasks(pendingTasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    await createHandover.mutateAsync({
      shift_type: shiftType,
      critical_patients: criticalPatients,
      pending_tasks: pendingTasks,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  const handleAcknowledge = async (handoverId: string) => {
    await acknowledgeHandover.mutateAsync(handoverId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'warning';
      case 'normal':
        return 'secondary';
      default:
        return 'outline';
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
                        <CardTitle className="text-base">
                          {handover.shift_type.charAt(0).toUpperCase() + handover.shift_type.slice(1)} Shift
                        </CardTitle>
                        <Badge variant="warning">Pending</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        From: {handover.outgoing_nurse?.first_name} {handover.outgoing_nurse?.last_name} •{' '}
                        {format(new Date(handover.handover_time), 'MMM d, h:mm a')}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(handover.critical_patients as CriticalPatient[])?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1 mb-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            Critical Patients
                          </p>
                          <div className="space-y-2">
                            {(handover.critical_patients as CriticalPatient[]).map((cp, i) => (
                              <div key={i} className="p-2 bg-destructive/10 rounded text-sm">
                                <p className="font-medium">{cp.patient_name}</p>
                                <p className="text-muted-foreground">{cp.notes}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(handover.pending_tasks as PendingTask[])?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Pending Tasks</p>
                          <div className="space-y-1">
                            {(handover.pending_tasks as PendingTask[]).map((task, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                  {task.priority}
                                </Badge>
                                <span className="text-sm">{task.task}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {handover.notes && (
                        <div>
                          <p className="text-sm font-medium mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground">{handover.notes}</p>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={() => handleAcknowledge(handover.id)}
                        disabled={acknowledgeHandover.isPending}
                      >
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
            {/* Shift Type */}
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

            {/* Critical Patients */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Critical Patients
              </Label>

              {criticalPatients.map((cp, index) => (
                <Card key={index} className="bg-destructive/5 border-destructive/20">
                  <CardContent className="p-3 flex items-start justify-between">
                    <div>
                      <p className="font-medium">{cp.patient_name}</p>
                      <p className="text-sm text-muted-foreground">{cp.notes}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCriticalPatient(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                <Input
                  placeholder="Patient name"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                />
                <Textarea
                  placeholder="Critical notes..."
                  value={newPatientNotes}
                  onChange={(e) => setNewPatientNotes(e.target.value)}
                  rows={2}
                />
                <Button variant="outline" size="sm" onClick={handleAddCriticalPatient}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Critical Patient
                </Button>
              </div>
            </div>

            <Separator />

            {/* Pending Tasks */}
            <div className="space-y-3">
              <Label>Pending Tasks</Label>

              {pendingTasks.map((task, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                  <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  <span className="flex-1 text-sm">{task.task}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveTask(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex gap-2">
                <Input
                  placeholder="Task description"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  className="flex-1"
                />
                <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as any)}>
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
                <Button variant="outline" size="icon" onClick={handleAddTask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* General Notes */}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createHandover.isPending}>
            {createHandover.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Handover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
