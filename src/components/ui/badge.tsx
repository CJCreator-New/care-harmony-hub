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
        success: "border-transparent bg-success/10 text-success dark:bg-success/20",
        warning: "border-transparent bg-warning/10 text-warning dark:bg-warning/20",
        info: "border-transparent bg-info/10 text-info dark:bg-info/20",
        // A11Y-15: the infinite pulse only runs when the user has not asked for reduced motion.
        emergency: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20 motion-safe:animate-pulse",
        urgent: "border-transparent bg-warning/10 text-warning dark:bg-warning/20",
        normal: "border-transparent bg-info/10 text-info dark:bg-info/20",
        low: "border-transparent bg-muted text-muted-foreground",
        doctor: "border-transparent bg-info/10 text-info dark:bg-info/20",
        nurse: "border-transparent bg-success/10 text-success dark:bg-success/20",
        pharmacy: "border-transparent bg-pharmacy/10 text-pharmacy dark:bg-pharmacy/20",
        receptionist: "border-transparent bg-warning/10 text-warning dark:bg-warning/20",
        admin: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
        patient: "border-transparent bg-primary/10 text-primary dark:bg-primary/20",
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
