import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Minus,
  Plus,
  BarChart3,
  Code,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useTesting } from '../../contexts/TestingContext';
import { TestCategory, TestCase } from '../../types/testing';
import TestDetailsPanel from '../../components/testing/test-details/TestDetailsPanel';
import ScriptsLibrary from '../../components/testing/scripts-library/ScriptsLibrary';
import TestExecutionTracker from '../../components/testing/test-execution/TestExecutionTracker';
import ReportsDashboard from '../../components/testing/reports/ReportsDashboard';
import TestRunner from '../../components/testing/test-execution/TestRunner';
import ScriptGenerator from '../../components/testing/script-generator/ScriptGenerator';

const statusIcons = {
  'Not Started': <Minus className="h-4 w-4 text-gray-400" />,
  'In Progress': <Clock className="h-4 w-4 text-yellow-500" />,
  'Passed': <CheckCircle className="h-4 w-4 text-green-500" />,
  'Failed': <XCircle className="h-4 w-4 text-red-500" />,
  'Blocked': <AlertTriangle className="h-4 w-4 text-orange-500" />,
  'N/A': <Minus className="h-4 w-4 text-gray-300" />,
};

const statusColors = {
  'Not Started': 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'Passed': 'bg-green-100 text-green-800',
  'Failed': 'bg-red-100 text-red-800',
  'Blocked': 'bg-orange-100 text-orange-800',
  'N/A': 'bg-gray-50 text-gray-600',
};

function CategoryCard({ category, onTestCaseClick }: {
  category: TestCategory;
  onTestCaseClick: (testCase: TestCase) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { total, completed, passed, failed, blocked } = category.progress;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  const passRate = completed > 0 ? (passed / completed) * 100 : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="hover:shadow-md transition-shadow">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </div>
              <Badge variant="outline">{total} tests</Badge>
            </div>
            <CardDescription>{category.description}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Completion</span>
                <span>{completed}/{total}</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>

            <div className="flex gap-2 text-xs">
              <Badge className={statusColors.Passed}>
                {passed} Passed
              </Badge>
              <Badge className={statusColors.Failed}>
                {failed} Failed
              </Badge>
              {blocked > 0 && (
                <Badge className={statusColors.Blocked}>
                  {blocked} Blocked
                </Badge>
              )}
            </div>

            {passRate > 0 && (
              <div className="text-xs text-muted-foreground">
                Pass Rate: {passRate.toFixed(1)}%
              </div>
            )}
          </div>
        </CardContent>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {category.testCases.map((testCase) => (
                  <TestCaseItem
                    key={testCase.id}
                    testCase={testCase}
                    onClick={() => onTestCaseClick(testCase)}
                  />
                ))}
                {category.testCases.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No test cases defined yet. Click "Add Test Case" to get started.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function TestCaseItem({ testCase, onClick }: {
  testCase: any;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {statusIcons[testCase.status]}
        <div>
          <div className="font-medium">{testCase.name}</div>
          <div className="text-sm text-muted-foreground">
            {testCase.description}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={statusColors[testCase.status]}>
          {testCase.status}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {testCase.priority}
        </Badge>
      </div>
    </div>
  );
}

export default function TestingDashboardPage() {
  const { state } = useTesting();
  const { categories, scripts, loading, error } = state;
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [showScriptGenerator, setShowScriptGenerator] = useState(false);
  const [scriptToRun, setScriptToRun] = useState<AutomationScript | null>(null);

  const handleTestCaseClick = (testCase: TestCase) => {
    setSelectedTestCase(testCase);
    // TODO: Open test details panel
  };

  // Calculate overall progress
  const totalTests = categories.reduce((sum, cat) => sum + cat.testCases.length, 0);
  const completedTests = categories.reduce((sum, cat) =>
    sum + cat.testCases.filter(tc => tc.status !== 'Not Started' && tc.status !== 'N/A').length, 0
  );
  const passedTests = categories.reduce((sum, cat) =>
    sum + cat.testCases.filter(tc => tc.status === 'Passed').length, 0
  );
  const failedTests = categories.reduce((sum, cat) =>
    sum + cat.testCases.filter(tc => tc.status === 'Failed').length, 0
  );

  const overallCompletion = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
  const overallPassRate = completedTests > 0 ? (passedTests / completedTests) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading testing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testing Management</h1>
          <p className="text-muted-foreground">
            Track pre-release testing progress and generate automation scripts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Import Tests
          </Button>
          <Button variant="outline" onClick={() => setShowScriptGenerator(true)}>
            <Code className="h-4 w-4 mr-2" />
            Generate Script
          </Button>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>

      {/* Overall Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{completedTests}</div>
            <Progress value={overallCompletion} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{passedTests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {overallPassRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Test Categories</TabsTrigger>
          <TabsTrigger value="scripts">Automation Scripts ({scripts.length})</TabsTrigger>
          <TabsTrigger value="execution">Test Execution</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onTestCaseClick={handleTestCaseClick}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scripts" className="space-y-4">
          <ScriptsLibrary
            scripts={scripts}
            onScriptSelect={(script) => {
              // TODO: Open script details modal
              console.log('Selected script:', script);
            }}
            onScriptEdit={(script) => {
              // TODO: Open script editor
              console.log('Edit script:', script);
            }}
            onScriptDelete={(scriptId) => {
              // TODO: Confirm and delete script
              console.log('Delete script:', scriptId);
            }}
            onScriptRun={(script) => {
              setScriptToRun(script);
              // Switch to execution tab
              // This would need to be implemented with tab state management
            }}
          />
        </TabsContent>

        <TabsContent value="execution" className="space-y-4">
          {scriptToRun ? (
            <TestRunner
              script={scriptToRun}
              onExecutionComplete={(result) => {
                console.log('Execution completed:', result);
                // Could show a toast notification here
              }}
            />
          ) : (
            <TestExecutionTracker />
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsDashboard />
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest testing activities and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Activity will appear here as you work with tests</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Details Panel */}
      <TestDetailsPanel
        testCase={selectedTestCase}
        isOpen={!!selectedTestCase}
        onClose={() => setSelectedTestCase(null)}
      />

      {/* Script Generator */}
      <ScriptGenerator
        open={showScriptGenerator}
        onOpenChange={setShowScriptGenerator}
      />
    </div>
  );
}