import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { listarDisponibilidadesParaAbrigos, obterDisponibilidadeVisivel } from "@/lib/disponibilidades";
import { CATEGORIAS, TIPOS_DISPONIBILIDADE, rotulo } from "@/lib/constantes";
import { terInteresse } from "@/app/acoes";
import { Avisos, Etiqueta, Voltar, dataBr, lerBusca, type Busca } from "@/components/ui";
import { Denunciar } from "@/components/Denunciar";

export default async function DisponibilidadePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Busca }) {
  const { id } = await params;
  const u = await exigirUsuario(`/disponibilidades/${id}`);
  const acesso = await listarDisponibilidadesParaAbrigos(u);
  if (!acesso || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const d = await obterDisponibilidadeVisivel(id);
  if (!d) notFound();
  const { erro, ok } = await lerBusca(searchParams);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <article>
        <Voltar href="/disponibilidades">Todas as ofertas</Voltar>
        <Avisos erro={erro} ok={ok} />
        <div className="mb-3 flex flex-wrap gap-2">
          <Etiqueta>{rotulo(CATEGORIAS, d.categoria)}</Etiqueta>
          <Etiqueta>{rotulo(TIPOS_DISPONIBILIDADE, d.tipo)}</Etiqueta>
        </div>
        <h1 className="text-2xl font-semibold">{d.titulo}</h1>
        <p className="mt-2 text-stone-500">{d.org_nome ?? d.doador_nome ?? "Doador"} · {d.cidade} · publicada em {dataBr(d.criado_em)}</p>
        <p className="mt-6 whitespace-pre-line text-lg text-stone-700">{d.descricao}</p>
        <Denunciar alvoTipo="DISPONIBILIDADE" alvoId={d.id} volta={`/disponibilidades/${d.id}`} />
      </article>
      <aside className="cartao h-fit">
        <h2 className="text-lg font-semibold">Tenho interesse</h2>
        {d.usuario_id === u.id ? (
          <p className="mt-2 text-stone-600">Esta oferta é sua.</p>
        ) : (
          <form action={terInteresse} className="mt-3 space-y-4">
            <input type="hidden" name="disponibilidade" value={d.id} />
            <div>
              <label htmlFor="abrigo" className="rotulo">Em nome de</label>
              <select id="abrigo" name="abrigo" className="campo">
                {acesso.acolhimentos.map((o) => (<option key={o.id} value={o.id}>{o.nome}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="mensagem" className="rotulo">Mensagem ao doador</label>
              <textarea id="mensagem" name="mensagem" required minLength={10} maxLength={1000} rows={4} className="campo"
                placeholder="Ex.: precisamos de 4 berços; podemos buscar." />
              <p className="ajuda">Sem telefone ou e-mail. Se o doador aceitar, vocês recebem o e-mail um do outro.</p>
            </div>
            <button className="botao w-full">Enviar interesse</button>
          </form>
        )}
      </aside>
    </div>
  );
}
