"use client";

import dynamic from "next/dynamic";

type BlogEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const InitializedBlogMdxEditor = dynamic(
  () =>
    import("./InitializedBlogMdxEditor").then(
      (mod) => mod.InitializedBlogMdxEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[420px] rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        Loading editor...
      </div>
    ),
  }
);

export function BlogEditor(props: BlogEditorProps) {
  return <InitializedBlogMdxEditor {...props} />;
}
