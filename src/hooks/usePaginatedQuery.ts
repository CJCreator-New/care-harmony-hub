import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

interface PaginatedQueryOptions {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  pageSize?: number;
}

export function usePaginatedQuery({
  table,
  select = '*',
  filters = {},
  orderBy = { column: 'created_at', ascending: false },
  pageSize = 50,
}: PaginatedQueryOptions) {
  const [currentPage, setCurrentPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: [table, 'paginated', currentPage, filters, orderBy],
    queryFn: async () => {
      let query = supabase
        .from(table)
        .select(select, { count: 'exact' })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1)
        .order(orderBy.column, { ascending: orderBy.ascending });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage,
        pageSize,
      };
    },
  });

  return {
    data: data?.data || [],
    count: data?.count || 0,
    totalPages: data?.totalPages || 0,
    currentPage,
    pageSize,
    isLoading,
    error,
    nextPage: () => setCurrentPage(prev => Math.min(prev + 1, (data?.totalPages || 1) - 1)),
    prevPage: () => setCurrentPage(prev => Math.max(prev - 1, 0)),
    goToPage: (page: number) => setCurrentPage(Math.max(0, Math.min(page, (data?.totalPages || 1) - 1))),
  };
}