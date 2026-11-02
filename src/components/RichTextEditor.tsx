import { useEffect, useState } from "react";
import { Extension } from '@tiptap/core';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline, CaseUpper, AlignLeft, AlignCenter, AlignRight, AlignJustify, IndentIncrease, IndentDecrease, Star, Plus, Trash2 } from "lucide-react";
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { plainToRich, richToPlain, tamanhoTexto, type RichNode } from "@/lib/rich-text";

const Indent=Extension.create({name:'paragraphIndent',addGlobalAttributes(){return [{types:['paragraph'],attributes:{indent:{default:0,parseHTML:element=>Number(element.dataset.indent??0),renderHTML:attributes=>({'data-indent':attributes['indent'],style:`margin-left:${Math.min(6,Math.max(0,Number(attributes['indent'])))*8}mm`})}}}];}});

export function RichTextEditor({ text, content, onChange }: {
  text: string; content?: RichNode | undefined; onChange: (text: string, content: RichNode) => void;
}) {
  const [favorites,setFavorites]=useState<{id:string;nome:string;texto:string}[]>([]);
  const [showFavorites,setShowFavorites]=useState(false);const [favoriteName,setFavoriteName]=useState('');
  useEffect(()=>{supabase.from('textos_favoritos').select('id,nome,texto').order('nome').then(({data})=>setFavorites(data??[]));},[]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: false, blockquote: false, bulletList: false,
      orderedList: false, listItem: false, codeBlock: false, code: false,
       horizontalRule: false, strike: false, link: false }),TextAlign.configure({types:['paragraph'],defaultAlignment:'justify'}),TextStyle,FontSize,Indent],
    content: content ?? plainToRich(text),
    editorProps: { attributes: { class: "document-body-text min-h-56 px-3 py-2 text-sm outline-none", role: "textbox", "aria-label": "Texto principal", "aria-multiline": "true" } },
    onUpdate: ({ editor: current }) => { const json = current.getJSON(); onChange(richToPlain(json as RichNode), json as RichNode); },
  });
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    bold: current?.isActive("bold") ?? false, italic: current?.isActive("italic") ?? false,
    underline: current?.isActive("underline") ?? false,
     alignment:current?.getAttributes('paragraph')['textAlign']??'justify',
     fontSize:tamanhoTexto(current?.getAttributes('textStyle')['fontSize']),
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
    ...([{label:'Alinhar à esquerda',icon:AlignLeft,value:'left'},{label:'Centralizar',icon:AlignCenter,value:'center'},{label:'Alinhar à direita',icon:AlignRight,value:'right'},{label:'Justificar',icon:AlignJustify,value:'justify'}].map(c=>({...c,active:state?.alignment===c.value,action:()=>editor?.chain().focus().setTextAlign(c.value).run()}))),
    ...([{label:'Diminuir recuo',icon:IndentDecrease,delta:-1},{label:'Aumentar recuo',icon:IndentIncrease,delta:1}].map(c=>({...c,action:()=>{if(!editor)return;editor.chain().focus().command(({tr,state:current})=>{current.doc.nodesBetween(current.selection.from,current.selection.to,(node,pos)=>{if(node.type.name==='paragraph')tr.setNodeMarkup(pos,undefined,{...node.attrs,indent:Math.min(6,Math.max(0,Number(node.attrs['indent']??0)+c.delta))});});return true;}).run();}}))),
  ];
  return <div className="overflow-hidden rounded-md border border-input bg-card text-card-foreground focus-within:ring-1 focus-within:ring-ring">
     <div className="flex flex-wrap gap-1 border-b bg-muted p-1" role="toolbar" aria-label="Formatação do texto">
      {(controls as {label:string;icon:typeof Bold;active?:boolean|undefined;action:()=>unknown}[]).map(({ label, icon: Icon, active, action }) => <Button key={label} type="button" size="icon" variant={active ? "default" : "ghost"}
        aria-label={label} title={label} aria-pressed={label === "Caixa alta" ? undefined : Boolean(active)} disabled={!editor}
        onMouseDown={(e) => e.preventDefault()} onClick={action}><Icon /></Button>)}
       <Input type="number" min={8} max={36} step={1} aria-label="Tamanho do texto" title="Tamanho do texto em pontos" className="w-16" value={state?.fontSize??12} onChange={e=>editor?.chain().focus().setFontSize(`${tamanhoTexto(e.target.value)}pt`).run()}/>
       <Button type="button" variant="ghost" size="icon" title="Textos favoritos" aria-label="Textos favoritos" onClick={()=>setShowFavorites(s=>!s)}><Star/></Button>
    </div>
     {showFavorites&&<div className="space-y-2 border-b p-2"><div className="flex gap-2"><Input aria-label="Nome do texto favorito" placeholder="Nome do texto favorito" maxLength={100} value={favoriteName} onChange={e=>setFavoriteName(e.target.value)}/><Button type="button" size="icon" variant="outline" aria-label="Favoritar texto selecionado" disabled={!favoriteName.trim()||!editor} onMouseDown={e=>e.preventDefault()} onClick={async()=>{if(!editor)return;const {from,to}=editor.state.selection;const texto=editor.state.doc.textBetween(from,to,'\n');if(!texto.trim()){toast.error('Selecione o texto que deseja favoritar.');return;}const {data,error}=await supabase.from('textos_favoritos').insert({nome:favoriteName.trim(),texto}).select('id,nome,texto').single();if(error||!data)toast.error('Não foi possível salvar favorito.');else{setFavorites(f=>[...f,data]);setFavoriteName('');toast.success('Texto favoritado');}}}><Plus/></Button></div>{favorites.map(f=><div className="flex gap-1" key={f.id}><Button type="button" className="min-w-0 flex-1 justify-start truncate" variant="outline" onClick={()=>editor?.chain().focus().insertContent(plainToRich(f.texto).content??[]).run()}>{f.nome}</Button><Button type="button" size="icon" variant="ghost" aria-label={`Excluir favorito ${f.nome}`} onClick={async()=>{const {error}=await supabase.from('textos_favoritos').delete().eq('id',f.id);if(!error)setFavorites(a=>a.filter(x=>x.id!==f.id));}}><Trash2/></Button></div>)}</div>}
    <EditorContent editor={editor} />
  </div>;
}