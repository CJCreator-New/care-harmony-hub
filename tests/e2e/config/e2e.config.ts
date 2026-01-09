// E2E Test Configuration
export const E2E_CONFIG = {
  // Test environment settings
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  
  // Test user credentials
  testUsers: {
    admin: {
      email: 'admin@testgeneral.com',
      password: 'TestPass123!',
      role: 'admin'
    },
    doctor: {
      email: 'doctor@testgeneral.com', 
      password: 'TestPass123!',
      role: 'doctor'
    },
    nurse: {
      email: 'nurse@testgeneral.com',
      password: 'TestPass123!', 
      role: 'nurse'
    }
  },
  
  // Test data templates
  testData: {
    patient: {
      firstName: 'John',
      lastName: 'TestPatient',
      dateOfBirth: '1985-06-15',
      gender: 'male',
      phone: '(555) 987-6543',
      email: 'john.testpatient@example.com'
    },
    
    vitals: {
      bloodPressure: '140/90',
      heartRate: '78',
      temperature: '98.6',
      weight: '175',
      height: '5\'10"'
    },
    
    prescription: {
      medication: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      duration: '30 days'
    }
  },
  
  // Performance thresholds
  performance: {
    pageLoadTime: 5000,
    apiResponseTime: 2000
  }
};

export default E2E_CONFIG;