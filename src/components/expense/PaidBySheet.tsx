"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "../ui/UserAvatar";
import { Input } from "../ui/input";
import { formatAmount } from "../ui/formatters";
import { createPortal } from "react-dom";
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "../ui/toast";
import { InfoSheetButton } from "../ui/InfoSheetButton";
import { getPaidByInfoContent } from "./expenseInfo";

export interface PayerEntry {
  userId: string;
  amount: number | null;
}

interface PaidBySheetProps {
  open: boolean;
  onClose: () => void;
  members: { id: string; name: string }[];
  currency: string;
  expenseAmount: number;
  paidByUserId: string;
  isMultiplePayers: boolean;
  payers: PayerEntry[];
  onSelectSingle: (userId: string) => void;
  onConfirmMultiple: (payers: PayerEntry[]) => void;
}

type TabMode = "single" | "multiple";

export default function PaidBySheet({
  open,
  onClose,
  members,
  currency,
  expenseAmount,
  paidByUserId,
  isMultiplePayers,
  payers: initialPayers,
  onSelectSingle,
  onConfirmMultiple,
}: PaidBySheetProps) {
  const [activeTab, setActiveTab] = useState<TabMode>(
    isMultiplePayers ? "multiple" : "single"
  );
  const [localPayers, setLocalPayers] = useState<PayerEntry[]>(
    isMultiplePayers && initialPayers.length
      ? initialPayers
      : members.map((m) => ({ userId: m.id, amount: null }))
  );

  // Re-sync state when sheet opens
  useEffect(() => {
    if (open) {
      setActiveTab(isMultiplePayers ? "multiple" : "single");
      if (isMultiplePayers && initialPayers.length) {
        // Merge saved payers with full member list (in case some had no amount)
        const payerMap = new Map(initialPayers.map((p) => [p.userId, p]));
        setLocalPayers(
          members.map((m) => payerMap.get(m.id) || { userId: m.id, amount: null })
        );
      } else {
        setLocalPayers(members.map((m) => ({ userId: m.id, amount: null })));
      }
    }
  }, [open]);

  const { keyboardOffset } = useKeyboardLayout();

  const payersTotal = localPayers.reduce(
    (s, p) => s + Number(p.amount || 0),
    0
  );
  const difference = expenseAmount - payersTotal;
  const isOver = payersTotal > expenseAmount;
  const isExact = payersTotal === expenseAmount && expenseAmount > 0;

  const updatePayerAmount = (userId: string, value: number | null) => {
    setLocalPayers((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, amount: value } : p))
    );
  };

  if (!open) return null;

  const tabs: { id: TabMode; label: string }[] = [
    { id: "single", label: "Single" },
    { id: "multiple", label: "Multiple" },
  ];
  const paidByInfo = getPaidByInfoContent(activeTab);

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-background flex flex-col !mt-0 sm:bg-black/30 sm:backdrop-blur-[2px] sm:block">
      <button
        type="button"
        aria-label="Close paid by dialog"
        onClick={onClose}
        className="hidden sm:block absolute inset-0"
      />
      <div className="flex h-full flex-col bg-background sm:relative sm:z-10 sm:mx-auto sm:my-10 sm:h-auto sm:max-h-[calc(100vh-5rem)] sm:w-full sm:max-w-xl sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl">
      {/* -------- Header -------- */}
      <div className="shrink-0 border-b bg-background">
        {/* Top bar */}
        <div className="h-[3rem] px-4 flex items-center justify-between sm:h-14 sm:px-5">
          <button type="button" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm">Paid by</span>
            <InfoSheetButton
              title={paidByInfo.title}
              description={paidByInfo.description}
            />
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2">
            {activeTab === "multiple" ? (
              <button
                type="button"
                onClick={() => {
                  const validPayers = localPayers.filter((p) => p.amount && p.amount > 0);
                  const total = validPayers.reduce((s, p) => s + Number(p.amount || 0), 0);
                  const diff = expenseAmount - total;

                  if (diff !== 0) {
                    const totalFormatted = formatAmount(expenseAmount, currency);
                    const diffFormatted = formatAmount(Math.abs(diff), currency);
                    let errMsg: string;

                    if (diff > 0) {
                      errMsg = `The paid amounts don't add up to ${totalFormatted}. You're ${diffFormatted} short.`;
                    } else {
                      errMsg = `The paid amounts don't add up to ${totalFormatted}. You're ${diffFormatted} over.`;
                    }

                    toast({
                      title: "Whoops!",
                      description: errMsg,
                      position: "center",
                      hideClose: true,
                      duration: Infinity,
                      action: <ToastAction altText="OK">OK</ToastAction>,
                    });
                    return;
                  }

                  if (validPayers.length === 0) {
                    toast({
                      title: "Whoops!",
                      description: "Please enter an amount for at least one person.",
                      position: "center",
                      hideClose: true,
                      duration: Infinity,
                      action: <ToastAction altText="OK">OK</ToastAction>,
                    });
                    return;
                  }

                  onConfirmMultiple(validPayers);
                  onClose();
                }}
              >
                <Check className="w-5 h-5 text-primary" />
              </button>
            ) : (
              <div className="w-5" />
            )}
          </div>
        </div>

        {/* Segmented toggle */}
        <div className="px-4 pb-3 sm:px-5 sm:pb-4">
          <div className="flex bg-muted rounded-lg p-1 gap-1 sm:max-w-sm sm:mx-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "multiple" && !isMultiplePayers) {
                    setLocalPayers(
                      members.map((m) => ({ userId: m.id, amount: null }))
                    );
                  }
                }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/70"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* -------- Single tab: member list -------- */}
      {activeTab === "single" && (
        <div className="flex-1 overflow-y-auto sm:max-h-[24rem]">
          {members.map((m) => {
            const isSelected = !isMultiplePayers && paidByUserId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  onSelectSingle(m.id);
                  onClose();
                }}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 transition-colors",
                  isSelected
                    ? "bg-primary/10"
                    : "hover:bg-muted active:bg-muted"
                )}
              >
                <UserAvatar name={m.name} size="md" />
                <span className="text-sm font-medium flex-1 text-left truncate">
                  {m.name}
                </span>
                {isSelected && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* -------- Multiple tab: amount inputs -------- */}
      {activeTab === "multiple" && (
        <>
          <div
            className="flex-1 overflow-y-auto p-1"
            style={{
              paddingBottom: 56 + keyboardOffset,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {localPayers.map((p, idx) => {
              const member = members.find((m) => m.id === p.userId);
              if (!member) return null;
              return (
                <div
                  key={p.userId}
                  className={cn(
                    "flex items-center justify-between px-3 py-3 sm:px-5",
                    idx !== localPayers.length - 1 &&
                    "border-b border-border/40"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <UserAvatar name={member.name} size="md" />
                    <span
                      className={cn(
                        "text-sm font-medium truncate",
                        p.amount
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {member.name}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="1.00"
                      minValue={1}
                      maxValue={expenseAmount}
                      precision={2}
                      showHelper={false}
                      value={p.amount ?? ""}
                      onChange={(e) =>
                        updatePayerAmount(
                          p.userId,
                          e.target.value ? +e.target.value : null
                        )
                      }
                      currency={currency}
                      className="w-28"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer summary */}
          <div
            className="shrink-0 border-t h-14 flex items-center justify-center bg-background"
            style={{ marginBottom: keyboardOffset }}
          >
            <div className="text-sm text-center">
              <div className="text-muted-foreground">
                {formatAmount(payersTotal, currency)} of{" "}
                {formatAmount(expenseAmount, currency)}
              </div>
              <div
                className={cn(
                  "font-medium",
                  isExact && "text-primary",
                  isOver && "text-red-500"
                )}
              >
                {formatAmount(Math.abs(difference), currency)}{" "}
                {isOver ? "over" : "left"}
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>,
    document.body
  );
}
