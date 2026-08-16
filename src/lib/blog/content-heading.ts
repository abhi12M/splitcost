import { stripHtml } from "./utils";

export type BlogContentHeading = {
  h1: string | null;
  content: string;
};

const MARKDOWN_H1 = /^#(?!#)\s+(.+?)\s*$/;
const SETEXT_H1 = /^\s*=+\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;

function cleanHeading(value: string) {
  return stripHtml(value.replace(/\s+#+\s*$/, ""));
}

/**
 * Pull the article H1 out of its Markdown so it can be displayed in the page
 * header without being repeated in the article body.
 */
export function extractBlogContentHeading(content: string): BlogContentHeading {
  const lines = content.split(/\r?\n/);
  let activeFence: "`" | "~" | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const fence = lines[index].match(FENCE);
    if (fence) {
      const marker = fence[1][0] as "`" | "~";
      activeFence = activeFence === marker ? null : activeFence ?? marker;
      continue;
    }

    if (activeFence) continue;

    const atxHeading = lines[index].match(MARKDOWN_H1);
    if (atxHeading) {
      lines.splice(index, 1);
      return {
        h1: cleanHeading(atxHeading[1]),
        content: lines.join("\n").trimStart(),
      };
    }

    if (index + 1 < lines.length && lines[index].trim() && SETEXT_H1.test(lines[index + 1])) {
      const h1 = cleanHeading(lines[index]);
      lines.splice(index, 2);
      return {
        h1,
        content: lines.join("\n").trimStart(),
      };
    }
  }

  const htmlHeading = /<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1\s*>/i.exec(content);
  if (htmlHeading) {
    return {
      h1: cleanHeading(htmlHeading[1]),
      content: `${content.slice(0, htmlHeading.index)}${content.slice(htmlHeading.index + htmlHeading[0].length)}`.trimStart(),
    };
  }

  return { h1: null, content };
}
