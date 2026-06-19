/**
 * Hook for querying activity logs with pagination, filtering, and sorting
 * Supports hospital-scoped queries with RLS enforcement
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export interface ActivityLogFilterParams {
  actionType?: string;
  userId?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'action_type' | 'user_id';
  sortOrder?: 'asc' | 'desc';
}

export interface ActivityLogRow {
  id: string;
  user_id: string;
  hospital_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  new_values: Record<string, any> | null;
  old_values: Record<string, any> | null;
  severity: string | null;
  created_at: string;
  user?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export interface ActivityLogsPaginatedResponse {
  logs: ActivityLogRow[];
  total: number;
  pageCount: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Hook to fetch paginated activity logs with filtering and sorting
 * Automatically scopes to current hospital via RLS
 */
export function useActivityLogsPaginated(
  filters?: ActivityLogFilterParams,
  enabled: boolean = true
): UseQueryResult<ActivityLogsPaginatedResponse, Error> {
  const { hospital, user } = useAuth();

  return useQuery({
    queryKey: [
      'activity-logs-paginated',
      hospital?.id,
      filters?.actionType,
      filters?.userId,
      filters?.entityType,
      filters?.startDate?.toISOString(),
      filters?.endDate?.toISOString(),
      filters?.searchQuery,
      filters?.page ?? 1,
      filters?.pageSize ?? 50,
      filters?.sortBy ?? 'created_at',
      filters?.sortOrder ?? 'desc',
    ],
    queryFn: async () => {
      if (!hospital?.id) {
        throw new Error('Hospital context required');
      }

      const pageSize = filters?.pageSize ?? 50;
      const page = filters?.page ?? 1;
      const offset = (page - 1) * pageSize;

      // Build initial query with joins
      let query = supabase
        .from('activity_logs')
        .select(
          `
          id,
          user_id,
          hospital_id,
          action_type,
          entity_type,
          entity_id,
          details,
          ip_address,
          user_agent,
          new_values,
          old_values,
          severity,
          created_at,
          user:user_id (
            first_name,
            last_name,
            email
          )
        `,
          { count: 'exact' }
        )
        .eq('hospital_id', hospital.id);

      // Apply filters
      if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.startDate) {
        query = query.gte(
          'created_at',
          filters.startDate.toISOString()
        );
      }

      if (filters?.endDate) {
        query = query.lte(
          'created_at',
          filters.endDate.toISOString()
        );
      }

      // Apply search on action_type or entity_type for quick filtering
      if (filters?.searchQuery) {
        const searchTerm = `%${filters.searchQuery}%`;
        query = query.or(
          `action_type.ilike.${searchTerm},entity_type.ilike.${searchTerm}`
        );
      }

      // Apply sorting
      const sortBy = filters?.sortBy ?? 'created_at';
      const sortOrder = filters?.sortOrder ?? 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(
          `Failed to fetch activity logs: ${error.message}`
        );
      }

      const total = count ?? 0;
      const pageCount = Math.ceil(total / pageSize);

      return {
        logs: (data ?? []) as unknown as ActivityLogRow[],
        total,
        pageCount,
        currentPage: page,
        pageSize,
      };
    },
    enabled: enabled && Boolean(hospital?.id),
    staleTime: 1 * 60 * 1000, // 1 minute cache
    gcTime: 5 * 60 * 1000, // 5 minute garbage collection
  });
}

/**
 * Hook to get distinct values for filter dropdowns
 * Useful for populating filter UI
 */
export function useActivityLogFilterOptions(
  enabled: boolean = true
): UseQueryResult<{
  actionTypes: string[];
  entityTypes: string[];
  userIds: Array<{ id: string; name: string; email: string }>;
}, Error> {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['activity-log-filter-options', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) {
        throw new Error('Hospital context required');
      }

      // Get distinct action types
      const { data: actionTypeData } = await supabase
        .from('activity_logs')
        .select('action_type')
        .eq('hospital_id', hospital.id)
        .order('action_type')
        .throwOnError();

      // Get distinct entity types
      const { data: entityTypeData } = await supabase
        .from('activity_logs')
        .select('entity_type')
        .eq('hospital_id', hospital.id)
        .not('entity_type', 'is', null)
        .order('entity_type')
        .throwOnError();

      // Get user list for this hospital
      const { data: staffData } = await supabase
        .from('staff')
        .select('profiles:user_id (id, first_name, last_name, email)')
        .eq('hospital_id', hospital.id)
        .throwOnError();

      const actionTypes = Array.from(
        new Set(
          (actionTypeData ?? [])
            .map((row) => row.action_type)
            .filter(Boolean)
        )
      ).sort();

      const entityTypes = Array.from(
        new Set(
          (entityTypeData ?? [])
            .map((row) => row.entity_type)
            .filter(Boolean)
        )
      ).sort();

      const userIds = staffData
        ?.map((staff) => ({
          id: (staff.profiles as any)?.id ?? '',
          name: `${(staff.profiles as any)?.first_name ?? ''} ${(staff.profiles as any)?.last_name ?? ''}`.trim(),
          email: (staff.profiles as any)?.email ?? '',
        }))
        .filter((user) => user.id)
        .sort((a, b) => a.name.localeCompare(b.name)) ?? [];

      return {
        actionTypes,
        entityTypes,
        userIds,
      };
    },
    enabled: enabled && Boolean(hospital?.id),
    staleTime: 10 * 60 * 1000, // 10 minute cache (relatively static data)
    gcTime: 30 * 60 * 1000, // 30 minute garbage collection
  });
}
