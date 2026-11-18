import { exigirUsuario } from "@/lib/auth";
import { cadastrarOrganizacao } from "@/app/acoes";
import { TIPOS_ORG } from "@/lib/constantes";
import { Avisos, Titulo, lerBusca, type Busca } from "@/components/ui";

export const metadata = { title: "Cadastrar organização" };

export default async function NovaOrg({ searchParams }: { searchParams: Busca }) {
  await exigirUsuario("/organizacoes/nova");
  const { erro, pegar } = await lerBusca(searchParams);
  const tipo = pegar("tipo") ?? "ABRIGO";
  return (
    <div className="mx-auto max-w-2xl">
      <Titulo sub="Serviços de acolhimento passam por verificação da curadoria do MPE/AL antes de publicar. Instituições doadoras com CNPJ ativo são liberadas na hora.">
        Cadastrar organização
      </Titulo>
      <Avisos erro={erro} />
      <form action={cadastrarOrganizacao} className="cartao space-y-5" encType="multipart/form-data">
        <fieldset>
          <legend className="rotulo">Tipo</legend>
          <div className="space-y-2">
            {Object.entries(TIPOS_ORG).map(([k, v]) => (
              <label key={k} className="flex items-center gap-2">
                <input type="radio" name="tipo" value={k} defaultChecked={k === tipo} required /> {v}
              </label>
            ))}
          </div>
          <p className="ajuda">
            Famílias acolhedoras participam pelo serviço que as coordena. A família nunca tem conta nem aparece no app.
          </p>
        </fieldset>
        <div>
          <label htmlFor="nome" className="rotulo">Nome da organização</label>
          <input id="nome" name="nome" required className="campo" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cnpj" className="rotulo">CNPJ da mantenedora</label>
            <input id="cnpj" name="cnpj" required className="campo" inputMode="numeric" placeholder="00.000.000/0000-00" />
          </div>
          <div>
            <label htmlFor="bairro" className="rotulo">Bairro (opcional)</label>
            <input id="bairro" name="bairro" className="campo" />
            <p className="ajuda">Não use para família acolhedora. O endereço nunca aparece no app.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email_institucional" className="rotulo">E-mail institucional</label>
            <input id="email_institucional" name="email_institucional" type="email" required className="campo" />
            <p className="ajuda">É o único contato liberado a doadores, e só depois que vocês aceitarem uma conexão.</p>
          </div>
          <div>
            <label htmlFor="telefone_institucional" className="rotulo">Telefone institucional</label>
            <input id="telefone_institucional" name="telefone_institucional" className="campo" inputMode="tel" />
            <p className="ajuda">Obrigatório para acolhimento. Usado só pela curadoria na verificação.</p>
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input type="checkbox" name="sigilosa" className="mt-1" />
          <span>Abrigo sigiloso: publicar sem o nome da instituição (aparece como “Abrigo verificado em Maceió”).</span>
        </label>
        <fieldset className="space-y-3 rounded-lg bg-stone-50 p-4">
          <legend className="rotulo">Documentos para verificação (PDF, JPG ou PNG, até 5 MB cada)</legend>
          {[
            ["doc_cnpj", "Comprovante de CNPJ"],
            ["doc_cmdca", "Inscrição no CMDCA ou documento da Secretaria de Assistência Social"],
            ["doc_vinculo", "Comprovação do seu vínculo com a organização"],
            ["doc_outro", "Outro documento (opcional)"],
          ].map(([campo, rotulo]) => (
            <div key={campo}>
              <label htmlFor={campo} className="text-sm text-stone-700">{rotulo}</label>
              <input id={campo} name={campo} type="file" accept="application/pdf,image/jpeg,image/png" className="mt-1 block w-full text-sm" />
            </div>
          ))}
          <p className="ajuda">Instituições doadoras podem pular os documentos.</p>
        </fieldset>
        <button className="botao w-full">Enviar cadastro</button>
      </form>
    </div>
  );
}
