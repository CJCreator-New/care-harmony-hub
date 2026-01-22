// Admin Dashboard Component
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminRBACManager } from '@/utils/adminRBACManager';
import { SystemConfiguration } from './SystemConfiguration';
import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics';
import { useAdminUserManagement } from '@/hooks/useAdminUserManagement';
import { AdminPermission } from '@/types/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, Users, TrendingUp, Activity } from 'lucide-react';

export function AdminDashboard() {
  const { primaryRole } = useAuth();
  const { metrics, isLoading: metricsLoading } = useAdminDashboardMetrics();
  const { users, fetchUsers, isLoading: usersLoading } = useAdminUserManagement();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Check admin access
  if (!AdminRBACManager.canAccessAdminPanel(primaryRole)) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>You do not have permission to access the admin panel.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Hospital Management System Administration</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {canManageUsers && <TabsTrigger value="users">Users</TabsTrigger>}
          {canViewAnalytics && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          {canAccessSettings && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Active Users"
              value={metrics?.realTimeMetrics.activeUsers || 0}
              icon={<Users className="h-4 w-4" />}
              trend="+5%"
            />
            <MetricCard
              title="Patient Throughput"
              value={metrics?.realTimeMetrics.patientThroughput || 0}
              icon={<Activity className="h-4 w-4" />}
              trend="+12%"
            />
            <MetricCard
              title="System Load"
              value={`${Math.round(metrics?.realTimeMetrics.systemLoad || 0)}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              trend="Normal"
            />
            <MetricCard
              title="Error Rate"
              value={`${(metrics?.realTimeMetrics.errorRate || 0).toFixed(2)}%`}
              icon={<AlertCircle className="h-4 w-4" />}
              trend="Low"
            />
          </div>

          {/* Financial Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
              <CardDescription>Daily revenue and billing status</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Daily Revenue</p>
                <p className="text-2xl font-bold">₹{metrics?.financialMetrics.dailyRevenue || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Bills</p>
                <p className="text-2xl font-bold">{metrics?.financialMetrics.pendingBills || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Insurance Claims</p>
                <p className="text-2xl font-bold">{metrics?.financialMetrics.insuranceClaims || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Operational Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Operational Metrics</CardTitle>
              <CardDescription>Hospital operations overview</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Bed Occupancy</p>
                <p className="text-2xl font-bold">{Math.round(metrics?.operationalMetrics.bedOccupancy || 0)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Staff Utilization</p>
                <p className="text-2xl font-bold">{Math.round(metrics?.operationalMetrics.staffUtilization || 0)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Wait Time</p>
                <p className="text-2xl font-bold">{Math.round(metrics?.operationalMetrics.avgWaitTime || 0)} min</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        {canManageUsers && (
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">User Management</h2>
              <Button>Add New User</Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
                <CardDescription>Total: {users.length} users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Email</th>
                        <th className="text-left py-2">Role</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Created</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="py-2">{user.email}</td>
                          <td className="py-2 capitalize">{user.role}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="py-2">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="py-2">
                            <Button variant="ghost" size="sm">Edit</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Analytics Tab */}
        {canViewAnalytics && (
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Real-time system metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { time: '00:00', load: 45, errors: 2 },
                    { time: '04:00', load: 52, errors: 3 },
                    { time: '08:00', load: 78, errors: 5 },
                    { time: '12:00', load: 85, errors: 4 },
                    { time: '16:00', load: 72, errors: 3 },
                    { time: '20:00', load: 60, errors: 2 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="load" stroke="#3b82f6" />
                    <Line type="monotone" dataKey="errors" stroke="#ef4444" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
                <CardDescription>Patient satisfaction and compliance</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Patient Satisfaction</p>
                  <p className="text-2xl font-bold">{Math.round(metrics?.qualityMetrics.patientSatisfaction || 0)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Error Rate</p>
                  <p className="text-2xl font-bold">{(metrics?.qualityMetrics.errorRate || 0).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Compliance Score</p>
                  <p className="text-2xl font-bold">{Math.round(metrics?.qualityMetrics.complianceScore || 0)}%</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Settings Tab */}
        {canAccessSettings && (
          <TabsContent value="settings" className="space-y-4">
            <SystemConfiguration />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, icon, trend }: any) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-green-600 mt-1">{trend}</p>
          </div>
          <div className="text-gray-400">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
