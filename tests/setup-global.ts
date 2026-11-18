import { execSync } from "node:child_process";
import postgres from "postgres";

export default async function () {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://acolhe:acolhe@localhost:5432/acolhe_test";
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql`drop schema public cascade`;
  await sql`create schema public`;
  await sql.end();
  execSync("npx tsx scripts/migrate.ts", { env: { ...process.env, DATABASE_URL: url }, stdio: "inherit" });
}
