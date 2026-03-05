import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
        warning: "border-transparent bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
        info: "border-transparent bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
        emergency: "border-transparent bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 animate-pulse",
        urgent: "border-transparent bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
        normal: "border-transparent bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
        low: "border-transparent bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400",
        doctor: "border-transparent bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
        nurse: "border-transparent bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
        pharmacy: "border-transparent bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
        receptionist: "border-transparent bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
        admin: "border-transparent bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
        patient: "border-transparent bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
