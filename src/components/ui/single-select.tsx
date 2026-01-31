"use client";
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
import { ChevronsUpDown, Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import { useDeviceType } from "@/hooks/useDeviceType";
import { createPortal } from "react-dom";

export interface SelectItem {
  id: string;
  label: string;
  showAvatar?: boolean;
  icon?: React.ElementType | string;
  color?: string;
}

export interface SelectGroup {
  id: string;
  label: string;
  color?: string;
  subOptions: SelectItem[];
}

interface SingleSelectProps {
  label?: string;
  groups?: SelectGroup[];
  items?: SelectItem[];
  value?: { groupId?: string; itemId: string } | null;
  onSelect?: (groupId: string | undefined, itemId: string) => void;
  placeholder?: string;
  inputPlaceholder?: string;
  buttonClassName?: string;
  trigger?: React.ReactNode;
  ariaInvalid?: boolean;
  isMinWidth?: boolean;
  fullscreenOnMobile?: boolean;
  isDisplayId?: boolean;
  disabled?: boolean;
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
  ariaInvalid,
  label,
  fullscreenOnMobile = false,
  isDisplayId = false,
  disabled = false
}) => {
  const device = useDeviceType();
  const [open, setOpen] = useState(false);
  const isFullscreenMobile = fullscreenOnMobile && device == 'mobile';
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

  const renderLeading = (
    item?: SelectItem,
    groupColor?: string,
    isSelected?: boolean
  ) => {
    if (!item) return null;

    // 1️⃣ Avatar
    if (item.showAvatar) {
      return <UserAvatar name={item.label} size="md" className="shrink-0" />;
    }

    const baseClasses =
      "w-9 h-9 flex items-center justify-center shrink-0 font-medium text-lg";
    const rounded = !isFullscreenMobile ? "rounded-xl" : "";

    // ===============================
    // STRING ICON ($, ₹, etc.)
    // ===============================
    if (typeof item.icon === "string") {
      return (
        <div
          className={cn(
            baseClasses,
            rounded,
            "bg-muted text-muted-foreground",
            isSelected && "bg-primary text-primary-foreground"
          )}
        >
          {item.icon}
        </div>
      );
    }

    // ===============================
    // COMPONENT ICON (Lucide etc.)
    // ===============================
    if (item.icon) {
      const Icon = item.icon;

      return (
        <div
          className={cn(
            "w-9 h-9 flex items-center justify-center shrink-0",
            !groupColor && "text-muted-foreground",
            isSelected && !groupColor && "text-primary",
            rounded
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
          <Icon className="w-[1.5rem] h-[1.5rem]" />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* ================= FULLSCREEN MOBILE ================= */}
      {isFullscreenMobile && open && !disabled && (
        createPortal(
          <div className="fixed inset-0 z-[60] bg-background !mt-0">
            <Command className="h-full flex flex-col touch-none overscroll-none">

              {/* Header with search */}
              {/* Header */}
              <div className="h-[3rem] px-4 border-b flex items-center justify-start gap-[1.7rem] relative">

                {/* Back button */}
                <button
                  onClick={() => setOpen(false)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Title */}
                <CommandInput
                  placeholder={inputPlaceholder}
                  variant="header"
                  autoFocus
                />

              </div>

              <CommandList className="flex-1 overflow-y-auto">
                <CommandEmpty>No item found.</CommandEmpty>

                {groups?.map((group) => (
                  <CommandGroup key={group.id} heading={group.label}>
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
                            "flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                          )}
                        >
                          {renderLeading(option, group.color, isSelected)}
                          <span className="flex-1 truncate">
                            {option.label}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}

                {items?.map((option) => {
                  const isSelected = value?.itemId === option.id;

                  return (
                    <CommandItem
                      key={option.id}
                      value={option.label}
                      onSelect={() => {
                        onSelect?.(undefined, option.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-xl transition-colors",
                      )}
                    >
                      {renderLeading(option, undefined, isSelected)}
                      <span className="flex-1 flex flex-col leading-tight min-w-0">
                        <span className="truncate">
                          {option.label}
                        </span>
                        {isDisplayId && <span className="text-xs text-muted-foreground">
                          {option.id}
                        </span>
                        }
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandList>
            </Command>
          </div>,
          document.body
        )

      )}

      {/* ================= DESKTOP POPOVER ================= */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger ?? (
            isFullscreenMobile ? (
              // ✅ MOBILE SQUARE ICON BUTTON
              <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(true)}
                // className={cn(
                //   disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                // )}
              >
                {groups?.length ? (
                  // GROUP MODE → show selected item icon/avatar
                  renderLeading(selectedItem, selectedGroup?.color)
                ) : (
                  // ITEMS MODE → show dropdown icon
                  selectedItem
                    ? selectedItem.showAvatar
                      ? (<span className="w-full px-3 py-2.5 text-sm border border-border border-b-2 rounded-[5px] font-medium">{selectedItem?.label}</span>)
                      : renderLeading(selectedItem)
                    : (<span aria-invalid={ariaInvalid}
                      className="w-full px-3 py-2.5 text-sm
                          border border-border border-b-2 rounded-[5px]
                          aria-[invalid=true]:border-red-500
                          aria-[invalid=true]:border-b-red-600">
                      {placeholder}
                    </span>)
                )}
              </button>
            ) : (
              // ✅ NORMAL DESKTOP BUTTON
              <button
                type="button"
                role="combobox"
                aria-invalid={ariaInvalid}
                disabled={disabled}
                className={cn(
                  "w-full h-14 px-4 rounded-xl bg-background hover:bg-accent/50 transition-all border flex items-center",
                  "aria-[invalid=true]:border-destructive",
                  "aria-[invalid=true]:border-transparent",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  // disabled && "opacity-50 cursor-not-allowed bg-muted hover:bg-muted border-border",
                  buttonClassName
                )}
              >
                {/* LEFT CONTENT (icon + text) */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar / Icon */}
                  <div className="shrink-0">
                    {renderLeading(selectedItem!, selectedGroup?.color)}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 text-left">
                    {label && (
                      <p className="text-[11px] font-medium text-muted-foreground leading-none mb-1">
                        {label}
                      </p>
                    )}

                    {selectedItem ? (
                      <p className="text-sm font-medium leading-tight truncate">
                        {selectedItem.label}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground truncate">
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
            )
          )}
        </PopoverTrigger>

        {!isFullscreenMobile && (
          <PopoverContent
            className={cn(
              "w-[--radix-popover-trigger-width] p-0 min-w-[190px]",
            )}
            align="start"
          // avoidCollisions={false}
          >
            <Command>
              {(items && items.length >= 8 || groups) && (
                <CommandInput placeholder={inputPlaceholder} />
              )}

              <CommandList
                className={cn(
                  "max-h-[320px] overflow-y-auto custom-scrollbar",
                  items && !groups ? "px-2 py-3" : "px-0 pt-0"
                )}>
                <CommandEmpty>No item found.</CommandEmpty>

                {groups?.map((group) => (
                  <CommandGroup key={group.id} heading={group.label} className="px-2">
                    {group.subOptions.map((option) => {
                      const isSelected =
                        value?.groupId === group.id &&
                        value?.itemId === option.id;

                      return (
                        <CommandItem
                          key={option.id}
                          value={option.label}
                          keywords={[group.label]}
                          onSelect={() => {
                            onSelect?.(group.id, option.id);
                            setOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition my-[5px]",
                            isSelected
                              ? "bg-primary/10"
                              : "hover:bg-muted"
                          )}
                        >
                          {renderLeading(option, group.color, isSelected)}
                          <span className="flex-1 truncate">
                            {option.label}
                          </span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}

                {items?.map((option) => {
                  const isSelected = value?.itemId === option.id;

                  return (
                    <CommandItem
                      key={option.id}
                      value={option.label}
                      onSelect={() => {
                        onSelect?.(undefined, option.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-xl transition my-[5px]",
                        isSelected ? "bg-primary/10" : "hover:bg-muted",
                      )}
                    >
                      {renderLeading(option, option.color, isSelected)}
                      <span className="flex-1 truncate">{option.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </>
  );
};
