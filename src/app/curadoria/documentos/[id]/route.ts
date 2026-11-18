import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { baixarDocumento } from "@/lib/curadoria";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioAtual();
  if (!u?.is_curador) return new NextResponse("Acesso restrito", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Não encontrado", { status: 404 });
  const d = await baixarDocumento(u, id);
  if (!d) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(new Uint8Array(d.conteudo), {
    headers: {
      "Content-Type": d.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(d.nome_arquivo)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
