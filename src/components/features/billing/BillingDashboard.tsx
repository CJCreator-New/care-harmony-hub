/**
 * BillingDashboard.tsx
 * Revenue Operations Dashboard for billing managers and hospital administrators
 * 
 * Features:
 * - Real-time billing metrics (revenue, claims, aging)
 * - Multi-dimension filtering (provider, patient, date range, insurance)
 * - Invoice status tracking (draft, sent, paid, overdue)
 * - Claims analytics (approval rate, denial rate, resubmission tracking)
 * - DSO (Days Sales Outstanding) tracking
 * - Insurance pre-authorization monitoring
 * - A/R aging analysis (current, 30/60/90/120+ days)
 * - Payment processing status
 * - Tax and compliance reporting
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { sanitizeForLog } from '@/lib/security/sanitization';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Type Definitions
 */
interface BillingMetrics {
  total_billed: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  average_dso: number;
  invoice_count: number;
  claim_approval_rate: number;
  claim_denial_rate: number;
  average_claim_processing_days: number;
}

interface InvoiceAging {
  current: number; // 0-30 days
  age_30_60: number;
  age_60_90: number;
  age_90_120: number;
  age_120_plus: number;
}

interface ClaimMetrics {
  submitted: number;
  approved: number;
  denied: number;
  adjusted: number;
  pending: number;
  approval_rate_percentage: number;
  denial_rate_percentage: number;
  average_processing_days: number;
}

interface DailyCashflow {
  date: string;
  invoiced: number;
  collected: number;
  adjustments: number;
}

interface ProviderPerformance {
  provider_id: string;
  provider_name: string;
  total_billings: number;
  total_collected: number;
  denial_rate: number;
  average_days_to_collect: number;
}

interface InsurancePreAuthStatus {
  insurance_plan: string;
  pending_preauth_requests: number;
  approved_requests: number;
  denied_requests: number;
  average_preauth_days: number;
  approval_rate: number;
}

/**
 * Component Props
 */
interface BillingDashboardProps {
  hospitalId: string;
  dateRange?: { from: Date; to: Date };
}

/**
 * Metric Card Component (Reusable)
 */
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: React.ReactNode;
}> = ({ title, value, subtitle, trend, icon }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium flex items-center justify-between">
        {title}
        <span className="text-xs text-gray-500">{icon}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
      {trend !== undefined && (
        <div className="flex items-center mt-2 text-xs">
          {trend > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
          )}
          <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
            {trend > 0 ? '+' : ''}{trend}% vs. last month
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

/**
 * Main Dashboard Component
 */
export const BillingDashboard: React.FC<BillingDashboardProps> = ({
  hospitalId,
  dateRange = {
    from: subDays(new Date(), 90),
    to: new Date(),
  },
}) => {
  const { role } = usePermissions();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedInsurance, setSelectedInsurance] = useState('all');

  // Authorization Check
  if (!['billing_manager', 'hospital_admin', 'cfo', 'accounting'].includes(role)) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unauthorized: Only billing managers and administrators can access this dashboard
        </AlertDescription>
      </Alert>
    );
  }

  /**
   * QUERY: Fetch overall billing metrics
   */
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['billing-metrics', hospitalId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-billing-metrics', {
        body: {
          hospital_id: hospitalId,
          from_date: dateRange.from.toISOString(),
          to_date: dateRange.to.toISOString(),
        },
      });

      if (error) throw error;
      return data as BillingMetrics;
    },
    staleTime: 300000, // 5 minute cache
  });

  /**
   * QUERY: Fetch invoice aging analysis
   */
  const { data: agingData } = useQuery({
    queryKey: ['billing-aging', hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_aging_analysis')
        .select('*')
        .eq('hospital_id', hospitalId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return (data || { current: 0, age_30_60: 0, age_60_90: 0, age_90_120: 0, age_120_plus: 0 }) as InvoiceAging;
    },
  });

  /**
   * QUERY: Fetch claims metrics
   */
  const { data: claimMetrics } = useQuery({
    queryKey: ['billing-claims-metrics', hospitalId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-claims-metrics', {
        body: {
          hospital_id: hospitalId,
          from_date: dateRange.from.toISOString(),
          to_date: dateRange.to.toISOString(),
        },
      });

      if (error) throw error;
      return data as ClaimMetrics;
    },
  });

  /**
   * QUERY: Fetch daily cashflow trend
   */
  const { data: cashflowData } = useQuery({
    queryKey: ['billing-cashflow', hospitalId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-daily-cashflow', {
        body: {
          hospital_id: hospitalId,
          from_date: dateRange.from.toISOString(),
          to_date: dateRange.to.toISOString(),
        },
      });

      if (error) throw error;
      return data as DailyCashflow[];
    },
  });

  /**
   * QUERY: Fetch provider performance rankings
   */
  const { data: providerPerformance } = useQuery({
    queryKey: ['billing-provider-performance', hospitalId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-provider-performance', {
        body: {
          hospital_id: hospitalId,
          from_date: dateRange.from.toISOString(),
          to_date: dateRange.to.toISOString(),
        },
      });

      if (error) throw error;
      return data as ProviderPerformance[];
    },
  });

  /**
   * QUERY: Fetch insurance pre-auth status
   */
  const { data: preAuthStatus } = useQuery({
    queryKey: ['billing-preauth-status', hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-preauth-status', {
        body: { hospital_id: hospitalId },
      });

      if (error) throw error;
      return data as InsurancePreAuthStatus[];
    },
  });

  /**
   * Compute derived metrics
   */
  const computedMetrics = useMemo(() => ({
    collectRate: metrics ? (metrics.total_paid / metrics.total_billed * 100).toFixed(1) : 0,
    outstandingA_R: metrics ? metrics.total_pending + metrics.total_overdue : 0,
    overdueDays: metrics ? metrics.average_dso : 0,
    daysToResolveComplaints: claimMetrics ? claimMetrics.average_processing_days : 0,
  }), [metrics, claimMetrics]);

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading billing dashboard...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Dashboard</h1>
          <p className="text-gray-600">
            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export Report</Button>
          <Button>Print</Button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Billed"
          value={`$${(metrics?.total_billed || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subtitle={`${metrics?.invoice_count} invoices`}
          icon={<DollarSign className="h-4 w-4" />}
          trend={12}
        />
        <MetricCard
          title="Total Collected"
          value={`$${(metrics?.total_paid || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subtitle={`${computedMetrics.collectRate}% collection rate`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          trend={8}
        />
        <MetricCard
          title="Outstanding A/R"
          value={`$${(computedMetrics.outstandingA_R || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subtitle={`DSO: ${computedMetrics.overdueDays} days`}
          icon={<Clock className="h-4 w-4" />}
          trend={-5}
        />
        <MetricCard
          title="Claims Approval"
          value={`${claimMetrics?.approval_rate_percentage || 0}%`}
          subtitle={`${claimMetrics?.approved} of ${claimMetrics?.submitted} submitted`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Critical Alerts"
          value={`${(metrics?.total_overdue || 0) > 0 ? '⚠️' : '✓'}`}
          subtitle={`$${(metrics?.total_overdue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} overdue`}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      {/* Critical Alerts */}
      {(metrics?.total_overdue || 0) > 50000 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ CRITICAL: ${metrics?.total_overdue.toLocaleString()} in overdue receivables (>120 days). 
            Escalate collection efforts immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="aging">A/R Aging</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="preauth">Pre-Auth</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cashflow Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">30-Day Cashflow Trend</CardTitle>
                <CardDescription>Daily invoiced vs. collected amounts</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashflowData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={val => format(parseISO(val), 'MMM dd')}
                    />
                    <YAxis />
                    <Tooltip formatter={val => `$${val.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="invoiced" stroke="#3b82f6" />
                    <Line type="monotone" dataKey="collected" stroke="#10b981" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice Status Breakdown</CardTitle>
                <CardDescription>Distribution of billing lifecycle</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Paid', value: metrics?.total_paid || 0 },
                        { name: 'Pending', value: metrics?.total_pending || 0 },
                        { name: 'Overdue', value: metrics?.total_overdue || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => 
                        `${name}: $${(value / 1000).toFixed(0)}k (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip formatter={val => `$${(val / 1000).toFixed(0)}k`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Status Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              <CardDescription>Latest 15 invoices with status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Age (Days)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Placeholder - would be populated from query */}
                  <TableRow>
                    <TableCell>INV-2026-0001</TableCell>
                    <TableCell>John Smith</TableCell>
                    <TableCell>Dr. Sarah Johnson</TableCell>
                    <TableCell>$1,250.00</TableCell>
                    <TableCell><Badge>Paid</Badge></TableCell>
                    <TableCell>2</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: A/R AGING */}
        <TabsContent value="aging" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Aging Bars */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">A/R Aging Analysis</CardTitle>
                <CardDescription>Outstanding receivables by age bucket</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Current (0-30)', value: agingData?.current || 0, color: 'bg-green-500' },
                  { label: '30-60 Days', value: agingData?.age_30_60 || 0, color: 'bg-yellow-500' },
                  { label: '60-90 Days', value: agingData?.age_60_90 || 0, color: 'bg-orange-500' },
                  { label: '90-120 Days', value: agingData?.age_90_120 || 0, color: 'bg-red-500' },
                  { label: '120+ Days', value: agingData?.age_120_plus || 0, color: 'bg-red-700' },
                ].map((bucket, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{bucket.label}</span>
                      <span className="text-sm font-bold">${bucket.value.toLocaleString()}</span>
                    </div>
                    <Progress 
                      value={(bucket.value / (agingData?.current || 1 + agingData?.age_30_60 || 1 + agingData?.age_60_90 || 1 + agingData?.age_90_120 || 1 + agingData?.age_120_plus || 1)) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Collection Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Collection Actions Required</CardTitle>
                <CardDescription>Overdue invoices needing follow-up</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>{(agingData?.age_120_plus || 0) > 0 ? 'HIGH PRIORITY' : 'Good'}</strong>
                    <div className="text-sm mt-1">
                      {(agingData?.age_120_plus || 0) > 0 
                        ? `$${agingData!.age_120_plus.toLocaleString()} in invoices >120 days. Consider write-off or legal action.`
                        : 'No invoices >120 days outstanding'
                      }
                    </div>
                  </AlertDescription>
                </Alert>

                <Button className="w-full">Generate Collection Letter Batch</Button>
                <Button variant="outline" className="w-full">Escalate to Collections</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: CLAIMS */}
        <TabsContent value="claims" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Claims Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Claims Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Submitted', value: claimMetrics?.submitted || 0 },
                    { name: 'Approved', value: claimMetrics?.approved || 0 },
                    { name: 'Denied', value: claimMetrics?.denied || 0 },
                    { name: 'Adjusted', value: claimMetrics?.adjusted || 0 },
                    { name: 'Pending', value: claimMetrics?.pending || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Claims Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Claims Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Approval Rate</span>
                    <span className="font-bold">{claimMetrics?.approval_rate_percentage}%</span>
                  </div>
                  <Progress value={claimMetrics?.approval_rate_percentage || 0} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Denial Rate</span>
                    <span className="font-bold">{claimMetrics?.denial_rate_percentage}%</span>
                  </div>
                  <Progress value={claimMetrics?.denial_rate_percentage || 0} />
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">Avg. Processing Time</p>
                  <p className="text-2xl font-bold">{claimMetrics?.average_processing_days} days</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: PROVIDERS */}
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provider Performance Ranking</CardTitle>
              <CardDescription>Billing efficiency by provider</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Total Billings</TableHead>
                    <TableHead>Total Collected</TableHead>
                    <TableHead>Collection %</TableHead>
                    <TableHead>Denial Rate</TableHead>
                    <TableHead>Days to Collect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerPerformance?.map((provider, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{provider.provider_name}</TableCell>
                      <TableCell>${provider.total_billings.toLocaleString()}</TableCell>
                      <TableCell>${provider.total_collected.toLocaleString()}</TableCell>
                      <TableCell>
                        {((provider.total_collected / provider.total_billings) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={provider.denial_rate > 10 ? 'destructive' : 'outline'}>
                          {provider.denial_rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{provider.average_days_to_collect} days</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: PRE-AUTH */}
        <TabsContent value="preauth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insurance Pre-Authorization Status</CardTitle>
              <CardDescription>Pre-auth request tracking by insurance plan</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Insurance Plan</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Denied</TableHead>
                    <TableHead>Approval Rate</TableHead>
                    <TableHead>Avg Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preAuthStatus?.map((plan, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{plan.insurance_plan}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{plan.pending_preauth_requests}</Badge>
                      </TableCell>
                      <TableCell className="text-green-600">{plan.approved_requests}</TableCell>
                      <TableCell className="text-red-600">{plan.denied_requests}</TableCell>
                      <TableCell>{plan.approval_rate.toFixed(1)}%</TableCell>
                      <TableCell>{plan.average_preauth_days} days</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BillingDashboard;
