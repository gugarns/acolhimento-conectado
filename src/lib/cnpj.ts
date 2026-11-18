export function limparCnpj(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function cnpjValido(valor: string): boolean {
  const c = limparCnpj(valor);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const digito = (base: string, pesos: number[]) => {
    const soma = base.split("").reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digito(c.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return c.endsWith(`${d1}${d2}`);
}

export function formatarCnpj(valor: string): string {
  const c = limparCnpj(valor);
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export type DadosCnpj = { razaoSocial?: string; situacao?: string; municipio?: string; uf?: string };

/** Consulta pública na BrasilAPI. Falha silenciosamente: a verificação final é humana. */
export async function consultarCnpj(valor: string): Promise<DadosCnpj | null> {
  if (process.env.CONSULTA_CNPJ === "off") return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limparCnpj(valor)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return {
      razaoSocial: j.razao_social,
      situacao: j.descricao_situacao_cadastral,
      municipio: j.municipio,
      uf: j.uf,
    };
  } catch {
    return null;
  }
}
