import { Paperclip } from "lucide-react";

import {
  EXPENSE_CATEGORIES,
  getCategoryIcon,
  type CategoryKey,
  type SubcategoryId,
} from "@/components/icons/CategoryIcons";
import { cn } from "@/lib/utils";

type ExpenseListCategoryIconProps = {
  category: CategoryKey;
  subcategory?: SubcategoryId;
  hasAttachment?: boolean;
  containerClassName?: string;
};

export function ExpenseListCategoryIcon({
  category,
  subcategory,
  hasAttachment,
  containerClassName,
}: ExpenseListCategoryIconProps) {
  const IconComponent = getCategoryIcon(category, subcategory);
  const categoryColor =
    EXPENSE_CATEGORIES[category]?.color || "category-uncategorized";

  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center",
        containerClassName
      )}
      style={{
        backgroundColor: `hsl(var(--${categoryColor}) / 0.15)`,
      }}
    >
      <IconComponent
        className="h-5 w-5"
        style={{ color: `hsl(var(--${categoryColor}))` }}
      />
      {hasAttachment ? (
        <Paperclip
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-background p-0.5 text-muted-foreground shadow-sm ring-1 ring-border/60"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
