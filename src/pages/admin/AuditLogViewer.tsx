/**
 * Audit Log Viewer Component
 * Admin-only dashboard for viewing and filtering activity logs
 * Supports pagination, filtering, sorting, and CSV export for compliance
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useActivityLogsPaginated,
  useActivityLogFilterOptions,
  ActivityLogFilterParams,
} from '@/hooks/useActivityLogsPaginated';
import { downloadLogsAsCSV, generateCSVWithMetadata } from '@/utils/auditLogExport';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Download,
  RefreshCw,
  Filter,
  ChevronDown,
  Search,
} from 'lucide-react';
import { Sonner, toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export interface AuditLogViewerProps {
  pageSize?: number;
  showUserAgent?: boolean;
}

/**
 * Main Audit Log Viewer Component
 * Displays activity logs in a paginated, filterable table
 */
export function AuditLogViewer({
  pageSize = 50,
  showUserAgent = false,
}: AuditLogViewerProps) {
  const { hasPermission } = usePermissions();
  const { hospital, user } = useAuth();

  // Ensure admin access
  if (!hasPermission('audit-logs')) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-3 text-amber-600">
        <AlertCircle className="h-5 w-5" />
        <span>You do not have permission to view audit logs.</span>
      </div>
    );
  }

  // Filter state
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ActivityLogFilterParams>({
    page,
    pageSize,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Date range state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Query data
  const { data, isLoading, error, refetch } = useActivityLogsPaginated(
    filters,
    true
  );

  const { data: filterOptions, isLoading: isLoadingFilters } =
    useActivityLogFilterOptions(true);

  // Action types for badge coloring
  const getActionColor = (action: string): string => {
    if (action.includes('create') || action.includes('insert')) {
      return 'bg-green-100 text-green-800';
    }
    if (action.includes('delete') || action.includes('remove')) {
      return 'bg-red-100 text-red-800';
    }
    if (action.includes('update')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (action.includes('view') || action.includes('read')) {
      return 'bg-gray-100 text-gray-800';
    }
    if (action.includes('approval') || action.includes('review')) {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-slate-100 text-slate-800';
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof ActivityLogFilterParams, value: any) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  // Handle date range filter
  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);

    const filters: ActivityLogFilterParams = {
      page: 1,
      pageSize,
      sortBy: 'created_at',
      sortOrder: 'desc',
    };

    if (start) {
      filters.startDate = new Date(start);
    }
    if (end) {
      filters.endDate = new Date(end);
    }

    setFilters(filters);
    setPage(1);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle CSV export
  const handleExport = () => {
    if (!data?.logs || data.logs.length === 0) {
      toast.error('No logs to export');
      return;
    }

    try {
      const csv = generateCSVWithMetadata(
        data.logs,
        `${user?.first_name} ${user?.last_name}`.trim(),
        hospital?.name,
        {
          filename: `audit_logs_${hospital?.id}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`,
          includeDetails: true,
          includeUserAgent: showUserAgent,
          sanitizePHI: false, // Audit logs can include sensitive data for admins
        }
      );

      downloadLogsAsCSV(data.logs, {
        filename: `audit_logs_${hospital?.id}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`,
      });

      toast.success(
        `Exported ${data.logs.length} audit log entries`,
        {
          duration: 5000,
        }
      );
    } catch (err) {
      toast.error(
        `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    toast.success('Audit logs refreshed', { duration: 3000 });
  };

  const currentPageData = useMemo(() => {
    if (!data?.logs) return [];
    return data.logs;
  }, [data?.logs]);

  const paginationItems = useMemo(() => {
    const items = [];
    const pageCount = data?.pageCount ?? 1;
    const maxPagesToShow = 5;

    if (pageCount <= maxPagesToShow) {
      for (let i = 1; i <= pageCount; i++) {
        items.push(i);
      }
    } else {
      items.push(1);

      if (page > 3) {
        items.push('...');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(pageCount - 1, page + 1);

      for (let i = start; i <= end; i++) {
        items.push(i);
      }

      if (page < pageCount - 2) {
        items.push('...');
      }

      items.push(pageCount);
    }

    return items;
  }, [page, data?.pageCount]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-slate-600 mt-1">
            Activity log for compliance and security auditing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={isLoading || !data?.logs || data.logs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Narrow down audit logs by action, user, date range, and entity type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Search
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Action, entity..."
                  className="pl-10"
                  onChange={(e) =>
                    handleFilterChange('searchQuery', e.target.value)
                  }
                />
              </div>
            </div>

            {/* Action Type */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Action
              </label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange('actionType', value || undefined)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {isLoadingFilters ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    filterOptions?.actionTypes?.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Type */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Entity
              </label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange('entityType', value || undefined)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All entities</SelectItem>
                  {isLoadingFilters ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    filterOptions?.entityTypes?.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entity}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* User */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                User
              </label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange('userId', value || undefined)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All users</SelectItem>
                  {isLoadingFilters ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    filterOptions?.userIds?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Sort
              </label>
              <Select
                defaultValue="created_at-desc"
                onValueChange={(value) => {
                  const [sortBy, sortOrder] = value.split('-');
                  handleFilterChange('sortBy', sortBy);
                  handleFilterChange('sortOrder', sortOrder);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">
                    Newest First
                  </SelectItem>
                  <SelectItem value="created_at-asc">
                    Oldest First
                  </SelectItem>
                  <SelectItem value="action_type-asc">
                    Action (A-Z)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) =>
                  handleDateRangeChange(e.target.value, endDate)
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) =>
                  handleDateRangeChange(startDate, e.target.value)
                }
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>
          {isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <span>
              Showing{' '}
              <span className="font-medium">
                {data?.logs.length ?? 0}
              </span>{' '}
              of{' '}
              <span className="font-medium">{data?.total ?? 0}</span>{' '}
              entries
            </span>
          )}
        </div>
        {error && (
          <div className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Failed to load logs
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-36">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                  {showUserAgent && <TableHead>IP Address</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentPageData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-slate-500"
                    >
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentPageData.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50">
                      <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                        {format(
                          new Date(log.created_at),
                          'MMM dd, yyyy HH:mm:ss'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {log.user?.first_name} {log.user?.last_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {log.user?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action_type)}>
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">
                            {log.entity_type}
                          </span>
                          {log.entity_id && (
                            <div className="text-xs text-slate-500 font-mono">
                              {log.entity_id.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs max-w-xs truncate text-slate-600">
                          {JSON.stringify(log.details)
                            .substring(0, 100)}
                        </div>
                      </TableCell>
                      {showUserAgent && (
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {log.ip_address}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pageCount > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    page > 1 && handlePageChange(page - 1)
                  }
                  disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {paginationItems.map((item, idx) =>
                item === '...' ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <span className="px-2 py-2 text-slate-600">...</span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      isActive={page === item}
                      onClick={() =>
                        typeof item === 'number' && handlePageChange(item)
                      }
                      className={
                        typeof item === 'number'
                          ? 'cursor-pointer'
                          : ''
                      }
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    page < (data?.pageCount ?? 1) &&
                    handlePageChange(page + 1)
                  }
                  disabled={page >= (data?.pageCount ?? 1)}
                  className={
                    page >= (data?.pageCount ?? 1)
                      ? 'pointer-events-none opacity-50'
                      : ''
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Footer Summary */}
      <div className="text-xs text-slate-500 text-center">
        {data && (
          <p>
            Page {data.currentPage} of {data.pageCount} •{' '}
            {data.total} total entries
          </p>
        )}
      </div>
    </div>
  );
}

export default AuditLogViewer;
