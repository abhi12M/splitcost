"use client";

import {
  AdmonitionDirectiveDescriptor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ButtonWithTooltip,
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
  NestedLexicalEditor,
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
  insertDirective$,
  insertMarkdown$,
  jsxPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type DirectiveDescriptor,
} from "@mdxeditor/editor";
import { usePublisher } from "@mdxeditor/gurx";
import type { ContainerDirective } from "mdast-util-directive";
import "@mdxeditor/editor/style.css";
import { Lightbulb, Quote } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

type InitializedBlogMdxEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onImageUpload: (image: File) => Promise<string>;
};

const InsightDirectiveDescriptor: DirectiveDescriptor<ContainerDirective> = {
  name: "insight",
  type: "containerDirective",
  attributes: [],
  hasChildren: true,
  testNode: (node) => node.name === "insight",
  Editor({ mdastNode }) {
    return (
      <aside className="blog-editor-insight">
        <div className="blog-editor-insight-heading" contentEditable={false}>
          <span className="blog-editor-insight-icon">
            <Lightbulb aria-hidden="true" />
          </span>
          <span>Insight</span>
        </div>
        <NestedLexicalEditor<ContainerDirective>
          block
          getContent={(node) => node.children}
          getUpdatedMdastNode={(node, children) => ({
            ...node,
            children: children as ContainerDirective["children"],
          })}
        />
      </aside>
    );
  },
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

function InsertInsight() {
  const insertDirective = usePublisher(insertDirective$);

  return (
    <ButtonWithTooltip
      title="Insert insight"
      aria-label="Insert insight"
      onClick={() => {
        insertDirective({
          type: "containerDirective",
          name: "insight",
        });
      }}
    >
      <Lightbulb aria-hidden="true" />
    </ButtonWithTooltip>
  );
}

function InsertQuote() {
  const insertMarkdown = usePublisher(insertMarkdown$);

  return (
    <ButtonWithTooltip
      title="Insert quote"
      aria-label="Insert quote"
      onClick={() => insertMarkdown("\n> Add a thoughtful quote here.\n\n")}
    >
      <Quote aria-hidden="true" />
    </ButtonWithTooltip>
  );
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
                <InsertQuote />
                <InsertInsight />
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

export function InitializedBlogMdxEditor({
  value,
  onChange,
  onImageUpload,
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
      imagePlugin({ imageUploadHandler: onImageUpload }),
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
        directiveDescriptors: [InsightDirectiveDescriptor, AdmonitionDirectiveDescriptor],
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
    [onImageUpload]
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
