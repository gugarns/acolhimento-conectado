import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { verConexao } from "@/lib/conexoes";
import { STATUS_CONEXAO, rotulo } from "@/lib/constantes";
import { darRetorno, responder } from "@/app/acoes";
import { Avisos, Etiqueta, Titulo, Voltar, dataBr, lerBusca, type Busca } from "@/components/ui";
import { Denunciar } from "@/components/Denunciar";

export const metadata = { title: "Conexão" };

export default async function ConexaoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Busca }) {
  const { id } = await params;
  const u = await exigirUsuario(`/conexoes/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const v = await verConexao(u, id);
  if (!v) notFound();
  const { erro, ok } = await lerBusca(searchParams);
  const c = v.conexao;
  const outraParte = v.papel === "DOADOR" ? v.abrigoNome : v.doadorNome;

  return (
    <div className="mx-auto max-w-2xl">
      <Voltar href="/painel">Meu painel</Voltar>
      <Titulo sub={c.direcao === "A" ? "Pedido de um doador para uma necessidade" : "Interesse de um serviço numa oferta"}>{v.titulo}</Titulo>
      <Avisos erro={erro} ok={ok} />

      <div className="cartao space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-stone-600">{v.papel === "CURADOR" ? `${v.abrigoNome} ↔ ${v.doadorNome}` : `Com: ${outraParte}`}</span>
          <Etiqueta valor={c.status}>{rotulo(STATUS_CONEXAO, c.status)}</Etiqueta>
        </div>
        <blockquote className="rounded-lg bg-stone-50 p-4 whitespace-pre-line text-stone-700">{c.mensagem}</blockquote>
        <p className="text-sm text-stone-500">
          Enviado em {dataBr(c.criado_em)}
          {c.status === "SOLICITADA" && ` · expira em ${dataBr(c.expira_em)}`}
          {c.respondida_em && ` · respondido em ${dataBr(c.respondida_em)}`}
        </p>

        {v.podeResponder && (
          <div className="border-t border-stone-100 pt-4">
            <p className="mb-3 text-stone-700">
              {v.papel === "ABRIGO"
                ? "Se aceitar, o doador recebe o e-mail institucional do serviço e vocês recebem o e-mail dele."
                : "Se aceitar, o serviço recebe o seu e-mail e você recebe o e-mail institucional dele."}
            </p>
            <form action={responder} className="flex gap-3">
              <input type="hidden" name="conexao" value={c.id} />
              <button name="resposta" value="aceitar" className="botao">Aceitar conexão</button>
              <button name="resposta" value="recusar" className="botao-sec">Recusar</button>
            </form>
          </div>
        )}
        {c.status === "SOLICITADA" && !v.podeResponder && v.papel !== "CURADOR" && (
          <p className="border-t border-stone-100 pt-4 text-stone-600">Aguardando a resposta da outra parte. Você recebe um e-mail quando houver resposta.</p>
        )}
      </div>

      {c.status === "ACEITA" && (v.abrigoEmail || v.doadorEmail) && (
        <div className="cartao mt-6 border-marca-600">
          <h2 className="text-lg font-semibold">Contato liberado</h2>
          <p className="mt-2 text-stone-700">
            {v.papel === "DOADOR" ? "E-mail institucional do serviço: " : "E-mail do doador: "}
            <a className="link break-all" href={`mailto:${v.abrigoEmail ?? v.doadorEmail}`}>{v.abrigoEmail ?? v.doadorEmail}</a>
          </p>
          <p className="mt-3 text-sm text-stone-600">
            Combinem diretamente por e-mail o que, quanto, como e quando. O Acolhimento Conectado não intermedia doações.
          </p>
          {v.papel === "DOADOR" && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Entregue na recepção ou onde o serviço indicar. Visitas só nas regras do serviço.</li>
              <li>Não fotografe crianças nem leve presentes para uma criança específica.</li>
              <li>Doações em dinheiro só para conta no CNPJ da instituição, nunca de pessoa física. <Link href="/seguranca" className="link">Saiba mais</Link>.</li>
            </ul>
          )}
        </div>
      )}

      {c.status === "ACEITA" && v.papel !== "CURADOR" && (
        <div className="cartao mt-6">
          <h2 className="font-semibold">A conexão deu certo?</h2>
          <p className="mt-1 text-sm text-stone-500">Serve só para medirmos o impacto do app.</p>
          <form action={darRetorno} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="conexao" value={c.id} />
            {([["SIM", "Sim"], ["CONVERSANDO", "Ainda conversando"], ["NAO", "Não"]] as const).map(([valor, texto]) => (
              <button key={valor} name="resposta" value={valor} className={v.meuRetorno === valor ? "botao" : "botao-sec"}>{texto}</button>
            ))}
          </form>
        </div>
      )}

      {v.papel !== "CURADOR" && <Denunciar alvoTipo="CONEXAO" alvoId={c.id} volta={`/conexoes/${c.id}`} />}
    </div>
  );
}
