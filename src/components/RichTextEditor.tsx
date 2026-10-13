import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline, CaseUpper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { plainToRich, richToPlain, type RichNode } from "@/lib/rich-text";

export function RichTextEditor({ text, content, onChange }: {
  text: string; content?: RichNode | undefined; onChange: (text: string, content: RichNode) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: false, blockquote: false, bulletList: false,
      orderedList: false, listItem: false, codeBlock: false, code: false,
      horizontalRule: false, strike: false, link: false })],
    content: content ?? plainToRich(text),
    editorProps: { attributes: { class: "document-body-text min-h-56 px-3 py-2 text-sm outline-none", role: "textbox", "aria-label": "Texto principal", "aria-multiline": "true" } },
    onUpdate: ({ editor: current }) => { const json = current.getJSON(); onChange(richToPlain(json), json); },
  });
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    bold: current?.isActive("bold") ?? false, italic: current?.isActive("italic") ?? false,
    underline: current?.isActive("underline") ?? false,
  }) });
  useEffect(() => {
    if (!editor) return;
    const next = content ?? plainToRich(text);
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(next)) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, text, content]);

  function uppercase() {
    if (!editor) return;
    editor.chain().focus().command(({ tr, state: current }) => {
      const { from, to, empty } = current.selection;
      const start = empty ? 0 : from, end = empty ? current.doc.content.size : to;
      const replacements: { from: number; to: number; text: string }[] = [];
      current.doc.nodesBetween(start, end, (node, pos) => {
        if (!node.isText || !node.text) return;
        const a = Math.max(start, pos), b = Math.min(end, pos + node.nodeSize);
        replacements.push({ from: a, to: b, text: node.text.slice(a - pos, b - pos).toLocaleUpperCase("pt-BR") });
      });
      replacements.reverse().forEach((item) => tr.insertText(item.text, item.from, item.to));
      return true;
    }).run();
  }
  const controls = [
    { label: "Negrito", icon: Bold, active: state?.bold, action: () => editor?.chain().focus().toggleBold().run() },
    { label: "Itálico", icon: Italic, active: state?.italic, action: () => editor?.chain().focus().toggleItalic().run() },
    { label: "Sublinhado", icon: Underline, active: state?.underline, action: () => editor?.chain().focus().toggleUnderline().run() },
    { label: "Caixa alta", icon: CaseUpper, action: uppercase },
  ];
  return <div className="overflow-hidden rounded-md border border-input bg-card text-card-foreground focus-within:ring-1 focus-within:ring-ring">
    <div className="flex gap-1 border-b bg-muted p-1" role="toolbar" aria-label="Formatação do texto">
      {controls.map(({ label, icon: Icon, active, action }) => <Button key={label} type="button" size="icon" variant={active ? "default" : "ghost"}
        aria-label={label} title={label} aria-pressed={label === "Caixa alta" ? undefined : Boolean(active)} disabled={!editor}
        onMouseDown={(e) => e.preventDefault()} onClick={action}><Icon /></Button>)}
    </div>
    <EditorContent editor={editor} />
  </div>;
}