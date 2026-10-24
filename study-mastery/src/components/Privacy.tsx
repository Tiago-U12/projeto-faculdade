import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAccount } from '../account';

export const AI_SENDS = 'Ao gerar, vão para o provedor de IA (Anthropic) só o texto das páginas do material que mencionam o assunto (até 60 mil caracteres) e os nomes da disciplina e do assunto — nunca seu e-mail ou outros materiais.';

/** O que fica onde, o que vai para serviços externos e o que cada exclusão leva. */
export function Privacy({ go }: { go: (to: string) => void }) {
  const account = useAccount();
  return (
    <>
      <button type="button" className="back" onClick={() => go('#/conta')}><ArrowLeft size={18} aria-hidden="true" /> Conta</button>
      <h1 className="screen-title">Seus dados e privacidade</h1>
      <p className="sub">Como o Study Mastery guarda e processa o que você cria. {account.status === 'signedIn' ? 'Você está usando uma conta.' : 'Agora você está usando o espaço deste aparelho (sem conta).'}</p>

      <section className="panel" aria-labelledby="h-where">
        <div className="panel-head"><h2 id="h-where"><ShieldCheck size={18} aria-hidden="true" /> Onde ficam</h2></div>
        <ul className="plain">
          <li><b>Sem conta (neste aparelho):</b> progresso, disciplinas, materiais (só o texto extraído — o PDF não é guardado), guias, questões e agenda ficam no navegador deste aparelho. Limpar os dados do site apaga tudo: exporte o histórico em Progresso.</li>
          <li><b>Com conta:</b> os mesmos dados ficam no Supabase (banco de dados e arquivos). Cada tabela só entrega as linhas da sua conta — a regra está no próprio banco, não só no app. O PDF fica numa pasta privada da conta.</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="h-proc">
        <div className="panel-head"><h2 id="h-proc">Como os materiais são processados</h2></div>
        <ul className="plain">
          <li>O texto do PDF é extraído no seu navegador. Não há OCR: PDF digitalizado (só imagem) fica como “Precisa de atenção”.</li>
          <li>Na conta, o servidor confere o arquivo (tipo real, até 10 MB, mesmo conteúdo lido no aparelho) antes de marcá-lo como pronto.</li>
          <li>O conteúdo do material é tratado como dado, nunca como instrução: ele não muda permissões nem acessa outras contas, e nenhum código do material ou gerado é executado.</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="h-ext">
        <div className="panel-head"><h2 id="h-ext">Serviços externos</h2></div>
        <ul className="plain">
          <li><b>Supabase</b> (só com conta): hospeda a conta, o banco, os arquivos e as funções do servidor.</li>
          <li><b>Provedor de IA — Anthropic</b> (só com conta, só se a geração estiver configurada no site e só quando você pede): {AI_SENDS} A resposta é conferida e salva na sua conta. Segundo a documentação do provedor, dados retidos não são usados para treinar modelos sem permissão expressa; o prazo de retenção segue a política comercial da API (“API and data retention”, platform.claude.com).</li>
          <li>Não há anúncios nem rastreadores. Sem conta, nada sai do aparelho.</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="h-del">
        <div className="panel-head"><h2 id="h-del">O que cada exclusão leva</h2></div>
        <ul className="plain">
          <li><b>Material:</b> o arquivo (na conta), o texto extraído, as questões e os guias gerados dele, as tarefas de geração que o usaram e o texto dessas questões no histórico. O acerto/erro das sessões continua. Eventos da agenda ficam (o vínculo aparece como excluído).</li>
          <li><b>Questão:</b> sai das listas e das sessões; as tentativas antigas mantêm a cópia que você respondeu. Para só tirar das sessões, arquive.</li>
          <li><b>Guia:</b> todas as seções e versões anteriores.</li>
          <li><b>Disciplina:</b> assuntos, materiais (com tudo acima), questões, guias e eventos dela.</li>
          <li><b>Conta:</b> tudo o que está nela, incluindo arquivos e o registro de consumo. Os dados deste aparelho sem conta não são afetados.</li>
          <li>Não há cópias guardadas para novas gerações: cada geração lê o material atual; material excluído não volta a ser usado.</li>
          <li>O que já foi enviado ao provedor de IA segue a política de retenção dele (acima); o Study Mastery não consegue apagar lá.</li>
        </ul>
        <div className="row wrap">
          <button type="button" className="ghost" onClick={() => go('#/progress')}>Exportar histórico</button>
          <button type="button" className="ghost" onClick={() => go('#/conta')}>Conta e exclusão</button>
        </div>
      </section>
    </>
  );
}
