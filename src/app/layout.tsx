import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { usuarioAtual } from "@/lib/auth";
import { sair } from "./acoes";

export const metadata: Metadata = {
  title: { default: "Acolhimento Conectado", template: "%s · Acolhimento Conectado" },
  description: "Conecta as necessidades de serviços de acolhimento de crianças e adolescentes em Maceió a quem quer ajudar.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#1f7a6c", width: "device-width", initialScale: 1 };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const u = await usuarioAtual();
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-marca-800">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-marca-600 text-white">♥</span>
              Acolhimento Conectado
            </Link>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <Link href="/" className="hover:text-marca-700">Necessidades</Link>
              <Link href="/disponibilidades/nova" className="hover:text-marca-700">Oferecer ajuda</Link>
              {u ? (
                <>
                  <Link href="/painel" className="hover:text-marca-700">Meu painel</Link>
                  {u.is_curador && <Link href="/curadoria" className="hover:text-marca-700">Curadoria</Link>}
                  <form action={sair}>
                    <button className="text-stone-500 hover:text-stone-800">Sair</button>
                  </form>
                </>
              ) : (
                <Link href="/entrar" className="botao py-1.5">Entrar</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mt-12 border-t border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Piloto em Maceió (AL). Verificação dos serviços de acolhimento pela curadoria do MPE/AL.
              <br />O app só conecta: doações são combinadas diretamente entre as partes.
            </p>
            <nav className="flex gap-4">
              <Link href="/seguranca" className="hover:text-stone-800">Doe com segurança</Link>
              <Link href="/termos" className="hover:text-stone-800">Termos</Link>
              <Link href="/privacidade" className="hover:text-stone-800">Privacidade</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
