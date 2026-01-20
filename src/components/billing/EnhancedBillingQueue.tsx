import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/hooks/useBilling';
import { getSuggestedCPTCodes } from '@/hooks/useCPTCodeSuggestion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function EnhancedBillingQueue() {
  const { hospital } = useAuth();
  const { createInvoice } = useBilling();
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');

  const { data: consultations, isLoading } = useQuery({
    queryKey: ['billing-queue', hospital?.id, selectedStatus],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('consultations')
        .select(`
          *,
          patient:patients(id, mrn, first_name, last_name),
          doctor:profiles!consultations_doctor_id_fkey(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .eq('status', 'completed');

      if (selectedStatus === 'pending') {
        query = query.is('billing_notified', null);
      } else if (selectedStatus === 'billed') {
        query = query.not('billing_notified', 'is', null);
      }

      const { data, error } = await query.order('completed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id,
  });

  const handleGenerateInvoice = async (consultation: any) => {
    const duration = consultation.completed_at && consultation.started_at
      ? Math.floor((new Date(consultation.completed_at).getTime() - new Date(consultation.started_at).getTime()) / 60000)
      : 30;

    const suggestedCodes = getSuggestedCPTCodes(duration, 'moderate');

    await createInvoice({
      patient_id: consultation.patient_id,
      consultation_id: consultation.id,
      items: suggestedCodes.map(code => ({
        description: code.description,
        code: code.code,
        quantity: 1,
        unit_price: code.typical_fee,
        total: code.typical_fee,
      })),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Billing Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          {['pending', 'billed'].map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading consultations...</div>
        ) : !consultations || consultations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No {selectedStatus} consultations</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {consultations.map((consultation: any) => {
                const duration = consultation.completed_at && consultation.started_at
                  ? Math.floor((new Date(consultation.completed_at).getTime() - new Date(consultation.started_at).getTime()) / 60000)
                  : 0;

                const suggestedCodes = getSuggestedCPTCodes(duration, 'moderate');
                const estimatedTotal = suggestedCodes.reduce((sum, code) => sum + code.typical_fee, 0);

                return (
                  <div
                    key={consultation.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {consultation.patient?.first_name} {consultation.patient?.last_name}
                          </span>
                          <Badge variant="secondary">MRN: {consultation.patient?.mrn}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Doctor: Dr. {consultation.doctor?.last_name}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration: {duration} min
                          </span>
                          <span>
                            Completed {formatDistanceToNow(new Date(consultation.completed_at), { addSuffix: true })}
                          </span>
                        </div>
                        {selectedStatus === 'pending' && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <div className="font-medium mb-1">Suggested CPT Codes:</div>
                            {suggestedCodes.map((code) => (
                              <div key={code.code} className="flex justify-between">
                                <span>{code.code} - {code.description}</span>
                                <span className="font-medium">${code.typical_fee}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-bold mt-1 pt-1 border-t">
                              <span>Estimated Total:</span>
                              <span>${estimatedTotal}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {selectedStatus === 'pending' && (
                        <Button size="sm" onClick={() => handleGenerateInvoice(consultation)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
