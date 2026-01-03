import React, { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectItem {
  id: string;
  label: string;
  icon?: React.ElementType | React.ReactNode;
  color?: string;
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
  value?: { groupId?: string; itemId: string } | null;
  onSelect?: (groupId: string | undefined, itemId: string) => void;
  placeholder?: string;
  inputPlaceholder?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  buttonClassName?: string;
  trigger?: React.ReactNode;
  onlyList?: boolean;
  ariaInvalid?: boolean;
}

export const SingleSelect: React.FC<SingleSelectProps> = ({
  groups,
  items,
  value,
  onSelect,
  placeholder = "Select...",
  inputPlaceholder = "Search...",
  buttonClassName,
  trigger,
  onlyList = false,
  ariaInvalid
}) => {
  const [open, setOpen] = useState(false);

  // Determine selected item (safe even if value is undefined)
  let selectedGroup: SelectGroup | undefined;
  let selectedItem: SelectItem | undefined;

  if (groups && value?.groupId && value?.itemId) {
    selectedGroup = groups.find((g) => g.id === value?.groupId);
    selectedItem = selectedGroup?.subOptions.find(
      (i) => i.id === value?.itemId
    );
  } else if (items && value?.itemId) {
    selectedItem = items.find((i) => i.id === value?.itemId);
  }

  const renderIcon = (
    icon?: React.ElementType | React.ReactNode,
    color?: string,
    isSelected?: boolean
  ) => {
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
              backgroundColor: isSelected
                ? `hsl(var(--${color}))`
                : `hsl(var(--${color}) / 0.15)`,
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
        {trigger ?? (
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            className={cn(
              "w-full h-14 px-4 rounded-xl bg-background hover:bg-accent/50 transition-all border flex items-center",
              "aria-[invalid=true]:border-destructive",
              "aria-[invalid=true]:data-[state=open]:border-transparent",
              "data-[state=open]:ring-2 data-[state=open]:ring-ring",
              buttonClassName
            )}
          >
            {/* LEFT CONTENT (icon + text) */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar / Icon */}
              <div className="shrink-0">
                {renderIcon(selectedItem?.icon, selectedGroup?.color)}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0 text-left">
                {selectedItem ? (
                  <>
                    <p className="text-sm font-medium leading-tight truncate">
                      {selectedItem.label}
                    </p>
                    {selectedGroup && (
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedGroup.label}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground truncate">
                    {placeholder}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT ICON (fixed width) */}
            <div className="ml-3 shrink-0 flex items-center">
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 min-w-[202px] sm:min-w-[250px]"
        align="start"
        avoidCollisions={false}
      >
        <Command>
          {(items?.length >= 8 || groups) && (
            <CommandInput placeholder={inputPlaceholder} />
          )}

          <CommandList
            className={cn(
              "max-h-[320px] overflow-y-auto custom-scrollbar",
              items && !groups ? "px-2 py-3" : "px-0 pt-0"
            )}
          >
            <CommandEmpty>No item found.</CommandEmpty>

            {/* Grouped */}
            {groups?.map((group) => (
              <CommandGroup
                key={group.id}
                heading={group.label}
                className="px-2"
              >
                {group.subOptions.map((option) => {
                  const isSelected =
                    value?.groupId === group.id &&
                    value?.itemId === option.id;

                  return (
                    <CommandItem
                      key={option.id}
                      value={option.label}
                      onSelect={() => {
                        onSelect?.(group.id, option.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition my-[7px]",
                        isSelected
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      )}
                    >
                      {renderIcon(
                        option.icon,
                        group.color,
                        isSelected
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {group.label}
                        </span>
                      </div>

                      {isSelected && (
                        <Check className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}

            {/* Flat list */}
            {items?.map((option) => {
              const isSelected = value?.itemId === option.id;

              return (
                <CommandItem
                  key={option.id}
                  value={option.label}
                  onSelect={() => {
                    onSelect?.(undefined, option.id);
                    if (!onlyList) setOpen(false); // only close if onlyList is false
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition my-[7px]",
                    isSelected ? "bg-primary/10" : "hover:bg-muted",
                    onlyList ? "cursor-default hover:bg-transparent" : "cursor-pointer"
                  )}
                >
                  {renderIcon(option.icon, option.color, isSelected)}
                  <span className="text-sm font-medium truncate">{option.label}</span>

                  {isSelected && <Check className="ml-auto h-4 w-4 text-primary  shrink-0" />}
                </CommandItem>

              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
