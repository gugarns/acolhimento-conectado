import { Titulo, lerBusca, type Busca } from "@/components/ui";

export default async function Enviado({ searchParams }: { searchParams: Busca }) {
  const { pegar } = await lerBusca(searchParams);
  return (
    <div className="mx-auto max-w-md">
      <Titulo>Confira seu e-mail</Titulo>
      <div className="cartao space-y-2 text-stone-700">
        <p>
          Se <strong>{pegar("email")}</strong> estiver correto, você vai receber um link para entrar. Ele vale por 20 minutos.
        </p>
        <p className="text-sm text-stone-500">Não chegou? Veja a caixa de spam ou peça outro link.</p>
      </div>
    </div>
  );
}
