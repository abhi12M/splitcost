import * as React from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import {
  toastIconNames,
  toastActionClassName,
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
// Top toasts sit just below the app headers (mobile app bars are up to 3.5rem,
// the desktop site header about 4.75rem) so they never cover the back button
// or nav, and clear the notch / status bar via the safe-area insets.
const TOP_OFFSET = "top-[calc(env(safe-area-inset-top,0px)+4.5rem)] sm:top-[5.5rem]";
// On phones an action (e.g. Retry) wraps onto its own row under the text,
// aligned with it (icon 1.25rem + gap 0.75rem), instead of squeezing the text.
const ACTION_LAYOUT = "order-last basis-full justify-start pl-8 sm:order-none sm:basis-auto sm:pl-2.5";
const BOTTOM_OFFSET = "bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]";
const positionClasses = {
  "top-right": `${TOP_OFFSET} left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0`,
  "bottom-right": `${BOTTOM_OFFSET} left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0`,
  "top-center": `${TOP_OFFSET} left-1/2 -translate-x-1/2`,
  "bottom-center": `${BOTTOM_OFFSET} left-1/2 -translate-x-1/2`,
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
}

export function Toaster() {
  const tCommon = useTranslations("common");
  const { toasts, dismiss } = useToast();
  // Every open toast that a tap elsewhere should close (problems and realtime
  // notices opt out), so one tap clears them all rather than one per tap.
  const closableIds = toasts
    .filter((toast) => toast.open && toast.closeOnOutsideClick !== false)
    .map((toast) => toast.id)
    .join(",");
  // Persistent toasts behave like overlays: Back closes them before navigating away.
  const persistentToast = toasts.find((toast) => toast.open && toast.duration === Infinity);

  useBackButtonClose(Boolean(persistentToast), () => {
    if (persistentToast) dismiss(persistentToast.id);
  });

  React.useEffect(() => {
    if (!closableIds) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Element && target.closest("[data-app-toast]")) {
        return;
      }

      closableIds.split(",").forEach((id) => dismiss(id));
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [dismiss, closableIds]);

  const grouped = toasts.reduce((acc, t) => {
    const pos = t.position ?? "top-right"
    acc[pos] ??= []
    acc[pos].push(t)
    return acc
  }, {} as Record<string, typeof toasts>)

  return (
    <ToastProvider>
      {Object.entries(grouped).map(([pos, items]) => (
        // z-[105]: above every full-screen layer (the mobile notes screen is
        // z-[100]) and below dialogs raised over them (z-[110]).
        <ToastViewport key={pos} className={`${positionClasses[pos]} z-[105]`}>
          {items.map(({ id, title, description, message, action, dismissible, closeOnOutsideClick: _closeOnOutsideClick, dedupeKey: _dedupeKey, renewKey, icon, customColor, variant = "info", ...props }) => {
            // Combine the stored toast data with the variant's shared visual rules.
            const config = toastVariantConfig[variant];
            // A component icon may be a plain function or a forwardRef/memo object
            // (lucide icons are forwardRef objects), so accept both.
            const isIconComponent =
              typeof icon === "function" || (typeof icon === "object" && icon !== null && "$$typeof" in icon && !React.isValidElement(icon));
            const Icon = typeof icon === "string"
              ? toastIconNames[icon]
              : isIconComponent
                ? (icon as React.ElementType)
                : config.icon;
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
              // renewKey remounts a refreshed duplicate so its auto-close timer restarts.
              <Toast
                key={`${id}-${renewKey ?? 0}`}
                data-app-toast=""
                variant={variant}
                style={customStyle}
                {...props}
                // Radix runs a document-level Esc handler for the newest toast
                // as well as the focused toast's own, so one press closed two
                // (and preventing one prevents both, as they share the event).
                // Turn Radix's Esc handling off and close only the toast that
                // the key press happened in.
                onEscapeKeyDown={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") dismiss(id);
                }}
              >
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

                {callbackAction?.keepOpen ? (
                  // Radix's Action always closes its toast; a plain button doesn't.
                  <button type="button" className={cn(toastActionClassName, ACTION_LAYOUT)} onClick={() => callbackAction.callback()}>
                    {callbackAction.label}
                  </button>
                ) : callbackAction ? (
                  <ToastAction className={ACTION_LAYOUT} altText={callbackAction.label} onClick={() => callbackAction.callback()}>
                    {callbackAction.label}
                  </ToastAction>
                ) : legacyAction}
                {shouldShowClose && <ToastClose aria-label={tCommon("dismissNotification")} />}
              </Toast>
            );
          })}
        </ToastViewport>
      ))}
    </ToastProvider>
  );
}
