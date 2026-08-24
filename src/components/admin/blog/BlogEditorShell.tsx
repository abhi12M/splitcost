"use client";

import Link from "next/link";
import { ArrowLeft, Check, Eye, Trash2 } from "lucide-react";
import { ReactNode } from "react";

import { BrandIcon } from "@/components/brand/BrandIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BlogStatus } from "@/lib/blog/types";
import { ADMIN_BASE_PATH } from "@/lib/constants";

type BlogEditorShellProps = {
  children: ReactNode;
  footer: ReactNode;
  saveStatus: "idle" | "saving" | "saved" | "error";
  savedLabel?: string;
  blogStatus: BlogStatus;
  hasDraftChanges?: boolean;
  onPreview?: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onDelete?: () => void;
  saving: boolean;
};

export function BlogEditorShell({
  children,
  footer,
  saveStatus,
  savedLabel,
  blogStatus,
  hasDraftChanges = false,
  onPreview,
  onSaveDraft,
  onPublish,
  onDelete,
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
              prefetch={false}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                  return;
                }
                event.preventDefault();
                // A document navigation bypasses the App Router's stale
                // client cache after saving or publishing from this editor.
                window.location.assign(`${ADMIN_BASE_PATH}/blogs?updated=${Date.now()}`);
              }}
              className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">Back to blogs</span>
            </Link>
            {hasDraftChanges ? (
              <div className="flex items-center gap-1.5">
                <Badge>Published</Badge>
                <Badge variant="secondary">Draft changes</Badge>
              </div>
            ) : (
              <Badge variant={blogStatus === "published" ? "default" : "secondary"}>
                {blogStatus === "published" ? "Published" : "Draft"}
              </Badge>
            )}
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
            {onDelete ? (
              <Button type="button" variant="destructive" size="sm" onClick={onDelete} disabled={saving}>
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            ) : null}
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
