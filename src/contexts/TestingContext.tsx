import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  TestCase,
  TestCategory,
  AutomationScript,
  TestExecutionResult,
  TestingDashboardData,
  TestCategoryType
} from '../types/testing';

// Action types
type TestingAction =
  | { type: 'SET_TEST_DATA'; payload: { categories: TestCategory[]; scripts: AutomationScript[] } }
  | { type: 'UPDATE_TEST_CASE'; payload: TestCase }
  | { type: 'ADD_TEST_CASE'; payload: TestCase }
  | { type: 'DELETE_TEST_CASE'; payload: string }
  | { type: 'ADD_AUTOMATION_SCRIPT'; payload: AutomationScript }
  | { type: 'UPDATE_AUTOMATION_SCRIPT'; payload: AutomationScript }
  | { type: 'DELETE_AUTOMATION_SCRIPT'; payload: string }
  | { type: 'ADD_EXECUTION_RESULT'; payload: TestExecutionResult }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// State interface
interface TestingState {
  categories: TestCategory[];
  scripts: AutomationScript[];
  executionResults: TestExecutionResult[];
  dashboardData: TestingDashboardData | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: TestingState = {
  categories: [],
  scripts: [],
  executionResults: [],
  dashboardData: null,
  loading: false,
  error: null,
};

// Reducer
function testingReducer(state: TestingState, action: TestingAction): TestingState {
  switch (action.type) {
    case 'SET_TEST_DATA':
      return {
        ...state,
        categories: action.payload.categories,
        scripts: action.payload.scripts,
        loading: false,
      };

    case 'UPDATE_TEST_CASE': {
      const updatedCategories = state.categories.map(category => {
        if (category.testCases.some(tc => tc.id === action.payload.id)) {
          return {
            ...category,
            testCases: category.testCases.map(tc =>
              tc.id === action.payload.id ? action.payload : tc
            ),
          };
        }
        return category;
      });
      return { ...state, categories: updatedCategories };
    }

    case 'ADD_TEST_CASE': {
      const updatedCategories = state.categories.map(category => {
        if (category.type === action.payload.category) {
          return {
            ...category,
            testCases: [...category.testCases, action.payload],
          };
        }
        return category;
      });
      return { ...state, categories: updatedCategories };
    }

    case 'DELETE_TEST_CASE': {
      const updatedCategories = state.categories.map(category => ({
        ...category,
        testCases: category.testCases.filter(tc => tc.id !== action.payload),
      }));
      return { ...state, categories: updatedCategories };
    }

    case 'ADD_AUTOMATION_SCRIPT':
      return {
        ...state,
        scripts: [...state.scripts, action.payload],
      };

    case 'UPDATE_AUTOMATION_SCRIPT':
      return {
        ...state,
        scripts: state.scripts.map(script =>
          script.id === action.payload.id ? action.payload : script
        ),
      };

    case 'DELETE_AUTOMATION_SCRIPT':
      return {
        ...state,
        scripts: state.scripts.filter(script => script.id !== action.payload),
      };

    case 'ADD_EXECUTION_RESULT':
      return {
        ...state,
        executionResults: [...state.executionResults, action.payload],
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    default:
      return state;
  }
}

// Context
interface TestingContextType {
  state: TestingState;
  dispatch: React.Dispatch<TestingAction>;
  // Helper functions
  getTestCase: (id: string) => TestCase | undefined;
  getCategory: (type: TestCategoryType) => TestCategory | undefined;
  getAutomationScript: (id: string) => AutomationScript | undefined;
  updateTestCase: (testCase: TestCase) => void;
  addTestCase: (testCase: TestCase) => void;
  deleteTestCase: (id: string) => void;
  addAutomationScript: (script: AutomationScript) => void;
  updateAutomationScript: (script: AutomationScript) => void;
  deleteAutomationScript: (id: string) => void;
  addExecutionResult: (result: TestExecutionResult) => void;
}

const TestingContext = createContext<TestingContextType | undefined>(undefined);

// Provider component
interface TestingProviderProps {
  children: ReactNode;
}

export function TestingProvider({ children }: TestingProviderProps) {
  const [state, dispatch] = useReducer(testingReducer, initialState);

  // Helper functions
  const getTestCase = (id: string): TestCase | undefined => {
    for (const category of state.categories) {
      const testCase = category.testCases.find(tc => tc.id === id);
      if (testCase) return testCase;
    }
    return undefined;
  };

  const getCategory = (type: TestCategoryType): TestCategory | undefined => {
    return state.categories.find(cat => cat.type === type);
  };

  const getAutomationScript = (id: string): AutomationScript | undefined => {
    return state.scripts.find(script => script.id === id);
  };

  const updateTestCase = (testCase: TestCase) => {
    dispatch({ type: 'UPDATE_TEST_CASE', payload: testCase });
  };

  const addTestCase = (testCase: TestCase) => {
    dispatch({ type: 'ADD_TEST_CASE', payload: testCase });
  };

  const deleteTestCase = (id: string) => {
    dispatch({ type: 'DELETE_TEST_CASE', payload: id });
  };

  const addAutomationScript = (script: AutomationScript) => {
    dispatch({ type: 'ADD_AUTOMATION_SCRIPT', payload: script });
  };

  const updateAutomationScript = (script: AutomationScript) => {
    dispatch({ type: 'UPDATE_AUTOMATION_SCRIPT', payload: script });
  };

  const deleteAutomationScript = (id: string) => {
    dispatch({ type: 'DELETE_AUTOMATION_SCRIPT', payload: id });
  };

  const addExecutionResult = (result: TestExecutionResult) => {
    dispatch({ type: 'ADD_EXECUTION_RESULT', payload: result });
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem('testing-data');
        let existingCategories: TestCategory[] = [];
        let existingScripts: AutomationScript[] = [];

        if (savedData) {
          const parsed = JSON.parse(savedData);
          existingCategories = parsed.categories || [];
          existingScripts = parsed.scripts || [];
        }

        // Initialize with default categories (merge with existing)
        const defaultCategories: TestCategory[] = [
            {
              id: 'appointments',
              type: 'Appointments & Scheduling',
              name: 'Appointments & Scheduling',
              description: 'Test appointment booking, scheduling, and management features',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'billing',
              type: 'Billing & Payments',
              name: 'Billing & Payments',
              description: 'Test billing, invoicing, and payment processing',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'analytics',
              type: 'Analytics & Reporting',
              name: 'Analytics & Reporting',
              description: 'Test analytics dashboards and reporting features',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'care-coordination',
              type: 'Care Coordination',
              name: 'Care Coordination',
              description: 'Test care coordination and workflow management',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'patient-portal',
              type: 'Patient Portal',
              name: 'Patient Portal',
              description: 'Test patient-facing portal and self-service features',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'rbac',
              type: 'Role-Based Access Control',
              name: 'Role-Based Access Control',
              description: 'Test user roles, permissions, and access controls',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'laboratory',
              type: 'Laboratory Management',
              name: 'Laboratory Management',
              description: 'Test lab order management and results processing',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'pharmacy',
              type: 'Pharmacy Operations',
              name: 'Pharmacy Operations',
              description: 'Test prescription management and pharmacy workflows',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'telemedicine',
              type: 'Telemedicine',
              name: 'Telemedicine',
              description: 'Test telemedicine consultation and video features',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'inventory',
              type: 'Inventory Management',
              name: 'Inventory Management',
              description: 'Test inventory tracking and supply management',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'messaging',
              type: 'Notifications & Messaging',
              name: 'Notifications & Messaging',
              description: 'Test internal messaging and notification systems',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'security',
              type: 'Security & Compliance',
              name: 'Security & Compliance',
              description: 'Test security features and HIPAA compliance',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'performance',
              type: 'Performance & Load Testing',
              name: 'Performance & Load Testing',
              description: 'Test system performance under various loads',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'accessibility',
              type: 'Accessibility & Usability',
              name: 'Accessibility & Usability',
              description: 'Test accessibility compliance and user experience',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
            {
              id: 'integration',
              type: 'Integration Testing',
              name: 'Integration Testing',
              description: 'Test integration with external systems and APIs',
              testCases: [],
              progress: { total: 0, completed: 0, passed: 0, failed: 0, blocked: 0 },
            },
          ];

          // Merge existing categories with defaults (preserve existing data)
          const mergedCategories = defaultCategories.map(defaultCat => {
            const existingCat = existingCategories.find(cat => cat.type === defaultCat.type);
            return existingCat || defaultCat;
          });

          // Pre-built workflow test scripts
          const defaultScripts: AutomationScript[] = [
            {
              id: 'auth-workflow-tests',
              name: 'User Registration & Authentication Tests',
              category: 'Security & Compliance',
              description: 'Complete test suite for user registration, login, password reset, and role-based access control',
              code: `from playwright.sync_api import sync_playwright, expect
import pytest
import time

def test_user_registration_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080")
            page.locator("a[href*='signup']").first.click()
            page.locator("input[name='firstName']").fill("John")
            page.locator("input[name='lastName']").fill("Doe")
            page.locator("input[name='email']").fill(f"john.doe.{int(time.time())}@test.com")
            page.locator("input[name='password']").fill("TestPassword123!")
            page.locator("input[name='confirmPassword']").fill("TestPassword123!")
            page.locator("select[name='role']").select_option("patient")
            page.locator("input[name='acceptTerms']").check()
            page.locator("button[type='submit']").click()
            expect(page.locator("text=Registration successful")).to_be_visible()
        finally:
            browser.close()

def test_user_login_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("admin@test.com")
            page.locator("input[name='password']").fill("admin123")
            page.locator("button[type='submit']").click()
            expect(page.locator("text=Dashboard")).to_be_visible()
        finally:
            browser.close()

def test_invalid_login_attempts():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("admin@test.com")
            page.locator("input[name='password']").fill("wrongpassword")
            page.locator("button[type='submit']").click()
            expect(page.locator("text=Invalid credentials")).to_be_visible()
        finally:
            browser.close()

def test_role_based_access_control():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto("http://localhost:8080/login")
        page.locator("input[name='email']").fill("admin@test.com")
        page.locator("input[name='password']").fill("admin123")
        page.locator("button[type='submit']").click()
        expect(page.locator("text=Staff Management")).to_be_visible()
        page.close()
        browser.close()

if __name__ == "__main__":
    test_user_registration_flow()
    test_user_login_flow()
    test_invalid_login_attempts()
    test_role_based_access_control()
    print("All user registration and authentication tests completed!")`,
              language: 'python',
              tags: ['authentication', 'registration', 'login', 'rbac', 'security'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              automationEnabled: true,
              lastRun: null,
              executionCount: 0,
            },
            {
              id: 'doctor-workflow-tests',
              name: 'Doctor Workflow Tests',
              category: 'Care Coordination',
              description: 'Complete doctor workflow including consultations, prescriptions, lab orders, and appointment management',
              code: `from playwright.sync_api import sync_playwright, expect
import pytest
import time

def test_doctor_login_and_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("doctor@test.com")
            page.locator("input[name='password']").fill("doctor123")
            page.locator("button[type='submit']").click()
            expect(page.locator("text=Doctor Dashboard")).to_be_visible()
        finally:
            browser.close()

def test_doctor_consultation_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("doctor@test.com")
            page.locator("input[name='password']").fill("doctor123")
            page.locator("button[type='submit']").click()
            page.locator("text=Consultations").click()
            page.locator("button:has-text('New Consultation')").click()
            page.locator("input[placeholder*='Search patient']").fill("John Doe")
            page.locator("text=John Doe").first.click()
            page.locator("textarea[name='chiefComplaint']").fill("Patient reports chest pain")
            page.locator("textarea[name='history']").fill("History of hypertension")
            page.locator("input[name='bloodPressure']").fill("140/90")
            page.locator("input[name='heartRate']").fill("85")
            page.locator("input[name='temperature']").fill("98.6")
            page.locator("textarea[name='physicalExam']").fill("Cardiac auscultation normal")
            page.locator("input[name='diagnosis']").fill("Hypertensive heart disease")
            page.locator("textarea[name='treatmentPlan']").fill("Prescribe antihypertensive medication")
            page.locator("button:has-text('Save Consultation')").click()
            expect(page.locator("text=Consultation saved successfully")).to_be_visible()
        finally:
            browser.close()

def test_doctor_prescription_creation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("doctor@test.com")
            page.locator("input[name='password']").fill("doctor123")
            page.locator("button[type='submit']").click()
            page.locator("text=Prescriptions").click()
            page.locator("button:has-text('New Prescription')").click()
            page.locator("input[placeholder*='Search patient']").fill("John Doe")
            page.locator("text=John Doe").first.click()
            page.locator("input[name='medication']").fill("Lisinopril")
            page.locator("input[name='dosage']").fill("10mg")
            page.locator("input[name='frequency']").fill("Once daily")
            page.locator("input[name='duration']").fill("30 days")
            page.locator("button:has-text('Save Prescription')").click()
            expect(page.locator("text=Prescription created successfully")).to_be_visible()
        finally:
            browser.close()

def test_doctor_lab_order():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("doctor@test.com")
            page.locator("input[name='password']").fill("doctor123")
            page.locator("button[type='submit']").click()
            page.locator("text=Lab Orders").click()
            page.locator("button:has-text('New Lab Order')").click()
            page.locator("input[placeholder*='Search patient']").fill("John Doe")
            page.locator("text=John Doe").first.click()
            page.locator("input[name='tests']").fill("Complete Blood Count")
            page.locator("text=Complete Blood Count").click()
            page.locator("textarea[name='clinicalNotes']").fill("Suspected cardiac issues")
            page.locator("select[name='priority']").select_option("urgent")
            page.locator("button:has-text('Submit Order')").click()
            expect(page.locator("text=Lab order submitted successfully")).to_be_visible()
        finally:
            browser.close()

if __name__ == "__main__":
    test_doctor_login_and_dashboard()
    test_doctor_consultation_flow()
    test_doctor_prescription_creation()
    test_doctor_lab_order()
    print("All doctor workflow tests completed!")`,
              language: 'python',
              tags: ['doctor', 'consultation', 'prescription', 'lab-order', 'workflow'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              automationEnabled: true,
              lastRun: null,
              executionCount: 0,
            },
            {
              id: 'nurse-workflow-tests',
              name: 'Nurse Workflow Tests',
              category: 'Care Coordination',
              description: 'Complete nurse workflow including vital signs, medication administration, patient assessment, and emergency response',
              code: `from playwright.sync_api import sync_playwright, expect
import pytest
import time

def test_nurse_login_and_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("nurse@test.com")
            page.locator("input[name='password']").fill("nurse123")
            page.locator("button[type='submit']").click()
            expect(page.locator("text=Nurse Dashboard")).to_be_visible()
        finally:
            browser.close()

def test_nurse_vital_signs_recording():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("nurse@test.com")
            page.locator("input[name='password']").fill("nurse123")
            page.locator("button[type='submit']").click()
            page.locator("text=Patient Care").click()
            page.locator("input[placeholder*='Search patient']").fill("John Doe")
            page.locator("text=John Doe").first.click()
            page.locator("button:has-text('Record Vitals')").click()
            page.locator("input[name='bloodPressure']").fill("120/80")
            page.locator("input[name='heartRate']").fill("72")
            page.locator("input[name='temperature']").fill("98.6")
            page.locator("input[name='oxygenSaturation']").fill("98")
            page.locator("input[name='weight']").fill("70.5")
            page.locator("textarea[name='notes']").fill("Patient stable")
            page.locator("button:has-text('Save Vitals')").click()
            expect(page.locator("text=Vital signs recorded successfully")).to_be_visible()
        finally:
            browser.close()

def test_nurse_medication_administration():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("nurse@test.com")
            page.locator("input[name='password']").fill("nurse123")
            page.locator("button[type='submit']").click()
            page.locator("text=Medication Admin").click()
            page.locator("button:has-text('Administer')").first.click()
            page.locator("select[name='route']").select_option("oral")
            page.locator("input[name='dosage']").fill("10mg")
            page.locator("textarea[name='notes']").fill("Administered as prescribed")
            page.locator("button:has-text('Confirm Administration')").click()
            expect(page.locator("text=Medication administered successfully")).to_be_visible()
        finally:
            browser.close()

def test_nurse_patient_assessment():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("nurse@test.com")
            page.locator("input[name='password']").fill("nurse123")
            page.locator("button[type='submit']").click()
            page.locator("text=Patient Assessment").click()
            page.locator("input[placeholder*='Search patient']").fill("John Doe")
            page.locator("text=John Doe").first.click()
            page.locator("button:has-text('Start Assessment')").click()
            page.locator("select[name='consciousness']").select_option("alert")
            page.locator("select[name='mobility']").select_option("independent")
            page.locator("textarea[name='painAssessment']").fill("No pain reported")
            page.locator("textarea[name='skinIntegrity']").fill("Skin intact")
            page.locator("button:has-text('Save Assessment')").click()
            expect(page.locator("text=Assessment completed successfully")).to_be_visible()
        finally:
            browser.close()

if __name__ == "__main__":
    test_nurse_login_and_dashboard()
    test_nurse_vital_signs_recording()
    test_nurse_medication_administration()
    test_nurse_patient_assessment()
    print("All nurse workflow tests completed!")`,
              language: 'python',
              tags: ['nurse', 'vitals', 'medication', 'assessment', 'workflow'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              automationEnabled: true,
              lastRun: null,
              executionCount: 0,
            },
            {
              id: 'pharmacy-workflow-tests',
              name: 'Pharmacy Workflow Tests',
              category: 'Pharmacy Operations',
              description: 'Complete pharmacy workflow including prescription processing, dispensing, inventory management, and drug interactions',
              code: `from playwright.sync_api import sync_playwright, expect
import pytest
import time

def test_pharmacist_login_and_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("pharmacist@test.com")
            page.locator("input[name='password']").fill("pharm123")
            page.locator("button[type='submit']").click()
            expect(page.locator("text=Pharmacy Dashboard")).to_be_visible()
        finally:
            browser.close()

def test_prescription_processing():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("pharmacist@test.com")
            page.locator("input[name='password']").fill("pharm123")
            page.locator("button[type='submit']").click()
            page.locator("text=Prescriptions").click()
            page.locator("button:has-text('Process')").first.click()
            page.locator("button:has-text('Check Interactions')").click()
            page.locator("button:has-text('Verify')").click()
            page.locator("textarea[name='notes']").fill("Verified, no interactions")
            page.locator("button:has-text('Complete Verification')").click()
            expect(page.locator("text=Prescription verified successfully")).to_be_visible()
        finally:
            browser.close()

def test_medication_dispensing():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("pharmacist@test.com")
            page.locator("input[name='password']").fill("pharm123")
            page.locator("button[type='submit']").click()
            page.locator("text=Dispensing").click()
            page.locator("button:has-text('Dispense')").first.click()
            page.locator("button:has-text('Check Stock')").click()
            page.locator("input[name='quantity']").fill("30")
            page.locator("textarea[name='instructions']").fill("Take with food")
            page.locator("button:has-text('Print Label')").click()
            page.locator("button:has-text('Complete Dispensing')").click()
            expect(page.locator("text=Medication dispensed successfully")).to_be_visible()
        finally:
            browser.close()

def test_inventory_management():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/login")
            page.locator("input[name='email']").fill("pharmacist@test.com")
            page.locator("input[name='password']").fill("pharm123")
            page.locator("button[type='submit']").click()
            page.locator("text=Inventory").click()
            page.locator("button:has-text('Add Medication')").click()
            page.locator("input[name='name']").fill("Amoxicillin")
            page.locator("input[name='strength']").fill("500mg")
            page.locator("input[name='currentStock']").fill("100")
            page.locator("input[name='minStock']").fill("20")
            page.locator("button:has-text('Save Medication')").click()
            expect(page.locator("text=Medication added successfully")).to_be_visible()
        finally:
            browser.close()

if __name__ == "__main__":
    test_pharmacist_login_and_dashboard()
    test_prescription_processing()
    test_medication_dispensing()
    test_inventory_management()
    print("All pharmacy workflow tests completed!")`,
              language: 'python',
              tags: ['pharmacy', 'prescription', 'dispensing', 'inventory', 'workflow'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              automationEnabled: true,
              lastRun: null,
              executionCount: 0,
            },
          ];

          // Merge existing scripts with defaults (ensure pre-built scripts are always available)
          const mergedScripts = [...existingScripts];
          for (const defaultScript of defaultScripts) {
            const existingScript = mergedScripts.find(script => script.id === defaultScript.id);
            if (!existingScript) {
              mergedScripts.push(defaultScript);
            }
          }

          dispatch({
            type: 'SET_TEST_DATA',
            payload: {
              categories: mergedCategories,
              scripts: mergedScripts,
            },
          });
        } catch (error) {
          console.error('Error loading testing data:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load testing data' });
        }
    };

    loadData();
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    if (state.categories.length > 0 || state.scripts.length > 0) {
      const dataToSave = {
        categories: state.categories,
        scripts: state.scripts,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem('testing-data', JSON.stringify(dataToSave));
    }
  }, [state.categories, state.scripts]);

  const contextValue: TestingContextType = {
    state,
    dispatch,
    getTestCase,
    getCategory,
    getAutomationScript,
    updateTestCase,
    addTestCase,
    deleteTestCase,
    addAutomationScript,
    updateAutomationScript,
    deleteAutomationScript,
    addExecutionResult,
  };

  return (
    <TestingContext.Provider value={contextValue}>
      {children}
    </TestingContext.Provider>
  );
}

// Hook to use the context
export function useTesting() {
  const context = useContext(TestingContext);
  if (context === undefined) {
    throw new Error('useTesting must be used within a TestingProvider');
  }
  return context;
}