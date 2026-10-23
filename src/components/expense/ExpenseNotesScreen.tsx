import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { RichNotesEditable, RichNotesToolbar } from "@/components/expense/RichNotesEditor";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset";
import { useRichTextEditor } from "@/hooks/useRichTextEditor";
import { EXPENSE_NOTES_TEXT_MAX, normalizeExpenseNotes } from "@/lib/expenseNotes";

interface ExpenseNotesScreenProps {
  open: boolean;
  value: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

/** Full-screen notes editor (mobile). Each open starts from `value`. */
export function ExpenseNotesScreen({ open, value, onCancel, onConfirm }: ExpenseNotesScreenProps) {
  useBackButtonClose(open, onCancel);
  // Mounting the content per open gives the editor a fresh draft each time.
  return open ? <NotesScreenContent value={value} onCancel={onCancel} onConfirm={onConfirm} /> : null;
}

function NotesScreenContent({ value, onCancel, onConfirm }: Omit<ExpenseNotesScreenProps, "open">) {
  const t = useTranslations("expense");
  const [draft, setDraft] = useState(value);
  const editor = useRichTextEditor({ value, onChange: setDraft, maxLength: EXPENSE_NOTES_TEXT_MAX });
  const { keyboardOffset } = useKeyboardLayout();

  useEffect(() => {
    editor.editorRef.current?.focus();
  }, [editor.editorRef]);

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
          onClick={() => onConfirm(normalizeExpenseNotes(draft))}
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
        <RichNotesEditable
          editor={editor}
          id="expense-notes"
          label={t("notesLabel")}
          placeholder={t("notesPlaceholder")}
          wrapperClassName="min-h-0 flex-1"
          className="min-h-full"
        />
      </main>

      <footer className="shrink-0 border-t bg-background px-1 py-1.5" style={{ marginBottom: keyboardOffset }}>
        <RichNotesToolbar editor={editor} />
      </footer>
    </div>
  );
}
