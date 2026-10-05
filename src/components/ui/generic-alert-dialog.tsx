"use client";

import { isValidElement, type MouseEventHandler, type ReactNode } from "react";
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

type GenericAlertDialogAction = {
  label: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
  /** Use a cancel action when the action should simply dismiss the dialog. */
  type?: "action" | "cancel";
  /** "destructive" renders a red action (e.g. Delete). */
  variant?: "default" | "destructive";
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <AlertDialogContent
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
          {footer ?? actions.map(({ label, onClick, disabled, className, type = "action", variant }, index) => {
            const actionClassName = cn("w-full rounded-xl", className);

            return type === "cancel" ? (
              <AlertDialogCancel
                key={index}
                disabled={disabled}
                className={actionClassName}
                onClick={onClick}
              >
                {label}
              </AlertDialogCancel>
            ) : (
              <AlertDialogAction
                key={index}
                disabled={disabled}
                variant={variant}
                className={actionClassName}
                onClick={onClick}
              >
                {label}
              </AlertDialogAction>
            );
          })}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
