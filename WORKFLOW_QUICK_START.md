# Integrated Workflow Quick Start Guide

## 🚀 Get Started in 30 Minutes

This guide helps you implement the integrated workflow system **immediately** with minimal setup.

---

## Step 1: Deploy Database Migration (5 minutes)

### Option A: Using Supabase CLI
```bash
cd care-harmony-hub
supabase db push
```

### Option B: Manual Deployment
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260122000000_integrated_workflow_foundation.sql`
3. Execute the migration
4. Verify tables created:
   - workflow_metrics
   - escalation_rules
   - critical_value_alerts
   - workflow_stage_tracking
   - bottleneck_detections

---

## Step 2: Verify Existing Hooks (2 minutes)

Check that these hooks are already working:

✅ **useWorkflowMetrics** - `src/hooks/useWorkflowMetrics.ts`
✅ **useWorkflowNotifications** - `src/hooks/useWorkflowNotifications.ts`
✅ **useWorkflowAutomation** - `src/hooks/useWorkflowAutomation.ts`
✅ **useQueue** - `src/hooks/useQueue.ts`
✅ **useNurseWorkflow** - `src/hooks/useNurseWorkflow.ts`
✅ **useConsultations** - `src/hooks/useConsultations.ts`
✅ **useBilling** - `src/hooks/useBilling.ts`
✅ **useLabOrders** - `src/hooks/useLabOrders.ts`
✅ **usePharmacy** - `src/hooks/usePharmacy.ts`

---

## Step 3: Create Priority Components (15 minutes)

### 3.1 Enhanced Check-In Component

**File**: `src/components/receptionist/EnhancedCheckIn.tsx`

```typescript
import { useState } from 'react';
import { useAppointments } from '@/hooks/useAppointments';
import { useQueue } from '@/hooks/useQueue';
import { useWorkflowNotifications } from '@/hooks/useWorkflowNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function EnhancedCheckIn() {
  const [searchTerm, setSearchTerm] = useState('');
  const { checkInAppointment } = useAppointments();
  const { addToQueue } = useQueue();
  const { notifyPatientCheckedIn } = useWorkflowNotifications();

  const handleCheckIn = async (patientId: string, patientName: string) => {
    try {
      // 1. Check in appointment
      await checkInAppointment(patientId);
      
      // 2. Add to queue
      const queueEntry = await addToQueue({
        patient_id: patientId,
        priority: 'normal',
        status: 'waiting'
      });
      
      // 3. Notify nurses
      await notifyPatientCheckedIn(patientId, patientName, queueEntry.queue_number);
      
      toast.success(`${patientName} checked in successfully`);
    } catch (error) {
      toast.error('Check-in failed');
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by MRN, Name, or Phone"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {/* Add patient list and check-in buttons */}
    </div>
  );
}
```

### 3.2 Workflow Metrics Dashboard

**File**: `src/components/workflow/WorkflowMetricsDashboard.tsx`

```typescript
import { useWorkflowMetrics, useWorkflowStages } from '@/hooks/useWorkflowMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function WorkflowMetricsDashboard() {
  const { data: metrics, isLoading } = useWorkflowMetrics();
  const stages = useWorkflowStages();

  if (isLoading) return <div>Loading metrics...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* KPI Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Check-in to Nurse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.checkInToNurse.toFixed(1)} min</div>
          <p className="text-xs text-muted-foreground">Target: &lt; 10 min</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lab Turnaround</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.labTurnaround.toFixed(1)} min</div>
          <p className="text-xs text-muted-foreground">Target: &lt; 60 min</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patient Throughput</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.patientThroughput.toFixed(1)}/day</div>
          <p className="text-xs text-muted-foreground">Target: 8+ patients/day</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>No-Show Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.noShowRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">Target: &lt; 10%</p>
        </CardContent>
      </Card>

      {/* Stage Performance */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Workflow Stage Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stages.map((stage) => (
              <div key={stage.stage} className="flex items-center justify-between">
                <span>{stage.stage}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{stage.avgTime.toFixed(1)} min</span>
                  <Badge variant={
                    stage.status === 'good' ? 'default' :
                    stage.status === 'warning' ? 'secondary' : 'destructive'
                  }>
                    {stage.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.3 Critical Value Alert Component

**File**: `src/components/lab/CriticalValueAlert.tsx`

```typescript
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function CriticalValueAlert() {
  const { hospital, profile } = useAuth();

  useEffect(() => {
    if (!hospital?.id || !profile?.user_id) return;

    // Subscribe to critical value alerts
    const channel = supabase
      .channel('critical-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'critical_value_alerts',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        (payload) => {
          const alert = payload.new;
          
          // Show urgent toast notification
          toast.error(
            `🚨 CRITICAL VALUE: ${alert.test_name} = ${alert.critical_value}`,
            {
              description: `Patient requires immediate attention`,
              duration: 10000,
            }
          );

          // Play alert sound (optional)
          const audio = new Audio('/alert-sound.mp3');
          audio.play().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospital?.id, profile?.user_id]);

  return null; // This is a background component
}
```

---

## Step 4: Integrate into Existing Pages (5 minutes)

### 4.1 Add to Receptionist Dashboard

**File**: `src/pages/receptionist/Dashboard.tsx`

```typescript
import { EnhancedCheckIn } from '@/components/receptionist/EnhancedCheckIn';

// Add to existing dashboard
<EnhancedCheckIn />
```

### 4.2 Add to Admin Dashboard

**File**: `src/pages/Dashboard.tsx`

```typescript
import { WorkflowMetricsDashboard } from '@/components/workflow/WorkflowMetricsDashboard';

// Add to admin dashboard
{profile?.role === 'admin' && <WorkflowMetricsDashboard />}
```

### 4.3 Add to Lab Dashboard

**File**: `src/pages/laboratory/Dashboard.tsx`

```typescript
import { CriticalValueAlert } from '@/components/lab/CriticalValueAlert';

// Add to lab dashboard
<CriticalValueAlert />
```

---

## Step 5: Test the Workflow (3 minutes)

### Test Scenario: Complete Patient Flow

1. **Receptionist**: Check in a patient
   - Go to `/receptionist`
   - Search for patient
   - Click "Check In"
   - ✅ Verify queue entry created
   - ✅ Verify nurse notification sent

2. **Nurse**: Record vitals and mark ready
   - Go to `/queue`
   - Call patient from queue
   - Record vital signs
   - Mark "Ready for Doctor"
   - ✅ Verify doctor notification sent

3. **Doctor**: Complete consultation
   - Go to `/consultations`
   - Start consultation
   - Add diagnosis and treatment
   - Create lab order and prescription
   - Complete consultation
   - ✅ Verify lab and pharmacy notifications sent

4. **Lab**: Process order
   - Go to `/laboratory`
   - View pending orders
   - Enter results
   - ✅ Verify doctor notification sent

5. **Pharmacy**: Dispense medication
   - Go to `/pharmacy`
   - View pending prescriptions
   - Verify and dispense
   - ✅ Verify patient notification sent

6. **Billing**: Generate invoice
   - Go to `/billing`
   - View completed consultations
   - Generate invoice
   - ✅ Verify invoice created

---

## Step 6: Monitor Performance (Ongoing)

### View Metrics Dashboard

Navigate to `/dashboard` (as admin) to see:
- Real-time KPIs
- Stage performance
- Bottleneck detection
- Trend analysis

### Check Notifications

All roles can view notifications in the top-right notification bell icon.

---

## Quick Wins (Implement These First)

### Priority 1: Real-Time Notifications ✅
Already implemented via `useWorkflowNotifications`

### Priority 2: Queue Management ✅
Already implemented via `useQueue`

### Priority 3: Metrics Dashboard 🔄
Implement `WorkflowMetricsDashboard` component (15 min)

### Priority 4: Critical Alerts 🔄
Implement `CriticalValueAlert` component (10 min)

---

## Common Issues & Solutions

### Issue 1: Notifications Not Sending
**Solution**: Check Supabase Realtime is enabled
```bash
# Verify in Supabase Dashboard → Database → Replication
# Ensure 'notifications' table is enabled for realtime
```

### Issue 2: Metrics Not Calculating
**Solution**: Ensure timestamps are being recorded
```sql
-- Verify data exists
SELECT COUNT(*) FROM patient_queue WHERE check_in_time IS NOT NULL;
SELECT COUNT(*) FROM consultations WHERE started_at IS NOT NULL;
```

### Issue 3: Queue Not Updating
**Solution**: Check RLS policies
```sql
-- Verify RLS policies allow access
SELECT * FROM patient_queue WHERE hospital_id = '<your-hospital-id>';
```

---

## Next Steps

After completing this quick start:

1. ✅ **Week 1**: Database foundation deployed
2. 🔄 **Week 2**: Enhanced check-in component
3. 📅 **Week 3**: Nurse triage enhancements
4. 📅 **Week 4**: Doctor consultation optimization
5. 📅 **Week 5**: Lab integration
6. 📅 **Week 6**: Pharmacy workflow
7. 📅 **Week 7**: Billing automation
8. 📅 **Week 8**: Cross-role communication
9. 📅 **Week 9**: Advanced metrics
10. 📅 **Week 10**: Automated escalation

---

## Support

- **Documentation**: See `INTEGRATED_WORKFLOW_IMPLEMENTATION_PLAN.md`
- **Issues**: Create GitHub issue with `workflow` label
- **Questions**: Contact development team

---

**Quick Start Version**: 1.0  
**Last Updated**: January 22, 2026  
**Estimated Setup Time**: 30 minutes  
**Difficulty**: Beginner-Friendly
