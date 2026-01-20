import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Scan, Check } from 'lucide-react';

export function BarcodeSampleScanner() {
  const [barcode, setBarcode] = useState('');
  const queryClient = useQueryClient();

  const scanMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase
        .from('lab_orders')
        .update({ 
          status: 'sample_collected',
          sample_collected_at: new Date().toISOString(),
          barcode: code,
        })
        .eq('id', code.split('-')[1])
        .select('id, patient:patients(first_name, last_name)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Sample collected for ${data.patient?.first_name} ${data.patient?.last_name}`);
      setBarcode('');
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
    },
    onError: () => toast.error('Invalid barcode or sample already collected'),
  });

  const handleScan = () => {
    if (barcode) scanMutation.mutate(barcode);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Sample Barcode Scanner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="Scan or enter barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            autoFocus
          />
          <Button onClick={handleScan} disabled={!barcode || scanMutation.isPending}>
            <Check className="h-4 w-4 mr-2" />
            Collect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
