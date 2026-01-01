import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  AlertTriangle, 
  RefreshCw, 
  Download,
  Mail,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useLowStockMedications, useMedicationStats } from '@/hooks/useMedications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function ReorderSystemCard() {
  const { data: lowStockMeds, isLoading } = useLowStockMedications();
  const { data: stats } = useMedicationStats();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const handleGenerateReorderReport = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-low-stock');
      
      if (error) throw error;
      
      setLastCheck(new Date().toISOString());
      
      if (data.lowStockCount === 0) {
        toast.success('All medications are well stocked!');
      } else {
        toast.success(`Reorder report generated: ${data.lowStockCount} items need attention`);
      }
    } catch (error) {
      console.error('Error generating reorder report:', error);
      toast.error('Failed to generate reorder report');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSVReport = () => {
    if (!lowStockMeds || lowStockMeds.length === 0) {
      toast.error('No low stock items to export');
      return;
    }

    const headers = ['Medication Name', 'Generic Name', 'Current Stock', 'Minimum Stock', 'Suggested Reorder', 'Status'];
    const rows = lowStockMeds.map(med => [
      med.name,
      med.generic_name || '-',
      med.current_stock.toString(),
      med.minimum_stock.toString(),
      Math.max(med.minimum_stock * 2 - med.current_stock, med.minimum_stock).toString(),
      med.current_stock === 0 ? 'OUT OF STOCK' : 
        med.current_stock <= med.minimum_stock * 0.5 ? 'CRITICAL' : 'LOW',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reorder-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Report downloaded');
  };

  const outOfStock = lowStockMeds?.filter(m => m.current_stock === 0) || [];
  const criticalStock = lowStockMeds?.filter(m => m.current_stock > 0 && m.current_stock <= m.minimum_stock * 0.5) || [];
  const lowStock = lowStockMeds?.filter(m => m.current_stock > m.minimum_stock * 0.5) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Automated Reorder System
            </CardTitle>
            <CardDescription>
              Monitor stock levels and generate supplier notifications
            </CardDescription>
          </div>
          <Button
            onClick={handleGenerateReorderReport}
            disabled={isGenerating}
            size="sm"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Stock
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stock Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total Items</div>
          </div>
          <div className="text-center p-3 bg-destructive/10 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{outOfStock.length}</div>
            <div className="text-xs text-muted-foreground">Out of Stock</div>
          </div>
          <div className="text-center p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{criticalStock.length}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </div>
          <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{lowStock.length}</div>
            <div className="text-xs text-muted-foreground">Low</div>
          </div>
        </div>

        {/* Items Needing Reorder */}
        {lowStockMeds && lowStockMeds.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Items Requiring Reorder</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {lowStockMeds.slice(0, 10).map((med) => (
                <div
                  key={med.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    {med.current_stock === 0 ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : med.current_stock <= med.minimum_stock * 0.5 ? (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <div>
                      <span className="font-medium">{med.name}</span>
                      {med.generic_name && (
                        <span className="text-muted-foreground ml-1">({med.generic_name})</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {med.current_stock} / {med.minimum_stock}
                    </span>
                    <Badge
                      variant={
                        med.current_stock === 0 ? 'destructive' :
                        med.current_stock <= med.minimum_stock * 0.5 ? 'outline' : 'secondary'
                      }
                      className={
                        med.current_stock <= med.minimum_stock * 0.5 && med.current_stock > 0
                          ? 'border-orange-500 text-orange-500'
                          : ''
                      }
                    >
                      Reorder: {Math.max(med.minimum_stock * 2 - med.current_stock, med.minimum_stock)}
                    </Badge>
                  </div>
                </div>
              ))}
              {lowStockMeds.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  + {lowStockMeds.length - 10} more items
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <h4 className="font-medium">All Stock Levels OK</h4>
            <p className="text-sm text-muted-foreground">
              No medications currently below minimum stock levels
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {lastCheck ? (
              <>Last checked: {format(new Date(lastCheck), 'MMM d, h:mm a')}</>
            ) : (
              <>Run a stock check to generate supplier notifications</>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateCSVReport}
              disabled={!lowStockMeds || lowStockMeds.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
