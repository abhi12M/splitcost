import { NextResponse } from "next/server";
import { listExpenseActivity } from "@/lib/activity/server/activityStore";
import { errorJson } from "@/lib/api/errors";

const UUID = /^[0-9a-f-]{36}$/i;

/** GET /api/expenses/:expenseId/activity: that expense's history, newest first. */
export async function GET(_req: Request, { params }: { params: { expenseId: string } }) {
  const { expenseId } = params;
  if (!expenseId || !UUID.test(expenseId)) {
    return NextResponse.json({ error: "Invalid expense" }, { status: 400 });
  }

  try {
    const events = await listExpenseActivity(expenseId);
    return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("listExpenseActivity error:", error);
    return errorJson("Failed to load activity", 500, error);
  }
}
