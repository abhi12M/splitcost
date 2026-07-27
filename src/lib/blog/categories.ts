export const BLOG_CATEGORIES = [
  {
    slug: "travel",
    title: "Travel",
    description:
      "Tips for splitting trip costs, managing group travel budgets, and settling shared vacation expenses.",
  },
  {
    slug: "expense-splitting",
    title: "Expense Splitting",
    description:
      "Guides on fair bill splits, shared payments, and settling up with friends or groups.",
  },
  {
    slug: "personal-finance",
    title: "Personal Finance",
    description:
      "Practical personal finance advice for everyday spending, savings, and shared money decisions.",
  },
  {
    slug: "budgeting",
    title: "Budgeting",
    description:
      "Budgeting frameworks for trips, households, events, and group spending plans.",
  },
  {
    slug: "roommates",
    title: "Roommates",
    description:
      "How roommates can track rent, utilities, groceries, and shared household bills fairly.",
  },
  {
    slug: "couples",
    title: "Couples",
    description:
      "Shared money tips for couples managing joint expenses, trips, and household costs.",
  },
  {
    slug: "business-expenses",
    title: "Business Expenses",
    description:
      "Track and split business-related group costs, team outings, and shared work expenses.",
  },
  {
    slug: "events",
    title: "Events",
    description:
      "Split costs for parties, weddings, group dinners, and shared celebrations with less friction.",
  },
] as const;

export type BlogCategorySlug = (typeof BLOG_CATEGORIES)[number]["slug"];

export function getBlogCategory(slug: string) {
  return BLOG_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function isBlogCategorySlug(value: string): value is BlogCategorySlug {
  return BLOG_CATEGORIES.some((category) => category.slug === value);
}

export function getBlogCategoryTitle(slug: string): string {
  return getBlogCategory(slug)?.title ?? slug;
}
