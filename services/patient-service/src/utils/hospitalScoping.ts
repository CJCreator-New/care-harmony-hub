/**
 * Hospital Scoping Enforcement Utility
 * 
 * CRITICAL: Multi-tenant data isolation for HIPAA compliance
 * 
 * This utility ensures that all database queries are scoped to a specific hospital_id.
 * Without this, patients from Hospital A could access data from Hospital B.
 * 
 * Usage in services:
 * ```ts
 * const patients = await query(
 *   withHospitalScoping('SELECT * FROM patients WHERE id = $1', 1),
 *   [patientId, hospitalId]
 * );
 * ```
 * 
 * @module utils/hospitalScoping
 */

import { logger } from './logger';

export interface HospitalContext {
  hospitalId: string;
  userId: string;
  role: 'admin' | 'doctor' | 'nurse' | 'pharmacist' | 'lab_technician' | 'receptionist';
}

/**
 * Validates that a hospital context is present and valid
 * @throws Error if hospital context is missing or invalid
 */
export function validateHospitalContext(context: HospitalContext | null | undefined): void {
  if (!context) {
    throw new Error('Hospital context is required for data access (HIPAA-mandated)');
  }

  if (!context.hospitalId || typeof context.hospitalId !== 'string') {
    throw new Error('Valid hospital ID is required');
  }

  if (!context.userId) {
    throw new Error('User ID is required for audit trail');
  }
}

/**
 * Enforces hospital_id filter on SELECT queries
 * 
 * ❌ BEFORE:
 * SELECT * FROM patients WHERE id = $1
 * 
 * ✅ AFTER:
 * SELECT * FROM patients WHERE id = $1 AND hospital_id = $2
 * 
 * @param baseSql - SQL query (must not already have hospital_id filter)
 * @param hospitalId - Hospital identifier to filter by
 * @returns Modified SQL with hospital_id AND clause
 * 
 * @throws Error if hospitalId is missing
 */
export function withHospitalScoping(baseSql: string, hospitalId: string): string {
  if (!hospitalId) {
    throw new Error('Hospital ID is required for query scoping (HIPAA-mandated)');
  }

  // Detect if query is for UPDATE/DELETE (needs WHERE clause adjustment)
  const isUpdate = /^\s*UPDATE\s+/i.test(baseSql.trim());
  const isDelete = /^\s*DELETE\s+/i.test(baseSql.trim());
  const isInsert = /^\s*INSERT\s+/i.test(baseSql.trim());

  if (isInsert) {
    // For INSERT, hospital_id must be included in the INSERT statement
    // This should be validated elsewhere (in the service layer)
    logger.debug({ msg: 'INSERT statement—verify hospital_id is in VALUES' });
    return baseSql;
  }

  if (isUpdate || isDelete) {
    // For UPDATE/DELETE: Add hospital_id check to WHERE clause
    // This prevents accidental deletion/mutation of data from other hospitals
    const whereIndex = baseSql.toUpperCase().lastIndexOf('WHERE');
    if (whereIndex === -1) {
      // No WHERE clause—add one
      return `${baseSql} WHERE hospital_id = '${hospitalId}'`;
    }
    // WHERE clause exists—append as AND condition
    return `${baseSql.substring(0, whereIndex + 5)} hospital_id = '${hospitalId}' AND ${baseSql.substring(whereIndex + 5)}`;
  }

  // For SELECT: Add hospital_id to WHERE clause
  const whereIndex = baseSql.toUpperCase().lastIndexOf('WHERE');
  if (whereIndex === -1) {
    // No WHERE clause—add one
    return `${baseSql} WHERE hospital_id = '${hospitalId}'`;
  }

  // WHERE clause exists—append as AND condition
  // Extract everything before the WHERE clause and after (in case of ORDER BY, LIMIT, etc.)
  const beforeWhere = baseSql.substring(0, whereIndex + 5);
  const afterWhere = baseSql.substring(whereIndex + 5);

  return `${beforeWhere} hospital_id = '${hospitalId}' AND ${afterWhere}`;
}

/**
 * Enforces hospital_id in parametrized queries (SAFER approach)
 * 
 * ✅ RECOMMENDED: Use this instead of withHospitalScoping for production
 * 
 * @param baseSql - SQL query with $N placeholders
 * @param hospitalIdParamIndex - Position where hospitalId will be added (usually next param)
 * @returns Modified SQL with hospital_id parameter placeholder
 * 
 * @example
 * ```ts
 * const sql = withHospitalScopingParam(
 *   'SELECT * FROM patients WHERE id = $1',
 *   2  // hospital_id will be $2
 * );
 * // Result: 'SELECT * FROM patients WHERE id = $1 AND hospital_id = $2'
 * 
 * await query(sql, [patientId, hospitalId]);
 * ```
 */
export function withHospitalScopingParam(
  baseSql: string,
  hospitalIdParamIndex: number
): string {
  if (!Number.isInteger(hospitalIdParamIndex) || hospitalIdParamIndex < 1) {
    throw new Error('Invalid hospital ID parameter index');
  }

  const isUpdate = /^\s*UPDATE\s+/i.test(baseSql.trim());
  const isDelete = /^\s*DELETE\s+/i.test(baseSql.trim());
  const isInsert = /^\s*INSERT\s+/i.test(baseSql.trim());

  if (isInsert) {
    return baseSql;
  }

  const hospitalIdParam = `$${hospitalIdParamIndex}`;

  if (isUpdate || isDelete) {
    const whereIndex = baseSql.toUpperCase().lastIndexOf('WHERE');
    if (whereIndex === -1) {
      return `${baseSql} WHERE hospital_id = ${hospitalIdParam}`;
    }
    return `${baseSql.substring(0, whereIndex + 5)} hospital_id = ${hospitalIdParam} AND ${baseSql.substring(whereIndex + 5)}`;
  }

  // SELECT
  const whereIndex = baseSql.toUpperCase().lastIndexOf('WHERE');
  if (whereIndex === -1) {
    return `${baseSql} WHERE hospital_id = ${hospitalIdParam}`;
  }

  const beforeWhere = baseSql.substring(0, whereIndex + 5);
  const afterWhere = baseSql.substring(whereIndex + 5);

  return `${beforeWhere} hospital_id = ${hospitalIdParam} AND ${afterWhere}`;
}

/**
 * Validates that query results belong to the expected hospital
 * Double-check: ensures no cross-hospital data leakage (defense-in-depth)
 * 
 * @param data - Data returned from database
 * @param expectedHospitalId - Hospital ID we expect
 * @throws Error if hospital_id doesn't match (indicates query bypass)
 */
export function validateQueryResult(
  data: any | any[],
  expectedHospitalId: string
): void {
  if (!data) return;

  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    if (item && item.hospital_id && item.hospital_id !== expectedHospitalId) {
      logger.error({
        msg: 'CRITICAL: Query result hospital_id mismatch (possible data leakage attempt)',
        expectedHospitalId,
        actualHospitalId: item.hospital_id,
        itemId: item.id,
      });
      throw new Error(
        'Data validation failure: Query result contains unexpected hospital data (HIPAA violation detected)'
      );
    }
  }
}

/**
 * Extract hospital context from FastifyRequest headers
 * 
 * In production, this comes from JWT claims after authentication
 * 
 * @param req - FastifyRequest object
 * @returns Hospital context or null if not authenticated
 */
export function extractHospitalContext(req: any): HospitalContext | null {
  try {
    // Hospital context typically lives in JWT claims (decoded by auth middleware)
    const user = req.user || req.context?.user;

    if (!user || !user.hospital_id) {
      return null;
    }

    return {
      hospitalId: user.hospital_id,
      userId: user.id,
      role: user.role,
    };
  } catch (error) {
    logger.error({ msg: 'Failed to extract hospital context', error });
    return null;
  }
}

/**
 * Middleware for FastifyRequest that ensures hospital context
 * 
 * Usage in routes:
 * ```ts
 * app.get('/patients', 
 *   (req, reply, done) => ensureHospitalContext(req, reply, done),
 *   async (req, reply) => {
 *     const context = req.context?.hospital;
 *     // Now context.hospitalId is guaranteed to exist
 *   }
 * );
 * ```
 */
export function ensureHospitalContextMiddleware(req: any, reply: any, done: Function): void {
  try {
    const context = extractHospitalContext(req);
    validateHospitalContext(context);

    // Attach to request for use in route handlers
    if (!req.context) {
      req.context = {};
    }
    req.context.hospital = context;

    done();
  } catch (error) {
    logger.error({
      msg: 'Hospital context validation failed (possible unauthorized access attempt)',
      error: error instanceof Error ? error.message : String(error),
    });

    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Hospital context is required',
      success: false,
    });
  }
}

/**
 * Create hospital-scoped audit log entry
 * 
 * Used to track all data access for HIPAA compliance
 */
export interface AuditLogEntry {
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  recordId: string;
  hospitalId: string;
  userId: string;
  timestamp: string;
  details?: Record<string, any>;
}

export function createAuditLogEntry(
  action: AuditLogEntry['action'],
  table: string,
  recordId: string,
  context: HospitalContext,
  details?: Record<string, any>
): AuditLogEntry {
  return {
    action,
    table,
    recordId,
    hospitalId: context.hospitalId,
    userId: context.userId,
    timestamp: new Date().toISOString(),
    details,
  };
}

export default {
  validateHospitalContext,
  withHospitalScoping,
  withHospitalScopingParam,
  validateQueryResult,
  extractHospitalContext,
  ensureHospitalContextMiddleware,
  createAuditLogEntry,
};
