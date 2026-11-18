import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { listarDisponibilidadesParaAbrigos } from "@/lib/disponibilidades";
import { CATEGORIAS, TIPOS_DISPONIBILIDADE, rotulo } from "@/lib/constantes";
import { Avisos, Etiqueta, Titulo, Vazio, dataBr, lerBusca, type Busca } from "@/components/ui";

export const metadata = { title: "Ofertas de doadores" };

export default async function Disponibilidades({ searchParams }: { searchParams: Busca }) {
  const u = await exigirUsuario("/disponibilidades");
  const { erro, ok, pegar } = await lerBusca(searchParams);
  const r = await listarDisponibilidadesParaAbrigos(u, pegar("categoria"));
  if (!r) {
    return (
      <>
        <Titulo>Ofertas de doadores</Titulo>
        <Vazio>Esta página é só para equipes de serviços de acolhimento verificados.</Vazio>
      </>
    );
  }
  return (
    <>
      <Titulo sub="Visível só para serviços de acolhimento verificados. O contato do doador é liberado se ele aceitar o seu interesse.">
        Ofertas de doadores
      </Titulo>
      <Avisos erro={erro} ok={ok} />
      <form className="mb-6 flex max-w-md gap-2">
        <label className="sr-only" htmlFor="categoria">Categoria</label>
        <select id="categoria" name="categoria" defaultValue={pegar("categoria") ?? ""} className="campo">
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIAS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
        <button className="botao-sec">Filtrar</button>
      </form>
      {r.itens.length === 0 ? (
        <Vazio>Nenhuma oferta ativa no momento.</Vazio>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {r.itens.map((d) => (
            <Link key={d.id} href={`/disponibilidades/${d.id}`} className="cartao block hover:border-marca-600">
              <div className="mb-2 flex flex-wrap gap-2">
                <Etiqueta>{rotulo(CATEGORIAS, d.categoria)}</Etiqueta>
                <Etiqueta>{rotulo(TIPOS_DISPONIBILIDADE, d.tipo)}</Etiqueta>
              </div>
              <h2 className="font-semibold">{d.titulo}</h2>
              <p className="mt-1 line-clamp-3 text-stone-600">{d.descricao}</p>
              <p className="mt-3 text-sm text-stone-500">{d.org_nome ?? d.doador_nome ?? "Doador"} · {d.cidade} · {dataBr(d.criado_em)}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
