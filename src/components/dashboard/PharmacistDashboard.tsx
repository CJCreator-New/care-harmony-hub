import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  FileText,
  Search,
} from 'lucide-react';
import { usePrescriptionStats, usePrescriptionsRealtime } from '@/hooks/usePrescriptions';
import { useMedicationStats } from '@/hooks/useMedications';

export function PharmacistDashboard() {
  const { profile } = useAuth();
  const { data: stats } = usePrescriptionStats();
  const { data: inventoryStats } = useMedicationStats();

  // Enable realtime updates
  usePrescriptionsRealtime();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
        <Button variant="outline">
          <Package className="h-4 w-4 mr-2" />
          Manage Inventory
        </Button>
        <Button variant="outline">
          <Search className="h-4 w-4 mr-2" />
          Drug Lookup
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Pending Rx"
          value={stats?.pending ?? '--'}
          subtitle="To dispense"
          icon={FileText}
          variant="warning"
        />
        <StatsCard
          title="Dispensed Today"
          value={stats?.dispensed ?? '--'}
          subtitle="Completed"
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Low Stock Items"
          value={inventoryStats?.lowStock ?? '--'}
          subtitle="Need reorder"
          icon={AlertTriangle}
          variant="danger"
        />
        <StatsCard
          title="Total Inventory"
          value={inventoryStats?.total ?? '--'}
          subtitle="Active items"
          icon={Package}
          variant="info"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                Prescription Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No pending prescriptions</p>
                <p className="text-sm">New prescriptions will appear here</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {/* Inventory Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Inventory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">All items in stock</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
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
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Low Stock</span>
                <span className="font-medium text-warning">--</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Out of Stock</span>
                <span className="font-medium text-destructive">--</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
