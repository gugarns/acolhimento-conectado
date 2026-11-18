import { sql } from "./db";

export const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const REMETENTE = process.env.EMAIL_REMETENTE ?? "Acolhimento Conectado <nao-responda@acolhimentoconectado.org>";

export type Email = { para: string; assunto: string; texto: string };

/**
 * Envia pelo Resend quando RESEND_API_KEY existe. Sem a chave (desenvolvimento),
 * grava em email_dev e imprime no console.
 */
export async function enviarEmail(email: Email): Promise<void> {
  const corpo = `${email.texto}\n\n—\nAcolhimento Conectado\n${APP_URL}`;
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    await sql`insert into email_dev (para, assunto, corpo) values (${email.para}, ${email.assunto}, ${corpo})`;
    if (process.env.NODE_ENV !== "test") console.log(`\n[email] para ${email.para}: ${email.assunto}\n${corpo}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: REMETENTE, to: [email.para], subject: email.assunto, text: corpo }),
  });
  if (!res.ok) console.error(`[email] falha ao enviar para ${email.para}: ${res.status} ${await res.text()}`);
}
