import { sql } from "./db";
import { falhar } from "./erros";
import { CATEGORIAS, CIDADE_PILOTO, TIPOS_DISPONIBILIDADE } from "./constantes";
import { moderarTextoPublico } from "./moderacao";
import { acolhimentosAtivosDoUsuario, obterOrg, orgAtiva, papelNaOrg, type UsuarioRef } from "./organizacoes";

export type Disponibilidade = {
  id: string;
  usuario_id: string;
  organizacao_id: string | null;
  titulo: string;
  categoria: string;
  tipo: string;
  descricao: string;
  cidade: string;
  status: string;
  em_revisao: boolean;
  oculta: boolean;
  criado_em: Date;
};

export type DadosDisponibilidade = {
  titulo: string;
  categoria: string;
  tipo: string;
  descricao: string;
  organizacao_id?: string | null;
};

export async function criarDisponibilidade(usuario: UsuarioRef, d: DadosDisponibilidade) {
  const titulo = d.titulo.trim();
  if (titulo.length < 5 || titulo.length > 120) falhar("O título deve ter entre 5 e 120 caracteres.");
  if (d.descricao.trim().length < 10 || d.descricao.length > 2000) falhar("A descrição deve ter entre 10 e 2.000 caracteres.");
  if (!(d.categoria in CATEGORIAS)) falhar("Categoria inválida.");
  if (!(d.tipo in TIPOS_DISPONIBILIDADE)) falhar("Tipo inválido.");
  if (d.organizacao_id) {
    const org = await obterOrg(d.organizacao_id);
    if (!org || org.tipo !== "DOADOR_INSTITUICAO" || !orgAtiva(org) || !(await papelNaOrg(usuario.id, org.id)))
      falhar("Você só pode oferecer em nome de uma instituição doadora verificada da qual faz parte.");
  }
  const mod = moderarTextoPublico(d.titulo, d.descricao);
  if (!mod.ok) falhar(mod.motivo);
  const [disp] = await sql<Disponibilidade[]>`
    insert into disponibilidade (usuario_id, organizacao_id, titulo, categoria, tipo, descricao, cidade, em_revisao)
    values (${usuario.id}, ${d.organizacao_id || null}, ${titulo}, ${d.categoria}, ${d.tipo}, ${d.descricao.trim()},
            ${CIDADE_PILOTO}, ${mod.revisar})
    returning *`;
  return disp;
}

export async function encerrarDisponibilidade(usuario: UsuarioRef, id: string) {
  const [r] = await sql`update disponibilidade set status = 'ENCERRADA' where id = ${id} and usuario_id = ${usuario.id} returning id`;
  if (!r) falhar("Disponibilidade não encontrada.");
}

export async function disponibilidadesDoUsuario(usuarioId: string) {
  return sql<(Disponibilidade & { pedidos_abertos: number })[]>`
    select d.*, (select count(*)::int from conexao c where c.disponibilidade_id = d.id and c.status = 'SOLICITADA') as pedidos_abertos
    from disponibilidade d where d.usuario_id = ${usuarioId} order by (d.status = 'ATIVA') desc, d.criado_em desc`;
}

export type DisponibilidadeVisivel = Disponibilidade & { doador_nome: string | null; org_nome: string | null };

/** Só equipes de acolhimento verificadas veem disponibilidades. O contato do doador não aparece aqui. */
export async function listarDisponibilidadesParaAbrigos(usuario: UsuarioRef, categoria?: string) {
  const acolhimentos = await acolhimentosAtivosDoUsuario(usuario.id);
  if (acolhimentos.length === 0) return null;
  const cat = categoria && categoria in CATEGORIAS ? categoria : null;
  const itens = await sql<DisponibilidadeVisivel[]>`
    select d.*, split_part(u.nome, ' ', 1) as doador_nome, o.nome as org_nome
    from disponibilidade d join usuario u on u.id = d.usuario_id
    left join organizacao o on o.id = d.organizacao_id
    where d.status = 'ATIVA' and not d.oculta and not d.em_revisao
      and (${cat}::text is null or d.categoria = ${cat})
    order by d.criado_em desc limit 100`;
  return { acolhimentos, itens };
}

export async function obterDisponibilidadeVisivel(id: string) {
  const [d] = await sql<DisponibilidadeVisivel[]>`
    select d.*, split_part(u.nome, ' ', 1) as doador_nome, o.nome as org_nome
    from disponibilidade d join usuario u on u.id = d.usuario_id
    left join organizacao o on o.id = d.organizacao_id
    where d.id = ${id} and d.status = 'ATIVA' and not d.oculta and not d.em_revisao`;
  return d ?? null;
}
