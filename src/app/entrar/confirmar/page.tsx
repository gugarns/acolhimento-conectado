import { confirmarEntrada } from "@/app/acoes";
import { Titulo, lerBusca, type Busca } from "@/components/ui";

// O login acontece só no clique (POST), para que leitores de link de e-mail não consumam o token.
export default async function Confirmar({ searchParams }: { searchParams: Busca }) {
  const { pegar } = await lerBusca(searchParams);
  return (
    <div className="mx-auto max-w-md">
      <Titulo>Entrar no Acolhimento Conectado</Titulo>
      <form action={confirmarEntrada} className="cartao">
        <input type="hidden" name="token" value={pegar("token") ?? ""} />
        <input type="hidden" name="volta" value={pegar("volta") ?? "/painel"} />
        <button className="botao w-full">Confirmar e entrar</button>
      </form>
    </div>
  );
}
