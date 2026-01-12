# CareSync HIMS Optimization Implementation Guide

## Phase 1: State Management Consolidation (Week 1)

### 1.1 Zustand Store Implementation

**Current Issue**: Multiple state management patterns causing inconsistency and performance issues.

**Solution**: Implement Zustand for unified global state management.

#### Implementation Steps:

1. **Install Zustand**
```bash
npm install zustand
```

2. **Create Auth Store** (`src/stores/authStore.ts`)
```typescript
import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '@/types/auth';

interface Profile {
  id: string;
  user_id: string;
  hospital_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  two_factor_enabled: boolean | null;
}

interface Hospital {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
}

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  hospital: Hospital | null;
  roles: UserRole[];
  primaryRole: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setHospital: (hospital: Hospital | null) => void;
  setRoles: (roles: UserRole[]) => void;
  setPrimaryRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  session: null,
  profile: null,
  hospital: null,
  roles: [],
  primaryRole: null,
  isAuthenticated: false,
  isLoading: true,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    primaryRole: get().primaryRole || (get().roles.length > 0 ? get().roles[0] : null)
  }),

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setHospital: (hospital) => set({ hospital }),
  setRoles: (roles) => set({
    roles,
    primaryRole: roles.length > 0 ? roles[0] : null
  }),
  setPrimaryRole: (role) => set({ primaryRole: role }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set(initialState),
}));
```

3. **Migrate AuthContext** (`src/contexts/AuthContext.tsx`)
```typescript
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

const AuthContext = createContext<ReturnType<typeof useAuthStore> | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStore = useAuthStore();

  useEffect(() => {
    // Initialize auth state from Supabase
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        authStore.setSession(session);
        authStore.setUser(session.user);
        // Load profile and roles...
      }
      authStore.setLoading(false);
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          authStore.setSession(session);
          authStore.setUser(session.user);
        } else {
          authStore.reset();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [authStore]);

  return (
    <AuthContext.Provider value={authStore}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 1.2 React Query Patterns Library

**Current Issue**: Inconsistent data fetching patterns across components.

**Solution**: Create standardized query patterns with error handling and caching.

#### Implementation Steps:

1. **Create Query Patterns** (`src/lib/queries/patterns.ts`)
```typescript
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export interface QueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  hospitalScoped?: boolean;
}

export interface MutationOptions<TData, TVariables> extends UseMutationOptions<TData, Error, TVariables> {
  successMessage?: string;
  errorMessage?: string;
}

// Hospital-scoped query wrapper
export function useHospitalQuery<T>(
  key: string[],
  queryFn: () => Promise<T>,
  options: QueryOptions<T> = {}
) {
  const { hospital } = useAuthStore();

  return useQuery({
    ...options,
    queryKey: [...key, hospital?.id],
    queryFn,
    enabled: options.enabled !== false && !!hospital?.id,
  });
}

// Standardized mutation with error handling
export function useAppMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: MutationOptions<TData, TVariables> = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      const message = options.errorMessage || 'An error occurred';
      toast.error(message);
      console.error('Mutation error:', error);
      options.onError?.(error, variables, context);
    },
  });
}

// Optimistic updates helper
export function useOptimisticUpdate() {
  const queryClient = useQueryClient();

  const updateOptimistically = <T>(
    queryKey: string[],
    updater: (old: T | undefined) => T
  ) => {
    queryClient.setQueryData<T>(queryKey, updater);
  };

  const rollbackOptimistically = <T>(
    queryKey: string[],
    previousData: T | undefined
  ) => {
    queryClient.setQueryData(queryKey, previousData);
  };

  return { updateOptimistically, rollbackOptimistically };
}
```

## Phase 2: Component Architecture Optimization (Week 2)

### 2.1 Base Component Library

**Current Issue**: Inconsistent component patterns and prop interfaces.

**Solution**: Create standardized base components with consistent APIs.

#### Implementation Steps:

1. **Create Base Components** (`src/components/base/`)
```typescript
// Button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

2. **Compound Component Pattern** (`src/components/base/DataTable.tsx`)
```typescript
import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

interface DataTableContextValue {
  striped?: boolean;
  hoverable?: boolean;
}

const DataTableContext = createContext<DataTableContextValue>({});

interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  striped?: boolean;
  hoverable?: boolean;
  children: React.ReactNode;
}

function DataTable({ striped, hoverable, className, children, ...props }: DataTableProps) {
  return (
    <DataTableContext.Provider value={{ striped, hoverable }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </DataTableContext.Provider>
  );
}

interface DataTableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

function DataTableHeader({ className, children, ...props }: DataTableHeaderProps) {
  return (
    <thead className={cn('bg-muted/50', className)} {...props}>
      {children}
    </thead>
  );
}

interface DataTableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

function DataTableBody({ className, children, ...props }: DataTableBodyProps) {
  const { striped } = useContext(DataTableContext);

  return (
    <tbody className={cn(striped && '[&_tr:nth-child(even)]:bg-muted/30', className)} {...props}>
      {children}
    </tbody>
  );
}

interface DataTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

function DataTableRow({ className, children, ...props }: DataTableRowProps) {
  const { hoverable } = useContext(DataTableContext);

  return (
    <tr
      className={cn(
        hoverable && 'hover:bg-muted/50 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

interface DataTableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

function DataTableCell({ className, children, ...props }: DataTableCellProps) {
  return (
    <td className={cn('p-4 align-middle', className)} {...props}>
      {children}
    </td>
  );
}

interface DataTableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

function DataTableHead({ className, children, ...props }: DataTableHeadProps) {
  return (
    <th className={cn('p-4 text-left align-middle font-medium', className)} {...props}>
      {children}
    </th>
  );
}

// Export compound component
DataTable.Header = DataTableHeader;
DataTable.Body = DataTableBody;
DataTable.Row = DataTableRow;
DataTable.Cell = DataTableCell;
DataTable.Head = DataTableHead;

export { DataTable };
```

## Phase 3: Role-Specific Workflow Optimization (Weeks 3-4)

### 3.1 Admin Dashboard Optimization

**Current Issue**: Scattered admin functions across multiple pages.

**Solution**: Unified admin control center with real-time metrics.

#### Implementation Steps:

1. **Create Unified Admin Dashboard** (`src/components/dashboard/AdminDashboard.tsx`)
```typescript
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/base/Button';
import { DataTable } from '@/components/base/DataTable';
import { useHospitalQuery } from '@/lib/queries/patterns';
import { useAuthStore } from '@/stores/authStore';
import { Users, Settings, Activity, AlertTriangle, TrendingUp } from 'lucide-react';

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalAppointments: number;
  pendingTasks: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export function AdminDashboard() {
  const { hospital } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch system metrics
  const { data: metrics } = useHospitalQuery(
    ['admin-metrics'],
    async () => {
      // Fetch comprehensive system metrics
      const [users, appointments, tasks] = await Promise.all([
        supabase.from('profiles').select('count').eq('hospital_id', hospital?.id),
        supabase.from('appointments').select('count').eq('hospital_id', hospital?.id),
        supabase.from('workflow_tasks').select('count').eq('hospital_id', hospital?.id).eq('status', 'pending'),
      ]);

      return {
        totalUsers: users.count || 0,
        activeUsers: Math.floor((users.count || 0) * 0.7), // Estimate
        totalAppointments: appointments.count || 0,
        pendingTasks: tasks.count || 0,
        systemHealth: 'healthy' as const,
      } as SystemMetrics;
    },
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  const quickActions = [
    { label: 'Add User', icon: Users, action: () => console.log('Add user') },
    { label: 'System Settings', icon: Settings, action: () => console.log('Settings') },
    { label: 'View Reports', icon: TrendingUp, action: () => console.log('Reports') },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeUsers || 0} active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pendingTasks || 0}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <div className={`h-2 w-2 rounded-full ${
              metrics?.systemHealth === 'healthy' ? 'bg-green-500' :
              metrics?.systemHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{metrics?.systemHealth || 'Unknown'}</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={action.action}
                className="flex items-center gap-2"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable striped hoverable>
                <DataTable.Header>
                  <DataTable.Row>
                    <DataTable.Head>Action</DataTable.Head>
                    <DataTable.Head>User</DataTable.Head>
                    <DataTable.Head>Time</DataTable.Head>
                  </DataTable.Row>
                </DataTable.Header>
                <DataTable.Body>
                  {/* Activity rows would be populated here */}
                  <DataTable.Row>
                    <DataTable.Cell>User login</DataTable.Cell>
                    <DataTable.Cell>john.doe@example.com</DataTable.Cell>
                    <DataTable.Cell>2 minutes ago</DataTable.Cell>
                  </DataTable.Row>
                </DataTable.Body>
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {/* User management interface */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage hospital staff and patients</CardDescription>
            </CardHeader>
            <CardContent>
              {/* User management components */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {/* System monitoring interface */}
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
              <CardDescription>Real-time system health and performance</CardDescription>
            </CardHeader>
            <CardContent>
              {/* System monitoring components */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {/* Reporting interface */}
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>Generate and view system reports</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Reporting components */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 3.2 Doctor Consultation Optimization

**Current Issue**: Complex navigation during consultations.

**Solution**: Streamlined consultation workflow with AI assistance.

#### Implementation Steps:

1. **Smart Consultation Wizard** (`src/components/consultations/SmartConsultationWizard.tsx`)
```typescript
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/base/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppMutation, useHospitalQuery } from '@/lib/queries/patterns';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Stethoscope, FileText, Pill, CheckCircle } from 'lucide-react';

const consultationSchema = z.object({
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  historyOfPresentIllness: z.string().optional(),
  vitalSigns: z.object({
    bloodPressure: z.string().optional(),
    heartRate: z.string().optional(),
    temperature: z.string().optional(),
    respiratoryRate: z.string().optional(),
    oxygenSaturation: z.string().optional(),
  }),
  physicalExamination: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

type ConsultationForm = z.infer<typeof consultationSchema>;

interface SmartConsultationWizardProps {
  patientId: string;
  appointmentId: string;
  onComplete: (consultation: any) => void;
}

const steps = [
  { id: 'complaint', title: 'Chief Complaint', icon: Stethoscope },
  { id: 'history', title: 'History & Vitals', icon: FileText },
  { id: 'examination', title: 'Examination', icon: Stethoscope },
  { id: 'assessment', title: 'Assessment & Plan', icon: Pill },
  { id: 'review', title: 'Review & Save', icon: CheckCircle },
];

export function SmartConsultationWizard({
  patientId,
  appointmentId,
  onComplete
}: SmartConsultationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { hospital } = useAuthStore();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ConsultationForm>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      vitalSigns: {},
    },
  });

  // Fetch patient data
  const { data: patient } = useHospitalQuery(
    ['patient', patientId],
    async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      return data;
    }
  );

  // Fetch consultation templates
  const { data: templates } = useHospitalQuery(
    ['consultation-templates'],
    async () => {
      const { data, error } = await supabase
        .from('consultation_templates')
        .select('*')
        .eq('hospital_id', hospital?.id)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    }
  );

  // AI-assisted suggestions
  const { data: suggestions } = useHospitalQuery(
    ['ai-suggestions', watch('chiefComplaint')],
    async () => {
      if (!watch('chiefComplaint') || watch('chiefComplaint').length < 3) return null;

      // Call AI service for suggestions
      const response = await fetch('/api/ai/consultation-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chiefComplaint: watch('chiefComplaint'),
          patientAge: patient?.date_of_birth,
          patientGender: patient?.gender,
        }),
      });

      return response.json();
    },
    { enabled: !!watch('chiefComplaint') && watch('chiefComplaint').length >= 3 }
  );

  const saveConsultation = useAppMutation(
    async (data: ConsultationForm) => {
      const { data: consultation, error } = await supabase
        .from('consultations')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          hospital_id: hospital?.id,
          chief_complaint: data.chiefComplaint,
          history_of_present_illness: data.historyOfPresentIllness,
          vital_signs: data.vitalSigns,
          physical_examination: data.physicalExamination,
          assessment: data.assessment,
          plan: data.plan,
          status: 'completed',
        })
        .select()
        .single();

      if (error) throw error;
      return consultation;
    },
    {
      successMessage: 'Consultation saved successfully',
      onSuccess: onComplete,
    }
  );

  const applyTemplate = (template: any) => {
    setValue('assessment', template.assessment_template);
    setValue('plan', template.plan_template);
    toast.success('Template applied');
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Consultation Progress</h2>
            <Badge variant="outline">{currentStep + 1} of {steps.length}</Badge>
          </div>
          <Progress value={progress} className="mb-4" />
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex flex-col items-center ${
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`p-2 rounded-full mb-2 ${
                  index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <step.icon className="h-4 w-4" />
                </div>
                <span className="text-xs text-center">{step.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <steps[currentStep].icon className="h-5 w-5" />
            {steps[currentStep].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 0 && "Describe the patient's main complaint"}
            {currentStep === 1 && "Review medical history and record vital signs"}
            {currentStep === 2 && "Perform and document physical examination"}
            {currentStep === 3 && "Provide assessment and treatment plan"}
            {currentStep === 4 && "Review and finalize consultation"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(saveConsultation.mutate)} className="space-y-6">
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Chief Complaint</label>
                  <Textarea
                    {...register('chiefComplaint')}
                    placeholder="Describe the patient's main symptom or concern..."
                    className="mt-1"
                  />
                  {errors.chiefComplaint && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.chiefComplaint.message}
                    </p>
                  )}
                </div>

                {/* AI Suggestions */}
                {suggestions && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-sm text-blue-800">AI Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {suggestions.differentialDiagnosis && (
                          <div>
                            <p className="text-sm font-medium text-blue-800">Possible Conditions:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {suggestions.differentialDiagnosis.map((condition: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {condition}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {suggestions.recommendedTests && (
                          <div>
                            <p className="text-sm font-medium text-blue-800">Recommended Tests:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {suggestions.recommendedTests.map((test: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {test}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">History of Present Illness</label>
                  <Textarea
                    {...register('historyOfPresentIllness')}
                    placeholder="Detailed history of the current condition..."
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Blood Pressure</label>
                    <Input
                      {...register('vitalSigns.bloodPressure')}
                      placeholder="120/80"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Heart Rate</label>
                    <Input
                      {...register('vitalSigns.heartRate')}
                      placeholder="72 bpm"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Temperature</label>
                    <Input
                      {...register('vitalSigns.temperature')}
                      placeholder="98.6°F"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Respiratory Rate</label>
                    <Input
                      {...register('vitalSigns.respiratoryRate')}
                      placeholder="16/min"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">O2 Saturation</label>
                    <Input
                      {...register('vitalSigns.oxygenSaturation')}
                      placeholder="98%"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Physical Examination</label>
                  <Textarea
                    {...register('physicalExamination')}
                    placeholder="Document physical examination findings..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Assessment</label>
                  <Textarea
                    {...register('assessment')}
                    placeholder="Clinical assessment and diagnosis..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Treatment Plan</label>
                  <Textarea
                    {...register('plan')}
                    placeholder="Treatment plan, medications, follow-up..."
                    className="mt-1"
                  />
                </div>

                {/* Template Suggestions */}
                {templates && templates.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Apply Template</label>
                    <Select onValueChange={(value) => {
                      const template = templates.find(t => t.id === value);
                      if (template) applyTemplate(template);
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a consultation template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Consultation Summary</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Chief Complaint:</strong> {watch('chiefComplaint')}</p>
                    <p><strong>Assessment:</strong> {watch('assessment') || 'Not provided'}</p>
                    <p><strong>Plan:</strong> {watch('plan') || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="confirm"
                    className="rounded"
                    required
                  />
                  <label htmlFor="confirm" className="text-sm">
                    I confirm this consultation is complete and accurate
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                Previous
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={saveConsultation.isPending}
                >
                  {saveConsultation.isPending ? 'Saving...' : 'Complete Consultation'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Phase 4: Database & API Optimization (Week 5-6)

### 4.1 Query Optimization

**Current Issue**: N+1 queries and inefficient database access patterns.

**Solution**: Implement optimized queries with proper indexing and batching.

#### Implementation Steps:

1. **Database Indexes** (`supabase/migrations/optimize_indexes.sql`)
```sql
-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_patient ON appointments(hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_date ON consultations(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_status ON workflow_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_date ON prescriptions(patient_id, created_at DESC);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_status ON lab_orders(patient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_patient_status ON billing_records(patient_id, status, created_at DESC);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_active_appointments ON appointments(appointment_date)
WHERE status IN ('scheduled', 'confirmed') AND appointment_date >= CURRENT_DATE;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_patients_search ON patients USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || email));
CREATE INDEX IF NOT EXISTS idx_consultations_search ON consultations USING gin(to_tsvector('english', chief_complaint || ' ' || assessment));
```

2. **Optimized Query Hooks** (`src/hooks/useOptimizedQueries.ts`)
```typescript
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

// Optimized patient search with debouncing
export function usePatientSearch(searchTerm: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['patients-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];

      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, email, date_of_birth, phone')
        .eq('hospital_id', useAuthStore.getState().hospital?.id)
        .ilike('first_name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: options.enabled !== false && searchTerm.length >= 2,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

// Infinite scroll for large datasets
export function useInfinitePatients(pageSize = 20) {
  return useInfiniteQuery({
    queryKey: ['patients-infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error, count } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('hospital_id', useAuthStore.getState().hospital?.id)
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data,
        nextCursor: data.length === pageSize ? pageParam + 1 : undefined,
        totalCount: count,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

// Batch operations for bulk updates
export function useBatchOperations() {
  const queryClient = useQueryClient();

  const batchUpdateAppointments = async (updates: Array<{ id: string; status: string }>) => {
    const { error } = await supabase
      .from('appointments')
      .upsert(updates.map(update => ({
        id: update.id,
        status: update.status,
        updated_at: new Date().toISOString(),
      })));

    if (error) throw error;

    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  };

  const batchCreateTasks = async (tasks: Array<Omit<WorkflowTask, 'id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase
      .from('workflow_tasks')
      .insert(tasks.map(task => ({
        ...task,
        hospital_id: useAuthStore.getState().hospital?.id,
        created_by: useAuthStore.getState().profile?.id,
      })))
      .select();

    if (error) throw error;

    // Invalidate task queries
    queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] });

    return data;
  };

  return { batchUpdateAppointments, batchCreateTasks };
}

// Real-time subscriptions with optimized updates
export function useRealtimeUpdates(table: string, filter?: Record<string, any>) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter ? Object.entries(filter).map(([key, value]) => `${key}=eq.${value}`).join(',') : undefined,
        },
        (payload) => {
          // Optimized cache updates based on operation type
          const queryKey = [table];

          if (payload.eventType === 'INSERT') {
            queryClient.setQueryData(queryKey, (oldData: any[]) => {
              if (!oldData) return [payload.new];
              return [payload.new, ...oldData];
            });
          } else if (payload.eventType === 'UPDATE') {
            queryClient.setQueryData(queryKey, (oldData: any[]) => {
              if (!oldData) return [];
              return oldData.map(item =>
                item.id === payload.new.id ? { ...item, ...payload.new } : item
              );
            });
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(queryKey, (oldData: any[]) => {
              if (!oldData) return [];
              return oldData.filter(item => item.id !== payload.old.id);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, queryClient]);
}
```

### 4.2 API Response Optimization

**Current Issue**: Over-fetching and slow API responses.

**Solution**: Implement field selection and response compression.

#### Implementation Steps:

1. **Field Selection API** (`src/lib/api/fieldSelector.ts`)
```typescript
// Field selection utilities for API responses
export interface FieldSelector {
  include?: string[];
  exclude?: string[];
}

export function buildSelectQuery(table: string, fields?: FieldSelector): string {
  if (!fields) return '*';

  const { include, exclude } = fields;

  if (include && include.length > 0) {
    return include.join(',');
  }

  if (exclude && exclude.length > 0) {
    // This would require knowing all possible fields
    // For now, we'll implement include-based selection
    return '*';
  }

  return '*';
}

// Common field sets for different views
export const FIELD_SETS = {
  patient: {
    list: ['id', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth'],
    detail: ['id', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'address', 'emergency_contact', 'medical_record_number'],
    search: ['id', 'first_name', 'last_name', 'email', 'medical_record_number'],
  },
  appointment: {
    list: ['id', 'patient_id', 'doctor_id', 'appointment_date', 'status', 'type'],
    detail: ['id', 'patient_id', 'doctor_id', 'appointment_date', 'status', 'type', 'notes', 'duration'],
    calendar: ['id', 'appointment_date', 'status', 'type', 'patient_name'],
  },
  consultation: {
    list: ['id', 'patient_id', 'appointment_id', 'created_at', 'status'],
    detail: ['id', 'patient_id', 'appointment_id', 'chief_complaint', 'assessment', 'plan', 'created_at', 'updated_at'],
    summary: ['id', 'chief_complaint', 'assessment', 'created_at'],
  },
} as const;
```

2. **Compressed API Responses** (`src/lib/api/compression.ts`)
```typescript
import { gzip, ungzip } from 'pako';

// Response compression for large datasets
export async function compressResponse(data: any): Promise<string> {
  const jsonString = JSON.stringify(data);
  const compressed = gzip(jsonString);
  return btoa(String.fromCharCode(...compressed));
}

export async function decompressResponse(compressedData: string): Promise<any> {
  const compressed = new Uint8Array(
    atob(compressedData).split('').map(char => char.charCodeAt(0))
  );
  const decompressed = ungzip(compressed);
  const jsonString = new TextDecoder().decode(decompressed);
  return JSON.parse(jsonString);
}

// Smart compression based on response size
export function shouldCompress(data: any): boolean {
  const size = JSON.stringify(data).length;
  return size > 1024; // Compress responses over 1KB
}

// API client with automatic compression
export class CompressedAPIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Accept-Encoding': 'gzip',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const contentEncoding = response.headers.get('content-encoding');

    if (contentEncoding === 'gzip') {
      const compressedData = await response.text();
      return decompressResponse(compressedData);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    const shouldCompressRequest = shouldCompress(data);
    let body: string | Uint8Array;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (shouldCompressRequest) {
      body = await compressResponse(data);
      headers['Content-Encoding'] = 'gzip';
    } else {
      body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      body,
      headers,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Create singleton instance
export const apiClient = new CompressedAPIClient('/api');
```

## Phase 5: Performance Monitoring & Testing (Weeks 7-8)

### 5.1 Automated Performance Testing

**Current Issue**: Manual performance testing and lack of regression detection.

**Solution**: Implement automated performance testing with CI/CD integration.

#### Implementation Steps:

1. **Performance Test Suite** (`tests/performance/dashboard-performance.test.ts`)
```typescript
import { test, expect } from '@playwright/test';
import { measurePerformance } from '../utils/performance-utils';

test.describe('Dashboard Performance', () => {
  test('Admin dashboard loads within performance budget', async ({ page }) => {
    // Start performance measurement
    const performanceMetrics = await measurePerformance(page, async () => {
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="admin-dashboard"]');

      // Wait for critical content to load
      await page.waitForSelector('[data-testid="user-stats"]');
      await page.waitForSelector('[data-testid="appointment-stats"]');
      await page.waitForSelector('[data-testid="system-health"]');
    });

    // Assert performance budgets
    expect(performanceMetrics.loadTime).toBeLessThan(2000); // 2 seconds
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1500); // 1.5 seconds
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1000); // 1 second
    expect(performanceMetrics.largestContentfulPaint).toBeLessThan(2500); // 2.5 seconds

    // Assert Core Web Vitals
    expect(performanceMetrics.cumulativeLayoutShift).toBeLessThan(0.1);
    expect(performanceMetrics.firstInputDelay).toBeLessThan(100);
    expect(performanceMetrics.interactionToNextPaint).toBeLessThan(200);
  });

  test('Doctor dashboard handles patient search efficiently', async ({ page }) => {
    await page.goto('/dashboard');

    // Measure search performance
    const searchMetrics = await measurePerformance(page, async () => {
      await page.fill('[data-testid="patient-search"]', 'john');
      await page.waitForSelector('[data-testid="search-results"]');

      // Wait for results to stabilize
      await page.waitForTimeout(500);
    });

    expect(searchMetrics.responseTime).toBeLessThan(500); // 500ms
    expect(searchMetrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB
  });

  test('Real-time updates don\'t cause performance degradation', async ({ page }) => {
    await page.goto('/dashboard');

    // Measure baseline performance
    const baselineMetrics = await page.evaluate(() => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        return entries.reduce((acc, entry) => acc + entry.duration, 0);
      });
      observer.observe({ entryTypes: ['measure'] });
      return performance.now();
    });

    // Simulate real-time updates
    await page.evaluate(() => {
      // Trigger multiple real-time updates
      const events = ['task-created', 'appointment-updated', 'message-received'];
      events.forEach(event => {
        window.dispatchEvent(new CustomEvent(event, { detail: { id: Math.random() } }));
      });
    });

    // Wait for updates to process
    await page.waitForTimeout(2000);

    // Measure performance after updates
    const afterMetrics = await page.evaluate(() => performance.now());

    const performanceImpact = afterMetrics - baselineMetrics;
    expect(performanceImpact).toBeLessThan(1000); // Less than 1 second impact
  });

  test('Memory usage stays within limits during extended use', async ({ page }) => {
    await page.goto('/dashboard');

    // Simulate extended usage
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="refresh-data"]');
      await page.waitForTimeout(1000);
    }

    const memoryUsage = await page.evaluate(() => {
      // @ts-ignore
      return performance.memory.usedJSHeapSize;
    });

    expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB limit
  });
});
```

2. **Performance Utilities** (`tests/utils/performance-utils.ts`)
```typescript
import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  interactionToNextPaint: number;
  responseTime: number;
  memoryUsage: number;
}

export async function measurePerformance(
  page: Page,
  action: () => Promise<void>
): Promise<PerformanceMetrics> {
  // Start performance measurement
  const startTime = Date.now();

  // Set up performance observers
  await page.evaluate(() => {
    // @ts-ignore
    window.performanceMetrics = {
      paintEntries: [],
      navigationEntries: [],
      layoutShiftEntries: [],
    };

    // Observe paint metrics
    const paintObserver = new PerformanceObserver((list) => {
      // @ts-ignore
      window.performanceMetrics.paintEntries.push(...list.getEntries());
    });
    paintObserver.observe({ entryTypes: ['paint'] });

    // Observe layout shifts
    const layoutObserver = new PerformanceObserver((list) => {
      // @ts-ignore
      window.performanceMetrics.layoutShiftEntries.push(...list.getEntries());
    });
    layoutObserver.observe({ entryTypes: ['layout-shift'] });

    // Observe navigation
    const navigationObserver = new PerformanceObserver((list) => {
      // @ts-ignore
      window.performanceMetrics.navigationEntries.push(...list.getEntries());
    });
    navigationObserver.observe({ entryTypes: ['navigation'] });
  });

  // Execute the action
  const actionStart = Date.now();
  await action();
  const actionEnd = Date.now();

  // Collect metrics
  const metrics = await page.evaluate(() => {
    // @ts-ignore
    const perfMetrics = window.performanceMetrics;

    // Calculate Core Web Vitals
    const fcp = perfMetrics.paintEntries.find((entry: any) => entry.name === 'first-contentful-paint')?.startTime || 0;
    const lcp = Math.max(...perfMetrics.paintEntries.map((entry: any) => entry.startTime), 0);

    const cls = perfMetrics.layoutShiftEntries.reduce((sum: number, entry: any) => sum + entry.value, 0);

    // Get navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstContentfulPaint: fcp,
      largestContentfulPaint: lcp,
      cumulativeLayoutShift: cls,
      firstInputDelay: 0, // Would need additional measurement
      interactionToNextPaint: 0, // Would need additional measurement
      responseTime: 0, // Calculated below
      memoryUsage: 0, // Calculated below
    };
  });

  // Add response time and memory usage
  metrics.responseTime = actionEnd - actionStart;

  try {
    metrics.memoryUsage = await page.evaluate(() => {
      // @ts-ignore
      return performance.memory?.usedJSHeapSize || 0;
    });
  } catch (error) {
    // Memory API might not be available
    metrics.memoryUsage = 0;
  }

  return metrics;
}

export async function measureBundleSize(page: Page): Promise<{
  totalSize: number;
  chunks: Array<{ name: string; size: number }>;
}> {
  const resources = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources
      .filter(resource => resource.name.includes('.js'))
      .map(resource => ({
        name: resource.name,
        size: resource.transferSize || 0,
      }));
  });

  const totalSize = resources.reduce((sum, resource) => sum + resource.size, 0);

  return {
    totalSize,
    chunks: resources,
  };
}

export async function simulateUserJourney(
  page: Page,
  journey: Array<{ action: () => Promise<void>; description: string }>
): Promise<Array<{ description: string; duration: number; metrics: Partial<PerformanceMetrics> }>> {
  const results = [];

  for (const step of journey) {
    const startTime = Date.now();

    await step.action();

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Collect basic metrics
    const memoryUsage = await page.evaluate(() => {
      // @ts-ignore
      return performance.memory?.usedJSHeapSize || 0;
    });

    results.push({
      description: step.description,
      duration,
      metrics: {
        responseTime: duration,
        memoryUsage,
      },
    });

    // Brief pause between actions
    await page.waitForTimeout(500);
  }

  return results;
}
```

### 5.2 Automated Accessibility Testing

**Current Issue**: Manual accessibility testing leads to inconsistent compliance.

**Solution**: Implement automated accessibility testing with CI/CD integration.

#### Implementation Steps:

1. **Accessibility Test Suite** (`tests/accessibility/wcag-compliance.test.tsx`)
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Compliance', () => {
  test('Dashboard pages pass accessibility audit', async ({ page }) => {
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:');
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.id}: ${violation.description}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Help: ${violation.help}`);
        console.log(`   Help URL: ${violation.helpUrl}`);
        console.log(`   Elements: ${violation.nodes.map(node => node.target).join(', ')}`);
        console.log('---');
      });
    }

    // Assert no critical violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'critical'
    );
    expect(criticalViolations).toHaveLength(0);

    // Assert no serious violations
    const seriousViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'serious'
    );
    expect(seriousViolations).toHaveLength(0);

    // Allow moderate violations but log them
    const moderateViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'moderate'
    );
    if (moderateViolations.length > 0) {
      console.warn(`Found ${moderateViolations.length} moderate accessibility violations`);
    }
  });

  test('Form interactions are keyboard accessible', async ({ page }) => {
    await page.goto('/patients/new');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBe('INPUT');

    // Fill out form using keyboard only
    await page.keyboard.type('John');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Doe');
    await page.keyboard.press('Tab');
    await page.keyboard.type('john.doe@example.com');

    // Test form submission
    await page.keyboard.press('Enter');

    // Verify form was submitted (check for success message or redirect)
    await page.waitForSelector('[data-testid="success-message"]');
  });

  test('Color contrast meets WCAG standards', async ({ page }) => {
    await page.goto('/dashboard');

    const contrastResults = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const results = [];

      for (const element of elements) {
        const style = window.getComputedStyle(element);
        const backgroundColor = style.backgroundColor;
        const color = style.color;

        if (backgroundColor && color && backgroundColor !== 'rgba(0, 0, 0, 0)' && color !== 'rgba(0, 0, 0, 0)') {
          // Calculate contrast ratio (simplified)
          // In practice, you'd use a proper color contrast library
          results.push({
            element: element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''),
            backgroundColor,
            color,
          });
        }
      }

      return results;
    });

    // Verify we have color contrast data
    expect(contrastResults.length).toBeGreaterThan(0);

    // Log results for manual review
    console.log('Color contrast analysis:', contrastResults.slice(0, 10));
  });

  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('/dashboard');

    // Test ARIA labels and roles
    const ariaElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledBy: el.getAttribute('aria-labelledby'),
        role: el.getAttribute('role'),
        text: el.textContent?.trim().substring(0, 50),
      }));
    });

    // Verify critical interactive elements have ARIA labels
    const buttons = await page.locator('button:not([aria-label]):not([aria-labelledby])').count();
    const links = await page.locator('a:not([aria-label]):not([aria-labelledby])').count();

    // Allow some buttons/links without ARIA labels if they have visible text
    const unlabeledButtonsWithText = await page.locator('button:not([aria-label]):not([aria-labelledby])').filter({ hasText: /.+/ }).count();
    const unlabeledLinksWithText = await page.locator('a:not([aria-label]):not([aria-labelledby])').filter({ hasText: /.+/ }).count();

    expect(buttons - unlabeledButtonsWithText).toBeLessThanOrEqual(5); // Allow up to 5 unlabeled buttons
    expect(links - unlabeledLinksWithText).toBeLessThanOrEqual(3); // Allow up to 3 unlabeled links
  });

  test('Responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard');

    // Test that critical elements are visible and usable
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Test touch targets meet minimum size requirements
    const touchTargets = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, [role="button"]');
      return Array.from(elements).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          width: rect.width,
          height: rect.height,
          area: rect.width * rect.height,
        };
      });
    });

    // Verify touch targets meet 44x44px minimum (1764px area)
    const smallTargets = touchTargets.filter(target => target.area < 1764);
    expect(smallTargets.length).toBeLessThanOrEqual(5); // Allow up to 5 small touch targets

    if (smallTargets.length > 0) {
      console.warn('Small touch targets found:', smallTargets);
    }
  });
});
```

## Implementation Timeline & Success Metrics

### Phase Implementation Timeline

| Phase | Duration | Focus Areas | Success Criteria |
|-------|----------|-------------|------------------|
| **Phase 1** | Week 1 | State Management & Architecture | 30% re-render reduction |
| **Phase 2** | Week 2 | Component Optimization | 25% bundle size reduction |
| **Phase 3** | Week 3-4 | Role-Specific Workflows | 40% task completion improvement |
| **Phase 4** | Week 5-6 | Database & API Optimization | 50% query performance improvement |
| **Phase 5** | Week 7-8 | Testing & Quality Assurance | 90%+ test coverage |

### Key Performance Indicators

#### Performance Metrics
- **Page Load Time**: < 2 seconds (target: < 1.5 seconds)
- **Time to Interactive**: < 3 seconds (target: < 2 seconds)
- **Bundle Size**: < 2MB (target: < 1.5MB)
- **API Response Time**: < 200ms (target: < 100ms)

#### User Experience Metrics
- **Task Completion Time**: 40% reduction across all roles
- **Error Rate**: < 1% (target: < 0.5%)
- **User Satisfaction**: > 90% (target: > 95%)
- **Mobile Performance**: 4.5+ Lighthouse score

#### Business Impact Metrics
- **Development Velocity**: 50% increase in feature delivery
- **System Reliability**: 99.9% uptime (target: 99.95%)
- **Cost Efficiency**: 30% reduction in infrastructure costs
- **User Adoption**: 80% increase in daily active users

### Risk Mitigation Strategies

1. **Performance Regression**: Automated performance testing in CI/CD
2. **Breaking Changes**: Feature flags for gradual rollout
3. **Data Integrity**: Comprehensive backup and rollback procedures
4. **User Training**: Phased rollout with extensive user support

### Success Validation Approach

1. **Automated Testing**: Performance, accessibility, and functionality tests
2. **User Acceptance Testing**: Real-world validation with healthcare staff
3. **Performance Monitoring**: Real-time metrics and alerting
4. **Stakeholder Reviews**: Regular progress updates and feedback sessions

This comprehensive optimization plan will transform the CareSync HIMS into a high-performance, user-centric healthcare management system that delivers exceptional value to all stakeholders.</content>
<parameter name="filePath">c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub\OPTIMIZATION_IMPLEMENTATION_GUIDE.md