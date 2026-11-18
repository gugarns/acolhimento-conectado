import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { max: 1, onnotice: () => {}, ssl: local ? false : "require", prepare: false });
const dir = join(process.cwd(), "db", "migrations");

async function main() {
  await sql`create table if not exists schema_migrations (nome text primary key, aplicada_em timestamptz not null default now())`;
  const feitas = new Set((await sql`select nome from schema_migrations`).map((r) => r.nome as string));
  for (const arquivo of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (feitas.has(arquivo)) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, arquivo), "utf8"));
      await tx`insert into schema_migrations (nome) values (${arquivo})`;
    });
    console.log(`aplicada: ${arquivo}`);
  }
  // CURADORES_INICIAIS="a@mpal.mp.br,b@mpal.mp.br" marca essas pessoas como curadoras (sem precisar de terminal).
  const curadores = (process.env.CURADORES_INICIAIS ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  for (const email of curadores) {
    await sql`insert into usuario (email, is_curador) values (${email}, true)
              on conflict (email) do update set is_curador = true`;
  }
  if (curadores.length) console.log(`curadores garantidos: ${curadores.length}`);
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
