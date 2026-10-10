import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  EXPENSE_CHANGED_EVENT,
  expenseChangesChannel,
  singleExpenseChannel,
  type ExpenseBroadcast,
  type ExpenseEvent,
} from "@/lib/realtime/expenseChanges";

type BroadcastExpenseOptions = {
  event: ExpenseEvent;
  expenseId: string;
  groupId: string;
  originSessionId: string | null;
  revision?: number;
};

export function broadcastExpenseChange({
  event,
  expenseId,
  groupId,
  originSessionId,
  revision,
}: BroadcastExpenseOptions) {
  const payload: ExpenseBroadcast = {
    event,
    expenseId,
    groupId,
    originSessionId,
    revision,
  };

  // Fire to both channels in parallel, best-effort.
  void Promise.all([
    send(expenseChangesChannel(groupId), payload),
    send(singleExpenseChannel(expenseId), payload),
  ]);
}

async function send(channelName: string, payload: ExpenseBroadcast) {
  const channel = supabaseAdmin.channel(channelName);
  try {
    const result = await channel.httpSend(EXPENSE_CHANGED_EVENT, payload);
    if (!result.success) {
      console.error(`broadcast expense error (${channelName}):`, result.error);
    }
  } catch (error) {
    console.error(`broadcast expense error (${channelName}):`, error);
  } finally {
    void supabaseAdmin.removeChannel(channel);
  }
}
