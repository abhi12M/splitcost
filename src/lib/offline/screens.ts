import { locales } from "@/i18n/routing";

/** An app screen the offline shell can draw from the data on this device. */
export type AppScreen =
  | { name: "groups" }
  | { name: "createGroup" }
  | { name: "group"; groupId: string }
  | { name: "addExpense"; groupId: string }
  | { name: "editGroup"; groupId: string }
  | { name: "activity"; groupId: string }
  | { name: "expense"; groupId: string; expenseId: string }
  | { name: "editExpense"; groupId: string; expenseId: string };

/** The locale a path starts with, or null when it has none. */
export function localeOf(pathname: string) {
  const first = pathname.split("/").filter(Boolean)[0];
  return (locales as readonly string[]).includes(first) ? first : null;
}

export function withoutLocale(pathname: string) {
  const [first, ...rest] = pathname.split("/").filter(Boolean);
  return (locales as readonly string[]).includes(first) ? `/${rest.join("/")}` : pathname;
}

/** Opened as the installed app (from the home screen), not in a browser tab. */
export function isInstalledApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * The app screen for a path (without its locale), or null for any other page.
 * The site root is where the installed app opens, so there it is the groups
 * list; in a browser tab it is the landing page, which isn't an app screen.
 */
export function appScreenFor(path: string): AppScreen | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return isInstalledApp() ? { name: "groups" } : null;
  if (parts.length === 1 && parts[0] === "groups") return { name: "groups" };
  if (parts.length === 1 && parts[0] === "create-group") return { name: "createGroup" };
  if (parts[0] !== "group" || !parts[1]) return null;

  const [, groupId, section, expenseId] = parts;
  if (!section) return { name: "group", groupId };
  if (section === "add-expense") return { name: "addExpense", groupId };
  if (section === "edit") return { name: "editGroup", groupId };
  if (section === "activity") return { name: "activity", groupId };
  if (section === "expense" && expenseId) return { name: "expense", groupId, expenseId };
  if (section === "edit-expense" && expenseId) return { name: "editExpense", groupId, expenseId };
  return null;
}
