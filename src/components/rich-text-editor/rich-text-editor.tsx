"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Link as LinkIcon,
  ImageIcon,
  Undo,
  Redo,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onImageUpload?: (file: File) => Promise<string>;
};

function Toolbar({ editor, onImageClick }: { editor: Editor | null; onImageClick: () => void }) {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Havola URL:", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 p-1 dark:border-slate-600 dark:bg-slate-800/50">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        title="Qalin (Bold)"
      >
        <Bold className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        title="Yotiq (Italic)"
      >
        <Italic className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Sarlavha 2"
      >
        <Heading2 className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Sarlavha 3"
      >
        <Heading3 className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Ro'yxat"
      >
        <List className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Raqamlangan ro'yxat"
      >
        <ListOrdered className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Iqtibos"
      >
        <Quote className="size-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={setLink} title="Havola">
        <LinkIcon className="size-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onImageClick} title="Rasm">
        <ImageIcon className="size-4" />
      </Button>
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        title="Bekor qilish"
      >
        <Undo className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        title="Qaytarish"
      >
        <Redo className="size-4" />
      </Button>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Matn yozing…",
  minHeight = "180px",
  onImageUpload,
}: RichTextEditorProps) {
  const isInternalChange = useRef(false);
  const prevValueRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[140px] px-3 py-2 text-slate-900 dark:text-slate-100 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-emerald-600 [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded",
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length || !onImageUpload) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        onImageUpload(file).then((url) => {
          editor?.chain().focus().setImage({ src: url }).run();
        });
        return true;
      },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files;
        if (!files?.length || !onImageUpload) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        onImageUpload(file).then((url) => {
          editor?.chain().focus().setImage({ src: url }).run();
        });
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      isInternalChange.current = true;
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== prevValueRef.current && !isInternalChange.current) {
      editor.commands.setContent(value || "", false);
      prevValueRef.current = value;
    }
    isInternalChange.current = false;
  }, [value, editor]);

  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

  const handleImageClick = useCallback(() => {
    if (!onImageUpload) {
      const url = window.prompt("Rasm URL:");
      if (url) editor?.chain().focus().setImage({ src: url }).run();
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      onImageUpload(file).then((url) => {
        editor?.chain().focus().setImage({ src: url }).run();
      });
    };
    input.click();
  }, [editor, onImageUpload]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800">
      <Toolbar editor={editor} onImageClick={handleImageClick} />
      <div style={{ minHeight }} className="border-t border-slate-200 dark:border-slate-600">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
