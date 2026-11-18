import { sql } from "@/lib/db";
import { criarOrganizacao } from "@/lib/organizacoes";
import { definirStatusOrg } from "@/lib/curadoria";

let seq = 0;
// CNPJs válidos para testes
const CNPJS = ["11222333000181", "45723174000110", "19131243000197", "60701190000104", "33000167000101", "00000000000191", "60746948000112", "02558157000162"];

export async function usuario(extra: { curador?: boolean } = {}) {
  seq += 1;
  const [u] = await sql<{ id: string; email: string; is_curador: boolean }[]>`
    insert into usuario (email, nome, telefone, is_curador, aceitou_termos_em)
    values (${`pessoa${seq}-${Date.now()}@teste.org`}, ${`Pessoa ${seq}`}, '82999990000', ${!!extra.curador}, now())
    returning id, email, is_curador`;
  return u;
}

const pdf = { tipo: "Comprovante de CNPJ", nome: "cnpj.pdf", mime: "application/pdf", conteudo: Buffer.from("%PDF-1.4 teste") };

export async function abrigoVerificado(tipo: "ABRIGO" | "FAMILIA_ACOLHEDORA" = "ABRIGO", sigilosa = false) {
  const gestor = await usuario();
  const curador = await usuario({ curador: true });
  const cnpj = CNPJS.shift();
  if (!cnpj) throw new Error("acabaram os CNPJs de teste");
  const org = await criarOrganizacao(
    gestor,
    { tipo, nome: `Casa ${cnpj.slice(0, 4)}`, cnpj, email_institucional: `contato${cnpj}@abrigo.org`, telefone_institucional: "8233330000", bairro: "Ponta Verde", sigilosa },
    [pdf],
  );
  await definirStatusOrg(curador, org.id, "VERIFICADO", "");
  return { gestor, curador, org };
}

export function daquiDias(n: number) {
  return new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
}

export async function emailsPara(email: string) {
  return sql<{ assunto: string; corpo: string }[]>`select assunto, corpo from email_dev where para = ${email} order by id`;
}
