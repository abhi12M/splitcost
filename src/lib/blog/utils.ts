import type { BlogFaq } from "@/lib/blog/types";

const WORDS_PER_MINUTE = 220;

export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function estimateReadingTime(htmlOrText: string): number {
  const text = htmlOrText
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return 1;
  const words = text.split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export type TocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function extractHeadings(html: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const regex = /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  const usedIds = new Set<string>();

  while ((match = regex.exec(html)) !== null) {
    const level = Number(match[1]) as 2 | 3;
    const attrs = match[2] ?? "";
    const rawText = stripHtml(match[3] ?? "").trim();
    if (!rawText) continue;

    const existingId = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
    let id = existingId || slugifyTitle(rawText) || `section-${headings.length + 1}`;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${existingId || slugifyTitle(rawText)}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    headings.push({ id, text: rawText, level });
  }

  return headings;
}

export function injectHeadingIds(html: string): string {
  const usedIds = new Set<string>();

  return html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, level, attrs, inner) => {
    const text = stripHtml(inner).trim();
    const existingId = String(attrs).match(/\bid=["']([^"']+)["']/i)?.[1];
    let id = existingId || slugifyTitle(text) || `section-${usedIds.size + 1}`;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${existingId || slugifyTitle(text)}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    if (/\bid=["']/i.test(attrs)) {
      return full.replace(/\bid=["'][^"']*["']/i, `id="${id}"`);
    }
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseFaqs(value: unknown): BlogFaq[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const question = "question" in item ? String(item.question ?? "").trim() : "";
      const answer = "answer" in item ? String(item.answer ?? "").trim() : "";
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is BlogFaq => Boolean(item));
}

export function formatBlogDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}
