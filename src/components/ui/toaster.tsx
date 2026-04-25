import { useToast } from "@/hooks/use-toast";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
const positionClasses = {
  "top-right": "fixed top-4 right-4",
  "bottom-right": "fixed bottom-4 right-4",
  "top-center": "fixed top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "fixed bottom-4 left-1/2 -translate-x-1/2",
  center: "fixed inset-0 flex items-center justify-center",
}

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const openToast = toasts.find((toast) => toast.open);

  useBackButtonClose(Boolean(openToast), () => {
    if (openToast) dismiss(openToast.id);
  });

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
            <Toast key={id} {...props}>
              <div className="grid gap-1">
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
