import { redirect } from "next/navigation";
import { ErroNegocio } from "./erros";

export function comParam(caminho: string, chave: string, valor: string): string {
  const [base, query = ""] = caminho.split("?");
  const p = new URLSearchParams(query);
  p.set(chave, valor);
  return `${base}?${p.toString()}`;
}

/** Executa uma regra de negócio; em caso de erro previsto, volta à página com a mensagem. */
export async function tentar<T>(fn: () => Promise<T>, voltarPara: string): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErroNegocio) redirect(comParam(voltarPara, "erro", e.message));
    throw e;
  }
}

export function texto(fd: FormData, campo: string): string {
  const v = fd.get(campo);
  return typeof v === "string" ? v : "";
}

export function numeroOuNulo(fd: FormData, campo: string): number | null {
  const v = texto(fd, campo).trim().replace(/\./g, "").replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isNaN(n) ? NaN : n;
}

export function caminhoSeguro(v: string | undefined | null, padrao = "/painel"): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : padrao;
}
