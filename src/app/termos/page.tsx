import { PaginaTexto, Rascunho } from "@/components/Texto";

export const metadata = { title: "Termos de uso" };

export default function Termos() {
  return (
    <PaginaTexto titulo="Termos de uso">
      <Rascunho />
      <h2>O que o app faz</h2>
      <p>
        O Acolhimento Conectado é um ponto de encontro. Serviços de acolhimento de crianças e adolescentes publicam necessidades,
        doadores publicam o que podem oferecer, e o app libera o e-mail de cada parte quando uma conexão é aceita.
      </p>
      <h2>O que o app não faz</h2>
      <ul>
        <li>Não recebe, guarda nem repassa dinheiro, itens ou serviços.</li>
        <li>Não intermedia, não garante e não se responsabiliza pelas doações combinadas entre as partes.</li>
        <li>Não tem chat, pagamento, recibo nem controle de entrega.</li>
      </ul>
      <h2>Regras para todos</h2>
      <ul>
        <li>É proibido publicar nome, foto, idade exata, história ou qualquer dado que identifique uma criança ou adolescente.</li>
        <li>É proibido publicar telefone, e-mail ou endereço nos textos. O contato é liberado só pelo app.</li>
        <li>Visitas aos serviços só acontecem nas regras do próprio serviço.</li>
        <li>Conteúdos que violem estas regras são ocultados, e contas podem ser suspensas.</li>
      </ul>
      <h2>Verificação</h2>
      <p>
        Os serviços de acolhimento são verificados pela curadoria do Ministério Público do Estado de Alagoas (MPE/AL) no piloto.
        A verificação confirma que a instituição existe e que o e-mail liberado é dela.
      </p>
    </PaginaTexto>
  );
}
