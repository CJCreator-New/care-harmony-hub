import { TestExecutionResult, AutomationScript } from '../../types/testing';

export interface ExecutionOptions {
  script: AutomationScript;
  baseUrl?: string;
  headless?: boolean;
  timeout?: number;
}

export interface ExecutionProgress {
  status: 'running' | 'completed' | 'failed';
  currentStep?: string;
  progress?: number;
  error?: string;
}

export class TestExecutionService {
  private static instance: TestExecutionService;
  private executionQueue: Map<string, ExecutionOptions> = new Map();
  private progressCallbacks: Map<string, (progress: ExecutionProgress) => void> = new Map();

  static getInstance(): TestExecutionService {
    if (!TestExecutionService.instance) {
      TestExecutionService.instance = new TestExecutionService();
    }
    return TestExecutionService.instance;
  }

  async executeScript(options: ExecutionOptions): Promise<TestExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.executionQueue.set(executionId, options);

    try {
      // Update progress: Starting execution
      this.updateProgress(executionId, { status: 'running', currentStep: 'Starting execution...' });

      // Execute test directly (simulated for now)
      const result = await this.executeViaDirectExecution(options, executionId);

      this.executionQueue.delete(executionId);
      return result;

    } catch (error) {
      this.executionQueue.delete(executionId);
      throw error;
    }
  }

  private async executeViaDirectExecution(options: ExecutionOptions, executionId: string): Promise<TestExecutionResult> {
    const { script, baseUrl = 'http://localhost:8080', headless = true, timeout = 30000 } = options;

    try {
      // Update progress: Preparing script
      this.updateProgress(executionId, { status: 'running', currentStep: 'Preparing script for execution', progress: 10 });

      // For now, simulate execution since we can't run Python directly in browser
      // In production, this would integrate with a backend service
      const result = await this.simulateExecution(options, executionId);

      return result;

    } catch (error) {
      console.error('Test execution failed:', error);
      this.updateProgress(executionId, {
        status: 'failed',
        currentStep: 'Execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  onProgress(executionId: string, callback: (progress: ExecutionProgress) => void) {
    this.progressCallbacks.set(executionId, callback);
  }

  private updateProgress(executionId: string, progress: ExecutionProgress) {
    const callback = this.progressCallbacks.get(executionId);
    if (callback) {
      callback(progress);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}

// Export singleton instance
export const testExecutionService = TestExecutionService.getInstance();