import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { failureJson } from "@/lib/api/errors";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { discardBlogDraft } from "@/lib/blog/queries";

type RouteContext = {
  params: { id: string };
};

/** Discards the unpublished changes of a published post; the live post is left as it is. */
export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const discarded = await discardBlogDraft(params.id);
    if (!discarded) {
      return NextResponse.json({ error: "No draft changes to discard" }, { status: 404 });
    }
    revalidatePath("/portal/x7k2p9/blogs");
    return successJson({ ok: true }, SUCCESS_MESSAGES.blogDraftDiscarded);
  } catch (error: unknown) {
    console.error("discardBlogDraft error:", error);
    return failureJson(error, "Failed to discard draft changes", 400);
  }
}
