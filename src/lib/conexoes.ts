import { sql } from "./db";
import { APP_URL, enviarEmail } from "./email";
import { falhar } from "./erros";
import {
  DIAS_ATE_PERGUNTA_RETORNO,
  DIAS_EXPIRACAO_CONEXAO,
  DIAS_LEMBRETE_NECESSIDADE,
  MAX_PEDIDOS_ABERTOS_POR_NECESSIDADE,
} from "./constantes";
import { moderarTextoPublico } from "./moderacao";
import { obterNecessidadePublica } from "./necessidades";
import { obterDisponibilidadeVisivel } from "./disponibilidades";
import { emailsDaOrg, nomePublico, obterOrg, orgAtiva, ehAcolhimento, papelNaOrg, type UsuarioRef } from "./organizacoes";

export type Conexao = {
  id: string;
  direcao: "A" | "B";
  necessidade_id: string | null;
  disponibilidade_id: string | null;
  abrigo_id: string;
  doador_id: string;
  doador_org_id: string | null;
  solicitado_por: string;
  mensagem: string;
  status: "SOLICITADA" | "ACEITA" | "RECUSADA" | "EXPIRADA";
  criado_em: Date;
  expira_em: Date;
  respondida_em: Date | null;
};

const intervaloExpiracao = `${DIAS_EXPIRACAO_CONEXAO} days`;

function validarMensagem(mensagem: string) {
  const m = mensagem.trim();
  if (m.length < 10 || m.length > 1000) falhar("Escreva uma mensagem de 10 a 1.000 caracteres.");
  const mod = moderarTextoPublico(m);
  if (!mod.ok) falhar(mod.motivo);
  return m;
}

/** Fluxo A: o doador toca em "Quero ajudar" numa necessidade. */
export async function solicitarConexaoA(
  doador: UsuarioRef,
  necessidadeId: string,
  mensagemBruta: string,
  doadorOrgId?: string | null,
) {
  const mensagem = validarMensagem(mensagemBruta);
  const n = await obterNecessidadePublica(necessidadeId);
  if (!n) falhar("Esta necessidade não está mais disponível.");
  if (await papelNaOrg(doador.id, n.organizacao_id)) falhar("Você faz parte desta organização.");
  if (doadorOrgId) {
    const org = await obterOrg(doadorOrgId);
    if (!org || org.tipo !== "DOADOR_INSTITUICAO" || !orgAtiva(org) || !(await papelNaOrg(doador.id, org.id)))
      falhar("Instituição doadora inválida.");
  }
  const [{ abertos }] = await sql<{ abertos: number }[]>`
    select count(*)::int as abertos from conexao where necessidade_id = ${n.id} and status = 'SOLICITADA'`;
  if (abertos >= MAX_PEDIDOS_ABERTOS_POR_NECESSIDADE)
    falhar("Esta necessidade já tem muitos pedidos aguardando resposta. Tente de novo em alguns dias.");

  let c: Conexao;
  try {
    [c] = await sql<Conexao[]>`
      insert into conexao (direcao, necessidade_id, abrigo_id, doador_id, doador_org_id, solicitado_por, mensagem, expira_em)
      values ('A', ${n.id}, ${n.organizacao_id}, ${doador.id}, ${doadorOrgId || null}, ${doador.id}, ${mensagem},
              now() + ${intervaloExpiracao}::interval)
      returning *`;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") falhar("Você já tem um pedido para esta necessidade.");
    throw e;
  }
  for (const para of await emailsDaOrg(n.organizacao_id)) {
    await enviarEmail({
      para,
      assunto: `Alguém quer ajudar: ${n.titulo}`,
      texto: `Um doador pediu conexão para a necessidade "${n.titulo}".\n\nMensagem:\n${mensagem}\n\nAceite ou recuse em até ${DIAS_EXPIRACAO_CONEXAO} dias: ${APP_URL}/conexoes/${c.id}\n\nSeu e-mail institucional só será mostrado ao doador se você aceitar.`,
    });
  }
  return c;
}

/** Fluxo B: uma equipe de acolhimento toca em "Tenho interesse" numa disponibilidade. */
export async function solicitarConexaoB(usuario: UsuarioRef, disponibilidadeId: string, abrigoId: string, mensagemBruta: string) {
  const mensagem = validarMensagem(mensagemBruta);
  const abrigo = await obterOrg(abrigoId);
  if (!abrigo || !ehAcolhimento(abrigo) || !orgAtiva(abrigo) || !(await papelNaOrg(usuario.id, abrigo.id)))
    falhar("Só equipes de acolhimento verificadas podem demonstrar interesse.");
  const d = await obterDisponibilidadeVisivel(disponibilidadeId);
  if (!d) falhar("Esta disponibilidade não está mais ativa.");
  if (d.usuario_id === usuario.id) falhar("Esta disponibilidade é sua.");

  let c: Conexao;
  try {
    [c] = await sql<Conexao[]>`
      insert into conexao (direcao, disponibilidade_id, abrigo_id, doador_id, doador_org_id, solicitado_por, mensagem, expira_em)
      values ('B', ${d.id}, ${abrigo.id}, ${d.usuario_id}, ${d.organizacao_id}, ${usuario.id}, ${mensagem},
              now() + ${intervaloExpiracao}::interval)
      returning *`;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") falhar("Sua organização já tem um pedido para esta disponibilidade.");
    throw e;
  }
  const [doador] = await sql<{ email: string }[]>`select email from usuario where id = ${d.usuario_id}`;
  await enviarEmail({
    para: doador.email,
    assunto: `${nomePublico(abrigo)} tem interesse na sua oferta`,
    texto: `${nomePublico(abrigo)} demonstrou interesse em "${d.titulo}".\n\nMensagem:\n${mensagem}\n\nAceite ou recuse em até ${DIAS_EXPIRACAO_CONEXAO} dias: ${APP_URL}/conexoes/${c.id}`,
  });
  return c;
}

export async function obterConexao(id: string): Promise<Conexao | null> {
  const [c] = await sql<Conexao[]>`select * from conexao where id = ${id}`;
  return c ?? null;
}

export type PapelNaConexao = "DOADOR" | "ABRIGO" | "CURADOR";

export async function papelNaConexao(usuario: UsuarioRef, c: Conexao): Promise<PapelNaConexao | null> {
  if (c.doador_id === usuario.id) return "DOADOR";
  if (await papelNaOrg(usuario.id, c.abrigo_id)) return "ABRIGO";
  if (usuario.is_curador) return "CURADOR";
  return null;
}

/** Quem responde: no fluxo A, o abrigo; no fluxo B, o doador. */
export function quemResponde(c: Pick<Conexao, "direcao">): PapelNaConexao {
  return c.direcao === "A" ? "ABRIGO" : "DOADOR";
}

export async function responderConexao(usuario: UsuarioRef, conexaoId: string, aceitar: boolean) {
  const c = await obterConexao(conexaoId);
  if (!c) falhar("Conexão não encontrada.");
  const papel = await papelNaConexao(usuario, c);
  if (papel !== quemResponde(c)) falhar("Você não pode responder a este pedido.");
  const novo = aceitar ? "ACEITA" : "RECUSADA";
  const [atualizada] = await sql<Conexao[]>`
    update conexao set status = ${novo}, respondida_em = now(), respondida_por = ${usuario.id}
    where id = ${c.id} and status = 'SOLICITADA' and expira_em > now()
    returning *`;
  if (!atualizada) falhar("Este pedido já foi respondido ou expirou.");

  const det = await detalhesConexao(atualizada);
  const link = `${APP_URL}/conexoes/${c.id}`;
  if (aceitar) {
    await enviarEmail({
      para: det.doador_email,
      assunto: `Conexão aceita: ${det.titulo}`,
      texto: `A conexão com ${det.abrigo_nome_publico} foi aceita.\n\nE-mail institucional: ${det.abrigo_email}\n\nCombinem diretamente por e-mail o que, quanto, como e quando. O Acolhimento Conectado não intermedia doações.\n\nLembretes: entregas na recepção ou onde o serviço indicar; visitas só nas regras do serviço; nada de fotos de crianças nem presentes para uma criança específica.\n\n${link}`,
    });
    for (const para of await emailsDaOrg(c.abrigo_id)) {
      await enviarEmail({
        para,
        assunto: `Conexão aceita: ${det.titulo}`,
        texto: `A conexão com ${det.doador_nome} foi aceita.\n\nE-mail do doador: ${det.doador_email}\n\nCombinem diretamente por e-mail. Depois, atualize o status da necessidade no app.\n\n${link}`,
      });
    }
  } else {
    const [solicitante] = await sql<{ email: string }[]>`select email from usuario where id = ${c.solicitado_por}`;
    await enviarEmail({
      para: solicitante.email,
      assunto: `Pedido de conexão não aceito: ${det.titulo}`,
      texto: `O pedido de conexão para "${det.titulo}" não foi aceito desta vez. Obrigado pela disposição em ajudar.\n\nVeja outras oportunidades em ${APP_URL}`,
    });
  }
  return atualizada;
}

export type DetalhesConexao = {
  titulo: string;
  abrigo_nome_publico: string;
  abrigo_email: string;
  doador_nome: string;
  doador_email: string;
  doador_org_nome: string | null;
};

async function detalhesConexao(c: Conexao): Promise<DetalhesConexao> {
  const [r] = await sql<(DetalhesConexao & { tipo: string; nome: string; sigilosa: boolean; cidade: string })[]>`
    select coalesce(n.titulo, d.titulo) as titulo, o.tipo, o.nome, o.sigilosa, o.cidade,
           o.email_institucional as abrigo_email, coalesce(u.nome, 'Doador') as doador_nome, u.email as doador_email,
           od.nome as doador_org_nome
    from conexao c
    join organizacao o on o.id = c.abrigo_id
    join usuario u on u.id = c.doador_id
    left join organizacao od on od.id = c.doador_org_id
    left join necessidade n on n.id = c.necessidade_id
    left join disponibilidade d on d.id = c.disponibilidade_id
    where c.id = ${c.id}`;
  return { ...r, abrigo_nome_publico: nomePublico(r as never) };
}

/**
 * Visão da conexão para quem participa. Os e-mails só aparecem depois do aceite,
 * e o curador nunca vê o contato do doador pela tela.
 */
export async function verConexao(usuario: UsuarioRef, id: string) {
  const c = await obterConexao(id);
  if (!c) return null;
  const papel = await papelNaConexao(usuario, c);
  if (!papel) return null;
  const det = await detalhesConexao(c);
  const aceita = c.status === "ACEITA";
  const [retorno] = await sql<{ resposta: string }[]>`
    select resposta from retorno_conexao where conexao_id = ${c.id} and usuario_id = ${usuario.id}`;
  return {
    conexao: c,
    papel,
    podeResponder: c.status === "SOLICITADA" && papel === quemResponde(c),
    titulo: det.titulo,
    abrigoNome: det.abrigo_nome_publico,
    doadorNome: det.doador_org_nome ? `${det.doador_nome} (${det.doador_org_nome})` : det.doador_nome,
    abrigoEmail: aceita && papel === "DOADOR" ? det.abrigo_email : null,
    doadorEmail: aceita && papel === "ABRIGO" ? det.doador_email : null,
    meuRetorno: retorno?.resposta ?? null,
  };
}

export async function registrarRetorno(usuario: UsuarioRef, conexaoId: string, resposta: string) {
  if (!["SIM", "NAO", "CONVERSANDO"].includes(resposta)) falhar("Resposta inválida.");
  const c = await obterConexao(conexaoId);
  if (!c || c.status !== "ACEITA") falhar("Conexão não encontrada.");
  const papel = await papelNaConexao(usuario, c);
  if (papel !== "DOADOR" && papel !== "ABRIGO") falhar("Você não participa desta conexão.");
  await sql`insert into retorno_conexao (conexao_id, usuario_id, resposta) values (${c.id}, ${usuario.id}, ${resposta})
            on conflict (conexao_id, usuario_id) do update set resposta = excluded.resposta, criado_em = now()`;
}

export async function conexoesDoUsuario(usuarioId: string) {
  return sql<(Conexao & { titulo: string; abrigo_tipo: string; abrigo_nome: string; abrigo_sigilosa: boolean; abrigo_cidade: string; papel: string })[]>`
    select c.*, coalesce(n.titulo, d.titulo) as titulo, o.tipo as abrigo_tipo, o.nome as abrigo_nome,
           o.sigilosa as abrigo_sigilosa, o.cidade as abrigo_cidade,
           case when c.doador_id = ${usuarioId} then 'DOADOR' else 'ABRIGO' end as papel
    from conexao c
    join organizacao o on o.id = c.abrigo_id
    left join necessidade n on n.id = c.necessidade_id
    left join disponibilidade d on d.id = c.disponibilidade_id
    where c.doador_id = ${usuarioId}
       or c.abrigo_id in (select organizacao_id from vinculo where usuario_id = ${usuarioId})
    order by (c.status = 'SOLICITADA') desc, c.criado_em desc
    limit 200`;
}

/* ---------- Rotinas diárias (chamadas por /api/cron) ---------- */

export async function expirarConexoes() {
  const expiradas = await sql<{ id: string; solicitado_por: string }[]>`
    update conexao set status = 'EXPIRADA' where status = 'SOLICITADA' and expira_em <= now()
    returning id, solicitado_por`;
  for (const c of expiradas) {
    const [u] = await sql<{ email: string }[]>`select email from usuario where id = ${c.solicitado_por}`;
    await enviarEmail({
      para: u.email,
      assunto: "Seu pedido de conexão expirou",
      texto: `Seu pedido de conexão ficou ${DIAS_EXPIRACAO_CONEXAO} dias sem resposta e expirou. Veja outras oportunidades em ${APP_URL}`,
    });
  }
  return expiradas.length;
}

export async function pedirRetornos() {
  const conexoes = await sql<{ id: string; doador_id: string; abrigo_id: string }[]>`
    update conexao set retorno_pedido_em = now()
    where status = 'ACEITA' and retorno_pedido_em is null
      and respondida_em <= now() - ${`${DIAS_ATE_PERGUNTA_RETORNO} days`}::interval
    returning id, doador_id, abrigo_id`;
  for (const c of conexoes) {
    const [doador] = await sql<{ email: string }[]>`select email from usuario where id = ${c.doador_id}`;
    const destinatarios = new Set([doador.email, ...(await emailsDaOrg(c.abrigo_id))]);
    for (const para of destinatarios) {
      await enviarEmail({
        para,
        assunto: "A conexão deu certo?",
        texto: `Há alguns dias uma conexão foi aceita no Acolhimento Conectado. Deu certo?\n\nResponda com um toque: ${APP_URL}/conexoes/${c.id}\n\nA resposta serve só para melhorarmos o app.`,
      });
    }
  }
  return conexoes.length;
}

export async function expirarNecessidades() {
  const r = await sql`update necessidade set status = 'EXPIRADA', atualizado_em = now()
                      where status in ('ABERTA','PARCIAL') and prazo < current_date returning id`;
  return r.length;
}

export async function lembrarNecessidades() {
  const orgs = await sql<{ organizacao_id: string; n: number }[]>`
    update necessidade set ultimo_lembrete_em = now()
    where status in ('ABERTA','PARCIAL')
      and atualizado_em <= now() - ${`${DIAS_LEMBRETE_NECESSIDADE} days`}::interval
      and (ultimo_lembrete_em is null or ultimo_lembrete_em <= now() - ${`${DIAS_LEMBRETE_NECESSIDADE} days`}::interval)
    returning organizacao_id, 1 as n`;
  const porOrg = new Map<string, number>();
  for (const o of orgs) porOrg.set(o.organizacao_id, (porOrg.get(o.organizacao_id) ?? 0) + 1);
  for (const [orgId, total] of porOrg) {
    const org = await obterOrg(orgId);
    if (!org) continue;
    await enviarEmail({
      para: org.email_institucional,
      assunto: "Suas necessidades ainda estão atualizadas?",
      texto: `${org.nome} tem ${total} necessidade(s) aberta(s) sem atualização há mais de ${DIAS_LEMBRETE_NECESSIDADE} dias.\n\nConfira e marque como atendida ou encerrada o que já foi resolvido: ${APP_URL}/organizacoes/${orgId}`,
    });
  }
  return porOrg.size;
}
