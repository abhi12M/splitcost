import { NextResponse } from "next/server";
import { listGroupActivity } from "@/lib/activity/server/activityStore";
import { isActivityFilter, type ActivityCursor } from "@/lib/activity/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const UUID = /^[0-9a-f-]{36}$/i;

function parseCursor(params: URLSearchParams): ActivityCursor | null {
  const createdAt = params.get("cursorAt");
  const id = params.get("cursorId");
  if (!createdAt || !id || !UUID.test(id) || Number.isNaN(Date.parse(createdAt))) return null;
  return { createdAt, id };
}

/** GET /api/groups/:groupId/activity?filter=all|expenses|settlements|members&limit=20&cursorAt=&cursorId= */
export async function GET(req: Request, { params }: { params: { groupId: string } }) {
  const { groupId } = params;
  if (!groupId || !UUID.test(groupId)) {
    return NextResponse.json({ error: "Invalid group" }, { status: 400 });
  }

  const search = new URL(req.url).searchParams;
  const filterParam = search.get("filter") ?? "all";
  const filter = isActivityFilter(filterParam) ? filterParam : "all";
  const requestedLimit = Number(search.get("limit"));
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  try {
    const page = await listGroupActivity(groupId, { filter, cursor: parseCursor(search), limit });
    return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("listGroupActivity error:", error);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
