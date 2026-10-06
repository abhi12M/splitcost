"use client";

import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { RichTextCommand, RichTextEditorState } from "@/hooks/useRichTextEditor";
import { cn } from "@/lib/utils";

type ToolbarItem = { command: RichTextCommand; label: string; Icon: LucideIcon; toggle?: boolean; history?: boolean };

/** Formatting buttons for the notes editor. */
export function RichNotesToolbar({
  editor,
  size = "md",
  className,
}: {
  editor: RichTextEditorState;
  /** "sm" for the desktop form, "md" for the mobile screen's touch targets. */
  size?: "sm" | "md";
  className?: string;
}) {
  const t = useTranslations("expense");
  const items: ToolbarItem[] = [
    { command: "undo", label: t("notesUndo"), Icon: Undo2, history: true },
    { command: "redo", label: t("notesRedo"), Icon: Redo2, history: true },
    { command: "bold", label: t("notesBold"), Icon: Bold, toggle: true },
    { command: "italic", label: t("notesItalic"), Icon: Italic, toggle: true },
    { command: "underline", label: t("notesUnderline"), Icon: Underline, toggle: true },
    { command: "insertUnorderedList", label: t("notesBullets"), Icon: List, toggle: true },
    { command: "insertOrderedList", label: t("notesNumbers"), Icon: ListOrdered, toggle: true },
    { command: "removeFormat", label: t("notesClearFormatting"), Icon: RemoveFormatting },
  ];

  return (
    <div className={cn("flex gap-1 overflow-x-auto overscroll-x-contain", className)} role="toolbar" aria-label={t("notesLabel")}>
      {items.map(({ command, label, Icon, toggle, history }) => {
        const isActive = Boolean(toggle && editor.activeCommands[command]);
        const isDisabled = Boolean(history && !(command === "undo" ? editor.canUndo : editor.canRedo));
        return (
          <button
            key={command}
            type="button"
            disabled={isDisabled}
            // Keep the editor's selection: pressing a button must not move focus.
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => editor.runCommand(command)}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
              size === "sm" ? "h-8 w-8" : "h-10 w-10",
              isActive && "bg-primary/15 text-primary hover:bg-primary/15 hover:text-primary"
            )}
            aria-label={label}
            aria-pressed={toggle ? isActive : undefined}
            title={label}
          >
            <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
          </button>
        );
      })}
    </div>
  );
}

/** The editable area with its placeholder. */
export function RichNotesEditable({
  editor,
  id,
  placeholder,
  label,
  className,
  wrapperClassName,
}: {
  editor: RichTextEditorState;
  id: string;
  placeholder: string;
  label: string;
  className?: string;
  wrapperClassName?: string;
}) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      {editor.isEmpty && (
        <span className="pointer-events-none absolute left-0 top-0 text-muted-foreground" aria-hidden>
          {placeholder}
        </span>
      )}
      <div
        id={id}
        ref={editor.editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        {...editor.editorHandlers}
        className={cn(
          "whitespace-pre-wrap outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
          className
        )}
      />
    </div>
  );
}
