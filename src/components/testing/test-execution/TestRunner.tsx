import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Terminal,
  AlertTriangle
} from 'lucide-react';
import { AutomationScript, TestExecutionResult } from '../../../types/testing';
import { testExecutionService, ExecutionProgress } from '../../../services/testing/testExecutionService';
import { useTesting } from '../../../contexts/TestingContext';

interface TestRunnerProps {
  script?: AutomationScript;
  onExecutionComplete?: (result: TestExecutionResult) => void;
}

export default function TestRunner({ script, onExecutionComplete }: TestRunnerProps) {
  const { addExecutionResult } = useTesting();
  const [isRunning, setIsRunning] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<TestExecutionResult | null>(null);
  const [progress, setProgress] = useState<ExecutionProgress | null>(null);
  const [executionHistory, setExecutionHistory] = useState<TestExecutionResult[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (script) {
      // Load execution history for this script
      // In a real app, this would filter from all executions
      setExecutionHistory([]);
    }
  }, [script]);

  const runTest = async () => {
    if (!script) return;

    setIsRunning(true);
    setProgress({ status: 'running', currentStep: 'Starting execution...' });

    try {
      const executionId = `exec_${Date.now()}`;

      // Set up progress monitoring
      testExecutionService.onProgress(executionId, (progressUpdate) => {
        setProgress(progressUpdate);
      });

      // Execute the test
      const result = await testExecutionService.executeScript({
        script,
        baseUrl: 'http://localhost:8080', // Should be configurable
        headless: true,
        timeout: 30000
      });

      setCurrentExecution(result);
      addExecutionResult(result);

      if (onExecutionComplete) {
        onExecutionComplete(result);
      }

      // Add to history
      setExecutionHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10

    } catch (error) {
      console.error('Test execution failed:', error);
      setProgress({
        status: 'failed',
        currentStep: 'Execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const stopExecution = () => {
    // In a real implementation, this would signal the execution service to stop
    setIsRunning(false);
    setProgress({ status: 'failed', currentStep: 'Execution stopped by user' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getExecutionStatusBadge = (result: TestExecutionResult) => {
    const isPassed = result.status === 'Passed';
    return (
      <Badge className={isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {isPassed ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
        {result.status}
      </Badge>
    );
  };

  if (!script) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No script selected for execution</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Execution Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Test Execution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="font-medium">{script.name}</h3>
              <p className="text-sm text-muted-foreground">{script.category}</p>
            </div>

            <div className="flex gap-2">
              {!isRunning ? (
                <Button onClick={runTest} className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Run Test
                </Button>
              ) : (
                <Button onClick={stopExecution} variant="destructive" className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              )}

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Terminal className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Test Execution Details</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-96">
                    <pre className="text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                      <code>{script.code}</code>
                    </pre>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Progress Display */}
          {progress && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(progress.status)}
                <span className="text-sm font-medium">{progress.currentStep}</span>
              </div>

              {progress.progress !== undefined && (
                <Progress value={progress.progress} className="h-2" />
              )}

              {progress.error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {progress.error}
                </div>
              )}
            </div>
          )}

          {/* Current Execution Result */}
          {currentExecution && (
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Latest Execution</span>
                {getExecutionStatusBadge(currentExecution)}
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <div>Duration: {currentExecution.duration ? `${currentExecution.duration}ms` : 'N/A'}</div>
                <div>Executed: {currentExecution.runAt.toLocaleString()}</div>
                {currentExecution.errorMessage && (
                  <div className="text-red-600 mt-2">
                    Error: {currentExecution.errorMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
        </CardHeader>
        <CardContent>
          {executionHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No execution history yet</p>
              <p className="text-sm">Run the test to see execution results</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executionHistory.map((execution) => (
                <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {execution.status === 'Passed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {execution.runAt.toLocaleDateString()} {execution.runAt.toLocaleTimeString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Duration: {execution.duration ? `${execution.duration}ms` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  {getExecutionStatusBadge(execution)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}