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
