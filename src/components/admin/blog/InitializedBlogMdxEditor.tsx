"use client";

import {
  AdmonitionDirectiveDescriptor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ChangeAdmonitionType,
  ChangeCodeMirrorLanguage,
  CodeToggle,
  ConditionalContents,
  CreateLink,
  DiffSourceToggleWrapper,
  HighlightToggle,
  InsertAdmonition,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  type EditorInFocus,
  type MDXEditorMethods,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  directivesPlugin,
  frontmatterPlugin,
  headingsPlugin,
  imagePlugin,
  jsxPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { useEffect, useMemo, useRef } from "react";

type InitializedBlogMdxEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

function whenInAdmonition(editorInFocus: EditorInFocus | null) {
  const node = editorInFocus?.rootNode;
  if (!node || node.getType() !== "directive") {
    return false;
  }

  if (!("getMdastNode" in node) || typeof node.getMdastNode !== "function") {
    return false;
  }

  const mdastNode = node.getMdastNode() as { name?: string };
  return ["note", "tip", "danger", "info", "caution"].includes(mdastNode.name ?? "");
}

function BlogEditorToolbar() {
  return (
    <DiffSourceToggleWrapper options={["rich-text", "source"]}>
      <ConditionalContents
        options={[
          {
            when: (editor) => editor?.editorType === "codeblock",
            contents: () => <ChangeCodeMirrorLanguage />,
          },
          {
            fallback: () => (
              <>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <HighlightToggle />
                <Separator />
                <ListsToggle options={["bullet", "number"]} />
                <Separator />
                <ConditionalContents
                  options={[
                    { when: whenInAdmonition, contents: () => <ChangeAdmonitionType /> },
                    { fallback: () => <BlockTypeSelect /> },
                  ]}
                />
                <Separator />
                <CreateLink />
                <InsertImage />
                <Separator />
                <InsertTable />
                <InsertThematicBreak />
                <Separator />
                <InsertCodeBlock />
                <ConditionalContents
                  options={[
                    {
                      when: (editorInFocus) => !whenInAdmonition(editorInFocus),
                      contents: () => (
                        <>
                          <Separator />
                          <InsertAdmonition />
                        </>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />
    </DiffSourceToggleWrapper>
  );
}

async function uploadBlogImage(image: File) {
  const form = new FormData();
  form.append("file", image);

  const response = await fetch("/api/blog-images", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error("Unable to upload image");
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

export function InitializedBlogMdxEditor({
  value,
  onChange,
}: InitializedBlogMdxEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);

  const plugins = useMemo(
    () => [
      headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4, 5, 6] }),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      imagePlugin({ imageUploadHandler: uploadBlogImage }),
      tablePlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: "js" }),
      codeMirrorPlugin({
        codeBlockLanguages: {
          js: "JavaScript",
          jsx: "JavaScript (React)",
          ts: "TypeScript",
          tsx: "TypeScript (React)",
          css: "CSS",
          html: "HTML",
          json: "JSON",
          md: "Markdown",
          bash: "Bash",
        },
      }),
      directivesPlugin({
        directiveDescriptors: [AdmonitionDirectiveDescriptor],
      }),
      frontmatterPlugin(),
      jsxPlugin({ jsxComponentDescriptors: [], allowFragment: true }),
      diffSourcePlugin({ viewMode: "rich-text" }),
      markdownShortcutPlugin(),
      toolbarPlugin({
        toolbarClassName:
          "flex max-w-full flex-wrap gap-1 overflow-x-hidden rounded-t-lg border bg-muted/40 p-2",
        toolbarContents: () => <BlogEditorToolbar />,
      }),
    ],
    []
  );

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getMarkdown()) {
      editorRef.current.setMarkdown(value || "");
    }
  }, [value]);

  return (
    <MDXEditor
      ref={editorRef}
      markdown={value || ""}
      onChange={(markdown, initialMarkdownNormalize) => {
        if (!initialMarkdownNormalize) onChange(markdown);
      }}
      onError={({ error }) => {
        console.error("MDX editor parse error:", error);
      }}
      plugins={plugins}
      placeholder="Write the article..."
      className="blog-mdx-editor flex min-h-0 flex-1 max-w-full flex-col overflow-hidden rounded-lg border bg-background [&_.cm-editor]:h-full [&_.cm-editor]:min-h-0 [&_.cm-scroller]:min-h-0 [&_.cm-scroller]:overflow-auto [&_.mdxeditor-diff-source-wrapper]:flex [&_.mdxeditor-diff-source-wrapper]:min-h-0 [&_.mdxeditor-diff-source-wrapper]:flex-1 [&_.mdxeditor-diff-source-wrapper]:overflow-hidden [&_.mdxeditor-rich-text-editor]:min-h-0 [&_.mdxeditor-rich-text-editor]:flex-1 [&_.mdxeditor-rich-text-editor]:overflow-y-auto [&_.mdxeditor-source-editor]:min-h-0 [&_.mdxeditor-source-editor]:flex-1 [&_.mdxeditor-source-editor]:overflow-hidden [&_[role=toolbar]]:max-w-full [&_[role=toolbar]]:flex-wrap"
      contentEditableClassName="blog-editor-content prose prose-slate dark:prose-invert min-h-full max-w-none flex-1 overflow-y-auto p-4 sm:p-6 focus:outline-none"
    />
  );
}
