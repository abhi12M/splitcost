import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
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

  useBackButtonClose(Boolean(openToast), () => {
    if (openToast) dismiss(openToast.id);
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
          {items.map(({ id, title, description, action, hideClose, ...props }) => (
            <Toast key={id} data-app-toast="" {...props}>
              <div className="grid min-w-0 gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>

              {action}
              {!hideClose && <ToastClose />}
            </Toast>
          ))}
        </ToastViewport>
      ))}
    </ToastProvider>
  );
}
