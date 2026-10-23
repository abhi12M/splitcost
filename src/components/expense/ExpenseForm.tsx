"use client";

import { RichNotesEditable, RichNotesToolbar } from "@/components/expense/RichNotesEditor";
import { useRichTextEditor } from "@/hooks/useRichTextEditor";
import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { useTranslations } from "next-intl";
import { Check, Percent, Equal, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { EXPENSE_CATEGORIES, type CategoryKey, type SubcategoryId } from "@/components/icons/CategoryIcons";
import { buildCategorySelectGroups } from "@/lib/category-labels";
import { fieldErrorStyles, validationStyles } from "@/lib/brand-styles";
import { cn } from "@/lib/utils";
import { detectCategoryFromDescription, ExpenseFormInterface, ExpenseParticipantsRequest, ExpenseRequest, type SplitType, UserInterface } from "@/lib/storage";
import { memberNameForViewer } from "@/lib/groupExpenseLabels";
import { Users } from "lucide-react";
import { EXPENSE_DESCRIPTION_MAX } from "@/lib/validations/expense.schema";
import { cleanName } from "@/lib/validations/names";
import { createExpenseSchema } from "@/lib/validations/expense.schema.i18n";
import { formatAmount, formatDateForDB, getCurrencyDifference, getRoundedDifference } from "../ui/formatters";
import { Textarea } from "../ui/textarea";
import { SingleSelect } from "../ui/single-select";
import { CURRENCIES } from "@/constants";
import { InfoLabel } from "../ui/InfoLabel";
import PaidBySheet from "./PaidBySheet";
import { ExpenseAttachmentControl } from "./ExpenseAttachmentControl";
import type { ExpenseAttachment } from "@/lib/expenseAttachments";
import {
  EXPENSE_NOTES_TEXT_MAX,
  normalizeExpenseNotes,
  sanitizeExpenseNotes,
} from "@/lib/expenseNotes";
import { buildExpenseFormSnapshot, withSnapshotAttachment } from "@/lib/expenseFormDirty";

interface ExpenseFormProps {
  members: UserInterface[];
  defaultCurrency?: string;
  /** When adding (no initialData), pre-select paid-by if it matches a member id. */
  defaultPaidByUserId?: string;
  /** Optional "who are you?" id for `Name (You)` labels in paid-by and participants. */
  viewerMemberId?: string | null;
  initialData?: ExpenseFormInterface;
  initialAttachment?: ExpenseAttachment | null;
  onSubmit: (data: ExpenseRequest) => void;
  submitLabel: string;
}

export type ExpenseFormHandle = {
  /** Runs the form's normal validate-then-submit flow, as if the submit button were clicked. */
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

type EditablePayer = {
  userId: string;
  amount: number | null;
};

export const ExpenseForm = forwardRef<ExpenseFormHandle, ExpenseFormProps>(function ExpenseForm({
  members,
  defaultCurrency = "USD",
  defaultPaidByUserId,
  viewerMemberId,
  initialData,
  initialAttachment = null,
  onSubmit,
  submitLabel,
}, ref) {
  const t = useTranslations("expense");
  const tCategories = useTranslations("categories");
  const categoryGroups = useMemo(() => buildCategorySelectGroups(tCategories), [tCategories]);
  const tCommon = useTranslations("common");
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
        members.some((m) => m.id === defaultPaidByUserId)
          ? defaultPaidByUserId
          : "");

  const [description, setDescription] = useState(initialData?.description || "");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [currency, setCurrency] = useState(initialData?.currency || defaultCurrency);
  const [paidByUserId, setPaidBy] = useState(initialSinglePaidBy);
  const [category, setCategory] = useState<CategoryKey | "">(initialData?.category || "");
  const [subcategory, setSubcategory] = useState<SubcategoryId>(initialData?.subcategory || "");
  const [splitType, setSplitType] = useState<any>(initialData?.splitType || "equal");
  const [participants, setParticipants] = useState<ExpenseParticipantsRequest[]>(
    initialData?.participants ||
    members.map((m) => ({ userId: m.id, percent: null, amount: null }))
  );
  const [date, setDate] = useState<Date>(
    initialData?.date ? new Date(initialData.date) : new Date()
  );
  const [isMultiplePayers, setIsMultiplePayers] = useState(hasInitialMultiplePayers);
  const [payers, setPayers] = useState<EditablePayer[]>(initialPayers);
  const [showPaidBy, setShowPaidBy] = useState(false);
  const [attachment, setAttachment] = useState<ExpenseAttachment | null>(initialAttachment);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const notesEditor = useRichTextEditor({ value: notes, onChange: setNotes, maxLength: EXPENSE_NOTES_TEXT_MAX });
  const totalAmount = parseFloat(amount) || 0;
  const [hasSubmitted, setHasSubmitted] = useState(false);
  // Keep the initial category from the server intact. React Strict Mode runs
  // effects twice in development, so an "is first render" flag alone lets the
  // second run re-classify the initial description and overwrite it.
  const previousDescriptionRef = useRef(description);
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
  const validationState = useMemo(() => {
    if (splitType === "equal") return { isValid: true, diff: 0, currentTotal: totalAmount };

    const currentTotal = participants.reduce((acc, curr) =>
      acc + (
        splitType === "percentage"
          ? Number(curr.percent || 0)
          : Number(curr.amount || 0)
      ), 0
    );


    const target = splitType === "percentage" ? 100 : totalAmount;
    const diff =
      splitType === "percentage"
        ? getRoundedDifference(target, currentTotal)
        : getCurrencyDifference(target, currentTotal);

    return {
      isValid: Math.abs(diff) < 0.01,
      diff,
      currentTotal,
      percentageOfTotal: splitType === "percentage" ? currentTotal : (currentTotal / totalAmount) * 100
    };
  }, [participants, splitType, totalAmount]);

  const calculateParticipants = (
    splitType: SplitType,
    selectedUserIds: string[],
    currentParticipants: ExpenseParticipantsRequest[],
    totalAmount: number
  ): ExpenseParticipantsRequest[] => {
    if (!selectedUserIds.length) return [];

    const participantMap = new Map(currentParticipants.map(p => [p.userId, p]));

    // 1️⃣ Equal split
    if (splitType === "equal") {
      const base = Math.floor((totalAmount / selectedUserIds.length) * 100) / 100;
      const remainder = +(totalAmount - base * selectedUserIds.length).toFixed(2);

      return selectedUserIds.map((userId, index) => ({
        userId,
        percent: null,
        amount: Number((
          base + (index === selectedUserIds.length - 1 ? remainder : 0)
        ).toFixed(2)),
      }));
    }

    // 2️⃣ Percentage split
    if (splitType === "percentage") {
      return selectedUserIds.map((userId) => {
        const existing = participantMap.get(userId);
        const percent = existing?.percent ?? null;

        return {
          userId,
          percent,
          amount:
            percent === null
              ? null
              : Number(((totalAmount * Number(percent)) / 100).toFixed(2)),
        };
      });
    }

    // 3️⃣ Custom split
    return selectedUserIds.map((userId) => {
      const existing = participantMap.get(userId);

      return {
        userId,
        percent: null,
        amount: existing?.amount ?? null,
      };
    });
  };

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
      } else {
        setCategory("");
        setSubcategory("");
      }
    }
  }, [description]);

  const handleSubcategorySelect = (cat: any, subId: SubcategoryId) => {
    setCategory(cat);
    setSubcategory(subId);
  };

  const handleSelectSinglePayer = (userId: string) => {
    setIsMultiplePayers(false);
    setPaidBy(userId);
    setPayers([]);
  };

  const handleConfirmMultiplePayers = (
    confirmedPayers: EditablePayer[]
  ) => {
    setIsMultiplePayers(true);
    setPaidBy("");
    setPayers(confirmedPayers);
  };

  // Get selected participant user IDs
  const selectedUserIds = useMemo(() => participants.map(p => p.userId), [participants]);

  // Update participants when amount or splitType changes
  useEffect(() => {
    const total = parseFloat(amount) || 0;
    const currentIds = participants.map(p => p.userId);
    if (!currentIds.length) return;

    setParticipants((prev) =>
      calculateParticipants(
        splitType,
        currentIds,
        prev.filter((p) => currentIds.includes(p.userId)),
        total
      )
    );
  }, [amount, splitType]);

  // A member removed from the group in another session can no longer pay or
  // share this expense. Members who are added are left out of the split.
  useEffect(() => {
    const memberIds = new Set(members.map((m) => m.id));
    if (paidByUserId && !memberIds.has(paidByUserId)) setPaidBy("");
    if (payers.some((p) => !memberIds.has(p.userId))) {
      const keptPayers = payers.filter((p) => memberIds.has(p.userId));
      setPayers(keptPayers);
      if (!keptPayers.length) setIsMultiplePayers(false);
    }
    if (participants.some((p) => !memberIds.has(p.userId))) {
      const kept = participants.filter((p) => memberIds.has(p.userId));
      setParticipants(calculateParticipants(splitType, kept.map((p) => p.userId), kept, parseFloat(amount) || 0));
    }
  }, [members]);

  const toggleParticipant = (userId: string) => {
    setParticipants((prev) => {
      const isSelected = prev.some(p => p.userId === userId);
      if (isSelected) {
        // Remove participant
        const filtered = prev.filter(p => p.userId !== userId);
        // Recalculate for remaining participants
        const total = parseFloat(amount) || 0;
        return calculateParticipants(splitType, filtered.map(p => p.userId), filtered, total);
      } else {
        // Add participant
        const newParticipant: ExpenseParticipantsRequest = { userId, amount: null, percent: null };
        const updated = [...prev, newParticipant];
        // Recalculate for all participants
        const total = parseFloat(amount) || 0;
        return calculateParticipants(splitType, updated.map(p => p.userId), updated, total);
      }
    });
  };

  const selectAllParticipants = () => {
    const total = parseFloat(amount) || 0;
    const allUserIds = members.map(m => m.id);
    setParticipants(calculateParticipants(splitType, allUserIds, [], total));
  };

  const updateParticipantValue = (userId: string, value: number | null) => {
    setParticipants((prev) => {
      const updated = prev.map((p) =>
        p.userId === userId
          ? splitType === "percentage"
            ? { ...p, percent: value, amount: value === null ? null : Number((((parseFloat(amount) || 0) * Number(value)) / 100).toFixed(2)) }
            : { ...p, amount: value, percent: null }
          : p
      );

      return calculateParticipants(
        splitType,
        selectedUserIds,
        updated,
        Number(amount) || 0
      );
    });
  };


  useEffect(() => {
    if (hasSubmitted) validate();
  }, [description, paidByUserId, amount, selectedUserIds, category, isMultiplePayers, payers]);

  // Filter participants to only those with valid amounts
  const validParticipants = participants.filter(
    (p) => Number(p.amount || 0) > 0
  );

  const submitForm = () => {
    setHasSubmitted(true);
    const isValid = validate();
    if (!isValid) return; // STOP submit
    if ((splitType == 'custom' || splitType == 'percentage') && !validationState.isValid) return;
    onSubmit({
      description: cleanName(description),
      amount: parseFloat(amount),
      currency,
      paidByUserId: isMultiplePayers ? null : paidByUserId,
      payers: isMultiplePayers
        ? payers
          .filter((payer) => payer.amount && payer.amount > 0)
          .map((payer) => ({ userId: payer.userId, amount: payer.amount! }))
        : undefined,
      participants: validParticipants,
      splitType,
      category: category || "uncategorized",
      subcategory: subcategory || "general",
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
    paidByUserId?: string;
    description?: string;
    amount?: string;
    participants?: string;
    category?: string
  }>({});

  const validate = () => {
    const result = ExpenseSchema.safeParse({
      description,
      paidByUserId,
      amount,
      participants: selectedUserIds,
      category,
      isMultiplePayers,
    });
    if (!result.success) {
      const e = result.error.format();
      setErrors({
        description: e.description?._errors[0] || "",
        paidByUserId: e.paidByUserId?._errors[0] || "",
        amount: e.amount?._errors[0] || "",
      });
      return false;
    }

    setErrors({ description: "", paidByUserId: "", amount: "", participants: "", category: "" });
    return true;
  };

  const handleSplitTypeChange = (splitType: SplitType) => {
    setSplitType(splitType);
    // Reset participants and select all
    const total = parseFloat(amount) || 0;
    const allUserIds = members.map(m => m.id);
    setParticipants(calculateParticipants(splitType, allUserIds, [], total));
  }

  const splitTypeData: { type: SplitType, label: string, icon: React.ElementType, info: string }[] = [
    { type: "equal", label: t("splitEqually"), icon: Equal, info: t("splitEqualInfo") },
    { type: "percentage", label: t("splitByPercent"), icon: Percent, info: t("splitPercentInfo") },
    {
      type: "custom",
      label: t("splitCustom"),
      icon: Calculator,
      info: t("splitCustomInfo", {
        min: formatAmount(Number(1), currency),
        max: amount ? formatAmount(Number(amount) - 1, currency) : t("theAmount"),
      }),
    },
  ];
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-12 w-full gap-4">
        {/* First column */}
        <div className="col-span-12 sm:col-span-6">
          <div className="flex gap-3 items-start">

            {/* 2. Description Text Area (Fluid Width) */}
            <div className="grow space-y-2">
              <Label htmlFor="description" required={true}>
                {t("description")}
              </Label>
              <Textarea
                id="description"
                placeholder={t("descriptionPlaceholder")}
                value={description}
                maxLength={EXPENSE_DESCRIPTION_MAX}
                onChange={(e) => setDescription(e.target.value)}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-xs text-destructive ml-1">{errors.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Second column crr+amount then paidby*/}
        <div className="col-span-12 sm:col-span-6">

          {/* 1. Category Trigger */}
          {/* Category Field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("category")}<span className="text-destructive">*</span>
            </label>

            <SingleSelect
              groups={categoryGroups}
              value={{ groupId: category, itemId: subcategory }}
              onSelect={(groupId, itemId) => handleSubcategorySelect(groupId!, itemId)}
              placeholder={t("chooseCategory")}
              ariaInvalid={!!errors.category}
            />
            {errors.category && (
              <p className="text-xs text-destructive ml-1">{errors.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" required>
              {t("amount")}
            </Label>

            {/* Currency + Amount Group */}
            <div
              className={cn(
                "flex items-stretch w-full h-14 rounded-xl overflow-hidden",
                "border border-input bg-background",
                "focus-within:ring-2 focus-within:ring-ring",
                errors.amount && "border-destructive focus-within:ring-destructive"
              )}
            >
              {/* Currency */}
              <div className="border-border/50">
                <Select value={currency} onValueChange={setCurrency} disabled>
                  <SelectTrigger className="h-full w-[88px] rounded-none focus:ring-0 focus:outline-none border-r-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
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
                unstyled
              />
            </div>

            {errors.amount && (
              <p className="text-xs text-destructive ml-1">{errors.amount}</p>
            )}
          </div>

          {/* Paid By */}
          <div className="space-y-2">
            <Label required={true}>{t("paidBy")}</Label>
            <button
              type="button"
              onClick={() => setShowPaidBy(true)}
              aria-invalid={!!errors.paidByUserId}
              className={cn(
                "flex h-11 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-left",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "aria-[invalid=true]:border-destructive"
              )}
            >
              {isMultiplePayers
                ? `${payers.filter((payer) => payer.amount && payer.amount > 0).length} ${tCommon("people")}`
                : paidByUserId
                  ? (() => {
                      const m = members.find((mem) => mem.id === paidByUserId);
                      if (!m) return tCommon("selectMember");
                      if (viewerMemberId && m.id === viewerMemberId) return youLabel;
                      return m.name;
                    })()
                  : tCommon("selectMember")}
            </button>
            {errors.paidByUserId && (
              <div className="text-xs text-destructive">{errors.paidByUserId}</div>
            )}
          </div>
        </div>
      </div>

      {/* Split Type Selector */}
      <div className="space-y-6">
        {/* 1. Split Type Segmented Control */}
        <div className="space-y-3">
          <Label required={true}>{t("howToSplit")}</Label>

          <div className="flex w-full p-1 bg-muted/50 rounded-xl border border-border/50">
            {splitTypeData.map(({ type, label, icon: Icon, info }) => {
              const isActive = splitType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSplitTypeChange(type)}
                  className={cn(
                    "flex-1 flex items-center justify-center rounded-lg transition-all duration-200 px-1 py-2 sm:px-3 sm:py-2.5",
                    "gap-1 sm:gap-3",
                    isActive
                      ? "bg-card text-primary shadow-sm ring-1 ring-border/60"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {/* Icon scales down on mobile (w-3.5) */}
                  <Icon className={cn("shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground", "w-3.5 h-3.5 sm:w-4 sm:h-4")} />
                  <InfoLabel
                    label={label}
                    info={info}
                    className="text-[10px] xs:text-xs sm:text-sm font-medium whitespace-nowrap leading-none"
                  />

                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Validation & Progress Bar (Only for Non-Equal modes) */}
        {splitType !== "equal" && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>{t("allocated")}</span>
              <span
                className={
                  validationState.isValid ? validationStyles.validText : validationStyles.invalidText
                }
              >
                {validationState.diff === 0
                  ? t("balanced")
                  : `${Math.abs(validationState.diff).toFixed(2)}${splitType === 'percentage' ? '%' : ''} ${validationState.diff > 0 ? t("left") : t("over")}`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border/60">
              <div
                className={cn(
                  "h-full transition-all duration-500 ease-out rounded-full",
                  validationState.isValid ? validationStyles.validBg : "bg-primary"
                )}
                style={{
                  width: `${Math.max(0, Math.min(validationState.percentageOfTotal ?? 0, 100))}%`
                }}
              />
            </div>
          </div>
        )}

        {/* 3. Participants List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">

            {/* Left Side: Icon + Label + Badge */}
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />

              <Label required={true} className="text-xs sm:text-sm truncate shrink-0">
                {t("participants")}
              </Label>

              <span className={cn(
                "text-[10px] sm:text-xs font-normal px-1.5 py-0.5 rounded-full whitespace-nowrap transition-colors",
                selectedUserIds.length === 0
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground bg-muted"
              )}>
                {selectedUserIds.length === 0 ? (
                  <>
                    <span className="sm:hidden">{tCommon("required")}</span>
                    <span className="hidden sm:inline">{tCommon("selectAtLeastOne")}</span>
                  </>
                ) : (
                  tCommon("selectedCount", { count: selectedUserIds.length })
                )}
              </span>
            </div>

            {selectedUserIds.length !== members.length && (<Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => selectAllParticipants()}
              className={cn(
                "h-7 sm:h-8 text-[10px] sm:text-xs px-2 shrink-0",
                "text-primary hover:text-primary/80 hover:bg-primary/5"
              )}
            >
              {tCommon("selectAll")}
            </Button>
            )}
          </div>

          <div className="grid gap-2 max-h-[290px] overflow-y-auto">
            {members.map((member) => {
              const isSelected = selectedUserIds.includes(member.id);
              const participant = participants.find((p) => p.userId === member.id);
              const memberLabel = memberNameForViewer(
                member.id,
                member.name,
                viewerMemberId,
                youLabel
              );

              return (
                <div
                  key={member.id}
                  className={cn(
                    "group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                    isSelected
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : "border-transparent bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  {/* Clickable Area for Selection */}
                  <button
                    type="button"
                    onClick={() => toggleParticipant(member.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="relative">
                      <UserAvatar name={member.name} overlayName={memberLabel} />
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-card rounded-full flex items-center justify-center ring-2 ring-background">
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-success">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
                        {memberLabel}
                      </span>
                      {/* Show calculated amount in Percentage Mode for better context */}
                      {isSelected && splitType === "percentage" && (
                        <span className="text-xs text-muted-foreground">
                          {formatAmount(Number(participant?.amount || 0), currency)}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Input Area */}
                  {isSelected && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                      {splitType === "equal" ? (
                        <span className="text-sm font-semibold tabular-nums text-foreground/80 px-3">
                          {formatAmount(Number(participant?.amount || 0), currency)}
                        </span>

                      ) : (
                        <div className="relative">
                          {/* We prevent propagation so clicking input doesn't toggle selection */}
                          <Input
                            type="text"
                            inputMode="decimal"
                            onClick={(e) => e.stopPropagation()}
                            minValue={1}
                            maxValue={splitType === "percentage" ? 99 : (Number(amount) - 1 || 0)}
                            precision={2}
                            placeholder="1.00"
                            showHelper={false}
                            postfix={splitType === "percentage" ? "%" : undefined}
                            formatOnBlur={splitType === "custom" ? "currency" : undefined}
                            value={splitType === "percentage" ? participant?.percent ?? "" : participant?.amount ?? ""}
                            onChange={(e) => {
                              updateParticipantValue(member.id, e.target.value ? Number(e.target.value) : null);
                            }}
                            className={cn(
                              splitType === "percentage" ? "w-[6rem]" : "w-28"
                            )}
                          />

                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ExpenseAttachmentControl
        attachment={attachment}
        onChange={setAttachment}
      />

      <div className="space-y-2">
        <Label htmlFor="expense-notes">{t("notesLabel")}</Label>
        <div className="overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
          <RichNotesToolbar editor={notesEditor} size="sm" className="border-b border-input px-1.5 py-1" />
          <div className="px-3 py-2 text-sm">
            <RichNotesEditable
              editor={notesEditor}
              id="expense-notes"
              label={t("notesLabel")}
              placeholder={t("notesPlaceholder")}
              className="min-h-24"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-3 border-t border-border">
        <Button type="submit" size="lg" className="w-full">
          {submitLabel}
        </Button>
      </div>

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
    </form>
  );
});
