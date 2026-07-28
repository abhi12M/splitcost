"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";
import { useEffect } from "react";

import { useTheme } from "next-themes";

const THEME_STORAGE_KEY = "splitcost-theme";
const savedThemes = new Set(["light", "dark", "system"]);

function ThemePreferenceSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const syncTheme = () => {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

      if (savedTheme && savedThemes.has(savedTheme)) {
        setTheme(savedTheme);
      }
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") {
        syncTheme();
      }
    };

    window.addEventListener("pageshow", syncTheme);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      window.removeEventListener("pageshow", syncTheme);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [setTheme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
      {...props}
    >
      <ThemePreferenceSync />
      {children}
    </NextThemesProvider>
  );
}
