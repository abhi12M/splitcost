import { LOCAL_GROUP_VIEWER_KEY_PREFIX } from "@/lib/constants";
import { getEncryptedItem, removeEncryptedItem, setEncryptedItem } from "@/lib/localStorage";

function viewerStorageKey(groupId: string): string {
  return `${LOCAL_GROUP_VIEWER_KEY_PREFIX}${groupId}`;
}

export function getGroupViewerMemberId(groupId: string): string | null {
  if (typeof window === "undefined") return null;
  const key = viewerStorageKey(groupId);
  try {
    const legacy = localStorage.getItem(key);
    if (legacy !== null && legacy !== "") {
      try {
        const parsed = JSON.parse(legacy) as unknown;
        if (typeof parsed === "string" && parsed.length > 0) {
          return parsed;
        }
      } catch {
        setEncryptedItem(key, legacy);
        localStorage.removeItem(key);
        return legacy;
      }
    }
  } catch {
    /* ignore */
  }
  const v = getEncryptedItem<string>(key, "");
  return v.length > 0 ? v : null;
}

export function setGroupViewerMemberId(groupId: string, memberId: string): void {
  if (typeof window === "undefined") return;
  const key = viewerStorageKey(groupId);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  setEncryptedItem(key, memberId);
}

export function clearGroupViewerMemberId(groupId: string): void {
  if (typeof window === "undefined") return;
  const key = viewerStorageKey(groupId);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  removeEncryptedItem(key);
}
