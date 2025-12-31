import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TestTube2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Microscope,
} from 'lucide-react';

export function LabTechDashboard() {
  const { profile } = useAuth();

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
              {getGreeting()}, {profile?.first_name || 'Lab Technician'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Lab orders and test results management.
            </p>
          </div>
          <Badge variant="info" className="w-fit text-sm py-1.5 px-4">
            Lab Technician
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button asChild>
          <Link to="/laboratory">
            <TestTube2 className="h-4 w-4 mr-2" />
            Pending Orders
          </Link>
        </Button>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload Results
        </Button>
        <Button variant="outline">
          <Microscope className="h-4 w-4 mr-2" />
          Test Catalog
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Pending Orders"
          value="--"
          subtitle="To process"
          icon={FileText}
          variant="warning"
        />
        <StatsCard
          title="In Progress"
          value="--"
          subtitle="Currently testing"
          icon={TestTube2}
          variant="primary"
        />
        <StatsCard
          title="Completed Today"
          value="--"
          subtitle="Results uploaded"
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="Avg. TAT"
          value="--"
          subtitle="Turnaround time"
          icon={Clock}
          variant="info"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-primary" />
                Lab Order Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No pending lab orders</p>
                <p className="text-sm">New orders will appear here</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {/* Urgent Orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-critical" />
                Urgent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No urgent orders</p>
              </div>
            </CardContent>
          </Card>

          {/* Test Categories */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Microscope className="h-5 w-5 text-primary" />
                Today's Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Blood Tests</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Urine Analysis</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Imaging</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Other</span>
                <span className="font-medium">--</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
