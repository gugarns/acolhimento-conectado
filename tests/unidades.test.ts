import { describe, expect, it } from "vitest";
import { cnpjValido, formatarCnpj } from "@/lib/cnpj";
import { moderarTextoPublico } from "@/lib/moderacao";
import { localPublico, nomePublico } from "@/lib/organizacoes";

describe("CNPJ", () => {
  it("valida dígitos verificadores", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});

describe("moderação de textos públicos", () => {
  it("bloqueia contato no texto", () => {
    expect(moderarTextoPublico("Liguem (82) 99999-1234").ok).toBe(false);
    expect(moderarTextoPublico("escreva para fulano@gmail.com").ok).toBe(false);
    expect(moderarTextoPublico("veja www.site.com").ok).toBe(false);
  });
  it("aceita texto agregado comum", () => {
    const r = moderarTextoPublico("30 mochilas para o ensino fundamental", "Aceitamos usadas em bom estado, tamanhos 10 a 14.");
    expect(r).toEqual({ ok: true, revisar: false, motivosRevisao: [] });
  });
  it("manda para revisão quando pode identificar uma criança", () => {
    const r = moderarTextoPublico("Mochila para o João, 9 anos");
    expect(r.ok && r.revisar).toBe(true);
    const s = moderarTextoPublico("Roupas para criança vítima de abuso");
    expect(s.ok && s.revisar).toBe(true);
  });
});

describe("nome público", () => {
  const base = { nome: "Lar Esperança", cidade: "Maceió", bairro: "Jatiúca" };
  it("família acolhedora nunca aparece pelo nome nem bairro", () => {
    const org = { ...base, tipo: "FAMILIA_ACOLHEDORA" as const, sigilosa: false };
    expect(nomePublico(org)).toBe("Serviço de Família Acolhedora, Maceió");
    expect(localPublico(org)).toBe("Maceió");
  });
  it("abrigo sigiloso esconde nome e bairro", () => {
    const org = { ...base, tipo: "ABRIGO" as const, sigilosa: true };
    expect(nomePublico(org)).toBe("Abrigo verificado em Maceió");
    expect(localPublico(org)).toBe("Maceió");
  });
  it("abrigo comum mostra nome e bairro", () => {
    const org = { ...base, tipo: "ABRIGO" as const, sigilosa: false };
    expect(nomePublico(org)).toBe("Lar Esperança");
    expect(localPublico(org)).toBe("Jatiúca, Maceió");
  });
});
