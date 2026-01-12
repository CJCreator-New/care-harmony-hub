import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, CheckCircle, XCircle, Clock } from 'lucide-react';
import { UATTestRunner } from '@/testing/UATTestRunner';

export const UATDashboard = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState(null);
  
  const runTests = async () => {
    setIsRunning(true);
    try {
      const runner = new UATTestRunner();
      const testReport = await runner.runCoreWorkflowTests();
      setReport(testReport);
    } catch (error) {
      console.error('UAT failed:', error);
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Acceptance Testing</h1>
        <Button onClick={runTests} disabled={isRunning}>
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? 'Running Tests...' : 'Run UAT'}
        </Button>
      </div>
      
      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{report.summary.total}</div>
                  <div className="text-sm text-gray-600">Total Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{report.summary.passed}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{report.summary.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{report.summary.passRate}%</div>
                  <div className="text-sm text-gray-600">Pass Rate</div>
                </div>
              </div>
              <Progress value={report.summary.passRate} className="w-full" />
            </CardContent>
          </Card>
          
          <div className="grid gap-4">
            {report.results.map((result) => (
              <Card key={result.scenario}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize">
                      {result.scenario.replace(/([A-Z])/g, ' $1').trim()}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.status === 'passed' ? 'default' : 'destructive'}>
                        {result.status === 'passed' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {result.status}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-3 h-3 mr-1" />
                        {result.duration}ms
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.steps.map((step, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{step.name}</span>
                        <div className="flex items-center gap-2">
                          {step.passed ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-xs text-gray-500">{step.duration}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {result.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      Error: {result.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      
      {isRunning && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Running user acceptance tests...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};