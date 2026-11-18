import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-stone-600">Ela pode ter sido encerrada ou você não tem acesso.</p>
      <Link href="/" className="botao mt-6">Ver necessidades</Link>
    </div>
  );
}
