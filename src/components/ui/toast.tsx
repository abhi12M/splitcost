import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";

import { type ToastIconName, type ToastVariant, toastIconNames, toastVariantConfig } from "@/components/ui/toast-config";
import { cn } from "@/lib/utils";

// Reusable presentational pieces. This file does not decide which toast to show.
const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "pointer-events-none fixed z-[105] flex max-h-[calc(100dvh-6rem)] w-[calc(100vw-2rem)] max-w-[360px] flex-col gap-2 p-0 sm:max-w-[380px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

// Swipe: a finished swipe keeps sliding right as it fades. With only the
// normal close animation it was pulled back toward its start while sliding up.
// (Radix already sets touch-action: none on toasts, so drags reach the swipe.)
const toastBaseClassName ="group pointer-events-auto relative flex w-full flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap sm:gap-y-0 overflow-hidden rounded-xl border px-4 py-3.5 text-foreground shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[swipe=move]:select-none data-[swipe=end]:slide-out-to-right-full data-[swipe=end]:slide-out-to-top-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-2 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 motion-reduce:transition-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[swipe=end]:animate-none";

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & { variant?: ToastVariant }
>(({ className, variant = "info", ...props }, ref) => {
  return <ToastPrimitives.Root ref={ref} className={cn(toastBaseClassName, toastVariantConfig[variant].surfaceClassName, className)} {...props} />;
});
Toast.displayName = ToastPrimitives.Root.displayName;

const toastActionClassName = "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-2.5 text-sm sm:h-8 font-semibold text-[color:var(--toast-accent)] transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(toastActionClassName, className)}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "-m-1 shrink-0 rounded-md p-2 text-slate-600 transition-colors hover:bg-black/5 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-ring dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",

      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold leading-none", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(
      "break-words text-sm leading-snug text-muted-foreground",
      className
    )}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastCustomColor = { background: string; accent: string };

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  type ToastVariant,
  type ToastIconName,
  type ToastCustomColor,
  toastIconNames,
  toastActionClassName,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
