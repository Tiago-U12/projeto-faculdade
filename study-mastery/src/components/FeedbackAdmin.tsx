import { useEffect, useRef, useState } from 'react';
import { feedbackRequest, KIND_LABEL, STATUS_LABEL, type FeedbackItem, type FeedbackStatus } from '../feedback/client';
import { downloadText } from './Help';

/** Credentials stay in memory; authorization is checked by the server on every operation. */
export function FeedbackAdmin() {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [next, setNext] = useState<string>();
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [status, setStatus] = useState<FeedbackStatus>('new');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const list = async (auth: string, cursor?: string) => {
    const result = await feedbackRequest<{ items: FeedbackItem[]; next?: string }>('?action=list' + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''), {}, auth);
    return result;
  };
  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    const current = ++generation.current;
    try {
      const result = await list(password);
      if (current !== generation.current) return;
      setToken(password); setPassword(''); setItems(result.items); setNext(result.next);
    } catch (e) { if (current === generation.current) setMessage((e as Error).message); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const loadMore = async () => {
    setBusy(true); setMessage(''); const current = generation.current;
    try { const result = await list(token, next); if (current === generation.current) { setItems(old => [...old, ...result.items.filter(i => !old.some(x => x.id === i.id))]); setNext(result.next); } }
    catch (e) { if (current === generation.current) setMessage((e as Error).message); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const open = async (id: string) => {
    setBusy(true); setMessage(''); setSelected(null); const current = generation.current;
    try {
      const { item } = await feedbackRequest<{ item: FeedbackItem }>(`?action=detail&id=${encodeURIComponent(id)}`, {}, token);
      if (current !== generation.current) return;
      setSelected(item); setStatus(item.status); setNote(item.note ?? ''); setConfirmDelete(false);
    } catch (e) { if (current === generation.current) setMessage((e as Error).message); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const update = async (remove = false) => {
    if (!selected) return;
    setBusy(true); setMessage(''); const current = generation.current;
    try {
      await feedbackRequest(`?id=${encodeURIComponent(selected.id)}`, { method: remove ? 'DELETE' : 'PATCH', ...(!remove ? { body: JSON.stringify({ status, note }) } : {}) }, token);
      if (current !== generation.current) return;
      setItems(old => remove ? old.filter(i => i.id !== selected.id) : old.map(i => i.id === selected.id ? { ...i, status, note } : i));
      setSelected(remove ? null : { ...selected, status, note }); setConfirmDelete(false);
      setMessage(remove ? 'Relato e anexos excluídos.' : 'Acompanhamento atualizado.');
    } catch (e) { if (current === generation.current) setMessage((e as Error).message); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const logout = () => { generation.current++; setToken(''); setPassword(''); setItems([]); setSelected(null); setMessage(''); setBusy(false); setNext(undefined); };
  return <>
    <h1 className="screen-title">Caixa de feedbacks</h1>
    <p className="sub">Área privada da administração. Relatos são informações para investigar; não comprovam por si só que uma questão está errada.</p>
    {!token ? <form className="panel" onSubmit={e => void login(e)}>
      <label className="field"><span>Chave de acesso da administração</span><input type="password" autoComplete="off" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      <p className="hint">A chave fica apenas nesta tela enquanto a área estiver aberta. Não envie a chave em relatos ou prints.</p>
      <button type="submit" className="primary" disabled={busy || !password.trim()}>{busy ? 'Abrindo…' : 'Abrir caixa'}</button>
    </form> : <>
      <div className="row wrap"><button type="button" className="ghost" onClick={logout}>Sair da administração</button><span className="hint">{items.length} relatos carregados</span></div>
      {items.length === 0 && <p>Nenhum feedback recebido.</p>}
      <ul className="plain feedback-inbox">{items.map(item => <li key={item.id}>
        <button type="button" className="ghost feedback-inbox-row" disabled={busy} onClick={() => void open(item.id)}>
          <strong>{KIND_LABEL[item.kind]}</strong><span>{item.message.slice(0, 140)}</span>
          <small>{STATUS_LABEL[item.status]} · {new Date(item.createdAt).toLocaleDateString('pt-BR')} · {item.imageCount} print(s)</small>
        </button>
      </li>)}</ul>
      {next && <button type="button" className="ghost" disabled={busy} onClick={() => void loadMore()}>Carregar mais relatos</button>}
      {selected && <section className="panel feedback-detail" aria-label="Detalhes do feedback">
        <h2>{KIND_LABEL[selected.kind]}</h2><p className="hint">Protocolo: {selected.id}</p>
        <p className="feedback-message">{selected.message}</p>
        <p>App {selected.appVersion} · tela {selected.page}</p>
        {selected.questionId && <p>Questão: {selected.questionId}{selected.questionVersion ? ` · versão ${selected.questionVersion}` : ''}</p>}
        <div className="feedback-images">{selected.images?.map((img, i) => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(img.dataUrl) && <figure key={i}><img className="screenshot-preview" src={img.dataUrl} alt={`Print ${i + 1} enviado com o feedback`} /><figcaption>Print {i + 1}</figcaption></figure>)}</div>
        <label className="field"><span id="feedback-status-label">Status</span><select aria-labelledby="feedback-status-label" value={status} onChange={e => setStatus(e.target.value as FeedbackStatus)}>{Object.entries(STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="field"><span>Anotações da análise (privadas)</span><textarea value={note} maxLength={2000} rows={4} onChange={e => setNote(e.target.value)} placeholder="O que foi reproduzido, correção ou motivo de encerramento…" /></label>
        <div className="row wrap"><button type="button" className="primary" disabled={busy} onClick={() => void update()}>Salvar acompanhamento</button>
          <button type="button" className="ghost" onClick={() => downloadText(`feedback-${selected.id}.json`, JSON.stringify(selected, null, 2))}>Exportar relato e prints</button>
          <button type="button" className="text-btn danger-text" disabled={busy} onClick={() => setConfirmDelete(true)}>Excluir relato</button></div>
        {confirmDelete && <div className="confirm" role="alertdialog" aria-label="Excluir feedback"><p>Excluir definitivamente este relato e os prints? Esta ação não pode ser desfeita.</p><div className="row wrap"><button type="button" className="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" className="danger" disabled={busy} onClick={() => void update(true)}>Excluir definitivamente</button></div></div>}
      </section>}
    </>}
    <p role="status" className="hint">{message}</p>
  </>;
}
