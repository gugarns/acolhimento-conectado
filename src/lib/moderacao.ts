/**
 * Regras de privacidade para textos públicos (necessidades e disponibilidades).
 * - Dados de contato são bloqueados: o contato só é liberado pelo app, após o aceite.
 * - Indícios de dados de uma criança específica (nome + idade, "para o João") mandam o texto para revisão do curador.
 */

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
const TELEFONE = /(\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}/;
const URL = /(https?:\/\/|www\.)\S+/i;
const IDADE_EXATA = /\b\d{1,2}\s*(anos|aninhos|meses)\b/i;
const PARA_NOME = /\b(para|pra)\s+(o|a)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}/;
const PALAVRAS_SENSIVEIS =
  /\b(abusad[oa]|abuso|violência|violentad[oa]|destitui[çc][ãa]o|medida protetiva|processo judicial|foto d[oa]s? crian[çc]as?)\b/i;

export type ResultadoModeracao =
  | { ok: false; motivo: string }
  | { ok: true; revisar: boolean; motivosRevisao: string[] };

export function moderarTextoPublico(...textos: (string | null | undefined)[]): ResultadoModeracao {
  const texto = textos.filter(Boolean).join("\n");
  if (EMAIL.test(texto)) return { ok: false, motivo: "Não inclua e-mails no texto. O contato é liberado pelo app depois do aceite." };
  if (URL.test(texto)) return { ok: false, motivo: "Não inclua links no texto." };
  if (TELEFONE.test(texto.replace(/\b\d{1,3}\b/g, "")))
    return { ok: false, motivo: "Não inclua telefones no texto. O contato é liberado pelo app depois do aceite." };

  const motivosRevisao: string[] = [];
  if (IDADE_EXATA.test(texto)) motivosRevisao.push("menciona idade exata");
  if (PARA_NOME.test(texto)) motivosRevisao.push("pode mencionar o nome de uma pessoa");
  if (PALAVRAS_SENSIVEIS.test(texto)) motivosRevisao.push("menciona situação sensível");
  return { ok: true, revisar: motivosRevisao.length > 0, motivosRevisao };
}
