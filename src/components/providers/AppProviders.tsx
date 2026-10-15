"use client";

import { ReactNode } from "react";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AttachmentUploadFailureToasts } from "@/components/expense/AttachmentUploadFailureToasts";
import { SyncProvider, SyncStatusIndicator } from "@/components/sync/SyncStatus";
import { ImageFallback } from "@/components/sync/ImageFallback";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <AttachmentUploadFailureToasts />
        <SyncProvider />
        <SyncStatusIndicator />
        <ImageFallback />
        {children}
      </TooltipProvider>
    </ThemeProvider>
  );
}
