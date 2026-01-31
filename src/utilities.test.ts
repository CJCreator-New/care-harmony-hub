import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '@/utils/logging';
import { analytics } from '@/utils/analytics';
import { validators, validateForm } from '@/utils/validation';
import { notificationManager } from '@/utils/notification';

describe('Logging', () => {
  beforeEach(() => logger.clearLogs());

  it('logs messages', () => {
    logger.info('Test', { key: 'value' });
    expect(logger.getLogs('info')).toHaveLength(1);
  });

  it('filters by level', () => {
    logger.info('Info');
    logger.warn('Warn');
    expect(logger.getLogs('info')).toHaveLength(1);
    expect(logger.getLogs('warn')).toHaveLength(1);
  });
});

describe('Analytics', () => {
  beforeEach(() => analytics.clearEvents());

  it('tracks events', () => {
    analytics.trackEvent('test', { prop: 'value' });
    expect(analytics.getEvents()).toHaveLength(1);
  });

  it('tracks page views', () => {
    analytics.trackPageView('home');
    expect(analytics.getEvents()[0].name).toBe('page_view');
  });

  it('gets stats', () => {
    analytics.trackEvent('click');
    analytics.trackEvent('click');
    const stats = analytics.getEventStats();
    expect(stats.click).toBe(2);
  });
});

describe('Validation', () => {
  it('validates email', () => {
    expect(validators.email('test@example.com')).toBe(true);
    expect(validators.email('invalid')).toBe(false);
  });

  it('validates phone', () => {
    expect(validators.phone('1234567890')).toBe(true);
    expect(validators.phone('123')).toBe(false);
  });

  it('validates password', () => {
    expect(validators.password('Password123')).toBe(true);
    expect(validators.password('weak')).toBe(false);
  });

  it('validates form', () => {
    const schema = { email: { required: true } };
    const errors = validateForm({ email: '' }, schema);
    expect(errors).toHaveLength(1);
  });
});

describe('Notifications', () => {
  beforeEach(() => notificationManager.clear());

  it('creates notifications', () => {
    notificationManager.success('Success');
    expect(notificationManager.getAll()).toHaveLength(1);
  });

  it('removes notifications', () => {
    const id = notificationManager.info('Test');
    notificationManager.remove(id);
    expect(notificationManager.getAll()).toHaveLength(0);
  });

  it('subscribes to changes', () => {
    const listener = vi.fn();
    notificationManager.subscribe(listener);
    notificationManager.success('Test');
    expect(listener).toHaveBeenCalled();
  });
});
