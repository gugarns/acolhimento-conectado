import Link from "next/link";
import { exigirCurador } from "@/lib/auth";
import { conteudosEmRevisao, denunciasAbertas, metricas, orgsParaCuradoria } from "@/lib/curadoria";
import { STATUS_ORG, TIPOS_ORG, rotulo } from "@/lib/constantes";
import { curadoriaDenuncia, curadoriaModerar } from "@/app/acoes";
import { Avisos, Etiqueta, Titulo, Vazio, dataBr, lerBusca, type Busca } from "@/components/ui";

export const metadata = { title: "Curadoria" };

const ROTULOS_METRICAS: Record<string, string> = {
  acolhimentos_ativos: "Serviços verificados",
  orgs_pendentes: "Cadastros pendentes",
  usuarios: "Usuários",
  necessidades_abertas: "Necessidades abertas",
  necessidades_atendidas: "Necessidades atendidas",
  disponibilidades_ativas: "Ofertas ativas",
  conexoes: "Conexões pedidas",
  conexoes_aceitas: "Conexões aceitas",
  retornos_deu_certo: "Retornos “deu certo”",
  denuncias_abertas: "Denúncias abertas",
};

const LINK_ALVO: Record<string, (id: string) => string> = {
  NECESSIDADE: (id) => `/necessidades/${id}`,
  ORGANIZACAO: (id) => `/curadoria/organizacoes/${id}`,
  CONEXAO: (id) => `/conexoes/${id}`,
  DISPONIBILIDADE: (id) => `/disponibilidades/${id}`,
};

export default async function Curadoria({ searchParams }: { searchParams: Busca }) {
  await exigirCurador();
  const { erro, ok } = await lerBusca(searchParams);
  const [m, orgs, revisao, denuncias] = await Promise.all([metricas(), orgsParaCuradoria(), conteudosEmRevisao(), denunciasAbertas()]);
  return (
    <>
      <Titulo sub="Verificação de serviços, moderação e denúncias. Curadoria do piloto: MPE/AL.">Curadoria</Titulo>
      <Avisos erro={erro} ok={ok} />

      <dl className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(ROTULOS_METRICAS).map(([k, rot]) => (
          <div key={k} className="cartao p-4">
            <dt className="text-xs text-stone-500">{rot}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{m[k]}</dd>
          </div>
        ))}
      </dl>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Denúncias abertas</h2>
        {denuncias.length === 0 ? <Vazio>Nenhuma denúncia aberta.</Vazio> : (
          <ul className="space-y-3">
            {denuncias.map((d) => (
              <li key={d.id} className="cartao">
                <p className="text-sm text-stone-500">
                  {d.alvo_tipo} · {dataBr(d.criado_em)} · por {d.autor ?? "anônimo"} ·{" "}
                  <Link className="link" href={LINK_ALVO[d.alvo_tipo](d.alvo_id)}>ver alvo</Link>
                </p>
                <p className="mt-2 whitespace-pre-line">{d.motivo}</p>
                <form action={curadoriaDenuncia} className="mt-3 flex gap-2">
                  <input type="hidden" name="id" value={d.id} />
                  <button name="decisao" value="procedente" className="botao-perigo text-sm">Procedente (ocultar/suspender)</button>
                  <button name="decisao" value="improcedente" className="botao-sec text-sm">Improcedente</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold">Textos em revisão</h2>
        <p className="mb-3 text-sm text-stone-500">O filtro automático segurou estes textos porque podem identificar uma criança ou situação sensível.</p>
        {revisao.length === 0 ? <Vazio>Nada aguardando revisão.</Vazio> : (
          <ul className="space-y-3">
            {revisao.map((r) => (
              <li key={r.id} className="cartao">
                <p className="text-sm text-stone-500">{r.tipo === "NECESSIDADE" ? "Necessidade" : "Oferta"} · {r.autor} · {dataBr(r.criado_em)}</p>
                <p className="mt-1 font-medium">{r.titulo}</p>
                <p className="mt-1 whitespace-pre-line text-stone-700">{r.descricao}</p>
                <form action={curadoriaModerar} className="mt-3 flex gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="tipo" value={r.tipo} />
                  <button name="decisao" value="aprovar" className="botao text-sm">Aprovar</button>
                  <button name="decisao" value="ocultar" className="botao-perigo text-sm">Ocultar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Organizações</h2>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr><th className="px-4 py-2">Nome</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Situação</th><th className="px-4 py-2">Docs</th><th className="px-4 py-2">Cadastro</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2"><Link className="link" href={`/curadoria/organizacoes/${o.id}`}>{o.nome}</Link></td>
                  <td className="px-4 py-2">{rotulo(TIPOS_ORG, o.tipo)}</td>
                  <td className="px-4 py-2"><Etiqueta valor={o.status}>{rotulo(STATUS_ORG, o.status)}</Etiqueta></td>
                  <td className="px-4 py-2 tabular-nums">{o.documentos}</td>
                  <td className="px-4 py-2">{dataBr(o.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
