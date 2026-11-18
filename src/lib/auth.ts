import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { APP_URL, enviarEmail } from "./email";
import { hashToken, novoToken } from "./tokens";

export const COOKIE_SESSAO = "ac_sessao";
const MINUTOS_LINK = 20;
const DIAS_SESSAO = 30;

export type Usuario = {
  id: string;
  email: string;
  nome: string | null;
  telefone: string | null;
  cidade: string | null;
  is_curador: boolean;
  aceitou_termos_em: Date | null;
};

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function enviarLinkDeEntrada(emailBruto: string, volta?: string): Promise<void> {
  const email = normalizarEmail(emailBruto);
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from token_login where email = ${email} and criado_em > now() - interval '15 minutes'`;
  if (n >= 5) return; // limite simples contra abuso
  const token = novoToken();
  await sql`insert into token_login (hash, email, expira_em)
            values (${hashToken(token)}, ${email}, now() + ${`${MINUTOS_LINK} minutes`}::interval)`;
  const destino = volta && volta.startsWith("/") && !volta.startsWith("//") ? `&volta=${encodeURIComponent(volta)}` : "";
  await enviarEmail({
    para: email,
    assunto: "Seu link para entrar no Acolhimento Conectado",
    texto: `Use o link abaixo para entrar. Ele vale por ${MINUTOS_LINK} minutos e só pode ser usado uma vez.\n\n${APP_URL}/entrar/confirmar?token=${token}${destino}\n\nSe você não pediu este link, ignore este e-mail.`,
  });
}

/** Consome o token e devolve o hash da nova sessão, ou null se inválido. */
export async function consumirTokenECriarSessao(token: string): Promise<{ sessao: string; usuarioId: string } | null> {
  return sql.begin(async (tx) => {
    const [t] = await tx<{ email: string }[]>`
      update token_login set usado_em = now()
      where hash = ${hashToken(token)} and usado_em is null and expira_em > now()
      returning email`;
    if (!t) return null;
    const [u] = await tx<{ id: string }[]>`
      insert into usuario (email) values (${t.email})
      on conflict (email) do update set email = excluded.email
      returning id`;
    const sessao = novoToken();
    await tx`insert into sessao (hash, usuario_id, expira_em)
             values (${hashToken(sessao)}, ${u.id}, now() + ${`${DIAS_SESSAO} days`}::interval)`;
    return { sessao, usuarioId: u.id };
  });
}

export async function definirCookieSessao(sessao: string) {
  (await cookies()).set(COOKIE_SESSAO, sessao, {
    httpOnly: true,
    sameSite: "lax",
    secure: APP_URL.startsWith("https://"),
    path: "/",
    maxAge: DIAS_SESSAO * 24 * 3600,
  });
}

export async function encerrarSessao() {
  const jar = await cookies();
  const valor = jar.get(COOKIE_SESSAO)?.value;
  if (valor) await sql`delete from sessao where hash = ${hashToken(valor)}`;
  jar.delete(COOKIE_SESSAO);
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const valor = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!valor) return null;
  const [u] = await sql<Usuario[]>`
    select u.id, u.email, u.nome, u.telefone, u.cidade, u.is_curador, u.aceitou_termos_em
    from sessao s join usuario u on u.id = s.usuario_id
    where s.hash = ${hashToken(valor)} and s.expira_em > now()`;
  return u ?? null;
}

/** Exige login. Com perfil=true, exige também nome, telefone e aceite dos termos. */
export async function exigirUsuario(volta: string, { perfil = true } = {}): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect(`/entrar?volta=${encodeURIComponent(volta)}`);
  if (perfil && (!u.nome || !u.telefone || !u.aceitou_termos_em)) redirect(`/perfil?volta=${encodeURIComponent(volta)}`);
  return u;
}

export async function exigirCurador(): Promise<Usuario> {
  const u = await exigirUsuario("/curadoria");
  if (!u.is_curador) redirect("/painel");
  return u;
}
