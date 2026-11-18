import type { ReactNode } from "react";

export function PaginaTexto({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 leading-relaxed text-stone-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-stone-900 [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="text-2xl font-semibold text-stone-900">{titulo}</h1>
      {children}
    </article>
  );
}

export function Rascunho() {
  return (
    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      Rascunho para o piloto. Este texto ainda precisa de revisão jurídica e da definição da entidade responsável pelo app.
    </p>
  );
}
