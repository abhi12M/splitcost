"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type BlogEditorProps = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
};

type ImageAttrs = {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
};

const ImageWithMeta = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
      class: { default: "blog-content-image rounded-xl" },
    };
  },
});

export function BlogEditor({ value, onChange, className }: BlogEditorProps) {
  const [imageOpen, setImageOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [imageWidth, setImageWidth] = useState("");
  const [imageHeight, setImageHeight] = useState("");
  const [imageError, setImageError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",
        },
      }),
      ImageWithMeta,
      Placeholder.configure({
        placeholder: "Write your article… Markdown shortcuts like ## and ** work too.",
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-slate dark:prose-invert max-w-none min-h-[320px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
      lastEmitted.current = value;
    }
  }, [editor, value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previous || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }, [editor]);

  const uploadImage = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !editor) return;

    setUploading(true);
    setImageError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (imageAlt) formData.append("alt", imageAlt);
      if (imageCaption) formData.append("caption", imageCaption);
      if (imageWidth) formData.append("width", imageWidth);
      if (imageHeight) formData.append("height", imageHeight);

      const response = await fetch("/api/blog-images", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed");
      }

      const parsedWidth = Number(payload.width || imageWidth);
      const parsedHeight = Number(payload.height || imageHeight);
      const attrs: ImageAttrs = {
        src: payload.url,
        alt: payload.alt || imageAlt || undefined,
        title: payload.caption || imageCaption || undefined,
        width: Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : undefined,
        height:
          Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : undefined,
      };

      editor.chain().focus().setImage(attrs).run();
      setImageOpen(false);
      setImageAlt("");
      setImageCaption("");
      setImageWidth("");
      setImageHeight("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!editor) return null;

  const tools = [
    {
      label: "Bold",
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      label: "Italic",
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    {
      label: "Underline",
      icon: UnderlineIcon,
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive("underline"),
    },
    {
      label: "Heading 2",
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
    },
    {
      label: "Heading 3",
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
    },
    {
      label: "Bullet list",
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
    },
    {
      label: "Ordered list",
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
    },
    {
      label: "Quote",
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
    },
  ];

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.label}
              type="button"
              size="icon"
              variant={tool.active ? "default" : "ghost"}
              className="h-8 w-8"
              onClick={tool.action}
              aria-label={tool.label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={setLink}
          aria-label="Insert link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setImageOpen(true)}
          aria-label="Insert image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent editor={editor} />

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="blog-image-file">Image file</Label>
              <Input id="blog-image-file" ref={fileRef} type="file" accept="image/*" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blog-image-alt">Alt text</Label>
              <Input
                id="blog-image-alt"
                value={imageAlt}
                onChange={(event) => setImageAlt(event.target.value)}
                placeholder="Describe the image for SEO and accessibility"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blog-image-caption">Caption / title</Label>
              <Input
                id="blog-image-caption"
                value={imageCaption}
                onChange={(event) => setImageCaption(event.target.value)}
                placeholder="Optional caption"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="blog-image-width">Width</Label>
                <Input
                  id="blog-image-width"
                  value={imageWidth}
                  onChange={(event) => setImageWidth(event.target.value)}
                  placeholder="e.g. 800"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-image-height">Height</Label>
                <Input
                  id="blog-image-height"
                  value={imageHeight}
                  onChange={(event) => setImageHeight(event.target.value)}
                  placeholder="e.g. 450"
                  inputMode="numeric"
                />
              </div>
            </div>
            {imageError ? (
              <p className="text-sm text-destructive">{imageError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImageOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={uploadImage} disabled={uploading}>
              {uploading ? "Uploading…" : "Insert image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
