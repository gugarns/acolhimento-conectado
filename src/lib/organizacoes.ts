import { sql } from "./db";
import { APP_URL, enviarEmail } from "./email";
import { falhar } from "./erros";
import { cnpjValido, consultarCnpj, limparCnpj } from "./cnpj";
import { CIDADE_PILOTO, TIPOS_ORG, type TipoOrg } from "./constantes";

export type Organizacao = {
  id: string;
  tipo: TipoOrg;
  nome: string;
  cnpj: string;
  email_institucional: string;
  telefone_institucional: string | null;
  cidade: string;
  bairro: string | null;
  sigilosa: boolean;
  status: "PENDENTE" | "VERIFICADO" | "PARCEIRO" | "SUSPENSO" | "REPROVADO";
  motivo_status: string | null;
  cnpj_dados: Record<string, string> | null;
  criado_em: Date;
};

export type UsuarioRef = { id: string; email: string; is_curador?: boolean };

export const STATUS_ATIVOS = ["VERIFICADO", "PARCEIRO"] as const;
export const TIPOS_ACOLHIMENTO = ["ABRIGO", "FAMILIA_ACOLHEDORA"] as const;

export function orgAtiva(org: Pick<Organizacao, "status">): boolean {
  return (STATUS_ATIVOS as readonly string[]).includes(org.status);
}

export function ehAcolhimento(org: Pick<Organizacao, "tipo">): boolean {
  return (TIPOS_ACOLHIMENTO as readonly string[]).includes(org.tipo);
}

/** Nome mostrado ao público: nunca expõe família acolhedora nem abrigo sigiloso. */
export function nomePublico(org: Pick<Organizacao, "tipo" | "nome" | "sigilosa" | "cidade">): string {
  if (org.tipo === "FAMILIA_ACOLHEDORA") return `Serviço de Família Acolhedora, ${org.cidade}`;
  if (org.sigilosa) return `Abrigo verificado em ${org.cidade}`;
  return org.nome;
}

export function localPublico(org: Pick<Organizacao, "tipo" | "sigilosa" | "cidade" | "bairro">): string {
  if (org.tipo === "FAMILIA_ACOLHEDORA" || org.sigilosa || !org.bairro) return org.cidade;
  return `${org.bairro}, ${org.cidade}`;
}

export async function papelNaOrg(usuarioId: string, orgId: string): Promise<"GESTOR" | "MEMBRO" | null> {
  const [v] = await sql<{ papel: "GESTOR" | "MEMBRO" }[]>`
    select papel from vinculo where usuario_id = ${usuarioId} and organizacao_id = ${orgId}`;
  return v?.papel ?? null;
}

export async function obterOrg(id: string): Promise<Organizacao | null> {
  const [o] = await sql<Organizacao[]>`select * from organizacao where id = ${id}`;
  return o ?? null;
}

export async function orgsDoUsuario(usuarioId: string) {
  return sql<(Organizacao & { papel: string })[]>`
    select o.*, v.papel from organizacao o join vinculo v on v.organizacao_id = o.id
    where v.usuario_id = ${usuarioId} order by o.nome`;
}

/** Orgs de acolhimento ativas em que o usuário atua (podem ver disponibilidades). */
export async function acolhimentosAtivosDoUsuario(usuarioId: string) {
  return sql<Organizacao[]>`
    select o.* from organizacao o join vinculo v on v.organizacao_id = o.id
    where v.usuario_id = ${usuarioId}
      and o.tipo in ('ABRIGO','FAMILIA_ACOLHEDORA') and o.status in ('VERIFICADO','PARCEIRO')
    order by o.nome`;
}

export type DocumentoEnviado = { tipo: string; nome: string; mime: string; conteudo: Buffer };

export type DadosNovaOrg = {
  tipo: string;
  nome: string;
  cnpj: string;
  email_institucional: string;
  telefone_institucional?: string | null;
  bairro?: string | null;
  sigilosa?: boolean;
};

const MIMES_ACEITOS = ["application/pdf", "image/jpeg", "image/png"];
const MAX_DOC = 5 * 1024 * 1024;

export async function criarOrganizacao(usuario: UsuarioRef, dados: DadosNovaOrg, documentos: DocumentoEnviado[]) {
  if (!(dados.tipo in TIPOS_ORG)) falhar("Tipo de organização inválido.");
  const tipo = dados.tipo as TipoOrg;
  const nome = dados.nome.trim();
  if (nome.length < 3) falhar("Informe o nome da organização.");
  if (!cnpjValido(dados.cnpj)) falhar("CNPJ inválido.");
  const email = dados.email_institucional.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) falhar("E-mail institucional inválido.");
  const acolhimento = tipo !== "DOADOR_INSTITUICAO";
  if (acolhimento && !dados.telefone_institucional?.trim())
    falhar("Informe o telefone institucional. Ele é usado só na verificação e nunca é mostrado a doadores.");
  if (acolhimento && documentos.length === 0) falhar("Envie ao menos um documento para a verificação.");
  for (const d of documentos) {
    if (!MIMES_ACEITOS.includes(d.mime)) falhar(`Formato não aceito em ${d.nome}. Use PDF, JPG ou PNG.`);
    if (d.conteudo.length > MAX_DOC) falhar(`${d.nome} passa de 5 MB.`);
  }

  const cnpj = limparCnpj(dados.cnpj);
  const [existente] = await sql`select 1 from organizacao where cnpj = ${cnpj}`;
  if (existente) falhar("Este CNPJ já está cadastrado. Peça a um gestor da organização para adicionar você.");

  const consulta = await consultarCnpj(cnpj);
  // Doadores institucionais com CNPJ ativo são liberados direto; acolhimento sempre passa pelo curador.
  const status = !acolhimento && consulta?.situacao?.toUpperCase() === "ATIVA" ? "VERIFICADO" : "PENDENTE";

  const org = await sql.begin(async (tx) => {
    const [o] = await tx<Organizacao[]>`
      insert into organizacao (tipo, nome, cnpj, email_institucional, telefone_institucional, cidade, bairro, sigilosa, status, cnpj_dados)
      values (${tipo}, ${nome}, ${cnpj}, ${email}, ${dados.telefone_institucional?.trim() || null}, ${CIDADE_PILOTO},
              ${tipo === "FAMILIA_ACOLHEDORA" ? null : dados.bairro?.trim() || null}, ${tipo === "ABRIGO" && !!dados.sigilosa},
              ${status}, ${consulta ? tx.json(consulta) : null})
      returning *`;
    await tx`insert into vinculo (usuario_id, organizacao_id, papel) values (${usuario.id}, ${o.id}, 'GESTOR')`;
    for (const d of documentos) {
      await tx`insert into documento_verificacao (organizacao_id, tipo, nome_arquivo, mime, conteudo, enviado_por)
               values (${o.id}, ${d.tipo}, ${d.nome}, ${d.mime}, ${d.conteudo}, ${usuario.id})`;
    }
    return o;
  });

  if (org.status === "PENDENTE") {
    const curadores = await sql<{ email: string }[]>`select email from usuario where is_curador`;
    for (const c of curadores) {
      await enviarEmail({
        para: c.email,
        assunto: `Nova organização para verificar: ${org.nome}`,
        texto: `${org.nome} (${TIPOS_ORG[org.tipo]}) pediu verificação.\n\nAnalise em ${APP_URL}/curadoria/organizacoes/${org.id}`,
      });
    }
  }
  return org;
}

export async function adicionarMembro(gestor: UsuarioRef, orgId: string, emailBruto: string) {
  if ((await papelNaOrg(gestor.id, orgId)) !== "GESTOR") falhar("Apenas gestores podem adicionar pessoas.");
  const email = emailBruto.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) falhar("E-mail inválido.");
  const org = await obterOrg(orgId);
  if (!org) falhar("Organização não encontrada.");
  const [u] = await sql<{ id: string }[]>`
    insert into usuario (email) values (${email}) on conflict (email) do update set email = excluded.email returning id`;
  await sql`insert into vinculo (usuario_id, organizacao_id, papel) values (${u.id}, ${orgId}, 'MEMBRO')
            on conflict do nothing`;
  await enviarEmail({
    para: email,
    assunto: `Você foi adicionado(a) a ${org.nome} no Acolhimento Conectado`,
    texto: `${gestor.email} adicionou você à equipe de ${org.nome}.\n\nEntre com este e-mail em ${APP_URL}/entrar`,
  });
}

export async function removerMembro(gestor: UsuarioRef, orgId: string, usuarioId: string) {
  if ((await papelNaOrg(gestor.id, orgId)) !== "GESTOR") falhar("Apenas gestores podem remover pessoas.");
  if (usuarioId === gestor.id) falhar("Você não pode remover a si mesmo(a).");
  await sql`delete from vinculo where organizacao_id = ${orgId} and usuario_id = ${usuarioId} and papel = 'MEMBRO'`;
}

export async function membrosDaOrg(orgId: string) {
  return sql<{ id: string; email: string; nome: string | null; papel: string }[]>`
    select u.id, u.email, u.nome, v.papel from vinculo v join usuario u on u.id = v.usuario_id
    where v.organizacao_id = ${orgId} order by v.papel, u.nome`;
}

/** E-mails que recebem avisos de uma organização: o institucional e os da equipe. */
export async function emailsDaOrg(orgId: string): Promise<string[]> {
  const rows = await sql<{ email: string }[]>`
    select email_institucional as email from organizacao where id = ${orgId}
    union
    select u.email from vinculo v join usuario u on u.id = v.usuario_id where v.organizacao_id = ${orgId}`;
  return rows.map((r) => r.email);
}
