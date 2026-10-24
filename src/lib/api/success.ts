// Success responses for APIs that change data: the usual body plus a
// human-readable `message`. The UI doesn't show these yet; they keep every
// API's answer consistent and self-describing.
import { NextResponse } from "next/server";

export const SUCCESS_MESSAGES = {
  groupCreated: "Group created",
  groupUpdated: "Group updated",
  groupUnchanged: "No changes to save",
  groupDeleted: "Group deleted",
  expenseAdded: "Expense added",
  expenseUpdated: "Expense updated",
  expenseDeleted: "Expense deleted",
  settlementRecorded: "Settlement recorded",
  settlementUpdated: "Settlement updated",
  settlementDeleted: "Settlement deleted",
  categoryUpdated: "Category updated",
  receiptUploaded: "Receipt uploaded",
  receiptRemoved: "Receipt removed",
  contactSent: "Message sent",
  signedIn: "Signed in",
  signedOut: "Signed out",
  blogCreated: "Blog created",
  blogUpdated: "Blog updated",
  blogDeleted: "Blog deleted",
  blogDraftDiscarded: "Draft changes discarded",
  blogCategoryCreated: "Category created",
  blogCategoryUpdated: "Category updated",
  blogCategoryDeleted: "Category deleted",
  imageUploaded: "Image uploaded",
  mediaUploaded: "Media uploaded",
  mediaRenamed: "Media renamed",
  mediaDeleted: "Media deleted",
} as const;

export type SuccessMessage = (typeof SUCCESS_MESSAGES)[keyof typeof SUCCESS_MESSAGES];

/** Adds `message` to a success body. `data` is spread, so it must be an object (or null). */
export function successJson(data: object | null | undefined, message: SuccessMessage, init?: ResponseInit) {
  return NextResponse.json({ ...(data ?? {}), message }, init);
}
