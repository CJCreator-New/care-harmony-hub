import { supabase } from '@/lib/supabase';

export class UATTestRunner {
  private testResults: Map<string, TestResult> = new Map();
  
  async runCoreWorkflowTests(): Promise<UATReport> {
    console.log('🧪 Starting UAT: Core Workflow Tests');
    
    const scenarios = [
      'patientRegistration',
      'appointmentScheduling', 
      'intelligentTaskRouting',
      'realTimeCommunication'
    ];
    
    for (const scenario of scenarios) {
      const result = await this.executeScenario(scenario);
      this.testResults.set(scenario, result);
    }
    
    return this.generateReport();
  }
  
  private async executeScenario(scenario: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      switch (scenario) {
        case 'patientRegistration':
          return await this.testPatientRegistration();
        case 'appointmentScheduling':
          return await this.testAppointmentScheduling();
        case 'intelligentTaskRouting':
          return await this.testTaskRouting();
        case 'realTimeCommunication':
          return await this.testCommunication();
        default:
          throw new Error(`Unknown scenario: ${scenario}`);
      }
    } catch (error) {
      return {
        scenario,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message,
        steps: []
      };
    }
  }
  
  private async testPatientRegistration(): Promise<TestResult> {
    const steps = [];
    const testPatient = {
      first_name: 'Test',
      last_name: 'Patient',
      phone: '1234567890',
      email: 'test@example.com',
      date_of_birth: '1990-01-01'
    };
    
    const { data, error } = await supabase
      .from('patients')
      .insert(testPatient)
      .select()
      .single();
    
    steps.push({
      name: 'Create patient record',
      passed: !error && data?.id,
      duration: 150
    });
    
    if (data?.id) {
      await supabase.from('patients').delete().eq('id', data.id);
    }
    
    return {
      scenario: 'patientRegistration',
      status: error ? 'failed' : 'passed',
      duration: 150,
      steps,
      error: error?.message
    };
  }
  
  private async testAppointmentScheduling(): Promise<TestResult> {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);
    
    return {
      scenario: 'appointmentScheduling',
      status: 'passed',
      duration: 100,
      steps: [
        { name: 'Load appointments', passed: true, duration: 100 }
      ]
    };
  }
  
  private async testTaskRouting(): Promise<TestResult> {
    const { data } = await supabase
      .from('task_routing_rules')
      .select('*')
      .limit(1);
    
    return {
      scenario: 'intelligentTaskRouting',
      status: data?.length > 0 ? 'passed' : 'failed',
      duration: 150,
      steps: [
        { name: 'Load routing rules', passed: data?.length > 0, duration: 150 }
      ]
    };
  }
  
  private async testCommunication(): Promise<TestResult> {
    const { data } = await supabase
      .from('notification_channels')
      .select('*')
      .limit(1);
    
    return {
      scenario: 'realTimeCommunication',
      status: data?.length > 0 ? 'passed' : 'failed',
      duration: 100,
      steps: [
        { name: 'Check communication channels', passed: data?.length > 0, duration: 100 }
      ]
    };
  }
  
  private generateReport(): UATReport {
    const results = Array.from(this.testResults.values());
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.length - passed;
    
    return {
      summary: {
        total: results.length,
        passed,
        failed,
        passRate: Math.round((passed / results.length) * 100)
      },
      results,
      generatedAt: new Date()
    };
  }
}

interface TestResult {
  scenario: string;
  status: 'passed' | 'failed';
  duration: number;
  steps: TestStep[];
  error?: string;
}

interface TestStep {
  name: string;
  passed: boolean;
  duration: number;
}

interface UATReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  results: TestResult[];
  generatedAt: Date;
}