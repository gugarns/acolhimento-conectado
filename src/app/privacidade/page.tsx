import { PaginaTexto, Rascunho } from "@/components/Texto";

export const metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  return (
    <PaginaTexto titulo="Política de privacidade">
      <Rascunho />
      <h2>Crianças e adolescentes</h2>
      <p>
        O app não coleta nem exibe dados de crianças ou adolescentes acolhidos (ECA, arts. 17 e 100; LGPD, art. 14). As
        necessidades são do serviço, descritas de forma agregada. Famílias acolhedoras nunca têm conta nem aparecem no app.
      </p>
      <h2>Dados que coletamos de adultos</h2>
      <ul>
        <li>Nome, e-mail, telefone e cidade de quem se cadastra.</li>
        <li>Dados e documentos de organizações, usados só na verificação pela curadoria.</li>
      </ul>
      <h2>Quem vê seus dados</h2>
      <ul>
        <li>Seu e-mail só é mostrado à outra parte depois que uma conexão é aceita.</li>
        <li>Seu telefone é visto apenas pela curadoria, em caso de denúncia.</li>
        <li>O e-mail liberado de um serviço é sempre o institucional.</li>
      </ul>
      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail da entidade responsável (a definir). O
        encarregado de dados (DPO) será nomeado antes do lançamento.
      </p>
    </PaginaTexto>
  );
}
