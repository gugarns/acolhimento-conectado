// Uso: npm run db:curador -- pessoa@mpal.mp.br
// Marca (ou cria) um usuário como curador. A curadoria do piloto é do MPE/AL.
import postgres from "postgres";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Informe o e-mail: npm run db:curador -- pessoa@exemplo.org");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  await sql`insert into usuario (email, is_curador) values (${email}, true)
            on conflict (email) do update set is_curador = true`;
  console.log(`${email} agora é curador(a).`);
  await sql.end();
}
main();
