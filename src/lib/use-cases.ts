export const USE_CASE_SLUGS = [
  "travel",
  "roommates",
  "couples",
  "friends",
  "teams",
] as const;

export type UseCaseSlug = (typeof USE_CASE_SLUGS)[number];

export type UseCaseAccent = "brand" | "emerald" | "rose" | "cyan";

export type UseCaseMeta = {
  slug: UseCaseSlug;
  image: string;
  accent: UseCaseAccent;
};

const useCaseMetaBySlug: Record<
  UseCaseSlug,
  Omit<UseCaseMeta, "slug">
> = {
  travel: {
    image: "/landing/use-cases/use-case-travel.png",
    accent: "brand",
  },
  roommates: {
    image: "/landing/use-cases/use-case-roommates.png",
    accent: "emerald",
  },
  couples: {
    image: "/landing/use-cases/use-case-couples.png",
    accent: "rose",
  },
  friends: {
    image: "/landing/use-cases/use-case-friends.png",
    accent: "brand",
  },
  teams: {
    image: "/landing/use-cases/use-case-teams.png",
    accent: "cyan",
  },
};

/**
 * Blog posts linked from each use-case page, in display order. Shown on the
 * English pages only, since the blog is English-only; slugs with no
 * published post are skipped.
 */
export const USE_CASE_RELATED_BLOG_SLUGS: Record<UseCaseSlug, readonly string[]> = {
  travel: ["how-to-share-vacation-costs-when-plans-change", "shared-expense-multiple-payers"],
  roommates: ["split-household-expenses-with-roommates", "what-are-shared-expenses"],
  couples: ["what-are-shared-expenses", "check-shared-expenses-before-settling-up"],
  friends: ["how-to-split-expenses-with-friends", "how-to-split-a-group-gift-fairly"],
  teams: ["shared-expense-multiple-payers", "how-to-settle-group-expenses"],
};

export const USE_CASE_LIST: UseCaseMeta[] = USE_CASE_SLUGS.map((slug) => ({
  slug,
  ...useCaseMetaBySlug[slug],
}));

export const USE_CASE_INDEX_PATH = "/use-cases";

export function isUseCaseSlug(slug: string): slug is UseCaseSlug {
  return (USE_CASE_SLUGS as readonly string[]).includes(slug);
}

export function getUseCasePath(slug: UseCaseSlug): string {
  return `${USE_CASE_INDEX_PATH}/${slug}`;
}

export function getAllIndexableUseCasePaths(): string[] {
  return [
    USE_CASE_INDEX_PATH,
    ...USE_CASE_SLUGS.map((slug) => getUseCasePath(slug)),
  ];
}
