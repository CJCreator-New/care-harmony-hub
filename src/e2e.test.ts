import { describe, it, expect, beforeEach } from 'vitest';
import { logger } from '@/utils/logging';
import { analytics } from '@/utils/analytics';
import { notificationManager } from '@/utils/notification';
import { validators, validateForm } from '@/utils/validation';
import { queryCache } from '@/utils/cacheStrategy';

describe('E2E: User Registration Flow', () => {
  beforeEach(() => {
    logger.clearLogs();
    analytics.clearEvents();
    notificationManager.clear();
  });

  it('validates registration form', () => {
    const schema = {
      email: { required: true },
      password: { required: true, minLength: 8 },
      phone: { required: true },
    };

    const data = {
      email: 'user@example.com',
      password: 'Password123',
      phone: '1234567890',
    };

    const errors = validateForm(data, schema);
    expect(errors).toHaveLength(0);
    
    analytics.trackEvent('registration_started');
    expect(analytics.getEvents()).toHaveLength(1);
  });

  it('handles registration errors', () => {
    const schema = {
      email: { required: true },
      password: { required: true },
    };

    const data = { email: '', password: '' };
    const errors = validateForm(data, schema);
    
    expect(errors.length).toBeGreaterThan(0);
    logger.error('Registration failed', { errors });
    notificationManager.error('Registration failed');
    
    expect(logger.getLogs('error')).toHaveLength(1);
    expect(notificationManager.getAll()).toHaveLength(1);
  });
});

describe('E2E: Patient Data Workflow', () => {
  beforeEach(() => {
    queryCache.clear();
    analytics.clearEvents();
  });

  it('caches and retrieves patient data', () => {
    const patientData = { id: '1', name: 'John', email: 'john@example.com' };
    
    queryCache.set('patient-1', patientData, 5000, ['patient-1']);
    analytics.trackEvent('patient_loaded', { patientId: '1' });
    
    const cached = queryCache.get('patient-1');
    expect(cached).toEqual(patientData);
    expect(analytics.getEvents()).toHaveLength(1);
  });

  it('invalidates patient cache on update', () => {
    queryCache.set('patient-1', { name: 'John' }, 5000, ['patient-1']);
    queryCache.set('patients-list', [{ id: '1' }], 5000, ['patients-list']);
    
    analytics.trackEvent('patient_updated', { patientId: '1' });
    
    queryCache.invalidateByTag('patient-1');
    expect(queryCache.get('patient-1')).toBeNull();
    expect(queryCache.get('patients-list')).toBeDefined();
  });
});

describe('E2E: Error Handling Workflow', () => {
  beforeEach(() => {
    logger.clearLogs();
    notificationManager.clear();
  });

  it('logs and notifies on API error', () => {
    const error = new Error('API request failed');
    
    logger.error('API Error', error);
    notificationManager.error('Failed to load data');
    analytics.trackError('api_error', { message: error.message });
    
    expect(logger.getLogs('error')).toHaveLength(1);
    expect(notificationManager.getAll()).toHaveLength(1);
    expect(analytics.getEvents()).toHaveLength(1);
  });

  it('recovers from errors gracefully', () => {
    try {
      throw new Error('Network error');
    } catch (error) {
      logger.error('Caught error', error instanceof Error ? error : {});
      notificationManager.warning('Connection lost, retrying...');
      
      setTimeout(() => {
        notificationManager.success('Reconnected');
      }, 1000);
    }
    
    expect(logger.getLogs('error')).toHaveLength(1);
  });
});

describe('E2E: Analytics Tracking', () => {
  beforeEach(() => analytics.clearEvents());

  it('tracks complete user session', () => {
    analytics.setUserId('user-123');
    analytics.trackPageView('dashboard');
    analytics.trackUserAction('view_patient', { patientId: '1' });
    analytics.trackUserAction('edit_prescription', { prescriptionId: '2' });
    analytics.trackPageView('settings');
    
    const events = analytics.getEvents();
    expect(events).toHaveLength(4);
    expect(events[0].name).toBe('page_view');
    expect(events[1].name).toBe('user_action');
  });

  it('generates session statistics', () => {
    analytics.trackEvent('click');
    analytics.trackEvent('click');
    analytics.trackEvent('view');
    analytics.trackEvent('submit');
    
    const stats = analytics.getEventStats();
    expect(stats.click).toBe(2);
    expect(stats.view).toBe(1);
    expect(stats.submit).toBe(1);
  });
});
