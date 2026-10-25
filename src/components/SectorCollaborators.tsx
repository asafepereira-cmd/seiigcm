import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Colab = { id: string; nome: string; funcao: string };

/** Cadastro de colaboradores — exibido apenas em painéis de setor. */
export function SectorCollaborators() {
  const [uid, setUid] = useState<string | null>(null);
  const [lista, setLista] = useState<Colab[]>([]);
  const [nome, setNome] = useState("");
  const [funcao, setFuncao] = useState("");

  const load = (id: string) =>
    supabase.from("setor_colaboradores").select("id,nome,funcao").eq("setor_user_id", id).order("nome")
      .then(({ data }) => setLista(data ?? []));

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id;
      if (!id) return;
      const { data: p } = await supabase.from("paineis").select("tipo_painel").eq("user_id", id).maybeSingle();
      if (p?.tipo_painel !== "setor") return;
      setUid(id);
      load(id);
    });
  }, []);

  if (!uid) return null;
  return (
    <section className="space-y-3 rounded-lg bg-card p-4 text-card-foreground">
      <h2 className="font-bold">Colaboradores do setor</h2>
      <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase.from("setor_colaboradores").insert({ setor_user_id: uid, nome: nome.trim(), funcao: funcao.trim() });
        if (error) { toast.error("Não foi possível cadastrar."); return; }
        setNome(""); setFuncao(""); toast.success("Colaborador cadastrado"); load(uid);
      }}>
        <Input aria-label="Nome completo" placeholder="Nome completo" required minLength={3} maxLength={200} value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input aria-label="Função" placeholder="Função" required minLength={2} maxLength={200} value={funcao} onChange={(e) => setFuncao(e.target.value)} />
        <Button type="submit">Cadastrar</Button>
      </form>
      {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>}
      {lista.map((c) => (
        <div key={c.id} className="flex items-center gap-2 border-b pb-2">
          <p className="mr-auto text-sm"><b>{c.nome}</b> · {c.funcao}</p>
          <Button size="icon" variant="outline" aria-label={`Remover ${c.nome}`} onClick={async () => {
            if (!confirm(`Remover ${c.nome}?`)) return;
            const { error } = await supabase.from("setor_colaboradores").delete().eq("id", c.id);
            if (error) toast.error("Não foi possível remover."); else load(uid);
          }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </section>
  );
}
