"use client";

import Link from "next/link";
import { ArrowLeft, Check, Eye } from "lucide-react";
import { ReactNode } from "react";

import { BrandIcon } from "@/components/brand/BrandIcon";
import { Button } from "@/components/ui/button";
import { ADMIN_BASE_PATH } from "@/lib/constants";

type BlogEditorShellProps = {
  children: ReactNode;
  footer: ReactNode;
  saveStatus: "idle" | "saving" | "saved" | "error";
  savedLabel?: string;
  onPreview?: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  saving: boolean;
};

export function BlogEditorShell({
  children,
  footer,
  saveStatus,
  savedLabel,
  onPreview,
  onSaveDraft,
  onPublish,
  saving,
}: BlogEditorShellProps) {
  return (
    <div className="fixed inset-0 z-0 flex flex-col overflow-hidden bg-muted/30">
      <header className="z-30 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 min-w-0 items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link href={ADMIN_BASE_PATH} className="shrink-0">
              <BrandIcon height={28} />
            </Link>
            <Link
              href={`${ADMIN_BASE_PATH}/blogs`}
              className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">Back to blogs</span>
            </Link>
          </div>

          <div className="hidden shrink-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
            {saveStatus === "saving" ? (
              <span>Saving...</span>
            ) : saveStatus === "saved" ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{savedLabel ?? "Saved"}</span>
              </>
            ) : saveStatus === "error" ? (
              <span className="text-destructive">Save failed</span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onPreview} disabled={!onPreview}>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onSaveDraft} disabled={saving}>
              <span className="hidden sm:inline">Save draft</span>
              <span className="sm:hidden">Draft</span>
            </Button>
            <Button type="button" size="sm" onClick={onPublish} disabled={saving}>
              Publish
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>

      <footer className="z-20 shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {footer}
      </footer>
    </div>
  );
}
