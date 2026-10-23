import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { sanitizeExpenseNotes } from "@/lib/expenseNotes";

export type RichTextCommand =
  | "undo"
  | "redo"
  | "bold"
  | "italic"
  | "underline"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "removeFormat";

const TOGGLE_COMMANDS: RichTextCommand[] = ["bold", "italic", "underline", "insertUnorderedList", "insertOrderedList"];

/** An editor shows its placeholder only with no text and no list started (an empty "1." counts as content). */
function isEditorEmpty(editor: HTMLElement) {
  return !editor.textContent?.trim() && !editor.querySelector("li");
}

/**
 * State and handlers for a contentEditable notes editor, shared by the
 * desktop form and the mobile notes screen.
 *
 * The editor is uncontrolled while typing: `value` is written into it only
 * when it arrives from outside (mount, reset). Writing it back on every
 * keystroke would move the caret to the start.
 */
export function useRichTextEditor({
  value,
  onChange,
  maxLength,
}: {
  value: string;
  onChange: (html: string) => void;
  maxLength: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [activeCommands, setActiveCommands] = useState<Partial<Record<RichTextCommand, boolean>>>({});
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const safe = sanitizeExpenseNotes(value);
    if (safe === lastEmittedRef.current) return;
    editor.innerHTML = safe;
    lastEmittedRef.current = safe;
    setIsEmpty(isEditorEmpty(editor));
  }, [value]);

  const emit = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const safe = sanitizeExpenseNotes(editor.innerHTML);
    lastEmittedRef.current = safe;
    setIsEmpty(isEditorEmpty(editor));
    onChange(safe);
  }, [onChange]);

  const updateToolbarState = useCallback(() => {
    const editor = editorRef.current;
    const selection = document.getSelection();
    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) return;
    setActiveCommands(Object.fromEntries(TOGGLE_COMMANDS.map((command) => [command, document.queryCommandState(command)])));
    setCanUndo(document.queryCommandEnabled("undo"));
    setCanRedo(document.queryCommandEnabled("redo"));
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", updateToolbarState);
    return () => document.removeEventListener("selectionchange", updateToolbarState);
  }, [updateToolbarState]);

  const runCommand = useCallback(
    (command: RichTextCommand) => {
      editorRef.current?.focus();
      document.execCommand(command, false);
      emit();
      requestAnimationFrame(updateToolbarState);
    },
    [emit, updateToolbarState]
  );

  const editorHandlers = {
    onInput: () => {
      emit();
      updateToolbarState();
    },
    onKeyUp: updateToolbarState,
    onPointerUp: updateToolbarState,
    onBeforeInput: (event: FormEvent<HTMLDivElement>) => {
      const native = event.nativeEvent as InputEvent;
      if (
        typeof native.inputType === "string" &&
        native.inputType.startsWith("insert") &&
        (editorRef.current?.textContent?.length ?? 0) >= maxLength
      ) {
        event.preventDefault();
      }
    },
    // Paste as plain text, cut to what still fits.
    onPaste: (event: ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const remaining = Math.max(0, maxLength - (editorRef.current?.textContent?.length ?? 0));
      document.execCommand("insertText", false, event.clipboardData.getData("text/plain").slice(0, remaining));
      emit();
    },
  };

  return { editorRef, isEmpty, editorHandlers, activeCommands, canUndo, canRedo, runCommand };
}

export type RichTextEditorState = ReturnType<typeof useRichTextEditor>;
