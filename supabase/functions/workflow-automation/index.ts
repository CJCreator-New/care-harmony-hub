import { logEdge } from '../_shared/sanitizeLog.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { getCorsHeaders, corsHeaders as defaultCorsHeaders } from '../_shared/cors.ts'
import { getAuthorizedActor, type AuthorizedActor } from '../_shared/authorize.ts'
import { assertPatientInHospital, checkBodyHospital, clampInt, hasAnyRole, scopeRecordData } from '../_shared/tenantScope.ts'
import { withRateLimit } from '../_shared/rateLimit.ts'
import { validateRequest } from '../_shared/validation.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const workflowSchema = z.object({
  action: z.string().min(1),
  data: z.any().optional(),
});

interface WorkflowTask {
  id: string
  title: string
  workflow_type: string
  priority: string
  assigned_to: string
  patient_id: string
  due_date: string
  hospital_id: string
}

interface WorkflowRule {
  id: string
  trigger_event: string
  trigger_conditions: any
  actions: any
  active: boolean
  cooldown_minutes: number
  last_triggered: string
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { actor, response } = await getAuthorizedActor(req, ['admin', 'doctor', 'nurse'])
    if (response || !actor) return response ?? new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const validation = await validateRequest(req, workflowSchema);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { action, data } = validation.data;
    const body = (data && typeof data === 'object' && !Array.isArray(data) ? data : {}) as Record<string, any>
    // S0-06 / EDGE-07: the top-level hospital may repeat the caller's but not name another.
    const hospitalCheck = checkBodyHospital(actor.hospitalId, body.hospital_id)
    if (!hospitalCheck.ok) return jsonError(hospitalCheck.status, hospitalCheck.error)
    const scopedData = { ...body, hospital_id: actor.hospitalId }

    switch (action) {
      case 'process_workflow_rules':
        return await processWorkflowRules(supabaseClient, scopedData, actor)

      case 'auto_assign_tasks':
        return await autoAssignTasks(supabaseClient, scopedData)

      case 'calculate_metrics':
        return await calculateWorkflowMetrics(supabaseClient, scopedData)

      case 'send_bulk_notifications':
        // Broadcast to all staff is an admin action, sent as the admin themself.
        if (!hasAnyRole(actor, ['admin'])) {
          return jsonError(403, 'Forbidden - only an admin can send bulk notifications')
        }
        return await sendBulkNotifications(supabaseClient, scopedData, actor)

      default:
        return jsonError(400, `Unknown action: ${action}`)
    }

  } catch (error) {
    logEdge('error', 'workflow-automation', { stage: 'unhandled', error: error })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
}

serve((req) => withRateLimit(req, handler));

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
  })
}

async function processWorkflowRules(supabaseClient: any, data: any, actor: AuthorizedActor) {
  const { trigger_event, hospital_id } = data
  if (typeof trigger_event !== 'string' || trigger_event.length === 0) {
    return jsonError(400, 'trigger_event is required')
  }

  // EDGE-07: the nested record drives every write, so pin it to the caller's
  // hospital (a record naming another hospital is refused) and verify its patient.
  const scoped = scopeRecordData(data.record_data, actor.hospitalId)
  if (!scoped.ok) return jsonError(scoped.status, scoped.error)
  const record_data: Record<string, any> = scoped.value
  if (record_data.patient_id !== undefined && record_data.patient_id !== null) {
    if (!(await assertPatientInHospital(supabaseClient, record_data.patient_id, actor.hospitalId))) {
      return jsonError(403, 'Forbidden - patient not found in caller hospital')
    }
  }

  // Get active workflow rules for this trigger event
  const { data: rules, error: rulesError } = await supabaseClient
    .from('workflow_rules')
    .select('*')
    .eq('active', true)
    .eq('trigger_event', trigger_event)
    .eq('hospital_id', hospital_id)

  if (rulesError) throw rulesError

  const triggeredRules = []
  const createdTasks = []

  for (const rule of rules ?? []) {
    // Check cooldown period
    if (rule.last_triggered) {
      const lastTriggered = new Date(rule.last_triggered)
      const cooldownMs = rule.cooldown_minutes * 60 * 1000
      if (Date.now() - lastTriggered.getTime() < cooldownMs) {
        continue // Skip rule due to cooldown
      }
    }

    // Check trigger conditions
    if (checkTriggerConditions(rule.trigger_conditions, record_data)) {
      triggeredRules.push(rule)

      // Execute rule actions
      const tasks = await executeRuleActions(supabaseClient, rule, record_data)
      createdTasks.push(...tasks)

      // Update last triggered timestamp
      await supabaseClient
        .from('workflow_rules')
        .update({ last_triggered: new Date().toISOString() })
        .eq('id', rule.id)
        .eq('hospital_id', hospital_id)
    }
  }

  return new Response(JSON.stringify({
    success: true,
    triggered_rules: triggeredRules.length,
    created_tasks: createdTasks.length,
    tasks: createdTasks
  }), {
    headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Execute all actions defined in a workflow rule.
 *
 * The actions payload is normalised to an array so that both legacy object-keyed
 * format `{ "task": {...} }` and the current array format
 * `[{ "type": "create_task", "target_role": "nurse", ... }]` are handled.
 *
 * Supported action types:
 *   create_task        – create a workflow_tasks row and notify the assignee
 *   send_notification  – insert a notifications row for the target role
 *   update_status      – update the source entity's status (no-op in Edge Fn,
 *                        status updates are performed by DB triggers)
 *   trigger_function   – fire another Edge Function by name
 */
async function executeRuleActions(supabaseClient: any, rule: WorkflowRule, recordData: any) {
  const createdTasks: any[] = []

  // ── Normalise actions to an array ────────────────────────────────────────
  let actionsArray: any[] = []
  if (Array.isArray(rule.actions)) {
    actionsArray = rule.actions
  } else if (rule.actions && typeof rule.actions === 'object') {
    // Legacy object-keyed format: { task: {...}, assignment_strategy: '...' }
    if (rule.actions.task) {
      actionsArray.push({ type: 'create_task', ...rule.actions.task })
    }
    // allow other legacy keys to fall through gracefully
  }

  for (const action of actionsArray) {
    switch (action.type) {

      case 'create_task': {
        const targetRole: string = action.target_role || 'admin'
        const assigneeId = await findOptimalAssigneeByRole(
          supabaseClient,
          targetRole,
          recordData.hospital_id,
        )

        if (assigneeId) {
          const dueDate = action.due_hours
            ? new Date(Date.now() + action.due_hours * 60 * 60 * 1000).toISOString()
            : null

          const { data: task, error: taskError } = await supabaseClient
            .from('workflow_tasks')
            .insert({
              title:        action.title       || action.message || `Workflow task: ${rule.name}`,
              description:  action.description || action.message,
              workflow_type: targetRole,
              priority:     action.priority    || action.metadata?.priority || 'normal',
              assigned_to:  assigneeId,
              patient_id:   recordData.patient_id ?? null,
              due_date:     dueDate,
              hospital_id:  recordData.hospital_id,
              metadata: {
                auto_generated: true,
                rule_id:        rule.id,
                trigger_event:  rule.trigger_event,
                ...(action.metadata || {}),
              },
            })
            .select()
            .single()

          if (!taskError && task) {
            createdTasks.push(task)
            await sendTaskNotification(supabaseClient, task, assigneeId)
          }
        }
        break
      }

      case 'send_notification': {
        // Fan-out by role; recordData must carry hospital_id
        const targetRole: string = action.target_role || 'admin'
        const { data: recipients } = await supabaseClient
          .from('profiles')
          .select('user_id')
          .eq('hospital_id', recordData.hospital_id)
          .in('user_id', (
            await supabaseClient
              .from('user_roles')
              .select('user_id')
              .eq('role', targetRole)
              .eq('hospital_id', recordData.hospital_id)
          ).data?.map((r: any) => r.user_id) ?? [])

        for (const recipient of recipients ?? []) {
          await supabaseClient.from('notifications').insert({
            hospital_id:  recordData.hospital_id,
            recipient_id: recipient.user_id,
            type:         action.notification_type || 'task',
            title:        action.title   || rule.name,
            message:      action.message || rule.description,
            priority:     action.metadata?.priority || 'normal',
            category:     action.category || 'clinical',
            metadata: {
              rule_id:       rule.id,
              trigger_event: rule.trigger_event,
              patient_id:    recordData.patient_id ?? null,
              ...(action.metadata || {}),
            },
          })
        }
        break
      }

      case 'update_status':
        // Status transitions are handled by DB triggers – nothing to do here.
        break

      case 'trigger_function': {
        const fnName: string = action.metadata?.function_name
        if (fnName) {
          try {
            await supabaseClient.functions.invoke(fnName, {
              body: { action: 'process', data: recordData },
            })
          } catch (err) {
            logEdge('warn', 'workflow-automation', { stage: 'trigger_function_failed', function_name: fnName, error: err })
          }
        }
        break
      }

      default:
        logEdge('warn', 'workflow-automation', { stage: 'unknown_action_type', action_type: action.type })
    }
  }

  return createdTasks
}

// ── Helper: find optimal assignee by role name (replaces findOptimalAssignee) ─
async function findOptimalAssigneeByRole(
  supabaseClient: any,
  role: string,
  hospitalId: string,
): Promise<string | null> {
  const { data: roleRows } = await supabaseClient
    .from('user_roles')
    .select('user_id')
    .eq('role', role)
    .eq('hospital_id', hospitalId)

  if (!roleRows?.length) return null

  const userIds = roleRows.map((r: any) => r.user_id)

  // Get current task counts to find least-loaded staff member
  const { data: taskCounts } = await supabaseClient
    .from('workflow_tasks')
    .select('assigned_to')
    .in('assigned_to', userIds)
    .in('status', ['pending', 'in_progress'])

  const workloadMap = new Map<string, number>()
  taskCounts?.forEach((task: any) => {
    workloadMap.set(task.assigned_to, (workloadMap.get(task.assigned_to) ?? 0) + 1)
  })

  let bestUserId: string | null = null
  let lowestWorkload = Infinity

  for (const userId of userIds) {
    const workload = workloadMap.get(userId) ?? 0
    if (workload < lowestWorkload) {
      lowestWorkload = workload
      bestUserId = userId
    }
  }

  return bestUserId
}

// ── Legacy wrapper kept for any callers that pass a workflowType string ──────
async function findOptimalAssignee(
  supabaseClient: any,
  workflowType: string,
  hospitalId: string,
  _strategy: string,
): Promise<string | null> {
  const roleMap: Record<string, string> = {
    consultation: 'doctor',
    medication:   'pharmacist',
    lab_order:    'lab_technician',
    billing:      'receptionist',
  }
  const role = roleMap[workflowType] ?? 'admin'
  return findOptimalAssigneeByRole(supabaseClient, role, hospitalId)
}

async function sendTaskNotification(supabaseClient: any, task: WorkflowTask, assigneeId: string) {
  // Get assignee profile
  // assigneeId is a user_roles.user_id (auth uid) in the task's hospital.
  const { data: assignee } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', assigneeId)
    .eq('hospital_id', task.hospital_id)
    .maybeSingle()

  if (!assignee) return

  // Create notification message
  await supabaseClient
    .from('communication_messages')
    .insert({
      sender_id: task.assigned_to, // System-generated, but we'll use assignee as sender for now
      sender_name: 'Workflow System',
      sender_role: 'system',
      recipient_ids: [assigneeId],
      subject: `New Task Assigned: ${task.title}`,
      content: `You have been assigned a new task: ${task.title}. Priority: ${task.priority}. Due: ${task.due_date ? new Date(task.due_date).toLocaleString() : 'ASAP'}`,
      priority: task.priority === 'urgent' ? 'urgent' : 'normal',
      message_type: 'task_assignment',
      patient_id: task.patient_id,
      task_id: task.id,
      hospital_id: task.hospital_id
    })
}

function checkTriggerConditions(conditions: any, recordData: any) {
  if (!conditions || Object.keys(conditions).length === 0) return true

  for (const [field, condition] of Object.entries(conditions)) {
    const fieldValue = recordData[field]
    const conditionObj = condition as any

    switch (conditionObj.operator) {
      case 'equals':
        if (fieldValue != conditionObj.value) return false
        break
      case 'not_equals':
        if (fieldValue == conditionObj.value) return false
        break
      case 'contains':
        if (!fieldValue?.includes(conditionObj.value)) return false
        break
      case 'greater_than':
        if (fieldValue <= conditionObj.value) return false
        break
      case 'less_than':
        if (fieldValue >= conditionObj.value) return false
        break
    }
  }

  return true
}

async function autoAssignTasks(supabaseClient: any, data: any) {
  const { hospital_id } = data
  const limit = clampInt(data.limit, { min: 1, max: 50, fallback: 10 })

  // Get unassigned tasks
  const { data: unassignedTasks, error } = await supabaseClient
    .from('workflow_tasks')
    .select('*')
    .is('assigned_to', null)
    .eq('hospital_id', hospital_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  const assignments = []

  for (const task of unassignedTasks ?? []) {
    const assigneeId = await findOptimalAssignee(supabaseClient, task.workflow_type, hospital_id, 'workload')

    if (assigneeId) {
      const { error: updateError } = await supabaseClient
        .from('workflow_tasks')
        .update({
          assigned_to: assigneeId,
          metadata: { ...task.metadata, auto_assigned: true }
        })
        .eq('id', task.id)
        .eq('hospital_id', hospital_id)

      if (!updateError) {
        assignments.push({ task_id: task.id, assigned_to: assigneeId })

        // Send notification
        await sendTaskNotification(supabaseClient, { ...task, assigned_to: assigneeId }, assigneeId)
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    assignments_made: assignments.length,
    assignments
  }), {
    headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
  })
}

async function calculateWorkflowMetrics(supabaseClient: any, data: any) {
  const { hospital_id } = data
  const timeframe_days = clampInt(data.timeframe_days, { min: 1, max: 365, fallback: 30 })

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - timeframe_days)

  // Get task metrics
  const { data: tasks } = await supabaseClient
    .from('workflow_tasks')
    .select('*')
    .eq('hospital_id', hospital_id)
    .gte('created_at', startDate.toISOString())

  const metrics = {
    total_tasks: tasks?.length || 0,
    completed_tasks: tasks?.filter(t => t.status === 'completed').length || 0,
    pending_tasks: tasks?.filter(t => t.status === 'pending').length || 0,
    overdue_tasks: tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length || 0,
    average_completion_time: 0,
    task_completion_rate: 0
  }

  // Calculate completion rate
  if (metrics.total_tasks > 0) {
    metrics.task_completion_rate = (metrics.completed_tasks / metrics.total_tasks) * 100
  }

  // Calculate average completion time
  const completedTasks = tasks?.filter(t => t.completed_at && t.created_at) || []
  if (completedTasks.length > 0) {
    const totalTime = completedTasks.reduce((acc, task) => {
      return acc + (new Date(task.completed_at).getTime() - new Date(task.created_at).getTime())
    }, 0)
    metrics.average_completion_time = totalTime / completedTasks.length / (1000 * 60 * 60) // hours
  }

  // Store metrics in workflow_metrics table
  await supabaseClient
    .from('workflow_metrics')
    .insert({
      metric_type: 'workflow_efficiency',
      hospital_id,
      metric_value: metrics.task_completion_rate,
      measurement_unit: 'percentage',
      recorded_date: new Date().toISOString().split('T')[0]
    })

  return new Response(JSON.stringify({
    success: true,
    metrics
  }), {
    headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sendBulkNotifications(supabaseClient: any, data: any, actor: AuthorizedActor) {
  const { hospital_id, subject, content, priority = 'normal', message_type = 'broadcast' } = data
  const recipient_roles: string[] = Array.isArray(data.recipient_roles)
    ? data.recipient_roles.filter((r: unknown) => typeof r === 'string').slice(0, 10)
    : []
  if (recipient_roles.length === 0) return jsonError(400, 'recipient_roles is required')
  if (typeof subject !== 'string' || subject.length === 0 || subject.length > 200) {
    return jsonError(400, 'subject is required (max 200 chars)')
  }
  if (typeof content !== 'string' || content.length === 0 || content.length > 5000) {
    return jsonError(400, 'content is required (max 5000 chars)')
  }

  // Recipients: staff holding one of the roles in this hospital (profiles has no role column).
  const { data: roleRows, error: roleError } = await supabaseClient
    .from('user_roles')
    .select('user_id')
    .eq('hospital_id', hospital_id)
    .in('role', recipient_roles)
  if (roleError) throw roleError

  const userIds = [...new Set((roleRows ?? []).map((r: any) => r.user_id))]
  const { data: recipients, error } = userIds.length
    ? await supabaseClient.from('profiles').select('id').eq('hospital_id', hospital_id).in('user_id', userIds)
    : { data: [], error: null }
  if (error) throw error

  if (!recipients?.length) {
    return new Response(JSON.stringify({
      success: true,
      message: 'No recipients found for the specified roles',
      notifications_sent: 0
    }), {
      headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const recipientIds = recipients.map((r: any) => r.id)

  // EDGE-07: the sender is the verified caller, not "the first admin".
  const { data: sender } = await supabaseClient
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('user_id', actor.userId)
    .eq('hospital_id', hospital_id)
    .maybeSingle()
  if (!sender) return jsonError(403, 'Forbidden - sender profile not found in caller hospital')

  const { data: message, error: messageError } = await supabaseClient
    .from('communication_messages')
    .insert({
      sender_id: sender.id,
      sender_name: [sender.first_name, sender.last_name].filter(Boolean).join(' ') || 'Administrator',
      sender_role: 'admin',
      recipient_ids: recipientIds,
      recipient_roles: recipient_roles,
      subject,
      content,
      priority,
      message_type,
      hospital_id
    })
    .select()
    .single()

  if (messageError) throw messageError

  return new Response(JSON.stringify({
    success: true,
    message_id: message.id,
    notifications_sent: recipientIds.length,
    recipients: recipientIds
  }), {
    headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
  })
}
