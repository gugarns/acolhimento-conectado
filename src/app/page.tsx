import Link from "next/link";
import { listarFeed } from "@/lib/necessidades";
import { CATEGORIAS, URGENCIAS } from "@/lib/constantes";
import { CartaoNecessidade } from "@/components/CartaoNecessidade";
import { Avisos, Vazio, lerBusca, type Busca } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Inicio({ searchParams }: { searchParams: Busca }) {
  const { erro, ok, pegar } = await lerBusca(searchParams);
  const filtros = { categoria: pegar("categoria"), urgencia: pegar("urgencia"), busca: pegar("busca") };
  const necessidades = await listarFeed(filtros);
  return (
    <>
      <Avisos erro={erro} ok={ok} />
      <section className="mb-8 rounded-2xl bg-marca-700 px-6 py-8 text-white sm:px-10">
        <h1 className="max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">
          Veja do que os serviços de acolhimento de Maceió precisam e ofereça sua ajuda.
        </h1>
        <p className="mt-3 max-w-2xl text-marca-50">
          Todos os serviços são verificados pela curadoria do MPE/AL. Quando o serviço aceita seu pedido, vocês recebem o e-mail um
          do outro e combinam a doação diretamente.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/disponibilidades/nova" className="rounded-lg bg-white px-4 py-2 font-medium text-marca-800 hover:bg-marca-50">
            Tenho algo para oferecer
          </Link>
          <Link href="/organizacoes/nova" className="rounded-lg border border-white/50 px-4 py-2 font-medium hover:bg-white/10">
            Sou de um serviço de acolhimento
          </Link>
        </div>
      </section>

      <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <label className="sr-only" htmlFor="busca">Buscar</label>
        <input id="busca" name="busca" defaultValue={filtros.busca} placeholder="Buscar (ex.: mochila, fralda)" className="campo" />
        <label className="sr-only" htmlFor="categoria">Categoria</label>
        <select id="categoria" name="categoria" defaultValue={filtros.categoria ?? ""} className="campo">
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIAS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="urgencia">Urgência</label>
        <select id="urgencia" name="urgencia" defaultValue={filtros.urgencia ?? ""} className="campo">
          <option value="">Qualquer urgência</option>
          {Object.entries(URGENCIAS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button className="botao">Filtrar</button>
      </form>

      {necessidades.length === 0 ? (
        <Vazio>Nenhuma necessidade aberta com esses filtros no momento.</Vazio>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {necessidades.map((n) => (
            <CartaoNecessidade key={n.id} n={n} />
          ))}
        </div>
      )}
    </>
  );
}
