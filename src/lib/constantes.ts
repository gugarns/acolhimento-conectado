export const CIDADE_PILOTO = "Maceió";

export const CATEGORIAS = {
  MATERIAL_ESCOLAR: "Material escolar",
  HIGIENE: "Higiene",
  VESTUARIO: "Vestuário e calçados",
  ALIMENTACAO: "Alimentação",
  MOVEIS: "Móveis e enxoval",
  BEBE: "Bebê (fraldas, berço, carrinho)",
  BRINQUEDOS_LAZER: "Brinquedos e lazer",
  SAUDE: "Saúde",
  SERVICO: "Serviço profissional",
  EXPERIENCIA: "Experiência (passeio, curso)",
  OUTRO: "Outro",
} as const;
export type Categoria = keyof typeof CATEGORIAS;

export const URGENCIAS = { ALTA: "Urgente", MEDIA: "Normal", BAIXA: "Pode esperar" } as const;

export const FAIXAS_ETARIAS = {
  TODAS: "Todas as idades",
  "0-5": "0 a 5 anos",
  "6-11": "6 a 11 anos",
  "12-17": "12 a 17 anos",
} as const;

export const STATUS_NECESSIDADE = {
  ABERTA: "Aberta",
  PARCIAL: "Parcialmente atendida",
  ATENDIDA: "Atendida",
  ENCERRADA: "Encerrada",
  EXPIRADA: "Expirada",
} as const;

export const TIPOS_DISPONIBILIDADE = {
  ITEM: "Itens",
  SERVICO: "Serviço",
  VALOR: "Valor em dinheiro",
  TEMPO: "Horas de trabalho voluntário",
} as const;

export const TIPOS_ORG = {
  ABRIGO: "Abrigo / casa-lar",
  FAMILIA_ACOLHEDORA: "Serviço de família acolhedora",
  DOADOR_INSTITUICAO: "Instituição doadora (empresa, igreja, escola, ONG)",
} as const;
export type TipoOrg = keyof typeof TIPOS_ORG;

export const STATUS_ORG = {
  PENDENTE: "Em análise",
  VERIFICADO: "Verificado",
  PARCEIRO: "Parceiro",
  SUSPENSO: "Suspenso",
  REPROVADO: "Reprovado",
} as const;

export const STATUS_CONEXAO = {
  SOLICITADA: "Aguardando resposta",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
  EXPIRADA: "Expirada",
} as const;

export const DIAS_EXPIRACAO_CONEXAO = 7;
export const DIAS_ATE_PERGUNTA_RETORNO = 5;
export const MAX_PEDIDOS_ABERTOS_POR_NECESSIDADE = 10;
export const DIAS_LEMBRETE_NECESSIDADE = 7;

export function rotulo<T extends Record<string, string>>(mapa: T, chave: string | null | undefined): string {
  if (!chave) return "";
  return (mapa as Record<string, string>)[chave] ?? chave;
}
