import { ArrowLeft, MessageSquare, Paperclip, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { clearDraft, getFeedbackConfig, loadDraft, newDraft, prepareImage, saveDraft, sendFeedback, type FeedbackDraft } from '../feedback/client';
import { FeedbackChallenge } from './FeedbackChallenge';

const LABELS: Record<FeedbackDraft['kind'], string> = {
  question: 'Erro em uma questão', bug: 'Problema no site', suggestion: 'Sugestão de melhoria',
};

/** Envia somente o conteúdo que o estudante revisa e confirma. Rascunhos nunca são enviados automaticamente. */
export function Feedback({ go, questionId, questionVersion }: { go: (to: string) => void; questionId?: string; questionVersion?: number }) {
  const fieldId = useId();
  const [draft, setDraft] = useState(() => newDraft({ questionId, questionVersion }));
  const [stored, setStored] = useState<FeedbackDraft | null>(null);
  const [config, setConfig] = useState<{ enabled: boolean; siteKey?: string } | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [replaceId, setReplaceId] = useState('');
  const [receipt, setReceipt] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  const sending = useRef(false);
  const preparingRef = useRef(false);
  const onToken = useCallback((value: string) => setToken(value), []);

  useEffect(() => {
    let active = true;
    void getFeedbackConfig().then((value) => { if (active) setConfig(value); }, () => { if (active) setConfig({ enabled: false }); });
    void loadDraft().then((value) => { if (active) setStored(value); }, () => { if (active) setNotice('Não foi possível abrir o rascunho salvo neste navegador.'); });
    const update = () => { setOnline(navigator.onLine); setToken(''); setResetKey((n) => n + 1); };
    addEventListener('online', update); addEventListener('offline', update);
    return () => { active = false; removeEventListener('online', update); removeEventListener('offline', update); };
  }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const edit = (patch: Partial<FeedbackDraft>) => {
    setDraft((old) => ({ ...old, ...patch, id: newDraft().id }));
    setNotice(''); setReplaceId('');
  };
  const keepDraft = async () => {
    setError('');
    try {
      const previous = await loadDraft();
      if (previous && previous.id !== draft.id && replaceId !== previous.id) {
        setStored(previous); setReplaceId(previous.id);
        setNotice('Já há outro rascunho salvo. Para substituí-lo por este conteúdo, use “Substituir rascunho salvo”.');
        return;
      }
      await saveDraft(draft); setStored(draft); setReplaceId(''); setNotice('Rascunho salvo neste aparelho. Ainda não foi enviado.');
    }
    catch { setError('Não foi possível salvar o rascunho. O armazenamento pode estar cheio ou bloqueado; mantenha esta tela aberta e copie seu texto.'); }
  };
  const addFiles = async (files: File[]) => {
    if (!files.length || preparingRef.current || sending.current) return;
    setError('');
    if (files.length + draft.images.length > 2) { setError('Anexe no máximo 2 prints. Remova uma imagem antes de escolher outra.'); return; }
    preparingRef.current = true; setPreparing(true);
    try {
      const images = await Promise.all(files.map(prepareImage));
      setDraft((old) => ({ ...old, id: newDraft().id, images: [...old.images, ...images].slice(0, 2) }));
      setNotice('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível preparar a imagem. Escolha um print em JPG, PNG ou WebP.'); }
    finally { preparingRef.current = false; setPreparing(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending.current || preparingRef.current) return;
    setError(''); setNotice('');
    if (!online || !navigator.onLine) { setError('Você está sem internet. Salve o rascunho e envie quando estiver conectado.'); return; }
    if (!config?.enabled || !config.siteKey) { setError('Envio ainda não disponível. Você pode salvar um rascunho neste aparelho.'); return; }
    if (!consent || !token || draft.message.trim().length < 10 || draft.message.length > 4000) { setError('Descreva o que aconteceu, confirme o envio e conclua a verificação de segurança.'); return; }
    sending.current = true; setBusy(true);
    try {
      const result = await sendFeedback({ ...draft, message: draft.message.trim() }, token);
      setReceipt(result.id);
      // Não apagar um rascunho diferente que o estudante decidiu não retomar.
      try { const previous = await loadDraft(); if (previous?.id === draft.id) await clearDraft(); } catch { /* o recebimento já foi confirmado pelo servidor */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível confirmar o envio. Seu texto e seus prints continuam nesta tela; tente novamente ou salve um rascunho.');
    } finally { setToken(''); setResetKey((n) => n + 1); sending.current = false; setBusy(false); }
  };

  if (receipt) return (
    <section className="panel feedback-page">
      <h1 className="screen-title">Feedback recebido</h1>
      <p role="status">Seu relato foi recebido pela administração do Study Mastery.</p>
      <p>Protocolo: <code className="feedback-receipt">{receipt}</code></p>
      <p className="hint">Guarde este número para mencionar o relato depois. O envio não significa que o problema já foi revisado ou corrigido.</p>
      <div className="row wrap">
        <button type="button" className="primary" onClick={() => { setDraft(newDraft()); setReceipt(''); setConsent(false); setStored(null); setError(''); setNotice(''); }}>Enviar outro feedback</button>
        <button type="button" className="ghost" onClick={() => go('#/')}>Voltar ao início</button>
      </div>
    </section>
  );

  return (
    <>
      <button type="button" className="back" onClick={() => go('#/')}><ArrowLeft size={18} aria-hidden="true" /> Início</button>
      <h1 className="screen-title">Feedback e <em>melhorias</em></h1>
      <p className="sub">Encontrou uma alternativa errada, algum problema ou tem uma ideia? Conte o que aconteceu para ajudar a melhorar o Study Mastery.</p>
      {!online && <p className="notice" role="status">Você está sem internet. Pode preparar e salvar um rascunho; o envio precisa de conexão.</p>}
      {config === null && <p role="status" className="hint">Conferindo disponibilidade do envio…</p>}
      {config?.enabled === false && <div className="notice"><p>Envio ainda não disponível. Você pode salvar um rascunho neste aparelho.</p><button type="button" className="text-btn" onClick={() => { setConfig(null); void getFeedbackConfig().then(setConfig, () => setConfig({ enabled: false })); }}>Tentar conectar novamente</button></div>}
      {stored && <div className="panel"><p>{stored.id === draft.id ? 'Este rascunho está salvo no aparelho.' : 'Há um rascunho salvo neste aparelho. Retomá-lo substitui o conteúdo desta tela.'}</p><div className="row wrap"><button type="button" className="ghost" disabled={busy || preparing} onClick={() => { setDraft(stored); setConsent(false); setToken(''); setResetKey((n) => n + 1); setError(''); setNotice('Rascunho retomado. Confira os dados antes de enviar.'); }}>Retomar rascunho</button><button type="button" className="text-btn" onClick={() => void clearDraft().then(() => { setStored(null); setNotice('Rascunho apagado deste aparelho.'); }, () => setError('Não foi possível apagar o rascunho.'))}>Apagar rascunho salvo</button></div></div>}
      <form className="panel feedback-page" aria-label="Enviar feedback" onPaste={(e) => { const files = Array.from(e.clipboardData.files); if (files.length) { e.preventDefault(); void addFiles(files); } }} onSubmit={(e) => void submit(e)}>
        <fieldset disabled={busy || preparing}>
          <legend><MessageSquare size={18} aria-hidden="true" /> O que você quer relatar?</legend>
          {(Object.keys(LABELS) as FeedbackDraft['kind'][]).map((kind) => <label key={kind} className="report-opt"><input type="radio" name="feedback-kind" value={kind} checked={draft.kind === kind} onChange={() => edit({ kind, ...(kind === 'question' ? {} : { questionId: undefined, questionVersion: undefined }) })} /> {LABELS[kind]}</label>)}
          {draft.kind === 'question' && <label className="field"><span id={fieldId + '-qid'}>Identificador da questão (opcional)</span><input aria-labelledby={fieldId + '-qid'} value={draft.questionId ?? ''} maxLength={120} placeholder="Ex.: c2-lhopital-001" onChange={(e) => edit({ questionId: e.target.value || undefined, questionVersion: e.target.value === questionId ? questionVersion : undefined })} /><small className="hint">Use o código exibido na questão, se disponível. Não precisa copiar todo o enunciado.</small></label>}
          <label className="field"><span id={fieldId + '-message'}>O que aconteceu ou o que você sugere?</span><textarea aria-labelledby={fieldId + '-message'} value={draft.message} minLength={10} maxLength={4000} required rows={6} onChange={(e) => edit({ message: e.target.value })} placeholder="Diga o que estava fazendo, o que apareceu e o que esperava. Em uma questão, indique a alternativa e por que ela parece incorreta." /><small className="hint">{draft.message.length}/4000 caracteres · mínimo de 10</small></label>
          <label className="field"><span id={fieldId + '-images'}><Paperclip size={16} aria-hidden="true" /> Anexar prints (opcional)</span><input aria-labelledby={fieldId + '-images'} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={draft.images.length >= 2 || busy || preparing} onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; void addFiles(files); }} /><small className="hint">Até 2 imagens JPG, PNG ou WebP. Os prints são reduzidos no aparelho antes do envio. Revise-os e esconda nomes, senhas e outras informações pessoais.</small></label>
          {draft.images.length > 0 && <ul className="feedback-images">{draft.images.map((image, i) => <li key={i}><img className="screenshot-preview" src={image.dataUrl} alt={`Print ${i + 1}: ${image.name}`} /><span>{image.name}</span><button type="button" className="text-btn" onClick={() => edit({ images: draft.images.filter((_, at) => at !== i) })}><Trash2 size={14} aria-hidden="true" /> Remover print {i + 1}</button></li>)}</ul>}
          {preparing && <p role="status">Preparando os prints…</p>}
          <p className="hint">Este envio é privado, acessível à administração do Study Mastery. Enviamos seu texto, os prints escolhidos, o código da questão quando informado, a tela e a versão do app. Suas respostas, materiais e histórico não são incluídos. <a href="#/dados">Seus dados e privacidade</a>.</p>
          <label className="report-opt"><input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (!e.target.checked) setToken(''); }} /> Revisei o texto e os prints e concordo em enviá-los para análise.</label>
        </fieldset>
        {config?.enabled && config.siteKey && online && consent && <FeedbackChallenge siteKey={config.siteKey} onToken={onToken} resetKey={resetKey} />}
        {error && <div className="notice" role="alert" tabIndex={-1} ref={errorRef}>{error}</div>}
        {notice && <p role="status" className="hint">{notice}</p>}
        <div className="row wrap">
          <button type="button" className="ghost" disabled={busy || preparing} onClick={() => void keepDraft()}>{replaceId ? 'Substituir rascunho salvo' : 'Salvar rascunho'}</button>
          <button type="submit" className="primary" disabled={busy || preparing || !online || !config?.enabled || !config.siteKey || !consent || !token || draft.message.trim().length < 10 || draft.message.length > 4000}>{busy ? 'Enviando…' : 'Enviar feedback'}</button>
        </div>
        <p className="hint">Rascunhos ficam só neste navegador e nunca são enviados automaticamente. Apagar os dados do site também apaga os rascunhos.</p>
      </form>
    </>
  );
}
