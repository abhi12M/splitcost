import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import {
  toastIconNames,
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { toastVariantConfig } from "@/components/ui/toast-config";
import { cn } from "@/lib/utils";

// Display manager: reads active toast data, combines it with UI pieces, and renders it on screen.
const positionClasses = {
  "top-right": "top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0",
  "bottom-right": "bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
}

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const openToast = toasts.find((toast) => toast.open);
  // Persistent toasts behave like overlays: Back closes them before navigating away.
  const persistentToast = toasts.find((toast) => toast.open && toast.duration === Infinity);

  useBackButtonClose(Boolean(persistentToast), () => {
    if (persistentToast) dismiss(persistentToast.id);
  });

  React.useEffect(() => {
    if (!openToast) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Element && target.closest("[data-app-toast]")) {
        return;
      }

      dismiss(openToast.id);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [dismiss, openToast]);

  const grouped = toasts.reduce((acc, t) => {
    const pos = t.position ?? "top-right"
    acc[pos] ??= []
    acc[pos].push(t)
    return acc
  }, {} as Record<string, typeof toasts>)

  return (
    <ToastProvider>
      {Object.entries(grouped).map(([pos, items]) => (
        <ToastViewport key={pos} className={`${positionClasses[pos]} z-[100]`}>
          {items.map(({ id, title, description, message, action, dismissible, icon, customColor, variant = "info", ...props }) => {
            // Combine the stored toast data with the variant's shared visual rules.
            const config = toastVariantConfig[variant];
            const Icon = typeof icon === "string" ? toastIconNames[icon] : typeof icon === "function" ? icon : config.icon;
            const customStyle = {
              "--toast-accent": variant === "custom"
                ? (customColor?.accent ?? config.accent)
                : config.accent,
              ...(variant === "custom" ? {
                "--toast-background": customColor?.background ?? config.background,
              } : {}),
            } as React.CSSProperties;
            const shouldShowClose = dismissible ?? true;
            const callbackAction = action && !React.isValidElement(action) ? action : undefined;
            const legacyAction = React.isValidElement(action) ? action : null;

            return (
              <Toast key={id} data-app-toast="" variant={variant} style={customStyle} {...props}>
                {React.isValidElement(icon) ? <span className="shrink-0 text-[color:var(--toast-accent)]">{icon}</span> : Icon ? (
                  <Icon className={cn("h-5 w-5 shrink-0", config.iconClassName)} aria-hidden="true" />
                ) : null}

                <div className="min-w-0 flex-1">
                  {message ? <ToastDescription className="text-foreground">{message}</ToastDescription> : (
                    <div className="grid min-w-0 gap-1">
                      {title && <ToastTitle>{title}</ToastTitle>}
                      {description && <ToastDescription>{description}</ToastDescription>}
                    </div>
                  )}
                </div>

                {callbackAction ? (
                  <ToastAction altText={callbackAction.label} onClick={() => callbackAction.callback()}>
                    {callbackAction.label}
                  </ToastAction>
                ) : legacyAction}
                {shouldShowClose && <ToastClose aria-label="Dismiss notification" />}
              </Toast>
            );
          })}
        </ToastViewport>
      ))}
    </ToastProvider>
  );
}
