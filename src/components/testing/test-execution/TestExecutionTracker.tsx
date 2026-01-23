import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Upload,
  Download,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Calendar,
  BarChart3
} from 'lucide-react';
import { TestExecutionResult, TestStatus } from '../../../types/testing';
import { useTesting } from '../../../contexts/TestingContext';

interface TestExecutionTrackerProps {
  onExecutionComplete?: (results: TestExecutionResult[]) => void;
}

interface PlaywrightResult {
  test: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  project?: string;
  browser?: string;
}

interface PlaywrightReport {
  results: PlaywrightResult[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    duration: number;
  };
}

export default function TestExecutionTracker({ onExecutionComplete }: TestExecutionTrackerProps) {
  const { state, addExecutionResult } = useTesting();
  const { executionResults } = state;
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState<'json' | 'junit' | 'manual'>('json');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportText(content);
    };
    reader.readAsText(file);
  };

  const parsePlaywrightResults = (jsonContent: string): TestExecutionResult[] => {
    try {
      const report: PlaywrightReport = JSON.parse(jsonContent);
      return report.results.map(result => ({
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        testCaseId: result.test, // This would need to be mapped to actual test case IDs
        runAt: new Date(),
        status: result.status === 'passed' ? 'Passed' :
                result.status === 'failed' ? 'Failed' : 'N/A',
        duration: result.duration,
        errorMessage: result.error,
        logs: `Browser: ${result.browser || 'Unknown'}\nProject: ${result.project || 'Unknown'}`
      }));
    } catch (error) {
      console.error('Error parsing Playwright results:', error);
      return [];
    }
  };

  const parseJUnitResults = (xmlContent: string): TestExecutionResult[] => {
    // Basic JUnit XML parsing - in a real implementation, you'd use a proper XML parser
    const results: TestExecutionResult[] = [];
    const testcaseRegex = /<testcase[^>]*name="([^"]*)"[^>]*time="([^"]*)"[^>]*>/g;
    const failureRegex = /<failure[^>]*>([\s\S]*?)<\/failure>/g;

    let match;
    while ((match = testcaseRegex.exec(xmlContent)) !== null) {
      const testName = match[1];
      const duration = parseFloat(match[2]) * 1000; // Convert to milliseconds

      // Check for failure
      const failureMatch = failureRegex.exec(xmlContent);
      const hasFailure = failureMatch !== null;

      results.push({
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        testCaseId: testName,
        runAt: new Date(),
        status: hasFailure ? 'Failed' : 'Passed',
        duration,
        errorMessage: hasFailure ? failureMatch[1] : undefined
      });
    }

    return results;
  };

  const importResults = () => {
    let results: TestExecutionResult[] = [];

    switch (importFormat) {
      case 'json':
        results = parsePlaywrightResults(importText);
        break;
      case 'junit':
        results = parseJUnitResults(importText);
        break;
      case 'manual':
        // For manual entry, we'd need a different UI
        break;
    }

    // Add results to context
    results.forEach(result => addExecutionResult(result));

    if (onExecutionComplete) {
      onExecutionComplete(results);
    }

    setIsImportDialogOpen(false);
    setImportText('');
  };

  const exportResults = () => {
    const exportData = {
      executions: executionResults,
      exportedAt: new Date().toISOString(),
      totalExecutions: executionResults.length,
      summary: {
        passed: executionResults.filter(r => r.status === 'Passed').length,
        failed: executionResults.filter(r => r.status === 'Failed').length,
        blocked: executionResults.filter(r => r.status === 'Blocked').length,
        notStarted: executionResults.filter(r => r.status === 'Not Started').length,
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-executions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'Passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Blocked':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'Passed':
        return 'bg-green-100 text-green-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      case 'Blocked':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Group executions by date
  const groupedExecutions = executionResults.reduce((groups, execution) => {
    const date = execution.runAt.toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(execution);
    return groups;
  }, {} as Record<string, TestExecutionResult[]>);

  return (
    <div className="space-y-4">
      {/* Header with Import/Export Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Test Execution Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Import automation results and track test execution history
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Results
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import Test Results</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="format">Import Format</Label>
                      <select
                        id="format"
                        value={importFormat}
                        onChange={(e) => setImportFormat(e.target.value as 'json' | 'junit' | 'manual')}
                        className="w-full mt-1 p-2 border rounded"
                      >
                        <option value="json">Playwright JSON Report</option>
                        <option value="junit">JUnit XML</option>
                        <option value="manual">Manual Entry</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="file">Upload File</Label>
                      <Input
                        id="file"
                        type="file"
                        accept={importFormat === 'json' ? '.json' : importFormat === 'junit' ? '.xml' : '*'}
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="content">Or paste content directly</Label>
                      <Textarea
                        id="content"
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder={
                          importFormat === 'json'
                            ? 'Paste Playwright JSON report content...'
                            : importFormat === 'junit'
                            ? 'Paste JUnit XML content...'
                            : 'Enter manual test results...'
                        }
                        rows={10}
                        className="mt-1 font-mono text-sm"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={importResults} disabled={!importText.trim()}>
                        Import Results
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={exportResults} disabled={executionResults.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{executionResults.length}</div>
                <div className="text-sm text-muted-foreground">Total Executions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {executionResults.filter(r => r.status === 'Passed').length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {executionResults.filter(r => r.status === 'Failed').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-2xl font-bold">
                  {executionResults.length > 0
                    ? Math.round(executionResults.reduce((sum, r) => sum + (r.duration || 0), 0) / executionResults.length)
                    : 0}ms
                </div>
                <div className="text-sm text-muted-foreground">Avg Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedExecutions).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No execution results yet</p>
              <p className="text-sm">Import test results to see execution history</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {Object.entries(groupedExecutions)
                  .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                  .map(([date, executions]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{date}</span>
                        <Badge variant="outline">{executions.length} executions</Badge>
                      </div>
                      <div className="space-y-2 ml-6">
                        {executions.map((execution) => (
                          <div
                            key={execution.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              {getStatusIcon(execution.status)}
                              <div>
                                <div className="font-medium">{execution.testCaseId}</div>
                                <div className="text-sm text-muted-foreground">
                                  {execution.runAt.toLocaleTimeString()}
                                  {execution.duration && ` • ${execution.duration}ms`}
                                </div>
                              </div>
                            </div>
                            <Badge className={getStatusColor(execution.status)}>
                              {execution.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}