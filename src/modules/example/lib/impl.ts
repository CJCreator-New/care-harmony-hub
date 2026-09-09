/**
 * Internal implementation details for example module.
 * Hidden from external consumers; accessible only within src/modules/example.
 */
export function executeInternalOperation(input: string): string {
  return `Processed: ${input.trim().toUpperCase()}`;
}
