import Link from "next/link";
import type { ReactNode } from "react";

export function Avisos({ erro, ok }: { erro?: string; ok?: string }) {
  return (
    <>
      {erro && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {erro}
        </div>
      )}
      {ok && (
        <div role="status" className="mb-4 rounded-lg border border-marca-100 bg-marca-50 px-4 py-3 text-marca-800">
          {ok}
        </div>
      )}
    </>
  );
}

export function Titulo({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{children}</h1>
      {sub && <p className="mt-2 text-stone-600">{sub}</p>}
    </div>
  );
}

export function Voltar({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-block text-sm text-stone-600 hover:text-stone-900">
      ← {children}
    </Link>
  );
}

const CORES: Record<string, string> = {
  ALTA: "bg-calor-100 text-calor-600",
  VERIFICADO: "bg-marca-50 text-marca-700",
  PARCEIRO: "bg-marca-100 text-marca-800",
  PENDENTE: "bg-amber-50 text-amber-800",
  SUSPENSO: "bg-red-50 text-red-700",
  REPROVADO: "bg-red-50 text-red-700",
  SOLICITADA: "bg-amber-50 text-amber-800",
  ACEITA: "bg-marca-50 text-marca-700",
  RECUSADA: "bg-stone-100 text-stone-600",
  EXPIRADA: "bg-stone-100 text-stone-600",
  ABERTA: "bg-marca-50 text-marca-700",
  PARCIAL: "bg-amber-50 text-amber-800",
  ATENDIDA: "bg-stone-100 text-stone-600",
  ENCERRADA: "bg-stone-100 text-stone-600",
  ATIVA: "bg-marca-50 text-marca-700",
};

export function Etiqueta({ valor, children }: { valor?: string; children: ReactNode }) {
  return <span className={`etiqueta ${valor ? (CORES[valor] ?? "") : ""}`}>{children}</span>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">{children}</p>;
}

export function dataBr(d: Date | string | null | undefined): string {
  if (!d) return "";
  const data = typeof d === "string" ? new Date(d) : d;
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Maceio" });
}

export function dinheiro(v: string | number | null | undefined): string {
  if (v == null) return "";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type Busca = Promise<Record<string, string | string[] | undefined>>;

export async function lerBusca(sp: Busca) {
  const s = await sp;
  const pegar = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : undefined);
  return { erro: pegar("erro"), ok: pegar("ok"), pegar };
}
