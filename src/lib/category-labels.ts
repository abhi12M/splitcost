import {
  EXPENSE_CATEGORIES,
  type CategoryKey,
  type SubcategoryId,
} from "@/components/icons/CategoryIcons";

type CategoryTranslator = (key: string) => string;

export function getTranslatedCategoryLabel(
  t: CategoryTranslator,
  categoryKey: CategoryKey
): string {
  return t(`categories.${categoryKey}.label`);
}

export function getTranslatedSubcategoryLabel(
  t: CategoryTranslator,
  categoryKey: CategoryKey,
  subcategoryId: SubcategoryId
): string {
  return t(`categories.${categoryKey}.subcategories.${subcategoryId}`);
}

export function isCategoryKey(key: string): key is CategoryKey {
  return key in EXPENSE_CATEGORIES;
}

export function resolveCategoryDisplayLabel(
  t: CategoryTranslator,
  key: string,
  fallback?: string
): string {
  if (isCategoryKey(key)) {
    return getTranslatedCategoryLabel(t, key);
  }
  return fallback ?? key;
}

export function buildCategorySelectGroups(t: CategoryTranslator) {
  return Object.entries(EXPENSE_CATEGORIES).map(([key, category]) => ({
    id: key as CategoryKey,
    label: getTranslatedCategoryLabel(t, key as CategoryKey),
    color: category.color,
    subOptions: category.subcategories.map((sub) => ({
      id: sub.id as SubcategoryId,
      label: getTranslatedSubcategoryLabel(t, key as CategoryKey, sub.id),
      icon: sub.icon,
    })),
  }));
}
