import Link from "next/link";
import { CATEGORIAS, FAIXAS_ETARIAS, URGENCIAS, rotulo } from "@/lib/constantes";
import type { NecessidadePublica } from "@/lib/necessidades";
import { localPublico, nomePublico } from "@/lib/organizacoes";
import { Etiqueta, dataBr, dinheiro } from "./ui";

export function CartaoNecessidade({ n }: { n: NecessidadePublica }) {
  const org = { tipo: n.org_tipo, nome: n.org_nome, sigilosa: n.org_sigilosa, cidade: n.org_cidade, bairro: n.org_bairro };
  return (
    <Link href={`/necessidades/${n.id}`} className="cartao flex flex-col gap-3 transition hover:border-marca-600">
      <div className="flex flex-wrap gap-2">
        <Etiqueta>{rotulo(CATEGORIAS, n.categoria)}</Etiqueta>
        {n.urgencia === "ALTA" && <Etiqueta valor="ALTA">{URGENCIAS.ALTA}</Etiqueta>}
        {n.status === "PARCIAL" && <Etiqueta valor="PARCIAL">Parcialmente atendida</Etiqueta>}
      </div>
      <h2 className="text-lg font-semibold text-stone-900">{n.titulo}</h2>
      <p className="line-clamp-3 text-stone-600">{n.descricao}</p>
      <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-stone-600">
        {n.quantidade && (
          <>
            <dt className="text-stone-400">Quantidade</dt>
            <dd>{n.quantidade}</dd>
          </>
        )}
        {n.faixa_etaria && (
          <>
            <dt className="text-stone-400">Faixa etária</dt>
            <dd>{rotulo(FAIXAS_ETARIAS, n.faixa_etaria)}</dd>
          </>
        )}
        {n.valor_referencia && (
          <>
            <dt className="text-stone-400">Valor de referência</dt>
            <dd>{dinheiro(n.valor_referencia)}</dd>
          </>
        )}
        <dt className="text-stone-400">Até</dt>
        <dd>{dataBr(n.prazo)}</dd>
      </dl>
      <p className="border-t border-stone-100 pt-3 text-sm text-stone-500">
        {nomePublico(org)} · {localPublico(org)}
      </p>
    </Link>
  );
}
