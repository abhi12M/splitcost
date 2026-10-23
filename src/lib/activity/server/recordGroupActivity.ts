// Turns group and member changes into activity events. Never throws.
import "server-only";

import type { GroupChanges } from "@/lib/realtime/groupChanges";
import type { NewActivityEvent } from "../types";
import { recordActivity } from "./activityStore";

export function recordGroupCreated(
  groupId: string,
  group: { name: string; currency: string; members: string[] }
) {
  return recordActivity([{ groupId, kind: "group_created", data: group }]);
}

/** One entry per member change, so each reads on its own in the feed. */
export function recordGroupChanges(groupId: string, changes: GroupChanges) {
  const originSessionId = changes.originSessionId;
  const events: NewActivityEvent[] = [];

  if (changes.name) {
    events.push({ groupId, kind: "group_renamed", data: { from: changes.name.from, to: changes.name.to }, originSessionId });
  }
  for (const member of changes.added) {
    events.push({ groupId, kind: "member_added", data: { member }, originSessionId });
  }
  for (const rename of changes.renamed) {
    events.push({ groupId, kind: "member_renamed", data: { memberId: rename.id, from: rename.from, to: rename.to }, originSessionId });
  }
  for (const member of changes.removed) {
    events.push({ groupId, kind: "member_removed", data: { member }, originSessionId });
  }
  return recordActivity(events);
}
