import { test, expect, type Page, type Route } from '@playwright/test';

const HOSPITAL_ID = '00000000-0000-0000-0000-000000000001';
const WORKFLOW_EVENTS = [
  'patient.checked_in',
  'vitals.recorded',
  'patient.ready_for_doctor',
  'consultation.started',
  'consultation.completed',
  'lab.order_created',
  'lab.sample_collected',
  'lab.results_ready',
  'lab.critical_alert',
  'prescription.created',
  'prescription.verified',
  'medication.dispensed',
  'invoice.created',
  'payment.received',
  'staff.invited',
  'role.assigned',
  'escalation.triggered',
];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function count(route: Route, total: number) {
  return route.fulfill({
    status: 200,
    headers: {
      'content-range': `0-0/${total}`,
      'content-type': 'application/json',
    },
    body: '',
  });
}

async function mockWorkflowDashboardData(page: Page) {
  let unresolvedFailures = [
    {
      id: 'failure-1',
      hospital_id: HOSPITAL_ID,
      workflow_event_id: 'event-1',
      action_type: 'send_notification',
      action_metadata: { target_role: 'admin' },
      error_message: 'Notification delivery failed after 3 retries',
      retry_attempts: 3,
      resolved: false,
      resolved_at: null,
      created_at: '2026-03-11T09:00:00.000Z',
      updated_at: '2026-03-11T09:00:00.000Z',
    },
  ];

  const workflowEvents = [
    { id: 'event-1', event_type: 'lab.results_ready', created_at: '2026-03-11T08:59:00.000Z' },
    { id: 'event-2', event_type: 'prescription.created', created_at: '2026-03-11T08:20:00.000Z' },
    { id: 'event-3', event_type: 'consultation.completed', created_at: '2026-03-11T07:45:00.000Z' },
  ];

  const activeRules = WORKFLOW_EVENTS.map((trigger_event, index) => ({
    id: `rule-${index + 1}`,
    hospital_id: HOSPITAL_ID,
    trigger_event,
    active: true,
    priority: 100 - index,
    name: `${trigger_event} rule`,
  }));

  const communicationMessages = [
    {
      id: 'msg-1',
      sender_id: '00000000-0000-0000-0000-000000000010',
      sender_role: 'system',
      sender_name: 'Workflow Orchestrator',
      recipient_id: 'profile-00000000-0000-0000-0000-000000000010',
      recipient_role: 'admin',
      subject: 'Workflow action retry exhausted',
      content: 'Lab results ready notification failed after 3 retries and requires admin review.',
      priority: 'urgent',
      read: false,
      message_type: 'workflow_notification',
      hospital_id: HOSPITAL_ID,
      created_at: '2026-03-11T09:01:00.000Z',
    },
  ];

  const profileRecord = {
    id: 'profile-00000000-0000-0000-0000-000000000010',
    user_id: '00000000-0000-0000-0000-000000000010',
    hospital_id: HOSPITAL_ID,
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@testgeneral.com',
    phone: null,
    avatar_url: null,
    two_factor_enabled: false,
  };

  const hospitalRecord = {
    id: HOSPITAL_ID,
    name: 'Test General Hospital',
    address: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    phone: '(555) 123-4567',
    email: 'admin@testgeneral.com',
    license_number: 'LIC-E2E-001',
  };

  page.route('**/rest/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname.endsWith('/workflow_action_failures')) {
      if (method === 'GET') {
        return json(route, unresolvedFailures);
      }

      if (method === 'PATCH') {
        unresolvedFailures = [];
        return json(route, []);
      }
    }

    if (pathname.endsWith('/workflow_events') && method === 'GET') {
      return json(route, workflowEvents);
    }

    if (pathname.endsWith('/profiles') && method === 'GET') {
      return json(route, profileRecord);
    }

    if (pathname.endsWith('/hospitals') && method === 'GET') {
      return json(route, hospitalRecord);
    }

    if (pathname.endsWith('/user_roles') && method === 'GET') {
      return json(route, [{ role: 'admin' }]);
    }

    if (pathname.endsWith('/workflow_rules') && method === 'GET') {
      return json(route, activeRules);
    }

    if (pathname.endsWith('/workflow_tasks') && method === 'GET') {
      return json(route, [
        {
          id: 'task-1',
          title: 'Review failed workflow notification',
          workflow_type: 'workflow_monitoring',
          status: 'pending',
          created_at: '2026-03-11T08:55:00.000Z',
          updated_at: '2026-03-11T08:55:00.000Z',
          assigned_to: 'profile-00000000-0000-0000-0000-000000000010',
          assigned_role: 'admin',
        },
      ]);
    }

    if (pathname.endsWith('/communication_messages')) {
      if (method === 'HEAD') {
        return count(route, 1);
      }
      if (method === 'GET') {
        return json(route, communicationMessages);
      }
    }

    if (pathname.endsWith('/communication_threads') && method === 'GET') {
      return json(route, []);
    }

    if (pathname.endsWith('/notification_settings')) {
      if (method === 'GET') {
        return json(route, {
          id: 'settings-1',
          user_id: 'profile-00000000-0000-0000-0000-000000000010',
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          task_assignments: true,
          urgent_alerts: true,
          status_updates: true,
          patient_updates: true,
          created_at: '2026-03-11T08:00:00.000Z',
          updated_at: '2026-03-11T08:00:00.000Z',
        });
      }
    }

    if (pathname.endsWith('/prescription_queue')) {
      return count(route, 2);
    }

    if (pathname.endsWith('/lab_queue')) {
      return count(route, 1);
    }

    return json(route, []);
  });

  page.route('**/rpc/get_workflow_performance_metrics', async (route) => {
    return json(route, {
      total_tasks: 8,
      completed_tasks: 5,
      pending_tasks: 2,
      overdue_tasks: 1,
      average_completion_time: 1.5,
      task_completion_rate: 0.625,
      completion_trend: 4.2,
      avg_completion_time: 90,
      time_trend: -15,
      active_staff_count: 12,
    });
  });
}

async function bootstrapAdminSession(page: Page) {
  await page.goto('/hospital/login');
  await page.getByRole('textbox').first().fill('admin@testgeneral.com');
  await page.locator('input[type="password"]').first().fill('TestPass123!');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|hospital\/account-setup/i, { timeout: 15000 });
  await page.evaluate(() => {
    window.localStorage.setItem('preferredRole', 'admin');
    window.localStorage.setItem('testRole', 'admin');
  });
}

test.describe('Workflow action retry path', () => {
  test('surfaces retry-exhausted failures, admin notification, analytics, and resolution flow', async ({ page }) => {
    await mockWorkflowDashboardData(page);
    await bootstrapAdminSession(page);

    await page.goto('/integration/workflow');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Workflow Dashboard' })).toBeVisible();
    await expect(page.getByText('Workflow action retry exhausted')).toBeVisible();
    await expect(page.getByText('lab.results_ready')).toBeVisible();
    await expect(page.getByText(/Retries:\s*3/i)).toBeVisible();

    await page.getByRole('tab', { name: 'Analytics' }).click();
    await expect(page.getByText('Workflow Rule Coverage')).toBeVisible();
    await expect(page.getByText('Workflow Failure Rate')).toBeVisible();
    await expect(page.getByText('Workflow Rule Coverage').locator('..').locator('..').getByText('100%').first()).toBeVisible();
    await expect(page.getByText('send_notification')).toBeVisible();

    await page.getByRole('tab', { name: 'Overview' }).click();
    await page.getByRole('button', { name: 'Mark Resolved' }).click();

    await expect(page.getByText('No unresolved workflow action failures.')).toBeVisible();
  });
});
