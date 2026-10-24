"use client";

import { isValidElement, useState, type MouseEvent, type MouseEventHandler, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/**
 * What an `async` action's handler reports when it settles:
 * - nothing / `true`: it worked; the dialog closes (unless `closeOnSuccess` is false).
 * - `false` (or a thrown error): it failed; the dialog unlocks and closes, and
 *   the handler shows its own error.
 * - `"stay"`: unlock but leave the dialog open (e.g. it now asks a follow-up).
 */
export type AlertActionResult = void | boolean | "stay";

type GenericAlertDialogAction = {
  label: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => AlertActionResult | Promise<AlertActionResult>;
  disabled?: boolean;
  className?: string;
  /** Use a cancel action when the action should simply dismiss the dialog. */
  type?: "action" | "cancel";
  /** "destructive" renders a red action (e.g. Delete). */
  variant?: "default" | "destructive";
  /**
   * For work that takes a request (e.g. Delete). The dialog stays open and
   * locked (Escape, outside click, Back and Cancel are blocked) until the
   * handler settles, so it can't be dismissed mid-request or fired twice.
   */
  async?: boolean;
  /** Shown in place of `label` while an `async` action is running. */
  pendingLabel?: ReactNode;
  /**
   * Set false when success navigates away: the dialog then stays open and
   * locked until the page unmounts, instead of closing onto stale content.
   */
  closeOnSuccess?: boolean;
};

type GenericAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Renders one message as text or multiple messages as a bullet list. */
  messages?: string[];
  body?: ReactNode;
  trigger?: ReactNode;
  actions: GenericAlertDialogAction[];
  /** Optional custom footer content for links or other non-dialog actions. */
  footer?: ReactNode;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  footerClassName?: string;
  onContentClick?: MouseEventHandler<HTMLDivElement>;
  /**
   * Lift the dialog (overlay included) above the app's full-screen layers,
   * such as the mobile Paid by, Split, category and notes screens. Use it for
   * dialogs that can open on their own (e.g. from realtime events) while one
   * of those screens is showing.
   */
  aboveOverlays?: boolean;
};

// Above the full-screen layers (up to z-[100]) and the toasts.
const ABOVE_OVERLAYS = "z-[110]";

/** A configurable confirmation or informational alert dialog for standard text-and-action flows. */
export function GenericAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  messages,
  body,
  trigger,
  actions,
  footer,
  contentClassName,
  titleClassName,
  descriptionClassName,
  footerClassName,
  onContentClick,
  aboveOverlays = false,
}: GenericAlertDialogProps) {
  // Set while an `async` action runs; blocks every way of dismissing the dialog.
  const [pending, setPending] = useState(false);
  const locked = pending;

  const runAsync = async (
    event: MouseEvent<HTMLButtonElement>,
    onClick: NonNullable<GenericAlertDialogAction["onClick"]>,
    closeOnSuccess: boolean,
  ) => {
    setPending(true);
    let result: AlertActionResult = false;
    try {
      result = await onClick(event);
    } catch (error) {
      console.error("alert dialog action failed:", error);
    }
    if (result !== false && result !== "stay" && !closeOnSuccess) return;
    setPending(false);
    if (result !== "stay") onOpenChange(false);
  };

  const dialogDescription =
    messages !== undefined
      ? messages.length === 1
        ? <span>{messages[0]}</span>
        : (
            <ul className="list-disc space-y-1 pl-5 text-left">
              {messages.map((message, index) => (
                <li key={`${message}-${index}`}>{message}</li>
              ))}
            </ul>
          )
      : description;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange} locked={locked}>
      {trigger}
      <AlertDialogContent
        aria-busy={locked || undefined}
        className={cn("max-w-[min(100vw-2rem,26rem)] rounded-sm", aboveOverlays && ABOVE_OVERLAYS, contentClassName)}
        overlayClassName={aboveOverlays ? ABOVE_OVERLAYS : undefined}
        onClick={onContentClick}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={cn("text-md", titleClassName)}>{title}</AlertDialogTitle>
          {dialogDescription && isValidElement(dialogDescription) ? (
            <AlertDialogDescription className={descriptionClassName} asChild>
              {dialogDescription}
            </AlertDialogDescription>
          ) : dialogDescription ? (
            <AlertDialogDescription className={descriptionClassName}>
              {dialogDescription}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        {body}
        <AlertDialogFooter className={cn("mt-2 gap-2", footerClassName)}>
          {footer ?? actions.map(({ label, onClick, disabled, className, type = "action", variant, async: isAsync, pendingLabel, closeOnSuccess = true }, index) => {
            const actionClassName = cn("w-full rounded-xl", className);
            const handleActionClick: MouseEventHandler<HTMLButtonElement> = (event) => {
              if (isAsync && onClick) {
                event.preventDefault();
                void runAsync(event, onClick, closeOnSuccess);
                return;
              }
              void onClick?.(event);
            };

            return type === "cancel" ? (
              <AlertDialogCancel
                key={index}
                disabled={disabled || locked}
                className={actionClassName}
                onClick={onClick}
              >
                {label}
              </AlertDialogCancel>
            ) : (
              <AlertDialogAction
                key={index}
                disabled={disabled || locked}
                variant={variant}
                className={actionClassName}
                onClick={handleActionClick}
              >
                {pending && isAsync && pendingLabel ? pendingLabel : label}
              </AlertDialogAction>
            );
          })}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
