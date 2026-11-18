import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { obterNecessidade } from "@/lib/necessidades";
import { papelNaOrg } from "@/lib/organizacoes";
import { salvarNecessidade } from "@/app/acoes";
import { FormNecessidade } from "@/components/FormNecessidade";
import { Avisos, Titulo, Voltar, lerBusca, type Busca } from "@/components/ui";

export default async function EditarNecessidade({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Busca }) {
  const { id } = await params;
  const u = await exigirUsuario(`/necessidades/${id}/editar`);
  const n = await obterNecessidade(id);
  if (!n || !(await papelNaOrg(u.id, n.organizacao_id))) notFound();
  const { erro } = await lerBusca(searchParams);
  return (
    <div className="mx-auto max-w-2xl">
      <Voltar href={`/organizacoes/${n.organizacao_id}`}>Voltar</Voltar>
      <Titulo>Editar necessidade</Titulo>
      <Avisos erro={erro} />
      <FormNecessidade acao={salvarNecessidade} orgId={n.organizacao_id} n={n} />
    </div>
  );
}
