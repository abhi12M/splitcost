import { useState, useEffect, useRef } from "react"
import { ArrowLeft, CalendarIcon, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import {
  detectCategoryFromDescription,
  ExpenseFormInterface,
  ExpenseParticipantsRequest,
  ExpenseRequest,
} from "@/lib/storage"
import { ExpenseSchema } from "@/lib/validations/expense.schema"
import { CategoryKey, EXPENSE_CATEGORIES, SubcategoryId } from "../icons/CategoryIcons"
import { formatDateForDB } from "../ui/formatters"
import { SingleSelect } from "../ui/single-select"
import { CURRENCIES } from "@/constants"
import Link from "next/link"
import { Calendar } from "../ui/calendar"
import SplitScreen, { SplitResult } from "./SplitScreen"
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset"
import { toast } from "@/hooks/use-toast"
import { ToastAction } from "../ui/toast"

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
  const [category, setCategory] = useState<CategoryKey>(initialData?.category || "uncategorized");
  const [subcategory, setSubcategory] = useState<SubcategoryId>(initialData?.subcategory || "general");
  const [splitType, setSplitType] = useState<any>(initialData?.splitType || "equal");
  const [showSplit, setShowSplit] = useState(false)
  const [splitScreenData, setSplitScreenData] = useState<SplitResult | null>(null);
  const [date, setDate] = useState<Date>(
    initialData?.date ? new Date(initialData.date) : new Date()
  );
  const { keyboardOffset } = useKeyboardLayout();

  const [participants, setParticipants] = useState<ExpenseParticipantsRequest[]>(
    initialData?.participants ||
    members.map((m) => ({ userId: m.id, percent: null, amount: null }))
  );

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const isFirstRender = useRef(true);


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
      }
    }
  }, [description]);

  const handleSubcategorySelect = (cat: any, subId: SubcategoryId) => {
    setCategory(cat);
    setSubcategory(subId);
  };

  useEffect(() => {
    if (hasSubmitted) validate();
  }, [description, paidByUserId, amount]);

  useEffect(() => {
    setSplitScreenData(null);
  }, [amount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);

    if (!validate()) {
      const errorMessages = Object.values(errors).filter(Boolean);

      toast({
        title: "Validation Error",
        description: (
          <div className="space-y-1">
            {errorMessages.map((msg, idx) => (
              <div key={idx}>• {msg}</div>
            ))}
          </div>
        ),
        position: "center",
        hideClose: true,
        duration: Infinity,
        action: <ToastAction altText="OK">OK</ToastAction>,
      });
      return;
    };

    let finalParticipants = participants;
    let finalSplitType = splitType;

    if (!splitScreenData) {
      const totalAmount = Number(amount || 0);
      const base = Math.floor((totalAmount / members.length) * 100) / 100;
      const remainder = +(totalAmount - base * members.length).toFixed(2);

      finalParticipants = members.map((m, index) => ({
        userId: m.id,
        percent: null,
        amount: Number((base + (index === members.length - 1 ? remainder : 0)).toFixed(2)),
      }));

      finalSplitType = "equal";

      setParticipants(finalParticipants);
      setSplitType(finalSplitType);
    }

    onSubmit({
      description,
      amount: parseFloat(amount),
      currency,
      paidByUserId,
      participants: finalParticipants,
      splitType: finalSplitType,
      category,
      subcategory,
      date: formatDateForDB(date),
    });
  };

  const [errors, setErrors] = useState<{
    paidByUserId?: string;
    description?: string;
    amount?: string;
  }>({});

  const validate = () => {
    const result = ExpenseSchema.safeParse({ description, paidByUserId, amount, participants, category });

    if (!result.success) {
      const e = result.error.format();
      setErrors({
        description: e.description?._errors[0] || "",
        paidByUserId: e.paidByUserId?._errors[0] || "",
        amount: e.amount?._errors[0] || "",
      });
      console.log(e, errors)

      return false;
    }

    setErrors({ description: "", paidByUserId: "", amount: "" });
    return true;
  };
  const handleSplitSubmit = (data) => {
    setParticipants(data.participants);
    setSplitType(data.splitType);
    setShowSplit(false);
    setSplitScreenData(data);
  };

  return (
    <>
      {/* Main Screen */}
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-background z-50 flex items-center justify-between px-4 h-14 border-b touch-none overscroll-none">
        <Link href={`/group/${groupId}`}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-medium">
          {initialData ? "Edit expense" : "Add expense"}
        </span>
        <Check className="w-5 h-5 text-primary" onClick={handleSubmit} />
      </div>

      {/* Main Content */}
      <div className="fixed left-0 right-0 bg-background overflow-y-auto overscroll-contain"
        style={{
          top: 56,
          bottom: 56 + keyboardOffset, // footer + keyboard
          WebkitOverflowScrolling: "touch",
        }}
      >
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
                inputPlaceholder="Search or select category"
                fullscreenOnMobile
              />

              <Input
                value={description}
                placeholder="Description"
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
                inputPlaceholder="Search or select currency..."
                fullscreenOnMobile
                isDisplayId
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
              ariaInvalid={!!errors.paidByUserId}
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

      {/* Footer */}
      <div className="fixed left-0 right-0 bg-background border-t h-14 px-4 flex items-center justify-between z-50 touch-none overscroll-none"
        style={{ bottom: keyboardOffset }}
      >

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

      {showSplit &&
        <SplitScreen
          onClose={() => setShowSplit(false)}
          amount={Number(amount)}
          currency={currency}
          members={members}
          initialParticipants={participants}
          splitType={splitType}
          onConfirm={(data) => {
            handleSplitSubmit(data)
          }}
        />
      }
    </>
  )
}
