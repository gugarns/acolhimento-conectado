import Link from "next/link";
import { notFound } from "next/navigation";
import { obterNecessidadePublica } from "@/lib/necessidades";
import { usuarioAtual } from "@/lib/auth";
import { localPublico, nomePublico, orgsDoUsuario } from "@/lib/organizacoes";
import { CATEGORIAS, DIAS_EXPIRACAO_CONEXAO, FAIXAS_ETARIAS, URGENCIAS, rotulo } from "@/lib/constantes";
import { Avisos, Etiqueta, Voltar, dataBr, dinheiro, lerBusca, type Busca } from "@/components/ui";
import { Denunciar } from "@/components/Denunciar";
import { quererAjudar } from "@/app/acoes";

export default async function NecessidadePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Busca }) {
  const { id } = await params;
  const { erro, ok } = await lerBusca(searchParams);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const n = await obterNecessidadePublica(id);
  if (!n) notFound();
  const u = await usuarioAtual();
  const minhasOrgs = u ? await orgsDoUsuario(u.id) : [];
  const souDaEquipe = minhasOrgs.some((o) => o.id === n.organizacao_id);
  const instituicoesDoadoras = minhasOrgs.filter((o) => o.tipo === "DOADOR_INSTITUICAO" && ["VERIFICADO", "PARCEIRO"].includes(o.status));
  const org = { tipo: n.org_tipo, nome: n.org_nome, sigilosa: n.org_sigilosa, cidade: n.org_cidade, bairro: n.org_bairro };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <article>
        <Voltar href="/">Todas as necessidades</Voltar>
        <Avisos erro={erro} ok={ok} />
        <div className="mb-3 flex flex-wrap gap-2">
          <Etiqueta>{rotulo(CATEGORIAS, n.categoria)}</Etiqueta>
          <Etiqueta valor={n.urgencia === "ALTA" ? "ALTA" : undefined}>{rotulo(URGENCIAS, n.urgencia)}</Etiqueta>
          {n.org_status === "PARCEIRO" && <Etiqueta valor="PARCEIRO">Serviço parceiro</Etiqueta>}
        </div>
        <h1 className="text-2xl font-semibold text-stone-900 sm:text-3xl">{n.titulo}</h1>
        <p className="mt-2 text-stone-500">
          {nomePublico(org)} · {localPublico(org)} · <span className="text-marca-700">✓ verificado pela curadoria</span>
        </p>
        <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-stone-700">{n.descricao}</p>
        <dl className="mt-6 grid max-w-md grid-cols-2 gap-y-2 text-stone-700">
          {n.quantidade && (<><dt className="text-stone-500">Quantidade</dt><dd>{n.quantidade}</dd></>)}
          {n.faixa_etaria && (<><dt className="text-stone-500">Faixa etária</dt><dd>{rotulo(FAIXAS_ETARIAS, n.faixa_etaria)}</dd></>)}
          {n.valor_referencia && (<><dt className="text-stone-500">Valor de referência</dt><dd>{dinheiro(n.valor_referencia)}</dd></>)}
          <dt className="text-stone-500">Precisa até</dt><dd>{dataBr(n.prazo)}</dd>
          <dt className="text-stone-500">Atualizada em</dt><dd>{dataBr(n.atualizado_em)}</dd>
        </dl>
        <Denunciar alvoTipo="NECESSIDADE" alvoId={n.id} volta={`/necessidades/${n.id}`} />
      </article>

      <aside className="cartao h-fit">
        <h2 className="text-lg font-semibold">Quero ajudar</h2>
        {souDaEquipe ? (
          <p className="mt-2 text-stone-600">Esta necessidade é da sua organização.</p>
        ) : !u ? (
          <>
            <p className="mt-2 text-stone-600">Entre com seu e-mail para pedir a conexão. Não precisa de senha.</p>
            <Link href={`/entrar?volta=/necessidades/${n.id}`} className="botao mt-4 w-full">Entrar e ajudar</Link>
          </>
        ) : (
          <form action={quererAjudar} className="mt-3 space-y-4">
            <input type="hidden" name="necessidade" value={n.id} />
            <div>
              <label htmlFor="mensagem" className="rotulo">Conte como pode ajudar</label>
              <textarea id="mensagem" name="mensagem" required minLength={10} maxLength={1000} rows={4} className="campo"
                placeholder="Ex.: posso doar 10 das 30 mochilas até o fim do mês." />
              <p className="ajuda">Não coloque telefone nem e-mail: o contato é liberado pelo app se o serviço aceitar.</p>
            </div>
            {instituicoesDoadoras.length > 0 && (
              <div>
                <label htmlFor="doador_org" className="rotulo">Em nome de</label>
                <select id="doador_org" name="doador_org" className="campo">
                  <option value="">Eu mesmo(a)</option>
                  {instituicoesDoadoras.map((o) => (<option key={o.id} value={o.id}>{o.nome}</option>))}
                </select>
              </div>
            )}
            <button className="botao w-full">Enviar pedido de conexão</button>
            <p className="text-sm text-stone-500">
              O serviço tem {DIAS_EXPIRACAO_CONEXAO} dias para responder. Se aceitar, vocês recebem o e-mail um do outro e combinam
              tudo diretamente. O app não intermedia a doação.
            </p>
          </form>
        )}
      </aside>
    </div>
  );
}
