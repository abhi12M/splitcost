// An expense is always in its group's currency: a group's currency is set
// when it's created and can't change, and the forms don't let an expense pick
// another one. The API holds to the same rule.
import { NextResponse } from "next/server";

import {
  EXPENSE_CURRENCY_MISMATCH_ERROR,
  toSupportedCurrency,
  UNSUPPORTED_CURRENCY_ERROR,
} from "@/constants/currencies";
import { supabaseAdmin } from "@/lib/supabase/server";

type CurrencyResult = { ok: true; currency: string } | { ok: false; response: NextResponse };

/**
 * The currency to save on an expense: the group's. A sent currency must be a
 * supported code and the group's; leaving it out uses the group's.
 */
export async function resolveExpenseCurrency(groupId: string, sentCurrency: unknown): Promise<CurrencyResult> {
  let sent: string | null = null;
  if (sentCurrency !== undefined && sentCurrency !== null) {
    sent = toSupportedCurrency(sentCurrency);
    if (!sent) {
      return { ok: false, response: NextResponse.json({ error: UNSUPPORTED_CURRENCY_ERROR }, { status: 400 }) };
    }
  }

  const { data: group, error } = await supabaseAdmin.from("groups").select("currency").eq("id", groupId).maybeSingle();
  if (error) {
    console.error("resolveExpenseCurrency error:", error);
    return { ok: false, response: NextResponse.json({ error: "Failed to load the group" }, { status: 400 }) };
  }
  if (!group) {
    return { ok: false, response: NextResponse.json({ code: "GROUP_NOT_FOUND", error: "Group not found" }, { status: 404 }) };
  }
  if (sent !== null && sent !== group.currency) {
    return { ok: false, response: NextResponse.json({ error: EXPENSE_CURRENCY_MISMATCH_ERROR }, { status: 400 }) };
  }
  return { ok: true, currency: group.currency };
}
