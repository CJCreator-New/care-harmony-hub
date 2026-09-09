/**
 * Public entry point for example deep module.
 * External callers import only from this root entry point.
 */
import { executeInternalOperation } from './lib/impl';

export function processExampleData(data: string): string {
  return executeInternalOperation(data);
}
