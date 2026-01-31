import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const progressVariants = cva(
  "h-full w-full flex-1 transition-all",
  {
    variants: {
      variant: {
        default: "bg-primary",
        success: "bg-green-500",
        warning: "bg-yellow-500",
        destructive: "bg-destructive",
        info: "bg-blue-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  /** Accessible label describing what this progress bar represents */
  "aria-label"?: string;
  /** ID of element that labels this progress bar */
  "aria-labelledby"?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
    role="progressbar"
    aria-valuenow={value || 0}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(progressVariants({ variant }))}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, progressVariants };
