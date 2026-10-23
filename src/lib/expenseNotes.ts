import { isBlankText, removeInvisible } from "@/lib/validations/names";

export const EXPENSE_NOTES_TEXT_MAX = 2000;
export const EXPENSE_NOTES_STORAGE_MAX = 10000;

const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "br",
  "p",
  "div",
]);

const escapeHtml = (value: string) =>
  value
    .replace(/&(?!(?:amp|lt|gt|quot|#39|nbsp);)/g, "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/** Keep only the small, attribute-free markup subset supported by notes. */
export function sanitizeExpenseNotes(value: string): string {
  let result = "";
  let cursor = 0;
  const tagPattern = /<[^>]*>/g;

  for (const match of value.matchAll(tagPattern)) {
    const index = match.index ?? cursor;
    result += escapeHtml(value.slice(cursor, index));

    const tag = match[0].match(/^<\s*(\/?)\s*([a-z0-9]+)\s*\/?\s*>$/i);
    if (tag && ALLOWED_TAGS.has(tag[2].toLowerCase())) {
      const name = tag[2].toLowerCase();
      result += name === "br" ? "<br>" : `<${tag[1] ? "/" : ""}${name}>`;
    }

    cursor = index + match[0].length;
  }

  result += escapeHtml(value.slice(cursor));
  return result;
}

/** Whether sanitized note markup contains any visible text (invisible characters don't count). */
export function hasExpenseNotesContent(value: string): boolean {
  const text = sanitizeExpenseNotes(value)
    .replace(/<[^>]*>/g, "")
    .replace(/(?:&nbsp;|&#160;|&#x0*a0;)/gi, " ");
  return !isBlankText(text);
}

/** One empty line (or a non-breaking space) the editor can leave at the start or end of the notes. */
const EMPTY_LINE = String.raw`(?:<(div|p)>(?:\s|&nbsp;|<br>)*</\1>|<br>|&nbsp;)`;
const LEADING_EMPTY_LINE = new RegExp(`^${EMPTY_LINE}`);
const TRAILING_EMPTY_LINE = new RegExp(`${EMPTY_LINE}$`);

/** Drops empty lines and spaces at both ends, one line at a time (no backtracking-heavy pattern). */
function trimEmptyLines(html: string) {
  let result = html.trim();
  for (;;) {
    const next = result.replace(LEADING_EMPTY_LINE, "").replace(TRAILING_EMPTY_LINE, "").trim();
    if (next === result) return result;
    result = next;
  }
}

/**
 * The notes to save: sanitized, invisible characters removed, empty lines at
 * either end dropped, and markup with no visible text collapsed to "".
 */
export function normalizeExpenseNotes(value: string): string {
  const sanitized = trimEmptyLines(removeInvisible(sanitizeExpenseNotes(value)));
  return hasExpenseNotesContent(sanitized) ? sanitized : "";
}
