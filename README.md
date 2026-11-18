# Acolhimento Conectado

Ponto de encontro entre serviços de acolhimento de crianças e adolescentes de Maceió (abrigos, casas-lar e o serviço de
família acolhedora) e pessoas ou instituições que querem ajudar. Piloto em Maceió, com curadoria do MPE/AL.

O app **não intermedia doações**: ele mostra necessidades e ofertas, e quando uma das partes aceita o pedido de conexão,
libera o e-mail de cada uma. Itens, serviços, valores e entrega são combinados diretamente por e-mail.

## O que o MVP faz

| Área | Funcionalidade |
| --- | --- |
| Entrada | Login sem senha, por link enviado ao e-mail (vale 20 min, uso único, confirmado com um clique) |
| Organizações | Cadastro de abrigo, serviço de família acolhedora ou instituição doadora, com upload de documentos; equipe com gestor e membros |
| Verificação | Serviços de acolhimento ficam "Em análise" até a curadoria verificar; instituição doadora com CNPJ ativo na Receita é liberada na hora |
| Necessidades (fluxo A) | Publicação, edição e status (aberta, parcial, atendida, encerrada); feed público com busca, categoria e urgência |
| Ofertas (fluxo B) | Doador publica o que pode oferecer; só equipes de acolhimento verificadas veem |
| Conexões | "Quero ajudar" e "Tenho interesse"; a outra parte aceita ou recusa; e-mails liberados só após o aceite; expira em 7 dias |
| Retorno | 5 dias após o aceite, o app pergunta às duas partes se deu certo (só para métricas) |
| Curadoria (MPE/AL) | Fila de organizações com documentos, verificar/reprovar/suspender/parceiro, textos em revisão, denúncias, métricas, registro de ações |
| Rotina diária | Expira pedidos e necessidades vencidas, pede retornos e lembra serviços com necessidades paradas (`/api/cron`) |

### Regras de privacidade aplicadas no código

- Nenhum dado de criança é coletado. Textos com telefone, e-mail ou link são recusados; textos com idade exata,
  "para o/a Nome" ou situações sensíveis vão para revisão da curadoria antes de aparecer (`src/lib/moderacao.ts`).
- Família acolhedora nunca tem conta: aparece sempre como "Serviço de Família Acolhedora, Maceió", sem bairro.
- Abrigo sigiloso aparece como "Abrigo verificado em Maceió", sem bairro.
- O contato liberado do serviço é sempre o e-mail institucional verificado. Telefones nunca são mostrados a outros usuários.
- Endereços não existem no sistema.
- Não há upload de fotos.

## Rodar localmente

Requisitos: Node 20+ e PostgreSQL 14+.

```bash
cp .env.example .env.local     # ajuste DATABASE_URL
npm install
npm run db:migrate
npm run db:curador -- seu-email@exemplo.org   # cria o primeiro curador
npm run dev                                   # http://localhost:3000
```

Sem `RESEND_API_KEY`, os e-mails (inclusive o link de entrada) aparecem no terminal e ficam na tabela `email_dev`.

Testes (usam o banco `acolhe_test`, que é apagado a cada execução):

```bash
TEST_DATABASE_URL=postgres://usuario:senha@localhost:5432/acolhe_test npm test
```

## Publicar (sugestão)

1. **Banco:** criar um projeto no Supabase na região São Paulo e usar a connection string do pooler em `DATABASE_URL`.
   Rodar `npm run db:migrate` apontando para ele.
2. **App:** importar o repositório na Vercel e definir `DATABASE_URL`, `APP_URL`, `RESEND_API_KEY`,
   `EMAIL_REMETENTE` e `CRON_SECRET`. O `vercel.json` agenda `/api/cron` todo dia às 8h (horário de Maceió).
3. **E-mail:** verificar o domínio de envio no Resend.
4. **Curadoria:** `npm run db:curador -- pessoa@mpal.mp.br` para cada pessoa do MPE/AL.

## Estrutura

```
db/migrations/        esquema SQL (aplicado por scripts/migrate.ts)
src/lib/              regras de negócio, sem dependência de tela (testadas em tests/)
src/app/              páginas (Next.js App Router) e ações de formulário (src/app/acoes.ts)
src/components/       componentes de interface
```

## Pendências antes do lançamento

- Definir a entidade responsável pelo app (controladora na LGPD) e revisar `/termos` e `/privacidade` com advogado.
- Nomear o encarregado de dados (DPO).
- Definir quem no MPE/AL opera a curadoria e se há exigências do órgão (domínio, acesso, auditoria).
- Domínio e remetente de e-mail.
