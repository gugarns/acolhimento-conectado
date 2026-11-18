import { pedirLink } from "@/app/acoes";
import { Avisos, Titulo, lerBusca, type Busca } from "@/components/ui";

export const metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: { searchParams: Busca }) {
  const { erro, pegar } = await lerBusca(searchParams);
  return (
    <div className="mx-auto max-w-md">
      <Titulo sub="Enviamos um link de acesso para o seu e-mail. Não há senha.">Entrar</Titulo>
      <Avisos erro={erro} />
      <form action={pedirLink} className="cartao space-y-4">
        <input type="hidden" name="volta" value={pegar("volta") ?? "/painel"} />
        <div>
          <label htmlFor="email" className="rotulo">Seu e-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
        </div>
        <button className="botao w-full">Receber link de acesso</button>
      </form>
    </div>
  );
}
