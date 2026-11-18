import { denunciar } from "@/app/acoes";

export function Denunciar({ alvoTipo, alvoId, volta }: { alvoTipo: string; alvoId: string; volta: string }) {
  return (
    <details className="mt-6 text-sm">
      <summary className="cursor-pointer text-stone-500 hover:text-stone-800">Denunciar algo errado</summary>
      <form action={denunciar} className="mt-3 space-y-3">
        <input type="hidden" name="alvo_tipo" value={alvoTipo} />
        <input type="hidden" name="alvo_id" value={alvoId} />
        <input type="hidden" name="volta" value={volta} />
        <label className="rotulo" htmlFor="motivo-denuncia">O que está errado?</label>
        <textarea id="motivo-denuncia" name="motivo" required minLength={10} rows={3} className="campo"
          placeholder="Ex.: o texto identifica uma criança; o serviço pediu depósito em conta pessoal" />
        <button className="botao-perigo">Enviar denúncia à curadoria</button>
      </form>
    </details>
  );
}
