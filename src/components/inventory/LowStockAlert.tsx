import { AlertTriangle, TrendingDown, Pill } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLowStockMedications, Medication } from '@/hooks/useMedications';
import { Link } from 'react-router-dom';

export function LowStockAlert() {
  const { data: lowStockMeds, isLoading } = useLowStockMedications();

  if (isLoading) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const outOfStock = lowStockMeds?.filter(m => m.current_stock === 0) || [];
  const lowStock = lowStockMeds?.filter(m => m.current_stock > 0) || [];

  if (!lowStockMeds || lowStockMeds.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-success">
            <Pill className="h-5 w-5" />
            Stock Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            All medications are adequately stocked
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Low Stock Alerts
          </CardTitle>
          <Badge variant="destructive">{lowStockMeds.length} items</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="divide-y">
            {outOfStock.length > 0 && (
              <div className="p-3 bg-destructive/10">
                <p className="text-sm font-medium text-destructive flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Out of Stock ({outOfStock.length})
                </p>
              </div>
            )}
            {outOfStock.map((med) => (
              <MedicationAlertItem key={med.id} medication={med} isOutOfStock />
            ))}
            
            {lowStock.length > 0 && (
              <div className="p-3 bg-warning/10">
                <p className="text-sm font-medium text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Low Stock ({lowStock.length})
                </p>
              </div>
            )}
            {lowStock.map((med) => (
              <MedicationAlertItem key={med.id} medication={med} />
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 border-t">
          <Button asChild variant="outline" className="w-full">
            <Link to="/inventory">Manage Inventory</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MedicationAlertItem({ 
  medication, 
  isOutOfStock = false 
}: { 
  medication: Medication; 
  isOutOfStock?: boolean;
}) {
  return (
    <div className="p-3 hover:bg-muted/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm">{medication.name}</p>
          {medication.generic_name && (
            <p className="text-xs text-muted-foreground">{medication.generic_name}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {medication.form} {medication.strength}
          </p>
        </div>
        <div className="text-right">
          <Badge variant={isOutOfStock ? 'destructive' : 'secondary'}>
            {medication.current_stock} / {medication.minimum_stock}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            {medication.unit}
          </p>
        </div>
      </div>
    </div>
  );
}
