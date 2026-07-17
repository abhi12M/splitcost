export type BlogCategory = {
  name: string;
  slug: string;
  description: string;
};

export const BLOG_CATEGORIES: BlogCategory[] = [
  {
    name: "Travel",
    slug: "travel",
    description:
      "Guides for planning trips, tracking shared travel costs, and settling up with groups.",
  },
  {
    name: "Expense Splitting",
    slug: "expense-splitting",
    description:
      "Practical advice for splitting bills fairly with friends, families, and teams.",
  },
  {
    name: "Personal Finance",
    slug: "personal-finance",
    description:
      "Simple money habits and personal finance tips for everyday shared expenses.",
  },
  {
    name: "Budgeting",
    slug: "budgeting",
    description:
      "Budgeting ideas for trips, households, events, and recurring group costs.",
  },
  {
    name: "Roommates",
    slug: "roommates",
    description:
      "Advice for rent, utilities, groceries, and keeping shared homes financially calm.",
  },
  {
    name: "Couples",
    slug: "couples",
    description:
      "Ways couples can manage shared costs, dates, trips, and household spending.",
  },
  {
    name: "Business Expenses",
    slug: "business-expenses",
    description:
      "Tips for tracking reimbursements, team expenses, client costs, and work trips.",
  },
  {
    name: "Events",
    slug: "events",
    description:
      "Planning and splitting costs for parties, weddings, weekends, and group events.",
  },
];

export function getBlogCategory(slug: string) {
  return BLOG_CATEGORIES.find((category) => category.slug === slug);
}

export function getBlogCategoryByName(name: string) {
  return BLOG_CATEGORIES.find((category) => category.name === name);
}
