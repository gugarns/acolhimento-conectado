import { notFound } from "next/navigation";
import { exigirCurador } from "@/lib/auth";
import { obterOrg, membrosDaOrg } from "@/lib/organizacoes";
import { documentosDaOrg } from "@/lib/curadoria";
import { formatarCnpj } from "@/lib/cnpj";
import { STATUS_ORG, TIPOS_ORG, rotulo } from "@/lib/constantes";
import { curadoriaStatusOrg } from "@/app/acoes";
import { Avisos, Etiqueta, Titulo, Voltar, dataBr, lerBusca, type Busca } from "@/components/ui";

export default async function CuradoriaOrg({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Busca }) {
  await exigirCurador();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const org = await obterOrg(id);
  if (!org) notFound();
  const [docs, membros] = await Promise.all([documentosDaOrg(id), membrosDaOrg(id)]);
  const { erro, ok } = await lerBusca(searchParams);
  const receita = org.cnpj_dados;

  return (
    <div className="mx-auto max-w-3xl">
      <Voltar href="/curadoria">Curadoria</Voltar>
      <Titulo sub={rotulo(TIPOS_ORG, org.tipo)}>{org.nome}</Titulo>
      <Avisos erro={erro} ok={ok} />
      <div className="cartao mb-6">
        <dl className="grid grid-cols-[180px_1fr] gap-y-2 text-sm">
          <dt className="text-stone-500">Situação</dt><dd><Etiqueta valor={org.status}>{rotulo(STATUS_ORG, org.status)}</Etiqueta> {org.motivo_status}</dd>
          <dt className="text-stone-500">CNPJ</dt><dd>{formatarCnpj(org.cnpj)}</dd>
          <dt className="text-stone-500">Receita (BrasilAPI)</dt>
          <dd>{receita ? `${receita.razaoSocial ?? ""} · ${receita.situacao ?? ""} · ${receita.municipio ?? ""}/${receita.uf ?? ""}` : "Consulta indisponível: conferir manualmente"}</dd>
          <dt className="text-stone-500">E-mail institucional</dt><dd>{org.email_institucional}</dd>
          <dt className="text-stone-500">Telefone institucional</dt><dd>{org.telefone_institucional ?? "—"}</dd>
          <dt className="text-stone-500">Bairro</dt><dd>{org.bairro ?? "—"}</dd>
          <dt className="text-stone-500">Sigiloso</dt><dd>{org.sigilosa ? "Sim" : "Não"}</dd>
          <dt className="text-stone-500">Cadastro</dt><dd>{dataBr(org.criado_em)}</dd>
          <dt className="text-stone-500">Equipe</dt><dd>{membros.map((m) => `${m.nome ?? m.email} (${m.papel.toLowerCase()})`).join(", ")}</dd>
        </dl>
      </div>

      <div className="cartao mb-6">
        <h2 className="mb-2 font-semibold">Documentos</h2>
        {docs.length === 0 ? <p className="text-stone-500">Nenhum documento enviado.</p> : (
          <ul className="space-y-1 text-sm">
            {docs.map((d) => (
              <li key={d.id}>
                {d.tipo}: <a className="link" href={`/curadoria/documentos/${d.id}`} target="_blank">{d.nome_arquivo}</a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 rounded-lg bg-calor-100 p-3 text-sm text-stone-700">
          Antes de aprovar, confirme por um canal independente: ligue para o telefone oficial da entidade ou do CMDCA, não para o número informado no cadastro.
        </p>
      </div>

      <form action={curadoriaStatusOrg} className="cartao space-y-3">
        <input type="hidden" name="org" value={org.id} />
        <h2 className="font-semibold">Decisão</h2>
        <div>
          <label htmlFor="motivo" className="rotulo">Motivo ou observação (obrigatório para reprovar ou suspender)</label>
          <textarea id="motivo" name="motivo" rows={2} className="campo" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button name="status" value="VERIFICADO" className="botao">Verificar</button>
          <button name="status" value="PARCEIRO" className="botao-sec">Marcar como parceiro</button>
          <button name="status" value="REPROVADO" className="botao-perigo">Reprovar</button>
          <button name="status" value="SUSPENSO" className="botao-perigo">Suspender</button>
        </div>
        <p className="text-sm text-stone-500">A organização é avisada no e-mail institucional. Toda decisão fica registrada.</p>
      </form>
    </div>
  );
}
