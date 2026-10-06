"use client";

import {
  Banknote,
  ChevronRight,
  PencilLine,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  UserPen,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useActivityText } from "@/components/activity/useActivityText";
import type { ActivityEvent, ActivityKind } from "@/lib/activity/types";
import { cn } from "@/lib/utils";

type Tone = "success" | "accent" | "danger" | "neutral";

const KIND_STYLE: Record<ActivityKind, { icon: LucideIcon; tone: Tone }> = {
  group_created: { icon: UsersRound, tone: "neutral" },
  group_renamed: { icon: PencilLine, tone: "neutral" },
  member_added: { icon: UserPlus, tone: "neutral" },
  member_renamed: { icon: UserPen, tone: "neutral" },
  member_removed: { icon: UserMinus, tone: "neutral" },
  expense_added: { icon: Plus, tone: "success" },
  expense_updated: { icon: Pencil, tone: "accent" },
  expense_deleted: { icon: Trash2, tone: "danger" },
  settlement_added: { icon: Banknote, tone: "success" },
  settlement_deleted: { icon: Banknote, tone: "danger" },
};

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  accent: "bg-primary/10 text-primary",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const { icon: Icon, tone } = KIND_STYLE[kind];
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", TONE_CLASS[tone])}>
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

/** One feed line. Links to the expense while it still exists. */
export function ActivityItem({
  event,
  groupId,
  time,
  canOpen,
}: {
  event: ActivityEvent;
  groupId: string;
  time: string;
  canOpen: boolean;
}) {
  const { feedSentence, feedDetail } = useActivityText();
  const detail = feedDetail(event);
  const href = canOpen && event.expenseId ? `/group/${groupId}/expense/${event.expenseId}` : null;

  const body = (
    <>
      <ActivityIcon kind={event.kind} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-muted-foreground [overflow-wrap:anywhere]">{feedSentence(event)}</p>
        {detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}
        <p className="mt-0.5 text-xs text-muted-foreground/80">{time}</p>
      </div>
      {href ? <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" aria-hidden /> : null}
    </>
  );

  return href ? (
    <Link href={href} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition hover:bg-muted/50">
      {body}
    </Link>
  ) : (
    <div className="flex items-start gap-3 py-2.5">{body}</div>
  );
}
