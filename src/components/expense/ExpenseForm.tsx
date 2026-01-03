import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Percent, Equal, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { EXPENSE_CATEGORIES, type CategoryKey, type SubcategoryId, GeneralIcon } from "@/components/icons/CategoryIcons";
import { cn } from "@/lib/utils";
import { detectCategoryFromDescription, type SplitType, type ExpenseSplit } from "@/lib/storage";
import { Users } from "lucide-react";
import { ExpenseSchema } from "@/lib/validations/expense.schema";
import { formatAmount } from "../ui/formatters";
import { InfoTooltip } from "../ui/info-tooltip";
import { Textarea } from "../ui/textarea";
import { SingleSelect } from "../ui/single-select";
// Assuming you have these UI primitives or similar standard HTML
const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "INR", symbol: "₹" },
];

interface ExpenseFormProps {
  members: string[];
  defaultCurrency?: string;
  initialData?: {
    description: string;
    amount: number;
    currency: string;
    paidBy: string;
    participants: string[];
    splits: ExpenseSplit[];
    splitType: SplitType;
    category: CategoryKey;
    subcategory: SubcategoryId;
  };
  onSubmit: (data: {
    description: string;
    amount: number;
    currency: string;
    paidBy: string;
    participants: string[];
    splits: ExpenseSplit[];
    splitType: SplitType;
    category: CategoryKey;
    subcategory: SubcategoryId;
  }) => void;
  submitLabel: string;
}
export function ExpenseForm({
  members,
  defaultCurrency = "USD",
  initialData,
  onSubmit,
  submitLabel,
}: ExpenseFormProps) {
  const [description, setDescription] = useState(initialData?.description || "");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [currency, setCurrency] = useState(initialData?.currency || defaultCurrency);
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || "");
  const [participants, setParticipants] = useState<string[]>(initialData?.participants || [...members]);
  const [category, setCategory] = useState<CategoryKey | "">(initialData?.category || "");
  const [subcategory, setSubcategory] = useState<SubcategoryId>(initialData?.subcategory || "");
  const [splitType, setSplitType] = useState<any>(initialData?.splitType || "equal");
  const [splits, setSplits] = useState<ExpenseSplit[]>(
    initialData?.splits || members.map((m) => ({ member: m, value: null, amount: 0 }))
  );
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const totalAmount = parseFloat(amount) || 0;
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const isFirstRender = useRef(true);
  const validationState = useMemo(() => {
    if (splitType === "equal") return { isValid: true, diff: 0, currentTotal: totalAmount };

    const currentTotal = splits.reduce((acc, curr) =>
      acc + (splitType === "percentage" ? (curr.value || 0) : (curr.amount || 0)), 0
    );

    const target = splitType === "percentage" ? 100 : totalAmount;
    const diff = target - currentTotal;

    return {
      isValid: Math.abs(diff) < 0.01,
      diff,
      currentTotal,
      percentageOfTotal: splitType === "percentage" ? currentTotal : (currentTotal / totalAmount) * 100
    };
  }, [splits, splitType, totalAmount]);

  const calculateSplits = (
    splitType: SplitType,
    participants: string[],
    splits: ExpenseSplit[],
    totalAmount: number
  ): ExpenseSplit[] => {
    if (!participants.length) return [];

    const splitMap = new Map(splits.map(s => [s.member, s]));

    if (splitType === "equal") {
      const base = Math.floor((totalAmount / participants.length) * 100) / 100;
      const remainder = +(totalAmount - base * participants.length).toFixed(2);

      return participants.map((member, index) => ({
        member,
        value: "",
        amount: +(base + (index === participants.length - 1 ? remainder : 0)).toFixed(2),
      }));
    }

    if (splitType === "percentage") {
      return participants.map((member) => {
        const existing = splitMap.get(member);
        const value = existing?.value ?? "";

        return {
          member,
          value,
          amount:
            value === ""
              ? ""
              : +((totalAmount * Number(value)) / 100).toFixed(2),
        };
      });
    }

    // custom
    return participants.map((member) => {
      const existing = splitMap.get(member);

      return {
        member,
        value: "",
        amount: existing?.amount ?? "",
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
    console.log(cat, subId)
    setCategory(cat);
    setSubcategory(subId);
    setCategoryPopoverOpen(false);
  };

  // Update splits when participants change
  useEffect(() => {
    const total = parseFloat(amount) || 0;

    setSplits((prev) =>
      calculateSplits(
        splitType,
        participants,
        prev.filter((s) => participants.includes(s.member)),
        total
      )
    );
  }, [amount, splitType, participants]);

  const toggleParticipant = (member: string) => {
    setParticipants((prev) =>
      prev.includes(member) ? prev.filter((p) => p !== member) : [...prev, member]
    );
  };

  const selectAllParticipants = () => {
    setParticipants([...members]);
  };

  const updateSplitValue = (member: string, value: number | "") => {
    setSplits((prev) => {
      const updated = prev.map((s) =>
        s.member === member
          ? splitType === "percentage"
            ? { ...s, value }
            : { ...s, amount: value }
          : s
      );

      const total = Number(amount) || 0;

      return calculateSplits(
        splitType,
        participants,
        updated,
        total
      );
    });
  };

  useEffect(() => {
    console.log("FINAL SPLITS →", splits);
  }, [splits]);

  useEffect(() => {
    if (hasSubmitted) validate();
  }, [description, paidBy, amount, participants]);

  // First, filter the splits
  const validSplits = splits.filter(
    (s) =>
      participants.includes(s.member) &&
      parseFloat(s.amount?.toString() || "0") > 0
  );

  // Then, filter participants to only those with a valid split
  const validParticipants = participants.filter((p) =>
    validSplits.some((s) => s.member === p)
  );
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    const isValid = validate();
    if (!isValid) return; // STOP submit
    onSubmit({
      description,
      amount: parseFloat(amount),
      currency,
      paidBy,
      participants: validParticipants,
      splits: validSplits,
      splitType,
      category: category || "uncategorized",
      subcategory: subcategory || "general",
    });
  };
  const [errors, setErrors] = useState<{
    paidBy?: string;
    description?: string;
    amount?: string;
    participants?: string;
  }>({});

  const validate = () => {
    const result = ExpenseSchema.safeParse({ description, paidBy, amount, participants });
    if (!result.success) {
      const e = result.error.format();
      setErrors({
        description: e.description?._errors[0] || "",
        paidBy: e.paidBy?._errors[0] || "",
        amount: e.amount?._errors[0] || "",
        participants: e.participants?._errors[0] || "",
      });
      return false;
    }

    setErrors({ description: "", paidBy: "", amount: "" });
    return true;
  };

  const selectedCategory = category ? EXPENSE_CATEGORIES[category] : null;
  const SelectedIcon = selectedCategory
    ? selectedCategory.subcategories.find((s) => s.id === subcategory)?.icon ||
    selectedCategory.subcategories[0]?.icon ||
    GeneralIcon
    : GeneralIcon;

  const handleSplitTypeChange = (splitType: SplitType) => {
    setSplitType(splitType);
    selectAllParticipants();
  }

  const splitTypeData: { type: SplitType, label: string, icon: React.ElementType, info: string }[] = [
    { type: "equal", label: "Equally", icon: Equal, info: 'The amount is divided equally among all selected participants.' },
    { type: "percentage", label: "By %", icon: Percent, info: "Specify what percentage of the amount each participant should pay.\nValue must be between 1.00% and 99.00%" },
    { type: "custom", label: "Custom", icon: Calculator, info: `Specify exactly how much each selected participant owes.\nValue must be between ${formatAmount(Number(1), currency)} and ${amount ? formatAmount(Number(amount), currency) : 'the amount'}.` },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap w-full gap-4">
        {/* First column */}
        <div className="w-full sm:flex-1">
          <div className="flex gap-3 items-start">

            {/* 2. Description Text Area (Fluid Width) */}
            <div className="grow space-y-2">
              <Label htmlFor="description" required={true}>
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="What is this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={cn(
                  "min-h-[16rem] h-[16rem] resize-none"
                  // Matches height of Category Icon & Amount Input
                )}
              />
              {errors.description && (
                <p className="text-xs text-destructive ml-1">{errors.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Second column crr+amount then paidby*/}
        <div className="w-full sm:flex-1 flex flex-col gap-2 sm:flex-col">

          {/* 1. Category Trigger */}
          {/* Category Field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Category<span className="text-destructive">*</span>
            </label>

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
              onSelect={(groupId, itemId) => handleSubcategorySelect(groupId!, itemId)}
              placeholder="Choose category"
              headerTitle="Choose Category"
              headerSubtitle="Select what this expense is for"
            />


          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" required>
              Amount
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
                <Select value={currency} onValueChange={setCurrency}>
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
                type="number"
                step="0.01"
                placeholder="1.00"
                value={amount}
                minValue={1}
                maxValue={99999999}
                precision={2}
                onChange={(e) => setAmount(e.target.value)}
                showHelper={false}
                aria-invalid={!!errors.amount}
                currency={currency}
                unstyled
              />
            </div>

            {errors.amount && (
              <p className="text-xs text-destructive ml-1">{errors.amount}</p>
            )}
          </div>

          {/* Paid By */}
          <div className="space-y-2">
            <Label required={true}>Paid by</Label>
            <SingleSelect
              items={members.map((m) => ({
                id: m,
                label: m,
                icon: <UserAvatar name={m} size="sm" />, // left icon/avatar
              }))}
              value={{ itemId: paidBy }}
              onSelect={(_, itemId) => setPaidBy(itemId)}
              placeholder="Select member..."
              inputPlaceholder="Search members..."
            />
            {errors.paidBy && (
              <div className="text-xs text-destructive">{errors.paidBy}</div>
            )}
          </div>
        </div>
      </div>

      {/* Split Type Selector */}
      <div className="space-y-6">
        {/* 1. Split Type Segmented Control */}
        <div className="space-y-3">
          <Label>How should this be split?</Label>
          <div className="flex p-1 bg-muted/50 rounded-xl border border-border/50">
            {splitTypeData.map(({ type, label, icon: Icon, info }) => {
              const isActive = splitType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSplitTypeChange(type)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                      : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  {label}
                  <InfoTooltip>
                    {info}
                  </InfoTooltip>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Validation & Progress Bar (Only for Non-Equal modes) */}
        {splitType !== "equal" && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>Allocated</span>
              <span className={validationState.isValid ? "text-green-600" : "text-red-500"}>
                {validationState.diff === 0
                  ? "Balanced"
                  : `${Math.abs(validationState.diff).toFixed(2)}${splitType === 'percentage' ? '%' : ''} ${validationState.diff > 0 ? 'Left' : 'Over'}`}
              </span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500 ease-out rounded-full",
                  validationState.isValid ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${Math.min(validationState.percentageOfTotal, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* 3. Participants List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <Label required={true}>Participants</Label>
              <span className={cn(
                "text-xs font-normal px-2 py-0.5 rounded-full",
                participants.length === 0
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground bg-muted"
              )}>
                {participants.length === 0
                  ? "Select at least one"
                  : `${participants.length} selected`}
              </span>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => selectAllParticipants()}
              className="h-8 text-xs text-primary hover:text-primary/80 hover:bg-primary/5"
            >
              {participants.length !== members.length && "Select All"}
            </Button>
          </div>

          <div className="grid gap-2">
            {members.map((member) => {
              const isSelected = participants.includes(member);
              const split = splits.find((s) => s.member === member);

              return (
                <div
                  key={member}
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
                    onClick={() => toggleParticipant(member)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="relative">
                      <UserAvatar name={member} size="md" />
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center ring-2 ring-white">
                          <div className="w-full h-full bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
                        {member}
                      </span>
                      {/* Show calculated amount in Percentage Mode for better context */}
                      {isSelected && splitType === "percentage" && (
                        <span className="text-xs text-muted-foreground">
                          {formatAmount(split?.amount || 0, currency)}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Input Area */}
                  {isSelected && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                      {splitType === "equal" ? (
                        <span className="text-sm font-semibold tabular-nums text-foreground/80 px-3">
                          {formatAmount(split?.amount || 0, currency)}
                        </span>
                      ) : (
                        <div className="relative">
                          {/* We prevent propagation so clicking input doesn't toggle selection */}
                          <Input
                            type="number"
                            onClick={(e) => e.stopPropagation()}
                            step={splitType === "percentage" ? "0.1" : "0.01"}
                            minValue={1}
                            maxValue={splitType === "percentage" ? 99 : Number(amount || 0)}
                            precision={2}
                            placeholder="1.00"
                            showHelper={false}
                            postfix={splitType === "percentage" && '%'}
                            value={
                              splitType === "percentage"
                                ? split?.value ?? ""
                                : split?.amount ?? ""
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              updateSplitValue(
                                member,
                                v === "" ? "" : Number(v)
                              );
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

      {/* Submit */}
      <div className="pt-3 border-t border-border">
        <Button type="submit" size="lg" className="w-full">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
