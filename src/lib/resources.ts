export const RESOURCE_CATEGORY_SLUGS = [
  "gettingStarted",
  "splittingMethods",
  "householdBills",
] as const;

export type ResourceCategorySlug = (typeof RESOURCE_CATEGORY_SLUGS)[number];

export const RESOURCE_SLUGS = [
  "uniteCuSharingExpenses",
  "cudenverSplittingCosts",
  "junehomesFairSplitting",
  "sofiCostSharing",
  "truistRoommateCosts",
  "experianBillSplitting",
] as const;

export type ResourceSlug = (typeof RESOURCE_SLUGS)[number];

export type ResourceMeta = {
  slug: ResourceSlug;
  url: string;
  source: string;
  category: ResourceCategorySlug;
};

export const RESOURCE_LIST: ResourceMeta[] = [
  {
    slug: "uniteCuSharingExpenses",
    url: "https://unite-cu.org/sharing-expenses-with-college-roommates",
    source: "Unite CU",
    category: "gettingStarted",
  },
  {
    slug: "cudenverSplittingCosts",
    url: "https://www.cudenver.com/Blog/Smart-Money/October-2024/A-Guide-to-Splitting-Costs-with-Your-Roommate",
    source: "CU Denver",
    category: "gettingStarted",
  },
  {
    slug: "junehomesFairSplitting",
    url: "https://junehomes.com/blog/2025/10/08/how-to-split-life-expenses-with-roommates-calculator",
    source: "June Homes",
    category: "splittingMethods",
  },
  {
    slug: "sofiCostSharing",
    url: "https://www.sofi.com/learn/content/sharing-expenses-with-roommates",
    source: "SoFi",
    category: "splittingMethods",
  },
  {
    slug: "truistRoommateCosts",
    url: "https://www.truist.com/money-mindset/principles/budgeting-by-values/how-to-split-costs-with-roommates",
    source: "Truist",
    category: "householdBills",
  },
  {
    slug: "experianBillSplitting",
    url: "https://www.experian.com/blogs/ask-experian/how-to-split-bills-with-roommates",
    source: "Experian",
    category: "householdBills",
  },
];

export const RESOURCES_INDEX_PATH = "/resources";

export function getResourcesByCategory(
  category: ResourceCategorySlug
): ResourceMeta[] {
  return RESOURCE_LIST.filter((item) => item.category === category);
}

export function getAllIndexableResourcePaths(): string[] {
  return [RESOURCES_INDEX_PATH];
}
