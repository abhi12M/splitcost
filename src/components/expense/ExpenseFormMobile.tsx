import { useState, useMemo, useEffect, useRef } from "react"
import { ArrowLeft, Calculator, CalendarIcon, Check, Equal, Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/ui/UserAvatar"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import {
  detectCategoryFromDescription,
  ExpenseFormInterface,
  ExpenseParticipantsRequest,
  ExpenseRequest,
  SplitType
} from "@/lib/storage"
import { ExpenseSchema } from "@/lib/validations/expense.schema"
import { CategoryKey, EXPENSE_CATEGORIES, SubcategoryId } from "../icons/CategoryIcons"
import { formatAmount, formatDateForDB } from "../ui/formatters"
import { SingleSelect } from "../ui/single-select"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@radix-ui/react-select"
import { CURRENCIES } from "@/constants"
import Link from "next/link"
import { Calendar } from "../ui/calendar"

interface Props {
  members: any[]
  defaultCurrency?: string
  initialData?: ExpenseFormInterface,
  groupId?: string,
  onSubmit: (data: ExpenseRequest) => void
}

export default function ExpenseFormMobile({
  members,
  defaultCurrency = "USD",
  initialData,
  groupId,
  onSubmit
}: Props) {
  /* ---------------- state ---------------- */
  const [description, setDescription] = useState(initialData?.description || "");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [currency, setCurrency] = useState(initialData?.currency || defaultCurrency);
  const [paidByUserId, setPaidBy] = useState(initialData?.paidByUserId || "");
  const [category, setCategory] = useState<CategoryKey | "">(initialData?.category || "uncategorized");
  const [subcategory, setSubcategory] = useState<SubcategoryId>(initialData?.subcategory || "general");
  const [splitType, setSplitType] = useState<any>(initialData?.splitType || "equal");
  const [showSplit, setShowSplit] = useState(false)

  const [date, setDate] = useState<Date>(
    initialData?.date ? new Date(initialData.date) : new Date()
  );

  const [participants, setParticipants] = useState<ExpenseParticipantsRequest[]>(
    initialData?.participants ||
    members.map((m) => ({ userId: m.id, percent: null, amount: null }))
  );

  const totalPercent = useMemo(
    () =>
      participants.reduce((a, p) => a + Number(p.percent || 0), 0),
    [participants]
  )
  const totalAmount = parseFloat(amount) || 0;
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const isFirstRender = useRef(true);
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
    const diff = target - currentTotal;

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
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
  const clearAllParticipants = () => {
    setParticipants([]);
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
  }, [description, paidByUserId, amount, selectedUserIds, category]);

  // Filter participants to only those with valid amounts
  const validParticipants = participants.filter(
    (p) => Number(p.amount || 0) > 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    const isValid = validate();
    if (!isValid) return; // STOP submit
    if ((splitType == 'custom' || splitType == 'percentage') && validationState.diff !== 0) return;
    onSubmit({
      description,
      amount: parseFloat(amount),
      currency,
      paidByUserId,
      participants: validParticipants,
      splitType,
      category: category || "uncategorized",
      subcategory: subcategory || "general",
      date: formatDateForDB(date),
    });
  };
  const [errors, setErrors] = useState<{
    paidByUserId?: string;
    description?: string;
    amount?: string;
    participants?: string;
    category?: string
  }>({});

  const validate = () => {
    const result = ExpenseSchema.safeParse({ description, paidByUserId, amount, participants: selectedUserIds, category });
    if (!result.success) {
      const e = result.error.format();
      setErrors({
        description: e.description?._errors[0] || "",
        paidByUserId: e.paidByUserId?._errors[0] || "",
        amount: e.amount?._errors[0] || "",
        participants: e.participants?._errors[0] || "",
        category: e.category?._errors[0] || "",
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
    { type: "equal", label: "Equally", icon: Equal, info: 'The amount is divided equally among all selected participants.' },
    { type: "percentage", label: "By %", icon: Percent, info: "Specify what percentage of the amount each participant should pay.\nValue must be between 1.00% and 99.00%" },
    { type: "custom", label: "Custom", icon: Calculator, info: `Specify exactly how much each selected participant owes.\nValue must be between ${formatAmount(Number(1), currency)} and ${amount ? formatAmount(Number(amount) - 1, currency) : 'the amount'}.` },
  ];

  return (
    <>
      {/* Main Screen */}
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <Link href={`/group/${groupId}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-medium">
            {initialData ? "Edit expense" : "Add expense"}
          </span>
          <Check className="w-5 h-5" onClick={handleSubmit} />
        </div>

        <div className="p-4 space-y-5">
          <div className="flex flex-col gap-3 px-5">
            {/* Row 1 */}
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <SingleSelect
                groups={Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => ({
                  id: key,
                  label: cat.label,
                  color: cat.color,
                  subOptions: cat.subcategories.map((sub) => ({
                    id: sub.id,
                    label: sub.label,
                    icon: sub.icon,
                  })),
                }))}
                value={{ groupId: category, itemId: subcategory }}
                onSelect={(groupId, itemId) =>
                  handleSubcategorySelect(groupId!, itemId)
                }
                ariaInvalid={!!errors.category}
                inputPlaceholder="Search or select category"
                fullscreenOnMobile
              />

              <Input
                value={description}
                placeholder="Description"
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-none focus-visible:ring-1"
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
                inputPlaceholder="Search or select currency..."
                fullscreenOnMobile
              />

              <Input
                value={amount}
                inputMode="decimal"
                placeholder="Amount"
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-none focus-visible:ring-1"
              />
            </div>
          </div>


          <div className="flex justify-center gap-2 items-center">
            <span className="text-sm text-muted-foreground">Paid by</span>
            <SingleSelect
              items={members.map((m) => ({
                id: m?.id,
                label: m?.name,
                showAvatar: true // left icon/avatar
              }))}
              value={{ itemId: paidByUserId }}
              onSelect={(_, itemId) => setPaidBy(itemId)}
              placeholder="select member"
              inputPlaceholder="Search or select member"
              fullscreenOnMobile
            />
          </div>

          <button
            onClick={() => setShowSplit(true)}
            className="flex justify-center gap-2 items-center w-full"
          >
            <span className="text-sm text-muted-foreground">and split</span>
            <span className="px-3 py-2.5 text-sm border border-border border-b-2 rounded-[5px] font-medium">{splitType == 'equal' ? "equally" : "unequally"}</span>
          </button>
        </div>
      </div>

      {/* Split Screen */}
      {showSplit && (
        <div className="fixed inset-0 bg-background z-[60] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
            <ArrowLeft onClick={() => setShowSplit(false)} className="w-5 h-5" />
            <span className="font-medium">Adjust split</span>
            <Check onClick={() => setShowSplit(false)} className="w-5 h-5 text-primary" />
          </div>

          {/* Tabs */}
          <div className="border-b bg-background">
            <div className="grid grid-cols-3">
              {splitTypeData.map((t) => {
                const active = splitType === t.type
                return (
                  <button
                    key={t.type}
                    onClick={() => setSplitType(t.type)}
                    className={cn(
                      "relative py-3 text-center transition-colors",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <div className="text-sm font-medium">{t.label}</div>

                    {active && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Participants */}
          <div className="flex-1 overflow-y-auto space-y-2 p-3">

            {members.map((member) => {
              const participant = participants.find(p => p.userId === member.id)

              const isSelected =
                splitType === "equal"
                  ? selectedUserIds.includes(member.id)
                  : splitType === "percentage"
                    ? !!participant?.percent
                    : !!participant?.amount

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                >
                  {/* Left */}
                  <div className="flex items-center gap-3">
                    <UserAvatar name={member.name} />
                    <div className="flex flex-col">
                      <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
                        {member.name}
                      </span>
                      {/* Show calculated amount in Percentage Mode for better context */}
                      <span className="text-xs text-muted-foreground">
                        {formatAmount(Number(participant?.amount || 0), currency)}
                      </span>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-2">

                    {/* Equal → Checkbox */}
                    {splitType === "equal" && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleParticipant(member.id)}
                        className="w-4 h-4 accent-primary"
                      />
                    )}

                    {/* Unequal / Percentage → Input */}
                    {splitType !== "equal" && (
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
                        value={splitType === "percentage" ? participant?.percent ?? "" : participant?.amount ?? ""}
                        onChange={(e) => {
                          updateParticipantValue(member.id, e.target.value ? Number(e.target.value) : null);
                        }}
                        className={cn(
                          splitType === "percentage" ? "w-[6rem]" : "w-28"
                        )}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="h-14 border-t flex items-center justify-center text-sm bg-background px-2">

            {/* Equal footer */}
            {splitType === "equal" && (() => {
              const allSelected =
                selectedUserIds.length === members.length && members.length > 0

              return (
                <div className="flex w-full items-center gap-2 justify-between px-4">

                  {/* LEFT */}
                  <div className="flex-1 text-sm text-center">
                    <span>
                      {splitType === "equal" && selectedUserIds.length === 0 ? (
                        <span className="text-red-500 text-sm">
                          You must select at least one person to split with.
                        </span>
                      ) : (
                        <>
                          {formatAmount(Number(amount), currency)} per person
                          <div className="text-center">
                            ({selectedUserIds.length} people)
                          </div>
                        </>
                      )}
                    </span>
                  </div>

                  {/* RIGHT */}
                  <div className="flex items-center gap-3 text-primary font-medium shrink-0">
                    <span>All</span>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() =>
                        allSelected ? clearAllParticipants() : selectAllParticipants()
                      }
                      className="w-4 h-4 accent-primary"
                    />
                  </div>

                </div>

              )
            })()}


            {/* custom footer */}
            {splitType === "custom" && (
              <div className="text-sm text-center">

                <div>{formatAmount(validationState.currentTotal, currency)} of {formatAmount(totalAmount, currency)}</div>

                {!(validationState.currentTotal > totalAmount) ? (
                  <div className={`font-medium ${totalAmount - validationState.currentTotal === 0 ? "text-primary" : ""
                    }`}>
                    {(formatAmount(totalAmount - validationState.currentTotal, currency))} left
                  </div>
                ) : (
                  <div className="text-red-500 font-medium">
                    {formatAmount(validationState.currentTotal - 100, currency)} over
                  </div>
                )}

              </div>
            )}


            {splitType === "percentage" && (
              <div className="text-sm text-center">

                <div>{totalPercent}% of 100%</div>

                {!(totalPercent > 100) ? (
                  <div className={`font-medium ${100 - totalPercent === 0 ? "text-primary" : ""
                    }`}>
                    {(100 - totalPercent)}% left
                  </div>
                ) : (
                  <div className="text-red-500 font-medium">
                    {totalPercent - 100}% over
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t h-14 px-4 flex items-center justify-between z-50">

        {/* Date selector */}
        <Popover modal>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
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


      </div>
    </>
  )
}
