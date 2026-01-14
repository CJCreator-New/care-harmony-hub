// Quick test of the masking function
import { DataMaskingService } from './dataProtection';

const maskingService = new DataMaskingService();

// Test individual case
const data1 = { medical_record_number: 'MRN-2024-00123' };
const masked1 = maskingService.maskData(data1);
console.log('Individual test:', masked1.medical_record_number); // Should be 'MRN-2024-0****'

// Test integration case
const data2 = { medical_record_number: 'MRN-2024-001' };
const masked2 = maskingService.maskData(data2);
console.log('Integration test:', masked2.medical_record_number); // Should be 'MRN-2024-0**'