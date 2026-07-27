import { stripHtml } from "./utils";

export type BlogContentStats = {
  words: number;
  characters: number;
  headings: number;
  images: number;
  internalLinks: number;
};

export function getBlogContentStats(content: string): BlogContentStats {
  const plain = stripHtml(content);
  const words = plain.split(/\s+/).filter(Boolean).length;
  const characters = content.length;
  const headings =
    [...content.matchAll(/^#{1,6}\s+/gm)].length +
    [...content.matchAll(/<h[1-6]\b/gi)].length;
  const images =
    [...content.matchAll(/!\[[^\]]*\]\([^)]+\)/g)].length +
    [...content.matchAll(/<img\b/gi)].length;
  const internalLinks =
    [...content.matchAll(/\[[^\]]+\]\(\s*\/[^)]*\)/g)].length +
    [...content.matchAll(/<a[^>]+href=["']\/[^"']*["']/gi)].length;

  return { words, characters, headings, images, internalLinks };
}
