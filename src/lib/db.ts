import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL ?? "postgres://acolhe:acolhe@localhost:5432/acolhe", {
    max: 10,
    onnotice: () => {},
    transform: { undefined: null },
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
