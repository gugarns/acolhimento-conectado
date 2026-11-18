import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { orgsDoUsuario, nomePublico } from "@/lib/organizacoes";
import { conexoesDoUsuario, quemResponde } from "@/lib/conexoes";
import { disponibilidadesDoUsuario } from "@/lib/disponibilidades";
import { STATUS_CONEXAO, STATUS_ORG, TIPOS_ORG, TIPOS_DISPONIBILIDADE, rotulo } from "@/lib/constantes";
import { Avisos, Etiqueta, Titulo, Vazio, dataBr, lerBusca, type Busca } from "@/components/ui";
import { encerrarOferta } from "@/app/acoes";

export const metadata = { title: "Meu painel" };

export default async function Painel({ searchParams }: { searchParams: Busca }) {
  const u = await exigirUsuario("/painel");
  const { erro, ok } = await lerBusca(searchParams);
  const [orgs, conexoes, ofertas] = await Promise.all([orgsDoUsuario(u.id), conexoesDoUsuario(u.id), disponibilidadesDoUsuario(u.id)]);
  const temAcolhimento = orgs.some((o) => o.tipo !== "DOADOR_INSTITUICAO" && ["VERIFICADO", "PARCEIRO"].includes(o.status));

  return (
    <>
      <Titulo sub={`Olá, ${u.nome?.split(" ")[0] ?? ""}.`}>Meu painel</Titulo>
      <Avisos erro={erro} ok={ok} />

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Conexões</h2>
        {conexoes.length === 0 ? (
          <Vazio>
            Nenhuma conexão ainda. <Link href="/" className="link">Veja as necessidades abertas</Link>.
          </Vazio>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {conexoes.map((c) => {
              const aguardaVoce = c.status === "SOLICITADA" && quemResponde(c) === c.papel;
              return (
                <li key={c.id}>
                  <Link href={`/conexoes/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-stone-50">
                    <span>
                      <span className="font-medium">{c.titulo}</span>
                      <span className="block text-sm text-stone-500">
                        {c.papel === "DOADOR"
                          ? nomePublico({ tipo: c.abrigo_tipo as never, nome: c.abrigo_nome, sigilosa: c.abrigo_sigilosa, cidade: c.abrigo_cidade })
                          : "Pedido de um doador"}{" "}
                        · {dataBr(c.criado_em)}
                      </span>
                    </span>
                    {aguardaVoce ? <Etiqueta valor="ALTA">Aguarda sua resposta</Etiqueta> : <Etiqueta valor={c.status}>{rotulo(STATUS_CONEXAO, c.status)}</Etiqueta>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Minhas ofertas</h2>
          <Link href="/disponibilidades/nova" className="botao-sec text-sm">Nova oferta</Link>
        </div>
        {ofertas.length === 0 ? (
          <Vazio>Você ainda não publicou o que pode oferecer.</Vazio>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {ofertas.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="font-medium">{d.titulo}</span>
                  <span className="block text-sm text-stone-500">
                    {rotulo(TIPOS_DISPONIBILIDADE, d.tipo)} · {d.pedidos_abertos} interesse(s) aguardando
                    {d.em_revisao && " · em revisão pela curadoria"}
                    {d.oculta && " · oculta pela curadoria"}
                  </span>
                </span>
                {d.status === "ATIVA" ? (
                  <form action={encerrarOferta}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="botao-sec text-sm">Encerrar</button>
                  </form>
                ) : (
                  <Etiqueta valor="ENCERRADA">Encerrada</Etiqueta>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Minhas organizações</h2>
          <Link href="/organizacoes/nova" className="botao-sec text-sm">Cadastrar organização</Link>
        </div>
        {orgs.length === 0 ? (
          <Vazio>Você não faz parte de nenhuma organização. Serviços de acolhimento e instituições doadoras podem se cadastrar.</Vazio>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {orgs.map((o) => (
              <li key={o.id}>
                <Link href={`/organizacoes/${o.id}`} className="cartao block hover:border-marca-600">
                  <span className="font-medium">{o.nome}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500">
                    {rotulo(TIPOS_ORG, o.tipo)} <Etiqueta valor={o.status}>{rotulo(STATUS_ORG, o.status)}</Etiqueta>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {temAcolhimento && (
          <p className="mt-4">
            <Link href="/disponibilidades" className="link">Ver o que doadores estão oferecendo →</Link>
          </p>
        )}
      </section>
    </>
  );
}
