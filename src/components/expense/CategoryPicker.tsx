import React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "../ui/UserAvatar";
import {
  CategoryKey,
  SubcategoryId,
  EXPENSE_CATEGORIES,
} from "../icons/CategoryIcons";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (cat: CategoryKey, sub: SubcategoryId) => void;
  selectedCategory: CategoryKey | "";
  selectedSubcategory: SubcategoryId;
};

const renderLeading = (
  item: any,
  groupColor?: string,
  isSelected?: boolean
) => {
  // Avatar
  if (item?.showAvatar) {
    return <UserAvatar name={item.label} className="shrink-0" />;
  }

  // Icon
  if (item?.icon) {
    const Icon = item.icon;

    return (
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        )}
        style={
          groupColor
            ? {
                backgroundColor: isSelected
                  ? `hsl(var(--${groupColor}))`
                  : `hsl(var(--${groupColor}) / 0.15)`,
                color: isSelected ? "white" : `hsl(var(--${groupColor}))`,
              }
            : undefined
        }
      >
        <Icon className="w-4 h-4" />
      </div>
    );
  }

  return null;
};

export function CategoryFullscreenPicker({
  open,
  onClose,
  onSelect,
  selectedCategory,
  selectedSubcategory,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <button onClick={onClose}>
          <ArrowLeft />
        </button>
        <h2 className="font-semibold text-lg">Search or select a category</h2>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {Object.entries(EXPENSE_CATEGORIES).map(([catKey, cat]) => (
          <div key={catKey}>
            <h3 className="text-sm text-muted-foreground mb-3">
              {cat.label}
            </h3>

            <div className="space-y-2">
              {cat.subcategories.map((sub) => {
                const isSelected =
                  selectedCategory === catKey &&
                  selectedSubcategory === sub.id;

                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      onSelect(catKey as CategoryKey, sub.id);
                      onClose();
                    }}
                    className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-muted transition"
                  >
                    {renderLeading(sub, cat.color, isSelected)}

                    <span className={isSelected ? "font-medium" : ""}>
                      {sub.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
