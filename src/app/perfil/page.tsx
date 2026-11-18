import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { salvarPerfil } from "@/app/acoes";
import { Avisos, Titulo, lerBusca, type Busca } from "@/components/ui";

export const metadata = { title: "Seu perfil" };

export default async function Perfil({ searchParams }: { searchParams: Busca }) {
  const u = await exigirUsuario("/perfil", { perfil: false });
  const { erro, ok, pegar } = await lerBusca(searchParams);
  return (
    <div className="mx-auto max-w-lg">
      <Titulo sub="Seu e-mail só é mostrado a um serviço de acolhimento depois que uma conexão for aceita.">Seu perfil</Titulo>
      <Avisos erro={erro} ok={ok} />
      <form action={salvarPerfil} className="cartao space-y-4">
        <input type="hidden" name="volta" value={pegar("volta") ?? "/painel"} />
        <div>
          <span className="rotulo">E-mail</span>
          <p className="text-stone-700">{u.email}</p>
        </div>
        <div>
          <label htmlFor="nome" className="rotulo">Nome completo</label>
          <input id="nome" name="nome" required defaultValue={u.nome ?? ""} className="campo" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="telefone" className="rotulo">Telefone com DDD</label>
          <input id="telefone" name="telefone" required defaultValue={u.telefone ?? ""} className="campo" inputMode="tel" autoComplete="tel" />
          <p className="ajuda">Usado só pela curadoria em caso de denúncia. Nunca é mostrado a outros usuários.</p>
        </div>
        <div>
          <label htmlFor="cidade" className="rotulo">Cidade</label>
          <input id="cidade" name="cidade" defaultValue={u.cidade ?? "Maceió"} className="campo" />
        </div>
        {!u.aceitou_termos_em && (
          <label className="flex items-start gap-2 text-sm text-stone-700">
            <input type="checkbox" name="termos" className="mt-1" required />
            <span>
              Li e aceito os <Link href="/termos" className="link" target="_blank">termos de uso</Link> e a{" "}
              <Link href="/privacidade" className="link" target="_blank">política de privacidade</Link>.
            </span>
          </label>
        )}
        <button className="botao w-full">Salvar</button>
      </form>
    </div>
  );
}
