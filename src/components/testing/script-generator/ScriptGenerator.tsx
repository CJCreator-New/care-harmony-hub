import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Code,
  Copy,
  Download,
  Play,
  Settings,
  Zap,
  FileText,
  Globe,
  MousePointer,
  CheckCircle
} from 'lucide-react';
import { TestCase, TestCategoryType, ScriptTemplate } from '../../../types/testing';
import { useTesting } from '../../../contexts/TestingContext';

interface ScriptGeneratorProps {
  testCase?: TestCase;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const scriptTemplates: ScriptTemplate[] = [
  {
    id: 'login',
    name: 'Login Flow',
    description: 'Generate script for user authentication',
    category: 'Patient Portal',
    template: `from playwright.sync_api import sync_playwright, expect
import pytest

def test_login_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Navigate to login page
        page.goto("{{baseUrl}}/patient-login")

        # Fill login form
        page.fill('[data-testid="email-input"]', "{{email}}")
        page.fill('[data-testid="password-input"]', "{{password}}")

        # Submit form
        page.click('[data-testid="login-button"]')

        # Verify successful login
        expect(page.locator('[data-testid="dashboard"]')).to_be_visible()

        # Take screenshot on success
        page.screenshot(path="login_success.png")

        browser.close()`,
    variables: [
      { name: 'baseUrl', description: 'Base URL of the application', defaultValue: 'http://localhost:3000' },
      { name: 'email', description: 'Test user email', defaultValue: 'test@example.com' },
      { name: 'password', description: 'Test user password', defaultValue: 'password123' }
    ]
  },
  {
    id: 'form-submission',
    name: 'Form Submission',
    description: 'Generate script for form filling and submission',
    category: 'Appointments & Scheduling',
    template: `from playwright.sync_api import sync_playwright, expect
import pytest

def test_form_submission():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Navigate to form page
        page.goto("{{baseUrl}}/appointments/book")

        # Fill form fields
        page.fill('[data-testid="patient-name"]', "{{patientName}}")
        page.fill('[data-testid="appointment-date"]', "{{appointmentDate}}")
        page.select_option('[data-testid="doctor-select"]', "{{doctorId}}")

        # Submit form
        page.click('[data-testid="submit-button"]')

        # Verify success message
        expect(page.locator('[data-testid="success-message"]')).to_be_visible()

        # Take screenshot
        page.screenshot(path="form_submission_success.png")

        browser.close()`,
    variables: [
      { name: 'baseUrl', description: 'Base URL of the application', defaultValue: 'http://localhost:3000' },
      { name: 'patientName', description: 'Patient full name', defaultValue: 'John Doe' },
      { name: 'appointmentDate', description: 'Appointment date', defaultValue: '2024-01-15' },
      { name: 'doctorId', description: 'Doctor ID', defaultValue: '1' }
    ]
  },
  {
    id: 'navigation',
    name: 'Navigation Test',
    description: 'Generate script for testing page navigation',
    category: 'Patient Portal',
    template: `from playwright.sync_api import sync_playwright, expect
import pytest

def test_navigation_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Start navigation test
        page.goto("{{baseUrl}}/patient/portal")

        # Test navigation links
        page.click('[data-testid="appointments-link"]')
        expect(page.locator('[data-testid="appointments-page"]')).to_be_visible()

        page.click('[data-testid="prescriptions-link"]')
        expect(page.locator('[data-testid="prescriptions-page"]')).to_be_visible()

        page.click('[data-testid="medical-history-link"]')
        expect(page.locator('[data-testid="medical-history-page"]')).to_be_visible()

        # Verify breadcrumb navigation
        expect(page.locator('[data-testid="breadcrumb"]')).to_contain_text("Medical History")

        # Take screenshot
        page.screenshot(path="navigation_test_success.png")

        browser.close()`,
    variables: [
      { name: 'baseUrl', description: 'Base URL of the application', defaultValue: 'http://localhost:3000' }
    ]
  },
  {
    id: 'api-verification',
    name: 'API Response Verification',
    description: 'Generate script for API endpoint testing',
    category: 'Integration Testing',
    template: `from playwright.sync_api import sync_playwright, expect
import pytest
import json

def test_api_endpoints():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Intercept and verify API calls
        api_calls = []

        def handle_request(request):
            if "{{apiEndpoint}}" in request.url:
                api_calls.append({
                    'url': request.url,
                    'method': request.method,
                    'headers': dict(request.headers)
                })

        page.on('request', handle_request)

        # Navigate to trigger API calls
        page.goto("{{baseUrl}}/dashboard")

        # Wait for API calls to complete
        page.wait_for_timeout(2000)

        # Verify API calls were made
        assert len(api_calls) > 0, "No API calls detected"

        # Check for specific endpoints
        patient_api_called = any("{{apiEndpoint}}/patients" in call['url'] for call in api_calls)
        assert patient_api_called, "Patient API was not called"

        # Verify response data structure
        # Note: This would need actual API response interception

        print(f"API calls made: {len(api_calls)}")
        for call in api_calls[:5]:  # Log first 5 calls
            print(f"- {call['method']} {call['url']}")

        browser.close()`,
    variables: [
      { name: 'baseUrl', description: 'Base URL of the application', defaultValue: 'http://localhost:3000' },
      { name: 'apiEndpoint', description: 'API base endpoint', defaultValue: '/api' }
    ]
  }
];

export default function ScriptGenerator({ testCase, trigger, open, onOpenChange }: ScriptGeneratorProps) {
  const { addAutomationScript } = useTesting();
  const [selectedTemplate, setSelectedTemplate] = useState<ScriptTemplate | null>(null);
  const [generatedScript, setGeneratedScript] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleTemplateSelect = (template: ScriptTemplate) => {
    setSelectedTemplate(template);
    const initialVars: Record<string, string> = {};
    template.variables.forEach(v => {
      initialVars[v.name] = v.defaultValue || '';
    });
    setVariables(initialVars);
  };

  const generateScript = () => {
    if (!selectedTemplate) return;

    let script = selectedTemplate.template;
    Object.entries(variables).forEach(([key, value]) => {
      script = script.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Add test case specific information if available
    if (testCase) {
      script = script.replace(
        'def test_login_flow():',
        `def test_${testCase.name.toLowerCase().replace(/\s+/g, '_')}():`
      );
    }

    setGeneratedScript(script);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedScript);
    // TODO: Show toast notification
  };

  const downloadScript = () => {
    const blob = new Blob([generatedScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${testCase?.name || 'test'}_automation.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveToLibrary = () => {
    if (!generatedScript || !testCase) return;

    const script = {
      id: Date.now().toString(),
      name: `${testCase.name} Automation`,
      category: testCase.category,
      code: generatedScript,
      version: 1,
      createdAt: new Date(),
      lastModified: new Date(),
      executionHistory: []
    };

    addAutomationScript(script);
    setIsOpen(false);
    // TODO: Show success toast
  };

  return (
    <Dialog open={open !== undefined ? open : isOpen} onOpenChange={onOpenChange || setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Code className="h-4 w-4 mr-2" />
            Generate Script
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Playwright Script Generator
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Left Panel - Template Selection & Variables */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Template</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {scriptTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {template.description}
                            </div>
                          </div>
                          <Badge variant="outline">{template.category}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configure Variables</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable.name}>
                      <label className="text-sm font-medium">
                        {variable.name}
                        {variable.defaultValue && (
                          <span className="text-muted-foreground ml-1">
                            (default: {variable.defaultValue})
                          </span>
                        )}
                      </label>
                      <Textarea
                        value={variables[variable.name] || ''}
                        onChange={(e) => setVariables(prev => ({
                          ...prev,
                          [variable.name]: e.target.value
                        }))}
                        placeholder={variable.description}
                        rows={1}
                        className="mt-1"
                      />
                    </div>
                  ))}
                  <Button onClick={generateScript} className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Generate Script
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Generated Script */}
          <div className="space-y-4">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Generated Script</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      disabled={!generatedScript}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadScript}
                      disabled={!generatedScript}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {testCase && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveToLibrary}
                        disabled={!generatedScript}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {generatedScript ? (
                    <pre className="text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                      <code>{generatedScript}</code>
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a template and configure variables to generate a script</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}