import { describe, expect, it } from "vitest";
import { sql } from "@/lib/db";
import { criarOrganizacao } from "@/lib/organizacoes";
import { criarNecessidade, listarFeed, obterNecessidadePublica } from "@/lib/necessidades";
import { criarDisponibilidade, listarDisponibilidadesParaAbrigos } from "@/lib/disponibilidades";
import {
  expirarConexoes,
  pedirRetornos,
  registrarRetorno,
  responderConexao,
  solicitarConexaoA,
  solicitarConexaoB,
  verConexao,
} from "@/lib/conexoes";
import { criarDenuncia, resolverDenuncia, moderarConteudo } from "@/lib/curadoria";
import { abrigoVerificado, daquiDias, emailsPara, usuario } from "./fabrica";

const necessidadeBase = {
  titulo: "Mochilas para o ensino fundamental",
  categoria: "MATERIAL_ESCOLAR",
  descricao: "Precisamos de 30 mochilas, podem ser usadas em bom estado.",
  quantidade: 30,
  prazo: daquiDias(30),
  urgencia: "ALTA",
};

describe("verificação de organizações", () => {
  it("abrigo começa pendente e não publica até a curadoria verificar", async () => {
    const gestor = await usuario();
    const org = await criarOrganizacao(
      gestor,
      { tipo: "ABRIGO", nome: "Abrigo Pendente", cnpj: "07.526.557/0001-00", email_institucional: "pendente@abrigo.org", telefone_institucional: "8233334444" },
      [{ tipo: "CNPJ", nome: "a.pdf", mime: "application/pdf", conteudo: Buffer.from("x") }],
    );
    expect(org.status).toBe("PENDENTE");
    await expect(criarNecessidade(gestor, org.id, necessidadeBase)).rejects.toThrow(/verificada/);
  });

  it("exige documento e telefone institucional para acolhimento", async () => {
    const gestor = await usuario();
    await expect(
      criarOrganizacao(gestor, { tipo: "ABRIGO", nome: "Sem doc", cnpj: "34.028.316/0001-03", email_institucional: "x@y.org", telefone_institucional: "82" }, []),
    ).rejects.toThrow(/documento/);
  });
});

describe("fluxo A: necessidade → conexão", () => {
  it("doador pede, abrigo aceita, e-mails só são liberados depois do aceite", async () => {
    const { gestor, org } = await abrigoVerificado();
    const n = await criarNecessidade(gestor, org.id, necessidadeBase);
    expect(n.em_revisao).toBe(false);
    expect((await listarFeed()).some((x) => x.id === n.id)).toBe(true);

    const doador = await usuario();
    const c = await solicitarConexaoA(doador, n.id, "Posso doar 10 mochilas novas até sexta.");
    expect(c.status).toBe("SOLICITADA");

    // antes do aceite, ninguém vê e-mail
    const antes = await verConexao(doador, c.id);
    expect(antes?.abrigoEmail).toBeNull();
    const avisoAbrigo = await emailsPara(org.email_institucional);
    expect(avisoAbrigo.at(-1)?.corpo).not.toContain(doador.email);

    // o doador não pode aceitar o próprio pedido
    await expect(responderConexao(doador, c.id, true)).rejects.toThrow(/não pode responder/);
    // pedido duplicado é bloqueado
    await expect(solicitarConexaoA(doador, n.id, "Outra mensagem com detalhes.")).rejects.toThrow(/já tem um pedido/);

    await responderConexao(gestor, c.id, true);
    const visaoDoador = await verConexao(doador, c.id);
    expect(visaoDoador?.abrigoEmail).toBe(org.email_institucional);
    expect(visaoDoador?.doadorEmail).toBeNull();
    const visaoAbrigo = await verConexao(gestor, c.id);
    expect(visaoAbrigo?.doadorEmail).toBe(doador.email);
    expect((await emailsPara(doador.email)).at(-1)?.corpo).toContain(org.email_institucional);

    // terceiros não veem a conexão
    const estranho = await usuario();
    expect(await verConexao(estranho, c.id)).toBeNull();

    await registrarRetorno(doador, c.id, "SIM");
    await expect(registrarRetorno(estranho, c.id, "SIM")).rejects.toThrow();
  });

  it("bloqueia telefone na mensagem e manda texto identificável para revisão", async () => {
    const { gestor, org } = await abrigoVerificado("FAMILIA_ACOLHEDORA");
    const revisar = await criarNecessidade(gestor, org.id, { ...necessidadeBase, titulo: "Berço para a Maria, 2 anos" });
    expect(revisar.em_revisao).toBe(true);
    expect(await obterNecessidadePublica(revisar.id)).toBeNull();

    const curador = await usuario({ curador: true });
    await moderarConteudo(curador, "NECESSIDADE", revisar.id, false);
    expect(await obterNecessidadePublica(revisar.id)).toBeNull();

    const ok = await criarNecessidade(gestor, org.id, { ...necessidadeBase, titulo: "Berços para famílias acolhedoras" });
    const pub = await obterNecessidadePublica(ok.id);
    expect(pub?.org_tipo).toBe("FAMILIA_ACOLHEDORA");

    const doador = await usuario();
    await expect(solicitarConexaoA(doador, ok.id, "Me liga no 82 99999-1234 que eu levo")).rejects.toThrow(/telefone/);
  });

  it("pedidos sem resposta expiram e conexões aceitas recebem a pergunta de retorno", async () => {
    const { gestor, org } = await abrigoVerificado();
    const n = await criarNecessidade(gestor, org.id, { ...necessidadeBase, titulo: "Fraldas tamanho G" });
    const d1 = await usuario();
    const d2 = await usuario();
    const c1 = await solicitarConexaoA(d1, n.id, "Tenho 5 pacotes de fralda G.");
    const c2 = await solicitarConexaoA(d2, n.id, "Tenho 3 pacotes de fralda G.");
    await responderConexao(gestor, c2.id, true);

    await sql`update conexao set expira_em = now() - interval '1 minute' where id = ${c1.id}`;
    await sql`update conexao set respondida_em = now() - interval '6 days' where id = ${c2.id}`;
    expect(await expirarConexoes()).toBeGreaterThanOrEqual(1);
    expect(await pedirRetornos()).toBeGreaterThanOrEqual(1);
    await expect(responderConexao(gestor, c1.id, true)).rejects.toThrow(/expirou/);
    expect((await emailsPara(d2.email)).some((e) => e.assunto.includes("deu certo"))).toBe(true);
  });
});

describe("fluxo B: disponibilidade → conexão", () => {
  it("só acolhimento verificado vê ofertas; o doador aceita", async () => {
    const doador = await usuario();
    const disp = await criarDisponibilidade(doador, {
      titulo: "Consultas odontológicas gratuitas",
      categoria: "SAUDE",
      tipo: "SERVICO",
      descricao: "Atendo 4 crianças por mês no meu consultório.",
    });

    const curioso = await usuario();
    expect(await listarDisponibilidadesParaAbrigos(curioso)).toBeNull();

    const { gestor, org } = await abrigoVerificado();
    const lista = await listarDisponibilidadesParaAbrigos(gestor);
    expect(lista?.itens.some((i) => i.id === disp.id)).toBe(true);
    expect(JSON.stringify(lista)).not.toContain(doador.email);

    await expect(solicitarConexaoB(curioso, disp.id, org.id, "Temos interesse nas consultas.")).rejects.toThrow();
    const c = await solicitarConexaoB(gestor, disp.id, org.id, "Temos interesse nas consultas para 4 crianças.");
    await expect(responderConexao(gestor, c.id, true)).rejects.toThrow(/não pode responder/);
    await responderConexao(doador, c.id, true);
    expect((await verConexao(gestor, c.id))?.doadorEmail).toBe(doador.email);
  });
});

describe("denúncias", () => {
  it("denúncia procedente oculta a necessidade", async () => {
    const { gestor, org, curador } = await abrigoVerificado("ABRIGO", true);
    const n = await criarNecessidade(gestor, org.id, { ...necessidadeBase, titulo: "Kits de higiene" });
    const feed = await listarFeed();
    expect(feed.find((x) => x.id === n.id)?.org_sigilosa).toBe(true);
    const autor = await usuario();
    await criarDenuncia(autor, "NECESSIDADE", n.id, "O texto parece pedir dinheiro para pessoa física.");
    const [d] = await sql<{ id: string }[]>`select id from denuncia where alvo_id = ${n.id}`;
    await resolverDenuncia(curador, d.id, true);
    expect(await obterNecessidadePublica(n.id)).toBeNull();
  });
});
