import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CheckInKiosk } from '@/components/receptionist/CheckInKiosk';
import { useToast } from '@/hooks/use-toast';

export default function KioskPage() {
  const { toast } = useToast();

  return (
    <DashboardLayout>
      <div className="rounded-xl overflow-hidden border border-border bg-background">
        <CheckInKiosk
          onCheckIn={(patientId) => {
            toast({
              title: 'Patient checked in',
              description: `Kiosk flow completed for patient ${patientId}.`,
            });
          }}
          onNewRegistration={() => {
            toast({
              title: 'Registration handoff',
              description: 'Continue the new-patient workflow at the reception desk.',
            });
          }}
        />
      </div>
    </DashboardLayout>
  );
}
