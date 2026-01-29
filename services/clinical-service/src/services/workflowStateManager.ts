import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { connectDatabase } from '../config/database';
import { connectRedis } from '../config/redis';
import { getProducer } from '../config/kafka';

// Workflow state definitions
export const WorkflowStateSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold',
  'failed'
]);

export const WorkflowStepStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'failed',
  'blocked'
]);

export const WorkflowPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'urgent',
  'critical'
]);

// State transition definitions
export interface WorkflowTransition {
  from: string;
  to: string;
  conditions?: string[];
  requiredPermissions?: string[];
  sideEffects?: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: z.infer<typeof WorkflowStepStatusSchema>;
  assigned_to?: string;
  assigned_role?: string;
  due_date?: string;
  completed_at?: string;
  notes?: string;
  dependencies?: string[]; // IDs of steps that must be completed first
  timeout?: number; // minutes
  retry_count?: number;
  max_retries?: number;
}

export interface WorkflowState {
  id: string;
  workflow_id: string;
  version: number;
  state: z.infer<typeof WorkflowStateSchema>;
  current_step: string;
  steps: WorkflowStep[];
  metadata: Record<string, any>;
  created_by: string;
  created_at: string;
  checksum: string; // For integrity validation
}

export interface WorkflowStateHistory {
  id: string;
  workflow_id: string;
  state_id: string;
  previous_state_id?: string;
  transition: string;
  reason?: string;
  metadata: Record<string, any>;
  created_by: string;
  created_at: string;
}

export class WorkflowStateManager {
  private fastify?: FastifyInstance;
  private transitions: Map<string, WorkflowTransition[]> = new Map();

  constructor(fastify?: FastifyInstance) {
    if (fastify) {
      this.fastify = fastify;
    }
    this.initializeTransitions();
  }

  private initializeTransitions(): void {
    // Define valid state transitions for consultation workflows
    const consultationTransitions: WorkflowTransition[] = [
      {
        from: 'pending',
        to: 'in_progress',
        conditions: ['user_authenticated', 'patient_assigned'],
        requiredPermissions: ['start_consultation']
      },
      {
        from: 'in_progress',
        to: 'completed',
        conditions: ['all_steps_completed', 'documentation_complete'],
        requiredPermissions: ['complete_consultation']
      },
      {
        from: 'in_progress',
        to: 'on_hold',
        conditions: ['awaiting_external_input'],
        requiredPermissions: ['hold_consultation']
      },
      {
        from: 'on_hold',
        to: 'in_progress',
        conditions: ['external_input_received'],
        requiredPermissions: ['resume_consultation']
      },
      {
        from: 'pending',
        to: 'cancelled',
        conditions: ['cancellation_requested'],
        requiredPermissions: ['cancel_consultation']
      },
      {
        from: 'in_progress',
        to: 'cancelled',
        conditions: ['cancellation_requested'],
        requiredPermissions: ['cancel_consultation']
      },
      {
        from: 'on_hold',
        to: 'cancelled',
        conditions: ['cancellation_requested'],
        requiredPermissions: ['cancel_consultation']
      },
      {
        from: 'in_progress',
        to: 'failed',
        conditions: ['system_error', 'timeout_exceeded']
      }
    ];

    this.transitions.set('consultation', consultationTransitions);
  }

  async createWorkflowState(
    workflowId: string,
    initialState: Partial<WorkflowState>,
    userId: string
  ): Promise<WorkflowState> {
    const pool = connectDatabase();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create initial state
      const stateData = {
        workflow_id: workflowId,
        version: 1,
        state: initialState.state || 'pending',
        current_step: initialState.current_step || 'assessment',
        steps: initialState.steps || [],
        metadata: initialState.metadata || {},
        created_by: userId,
        checksum: this.generateChecksum(initialState)
      };

      const stateQuery = `
        INSERT INTO workflow_states (
          workflow_id, version, state, current_step, steps, metadata, created_by, checksum
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const stateValues = [
        stateData.workflow_id,
        stateData.version,
        stateData.state,
        stateData.current_step,
        JSON.stringify(stateData.steps),
        JSON.stringify(stateData.metadata),
        stateData.created_by,
        stateData.checksum
      ];

      const stateResult = await client.query(stateQuery, stateValues);
      const state = stateResult.rows[0];

      // Create history entry
      await this.createStateHistory(client, {
        workflow_id: workflowId,
        state_id: state.id,
        transition: 'created',
        reason: 'Initial workflow state created',
        metadata: {},
        created_by: userId
      });

      await client.query('COMMIT');

      // Cache the state
      const redis = await connectRedis();
      await redis.setEx(
        `workflow_state:${workflowId}`,
        3600, // 1 hour
        JSON.stringify(state)
      );

      logger.info('Workflow state created', {
        workflow_id: workflowId,
        state_id: state.id,
        version: state.version
      });

      return this.deserializeState(state);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create workflow state', { error, workflow_id: workflowId });
      throw error;
    } finally {
      client.release();
    }
  }

  async getWorkflowState(workflowId: string): Promise<WorkflowState | null> {
    // Check cache first
    const redis = await connectRedis();
    const cached = await redis.get(`workflow_state:${workflowId}`);
    if (cached) {
      return this.deserializeState(JSON.parse(cached));
    }

    const pool = connectDatabase();
    const query = `
      SELECT * FROM workflow_states
      WHERE workflow_id = $1
      ORDER BY version DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [workflowId]);

    if (result.rows.length === 0) {
      return null;
    }

    const state = result.rows[0];

    // Cache the result
    await redis.setEx(`workflow_state:${workflowId}`, 3600, JSON.stringify(state));

    return this.deserializeState(state);
  }

  async transitionWorkflowState(
    workflowId: string,
    newState: string,
    newCurrentStep: string,
    userId: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<WorkflowState> {
    const pool = connectDatabase();
    const client = await pool.connect();
    const redis = await connectRedis();

    try {
      await client.query('BEGIN');

      // Get current state
      const currentState = await this.getWorkflowState(workflowId);
      if (!currentState) {
        throw new Error(`Workflow state not found for workflow ${workflowId}`);
      }

      // Validate transition
      const workflowType = await this.getWorkflowType(workflowId, client);
      const isValidTransition = await this.validateTransition(
        workflowType,
        currentState.state,
        newState,
        userId
      );

      if (!isValidTransition) {
        throw new Error(`Invalid state transition from ${currentState.state} to ${newState}`);
      }

      // Create new state version
      const newVersion = currentState.version + 1;
      const updatedSteps = this.updateStepStatuses(currentState.steps, newCurrentStep);

      const stateData = {
        workflow_id: workflowId,
        version: newVersion,
        state: newState,
        current_step: newCurrentStep,
        steps: updatedSteps,
        metadata: { ...currentState.metadata, ...metadata },
        created_by: userId,
        checksum: this.generateChecksum({
          state: newState,
          current_step: newCurrentStep,
          steps: updatedSteps,
          metadata: { ...currentState.metadata, ...metadata }
        })
      };

      const stateQuery = `
        INSERT INTO workflow_states (
          workflow_id, version, state, current_step, steps, metadata, created_by, checksum
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const stateValues = [
        stateData.workflow_id,
        stateData.version,
        stateData.state,
        stateData.current_step,
        JSON.stringify(stateData.steps),
        JSON.stringify(stateData.metadata),
        stateData.created_by,
        stateData.checksum
      ];

      const stateResult = await client.query(stateQuery, stateValues);
      const newStateRecord = stateResult.rows[0];

      // Create history entry
      await this.createStateHistory(client, {
        workflow_id: workflowId,
        state_id: newStateRecord.id,
        previous_state_id: currentState.id,
        transition: `${currentState.state}->${newState}`,
        reason: reason || 'State transition',
        metadata: metadata || {},
        created_by: userId
      });

      // Update workflow record
      await this.updateWorkflowRecord(client, workflowId, newState, newCurrentStep, updatedSteps);

      await client.query('COMMIT');

      // Update cache
      await redis.setEx(
        `workflow_state:${workflowId}`,
        3600,
        JSON.stringify(newStateRecord)
      );

      // Publish event
      const kafkaProducer = await getProducer();
      await kafkaProducer.send({
        topic: 'workflow-events',
        messages: [{
          key: workflowId,
          value: JSON.stringify({
            event: 'workflow_state_changed',
            workflow_id: workflowId,
            from_state: currentState.state,
            to_state: newState,
            current_step: newCurrentStep,
            version: newVersion,
            user_id: userId
          })
        }]
      });

      logger.info('Workflow state transitioned', {
        workflow_id: workflowId,
        from_state: currentState.state,
        to_state: newState,
        version: newVersion
      });

      return this.deserializeState(newStateRecord);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to transition workflow state', { error, workflow_id: workflowId });
      throw error;
    } finally {
      client.release();
    }
  }

  async getWorkflowHistory(workflowId: string, limit: number = 50): Promise<WorkflowStateHistory[]> {
    const pool = connectDatabase();
    const query = `
      SELECT * FROM workflow_state_history
      WHERE workflow_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [workflowId, limit]);
    return result.rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }));
  }

  async recoverWorkflowState(
    workflowId: string,
    targetVersion: number,
    userId: string,
    reason: string
  ): Promise<WorkflowState> {
    const pool = connectDatabase();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get target state
      const targetStateQuery = `
        SELECT * FROM workflow_states
        WHERE workflow_id = $1 AND version = $2
      `;
      const targetResult = await client.query(targetStateQuery, [workflowId, targetVersion]);

      if (targetResult.rows.length === 0) {
        throw new Error(`Target state version ${targetVersion} not found for workflow ${workflowId}`);
      }

      const targetState = targetResult.rows[0];

      // Create recovery state
      const recoveryVersion = await this.getNextVersion(workflowId, client);
      const recoveryState = {
        workflow_id: workflowId,
        version: recoveryVersion,
        state: targetState.state,
        current_step: targetState.current_step,
        steps: JSON.parse(targetState.steps),
        metadata: {
          ...JSON.parse(targetState.metadata),
          recovery: {
            from_version: targetVersion,
            reason,
            recovered_at: new Date().toISOString(),
            recovered_by: userId
          }
        },
        created_by: userId,
        checksum: this.generateChecksum({
          state: targetState.state,
          current_step: targetState.current_step,
          steps: JSON.parse(targetState.steps),
          metadata: JSON.parse(targetState.metadata)
        })
      };

      const insertQuery = `
        INSERT INTO workflow_states (
          workflow_id, version, state, current_step, steps, metadata, created_by, checksum
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        recoveryState.workflow_id,
        recoveryState.version,
        recoveryState.state,
        recoveryState.current_step,
        JSON.stringify(recoveryState.steps),
        JSON.stringify(recoveryState.metadata),
        recoveryState.created_by,
        recoveryState.checksum
      ];

      const result = await client.query(insertQuery, values);
      const newState = result.rows[0];

      // Create history entry
      await this.createStateHistory(client, {
        workflow_id: workflowId,
        state_id: newState.id,
        previous_state_id: targetState.id,
        transition: 'recovered',
        reason,
        metadata: { target_version: targetVersion },
        created_by: userId
      });

      // Update workflow record
      await this.updateWorkflowRecord(client, workflowId, newState.state, newState.current_step, recoveryState.steps);

      await client.query('COMMIT');

      // Update cache
      const redis = await connectRedis();
      await redis.setEx(`workflow_state:${workflowId}`, 3600, JSON.stringify(newState));

      logger.info('Workflow state recovered', {
        workflow_id: workflowId,
        from_version: targetVersion,
        to_version: recoveryVersion
      });

      return this.deserializeState(newState);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to recover workflow state', { error, workflow_id: workflowId });
      throw error;
    } finally {
      client.release();
    }
  }

  private async validateTransition(
    workflowType: string,
    fromState: string,
    toState: string,
    userId: string
  ): Promise<boolean> {
    const transitions = this.transitions.get(workflowType);
    if (!transitions) {
      return false;
    }

    const validTransition = transitions.find(t => t.from === fromState && t.to === toState);
    if (!validTransition) {
      return false;
    }

    // Check permissions if required
    if (validTransition.requiredPermissions) {
      const hasPermissions = await this.checkUserPermissions(userId, validTransition.requiredPermissions);
      if (!hasPermissions) {
        return false;
      }
    }

    // Check conditions if specified
    if (validTransition.conditions) {
      const conditionsMet = await this.checkConditions(validTransition.conditions, { 
        userId,
        workflowId,
        patientId: currentState.metadata?.patient_id,
        steps: currentState.steps,
        metadata: currentState.metadata
      });
      if (!conditionsMet) {
        return false;
      }
    }

    return true;
  }

  private async checkUserPermissions(userId: string, permissions: string[]): Promise<boolean> {
    // Query user roles and permissions from database
    const pool = connectDatabase();
    
    try {
      // Check if user has any of the required permissions
      const query = `
        SELECT COUNT(*) as count
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1
        AND p.name = ANY($2)
      `;
      
      const result = await pool.query(query, [userId, permissions]);
      const count = parseInt(result.rows[0].count);
      
      // User has permission if they have at least one of the required permissions
      return count > 0;
    } catch (error) {
      logger.error('Failed to check user permissions', { error, userId, permissions });
      // Fail closed: deny access if permission check fails
      return false;
    }
  }

  private async checkConditions(conditions: string[], context: any): Promise<boolean> {
    // Evaluate business conditions for workflow transitions
    const pool = connectDatabase();
    
    try {
      for (const condition of conditions) {
        switch (condition) {
          case 'user_authenticated':
            // User must be authenticated (already validated by JWT middleware)
            if (!context.userId) {
              return false;
            }
            break;
            
          case 'patient_assigned':
            // Patient must be assigned to the workflow
            if (!context.patientId) {
              return false;
            }
            break;
            
          case 'all_steps_completed':
            // All workflow steps must be completed
            if (!context.steps || !Array.isArray(context.steps)) {
              return false;
            }
            const allCompleted = context.steps.every((step: any) => 
              step.status === 'completed' || step.status === 'skipped'
            );
            if (!allCompleted) {
              return false;
            }
            break;
            
          case 'documentation_complete':
            // Documentation must be complete
            if (!context.metadata?.documentation_complete) {
              return false;
            }
            break;
            
          case 'awaiting_external_input':
            // Workflow is waiting for external input (e.g., lab results)
            if (!context.metadata?.awaiting_external) {
              return false;
            }
            break;
            
          case 'external_input_received':
            // External input has been received
            if (context.metadata?.awaiting_external) {
              return false;
            }
            break;
            
          case 'cancellation_requested':
            // Cancellation must be explicitly requested
            if (!context.metadata?.cancellation_requested) {
              return false;
            }
            break;
            
          case 'system_error':
            // System error condition (should fail transition)
            if (context.metadata?.system_error) {
              return false;
            }
            break;
            
          case 'timeout_exceeded':
            // Workflow timeout exceeded
            if (!context.metadata?.timeout_exceeded) {
              return false;
            }
            break;
            
          default:
            // Unknown condition - log warning but allow
            logger.warn(`Unknown workflow condition: ${condition}`);
            break;
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to check workflow conditions', { error, conditions });
      // Fail closed: deny transition if condition check fails
      return false;
    }
  }

  private updateStepStatuses(steps: WorkflowStep[], currentStepId: string): WorkflowStep[] {
    return steps.map(step => {
      if (step.id === currentStepId) {
        return { ...step, status: 'in_progress' as const };
      }
      return step;
    });
  }

  private async createStateHistory(
    client: any,
    history: Omit<WorkflowStateHistory, 'id' | 'created_at'>
  ): Promise<void> {
    const query = `
      INSERT INTO workflow_state_history (
        workflow_id, state_id, previous_state_id, transition, reason, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await client.query(query, [
      history.workflow_id,
      history.state_id,
      history.previous_state_id || null,
      history.transition,
      history.reason || null,
      JSON.stringify(history.metadata || {}),
      history.created_by
    ]);
  }

  private async updateWorkflowRecord(
    client: any,
    workflowId: string,
    state: string,
    currentStep: string,
    steps: WorkflowStep[]
  ): Promise<void> {
    const query = `
      UPDATE clinical_workflows
      SET status = $1, current_step = $2, steps = $3, updated_at = NOW()
      WHERE id = $4
    `;

    await client.query(query, [state, currentStep, JSON.stringify(steps), workflowId]);
  }

  private async getWorkflowType(workflowId: string, client: any): Promise<string> {
    const query = 'SELECT workflow_type FROM clinical_workflows WHERE id = $1';
    const result = await client.query(query, [workflowId]);
    return result.rows[0]?.workflow_type || 'consultation';
  }

  private async getNextVersion(workflowId: string, client: any): Promise<number> {
    const query = 'SELECT MAX(version) as max_version FROM workflow_states WHERE workflow_id = $1';
    const result = await client.query(query, [workflowId]);
    return (result.rows[0]?.max_version || 0) + 1;
  }

  private generateChecksum(data: any): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  private deserializeState(state: any): WorkflowState {
    return {
      ...state,
      steps: state.steps ? JSON.parse(state.steps) : [],
      metadata: state.metadata ? JSON.parse(state.metadata) : {}
    };
  }
}