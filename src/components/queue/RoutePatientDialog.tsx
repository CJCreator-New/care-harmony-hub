import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAvailableDoctors, useRouteQueuePatient, type QueueEntry } from '@/hooks/useQueue';

interface RoutePatientDialogProps {
  entry: QueueEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ADR-0012: triage nurse push. Routes a waiting patient to a specific doctor and
 * room, optionally recording triage acuity and an audited emergency bypass.
 */
export function RoutePatientDialog({ entry, open, onOpenChange }: RoutePatientDialogProps) {
  const { data: doctors = [], isLoading: isLoadingDoctors } = useAvailableDoctors();
  const routePatient = useRouteQueuePatient();

  const [doctorId, setDoctorId] = useState('');
  const [room, setRoom] = useState('');
  const [acuity, setAcuity] = useState<'red' | 'amber' | 'green'>('amber');
  const [emergencyBypass, setEmergencyBypass] = useState(false);
  const [rationale, setRationale] = useState('');

  useEffect(() => {
    if (!open) {
      setDoctorId('');
      setRoom('');
      setAcuity('amber');
      setEmergencyBypass(false);
      setRationale('');
    }
  }, [open]);

  const rationaleMissing = emergencyBypass && rationale.trim().length < 5;

  const handleSubmit = async () => {
    if (!entry || !doctorId || rationaleMissing) return;

    await routePatient.mutateAsync({
      queueEntryId: entry.id,
      doctorId,
      room: room.trim() || undefined,
      acuity,
      emergencyBypass,
      bypassRationale: emergencyBypass ? rationale.trim() : undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Route to Doctor</DialogTitle>
          <DialogDescription>
            Push this patient directly to a doctor or room. The assigned doctor is notified
            immediately and the patient leaves the open pool.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="route-doctor">Doctor</Label>
            <Select value={doctorId} onValueChange={setDoctorId} disabled={isLoadingDoctors}>
              <SelectTrigger id="route-doctor">
                <SelectValue
                  placeholder={isLoadingDoctors ? 'Loading doctors…' : 'Select doctor'}
                />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    Dr. {doctor.first_name} {doctor.last_name}
                  </SelectItem>
                ))}
                {doctors.length === 0 && !isLoadingDoctors && (
                  <SelectItem value="__none" disabled>
                    No active doctors found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="route-room">Room / Bay</Label>
              <Input
                id="route-room"
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                placeholder="e.g. OPD-3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="route-acuity">Triage acuity</Label>
              <Select
                value={acuity}
                onValueChange={(value) => setAcuity(value as 'red' | 'amber' | 'green')}
              >
                <SelectTrigger id="route-acuity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="red">Red — Immediate</SelectItem>
                  <SelectItem value="amber">Amber — Urgent</SelectItem>
                  <SelectItem value="green">Green — Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <Checkbox
              id="route-bypass"
              checked={emergencyBypass}
              onCheckedChange={(checked) => setEmergencyBypass(checked === true)}
            />
            <div className="space-y-2">
              <Label htmlFor="route-bypass" className="text-sm font-medium">
                Emergency Triage Bypass
              </Label>
              <p className="text-xs text-muted-foreground">
                Starts care immediately and skips routine vitals intake. A clinical rationale is
                recorded in the audit trail.
              </p>
              {emergencyBypass && (
                <>
                  <Textarea
                    value={rationale}
                    onChange={(event) => setRationale(event.target.value)}
                    placeholder="Clinical rationale (required, at least 5 characters)"
                    rows={3}
                  />
                  {rationaleMissing && (
                    <p className="text-xs text-destructive">
                      A rationale of at least 5 characters is required.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!doctorId || rationaleMissing || routePatient.isPending}
          >
            {routePatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Route Patient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
