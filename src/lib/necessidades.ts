import { sql } from "./db";
import { falhar } from "./erros";
import { CATEGORIAS, FAIXAS_ETARIAS, STATUS_NECESSIDADE, URGENCIAS } from "./constantes";
import { moderarTextoPublico } from "./moderacao";
import { ehAcolhimento, obterOrg, orgAtiva, papelNaOrg, type UsuarioRef } from "./organizacoes";

export type Necessidade = {
  id: string;
  organizacao_id: string;
  titulo: string;
  categoria: string;
  descricao: string;
  quantidade: number | null;
  faixa_etaria: string | null;
  valor_referencia: string | null;
  prazo: Date;
  urgencia: string;
  status: string;
  em_revisao: boolean;
  oculta: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type NecessidadePublica = Necessidade & {
  org_tipo: "ABRIGO" | "FAMILIA_ACOLHEDORA" | "DOADOR_INSTITUICAO";
  org_nome: string;
  org_sigilosa: boolean;
  org_cidade: string;
  org_bairro: string | null;
  org_status: string;
};

export type DadosNecessidade = {
  titulo: string;
  categoria: string;
  descricao: string;
  quantidade?: number | null;
  faixa_etaria?: string | null;
  valor_referencia?: number | null;
  prazo: string; // AAAA-MM-DD
  urgencia: string;
};

function validar(d: DadosNecessidade): { revisar: boolean } {
  const titulo = d.titulo.trim();
  if (titulo.length < 5 || titulo.length > 120) falhar("O título deve ter entre 5 e 120 caracteres.");
  if (d.descricao.trim().length < 10 || d.descricao.length > 2000) falhar("A descrição deve ter entre 10 e 2.000 caracteres.");
  if (!(d.categoria in CATEGORIAS)) falhar("Categoria inválida.");
  if (!(d.urgencia in URGENCIAS)) falhar("Urgência inválida.");
  if (d.faixa_etaria && !(d.faixa_etaria in FAIXAS_ETARIAS)) falhar("Faixa etária inválida.");
  if (d.quantidade != null && (!Number.isInteger(d.quantidade) || d.quantidade < 1 || d.quantidade > 100000))
    falhar("Quantidade inválida.");
  if (d.valor_referencia != null && (isNaN(d.valor_referencia) || d.valor_referencia < 0 || d.valor_referencia > 1_000_000))
    falhar("Valor de referência inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.prazo)) falhar("Informe o prazo.");
  const prazo = new Date(`${d.prazo}T23:59:59-03:00`);
  const hoje = new Date();
  if (prazo < hoje) falhar("O prazo precisa ser uma data futura.");
  if (prazo.getTime() - hoje.getTime() > 180 * 864e5) falhar("O prazo máximo é de 180 dias. Depois você pode renovar.");
  const mod = moderarTextoPublico(d.titulo, d.descricao);
  if (!mod.ok) falhar(mod.motivo);
  return { revisar: mod.revisar };
}

async function exigirEquipeAtiva(usuario: UsuarioRef, orgId: string) {
  const org = await obterOrg(orgId);
  if (!org) falhar("Organização não encontrada.");
  if (!(await papelNaOrg(usuario.id, orgId))) falhar("Você não faz parte desta organização.");
  if (!ehAcolhimento(org)) falhar("Só serviços de acolhimento publicam necessidades.");
  if (!orgAtiva(org)) falhar("A organização precisa estar verificada para publicar.");
  return org;
}

export async function criarNecessidade(usuario: UsuarioRef, orgId: string, d: DadosNecessidade) {
  await exigirEquipeAtiva(usuario, orgId);
  const { revisar } = validar(d);
  const [n] = await sql<Necessidade[]>`
    insert into necessidade (organizacao_id, titulo, categoria, descricao, quantidade, faixa_etaria,
                             valor_referencia, prazo, urgencia, em_revisao, criado_por)
    values (${orgId}, ${d.titulo.trim()}, ${d.categoria}, ${d.descricao.trim()}, ${d.quantidade ?? null},
            ${d.faixa_etaria || null}, ${d.valor_referencia ?? null}, ${d.prazo}, ${d.urgencia}, ${revisar}, ${usuario.id})
    returning *`;
  return n;
}

export async function obterNecessidade(id: string): Promise<Necessidade | null> {
  const [n] = await sql<Necessidade[]>`select * from necessidade where id = ${id}`;
  return n ?? null;
}

export async function editarNecessidade(usuario: UsuarioRef, id: string, d: DadosNecessidade) {
  const atual = await obterNecessidade(id);
  if (!atual) falhar("Necessidade não encontrada.");
  await exigirEquipeAtiva(usuario, atual.organizacao_id);
  const { revisar } = validar(d);
  await sql`
    update necessidade set titulo = ${d.titulo.trim()}, categoria = ${d.categoria}, descricao = ${d.descricao.trim()},
      quantidade = ${d.quantidade ?? null}, faixa_etaria = ${d.faixa_etaria || null},
      valor_referencia = ${d.valor_referencia ?? null}, prazo = ${d.prazo}, urgencia = ${d.urgencia},
      em_revisao = ${revisar}, status = case when status = 'EXPIRADA' then 'ABERTA' else status end,
      atualizado_em = now()
    where id = ${id}`;
}

export async function atualizarStatusNecessidade(usuario: UsuarioRef, id: string, status: string) {
  if (!["ABERTA", "PARCIAL", "ATENDIDA", "ENCERRADA"].includes(status) || !(status in STATUS_NECESSIDADE))
    falhar("Status inválido.");
  const atual = await obterNecessidade(id);
  if (!atual) falhar("Necessidade não encontrada.");
  if (!(await papelNaOrg(usuario.id, atual.organizacao_id))) falhar("Você não faz parte desta organização.");
  await sql`update necessidade set status = ${status}, atualizado_em = now() where id = ${id}`;
}

const CONDICAO_PUBLICA = sql`
  n.status in ('ABERTA','PARCIAL') and not n.oculta and not n.em_revisao
  and n.prazo >= current_date and o.status in ('VERIFICADO','PARCEIRO')`;

export type FiltrosFeed = { categoria?: string; urgencia?: string; busca?: string };

export async function listarFeed(f: FiltrosFeed = {}, limite = 60): Promise<NecessidadePublica[]> {
  const categoria = f.categoria && f.categoria in CATEGORIAS ? f.categoria : null;
  const urgencia = f.urgencia && f.urgencia in URGENCIAS ? f.urgencia : null;
  const busca = f.busca?.trim() ? `%${f.busca.trim().replace(/[%_\\]/g, "")}%` : null;
  return sql<NecessidadePublica[]>`
    select n.*, o.tipo as org_tipo, o.nome as org_nome, o.sigilosa as org_sigilosa, o.cidade as org_cidade,
           o.bairro as org_bairro, o.status as org_status
    from necessidade n join organizacao o on o.id = n.organizacao_id
    where ${CONDICAO_PUBLICA}
      and (${categoria}::text is null or n.categoria = ${categoria})
      and (${urgencia}::text is null or n.urgencia = ${urgencia})
      and (${busca}::text is null or n.titulo ilike ${busca} or n.descricao ilike ${busca})
    order by case n.urgencia when 'ALTA' then 0 when 'MEDIA' then 1 else 2 end,
             (o.status = 'PARCEIRO') desc, n.prazo asc
    limit ${limite}`;
}

export async function obterNecessidadePublica(id: string): Promise<NecessidadePublica | null> {
  const [n] = await sql<NecessidadePublica[]>`
    select n.*, o.tipo as org_tipo, o.nome as org_nome, o.sigilosa as org_sigilosa, o.cidade as org_cidade,
           o.bairro as org_bairro, o.status as org_status
    from necessidade n join organizacao o on o.id = n.organizacao_id
    where n.id = ${id} and ${CONDICAO_PUBLICA}`;
  return n ?? null;
}

export async function necessidadesDaOrg(orgId: string) {
  return sql<(Necessidade & { pedidos_abertos: number })[]>`
    select n.*, (select count(*)::int from conexao c where c.necessidade_id = n.id and c.status = 'SOLICITADA') as pedidos_abertos
    from necessidade n where n.organizacao_id = ${orgId}
    order by (n.status in ('ABERTA','PARCIAL')) desc, n.criado_em desc`;
}
