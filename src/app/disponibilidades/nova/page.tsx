import { exigirUsuario } from "@/lib/auth";
import { orgsDoUsuario } from "@/lib/organizacoes";
import { publicarDisponibilidade } from "@/app/acoes";
import { CATEGORIAS, TIPOS_DISPONIBILIDADE } from "@/lib/constantes";
import { Avisos, Titulo, lerBusca, type Busca } from "@/components/ui";

export const metadata = { title: "Oferecer ajuda" };

export default async function NovaDisponibilidade({ searchParams }: { searchParams: Busca }) {
  const u = await exigirUsuario("/disponibilidades/nova");
  const { erro } = await lerBusca(searchParams);
  const instituicoes = (await orgsDoUsuario(u.id)).filter(
    (o) => o.tipo === "DOADOR_INSTITUICAO" && ["VERIFICADO", "PARCEIRO"].includes(o.status),
  );
  return (
    <div className="mx-auto max-w-2xl">
      <Titulo sub="Conte o que você pode oferecer. Só serviços de acolhimento verificados veem sua oferta, e seu e-mail só é liberado se você aceitar o interesse de um deles.">
        Oferecer ajuda
      </Titulo>
      <Avisos erro={erro} />
      <form action={publicarDisponibilidade} className="cartao space-y-5">
        <div>
          <label htmlFor="titulo" className="rotulo">O que você oferece</label>
          <input id="titulo" name="titulo" required minLength={5} maxLength={120} className="campo"
            placeholder="Ex.: Consultas odontológicas gratuitas" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tipo" className="rotulo">Tipo</label>
            <select id="tipo" name="tipo" required className="campo">
              {Object.entries(TIPOS_DISPONIBILIDADE).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="categoria" className="rotulo">Categoria</label>
            <select id="categoria" name="categoria" required defaultValue="" className="campo">
              <option value="" disabled>Escolha</option>
              {Object.entries(CATEGORIAS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="descricao" className="rotulo">Detalhes</label>
          <textarea id="descricao" name="descricao" required minLength={10} maxLength={2000} rows={5} className="campo"
            placeholder="Quantidade, estado (novo ou usado), quando e como pode entregar…" />
          <p className="ajuda">Não coloque telefone nem e-mail. Valores e entregas são combinados diretamente depois do aceite.</p>
        </div>
        {instituicoes.length > 0 && (
          <div>
            <label htmlFor="organizacao_id" className="rotulo">Em nome de</label>
            <select id="organizacao_id" name="organizacao_id" className="campo">
              <option value="">Eu mesmo(a)</option>
              {instituicoes.map((o) => (<option key={o.id} value={o.id}>{o.nome}</option>))}
            </select>
          </div>
        )}
        <button className="botao w-full">Publicar oferta</button>
      </form>
    </div>
  );
}
