import * as React from "react";

import { cn } from "@/lib/utils";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Accessible name for the horizontally scrollable region around the table. */
  scrollLabel?: string;
}

// A11Y-14: the wrapper scrolls on narrow screens, so it must be reachable by keyboard and named.
const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, scrollLabel = "Scrollable table", ...props }, ref) => (
    <div
      role="region"
      aria-label={scrollLabel}
      tabIndex={0}
      className="relative w-full overflow-auto rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b bg-muted/20", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-l-2 border-l-transparent transition-all duration-150",
        "hover:bg-[hsl(var(--primary)/0.04)] hover:border-l-[hsl(var(--primary-vivid)/0.55)]",
        "data-[state=selected]:bg-[hsl(var(--primary)/0.08)] data-[state=selected]:border-l-[hsl(var(--primary-vivid))]",
        className
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, scope = "col", ...props }, ref) => (
    <th
      ref={ref}
      scope={scope}
      className={cn(
        "h-11 px-4 text-left align-middle font-sans font-semibold text-[0.68rem] tracking-[0.08em] uppercase text-muted-foreground/70 [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export interface TableCardField {
  label: string;
  value: React.ReactNode;
}

export interface TableCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Primary text of the card, such as the record name. Wraps instead of overflowing. */
  title: React.ReactNode;
  /** Label/value pairs shown in a definition list. */
  fields: TableCardField[];
  /** Optional row actions, rendered at the bottom of the card. */
  actions?: React.ReactNode;
}

/**
 * Card view of one table row for small screens (UX-07). Use inside `TableCardList`,
 * and render the matching `Table` in `hidden md:block`, so only one view shows at a time.
 */
const TableCard = React.forwardRef<HTMLDivElement, TableCardProps>(
  ({ title, fields, actions, className, ...props }, ref) => (
    <div ref={ref} className={cn("min-w-0 rounded-lg border bg-card p-4 space-y-3 text-sm", className)} {...props}>
      <div className="font-medium break-words">{title}</div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        {fields.map((field) => (
          <div key={field.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{field.label}</dt>
            <dd className="break-words">{field.value}</dd>
          </div>
        ))}
      </dl>
      {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
    </div>
  ),
);
TableCard.displayName = "TableCard";

/** Stacked list of `TableCard`s, shown below the md breakpoint (768px). */
const TableCardList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("grid gap-3 md:hidden", className)} {...props} />,
);
TableCardList.displayName = "TableCardList";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption, TableCard, TableCardList };
