import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { obterOrg, papelNaOrg } from "@/lib/organizacoes";
import { publicarNecessidade } from "@/app/acoes";
import { FormNecessidade } from "@/components/FormNecessidade";
import { Avisos, Titulo, Voltar, lerBusca, type Busca } from "@/components/ui";

export default async function NovaNecessidade({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Busca }) {
  const { id } = await params;
  const u = await exigirUsuario(`/organizacoes/${id}/necessidades/nova`);
  const org = await obterOrg(id);
  if (!org || !(await papelNaOrg(u.id, id))) notFound();
  const { erro } = await lerBusca(searchParams);
  return (
    <div className="mx-auto max-w-2xl">
      <Voltar href={`/organizacoes/${id}`}>{org.nome}</Voltar>
      <Titulo>Nova necessidade</Titulo>
      <Avisos erro={erro} />
      <FormNecessidade acao={publicarNecessidade} orgId={id} />
    </div>
  );
}
