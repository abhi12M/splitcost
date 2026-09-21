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
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  footerClassName?: string;
  onContentClick?: MouseEventHandler<HTMLDivElement>;
};

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
  contentClassName,
  titleClassName,
  descriptionClassName,
  footerClassName,
  onContentClick,
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
        className={cn("max-w-[min(100vw-2rem,26rem)] rounded-sm", contentClassName)}
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
          {actions.map(({ label, onClick, disabled, className, type = "action" }, index) => {
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
