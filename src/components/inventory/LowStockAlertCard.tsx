import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInventoryAutomation } from '@/hooks/useInventoryAutomation';
import { AlertTriangle, Package, Check, Clock } from 'lucide-react';

export const LowStockAlertCard = () => {
  const { activeAlerts, acknowledgeAlert, resolveAlert } = useInventoryAutomation();

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'out_of_stock': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'low_stock': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'expiring_soon': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'expired': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'out_of_stock': return <Package className="w-4 h-4" />;
      case 'low_stock': return <AlertTriangle className="w-4 h-4" />;
      case 'expiring_soon': return <Clock className="w-4 h-4" />;
      case 'expired': return <AlertTriangle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (activeAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            Inventory Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            All inventory levels are healthy
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-600">
          <AlertTriangle className="w-5 h-5" />
          Stock Alerts ({activeAlerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {activeAlerts.slice(0, 10).map((alert) => (
            <div 
              key={alert.id} 
              className={`flex items-center justify-between p-3 rounded-lg border ${getAlertColor(alert.alert_type)}`}
            >
              <div className="flex items-center gap-3">
                {getAlertIcon(alert.alert_type)}
                <div>
                  <p className="font-medium text-sm">{alert.medication?.name}</p>
                  <p className="text-xs opacity-80">
                    {alert.current_quantity} / {alert.threshold_quantity} units
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {alert.alert_type.replace('_', ' ')}
                </Badge>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => acknowledgeAlert.mutate(alert.id)}
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
