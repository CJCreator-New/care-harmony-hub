import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[hsl(var(--primary-vivid))] to-[hsl(var(--primary))] text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.3),inset_0_1px_0_hsl(0_0%_100%/0.15)] hover:shadow-[0_6px_18px_hsl(var(--primary)/0.4),inset_0_1px_0_hsl(0_0%_100%/0.2)] hover:-translate-y-px active:translate-y-0 active:shadow-[0_1px_4px_hsl(var(--primary)/0.3)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-b from-[hsl(var(--primary-vivid))] to-[hsl(var(--primary))] text-primary-foreground shadow-[0_4px_16px_hsl(var(--primary)/0.35),inset_0_1px_0_hsl(0_0%_100%/0.2)] hover:shadow-[0_8px_28px_hsl(var(--primary)/0.45),inset_0_1px_0_hsl(0_0%_100%/0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 min-h-[44px] rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const ariaLabel =
      props["aria-label"] ??
      (!props["aria-labelledby"] && size === "icon" ? props.title : undefined);

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        aria-label={ariaLabel}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
