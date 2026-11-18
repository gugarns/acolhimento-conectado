import { PaginaTexto } from "@/components/Texto";

export const metadata = { title: "Doe com segurança" };

export default function Seguranca() {
  return (
    <PaginaTexto titulo="Doe com segurança">
      <ul>
        <li>Serviços verificados nunca pedem depósito em conta de pessoa física. Doações em dinheiro só para conta no CNPJ da instituição.</li>
        <li>Confira se o e-mail que escreveu para você é o mesmo liberado no app.</li>
        <li>Entregue na recepção ou onde o serviço indicar. Visitas só com agendamento e nas regras do serviço.</li>
        <li>Não fotografe crianças, não publique fotos delas e não leve presentes para uma criança específica.</li>
        <li>Desconfiou de algo? Use o botão “Denunciar” na página da necessidade ou da conexão. A curadoria do MPE/AL analisa.</li>
      </ul>
    </PaginaTexto>
  );
}
