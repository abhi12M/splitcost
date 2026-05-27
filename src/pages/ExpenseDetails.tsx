"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Edit3,
  FileText,
  ImageIcon,
  ImagePlus,
  Loader2,
  Paperclip,
  Pencil,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/Spinner";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ExpenseAttachmentViewer } from "@/components/expense/ExpenseAttachmentViewer";
import {
  getCategoryIcon,
  EXPENSE_CATEGORIES,
  type CategoryKey,
} from "@/components/icons/CategoryIcons";
import {
  deleteExpense,
  editExpense,
  EditExpenseInterface,
  patchExpenseCategory,
  ExpenseParticipantsRequest,
} from "@/lib/storage";
import {
  formatAmount,
  formatDisplayDate,
  formatDisplayDateTime,
} from "@/components/ui/formatters";
import {
  deleteExpenseAttachment,
  ExpenseAttachment,
  formatAttachmentSize,
  loadExpenseAttachment,
  readExpenseAttachmentFile,
  saveExpenseAttachment,
  validateAttachmentFile,
} from "@/lib/expenseAttachments";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { SingleSelect } from "@/components/ui/single-select";
import { useDeviceType } from "@/hooks/useDeviceType";

function memberName(
  members: EditExpenseInterface["group"]["members"],
  userId: string | null
) {
  if (!userId) return "Unknown";
  return members.find((member) => member.id === userId)?.name || "Unknown";
}

function formatSummaryName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "Unknown";
  }

  const parts = normalized.split(" ");
  const firstName = parts[0];
  const secondName = parts[1];
  const maxFirstNameLength = secondName ? 11 : 10;
  const trimmedFirstName =
    firstName.length > maxFirstNameLength
      ? `${firstName.slice(0, maxFirstNameLength)}...`
      : firstName;

  if (!secondName) {
    return trimmedFirstName;
  }

  return `${trimmedFirstName} ${secondName.charAt(0).toUpperCase()}.`;
}

function calculateExpenseSettlements(
  members: EditExpenseInterface["group"]["members"],
  payers: { userId: string | null; amount: number }[],
  participants: ExpenseParticipantsRequest[]
) {
  const balances = new Map<string, number>();

  const addBalance = (userId: string | null, amount: number) => {
    if (!userId) return;
    balances.set(userId, Math.round(((balances.get(userId) ?? 0) + amount) * 100) / 100);
  };

  payers.forEach((payer) => addBalance(payer.userId, Number(payer.amount) || 0));
  participants.forEach((participant) =>
    addBalance(participant.userId, -(Number(participant.amount) || 0))
  );

  const debtors = Array.from(balances.entries())
    .filter(([, balance]) => balance < -0.01)
    .map(([userId, balance]) => ({ userId, balance }))
    .sort((a, b) => a.balance - b.balance);

  const creditors = Array.from(balances.entries())
    .filter(([, balance]) => balance > 0.01)
    .map(([userId, balance]) => ({ userId, balance }))
    .sort((a, b) => b.balance - a.balance);

  const settlements: { fromId: string; fromName: string; toId: string; toName: string; amount: number }[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const amount = Math.min(-debtors[debtorIndex].balance, creditors[creditorIndex].balance);

    settlements.push({
      fromId: debtors[debtorIndex].userId,
      fromName: memberName(members, debtors[debtorIndex].userId),
      toId: creditors[creditorIndex].userId,
      toName: memberName(members, creditors[creditorIndex].userId),
      amount: Math.round(amount * 100) / 100,
    });

    debtors[debtorIndex].balance += amount;
    creditors[creditorIndex].balance -= amount;

    if (Math.abs(debtors[debtorIndex].balance) < 0.01) debtorIndex += 1;
    if (Math.abs(creditors[creditorIndex].balance) < 0.01) creditorIndex += 1;
  }

  return settlements;
}

function ExpenseDetailsSkeleton() {
  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full max-w-3xl flex-col">
        <header className="relative shrink-0 border-b bg-muted/40 px-3 sm:px-4">
          <div className="flex h-14 items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
          <Skeleton className="absolute bottom-[-24px] left-[5rem] h-16 w-16 rounded-md" />
        </header>

        <main className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 p-4 pt-10">
          <section>
            <div className="space-y-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-9 w-36" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-3 w-48" />
            </div>
          </section>

          <section className="grid min-h-0 gap-3 md:grid-cols-[1fr_0.85fr]">
            <div className="min-h-0 rounded-lg border bg-card p-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden min-h-0 rounded-lg border bg-card p-3 md:block">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>

              <Skeleton className="min-h-[9rem] rounded-md" />
              <div className="mt-2 flex gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function ExpenseDetailsPage({
  groupId,
  expenseId,
}: {
  groupId: string;
  expenseId: string;
}) {
  const router = useRouter();
  const device = useDeviceType();
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [details, setDetails] = useState<EditExpenseInterface | null>(null);
  const [attachment, setAttachment] = useState<ExpenseAttachment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isUpdatingAttachment, setIsUpdatingAttachment] = useState(false);
  const [attachmentOperation, setAttachmentOperation] = useState<"uploading" | "deleting" | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isExpenseDeleteConfirmOpen, setIsExpenseDeleteConfirmOpen] = useState(false);
  const [isAttachmentDeleteConfirmOpen, setIsAttachmentDeleteConfirmOpen] = useState(false);
  const headerIconButtonClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground/70 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:hover:bg-background/40";
  const viewerActionButtonClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground/70 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:hover:bg-muted";

  useEffect(() => {
    editExpense(expenseId)
      .then(async (expenseDetails) => {
        setDetails(expenseDetails);

        if (!expenseDetails) return;

        const storedAttachment = await loadExpenseAttachment(
          expenseId,
          expenseDetails.expense.attachmentDataUrl
        );
        setAttachment(storedAttachment);
      })
      .finally(() => setLoading(false));
  }, [expenseId]);

  const handleDeleteExpense = async () => {
    setIsDeletingExpense(true);
    try {
      await deleteExpense(expenseId);
      if (attachment) {
        await deleteExpenseAttachment(expenseId);
      }
      router.push(`/group/${groupId}`);
    } finally {
      setIsDeletingExpense(false);
      setIsExpenseDeleteConfirmOpen(false);
    }
  };

  const handleRemoveAttachment = async () => {
    setAttachmentOperation("deleting");
    setIsUpdatingAttachment(true);
    try {
      await deleteExpenseAttachment(expenseId);
      setAttachment(null);
      setDetails((current) =>
        current
          ? {
            ...current,
            expense: {
              ...current.expense,
              attachmentDataUrl: null,
            },
          }
          : current
      );
      setIsViewerOpen(false);
      setIsAttachmentDeleteConfirmOpen(false);
    } finally {
      setIsUpdatingAttachment(false);
      setAttachmentOperation(null);
    }
  };

  const handleAttachmentInputChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const validationError = validateAttachmentFile(file);
    if (validationError) {
      setAttachmentError(validationError);
      return;
    }

    setAttachmentError("");
    setAttachmentOperation("uploading");
    setIsUpdatingAttachment(true);

    try {
      const nextAttachment = await readExpenseAttachmentFile(file);
      const savedAttachment = await saveExpenseAttachment(expenseId, nextAttachment);
      setAttachment(savedAttachment);
      setDetails((current) =>
        current && savedAttachment
          ? {
            ...current,
            expense: {
              ...current.expense,
              attachmentDataUrl: savedAttachment.url,
            },
          }
          : current
      );
      setIsViewerOpen(true);
    } finally {
      setIsUpdatingAttachment(false);
      setAttachmentOperation(null);
    }
  };

  const handleCategoryPatch = async (
    category: CategoryKey,
    subcategory: string
  ) => {
    if (!details) return;

    setIsUpdatingCategory(true);

    const updatedExpense = await patchExpenseCategory(
      expenseId,
      category,
      subcategory
    );

    if (updatedExpense) {
      setDetails({
        ...details,
        expense: {
          ...details.expense,
          category: updatedExpense.category,
          subcategory: updatedExpense.subcategory,
          updatedAt: updatedExpense.updatedAt,
        },
      });
    }

    setIsUpdatingCategory(false);
  };

  const participantRows = useMemo(() => {
    if (!details) return [];

    return details.expense.participants.map((participant: ExpenseParticipantsRequest) => ({
      ...participant,
      name: memberName(details.group.members, participant.userId),
    }));
  }, [details]);

  if (loading) {
    return <ExpenseDetailsSkeleton />;
  }

  if (!details) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">Expense not found</p>
        <Button asChild>
          <Link href={`/group/${groupId}`}>Back to group</Link>
        </Button>
      </div>
    );
  }

  const { group, expense } = details;
  const categoryColor =
    EXPENSE_CATEGORIES[expense.category as CategoryKey]?.color ||
    "category-uncategorized";
  const IconComponent = getCategoryIcon(
    expense.category as CategoryKey,
    expense.subcategory
  );
  const showCategoryPatch =
    expense.category === "uncategorized" && expense.subcategory === "general";
  const isMobile = device === "mobile";
  const isSettlementExpense = expense.category === "settlement";
  const payers = expense.payers?.length
    ? expense.payers.map((payer) => ({
      userId: payer.userId,
      name: memberName(group.members, payer.userId),
      amount: payer.amount,
    }))
    : [
      {
        userId: expense.paidByUserId,
        name: memberName(group.members, expense.paidByUserId),
        amount: expense.amount,
      },
    ];
  const netSettlements = calculateExpenseSettlements(
    group.members,
    payers.map(({ userId, amount }) => ({ userId, amount })),
    expense.participants
  );
  const owedRows = participantRows.map((participant) => ({
    userId: participant.userId,
    name: formatSummaryName(participant.name),
    amount: Number(participant.amount) || 0,
  }));
  const isImageAttachment = attachment?.type.startsWith("image/");
  const createdAtLabel = formatDisplayDateTime(expense.createdAt);
  const updatedAtLabel = formatDisplayDateTime(expense.updatedAt);

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full max-w-3xl flex-col">
        <input
          ref={attachmentInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleAttachmentInputChange}
        />

        <header
          className="relative shrink-0 border-b px-3 sm:px-4"
          style={{ backgroundColor: `hsl(var(--${categoryColor}) / 0.18)` }}
        >
          <div className="flex h-14 items-center justify-between">
            <Link
              href={`/group/${groupId}`}
              aria-label="Back to group"
              className={headerIconButtonClass}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-1 text-foreground/70">
              {isMobile && !attachment && (
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  aria-label="Add attachment"
                  className={headerIconButtonClass}
                  disabled={isUpdatingAttachment}
                >
                  {isUpdatingAttachment ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                </button>
              )}
              <Link
                href={`/group/${groupId}/edit-expense/${expenseId}`}
                aria-label="Edit expense"
                className={headerIconButtonClass}
              >
                <Pencil className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => setIsExpenseDeleteConfirmOpen(true)}
                aria-label="Delete expense"
                className={headerIconButtonClass}
                disabled={isDeletingExpense}
              >
                {isDeletingExpense ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-[-24px] left-[5rem]">
            {showCategoryPatch ? (
              <div className="pointer-events-auto">
                <SingleSelect
                  groups={Object.entries(EXPENSE_CATEGORIES).map(([key, category]) => ({
                    id: key,
                    label: category.label,
                    color: category.color,
                    subOptions: category.subcategories.map((sub) => ({
                      id: sub.id,
                      label: sub.label,
                      icon: sub.icon,
                    })),
                  }))}
                  value={{ groupId: expense.category, itemId: expense.subcategory }}
                  onSelect={(groupId, itemId) =>
                    handleCategoryPatch(groupId as CategoryKey, itemId)
                  }
                  inputPlaceholder="Search or select category"
                  fullscreenOnMobile
                  disabled={isUpdatingCategory}
                  trigger={
                    <button
                      type="button"
                      disabled={isUpdatingCategory}
                      className="inline-flex h-12 items-center gap-1 rounded-md border border-foreground/15 bg-background/95 px-2.5 text-foreground shadow-sm disabled:opacity-60"
                      aria-label="Patch category"
                    >
                      <IconComponent
                        className="h-8 w-8"
                        style={{ color: `hsl(var(--${categoryColor}))` }}
                      />
                      {isUpdatingCategory ? (
                        <Check className="h-4 w-4 opacity-60" />
                      ) : (
                        <ChevronDown className="h-4 w-4 opacity-70" />
                      )}
                    </button>
                  }
                />
              </div>
            ) : (
              <IconComponent
                className="h-16 w-16"
                style={{ color: `hsl(var(--${categoryColor}))` }}
              />
            )}
          </div>
        </header>

        <main className="grid min-h-0 flex-1 grid-rows-[auto_1fr_auto] gap-3 p-4 pt-10">
          <section>
            <div className="flex items-start gap-3">
              {attachment && (
                <button
                  type="button"
                  className="mt-1 block shrink-0"
                  aria-label="Open attachment"
                  onClick={() => setIsViewerOpen(true)}
                >
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-sm border bg-black/5">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </button>
              )}

              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="break-words text-2xl font-semibold leading-tight">
                  {expense.description}
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-normal">
                  {formatAmount(expense.amount, expense.currency)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDisplayDate(expense.date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {participantRows.length} split
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {createdAtLabel ? <p>Added on {createdAtLabel}</p> : null}
                  {updatedAtLabel ? <p>Updated on {updatedAtLabel}</p> : null}
                </div>
              </div>
            </div>
            {attachmentError && (
              <p className="mt-2 text-xs text-destructive">{attachmentError}</p>
            )}
          </section>

          <section className="grid min-h-0 gap-3 md:grid-cols-[1fr_0.85fr]">
            <div className="min-h-0 rounded-lg border bg-card p-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  {payers.map((payer) => (
                    <div key={`payer-${payer.userId}`} className="flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2 text-sm">
                        <span className="truncate font-medium">
                          {formatSummaryName(payer.name)}{" "}
                          <span className="font-normal text-muted-foreground">Paid</span>
                        </span>
                      </div>
                      <span className="shrink-0 font-medium">
                        {formatAmount(payer.amount, expense.currency)}
                      </span>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {expense.splitType === "equal" ? "Split equally" :
                      expense.splitType === "percentage" ? "Split by percentage" : "Split unequally"}
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  {owedRows.length > 0 ? (
                    owedRows.map((participant) => (
                      <div
                        key={`owed-${participant.userId ?? participant.name}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                          <span className="truncate font-medium">
                            {participant.name}{" "}
                            <span className="font-normal text-muted-foreground">owed</span>
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-medium">
                          {formatAmount(participant.amount, expense.currency)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {isSettlementExpense ? "This settlement is already balanced." : "No one owes anything."}
                    </div>
                  )}
                </div>

                {netSettlements.length > 0 && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      {netSettlements.map((settlement) => (
                        <div
                          key={`${settlement.fromId}-${settlement.toId}-${settlement.amount}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate">
                              {formatSummaryName(settlement.fromName)} owes {formatSummaryName(settlement.toName)}
                            </span>
                          </div>
                          <span className="shrink-0 text-sm font-medium">
                            {formatAmount(settlement.amount, expense.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={cn("min-h-0 rounded-lg border bg-card p-3", isMobile && "hidden md:block")}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Attachment
                </div>
                {attachment && (
                  <button
                    type="button"
                    className="rounded-full bg-transparent p-1 text-muted-foreground transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hover:bg-muted"
                    onClick={() => setIsAttachmentDeleteConfirmOpen(true)}
                    aria-label="Remove attachment"
                    disabled={isUpdatingAttachment}
                  >
                    {isUpdatingAttachment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              {attachment ? (
                <button
                  type="button"
                  className="block h-full min-h-[9rem] w-full text-left"
                  onClick={() => setIsViewerOpen(true)}
                >
                  <div className="flex h-full min-h-[9rem] flex-col items-center justify-center overflow-hidden rounded-md border bg-black/5">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-full max-h-[32dvh] w-full object-contain"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    {isImageAttachment ? (
                      <ImageIcon className="h-3.5 w-3.5" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                    <span>{formatAttachmentSize(attachment.size) || "Tap to open"}</span>
                  </div>
                </button>
              ) : (
                <div className="flex h-full min-h-[9rem] flex-col items-center justify-center rounded-md border border-dashed text-center text-sm text-muted-foreground">
                  <ImageIcon className="mb-2 h-7 w-7" />
                  <p>No image attached</p>
                  <Button asChild variant="link" size="sm" className="mt-1">
                    <Link href={`/group/${groupId}/edit-expense/${expenseId}`}>
                      Add one
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </section>

        </main>

        <ExpenseAttachmentViewer
          attachment={attachment}
          open={isViewerOpen && Boolean(attachment)}
          onOpenChange={setIsViewerOpen}
          actions={
            <>
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                aria-label="Edit attachment"
                className={viewerActionButtonClass}
                disabled={isUpdatingAttachment}
              >
                {isUpdatingAttachment ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Pencil className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsAttachmentDeleteConfirmOpen(true)}
                aria-label="Delete attachment"
                className={viewerActionButtonClass}
                disabled={isUpdatingAttachment}
              >
                {isUpdatingAttachment ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </button>
            </>
          }
        />
        <AlertDialog
          open={isAttachmentDeleteConfirmOpen}
          onOpenChange={setIsAttachmentDeleteConfirmOpen}
        >
          <AlertDialogContent className="max-w-[290px] rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg">Delete image?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                This will remove the attached image from this expense.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 flex-row gap-2">
              <AlertDialogCancel className="mt-0 flex-1 rounded-xl border-none bg-muted hover:bg-muted/80">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveAttachment}
                disabled={isUpdatingAttachment}
                className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90"
              >
                {isUpdatingAttachment ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={isExpenseDeleteConfirmOpen}
          onOpenChange={setIsExpenseDeleteConfirmOpen}
        >
          <AlertDialogContent className="max-w-[290px] rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg">Delete expense?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                This expense and its attached image will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 flex-row gap-2">
              <AlertDialogCancel className="mt-0 flex-1 rounded-xl border-none bg-muted hover:bg-muted/80">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteExpense}
                disabled={isDeletingExpense}
                className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeletingExpense ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Spinner
          show={isUpdatingAttachment}
          message={
            attachmentOperation === "deleting"
              ? "Deleting image..."
              : "Uploading attachment..."
          }
          className="z-[70]"
        />
      </div>
    </div>
  );
}
