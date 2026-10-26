import { ArrowLeft, ClipboardCopy, Download, LifeBuoy, RefreshCw, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collectDiagnostics, formatDiagnostics, repairAppCache } from '../lib/diagnostics';
import { useStudy } from '../state';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadText(name: string, text: string, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Ajuda para quando algo não abre ou parece errado: diagnóstico copiável e reparo que preserva o progresso. */
export function Help({ go }: { go: (to: string) => void }) {
  const { bank, exportJson } = useStudy();
  const [report, setReport] = useState('Coletando…');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);

  const refresh = () => collectDiagnostics(__APP_VERSION__, bank.manifest.bankVersion).then((r) => setReport(formatDiagnostics(r)), (e) => setReport('Não foi possível coletar: ' + String(e)));
  useEffect(() => {
    void refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const repair = async () => {
    setMsg('Reparando…');
    try {
      const r = await repairAppCache();
      setMsg(`Pronto: ${r.cachesDeleted.length} cache(s) e ${r.unregistered} service worker removidos. Recarregando…`);
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      setMsg('O reparo não terminou: ' + String(e) + '. Recarregue a página e tente de novo.');
    }
  };

  return (
    <>
      <button type="button" className="back" onClick={() => go('#/')}><ArrowLeft size={18} aria-hidden="true" /> Início</button>
      <h1 className="screen-title">Ajuda e <em>diagnóstico.</em></h1>
      <p className="sub">Se o app não abre, fica em branco ou mostra algo estranho, comece por aqui. Nada nesta tela apaga seu progresso. Sobre armazenamento e envio de dados, veja <a href="#/dados">Seus dados e privacidade</a>.</p>

      <section className="panel"><h2>Feedback e melhorias</h2><p>Encontrou uma resposta que parece errada, um problema no site ou tem uma sugestão? Descreva o que aconteceu e, se ajudar, adicione prints.</p><a className="primary" href="#/feedback">Enviar feedback</a></section>

      <section className="panel" aria-labelledby="h-steps">
        <div className="panel-head"><h2 id="h-steps"><LifeBuoy size={18} aria-hidden="true" /> O que tentar</h2></div>
        <ol className="plain">
          <li>Recarregue a página com internet.</li>
          <li>Se continuar, use “Reparar o app” abaixo: ele baixa o app de novo e mantém progresso, configurações e a música escolhida.</li>
          <li>Ainda com problema? Copie o diagnóstico e envie junto com o que aparece na tela, o aparelho e os passos que levaram ao erro.</li>
        </ol>
      </section>

      <section className="panel" aria-labelledby="h-diag">
        <div className="panel-head"><h2 id="h-diag">Diagnóstico deste aparelho</h2><button type="button" className="text-btn" onClick={() => void refresh()}><RefreshCw size={14} aria-hidden="true" /> Atualizar</button></div>
        <pre className="diag" aria-label="Diagnóstico">{report}</pre>
        <div className="row wrap">
          <button type="button" className="ghost" onClick={async () => setMsg((await copyText(report)) ? 'Diagnóstico copiado.' : 'Não deu para copiar automaticamente: selecione o texto acima e copie.')}><ClipboardCopy size={16} aria-hidden="true" /> Copiar diagnóstico</button>
        </div>
        <p className="hint">O diagnóstico não inclui suas respostas nem nada salvo por você: só versão, navegador, tela, cache e erros técnicos.</p>
      </section>

      <section className="panel" aria-labelledby="h-repair">
        <div className="panel-head"><h2 id="h-repair"><Wrench size={18} aria-hidden="true" /> Reparar o app</h2></div>
        <p>Remove apenas os arquivos do app guardados para uso offline e o service worker. Depois, a página recarrega e baixa tudo de novo — é preciso estar com internet.</p>
        {confirm ? (
          <div className="confirm" role="alertdialog" aria-label="Reparar o app">
            <p>Seu progresso continua salvo neste aparelho. Se quiser uma cópia extra antes, exporte o histórico.</p>
            <div className="row wrap">
              <button type="button" className="ghost" onClick={() => downloadText(`study-mastery-historico-${new Date().toISOString().slice(0, 10)}.json`, exportJson())}><Download size={16} aria-hidden="true" /> Exportar histórico</button>
              <button type="button" className="ghost" onClick={() => setConfirm(false)}>Cancelar</button>
              <button type="button" className="primary" onClick={() => void repair()}>Reparar e recarregar</button>
            </div>
          </div>
        ) : (
          <button type="button" className="ghost" onClick={() => setConfirm(true)}><Wrench size={16} aria-hidden="true" /> Reparar o app</button>
        )}
        <p role="status" className="hint">{msg}</p>
      </section>
      <details className="panel"><summary>Administração</summary><p><a href="#/feedback-admin">Abrir caixa privada de feedbacks</a> (exige chave de acesso).</p></details>
    </>
  );
}
