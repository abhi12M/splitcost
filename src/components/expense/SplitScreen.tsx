"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "../ui/UserAvatar";
import { Input } from "../ui/input";
import { ExpenseParticipantsRequest, SplitType, UserInterface } from "@/lib/storage";
import { formatAmount, getCurrencyDifference, getRoundedDifference } from "../ui/formatters";
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset";
import { useSwipeable } from "react-swipeable";
import { GenericAlertDialog } from "../ui/generic-alert-dialog";
import { InfoSheetButton } from "../ui/InfoSheetButton";
import { getSplitInfoText } from "./expenseInfo";
import { memberNameForViewer } from "@/lib/groupExpenseLabels";

export interface SplitResult {
    splitType: SplitType;
    participants: ExpenseParticipantsRequest[];
}


type SplitScreenLabels = {
    equalTab: string;
    customTab: string;
    percentTab: string;
    selectOne: string;
    people: string;
    all: string;
    adjustSplit: string;
    perPerson: string;
    perPersonApprox: string;
};
type BaseTabMember = {
    id: string;
    name: string;
};

interface SplitScreenProps {
    onClose: () => void;
    amount: number;
    currency: string;
    members: UserInterface[];
    viewerMemberId?: string | null;
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
    labels: SplitScreenLabels;
}): SplitScreenVM {
    const { splitType, amount, members, participants, labels } = params;
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
        label: labels.equalTab,
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
                error: labels.selectOne,
                distribution: remainderCents !== 0 ? labels.perPersonApprox : labels.perPerson,
                totalSelected: labels.people,
                toggle: labels.all,
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
        label: labels.customTab,
        mode: "input",
        members: customMembers,
        input: {
            type: "text",
            inputMode: "decimal",
            minValue: 1,
            maxValue: totalAmount,
            precision: 2,
            placeholder: "1.00",
            showHelper: false,
            className: "w-28",
        },
        footer: {
            selected: {
                totalValue: customTotal,
                difference: getCurrencyDifference(totalAmount, customTotal)
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
        label: labels.percentTab,
        mode: "input",
        members: percentMembers,
        input: {
            type: "text",
            inputMode: "decimal",
            minValue: 1,
            maxValue: 100,
            precision: 2,
            placeholder: "1.00",
            showHelper: false,
            className: "w-[6rem]",
            postfix: "%",
        },
        footer: {
            selected: {
                totalValue: percentTotal,
                difference: getRoundedDifference(100, percentTotal)
            },
        },
    };

    return {
        selectedTab: splitType,
        header: {
            title: labels.adjustSplit,
        },
        tabs: [equalTab, customTab, percentTab],
    };
}

export default function SplitScreen(props: SplitScreenProps) {
    const { onClose, amount, currency, members, viewerMemberId, initialParticipants, splitType, onConfirm } = props;
    const t = useTranslations("expense");
    const tCommon = useTranslations("common");
    const [validationMessage, setValidationMessage] = useState<string | null>(null);
    const youLabel = useTranslations("group")("you");
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
        onSwipedDown: ({ initial, deltaY }) => {
            if (initial[1] <= 140 && deltaY > 70) {
                onClose();
            }
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

    const splitLabels: SplitScreenLabels = {
        equalTab: t("splitEqualTab"),
        customTab: t("splitCustomTab"),
        percentTab: t("splitPercentTab"),
        selectOne: t("selectOneToSplit"),
        people: tCommon("people"),
        all: t("all"),
        adjustSplit: t("adjustSplit"),
        perPerson: t("perPerson"),
        perPersonApprox: t("perPersonApprox"),
    };

    const [vm, setVM] = useState<SplitScreenVM>(() =>
        buildSplitScreenVM({
            splitType,
            amount,
            members,
            participants: initialParticipants,
            labels: splitLabels,
        })
    );

    const activeTab = vm.tabs.find((tab) => tab.id === vm.selectedTab)!;
    const headerTitle =
        vm.selectedTab === "equal"
            ? t("splitEqualTitle")
            : vm.selectedTab === "custom"
              ? t("splitCustomTitle")
              : t("splitPercentTitle");

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
                            distribution:
                                remainderCents !== 0 ? splitLabels.perPersonApprox : splitLabels.perPerson,
                        },
                    },
                }
                : t
        );
    }

    // Keep the open screen in step with members changed in another session:
    // removed members drop out, renamed ones show their new name, and added
    // ones appear unselected. Values already entered for others are kept.
    const syncedMembersRef = useRef(members);
    useEffect(() => {
        if (syncedMembersRef.current === members) return;
        syncedMembersRef.current = members;

        updateVM((prev) => {
            const sync = <T extends BaseTabMember>(list: T[], blank: (m: UserInterface) => T): T[] => {
                const byId = new Map(list.map((m) => [m.id, m]));
                return members.map((m) => {
                    const existing = byId.get(m.id);
                    return existing ? { ...existing, name: m.name } : blank(m);
                });
            };

            const equalTab = prev.tabs.find((t) => t.id === "equal") as EqualTabVM;
            const equalMembers = sync(equalTab.members, (m) => ({
                id: m.id,
                name: m.name,
                isSelected: false,
                calculatedAmount: 0,
            }));

            const tabs = recalcEqualTab(prev, equalMembers).map((t): SplitTabVM => {
                if (t.id === "custom") {
                    const customMembers = sync(t.members, (m) => ({ id: m.id, name: m.name, value: null }));
                    const total = customMembers.reduce((s, m) => s + (m.value || 0), 0);
                    return {
                        ...t,
                        members: customMembers,
                        footer: { selected: { totalValue: total, difference: getCurrencyDifference(amount || 0, total) } },
                    };
                }

                if (t.id === "percentage") {
                    const percentMembers = sync(t.members, (m) => ({
                        id: m.id,
                        name: m.name,
                        value: null,
                        calculatedAmount: 0,
                    }));
                    const total = percentMembers.reduce((s, m) => s + (m.value || 0), 0);
                    return {
                        ...t,
                        members: percentMembers,
                        footer: { selected: { totalValue: total, difference: getRoundedDifference(100, total) } },
                    };
                }

                return t;
            });

            return { ...prev, tabs };
        });
    }, [members]);

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
                                difference: getCurrencyDifference(amount || 0, total)
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
                                difference: getRoundedDifference(100, total)
                            }
                        }
                    }
                    : t
            );

            return { ...prev, tabs: newTabs };
        });
    }

    function buildResult(): SplitResult | undefined {
        const tab = vm.tabs.find((t) => t.id === vm.selectedTab)!;

        if (tab.id === "equal") {

            const data: SplitResult = {
                splitType: "equal",
                participants: tab.members
                    .filter((m) => m.isSelected)
                    .map((m) => ({ userId: m.id, amount: m.calculatedAmount, percent: null })),
            };
            if (!data?.participants?.length) {
                setValidationMessage(t("selectOneToSplit"));
                return;
            }
            return data;
        }
        let errMsg: string | undefined;
        const diff = tab.footer.selected.difference;

        if (tab.id === "custom") {
            const data: SplitResult = {
                splitType: "custom",
                participants: tab.members
                    .filter((m) => m.value)
                    .map((m) => ({ userId: m.id, amount: m.value, percent: null })),
            };
            if (diff !== 0) {
                const totalFormatted = formatAmount(amount, currency);
                const diffFormatted = formatAmount(Math.abs(diff), currency);

                if (diff > 0) {
                    errMsg = t("splitCustomShort", { total: totalFormatted, diff: diffFormatted });
                }

                if (diff < 0) {
                    errMsg = t("splitCustomOver", { total: totalFormatted, diff: diffFormatted });
                }

                if (errMsg) setValidationMessage(errMsg);
                return;
            }
            return data;
        }

        if (diff !== 0) {

            if (diff > 0) {
                errMsg = t("splitPercentShort", { diff: Math.abs(diff) });
            }

            if (diff < 0) {
                errMsg = t("splitPercentOver", { diff: Math.abs(diff) });
            }

            if (errMsg) setValidationMessage(errMsg);
            return;
        }
        const data:SplitResult = {
            splitType: "percentage",
            participants: tab.members
                .filter((m) => m.value)
                .map((m) => ({ userId: m.id, amount: m.calculatedAmount, percent: m.value })),
        };
        return data;
    }

    return (
        <>
        <div {...swipeHandlers} className="fixed inset-0 bg-background z-[60] flex flex-col">

            {/* Header */}
            <div className={"fixed top-0 left-0 right-0 bg-background z-[70] touch-none overscroll-none"}>
                <div className="flex items-center justify-between px-4 h-14 border-b">
                    <ArrowLeft onClick={onClose} className="w-5 h-5" />
                    <div className="flex items-center gap-1">
                        <span className="font-medium">{headerTitle}</span>
                        <InfoSheetButton
                            title={headerTitle}
                            description={getSplitInfoText(vm.selectedTab, t)}
                        />
                    </div>
                    <Check onClick={() => {
                        const result = buildResult();
                        if (!result) return;
                        onConfirm(result);
                    }} className="w-5 h-5 text-primary" />
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
                className="fixed left-0 right-0 overflow-y-auto overscroll-contain p-1 space-y-2"
                style={{
                    top: 112,                 // header + tabs height
                    bottom: 56 + keyboardOffset,
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {activeTab.id === "equal" && activeTab.members.map((m) => {
                    const rowLabel = memberNameForViewer(m.id, m.name, viewerMemberId, youLabel);
                    return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <UserAvatar name={m.name} overlayName={rowLabel} size="md" />

                            <div className="flex flex-col min-w-0">
                                <span
                                    className={cn(
                                        "text-sm font-medium truncate block",
                                        m.isSelected ? "text-foreground" : "text-muted-foreground"
                                    )}
                                    title={rowLabel}
                                >
                                    {rowLabel}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <input
                                type="checkbox"
                                checked={m.isSelected}
                                onChange={() => toggleEqualMember(m.id)}
                                className="w-4 h-4 accent-primary"
                            />
                        </div>
                    </div>
                );
                })}

                {activeTab.id === "custom" && activeTab.members.map((m) => {
                    const rowLabel = memberNameForViewer(m.id, m.name, viewerMemberId, youLabel);
                    return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <UserAvatar name={m.name} overlayName={rowLabel} size="md" />

                            <div className="flex flex-col min-w-0">
                                <span
                                    className={cn(
                                        "text-sm font-medium truncate block",
                                        m.value ? "text-foreground" : "text-muted-foreground"
                                    )}
                                    title={rowLabel}
                                >
                                    {rowLabel}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Input
                                type={activeTab.input.type}
                                inputMode={activeTab.input.inputMode}
                                onClick={(e) => e.stopPropagation()}
                                minValue={activeTab.input.minValue}
                                maxValue={activeTab.input.maxValue}
                                precision={activeTab.input.precision}
                                placeholder={activeTab.input.placeholder}
                                showHelper={activeTab.input.showHelper}
                                formatOnBlur="currency"
                                value={m.value ?? ""}
                                onChange={(e) => {
                                    updateCustomValue(m.id, e.target.value ? +e.target.value : null);
                                }}
                                className={activeTab.input.className}
                            />
                        </div>
                    </div>
                );
                })}

                {activeTab.id === "percentage" && activeTab.members.map((m) => {
                    const rowLabel = memberNameForViewer(m.id, m.name, viewerMemberId, youLabel);
                    return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <UserAvatar name={m.name} overlayName={rowLabel} size="md" />

                            <div className="flex flex-col min-w-0">
                                <span
                                    className={cn(
                                        "text-sm font-medium truncate block",
                                        m.value ? "text-foreground" : "text-muted-foreground"
                                    )}
                                    title={rowLabel}
                                >
                                    {rowLabel}
                                </span>

                                <span className="text-xs text-muted-foreground">
                                    {formatAmount(m.calculatedAmount || 0, currency)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
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
                                value={m.value ?? ""}
                                onChange={(e) => {
                                    updatePercentValue(m.id, e.target.value ? +e.target.value : null);
                                }}
                                className={activeTab.input.className}
                            />
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
                                    <span className="text-sm text-destructive">{tab.footer.message?.error}</span>
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
                    const isOver = difference < 0

                    return (
                        <div className="text-sm text-center">
                            <div>
                                {t("amountOfLimit", {
                                    allocated: formatAmount(totalValue, currency),
                                    limit: formatAmount(limit, currency),
                                })}
                            </div>
                            <div
                                className={cn(
                                    "font-medium",
                                    difference === 0 && "text-primary",
                                    isOver && "text-destructive"
                                )}
                            >
                                {formatAmount(Math.abs(difference), currency)}{" "}
                                {isOver ? t("over") : t("left")}
                            </div>
                        </div>
                    )
                })()}

                {activeTab.id === "percentage" && (() => {
                    const { totalValue, difference } = activeTab.footer.selected
                    const limit = 100
                    const isOver = difference < 0

                    return (
                        <div className="text-sm text-center">
                            <div>
                                {t("amountOfLimit", {
                                    allocated: `${totalValue}%`,
                                    limit: `${limit}%`,
                                })}
                            </div>
                            <div
                                className={cn(
                                    "font-medium",
                                    difference === 0 && "text-primary",
                                    isOver && "text-destructive"
                                )}
                            >
                                {Math.abs(difference)}% {isOver ? t("over") : t("left")}
                            </div>
                        </div>
                    )
                })()}
            </div>
        </div>
        <GenericAlertDialog
            open={validationMessage !== null}
            onOpenChange={(open) => !open && setValidationMessage(null)}
            title={tCommon("whoops")}
            messages={validationMessage ? [validationMessage] : []}
            actions={[{ label: tCommon("gotIt"), onClick: () => setValidationMessage(null) }]}
          />
        </>
    );
}
