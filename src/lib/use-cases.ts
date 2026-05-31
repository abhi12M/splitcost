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
