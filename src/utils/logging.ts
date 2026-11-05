/**
 * Compatibility alias. The client logger lives in `@/utils/logger`; use `createLogger` there.
 * The former in-memory duplicate logger (console wrapper with an unbounded export buffer)
 * was removed: it duplicated the sink without redaction.
 */
import { createLogger } from '@/utils/logger';

export const logger = createLogger('app');
export { createLogger };
