import { NextResponse } from "next/server";
import { expirarConexoes, expirarNecessidades, lembrarNecessidades, pedirRetornos } from "@/lib/conexoes";

// Rotina diária (Vercel Cron, ver vercel.json). Exige Authorization: Bearer CRON_SECRET.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const resultado = {
    conexoesExpiradas: await expirarConexoes(),
    retornosPedidos: await pedirRetornos(),
    necessidadesExpiradas: await expirarNecessidades(),
    orgsLembradas: await lembrarNecessidades(),
  };
  return NextResponse.json(resultado);
}
