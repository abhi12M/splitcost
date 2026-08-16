"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { DATA_STALE_TIME_MS } from "@/lib/queryConfig";

export default function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache aggressively across navigations so view -> edit -> save
            // -> back-to-dashboard reuses what we already fetched. We still
            // refetch in the background after mutations invalidate the key.
            staleTime: DATA_STALE_TIME_MS,
            gcTime: 5 * 60_000,
            // Avoid the "fetch every time the tab regains focus" double-fetch
            // pattern that React Query enables by default.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
