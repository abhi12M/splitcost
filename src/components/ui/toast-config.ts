import { CheckCircle2, Info, MinusCircle, Trash2, TriangleAlert, XCircle, type LucideIcon } from "lucide-react";

// Single source of truth for each toast variant's duration, icon, and colors.
export type ToastVariant = "success" | "info" | "warning" | "destructive" | "error" | "custom";

type ToastVariantConfig = {
  duration: number;
  /**
   * Whether tapping elsewhere on the page closes the toast. Problems stay put:
   * the user's next tap is often "retry" or the field at fault, and that tap
   * shouldn't wipe the message they need.
   */
  closeOnOutsideClick: boolean;
  /** How screen readers announce it: "foreground" interrupts, "background" waits. */
  announce: "foreground" | "background";
  icon?: LucideIcon;
  iconClassName: string;
  accent: string;
  surfaceClassName: string;
  background?: string;
};

/** The single source of truth for every built-in toast variant. */
export const toastVariantConfig: Record<ToastVariant, ToastVariantConfig> = {
  success: {
    closeOnOutsideClick: true,
    announce: "background",
    duration: 4_000,
    icon: CheckCircle2,
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    accent: "#059669",
    surfaceClassName: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950",
  },
  info: {
    closeOnOutsideClick: true,
    announce: "background",
    duration: 5_000,
    icon: Info,
    iconClassName: "text-sky-600 dark:text-sky-400",
    accent: "#0284c7",
    surfaceClassName: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950",
  },
  warning: {
    closeOnOutsideClick: false,
    announce: "foreground",
    duration: 6_000,
    icon: TriangleAlert,
    iconClassName: "text-amber-600 dark:text-amber-400",
    accent: "#d97706",
    surfaceClassName: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
  },
  destructive: {
    closeOnOutsideClick: true,
    announce: "background",
    duration: 5_000,
    icon: Trash2,
    iconClassName: "text-rose-600 dark:text-rose-400",
    accent: "#e11d48",
    surfaceClassName: "border-border bg-card",
  },
  error: {
    closeOnOutsideClick: false,
    announce: "foreground",
    duration: 8_000,
    icon: XCircle,
    iconClassName: "text-red-600 dark:text-red-400",
    accent: "#dc2626",
    surfaceClassName: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950",
  },
  custom: {
    closeOnOutsideClick: true,
    announce: "background",
    duration: 5_000,
    iconClassName: "text-[color:var(--toast-accent)]",
    accent: "hsl(var(--primary))",
    background: "hsl(var(--background))",
    surfaceClassName: "border-[color:var(--toast-accent)] bg-[color:var(--toast-background)]",
  },
};

export const toastIconNames = {
  CheckCircle: CheckCircle2,
  InfoCircle: Info,
  WarningTriangle: TriangleAlert,
  Trash: Trash2,
  MinusCircle,
  XCircle,
} as const;

export type ToastIconName = keyof typeof toastIconNames;
