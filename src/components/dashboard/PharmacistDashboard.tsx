import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  User,
} from 'lucide-react';
import { usePrescriptionsRealtime } from '@/hooks/usePrescriptions';
import { useMedicationStats } from '@/hooks/useMedications';
import { usePharmacyStats, usePendingPrescriptions } from '@/hooks/usePharmacyLabStats';
import { LowStockAlert } from '@/components/inventory/LowStockAlert';
import { format, formatDistanceToNow } from 'date-fns';

export function PharmacistDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = usePharmacyStats();
  const { data: inventoryStats } = useMedicationStats();
  const { data: pendingRx, isLoading: rxLoading } = usePendingPrescriptions();

  // Enable realtime updates
  usePrescriptionsRealtime();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const hasAlerts = (rx: any) => {
    return (rx.drug_interactions && rx.drug_interactions.length > 0) ||
           (rx.allergy_alerts && rx.allergy_alerts.length > 0);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, {profile?.first_name || 'Pharmacist'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Prescriptions and medication management.
            </p>
          </div>
          <Badge variant="pharmacy" className="w-fit text-sm py-1.5 px-4">
            Pharmacist
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button asChild>
          <Link to="/pharmacy">
            <Pill className="h-4 w-4 mr-2" />
            Pending Prescriptions
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/inventory">
            <Package className="h-4 w-4 mr-2" />
            Manage Inventory
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/pharmacy?tab=refills">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refill Requests
            {(stats?.refillRequests || 0) > 0 && (
              <Badge variant="destructive" className="ml-2">{stats?.refillRequests}</Badge>
            )}
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Pending Rx"
          value={statsLoading ? '--' : String(stats?.pending || 0)}
          subtitle="To dispense"
          icon={FileText}
          variant="warning"
        />
        <StatsCard
          title="Dispensed Today"
          value={statsLoading ? '--' : String(stats?.dispensedToday || 0)}
          subtitle="Completed"
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Refill Requests"
          value={statsLoading ? '--' : String(stats?.refillRequests || 0)}
          subtitle="Pending review"
          icon={RefreshCw}
          variant="primary"
        />
        <StatsCard
          title="Drug Alerts"
          value={statsLoading ? '--' : String(stats?.drugInteractionAlerts || 0)}
          subtitle="Need attention"
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                Prescription Queue
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/pharmacy">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {rxLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : pendingRx && pendingRx.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {pendingRx.slice(0, 10).map((rx: any) => (
                      <div
                        key={rx.id}
                        className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate('/pharmacy')}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {rx.patient?.first_name} {rx.patient?.last_name}
                            </span>
                            <Badge variant={getPriorityColor(rx.priority) as any}>
                              {rx.priority || 'normal'}
                            </Badge>
                            {hasAlerts(rx) && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Alert
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            MRN: {rx.patient?.mrn}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {rx.items?.length || 0} medication{(rx.items?.length || 0) !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(rx.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {rx.items && rx.items.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {rx.items.slice(0, 3).map((item: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {item.medication_name}
                                </Badge>
                              ))}
                              {rx.items.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{rx.items.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button size="sm">Dispense</Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">All caught up!</p>
                  <p className="text-sm">No pending prescriptions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <LowStockAlert />

          {/* Inventory Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Inventory Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Items</span>
                <span className="font-medium">{inventoryStats?.total ?? '--'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Low Stock</span>
                <span className="font-medium text-warning">{inventoryStats?.lowStock ?? '--'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Out of Stock</span>
                <span className="font-medium text-destructive">{inventoryStats?.outOfStock ?? '--'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Expiring Soon</span>
                <span className="font-medium text-orange-500">{inventoryStats?.expiringSoon ?? '--'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
