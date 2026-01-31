/**
 * Advanced Search System
 * Provides filtering, sorting, and pagination for healthcare data
 */

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: unknown;
}

export interface SearchOptions {
  filters?: SearchFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Build Supabase query from search options
 */
export function buildSearchQuery(query: any, options: SearchOptions) {
  let q = query;

  // Apply filters
  if (options.filters && options.filters.length > 0) {
    for (const filter of options.filters) {
      switch (filter.operator) {
        case 'eq':
          q = q.eq(filter.field, filter.value);
          break;
        case 'neq':
          q = q.neq(filter.field, filter.value);
          break;
        case 'gt':
          q = q.gt(filter.field, filter.value);
          break;
        case 'gte':
          q = q.gte(filter.field, filter.value);
          break;
        case 'lt':
          q = q.lt(filter.field, filter.value);
          break;
        case 'lte':
          q = q.lte(filter.field, filter.value);
          break;
        case 'like':
          q = q.like(filter.field, `%${filter.value}%`);
          break;
        case 'in':
          q = q.in(filter.field, filter.value as any[]);
          break;
        case 'between':
          const [min, max] = filter.value as [unknown, unknown];
          q = q.gte(filter.field, min).lte(filter.field, max);
          break;
      }
    }
  }

  // Apply text search
  if (options.search) {
    q = q.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
  }

  // Apply sorting
  if (options.sortBy) {
    q = q.order(options.sortBy, { ascending: options.sortOrder === 'asc' });
  }

  // Apply pagination
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  q = q.range(offset, offset + pageSize - 1);

  return q;
}

/**
 * Execute search query
 */
export async function executeSearch<T>(
  query: any,
  options: SearchOptions
): Promise<SearchResult<T>> {
  const searchQuery = buildSearchQuery(query, options);
  const { data, error, count } = await searchQuery;

  if (error) throw error;

  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: data || [],
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Common search filters for patients
 */
export const patientFilters = {
  byStatus: (status: 'active' | 'inactive'): SearchFilter => ({
    field: 'is_active',
    operator: 'eq',
    value: status === 'active',
  }),

  byBloodType: (bloodType: string): SearchFilter => ({
    field: 'blood_type',
    operator: 'eq',
    value: bloodType,
  }),

  byGender: (gender: string): SearchFilter => ({
    field: 'gender',
    operator: 'eq',
    value: gender,
  }),

  byDateRange: (startDate: string, endDate: string): SearchFilter => ({
    field: 'created_at',
    operator: 'between',
    value: [startDate, endDate],
  }),

  byMRN: (mrn: string): SearchFilter => ({
    field: 'mrn',
    operator: 'like',
    value: mrn,
  }),
};

/**
 * Common search filters for appointments
 */
export const appointmentFilters = {
  byStatus: (status: string): SearchFilter => ({
    field: 'status',
    operator: 'eq',
    value: status,
  }),

  byType: (type: string): SearchFilter => ({
    field: 'appointment_type',
    operator: 'eq',
    value: type,
  }),

  byPriority: (priority: string): SearchFilter => ({
    field: 'priority',
    operator: 'eq',
    value: priority,
  }),

  byDateRange: (startDate: string, endDate: string): SearchFilter => ({
    field: 'scheduled_date',
    operator: 'between',
    value: [startDate, endDate],
  }),

  byDoctor: (doctorId: string): SearchFilter => ({
    field: 'doctor_id',
    operator: 'eq',
    value: doctorId,
  }),
};

/**
 * Common search filters for billing
 */
export const billingFilters = {
  byStatus: (status: 'paid' | 'pending' | 'overdue'): SearchFilter => ({
    field: 'status',
    operator: 'eq',
    value: status,
  }),

  byAmountRange: (min: number, max: number): SearchFilter => ({
    field: 'total',
    operator: 'between',
    value: [min, max],
  }),

  byDateRange: (startDate: string, endDate: string): SearchFilter => ({
    field: 'created_at',
    operator: 'between',
    value: [startDate, endDate],
  }),

  byPaymentMethod: (method: string): SearchFilter => ({
    field: 'payment_method',
    operator: 'eq',
    value: method,
  }),
};
