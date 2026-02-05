import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaffPerformance } from '@/hooks/useStaffPerformance';
import { 
  Users, 
  Calendar, 
  Stethoscope, 
  Clock, 
  Pill, 
  TestTube2,
  TrendingUp,
  Award
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getRoleLabel } from '@/types/rbac';

const roleColors: Record<string, string> = {
  doctor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  nurse: 'bg-green-500/10 text-green-700 dark:text-green-400',
  receptionist: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  pharmacist: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  lab_technician: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
};

const skeletonRowKeys = ['row-1', 'row-2', 'row-3'];

export default function StaffPerformancePage() {
  const { data: performance, isLoading } = useStaffPerformance();

  // Calculate totals
  const totals = performance?.reduce((acc, staff) => ({
    patientsToday: acc.patientsToday + staff.patientsSeenToday,
    patientsMonth: acc.patientsMonth + staff.patientsSeenThisMonth,
    appointmentsToday: acc.appointmentsToday + staff.appointmentsCompletedToday,
    appointmentsMonth: acc.appointmentsMonth + staff.appointmentsCompletedThisMonth,
    consultationsToday: acc.consultationsToday + staff.consultationsCompletedToday,
    consultationsMonth: acc.consultationsMonth + staff.consultationsCompletedThisMonth,
  }), {
    patientsToday: 0,
    patientsMonth: 0,
    appointmentsToday: 0,
    appointmentsMonth: 0,
    consultationsToday: 0,
    consultationsMonth: 0,
  });

  // Find top performers
  const topDoctor = performance
    ?.filter(s => s.role === 'doctor')
    .sort((a, b) => b.consultationsCompletedThisMonth - a.consultationsCompletedThisMonth)[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Performance</h1>
          <p className="text-muted-foreground">
            Track staff metrics including patients seen, appointments completed, and consultation times.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients Seen Today</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totals?.patientsToday || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {totals?.patientsMonth || 0} this month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Appointments Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totals?.appointmentsToday || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {totals?.appointmentsMonth || 0} this month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consultations Today</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totals?.consultationsToday || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {totals?.consultationsMonth || 0} this month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : topDoctor ? (
                <>
                  <div className="text-lg font-bold truncate">{topDoctor.staffName}</div>
                  <p className="text-xs text-muted-foreground">
                    {topDoctor.consultationsCompletedThisMonth} consultations
                  </p>
                </>
              ) : (
                <div className="text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Individual Performance
            </CardTitle>
            <CardDescription>
              Detailed metrics for each staff member this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {skeletonRowKeys.map((key) => (
                  <Skeleton key={key} className="h-12 w-full" />
                ))}
              </div>
            ) : performance && performance.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Patients</TableHead>
                    <TableHead className="text-center">Appointments</TableHead>
                    <TableHead className="text-center">Consultations</TableHead>
                    <TableHead className="text-center">Avg. Time</TableHead>
                    <TableHead className="text-center">Prescriptions</TableHead>
                    <TableHead className="text-center">Lab Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.map((staff) => (
                    <TableRow key={staff.staffId}>
                      <TableCell className="font-medium">{staff.staffName}</TableCell>
                      <TableCell>
                        <Badge className={roleColors[staff.role] || 'bg-muted'}>
                          {getRoleLabel(staff.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col">
                          <span className="font-semibold">{staff.patientsSeenThisMonth}</span>
                          <span className="text-xs text-muted-foreground">
                            {staff.patientsSeenToday} today
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col">
                          <span className="font-semibold">{staff.appointmentsCompletedThisMonth}</span>
                          <span className="text-xs text-muted-foreground">
                            {staff.appointmentsCompletedToday} today
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col">
                          <span className="font-semibold">{staff.consultationsCompletedThisMonth}</span>
                          <span className="text-xs text-muted-foreground">
                            {staff.consultationsCompletedToday} today
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{staff.averageConsultationTime} min</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Pill className="h-3 w-3 text-muted-foreground" />
                          <span>{staff.prescriptionsWritten}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TestTube2 className="h-3 w-3 text-muted-foreground" />
                          <span>{staff.labOrdersCreated}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No performance data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
