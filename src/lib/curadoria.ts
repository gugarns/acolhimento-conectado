import { sql } from "./db";
import { APP_URL, enviarEmail } from "./email";
import { falhar } from "./erros";
import { STATUS_ORG } from "./constantes";
import { obterOrg, type Organizacao, type UsuarioRef } from "./organizacoes";

function exigirCurador(u: UsuarioRef) {
  if (!u.is_curador) falhar("Acesso restrito à curadoria.");
}

async function registrar(u: UsuarioRef, acao: string, alvoTipo: string, alvoId: string, detalhes?: object) {
  await sql`insert into log_admin (usuario_id, acao, alvo_tipo, alvo_id, detalhes)
            values (${u.id}, ${acao}, ${alvoTipo}, ${alvoId}, ${detalhes ? sql.json(detalhes as never) : null})`;
}

export async function orgsParaCuradoria() {
  return sql<(Organizacao & { documentos: number })[]>`
    select o.*, (select count(*)::int from documento_verificacao d where d.organizacao_id = o.id) as documentos
    from organizacao o
    order by case o.status when 'PENDENTE' then 0 when 'SUSPENSO' then 1 else 2 end, o.criado_em desc`;
}

export async function documentosDaOrg(orgId: string) {
  return sql<{ id: string; tipo: string; nome_arquivo: string; mime: string; enviado_em: Date }[]>`
    select id, tipo, nome_arquivo, mime, enviado_em from documento_verificacao where organizacao_id = ${orgId} order by enviado_em`;
}

export async function baixarDocumento(curador: UsuarioRef, docId: string) {
  exigirCurador(curador);
  const [d] = await sql<{ organizacao_id: string; nome_arquivo: string; mime: string; conteudo: Buffer }[]>`
    select organizacao_id, nome_arquivo, mime, conteudo from documento_verificacao where id = ${docId}`;
  if (!d) return null;
  await registrar(curador, "BAIXOU_DOCUMENTO", "ORGANIZACAO", d.organizacao_id, { documento: docId });
  return d;
}

export async function definirStatusOrg(curador: UsuarioRef, orgId: string, status: string, motivo: string) {
  exigirCurador(curador);
  if (!(status in STATUS_ORG) || status === "PENDENTE") falhar("Status inválido.");
  if ((status === "REPROVADO" || status === "SUSPENSO") && motivo.trim().length < 5) falhar("Informe o motivo.");
  const org = await obterOrg(orgId);
  if (!org) falhar("Organização não encontrada.");
  await sql`
    update organizacao set status = ${status}, motivo_status = ${motivo.trim() || null},
      verificado_em = case when ${status} in ('VERIFICADO','PARCEIRO') then now() else verificado_em end,
      verificado_por = case when ${status} in ('VERIFICADO','PARCEIRO') then ${curador.id}::uuid else verificado_por end
    where id = ${orgId}`;
  await registrar(curador, "STATUS_ORG", "ORGANIZACAO", orgId, { de: org.status, para: status, motivo });
  const texto =
    status === "VERIFICADO" || status === "PARCEIRO"
      ? `${org.nome} foi verificada pela curadoria do Acolhimento Conectado${status === "PARCEIRO" ? " como parceira" : ""}.\n\nVocês já podem publicar necessidades: ${APP_URL}/organizacoes/${orgId}`
      : `O status de ${org.nome} no Acolhimento Conectado mudou para: ${STATUS_ORG[status as keyof typeof STATUS_ORG]}.\n\nMotivo: ${motivo}\n\nDúvidas: responda a este e-mail ou procure a curadoria.`;
  await enviarEmail({ para: org.email_institucional, assunto: `Atualização da verificação de ${org.nome}`, texto });
}

export async function conteudosEmRevisao() {
  return sql<{ tipo: string; id: string; titulo: string; descricao: string; autor: string; criado_em: Date }[]>`
    select 'NECESSIDADE' as tipo, n.id, n.titulo, n.descricao, o.nome as autor, n.criado_em
    from necessidade n join organizacao o on o.id = n.organizacao_id where n.em_revisao and not n.oculta
    union all
    select 'DISPONIBILIDADE', d.id, d.titulo, d.descricao, coalesce(u.nome, u.email), d.criado_em
    from disponibilidade d join usuario u on u.id = d.usuario_id where d.em_revisao and not d.oculta
    order by criado_em`;
}

export async function moderarConteudo(curador: UsuarioRef, tipo: string, id: string, aprovar: boolean) {
  exigirCurador(curador);
  if (tipo === "NECESSIDADE") {
    await sql`update necessidade set em_revisao = false, oculta = ${!aprovar} where id = ${id}`;
  } else if (tipo === "DISPONIBILIDADE") {
    await sql`update disponibilidade set em_revisao = false, oculta = ${!aprovar} where id = ${id}`;
  } else falhar("Tipo inválido.");
  await registrar(curador, aprovar ? "APROVOU_CONTEUDO" : "OCULTOU_CONTEUDO", tipo, id);
}

export async function criarDenuncia(autor: UsuarioRef | null, alvoTipo: string, alvoId: string, motivo: string) {
  if (!["NECESSIDADE", "DISPONIBILIDADE", "ORGANIZACAO", "CONEXAO"].includes(alvoTipo)) falhar("Denúncia inválida.");
  if (motivo.trim().length < 10) falhar("Descreva o motivo da denúncia (mínimo de 10 caracteres).");
  await sql`insert into denuncia (autor_id, alvo_tipo, alvo_id, motivo) values (${autor?.id ?? null}, ${alvoTipo}, ${alvoId}, ${motivo.trim().slice(0, 2000)})`;
  const curadores = await sql<{ email: string }[]>`select email from usuario where is_curador`;
  for (const c of curadores) {
    await enviarEmail({ para: c.email, assunto: "Nova denúncia no Acolhimento Conectado", texto: `Veja em ${APP_URL}/curadoria` });
  }
}

export async function denunciasAbertas() {
  return sql<{ id: string; alvo_tipo: string; alvo_id: string; motivo: string; criado_em: Date; autor: string | null }[]>`
    select d.id, d.alvo_tipo, d.alvo_id, d.motivo, d.criado_em, u.email as autor
    from denuncia d left join usuario u on u.id = d.autor_id
    where d.status = 'ABERTA' order by d.criado_em`;
}

export async function resolverDenuncia(curador: UsuarioRef, id: string, procedente: boolean) {
  exigirCurador(curador);
  const [d] = await sql<{ alvo_tipo: string; alvo_id: string }[]>`
    update denuncia set status = ${procedente ? "PROCEDENTE" : "IMPROCEDENTE"}, resolvida_por = ${curador.id}, resolvida_em = now()
    where id = ${id} and status = 'ABERTA' returning alvo_tipo, alvo_id`;
  if (!d) falhar("Denúncia não encontrada.");
  if (procedente) {
    if (d.alvo_tipo === "NECESSIDADE") await sql`update necessidade set oculta = true where id = ${d.alvo_id}`;
    if (d.alvo_tipo === "DISPONIBILIDADE") await sql`update disponibilidade set oculta = true where id = ${d.alvo_id}`;
    if (d.alvo_tipo === "ORGANIZACAO")
      await sql`update organizacao set status = 'SUSPENSO', motivo_status = 'Denúncia procedente' where id = ${d.alvo_id}`;
  }
  await registrar(curador, procedente ? "DENUNCIA_PROCEDENTE" : "DENUNCIA_IMPROCEDENTE", d.alvo_tipo, d.alvo_id, { denuncia: id });
}

export async function metricas() {
  const [m] = await sql<Record<string, number>[]>`
    select
      (select count(*)::int from organizacao where tipo in ('ABRIGO','FAMILIA_ACOLHEDORA') and status in ('VERIFICADO','PARCEIRO')) as acolhimentos_ativos,
      (select count(*)::int from organizacao where status = 'PENDENTE') as orgs_pendentes,
      (select count(*)::int from usuario) as usuarios,
      (select count(*)::int from necessidade where status in ('ABERTA','PARCIAL') and not oculta) as necessidades_abertas,
      (select count(*)::int from necessidade where status = 'ATENDIDA') as necessidades_atendidas,
      (select count(*)::int from disponibilidade where status = 'ATIVA' and not oculta) as disponibilidades_ativas,
      (select count(*)::int from conexao) as conexoes,
      (select count(*)::int from conexao where status = 'ACEITA') as conexoes_aceitas,
      (select count(*)::int from retorno_conexao where resposta = 'SIM') as retornos_deu_certo,
      (select count(*)::int from denuncia where status = 'ABERTA') as denuncias_abertas`;
  return m;
}
