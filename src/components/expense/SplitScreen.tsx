"use client";

import React, { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "../ui/UserAvatar";
import { Input } from "../ui/input";
import { ExpenseParticipantsRequest, SplitType, UserInterface } from "@/lib/storage";
import { formatAmount } from "../ui/formatters";
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset";
import { useSwipeable } from "react-swipeable";

export interface SplitResult {
    splitType: SplitType;
    participants: ExpenseParticipantsRequest[];
}
type BaseTabMember = {
    id: string;
    name: string;
};

interface SplitScreenProps {
    onClose: () => void;
    amount: number | null;
    currency: string;
    members: UserInterface[];
    initialParticipants?: ExpenseParticipantsRequest[] | null;
    splitType: SplitType;
    onConfirm: (data: SplitResult) => void;
}

interface SplitScreenVM {//viewmodel
    selectedTab: SplitType;
    header: {
        title: string;
    };
    tabs: SplitTabVM[];
}

type SplitTabVM = EqualTabVM | CustomTabVM | PercentageTabVM;

interface BaseTabVM {
    id: SplitType;
    label: string;
    mode: "select" | "input";
    members: BaseTabMember[];
}

export interface EqualTabVM extends BaseTabVM {
    id: "equal";
    mode: "select";
    members: (BaseTabMember & {
        calculatedAmount: number;
        isSelected: boolean;
    })[];
    input: {
        type: "checkbox";
    };
    footer: {
        selected: {
            totalValue: number;
            count: number;
        },
        message: {
            error: string;
            distribution: string;
            totalSelected: string;
            toggle: string;
        };
    };
}

export interface CustomTabVM extends BaseTabVM {
    id: "custom";
    mode: "input";
    members: (BaseTabMember & {
        value: number | null;
    })[];
    input: {
        type: "text";
        inputMode: "decimal";
        minValue: number;
        maxValue: number;
        precision: number;
        placeholder: string;
        showHelper: boolean;
        className: string;
    };
    footer: {
        selected: {
            totalValue: number;
            difference: number;
        },
    };
}

export interface PercentageTabVM extends BaseTabVM {
    id: "percentage";
    mode: "input";
    members: (BaseTabMember & {
        value: number | null;
        calculatedAmount: number | null;
    })[];
    input: {
        type: "text";
        inputMode: "decimal";
        minValue: number;
        maxValue: number;
        precision: number;
        placeholder: string;
        showHelper: boolean;
        className: string;
        postfix: "%";
    };
    footer: {
        selected: {
            totalValue: number;
            difference: number;
        },
    };
}

function round2(n: number) {
    return Math.round(n * 100) / 100;
}

export function buildSplitScreenVM(params: {
    splitType: SplitType;
    amount: number | null;
    members: UserInterface[];
    participants?: ExpenseParticipantsRequest[] | null;
}): SplitScreenVM {
    const { splitType, amount, members, participants } = params;
    const totalAmount = amount || 0;

    const participantMap = new Map(
        participants?.map((p) => [p.userId, p]) || []
    );

    // ---------------- Equal ----------------

    const selectedIds = new Set<string>();

    if (splitType === "equal" && participants?.length) {
        participants.forEach((p) => selectedIds.add(p.userId));
    } else {
        members.forEach((m) => selectedIds.add(m.id));
    }


    const equalSelectedCount = selectedIds.size || 1;

    const totalCents = Math.round(totalAmount * 100);
    const baseCents = Math.round(totalCents / equalSelectedCount);
    const remainderCents = baseCents * equalSelectedCount - totalCents;

    let selectedIndex = 0;

    const equalTab: EqualTabVM = {
        id: "equal",
        label: "Equal",
        mode: "select",
        input: { type: "checkbox" },
        members: members.map((m) => {
            const isSelected = selectedIds.has(m.id);
            let cents = 0;

            if (isSelected) {
                const isLastSelected = selectedIndex === equalSelectedCount - 1;
                cents = baseCents - (isLastSelected ? remainderCents : 0);
                selectedIndex++;
            }

            return {
                id: m.id,
                name: m.name,
                isSelected,
                calculatedAmount: cents / 100,
            };
        }),
        footer: {
            selected: {
                totalValue: baseCents / 100,
                count: equalSelectedCount
            },
            message: {
                error: "You must select at least one person to split with.",
                distribution: `per person ${remainderCents !== 0 ? '(approx)' : ''}`,
                totalSelected: "people",
                toggle: "All",
            },
        },
    };
    // ---------------- Custom ----------------

    const customMembers = members.map((m) => {
        const p = participantMap.get(m.id);
        return {
            id: m.id,
            name: m.name,
            value: splitType === "custom" ? p?.amount ?? null : null,
        };
    });

    const customTotal = customMembers.reduce((s, m) => s + (m.value || 0), 0);

    const customTab: CustomTabVM = {
        id: "custom",
        label: "Custom",
        mode: "input",
        members: customMembers,
        input: {
            type: "text",
            inputMode: "decimal",
            minValue: 1,
            maxValue: Math.max(totalAmount - 1, 0),
            precision: 2,
            placeholder: "1.00",
            showHelper: false,
            className: "w-28",
        },
        footer: {
            selected: {
                totalValue: customTotal,
                difference: Math.abs(totalAmount - customTotal)
            },
        },
    };

    // ---------------- Percentage ----------------

    const percentMembers = members.map((m) => {
        const p = participantMap.get(m.id);
        const value = splitType === "percentage" ? p?.percent ?? null : null;
        const calculatedAmount = value
            ? round2((totalAmount * value) / 100)
            : 0;

        return {
            id: m.id,
            name: m.name,
            value,
            calculatedAmount,
        };
    });

    const percentTotal = percentMembers.reduce((s, m) => s + (m.value || 0), 0);

    const percentTab: PercentageTabVM = {
        id: "percentage",
        label: "Percent",
        mode: "input",
        members: percentMembers,
        input: {
            type: "text",
            inputMode: "decimal",
            minValue: 1,
            maxValue: 99,
            precision: 2,
            placeholder: "1.00",
            showHelper: false,
            className: "w-[6rem]",
            postfix: "%",
        },
        footer: {
            selected: {
                totalValue: percentTotal,
                difference: Math.abs(100 - percentTotal)
            },
        },
    };

    return {
        selectedTab: splitType,
        header: {
            title: "Adjust Split",
        },
        tabs: [equalTab, customTab, percentTab],
    };
}

export default function SplitScreen(props: SplitScreenProps) {
    const { onClose, amount, currency, members, initialParticipants, splitType, onConfirm } = props;
    const { keyboardOffset } = useKeyboardLayout();
    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => {
            setVM((prev) => ({
                ...prev,
                selectedTab: getNextTab(prev.selectedTab, "left"),
            }));
        },
        onSwipedRight: () => {
            setVM((prev) => ({
                ...prev,
                selectedTab: getNextTab(prev.selectedTab, "right"),
            }));
        },
        preventScrollOnSwipe: true,
        trackTouch: true,
        delta: 40,
        onTouchStartOrOnMouseDown: (e) => {
            const el = e.event.target as HTMLElement;
            if (el.tagName === "INPUT" || el.closest("input")) {
                return false;
            }
        },

    });
    const TAB_ORDER: SplitType[] = ["equal", "custom", "percentage"];

    function getNextTab(current: SplitType, dir: "left" | "right"): SplitType {
        const index = TAB_ORDER.indexOf(current);

        if (dir === "left") {
            return TAB_ORDER[Math.min(index + 1, TAB_ORDER.length - 1)];
        }
        return TAB_ORDER[Math.max(index - 1, 0)];
    }

    const [vm, setVM] = useState<SplitScreenVM>(() =>
        buildSplitScreenVM({
            splitType,
            amount,
            members,
            participants: initialParticipants,
        })
    );

    const activeTab = vm.tabs.find((t) => t.id === vm.selectedTab)!;

    function updateVM(updater: (prev: SplitScreenVM) => SplitScreenVM) {
        setVM((prev) => updater(prev));
    }

    function recalcEqualTab(
        prev: SplitScreenVM,
        updatedMembers: EqualTabVM["members"]
    ) {
        const tab = prev.tabs.find((t) => t.id === "equal") as EqualTabVM;

        const selectedMembers = updatedMembers.filter((m) => m.isSelected);
        const selectedCount = selectedMembers.length;

        const totalCents = Math.round((amount || 0) * 100);

        let baseCents = 0;
        let remainderCents = 0;

        if (selectedCount > 0) {
            baseCents = Math.round(totalCents / selectedCount);
            remainderCents = baseCents * selectedCount - totalCents;
        }

        let selectedIndex = 0;

        const recalculatedMembers = updatedMembers.map((m) => {
            if (!m.isSelected) return { ...m, calculatedAmount: 0 };

            const isLastSelected = selectedIndex === selectedCount - 1;
            const cents = baseCents - (isLastSelected ? remainderCents : 0);
            selectedIndex++;

            return { ...m, calculatedAmount: cents / 100 };
        });

        return prev.tabs.map((t) =>
            t.id === "equal"
                ? {
                    ...tab,
                    members: recalculatedMembers,
                    footer: {
                        ...tab.footer,
                        selected: {
                            totalValue: baseCents / 100,
                            count: selectedCount,
                        },
                        message: {
                            ...tab.footer.message,
                            distribution: `per person ${remainderCents !== 0 ? "(approx)" : ""
                                }`,
                        },
                    },
                }
                : t
        );
    }

    function toggleEqualMember(id: string) {
        updateVM((prev) => {
            const tab = prev.tabs.find((t) => t.id === "equal") as EqualTabVM;

            const updatedMembers = tab.members.map((m) =>
                m.id === id ? { ...m, isSelected: !m.isSelected } : m
            );

            return {
                ...prev,
                tabs: recalcEqualTab(prev, updatedMembers),
            };
        });
    }

    function toggleAllEqualMembers() {
        updateVM((prev) => {
            const tab = prev.tabs.find((t) => t.id === "equal") as EqualTabVM;

            const allSelected = tab.members.every((m) => m.isSelected);
            const nextValue = !allSelected;

            const updatedMembers = tab.members.map((m) => ({
                ...m,
                isSelected: nextValue,
            }));

            return {
                ...prev,
                tabs: recalcEqualTab(prev, updatedMembers),
            };
        });
    }

    function updateCustomValue(id: string, value: number | null) {
        updateVM((prev) => {
            const tab = prev.tabs.find((t) => t.id === "custom") as CustomTabVM;

            const members = tab.members.map((m) =>
                m.id === id ? { ...m, value } : m
            );

            const total = members.reduce((s, m) => s + (m.value || 0), 0);

            const newTabs = prev.tabs.map((t) =>
                t.id === "custom"
                    ? {
                        ...tab, members, footer: {
                            ...tab.footer,
                            selected: {
                                totalValue: total,
                                difference: Math.abs((amount || 0) - total)
                            }
                        }
                    }
                    : t
            );
            return { ...prev, tabs: newTabs };
        });
    }

    function updatePercentValue(id: string, value: number | null) {
        updateVM((prev) => {
            const tab = prev.tabs.find((t) => t.id === "percentage") as PercentageTabVM;

            const members = tab.members.map((m) => {
                if (m.id !== id) return m;
                return {
                    ...m,
                    value,
                    calculatedAmount: value
                        ? round2(((amount || 0) * value) / 100)
                        : 0,
                };
            });

            const total = members.reduce((s, m) => s + (m.value || 0), 0);

            const newTabs = prev.tabs.map((t) =>
                t.id === "percentage"
                    ? {
                        ...tab, members, footer: {
                            selected: {
                                totalValue: total,
                                difference: Math.abs(100 - total)
                            }
                        }
                    }
                    : t
            );

            return { ...prev, tabs: newTabs };
        });
    }

    function buildResult(): SplitResult {
        const tab = vm.tabs.find((t) => t.id === vm.selectedTab)!;

        if (tab.id === "equal") {
            return {
                splitType: "equal",
                participants: tab.members
                    .filter((m) => m.isSelected)
                    .map((m) => ({ userId: m.id, amount: m.calculatedAmount, percent: null })),
            };
        }

        if (tab.id === "custom") {
            return {
                splitType: "custom",
                participants: tab.members
                    .filter((m) => m.value)
                    .map((m) => ({ userId: m.id, amount: m.value, percent: null })),
            };
        }

        return {
            splitType: "percentage",
            participants: tab.members
                .filter((m) => m.value)
                .map((m) => ({ userId: m.id, amount: m.calculatedAmount, percent: m.value })),
        };
    }

    return (
        <div className="fixed inset-0 bg-background z-[60] flex flex-col">

            {/* Header */}
            <div className={"fixed top-0 left-0 right-0 bg-background z-[70] touch-none overscroll-none"}>
                <div className="flex items-center justify-between px-4 h-14 border-b">
                    <ArrowLeft onClick={onClose} className="w-5 h-5" />
                    <span className="font-medium">{vm.header.title}</span>
                    <Check onClick={() => onConfirm(buildResult())} className="w-5 h-5 text-primary" />
                </div>

                {/* Tabs */}
                <div className="border-b bg-background">
                    <div className="grid grid-cols-3">
                        {vm.tabs.map((t) => {
                            const active = vm.selectedTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setVM({ ...vm, selectedTab: t.id })}
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
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Scrollable area content participants */}
            <div
                id="split-scroll-container"
                {...swipeHandlers}
                className="fixed left-0 right-0 overflow-y-auto overscroll-contain p-3 space-y-2"
                style={{
                    top: 112,                 // header + tabs height
                    bottom: 56 + keyboardOffset,
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {activeTab.members.map((m: any) => {
                    const isSelected = activeTab.mode === "select" ? m.isSelected : !!m.value;

                    return (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <UserAvatar name={m.name} size="md" />

                                <div className="flex flex-col min-w-0">
                                    <span
                                        className={cn(
                                            "text-sm font-medium truncate block",
                                            isSelected ? "text-foreground" : "text-muted-foreground"
                                        )}
                                        title={m.name}
                                    >
                                        {m.name}
                                    </span>

                                    {vm.selectedTab === "percentage" && (
                                        <span className="text-xs text-muted-foreground">
                                            {formatAmount(m.calculatedAmount || 0, currency)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {activeTab.id === "equal" && (
                                    <input type="checkbox" checked={m.isSelected} onChange={() => toggleEqualMember(m.id)} className="w-4 h-4 accent-primary" />
                                )}

                                {activeTab.id === "custom" && (
                                    <>
                                        <Input
                                            type={activeTab.input.type}
                                            inputMode={activeTab.input.inputMode}
                                            onClick={(e) => e.stopPropagation()}
                                            minValue={activeTab.input.minValue}
                                            maxValue={activeTab.input.maxValue}
                                            precision={activeTab.input.precision}
                                            placeholder={activeTab.input.placeholder}
                                            showHelper={activeTab.input.showHelper}
                                            value={m.value ?? ''}
                                            onChange={(e) => {
                                                updateCustomValue(m.id, e.target.value ? +e.target.value : null)
                                            }}
                                            className={activeTab.input.className} />
                                        {/* <input type="number" className="w-28 border rounded px-2 py-1" value={m.value ?? ""} onChange={(e) => updateCustomValue(m.id, e.target.value ? +e.target.value : null)} /> */}
                                    </>
                                )}

                                {activeTab.id === "percentage" && (
                                    <Input
                                        type={activeTab.input.type}
                                        inputMode={activeTab.input.inputMode}
                                        onClick={(e) => e.stopPropagation()}
                                        minValue={activeTab.input.minValue}
                                        maxValue={activeTab.input.maxValue}
                                        precision={activeTab.input.precision}
                                        placeholder={activeTab.input.placeholder}
                                        showHelper={activeTab.input.showHelper}
                                        postfix={activeTab.input.postfix}
                                        value={m.value ?? ''}
                                        onChange={(e) => {
                                            updatePercentValue(m.id, e.target.value ? +e.target.value : null)
                                        }}
                                        className={activeTab.input.className} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div
                className={"fixed left-0 right-0 h-14 border-t bg-background z-[70] touch-none overscroll-none flex items-center justify-center text-sm"}
                style={{ bottom: keyboardOffset }}
            >
                {activeTab.id === "equal" && (() => {
                    const tab = activeTab as EqualTabVM;
                    const allSelected =
                        tab.members.length > 0 && tab.members.every((m) => m.isSelected);
                    return (
                        <div className="flex w-full items-center gap-2 justify-between px-4">
                            <div className="flex-1 text-sm text-center">
                                {tab.footer.selected.count === 0 ? (
                                    <span className="text-red-500 text-sm">{tab.footer.message?.error}</span>
                                ) : (
                                    <>
                                        {formatAmount(tab.footer.selected.totalValue, currency)} {tab.footer.message?.distribution}
                                        <div className="text-center">({tab.footer.selected.count} {tab.footer.message?.totalSelected})</div>
                                    </>
                                )}
                            </div>

                            {/* RIGHT */}
                            <div className="flex items-center gap-3 text-primary font-medium shrink-0">
                                <span>{tab.footer.message.toggle}</span>
                                <input
                                    type={tab.input.type}
                                    className="w-4 h-4 accent-primary"
                                    checked={allSelected}
                                    onChange={toggleAllEqualMembers}
                                />
                            </div>
                        </div>
                    );
                })()}

                {activeTab.id === "custom" && (() => {
                    const { totalValue, difference } = activeTab.footer.selected
                    const limit = amount || 0
                    const isOver = totalValue > limit

                    return (
                        <div className="text-sm text-center">
                            <div>
                                {formatAmount(totalValue, currency)} of {formatAmount(limit, currency)}
                            </div>
                            <div
                                className={cn(
                                    "font-medium",
                                    totalValue === limit && "text-primary",
                                    isOver && "text-red-500"
                                )}
                            >
                                {formatAmount(difference, currency)} {isOver ? "over" : "left"}
                            </div>
                        </div>
                    )
                })()}

                {activeTab.id === "percentage" && (() => {
                    const { totalValue, difference } = activeTab.footer.selected
                    const limit = 100
                    const isOver = totalValue > limit

                    return (
                        <div className="text-sm text-center">
                            <div>
                                {totalValue}% of {limit}%
                            </div>
                            <div
                                className={cn(
                                    "font-medium",
                                    totalValue === limit && "text-primary",
                                    isOver && "text-red-500"
                                )}
                            >
                                {difference}% {isOver ? "over" : "left"}
                            </div>
                        </div>
                    )
                })()}
            </div>
        </div>
    );
}
