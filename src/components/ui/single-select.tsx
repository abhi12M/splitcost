import React, { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectItem {
  id: string;
  label: string;
  icon?: React.ElementType | React.ReactNode;
  color?: string; // optional color for icon background
}

export interface SelectGroup {
  id: string;
  label: string;
  color?: string;
  subOptions: SelectItem[];
}

interface SingleSelectProps {
  groups?: SelectGroup[];
  items?: SelectItem[];
  value: { groupId?: string; itemId: string } | null;
  onSelect: (groupId: string | undefined, itemId: string) => void;
  placeholder?: string;
  inputPlaceholder?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  buttonClassName?: string;
}

export const SingleSelect: React.FC<SingleSelectProps> = ({
  groups,
  items,
  value,
  onSelect,
  placeholder = "Select...",
  inputPlaceholder = "Search...",
  buttonClassName,
}) => {
  const [open, setOpen] = useState(false);

  // Determine selected item
  let selectedGroup: SelectGroup | undefined;
  let selectedItem: SelectItem | undefined;

  if (groups && value?.groupId && value.itemId) {
    selectedGroup = groups.find((g) => g.id === value.groupId);
    selectedItem = selectedGroup?.subOptions.find((i) => i.id === value.itemId);
  } else if (items && value?.itemId) {
    selectedItem = items.find((i) => i.id === value.itemId);
  }

  const renderIcon = (icon?: React.ElementType | React.ReactNode, color?: string, isSelected?: boolean) => {
    if (!icon) return null;

    const iconElement = React.isValidElement(icon)
      ? icon
      : typeof icon === "function"
        ? React.createElement(icon, { size: 18 })
        : null;

    return (
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={
          color
            ? {
              backgroundColor: isSelected ? `hsl(var(--${color}))` : `hsl(var(--${color}) / 0.15)`,
              color: isSelected ? "white" : `hsl(var(--${color}))`,
            }
            : undefined
        }
      >
        {iconElement}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-14 px-4 rounded-xl bg-background hover:bg-accent/50 transition-all border flex items-center",
            buttonClassName
          )}
        >
          {selectedItem ? (
            <div className="flex items-center gap-3">
              {renderIcon(selectedItem.icon, selectedGroup?.color)}
              <div className="text-left">
                <p className="text-sm font-medium leading-tight">{selectedItem.label}</p>
                {selectedGroup && <p className="text-xs text-muted-foreground">{selectedGroup.label}</p>}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}

          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          {(items?.length >= 8 || groups) && <CommandInput placeholder={inputPlaceholder} />}
          <CommandList className={cn(
            "max-h-[320px] overflow-y-auto custom-scrollbar",
            // Add padding only if it's a flat list
            items && !groups ? "px-2 py-3" : "px-0 pt-0"
          )}>
            <CommandEmpty>No item found.</CommandEmpty>

            {/* Grouped */}
            {groups &&
              groups.map((group) => (
                <CommandGroup key={group.id} heading={group.label} className="px-2">
                  {group.subOptions.map((option) => {
                    const isSelected = value?.groupId === group.id && value?.itemId === option.id;
                    return (
                      <CommandItem
                        key={option.id}
                        value={option.label}
                        onSelect={() => {
                          onSelect(group.id, option.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition my-[7px] first:mt-0 last:mb-0",
                          isSelected ? "bg-primary/10" : "hover:bg-muted"
                        )}
                      >
                        {renderIcon(option.icon, group.color, isSelected)}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{group.label}</span>
                        </div>
                        {isSelected && <Check className="ml-auto h-4 w-4 text-primary" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}

            {/* Flat list (render same as grouped visually) */}
            {items &&
              items.map((option) => {
                const isSelected = value?.itemId === option.id;
                return (
                  <CommandItem
                    key={option.id}
                    value={option.label}
                    onSelect={() => {
                      onSelect(undefined, option.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition my-[7px] first:mt-0 last:mb-0",
                      isSelected ? "bg-primary/10" : "hover:bg-muted"
                    )}
                  >
                    {renderIcon(option.icon, option.color, isSelected)}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                    {isSelected && <Check className="ml-auto h-4 w-4 text-primary" />}
                  </CommandItem>
                );
              })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
