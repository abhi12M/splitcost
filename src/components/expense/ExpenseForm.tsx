import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Percent, Equal, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { EXPENSE_CATEGORIES, type CategoryKey, type SubcategoryId, GeneralIcon } from "@/components/icons/CategoryIcons";
import { cn } from "@/lib/utils";
import { detectCategoryFromDescription, type SplitType, type ExpenseSplit } from "@/lib/storage";
import { TextInput } from "../ui/text-input";

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
  const [splitType, setSplitType] = useState<SplitType>(initialData?.splitType || "equal");
  const [splits, setSplits] = useState<ExpenseSplit[]>(
    initialData?.splits || members.map((m) => ({ member: m, value: null, amount: 0 }))
  );
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [manualCategorySelected, setManualCategorySelected] = useState(!!initialData?.category);

  const calculateSplits = (
    splitType: SplitType,
    participants: string[],
    splits: ExpenseSplit[],
    totalAmount: number
  ): ExpenseSplit[] => {
    if (!participants.length || !totalAmount) return [];

    if (splitType === "equal") {
      const base = Math.floor((totalAmount / participants.length) * 100) / 100;
      let remainder = +(totalAmount - base * participants.length).toFixed(2);

      return participants.map((member, index) => ({
        member,
        value: null,
        amount: +(base + (index === participants.length - 1 ? remainder : 0)).toFixed(2),
      }));
    }

    if (splitType === "percentage") {
      return splits.map((s) => ({
        member: s.member,
        value: s.value,
        amount: +((totalAmount * (s.value || 0)) / 100).toFixed(2),
      }));
    }

    // custom
    return splits.map((s) => ({
      member: s.member,
      value: null,
      amount: +(s.amount || 0),
    }));
  };

  // Auto-detect category from description (only if not manually selected)
  useEffect(() => {
    if (description && !manualCategorySelected) {
      const detected = detectCategoryFromDescription(description);
      if (detected) {
        setCategory(detected.category);
        setSubcategory(detected.subcategory);
      } else {
        setCategory("");
        setSubcategory("");
      }
    }
  }, [description, manualCategorySelected]);

  const handleSubcategorySelect = (cat: CategoryKey, subId: SubcategoryId) => {
    setCategory(cat);
    setSubcategory(subId);
    setManualCategorySelected(true);
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


  // Reset percentages to equal when switching to percentage mode
  // useEffect(() => {
  //   if (splitType === "percentage" && participants.length > 0) {
  //     const equalPercentage = Math.round((100 / participants.length) * 100) / 100;
  //     setSplits(participants.map((member) => ({ member, value: equalPercentage })));
  //   }
  // }, [splitType, participants.length]);

  const toggleParticipant = (member: string) => {
    setParticipants((prev) =>
      prev.includes(member) ? prev.filter((p) => p !== member) : [...prev, member]
    );
  };

  const selectAllParticipants = () => {
    setParticipants([...members]);
  };

  const updateSplitValue = (member: string, value: number) => {
    setSplits((prev) => {
      const updated = prev.map(s =>
        s.member === member
          ? splitType === "percentage"
            ? { ...s, value: value }   // update value for percentage
            : { ...s, amount: value }  // update amount for custom/equal
          : s
      );

      return calculateSplits(
        splitType,
        participants,
        updated,
        parseFloat(amount) || 0
      );
    });
  };

  useEffect(() => {
    console.log("FINAL SPLITS →", splits);
  }, [splits]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description && amount && paidBy && participants.length > 0) {
      onSubmit({
        description,
        amount: parseFloat(amount),
        currency,
        paidBy,
        participants,
        splits: splits.filter((s) => participants.includes(s.member)),
        splitType,
        category: category || "uncategorized",
        subcategory: subcategory || "general",
      });
    }
  };

  // Validate percentage total
  const percentageTotal = useMemo(() => {
    if (splitType !== "percentage") return 100;

    return splits
      .filter((s) => participants.includes(s.member))
      .reduce((sum, s) => sum + (s.value || 0), 0);
  }, [splits, participants, splitType]);

  const customTotal = useMemo(() => {
    if (splitType !== "custom") return parseFloat(amount) || 0;

    return splits
      .filter((s) => participants.includes(s.member))
      .reduce((sum, s) => sum + s.amount, 0);
  }, [splits, participants, splitType, amount]);

  const selectedCategory = category ? EXPENSE_CATEGORIES[category] : null;
  const SelectedIcon = selectedCategory
    ? selectedCategory.subcategories.find((s) => s.id === subcategory)?.icon ||
    selectedCategory.subcategories[0]?.icon ||
    GeneralIcon
    : GeneralIcon;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Row 1: Icon + Description */}
      <div className="flex gap-3 items-start">
        <div className="shrink-0">
          <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all",
                  category
                    ? "border-primary bg-primary-muted"
                    : "border-border hover:border-primary/50"
                )}
                style={
                  selectedCategory
                    ? { backgroundColor: `hsl(var(--${selectedCategory.color}) / 0.15)` }
                    : undefined
                }
              >
                <SelectedIcon
                  size={22}
                  style={selectedCategory ? { color: `hsl(var(--${selectedCategory.color}))` } : undefined}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3 max-h-80 overflow-y-auto" align="start">
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Select Category</p>
                {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => (
                  <div key={key} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{cat.label}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {cat.subcategories.map((sub) => {
                        const Icon = sub.icon;
                        const isSelected = category === key && subcategory === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSubcategorySelect(key as CategoryKey, sub.id)}
                            className={cn(
                              "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                              isSelected ? "border-primary bg-primary-muted" : "border-border hover:border-primary/50"
                            )}
                            title={sub.label}
                          >
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center"
                              style={{ backgroundColor: `hsl(var(--${cat.color}) / 0.15)` }}
                            >
                              <Icon size={16} style={{ color: `hsl(var(--${cat.color}))` }} />
                            </div>
                            <span className="text-[9px] font-medium text-muted-foreground truncate w-full text-center">
                              {sub.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {/* <div className="flex-1 space-y-2">
          <Label htmlFor="description">Description*</Label>

          <Input
            id="description"
            placeholder="What was this expense for?"
            value={description}
            maxLength={255}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
            required
          />

          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Max 255 characters
            </span>

            <span
              className={
                description.length === 255
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }
            >
              {description.length}/255
            </span>
          </div>
        </div> */}
        <TextInput
          id="description"
          label="Description"
          placeholder="What was this expense for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={150}
          autoFocus
          required
        />
      </div>

      {/* Row 2: Currency + Amount */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="amount">Amount*</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            maxLength={10}
            placeholder="0.00"
            value={amount}
            required
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      {/* Paid By */}
      <div className="space-y-2">
        <Label>Paid by</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {members.map((member) => (
            <button
              key={member}
              type="button"
              onClick={() => setPaidBy(member)}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all",
                paidBy === member
                  ? "border-primary bg-primary-muted"
                  : "border-border hover:border-primary/50"
              )}
            >
              <UserAvatar name={member} size="sm" />
              <span className="text-sm font-medium text-foreground truncate">{member}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Split Type Selector */}
      <div className="space-y-2">
        <Label>Split type</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { type: "equal" as SplitType, label: "Equally", icon: Equal },
            { type: "percentage" as SplitType, label: "By %", icon: Percent },
            { type: "custom" as SplitType, label: "Custom", icon: Calculator },
          ].map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => setSplitType(type)}
              className={cn(
                "flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all",
                splitType === type
                  ? "border-primary bg-primary-muted"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Participants with split values */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            Split between
            {splitType === "percentage" && (
              <span
                className={cn(
                  "ml-2 text-xs",
                  Math.abs(percentageTotal - 100) < 0.01
                    ? "text-success"
                    : "text-destructive"
                )}
              >
                ({percentageTotal.toFixed(1)}%)
              </span>
            )}
            {splitType === "custom" && (
              <span
                className={cn(
                  "ml-2 text-xs",
                  Math.abs(customTotal - (parseFloat(amount) || 0)) < 0.01
                    ? "text-success"
                    : "text-destructive"
                )}
              >
                ({customTotal.toFixed(2)} / {parseFloat(amount) || 0})
              </span>
            )}
          </Label>
          <Button type="button" variant="ghost" size="sm" onClick={selectAllParticipants} className="text-xs">
            Select all
          </Button>
        </div>
        <div className="space-y-2">
          {members.map((member) => {
            const isSelected = participants.includes(member);
            const split = splits.find((s) => s.member === member);
            return (
              <div
                key={member}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all",
                  isSelected ? "border-primary bg-primary-muted" : "border-border"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleParticipant(member)}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <div className="relative">
                    <UserAvatar name={member} size="sm" />
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{member}</span>
                </button>

                {isSelected && splitType !== "equal" && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step={splitType === "percentage" ? "0.1" : "0.01"}
                      min="0"
                      max={splitType === "percentage" ? "100" : undefined}
                      value={splitType === "percentage" ? split?.value || 0 : split?.amount || 0}
                      onChange={(e) => updateSplitValue(member, parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 text-sm text-right"
                    />
                    <span className="text-sm text-muted-foreground w-4">
                      {splitType === "percentage" ? "%" : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {participants.length === 0 && (
          <p className="text-sm text-destructive">Select at least one participant</p>
        )}
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
