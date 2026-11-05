/**
 * Compatibility adapter. Sonner is the single toast system (mounted once in App.tsx).
 *
 * Older call sites use the shadcn API: `toast({ title, description, variant })` and
 * `const { toast } = useToast()`. This module keeps that signature and forwards to Sonner,
 * so there is one visual system, one position and one stacking behaviour.
 *
 * Guidance: use toasts for confirmations and background results. Put form and
 * validation errors inline next to the field or form, with role="alert".
 */
import * as React from "react";
import { toast as sonnerToast } from "sonner";

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function show(props: ToastOptions, id?: string | number): string | number {
  const { title, description, variant, duration, action } = props;
  const options = {
    id,
    description,
    duration,
    action: action ? { label: action.label, onClick: action.onClick } : undefined,
  };
  const message = title ?? (typeof description === "string" ? description : "");
  return variant === "destructive"
    ? sonnerToast.error(message, options)
    : sonnerToast(message, options);
}

function toast(props: ToastOptions) {
  const id = show(props);
  return {
    id: String(id),
    dismiss: () => sonnerToast.dismiss(id),
    update: (next: ToastOptions) => {
      show(next, id);
    },
  };
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
    toasts: [] as never[],
  };
}

export { useToast, toast };
