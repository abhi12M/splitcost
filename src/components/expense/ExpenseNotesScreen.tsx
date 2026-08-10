import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bold,
  Check,
  Italic,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset";
import {
  EXPENSE_NOTES_TEXT_MAX,
  sanitizeExpenseNotes,
} from "@/lib/expenseNotes";
import { cn } from "@/lib/utils";

interface ExpenseNotesScreenProps {
  open: boolean;
  value: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export function ExpenseNotesScreen({
  open,
  value,
  onCancel,
  onConfirm,
}: ExpenseNotesScreenProps) {
  const t = useTranslations("expense");
  const [draft, setDraft] = useState(value);
  const [isEmpty, setIsEmpty] = useState(true);
  const [activeCommands, setActiveCommands] = useState<Record<string, boolean>>({});
  const [historyCommands, setHistoryCommands] = useState({ undo: false, redo: false });
  const editorRef = useRef<HTMLDivElement>(null);
  const { keyboardOffset } = useKeyboardLayout();

  useEffect(() => {
    if (!open || !editorRef.current) return;

    const safeValue = sanitizeExpenseNotes(value);
    setDraft(safeValue);
    editorRef.current.innerHTML = safeValue;
    setIsEmpty(!editorRef.current.textContent?.trim());
    editorRef.current.focus();
  }, [open, value]);

  useBackButtonClose(open, onCancel);

  const syncDraft = useCallback(() => {
    if (!editorRef.current) return;
    const safeValue = sanitizeExpenseNotes(editorRef.current.innerHTML);
    setDraft(safeValue);
    setIsEmpty(!editorRef.current.textContent?.trim());
  }, []);

  const updateToolbarState = useCallback(() => {
    const editor = editorRef.current;
    const selection = document.getSelection();
    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) return;

    setActiveCommands({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
    setHistoryCommands({
      undo: document.queryCommandEnabled("undo"),
      redo: document.queryCommandEnabled("redo"),
    });
  }, []);

  const runCommand = useCallback((command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncDraft();
    requestAnimationFrame(updateToolbarState);
  }, [syncDraft, updateToolbarState]);

  useEffect(() => {
    if (!open) return;

    document.addEventListener("selectionchange", updateToolbarState);
    return () => document.removeEventListener("selectionchange", updateToolbarState);
  }, [open, updateToolbarState]);

  const toolbarItems = [
    { command: "undo", label: t("notesUndo"), Icon: Undo2, history: true },
    { command: "redo", label: t("notesRedo"), Icon: Redo2, history: true },
    { command: "bold", label: t("notesBold"), Icon: Bold, toggle: true },
    { command: "italic", label: t("notesItalic"), Icon: Italic, toggle: true },
    { command: "underline", label: t("notesUnderline"), Icon: Underline, toggle: true },
    { command: "insertUnorderedList", label: t("notesBullets"), Icon: List, toggle: true },
    { command: "insertOrderedList", label: t("notesNumbers"), Icon: ListOrdered, toggle: true },
    { command: "removeFormat", label: t("notesClearFormatting"), Icon: RemoveFormatting },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden overscroll-none bg-background text-foreground">
      <header className="grid h-14 shrink-0 grid-cols-[2.5rem_1fr_2.5rem] items-center border-b px-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center"
          aria-label={t("cancelNotes")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="px-3 text-lg font-medium">{t("addNotes")}</h1>
        <button
          type="button"
          onClick={() => onConfirm(sanitizeExpenseNotes(draft))}
          className="flex h-10 w-10 items-center justify-center text-primary"
          aria-label={t("saveNotes")}
        >
          <Check className="h-5 w-5" />
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        <label htmlFor="expense-notes" className="mb-2 block text-sm font-medium">
          {t("notesLabel")}
        </label>
        <div className="relative min-h-0 flex-1">
          {isEmpty && (
            <span className="pointer-events-none absolute left-0 top-0 text-muted-foreground">
              {t("notesPlaceholder")}
            </span>
          )}
          <div
          id="expense-notes"
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={t("notesLabel")}
          onInput={() => {
            syncDraft();
            updateToolbarState();
          }}
          onKeyUp={updateToolbarState}
          onPointerUp={updateToolbarState}
          onBeforeInput={(event) => {
            const nativeEvent = event.nativeEvent as InputEvent;
            if (
              typeof nativeEvent.inputType === "string" &&
              nativeEvent.inputType.startsWith("insert") &&
              (editorRef.current?.textContent?.length ?? 0) >= EXPENSE_NOTES_TEXT_MAX
            ) {
              event.preventDefault();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const currentLength = editorRef.current?.textContent?.length ?? 0;
            const remaining = Math.max(0, EXPENSE_NOTES_TEXT_MAX - currentLength);
            document.execCommand(
              "insertText",
              false,
              event.clipboardData.getData("text/plain").slice(0, remaining)
            );
            syncDraft();
          }}
          className="min-h-full whitespace-pre-wrap outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        />
        </div>
      </main>

      <footer
        className="shrink-0 border-t bg-background px-1 py-1.5"
        style={{ marginBottom: keyboardOffset }}
      >
        <div className="flex gap-1 overflow-x-auto overscroll-x-contain">
          {toolbarItems.map(({ command, label, Icon, toggle, history }) => {
            const isActive = Boolean(toggle && activeCommands[command]);
            const isDisabled = Boolean(history && !historyCommands[command as "undo" | "redo"]);

            return (
            <button
              key={command}
              type="button"
              disabled={isDisabled}
              onPointerDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => runCommand(command)}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
                isActive && "bg-primary/15 text-primary"
              )}
              aria-label={label}
              aria-pressed={toggle ? isActive : undefined}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
