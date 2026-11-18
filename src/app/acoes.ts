"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import {
  consumirTokenECriarSessao,
  definirCookieSessao,
  encerrarSessao,
  enviarLinkDeEntrada,
  exigirCurador,
  exigirUsuario,
} from "@/lib/auth";
import { caminhoSeguro, comParam, numeroOuNulo, tentar, texto } from "@/lib/acao";
import { falhar } from "@/lib/erros";
import { adicionarMembro, criarOrganizacao, removerMembro, type DocumentoEnviado } from "@/lib/organizacoes";
import {
  atualizarStatusNecessidade,
  criarNecessidade,
  editarNecessidade,
  obterNecessidade,
  type DadosNecessidade,
} from "@/lib/necessidades";
import { criarDisponibilidade, encerrarDisponibilidade } from "@/lib/disponibilidades";
import { registrarRetorno, responderConexao, solicitarConexaoA, solicitarConexaoB } from "@/lib/conexoes";
import { criarDenuncia, definirStatusOrg, moderarConteudo, resolverDenuncia } from "@/lib/curadoria";

/* ---------- Entrada ---------- */

export async function pedirLink(fd: FormData) {
  const email = texto(fd, "email").trim();
  const volta = caminhoSeguro(texto(fd, "volta"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(comParam(`/entrar?volta=${encodeURIComponent(volta)}`, "erro", "Informe um e-mail válido."));
  await enviarLinkDeEntrada(email, volta);
  redirect(`/entrar/enviado?email=${encodeURIComponent(email)}`);
}

export async function confirmarEntrada(fd: FormData) {
  const r = await consumirTokenECriarSessao(texto(fd, "token"));
  if (!r) redirect(comParam("/entrar", "erro", "Este link expirou ou já foi usado. Peça um novo."));
  await definirCookieSessao(r.sessao);
  redirect(caminhoSeguro(texto(fd, "volta")));
}

export async function sair() {
  await encerrarSessao();
  redirect("/");
}

export async function salvarPerfil(fd: FormData) {
  const u = await exigirUsuario("/perfil", { perfil: false });
  const volta = caminhoSeguro(texto(fd, "volta"));
  const erro = `/perfil?volta=${encodeURIComponent(volta)}`;
  await tentar(async () => {
    const nome = texto(fd, "nome").trim();
    const telefone = texto(fd, "telefone").replace(/\D/g, "");
    if (nome.length < 3) falhar("Informe seu nome.");
    if (telefone.length < 10 || telefone.length > 11) falhar("Informe um telefone com DDD.");
    if (!u.aceitou_termos_em && fd.get("termos") !== "on") falhar("É preciso aceitar os termos de uso e a política de privacidade.");
    await sql`update usuario set nome = ${nome}, telefone = ${telefone}, cidade = ${texto(fd, "cidade").trim() || null},
              aceitou_termos_em = coalesce(aceitou_termos_em, now()) where id = ${u.id}`;
  }, erro);
  redirect(comParam(volta, "ok", "Perfil salvo."));
}

/* ---------- Organizações ---------- */

export async function cadastrarOrganizacao(fd: FormData) {
  const u = await exigirUsuario("/organizacoes/nova");
  const documentos: DocumentoEnviado[] = [];
  for (const [campo, tipo] of [
    ["doc_cnpj", "Comprovante de CNPJ"],
    ["doc_cmdca", "Inscrição no CMDCA"],
    ["doc_vinculo", "Comprovação de vínculo do gestor"],
    ["doc_outro", "Outro documento"],
  ] as const) {
    const f = fd.get(campo);
    if (f instanceof File && f.size > 0) {
      documentos.push({ tipo, nome: f.name, mime: f.type, conteudo: Buffer.from(await f.arrayBuffer()) });
    }
  }
  const org = await tentar(
    () =>
      criarOrganizacao(
        u,
        {
          tipo: texto(fd, "tipo"),
          nome: texto(fd, "nome"),
          cnpj: texto(fd, "cnpj"),
          email_institucional: texto(fd, "email_institucional"),
          telefone_institucional: texto(fd, "telefone_institucional"),
          bairro: texto(fd, "bairro"),
          sigilosa: fd.get("sigilosa") === "on",
        },
        documentos,
      ),
    `/organizacoes/nova?tipo=${encodeURIComponent(texto(fd, "tipo"))}`,
  );
  redirect(
    comParam(
      `/organizacoes/${org.id}`,
      "ok",
      org.status === "PENDENTE" ? "Cadastro enviado. A curadoria do MPE/AL vai analisar os documentos." : "Instituição cadastrada.",
    ),
  );
}

export async function adicionarPessoa(fd: FormData) {
  const orgId = texto(fd, "org");
  const u = await exigirUsuario(`/organizacoes/${orgId}`);
  await tentar(() => adicionarMembro(u, orgId, texto(fd, "email")), `/organizacoes/${orgId}`);
  redirect(comParam(`/organizacoes/${orgId}`, "ok", "Pessoa adicionada à equipe."));
}

export async function removerPessoa(fd: FormData) {
  const orgId = texto(fd, "org");
  const u = await exigirUsuario(`/organizacoes/${orgId}`);
  await tentar(() => removerMembro(u, orgId, texto(fd, "usuario")), `/organizacoes/${orgId}`);
  redirect(comParam(`/organizacoes/${orgId}`, "ok", "Pessoa removida."));
}

/* ---------- Necessidades ---------- */

function dadosNecessidade(fd: FormData): DadosNecessidade {
  return {
    titulo: texto(fd, "titulo"),
    categoria: texto(fd, "categoria"),
    descricao: texto(fd, "descricao"),
    quantidade: numeroOuNulo(fd, "quantidade"),
    faixa_etaria: texto(fd, "faixa_etaria") || null,
    valor_referencia: numeroOuNulo(fd, "valor_referencia"),
    prazo: texto(fd, "prazo"),
    urgencia: texto(fd, "urgencia"),
  };
}

export async function publicarNecessidade(fd: FormData) {
  const orgId = texto(fd, "org");
  const u = await exigirUsuario(`/organizacoes/${orgId}/necessidades/nova`);
  const n = await tentar(() => criarNecessidade(u, orgId, dadosNecessidade(fd)), `/organizacoes/${orgId}/necessidades/nova`);
  revalidatePath("/");
  redirect(
    comParam(
      `/organizacoes/${orgId}`,
      "ok",
      n.em_revisao
        ? "Necessidade enviada. Ela passa por revisão da curadoria antes de aparecer, porque o texto pode identificar uma criança."
        : "Necessidade publicada.",
    ),
  );
}

export async function salvarNecessidade(fd: FormData) {
  const id = texto(fd, "id");
  const u = await exigirUsuario(`/necessidades/${id}/editar`);
  await tentar(() => editarNecessidade(u, id, dadosNecessidade(fd)), `/necessidades/${id}/editar`);
  const n = await obterNecessidade(id);
  revalidatePath("/");
  redirect(comParam(`/organizacoes/${n!.organizacao_id}`, "ok", "Necessidade atualizada."));
}

export async function mudarStatusNecessidade(fd: FormData) {
  const id = texto(fd, "id");
  const orgId = texto(fd, "org");
  const u = await exigirUsuario(`/organizacoes/${orgId}`);
  await tentar(() => atualizarStatusNecessidade(u, id, texto(fd, "status")), `/organizacoes/${orgId}`);
  revalidatePath("/");
  redirect(comParam(`/organizacoes/${orgId}`, "ok", "Status atualizado."));
}

/* ---------- Disponibilidades ---------- */

export async function publicarDisponibilidade(fd: FormData) {
  const u = await exigirUsuario("/disponibilidades/nova");
  const d = await tentar(
    () =>
      criarDisponibilidade(u, {
        titulo: texto(fd, "titulo"),
        categoria: texto(fd, "categoria"),
        tipo: texto(fd, "tipo"),
        descricao: texto(fd, "descricao"),
        organizacao_id: texto(fd, "organizacao_id") || null,
      }),
    "/disponibilidades/nova",
  );
  redirect(
    comParam(
      "/painel",
      "ok",
      d.em_revisao
        ? "Oferta enviada. Ela passa por revisão da curadoria antes de aparecer para os serviços de acolhimento."
        : "Oferta publicada. Os serviços de acolhimento verificados já podem vê-la.",
    ),
  );
}

export async function encerrarOferta(fd: FormData) {
  const u = await exigirUsuario("/painel");
  await tentar(() => encerrarDisponibilidade(u, texto(fd, "id")), "/painel");
  redirect(comParam("/painel", "ok", "Oferta encerrada."));
}

/* ---------- Conexões ---------- */

export async function quererAjudar(fd: FormData) {
  const id = texto(fd, "necessidade");
  const u = await exigirUsuario(`/necessidades/${id}`);
  const c = await tentar(
    () => solicitarConexaoA(u, id, texto(fd, "mensagem"), texto(fd, "doador_org") || null),
    `/necessidades/${id}`,
  );
  redirect(comParam(`/conexoes/${c.id}`, "ok", "Pedido enviado. Você recebe um e-mail quando o serviço responder."));
}

export async function terInteresse(fd: FormData) {
  const id = texto(fd, "disponibilidade");
  const u = await exigirUsuario(`/disponibilidades/${id}`);
  const c = await tentar(() => solicitarConexaoB(u, id, texto(fd, "abrigo"), texto(fd, "mensagem")), `/disponibilidades/${id}`);
  redirect(comParam(`/conexoes/${c.id}`, "ok", "Interesse enviado. O doador recebe um e-mail para aceitar ou recusar."));
}

export async function responder(fd: FormData) {
  const id = texto(fd, "conexao");
  const u = await exigirUsuario(`/conexoes/${id}`);
  const aceitar = texto(fd, "resposta") === "aceitar";
  await tentar(() => responderConexao(u, id, aceitar), `/conexoes/${id}`);
  redirect(comParam(`/conexoes/${id}`, "ok", aceitar ? "Conexão aceita. Os e-mails foram liberados." : "Pedido recusado."));
}

export async function darRetorno(fd: FormData) {
  const id = texto(fd, "conexao");
  const u = await exigirUsuario(`/conexoes/${id}`);
  await tentar(() => registrarRetorno(u, id, texto(fd, "resposta")), `/conexoes/${id}`);
  redirect(comParam(`/conexoes/${id}`, "ok", "Obrigado pelo retorno."));
}

/* ---------- Denúncias e curadoria ---------- */

export async function denunciar(fd: FormData) {
  const volta = caminhoSeguro(texto(fd, "volta"), "/");
  const u = await exigirUsuario(volta);
  await tentar(() => criarDenuncia(u, texto(fd, "alvo_tipo"), texto(fd, "alvo_id"), texto(fd, "motivo")), volta);
  redirect(comParam(volta, "ok", "Denúncia enviada à curadoria. Obrigado."));
}

export async function curadoriaStatusOrg(fd: FormData) {
  const c = await exigirCurador();
  const id = texto(fd, "org");
  await tentar(() => definirStatusOrg(c, id, texto(fd, "status"), texto(fd, "motivo")), `/curadoria/organizacoes/${id}`);
  revalidatePath("/");
  redirect(comParam(`/curadoria/organizacoes/${id}`, "ok", "Status atualizado e organização avisada por e-mail."));
}

export async function curadoriaModerar(fd: FormData) {
  const c = await exigirCurador();
  await tentar(() => moderarConteudo(c, texto(fd, "tipo"), texto(fd, "id"), texto(fd, "decisao") === "aprovar"), "/curadoria");
  revalidatePath("/");
  redirect(comParam("/curadoria", "ok", "Conteúdo moderado."));
}

export async function curadoriaDenuncia(fd: FormData) {
  const c = await exigirCurador();
  await tentar(() => resolverDenuncia(c, texto(fd, "id"), texto(fd, "decisao") === "procedente"), "/curadoria");
  revalidatePath("/");
  redirect(comParam("/curadoria", "ok", "Denúncia resolvida."));
}
