"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

type ThemeToggleProps = {
  align?: "start" | "center" | "end";
  className?: string;
};

export function ThemeToggle({ align = "end", className }: ThemeToggleProps) {
  const t = useTranslations("theme");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeTheme = theme ?? "system";
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0", className)}
          aria-label={t("appearance")}
        >
          <Sun
            className={cn(
              "h-[1.15rem] w-[1.15rem] transition-all",
              isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
            )}
          />
          <Moon
            className={cn(
              "absolute h-[1.15rem] w-[1.15rem] transition-all",
              isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-40">
        {themes.map(({ value, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="gap-2"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">{t(value)}</span>
            {activeTheme === value ? (
              <Check className="h-4 w-4 text-primary" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeMenuItems() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();

  const activeTheme = theme ?? "system";

  return (
    <>
      {themes.map(({ value, icon: Icon }) => (
        <DropdownMenuItem
          key={value}
          onClick={() => setTheme(value)}
          className="gap-2"
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{t(value)}</span>
          {activeTheme === value ? (
            <Check className="h-4 w-4 text-primary" aria-hidden />
          ) : null}
        </DropdownMenuItem>
      ))}
    </>
  );
}
