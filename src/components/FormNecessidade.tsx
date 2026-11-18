import { CATEGORIAS, FAIXAS_ETARIAS, URGENCIAS } from "@/lib/constantes";
import type { Necessidade } from "@/lib/necessidades";

export function FormNecessidade({
  acao,
  orgId,
  n,
}: {
  acao: (fd: FormData) => Promise<void>;
  orgId: string;
  n?: Necessidade;
}) {
  const prazoPadrao = n ? new Date(n.prazo).toISOString().slice(0, 10) : new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  return (
    <form action={acao} className="cartao space-y-5">
      <input type="hidden" name="org" value={orgId} />
      {n && <input type="hidden" name="id" value={n.id} />}
      <div className="rounded-lg bg-calor-100 p-4 text-sm text-stone-800">
        <strong>Proteja as crianças:</strong> descreva a necessidade do serviço, de forma agregada. Não use nome, idade exata,
        foto, história ou motivo do acolhimento. Escreva “3 mochilas para ensino fundamental”, nunca “mochila para o João, 9 anos”.
      </div>
      <div>
        <label htmlFor="titulo" className="rotulo">Título</label>
        <input id="titulo" name="titulo" required minLength={5} maxLength={120} defaultValue={n?.titulo} className="campo"
          placeholder="Ex.: Mochilas para o ensino fundamental" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="categoria" className="rotulo">Categoria</label>
          <select id="categoria" name="categoria" required defaultValue={n?.categoria ?? ""} className="campo">
            <option value="" disabled>Escolha</option>
            {Object.entries(CATEGORIAS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div>
          <label htmlFor="urgencia" className="rotulo">Urgência</label>
          <select id="urgencia" name="urgencia" defaultValue={n?.urgencia ?? "MEDIA"} className="campo">
            {Object.entries(URGENCIAS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="descricao" className="rotulo">Descrição</label>
        <textarea id="descricao" name="descricao" required minLength={10} maxLength={2000} rows={5} defaultValue={n?.descricao}
          className="campo" placeholder="Tamanhos, modelo, se aceita usado em bom estado, como pode ser entregue…" />
        <p className="ajuda">Não coloque telefone, e-mail nem endereço. O contato é liberado depois que vocês aceitarem uma conexão.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="quantidade" className="rotulo">Quantidade (opcional)</label>
          <input id="quantidade" name="quantidade" type="number" min={1} defaultValue={n?.quantidade ?? ""} className="campo" />
        </div>
        <div>
          <label htmlFor="faixa_etaria" className="rotulo">Faixa etária (opcional)</label>
          <select id="faixa_etaria" name="faixa_etaria" defaultValue={n?.faixa_etaria ?? ""} className="campo">
            <option value="">Não se aplica</option>
            {Object.entries(FAIXAS_ETARIAS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div>
          <label htmlFor="valor_referencia" className="rotulo">Valor de referência em R$ (opcional)</label>
          <input id="valor_referencia" name="valor_referencia" inputMode="decimal" defaultValue={n?.valor_referencia ?? ""} className="campo" />
          <p className="ajuda">Só para orientar o doador. Nenhum pagamento passa pelo app.</p>
        </div>
        <div>
          <label htmlFor="prazo" className="rotulo">Precisa até</label>
          <input id="prazo" name="prazo" type="date" required defaultValue={prazoPadrao} className="campo" />
        </div>
      </div>
      <button className="botao w-full">{n ? "Salvar alterações" : "Publicar necessidade"}</button>
    </form>
  );
}
