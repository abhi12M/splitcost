import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, CalendarIcon, Check, NotebookPen, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { SyncStatusButton } from "@/components/sync/SyncStatus"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import {
  detectCategoryFromDescription,
  ExpenseFormInterface,
  ExpenseParticipantsRequest,
  ExpenseRequest,
  UserInterface,
} from "@/lib/storage"
import { memberNameForViewer } from "@/lib/groupExpenseLabels"
import { EXPENSE_DESCRIPTION_MAX } from "@/lib/validations/expense.schema"
import { cleanName } from "@/lib/validations/names"
import { createExpenseSchema } from "@/lib/validations/expense.schema.i18n"
import { CategoryKey, EXPENSE_CATEGORIES, SubcategoryId } from "../icons/CategoryIcons"
import { buildCategorySelectGroups } from "@/lib/category-labels"
import { formatAmount, formatDateForDB, getCurrencyDifference } from "../ui/formatters"
import { SingleSelect } from "../ui/single-select"
import { CURRENCIES } from "@/constants"
import { Link } from "@/i18n/navigation"
import { Calendar } from "../ui/calendar"
import SplitScreen from "./SplitScreen"
import PaidBySheet from "./PaidBySheet"
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset"
import { useBackButtonClose } from "@/hooks/useBackButtonClose"
import { GenericAlertDialog } from "../ui/generic-alert-dialog"
import { AvatarGroup } from "../ui/UserAvatar"
import { fieldErrorStyles } from "@/lib/brand-styles"
import { cn } from "@/lib/utils"
import { ExpenseAttachmentControl } from "./ExpenseAttachmentControl"
import type { ExpenseAttachment } from "@/lib/expenseAttachments"
import { ExpenseNotesScreen } from "./ExpenseNotesScreen"
import { hasExpenseNotesContent, normalizeExpenseNotes } from "@/lib/expenseNotes"
import { buildExpenseFormSnapshot, withSnapshotAttachment } from "@/lib/expenseFormDirty"

interface Props {
  members: any[]
  defaultCurrency?: string
  /** When adding (no initialData), pre-select paid-by if it matches a member id. */
  defaultPaidByUserId?: string
  viewerMemberId?: string | null
  initialData?: ExpenseFormInterface,
  groupId?: string,
  initialAttachment?: ExpenseAttachment | null,
  onSubmit: (data: ExpenseRequest) => void
}

export type ExpenseFormMobileHandle = {
  /** Runs the form's normal validate-then-submit flow, as if the checkmark button were tapped. */
  submit: () => void;
  /** Compares current field values against the initial ones, so an edit that's since been undone reports false. */
  isDirty: () => boolean;
  /**
   * Brings in the receipt stored now, for one changed in another session while
   * this form is open. It applies, and returns true, only when the user hasn't
   * changed the receipt in this form themselves; otherwise their choice is kept
   * and it returns false. Either way the form doesn't start to look edited.
   */
  syncReceipt: (latest: ExpenseAttachment | null) => boolean;
};

const ExpenseFormMobile = forwardRef<ExpenseFormMobileHandle, Props>(function ExpenseFormMobile({
  members,
  defaultCurrency = "USD",
  defaultPaidByUserId,
  viewerMemberId,
  initialData,
  groupId,
  initialAttachment = null,
  onSubmit
}, ref) {
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const tCategories = useTranslations("categories");
  const categoryGroups = useMemo(() => buildCategorySelectGroups(tCategories), [tCategories]);
  const youLabel = useTranslations("group")("you");
  const ExpenseSchema = useMemo(
    () =>
      createExpenseSchema({
        descriptionRequired: t("validation.descriptionRequired"),
        descriptionMax: t("validation.descriptionMax", { max: EXPENSE_DESCRIPTION_MAX }),
        amountRequired: t("validation.amountRequired"),
        paidByRequired: t("validation.paidByRequired"),
      }),
    [t]
  );

  const initialPayers = initialData?.payers || [];
  const hasInitialMultiplePayers = initialPayers.length > 0;
  const initialSinglePaidBy =
    hasInitialMultiplePayers
      ? ""
      : initialData?.paidByUserId ||
        (defaultPaidByUserId &&
        members.some((m: { id: string }) => m.id === defaultPaidByUserId)
          ? defaultPaidByUserId
          : "");

  /* ---------------- state ---------------- */
  const [description, setDescription] = useState(initialData?.description || "");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [currency, setCurrency] = useState(initialData?.currency || defaultCurrency);
  const [paidByUserId, setPaidBy] = useState(initialSinglePaidBy);
  const [category, setCategory] = useState<CategoryKey>(initialData?.category || "uncategorized");
  const [subcategory, setSubcategory] = useState<SubcategoryId>(initialData?.subcategory || "general");
  const [splitType, setSplitType] = useState<any>(initialData?.splitType || "equal");
  const [showSplit, setShowSplit] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [attachment, setAttachment] = useState<ExpenseAttachment | null>(initialAttachment);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const hasNotes = hasExpenseNotesContent(notes);
  const [showNotes, setShowNotes] = useState(false);
  const [date, setDate] = useState<Date>(
    initialData?.date ? new Date(initialData.date) : new Date()
  );
  const { keyboardOffset } = useKeyboardLayout();

  const [participants, setParticipants] = useState<ExpenseParticipantsRequest[]>(
    initialData?.participants ||
    members.map((m) => ({ userId: m.id, percent: null, amount: null }))
  );

  const [isMultiplePayers, setIsMultiplePayers] = useState(hasInitialMultiplePayers);
  const [payers, setPayers] = useState<{ userId: string; amount: number | null }[]>(initialPayers);
  const [showPaidBy, setShowPaidBy] = useState(false);
  useBackButtonClose(showPaidBy, () => setShowPaidBy(false));
  useBackButtonClose(showSplit, () => setShowSplit(false));
  useBackButtonClose(showCalendar, () => setShowCalendar(false));

  // Captured once, from the same values the state above was seeded with, so
  // isDirty() can tell "edited" apart from "edited, then undone".
  const initialSnapshotRef = useRef<string>();
  // The receipt the form started from (or last synced to); the user has changed
  // the receipt in this form when the current one is no longer this object.
  const baselineAttachmentRef = useRef<ExpenseAttachment | null>(initialAttachment);
  if (initialSnapshotRef.current === undefined) {
    initialSnapshotRef.current = buildExpenseFormSnapshot({
      description,
      amount,
      currency,
      paidByUserId,
      category,
      subcategory,
      splitType,
      participants,
      date: formatDateForDB(date),
      isMultiplePayers,
      payers,
      attachment,
      notes,
    });
  }

  const handleSelectSinglePayer = (userId: string) => {
    setIsMultiplePayers(false);
    setPaidBy(userId);
    setPayers([]);
  };

  const handleConfirmMultiplePayers = (confirmedPayers: { userId: string; amount: number | null }[]) => {
    setIsMultiplePayers(true);
    setPaidBy("");
    setPayers(confirmedPayers);
  };

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [validationDialog, setValidationDialog] = useState<{ title: string; messages: string[] } | null>(null);
  // Preserve the category received with an existing expense. In development,
  // Strict Mode runs effects twice, so this guards both initial runs and only
  // auto-detects after the description actually changes.
  const previousDescriptionRef = useRef(description);


  // Auto-detect category from description
  useEffect(() => {
    if (description === previousDescriptionRef.current) {
      return;
    }

    previousDescriptionRef.current = description;
    if (description) {
      const detected = detectCategoryFromDescription(description);
      if (detected) {
        setCategory(detected.category);
        setSubcategory(detected.subcategory);
      }
    }
  }, [description]);

  const handleSubcategorySelect = (cat: any, subId: SubcategoryId) => {
    setCategory(cat);
    setSubcategory(subId);
  };

  useEffect(() => {
    if (hasSubmitted) validate();
  }, [description, paidByUserId, amount, isMultiplePayers, payers, participants, splitType]);

  useEffect(() => {
    calculateParticipants();
  }, [amount]);

  // A member removed from the group in another session can no longer pay or
  // share this expense. Members who are added are left out of the split.
  useEffect(() => {
    const memberIds = new Set(members.map((m: UserInterface) => m.id));
    if (paidByUserId && !memberIds.has(paidByUserId)) setPaidBy("");
    if (payers.some((p) => !memberIds.has(p.userId))) {
      const keptPayers = payers.filter((p) => memberIds.has(p.userId));
      setPayers(keptPayers);
      if (!keptPayers.length) setIsMultiplePayers(false);
    }
    if (participants.some((p) => !memberIds.has(p.userId))) {
      const kept = participants.filter((p) => memberIds.has(p.userId));
      setParticipants(kept);
      calculateParticipants(kept);
    }
  }, [members]);

  const submitForm = () => {
    setHasSubmitted(true);
    const validation = validate();
    if (!validation.valid) {
      showValidationDialog(validation.errors);
      return;
    };

    onSubmit({
      description: cleanName(description),
      amount: parseFloat(amount),
      currency,
      paidByUserId: isMultiplePayers ? null : paidByUserId,
      payers: isMultiplePayers
        ? payers.filter(p => p.amount && p.amount > 0).map(p => ({ userId: p.userId, amount: p.amount! }))
        : undefined,
      participants,
      splitType,
      category,
      subcategory,
      date: formatDateForDB(date),
      attachment,
      notes: normalizeExpenseNotes(notes) || null,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  const isDirty = () =>
    buildExpenseFormSnapshot({
      description,
      amount,
      currency,
      paidByUserId,
      category,
      subcategory,
      splitType,
      participants,
      date: formatDateForDB(date),
      isMultiplePayers,
      payers,
      attachment,
      notes,
    }) !== initialSnapshotRef.current;

  const syncReceipt = (latest: ExpenseAttachment | null) => {
    if (attachment !== baselineAttachmentRef.current) return false;
    baselineAttachmentRef.current = latest;
    initialSnapshotRef.current = withSnapshotAttachment(initialSnapshotRef.current!, latest);
    setAttachment(latest);
    return true;
  };

  useImperativeHandle(ref, () => ({ submit: submitForm, isDirty, syncReceipt }));

  const [errors, setErrors] = useState<{
    description?: string;
    amount?: string;
    paidByUserId?: string;
    payers?: string;
    split?: string;
  }>({});

  const showValidationDialog = (validationErrors: typeof errors) => {
    const errorMessages = Object.values(validationErrors).filter(Boolean);
    setValidationDialog({
      title: tCommon("cannotSaveExpense"),
      messages: errorMessages as string[],
    });
  };

  // Collects every error at once, so a missing payer doesn't hide a split
  // that no longer adds up (e.g. after a member is removed in another session).
  const validate = (from?: string) => {
    const result = ExpenseSchema.safeParse({ description, paidByUserId, amount, isMultiplePayers });
    const e = result.success ? null : result.error.format();
    const paidByError =
      !isMultiplePayers && !paidByUserId?.trim() ? t("validation.paidByRequired") : "";

    const newErrors = {
      description: e?.description?._errors?.[0] ?? "",
      amount: e?.amount?._errors?.[0] ?? "",
      paidByUserId: e?.paidByUserId?._errors?.[0] ?? paidByError,
      payers: "",
      split: "",
    };

    // Totals are only compared once the amount itself is valid.
    const expenseTotal = Number(amount || 0);
    if (!newErrors.amount) {
      if (isMultiplePayers) {
        const totalPaidBy = payers.reduce(
          (sum, payer) => sum + Number(payer.amount || 0),
          0
        );

        if (getCurrencyDifference(expenseTotal, totalPaidBy) !== 0) {
          newErrors.payers = t("paidByTotalMismatch", {
            paid: formatAmount(totalPaidBy, currency),
            total: formatAmount(expenseTotal, currency),
          });
        }
      }

      // ---------- Custom split validation ----------
      if (from !== "split-screen" && splitType === "custom") {
        const totalCustomValue = participants.reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0
        );

        if (getCurrencyDifference(expenseTotal, totalCustomValue) !== 0) {
          newErrors.split = t("splitTotalMismatch", {
            split: formatAmount(totalCustomValue, currency),
            total: formatAmount(expenseTotal, currency),
          });
        }
      }
    }

    const valid = !Object.values(newErrors).some(Boolean);
    if (!valid) setHasSubmitted(true);
    setErrors(newErrors);
    return { valid, errors: newErrors };
  };

  const handleSplitSubmit = (data) => {
    setParticipants(data.participants);
    setSplitType(data.splitType);
    setShowSplit(false);
  };

  const handleOpenSlitScreen = () => {
    const validation = validate("split-screen");
    if (!validation.valid) {
      showValidationDialog(validation.errors);
      return;
    };
    setShowSplit(true);
  };

  const calculateParticipants = (list: ExpenseParticipantsRequest[] = participants) => {
    const totalAmount = Number(amount || 0);
    if (splitType === "equal") {
      const count = list.length;

      const base = Math.round((totalAmount / count) * 100) / 100;

      const distributed = base * count;
      const remainder = Math.round((totalAmount - distributed) * 100) / 100;

      const finalParticipants = list.map((m, index) => ({
        userId: m.userId,
        percent: null,
        amount:
          index === count - 1
            ? Math.round((base + remainder) * 100) / 100
            : base,
      }));

      setParticipants(finalParticipants);
    }

    if (splitType === "percentage") {
      const finalParticipants = list.map((p) => ({
        ...p,
        amount: Number(((totalAmount * Number(p.percent)) / 100).toFixed(2)),
      }));
      setParticipants(finalParticipants);
    }

  };

  const participantMembers = participants
    .map((p) => members.find((m: UserInterface) => m.id === p.userId))
    .filter((m): m is UserInterface => Boolean(m));
  const participantNames = participantMembers.map((m) => m.name);
  const participantOverlayNames = participantMembers.map((m) =>
    memberNameForViewer(m.id, m.name, viewerMemberId, youLabel)
  );

  return (
    <>
      {/* Main Screen */}
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-background z-50 touch-none overscroll-none">
        {/* Top row */}
        <div className="flex items-center justify-between px-4 h-[2.7rem] border-b">
          <Link href={`/group/${groupId}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center">
            <span className="font-medium">
              {initialData ? t("editExpense") : t("addExpenseMobile")}
            </span>
            <SyncStatusButton className="h-6 w-6" />
          </div>

          <Check className="w-5 h-5 text-primary" onClick={handleSubmit} />
        </div>

        {/* Avatar row */}
        <div className="flex items-center gap-2 px-4 py-1 border-b">
          <span className="text-sm text-muted-foreground">{t("withLabel")}</span>
          <AvatarGroup
            names={participantNames}
            overlayNames={participantOverlayNames}
            isShowTotalMemberText={false}
            size="sm"
            max={8}
          />
          <Settings
            className={cn(
              "w-4 h-4 cursor-pointer transition-colors",
              errors.split
                ? fieldErrorStyles.textHover
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={handleOpenSlitScreen}
          />
        </div>
      </div>


      {/* Main Content */}
      <div className="fixed left-0 right-0 bg-background overflow-y-auto overscroll-contain"
        style={{
          top: 75,
          bottom: 75 + keyboardOffset, // footer + keyboard
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="p-4 space-y-5">
          <div className="flex flex-col gap-3 px-5">
            {/* Row 1 */}
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <SingleSelect
                groups={categoryGroups}
                value={{ groupId: category, itemId: subcategory }}
                onSelect={(groupId, itemId) =>
                  handleSubcategorySelect(groupId!, itemId)
                }
                inputPlaceholder={t("searchCategory")}
                fullscreenOnMobile
              />

              <Input
                value={description}
                placeholder={t("description")}
                maxLength={EXPENSE_DESCRIPTION_MAX}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-none focus-visible:ring-1"
                aria-invalid={!!errors.description}
              />
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <SingleSelect
                items={CURRENCIES.map((m) => ({
                  id: m?.code,
                  label: m?.name,
                  icon: m?.symbol,
                }))}
                value={{ itemId: currency }}
                onSelect={(_, itemId) => setCurrency(itemId)}
                inputPlaceholder={t("searchCurrency")}
                fullscreenOnMobile
                isDisplayId
                disabled
              />

              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="1.00"
                value={amount}
                minValue={1}
                maxValue={99999999.99}
                precision={2}
                onChange={(e) => setAmount(e.target.value)}
                showHelper={false}
                aria-invalid={!!errors.amount}
                currency={currency}
                formatOnBlur="number"
                className="rounded-none focus-visible:ring-1"
              />
            </div>
          </div>


          <div className="flex justify-center gap-2 items-center">
            <span className="text-sm text-muted-foreground">{t("paidBy")}</span>
            <button
              type="button"
              onClick={() => setShowPaidBy(true)}
              aria-invalid={!!(errors.paidByUserId || errors.payers)}
              className={cn(
                "px-3 py-2.5 text-sm border border-border border-b-2 rounded-[5px] font-medium",
                fieldErrorStyles.borderAria
              )}
            >
              {isMultiplePayers
                ? `${payers.filter(p => p.amount && p.amount > 0).length} ${tCommon("people")}`
                : paidByUserId
                  ? (() => {
                      const m = members.find((mem: UserInterface) => mem.id === paidByUserId);
                      if (!m) return tCommon("selectMemberShort");
                      if (viewerMemberId && m.id === viewerMemberId) return youLabel;
                      return m.name;
                    })()
                  : tCommon("selectMemberShort")}
            </button>
          </div>

          <button

            className="flex justify-center gap-2 items-center w-full"
          >
            <span className="text-sm text-muted-foreground">{t("andSplit")}</span>
            <span
              aria-invalid={!!errors.split}
              className={cn(
                "px-3 py-2.5 text-sm border border-border border-b-2 rounded-[5px] font-medium",
                errors.split && fieldErrorStyles.border
              )}
              onClick={() => handleOpenSlitScreen()}
            >
              {splitType == 'equal' ? t("equally") : t("unequally")}
            </span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed left-0 right-0 bg-background border-t min-h-[3.75rem] px-4 py-2 flex items-center justify-between gap-3 z-50 touch-none overscroll-none"
        style={{ bottom: keyboardOffset }}
      >

        {/* Date selector */}
        <Popover modal open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium"
              aria-pressed={showCalendar}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  showCalendar
                    ? "text-primary"
                    : "text-primary dark:text-primary/90"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
              </div>

              <span>
                {date.toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </button>
          </PopoverTrigger>

          <PopoverContent
            side="top"
            align="start"
            sideOffset={12}
            className="w-auto p-0 z-[9999]"
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                d && setDate(d)
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors sm:hover:text-foreground",
              hasNotes && "text-primary"
            )}
            aria-label={t("addNotes")}
            aria-pressed={hasNotes}
            title={t("addNotes")}
          >
            <NotebookPen className="h-5 w-5" />
          </button>
          <ExpenseAttachmentControl
            attachment={attachment}
            onChange={setAttachment}
            compact
          />
        </div>
      </div>

      <ExpenseNotesScreen
        open={showNotes}
        value={notes}
        onCancel={() => setShowNotes(false)}
        onConfirm={(value) => {
          setNotes(value);
          setShowNotes(false);
        }}
      />

      {showSplit &&
        <SplitScreen
          onClose={() => setShowSplit(false)}
          amount={Number(amount)}
          currency={currency}
          members={members}
          viewerMemberId={viewerMemberId}
          initialParticipants={participants}
          splitType={splitType}
          onConfirm={(data) => {
            handleSplitSubmit(data)
          }}
        />
      }

      <PaidBySheet
        open={showPaidBy}
        onClose={() => setShowPaidBy(false)}
        members={members}
        viewerMemberId={viewerMemberId}
        currency={currency}
        expenseAmount={Number(amount || 0)}
        paidByUserId={paidByUserId}
        isMultiplePayers={isMultiplePayers}
        payers={payers}
        onSelectSingle={handleSelectSinglePayer}
        onConfirmMultiple={handleConfirmMultiplePayers}
      />
      <GenericAlertDialog
        open={validationDialog !== null}
        onOpenChange={(open) => !open && setValidationDialog(null)}
        title={validationDialog?.title ?? tCommon("cannotSaveExpense")}
        messages={validationDialog?.messages ?? []}
        actions={[{ label: tCommon("gotIt"), onClick: () => setValidationDialog(null) }]}
      />
    </>
  )
});

export default ExpenseFormMobile;
