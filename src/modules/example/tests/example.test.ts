import { describe, it, expect } from 'vitest';
// Imports ONLY through the public root entry point, never ../lib/impl
import { processExampleData } from '../index';

describe('Example Deep Module', () => {
  it('processes data correctly through the public interface', () => {
    const result = processExampleData('caresync');
    expect(result).toBe('Processed: CARESYNC');
  });
});
