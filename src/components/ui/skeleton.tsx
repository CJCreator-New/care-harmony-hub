import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Specialized skeleton components for common patterns

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className="h-8 w-2/3 mb-2" />
      <Skeleton className="h-4 w-full mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

function SkeletonStats({ count = 4 }: { count?: number }) {
  const statKeys = Array.from({ length: count }, (_, i) => `stat-${i}`)
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statKeys.map((key) => (
        <div key={key} className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  const headerKeys = Array.from({ length: columns }, (_, i) => `header-${i}`)
  const rowKeys = Array.from({ length: rows }, (_, i) => `row-${i}`)
  const columnKeys = Array.from({ length: columns }, (_, i) => `col-${i}`)
  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="border-b bg-muted/50 p-4">
        <div className="flex gap-4">
          {headerKeys.map((key) => (
            <Skeleton key={key} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y">
        {rowKeys.map((rowKey) => (
          <div key={rowKey} className="flex gap-4 p-4">
            {columnKeys.map((colKey) => (
              <Skeleton key={`${rowKey}-${colKey}`} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonList({ items = 5 }: { items?: number }) {
  const itemKeys = Array.from({ length: items }, (_, i) => `item-${i}`)
  return (
    <div className="space-y-3">
      {itemKeys.map((key) => (
        <div key={key} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/3 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

function SkeletonForm({ fields = 4 }: { fields?: number }) {
  const fieldKeys = Array.from({ length: fields }, (_, i) => `field-${i}`)
  return (
    <div className="space-y-4">
      {fieldKeys.map((key) => (
        <div key={key} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

function SkeletonChart() {
  const barKeys = Array.from({ length: 12 }, (_, i) => `bar-${i}`)
  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-6 w-1/4 mb-6" />
      <div className="flex items-end gap-2 h-48">
        {barKeys.map((key) => (
          <Skeleton
            key={key}
            className="flex-1"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <SkeletonStats count={4} />
      
      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      
      {/* Table */}
      <SkeletonTable rows={5} columns={5} />
    </div>
  )
}

function SkeletonAppointment() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}

function SkeletonPatientCard() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonStats,
  SkeletonTable,
  SkeletonList,
  SkeletonForm,
  SkeletonChart,
  SkeletonDashboard,
  SkeletonAppointment,
  SkeletonPatientCard,
}
