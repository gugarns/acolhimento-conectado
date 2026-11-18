-- Acolhimento Conectado: esquema inicial
create extension if not exists pgcrypto;

create table usuario (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  nome text,
  telefone text,
  cidade text,
  is_curador boolean not null default false,
  aceitou_termos_em timestamptz,
  criado_em timestamptz not null default now()
);

create table token_login (
  hash text primary key,
  email text not null,
  expira_em timestamptz not null,
  usado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index on token_login (email, criado_em);

create table sessao (
  hash text primary key,
  usuario_id uuid not null references usuario(id) on delete cascade,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);

create table organizacao (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ABRIGO','FAMILIA_ACOLHEDORA','DOADOR_INSTITUICAO')),
  nome text not null,
  cnpj text not null unique check (cnpj ~ '^[0-9]{14}$'),
  email_institucional text not null,
  telefone_institucional text,
  cidade text not null,
  bairro text,
  sigilosa boolean not null default false,
  status text not null default 'PENDENTE'
    check (status in ('PENDENTE','VERIFICADO','PARCEIRO','SUSPENSO','REPROVADO')),
  motivo_status text,
  cnpj_dados jsonb,
  verificado_em timestamptz,
  verificado_por uuid references usuario(id),
  criado_em timestamptz not null default now()
);

create table vinculo (
  usuario_id uuid not null references usuario(id) on delete cascade,
  organizacao_id uuid not null references organizacao(id) on delete cascade,
  papel text not null default 'GESTOR' check (papel in ('GESTOR','MEMBRO')),
  criado_em timestamptz not null default now(),
  primary key (usuario_id, organizacao_id)
);

create table documento_verificacao (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacao(id) on delete cascade,
  tipo text not null,
  nome_arquivo text not null,
  mime text not null,
  conteudo bytea not null,
  enviado_por uuid references usuario(id),
  enviado_em timestamptz not null default now()
);

create table necessidade (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacao(id) on delete cascade,
  titulo text not null,
  categoria text not null,
  descricao text not null,
  quantidade integer check (quantidade is null or quantidade > 0),
  faixa_etaria text check (faixa_etaria in ('0-5','6-11','12-17','TODAS')),
  valor_referencia numeric(10,2) check (valor_referencia is null or valor_referencia >= 0),
  prazo date not null,
  urgencia text not null default 'MEDIA' check (urgencia in ('BAIXA','MEDIA','ALTA')),
  status text not null default 'ABERTA'
    check (status in ('ABERTA','PARCIAL','ATENDIDA','ENCERRADA','EXPIRADA')),
  em_revisao boolean not null default false,
  oculta boolean not null default false,
  criado_por uuid references usuario(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  ultimo_lembrete_em timestamptz
);
create index on necessidade (status, prazo);

create table disponibilidade (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuario(id) on delete cascade,
  organizacao_id uuid references organizacao(id) on delete set null,
  titulo text not null,
  categoria text not null,
  tipo text not null check (tipo in ('ITEM','SERVICO','VALOR','TEMPO')),
  descricao text not null,
  cidade text not null,
  status text not null default 'ATIVA' check (status in ('ATIVA','ENCERRADA')),
  em_revisao boolean not null default false,
  oculta boolean not null default false,
  criado_em timestamptz not null default now()
);

create table conexao (
  id uuid primary key default gen_random_uuid(),
  direcao text not null check (direcao in ('A','B')),
  necessidade_id uuid references necessidade(id) on delete cascade,
  disponibilidade_id uuid references disponibilidade(id) on delete cascade,
  abrigo_id uuid not null references organizacao(id) on delete cascade,
  doador_id uuid not null references usuario(id) on delete cascade,
  doador_org_id uuid references organizacao(id) on delete set null,
  solicitado_por uuid not null references usuario(id),
  mensagem text not null,
  status text not null default 'SOLICITADA'
    check (status in ('SOLICITADA','ACEITA','RECUSADA','EXPIRADA')),
  respondida_por uuid references usuario(id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  respondida_em timestamptz,
  retorno_pedido_em timestamptz,
  check ((direcao = 'A' and necessidade_id is not null) or (direcao = 'B' and disponibilidade_id is not null))
);
create unique index conexao_unica_a on conexao (necessidade_id, doador_id)
  where direcao = 'A' and status in ('SOLICITADA','ACEITA');
create unique index conexao_unica_b on conexao (disponibilidade_id, abrigo_id)
  where direcao = 'B' and status in ('SOLICITADA','ACEITA');

create table retorno_conexao (
  conexao_id uuid not null references conexao(id) on delete cascade,
  usuario_id uuid not null references usuario(id) on delete cascade,
  resposta text not null check (resposta in ('SIM','NAO','CONVERSANDO')),
  criado_em timestamptz not null default now(),
  primary key (conexao_id, usuario_id)
);

create table denuncia (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references usuario(id) on delete set null,
  alvo_tipo text not null check (alvo_tipo in ('NECESSIDADE','DISPONIBILIDADE','ORGANIZACAO','CONEXAO')),
  alvo_id uuid not null,
  motivo text not null,
  status text not null default 'ABERTA' check (status in ('ABERTA','PROCEDENTE','IMPROCEDENTE')),
  resolvida_por uuid references usuario(id),
  resolvida_em timestamptz,
  criado_em timestamptz not null default now()
);

create table log_admin (
  id bigserial primary key,
  usuario_id uuid references usuario(id),
  acao text not null,
  alvo_tipo text,
  alvo_id uuid,
  detalhes jsonb,
  criado_em timestamptz not null default now()
);

-- Usado apenas quando não há provedor de e-mail configurado (desenvolvimento).
create table email_dev (
  id bigserial primary key,
  para text not null,
  assunto text not null,
  corpo text not null,
  criado_em timestamptz not null default now()
);
