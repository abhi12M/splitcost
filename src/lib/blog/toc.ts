import { stripHtml } from "./utils";

export type BlogTocItem = {
  id: string;
  text: string;
  level: number;
};

export function buildBlogTableOfContents(content: string): BlogTocItem[] {
  const headings: BlogTocItem[] = [];
  let index = 0;

  content.replace(/<h([1-6])([^>]*)>(.*?)<\/h\1>/gi, (_match, level, attrs, text) => {
    index += 1;
    if (Number(level) === 1) return "";

    const existingId = String(attrs).match(/\sid=["']([^"']+)["']/i)?.[1];
    headings.push({
      id: existingId ?? `section-${index}`,
      text: stripHtml(text),
      level: Number(level),
    });
    return "";
  });

  if (headings.length) return headings;

  for (const match of content.matchAll(/^(#{1,6})\s+(.+)$/gm)) {
    index += 1;
    if (match[1].length === 1) continue;

    headings.push({
      id: `section-${index}`,
      text: stripHtml(match[2]),
      level: match[1].length,
    });
  }

  return headings;
}
