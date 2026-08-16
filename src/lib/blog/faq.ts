export type BlogFaqItem = {
  question: string;
  answer: string;
  headingIndex: number;
};

export type ParsedBlogFaq = {
  before: string;
  after: string;
  title: string;
  intro: string;
  headingIndex: number;
  afterHeadingOffset: number;
  items: BlogFaqItem[];
};

type MarkdownHeading = {
  level: number;
  text: string;
  lineIndex: number;
  headingIndex: number;
};

const MARKDOWN_HEADING = /^(#{1,6})\s+(.+?)\s*$/;

function plainHeadingText(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .trim();
}

function isFaqHeading(value: string) {
  const normalized = plainHeadingText(value).toLowerCase().replace(/[?:.!]+$/, "");
  return normalized === "faq" || normalized === "faqs" || normalized === "frequently asked questions";
}

export function parseBlogFaq(content: string): ParsedBlogFaq | null {
  const lines = content.split(/\r?\n/);
  const headings: MarkdownHeading[] = [];

  lines.forEach((line, lineIndex) => {
    const match = line.match(MARKDOWN_HEADING);
    if (!match) return;

    headings.push({
      level: match[1].length,
      text: match[2],
      lineIndex,
      headingIndex: headings.length + 1,
    });
  });

  const faqHeadingPosition = headings.findIndex(
    (heading) => heading.level >= 2 && isFaqHeading(heading.text)
  );
  if (faqHeadingPosition < 0) return null;

  const faqHeading = headings[faqHeadingPosition];
  const nextSection = headings
    .slice(faqHeadingPosition + 1)
    .find((heading) => heading.level <= faqHeading.level);
  const faqEndLine = nextSection?.lineIndex ?? lines.length;
  const questionHeadings = headings.filter(
    (heading) =>
      heading.lineIndex > faqHeading.lineIndex &&
      heading.lineIndex < faqEndLine &&
      heading.level === faqHeading.level + 1
  );

  if (!questionHeadings.length) return null;

  const firstQuestionLine = questionHeadings[0].lineIndex;
  const items = questionHeadings.map((heading, index) => {
    const answerEnd = questionHeadings[index + 1]?.lineIndex ?? faqEndLine;
    return {
      question: plainHeadingText(heading.text),
      answer: lines.slice(heading.lineIndex + 1, answerEnd).join("\n").trim(),
      headingIndex: heading.headingIndex,
    };
  });

  return {
    before: lines.slice(0, faqHeading.lineIndex).join("\n").trimEnd(),
    after: lines.slice(faqEndLine).join("\n").trimStart(),
    title: plainHeadingText(faqHeading.text),
    intro: lines.slice(faqHeading.lineIndex + 1, firstQuestionLine).join("\n").trim(),
    headingIndex: faqHeading.headingIndex,
    afterHeadingOffset: nextSection ? nextSection.headingIndex - 1 : headings.length,
    items,
  };
}

export function getBlogFaqDescription(title: string) {
  const topic = title
    .replace(/\s*\|\s*SplitCost\s*$/i, "")
    .replace(/^how to\s+/i, "")
    .trim();

  if (!topic) return "Clear answers to common questions.";
  return `Common questions about ${topic.toLocaleLowerCase()}.`;
}
