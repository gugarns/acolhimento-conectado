import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { ehAcolhimento, membrosDaOrg, nomePublico, obterOrg, orgAtiva, papelNaOrg } from "@/lib/organizacoes";
import { necessidadesDaOrg } from "@/lib/necessidades";
import { formatarCnpj } from "@/lib/cnpj";
import { CATEGORIAS, STATUS_NECESSIDADE, STATUS_ORG, TIPOS_ORG, rotulo } from "@/lib/constantes";
import { adicionarPessoa, mudarStatusNecessidade, removerPessoa } from "@/app/acoes";
import { Avisos, Etiqueta, Titulo, Vazio, dataBr, lerBusca, type Busca } from "@/components/ui";

export default async function OrgPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Busca }) {
  const { id } = await params;
  const u = await exigirUsuario(`/organizacoes/${id}`);
  const org = await obterOrg(id);
  const papel = org ? await papelNaOrg(u.id, id) : null;
  if (!org || !papel) notFound();
  const { erro, ok } = await lerBusca(searchParams);
  const [necessidades, membros] = await Promise.all([ehAcolhimento(org) ? necessidadesDaOrg(id) : [], membrosDaOrg(id)]);
  const ativa = orgAtiva(org);

  return (
    <>
      <Titulo sub={`${rotulo(TIPOS_ORG, org.tipo)} · CNPJ ${formatarCnpj(org.cnpj)}`}>{org.nome}</Titulo>
      <Avisos erro={erro} ok={ok} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="cartao">
          <p className="text-sm text-stone-500">Situação</p>
          <p className="mt-1"><Etiqueta valor={org.status}>{rotulo(STATUS_ORG, org.status)}</Etiqueta></p>
          {org.status === "PENDENTE" && <p className="mt-2 text-sm text-stone-600">A curadoria do MPE/AL está analisando os documentos. Vocês recebem um e-mail com o resultado.</p>}
          {org.motivo_status && !ativa && <p className="mt-2 text-sm text-stone-600">Motivo: {org.motivo_status}</p>}
        </div>
        <div className="cartao">
          <p className="text-sm text-stone-500">Como aparece ao público</p>
          <p className="mt-1 font-medium">{nomePublico(org)}</p>
        </div>
        <div className="cartao">
          <p className="text-sm text-stone-500">Contato liberado após aceite</p>
          <p className="mt-1 break-all font-medium">{org.email_institucional}</p>
        </div>
      </div>

      {ehAcolhimento(org) && (
        <section className="mb-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Necessidades</h2>
            <div className="flex gap-2">
              {ativa && <Link href="/disponibilidades" className="botao-sec text-sm">Ver ofertas de doadores</Link>}
              {ativa && <Link href={`/organizacoes/${id}/necessidades/nova`} className="botao text-sm">Nova necessidade</Link>}
            </div>
          </div>
          {necessidades.length === 0 ? (
            <Vazio>{ativa ? "Nenhuma necessidade publicada ainda." : "Depois da verificação, vocês poderão publicar necessidades aqui."}</Vazio>
          ) : (
            <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
              {necessidades.map((n) => (
                <li key={n.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/necessidades/${n.id}`} className="font-medium hover:underline">{n.titulo}</Link>
                    <p className="text-sm text-stone-500">
                      {rotulo(CATEGORIAS, n.categoria)} · até {dataBr(n.prazo)} · {n.pedidos_abertos} pedido(s) aguardando
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Etiqueta valor={n.status}>{rotulo(STATUS_NECESSIDADE, n.status)}</Etiqueta>
                      {n.em_revisao && <Etiqueta valor="PENDENTE">Em revisão pela curadoria</Etiqueta>}
                      {n.oculta && <Etiqueta valor="SUSPENSO">Oculta pela curadoria</Etiqueta>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={mudarStatusNecessidade} className="flex gap-2">
                      <input type="hidden" name="id" value={n.id} />
                      <input type="hidden" name="org" value={id} />
                      <label className="sr-only" htmlFor={`st-${n.id}`}>Status</label>
                      <select id={`st-${n.id}`} name="status" defaultValue={n.status === "EXPIRADA" ? "ENCERRADA" : n.status} className="campo py-1.5 text-sm">
                        {(["ABERTA", "PARCIAL", "ATENDIDA", "ENCERRADA"] as const).map((s) => (<option key={s} value={s}>{STATUS_NECESSIDADE[s]}</option>))}
                      </select>
                      <button className="botao-sec text-sm">Atualizar</button>
                    </form>
                    <Link href={`/necessidades/${n.id}/editar`} className="text-sm link">Editar</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-stone-500">
            Pedidos de conexão aparecem no seu <Link href="/painel" className="link">painel</Link> e chegam por e-mail.
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Equipe</h2>
        <ul className="mb-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {membros.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3">
              <span>
                {m.nome ?? m.email} <span className="text-sm text-stone-500">· {m.papel === "GESTOR" ? "Gestor(a)" : "Membro"}</span>
              </span>
              {papel === "GESTOR" && m.papel === "MEMBRO" && (
                <form action={removerPessoa}>
                  <input type="hidden" name="org" value={id} />
                  <input type="hidden" name="usuario" value={m.id} />
                  <button className="text-sm text-red-700 hover:underline">Remover</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {papel === "GESTOR" && (
          <form action={adicionarPessoa} className="flex max-w-md gap-2">
            <input type="hidden" name="org" value={id} />
            <label className="sr-only" htmlFor="email-membro">E-mail</label>
            <input id="email-membro" name="email" type="email" required placeholder="email@da-pessoa" className="campo" />
            <button className="botao-sec shrink-0">Adicionar</button>
          </form>
        )}
      </section>
    </>
  );
}
