export const COMPARE_SLUGS = ["splitwise", "splid", "tricount"] as const;

export type CompareSlug = (typeof COMPARE_SLUGS)[number];

export type CompareMeta = {
  slug: CompareSlug;
  /** Display name for the competitor (e.g. Splitwise) */
  competitorName: string;
};

export const COMPARE_LIST: CompareMeta[] = [
  { slug: "splitwise", competitorName: "Splitwise" },
  { slug: "splid", competitorName: "Splid" },
  { slug: "tricount", competitorName: "Tricount" },
];

export const COMPARE_INDEX_PATH = "/compare";

export function isCompareSlug(slug: string): slug is CompareSlug {
  return (COMPARE_SLUGS as readonly string[]).includes(slug);
}

export function getComparePath(slug: CompareSlug): string {
  return `${COMPARE_INDEX_PATH}/${slug}`;
}

export function getCompareMeta(slug: CompareSlug): CompareMeta {
  return COMPARE_LIST.find((item) => item.slug === slug)!;
}

export function getAllIndexableComparePaths(): string[] {
  return [
    COMPARE_INDEX_PATH,
    ...COMPARE_SLUGS.map((slug) => getComparePath(slug)),
  ];
}

/** Rows shown in the feature comparison table (order preserved). */
export const COMPARISON_ROW_KEYS = [
  "noSignup",
  "freeToStart",
  "shareableGroupLink",
  "webApp",
  "flexibleSplits",
  "multiplePayers",
  "receiptAttachments",
  "csvExport",
  "multiCurrency",
  "settlementSuggestions",
  "groupExpenseHistory",
] as const;

export const COMPARE_REASON_KEYS: Record<CompareSlug, readonly string[]> = {
  splitwise: ["one", "two", "three", "four"],
  splid: ["one", "two", "three", "four"],
  tricount: ["one", "two", "three"],
};

export const COMPARE_FAQ_KEYS: Record<CompareSlug, readonly string[]> = {
  splitwise: ["one", "two", "three", "four", "five", "six"],
  splid: ["one", "two", "three", "four", "five", "six"],
  tricount: ["one", "two", "three", "four", "five", "six"],
};

export const COMPARE_WHO_ITEM_KEYS: Record<
  CompareSlug,
  readonly string[]
> = {
  splitwise: ["travel", "roommates", "friends", "couples", "shortTerm"],
  splid: ["linkJoin", "flexibleSplits", "trackExpenses", "receiptsExport", "webBased"],
  tricount: ["travel", "friends", "events", "couples", "browserAccess"],
};

export type CompareWhoItemKey =
  (typeof COMPARE_WHO_ITEM_KEYS)[CompareSlug][number];

/** Slugs that show the mobile dashboard preview beside the who-should section. */
export const COMPARE_WHO_SHOW_MOBILE_PREVIEW: CompareSlug[] = ["splitwise", "splid", "tricount"];

export type ComparisonRowKey = (typeof COMPARISON_ROW_KEYS)[number];
