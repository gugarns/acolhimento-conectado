import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };
const url = process.env.DATABASE_URL ?? "postgres://acolhe:acolhe@localhost:5432/acolhe";
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

export const sql =
  globalForDb.sql ??
  postgres(url, {
    max: local ? 10 : 3,
    ssl: local ? false : "require",
    prepare: false, // compatível com o pooler do Supabase (modo transação)
    onnotice: () => {},
    transform: { undefined: null },
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
