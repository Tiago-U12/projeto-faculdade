import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDashed, FileText, FileUp, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { deleteMaterial, describeExtractError, materialDeletion, readPdf, syncToServer } from '../materials/service';
import { useCollection, usePersonal } from '../personal/context';
import { MATERIAL_STATUS_LABEL, newId, nowIso, topicKey, type MaterialStatus, type PageText, type PMaterial, type PTopic } from '../personal/types';
import { useMaterialCtx } from './MaterialNew';

const STATUS_HELP: Record<MaterialStatus, string> = {
  recebido: 'O material foi salvo e ainda não terminou de ser processado.',
  processando: 'O texto está sendo conferido.',
  pronto: 'Texto disponível para organizar assuntos, guias e questões.',
  atencao: 'O texto foi lido, mas tem um problema que impede um uso confiável. Veja abaixo o que fazer.',
  falhou: 'O processamento não terminou. Veja o motivo e tente de novo.',
};

export function StatusBadge({ status }: { status: MaterialStatus }) {
  const icon = status === 'pronto' ? <CheckCircle2 size={14} aria-hidden="true" /> : status === 'atencao' ? <AlertTriangle size={14} aria-hidden="true" /> : status === 'falhou' ? <XCircle size={14} aria-hidden="true" /> : <CircleDashed size={14} aria-hidden="true" />;
  return <span className={'status-badge s-' + status}>{icon} {MATERIAL_STATUS_LABEL[status]}</span>;
}

/** Processamento interrompido (aba fechada, sem rede): conta como falha para oferecer nova tentativa. */
export const isStuck = (m: PMaterial, now = Date.now()) => (m.status === 'recebido' || m.status === 'processando') && now - new Date(m.updatedAt).getTime() > 2 * 60 * 1000;

export function MaterialPage({ id, go }: { id: string; go: (to: string) => void }) {
  const ctx = useMaterialCtx();
  const p = usePersonal();
  const { items: materials, loading } = useCollection('materials');
  const { items: topics } = useCollection('topics');
  const { items: disciplines } = useCollection('disciplines');
  const m = materials.find((x) => x.id === id);
  const d = disciplines.find((x) => x.id === m?.disciplineId);
  const [pages, setPages] = useState<PageText[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (m) void p.repo.getPages(m.id).then(setPages, () => setPages([]));
  }, [m?.id, m?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p className="muted" role="status">Carregando…</p>;
  if (!m) {
    return (
      <section className="empty">
        <h1 className="screen-title">Material não encontrado</h1>
        <p className="sub">Ele pode ter sido excluído ou pertencer a outro espaço (outra conta ou este aparelho sem conta).</p>
        <button type="button" className="primary" onClick={() => go('#/disciplinas')}>Ver suas disciplinas</button>
      </section>
    );
  }
  const discTopics = topics.filter((t) => t.disciplineId === m.disciplineId);
  const status: MaterialStatus = isStuck(m) ? 'falhou' : m.status;
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: describeExtractError(e) });
    } finally {
      setBusy(false);
    }
  };

  const retry = (file?: File) =>
    run(async () => {
      if (!ctx.cloud) return; // neste aparelho o processamento termina na hora (sem servidor)
      if (m.kind === 'pdf') {
        if (!file) throw new Error('Escolha de novo o mesmo arquivo PDF para reenviar.');
        const read = await readPdf(file);
        if (read.sha256 !== m.sha256) throw new Error('Esse não é o mesmo arquivo lido antes. Escolha o PDF original ou adicione como novo material.');
        await syncToServer(ctx, m, read.pages, file);
      } else {
        await syncToServer(ctx, m, null, null);
      }
    }, 'Processamento retomado.');

  const addTopics = () =>
    run(async () => {
      const names = m.suggestedTopics.filter((s) => pick.has(s.name)).map((s) => s.name);
      const existing = new Map(discTopics.map((t) => [topicKey(t.name), t]));
      const now = nowIso();
      let pos = discTopics.reduce((x, t) => Math.max(x, t.position + 1), 0);
      const created: PTopic[] = [];
      const ids: string[] = [];
      for (const n of names) {
        const ex = existing.get(topicKey(n));
        if (ex) ids.push(ex.id);
        else {
          const t: PTopic = { id: newId(), disciplineId: m.disciplineId, name: n, position: pos++, origin: 'material', createdAt: now, updatedAt: now };
          created.push(t);
          ids.push(t.id);
        }
      }
      if (created.length) await p.save('topics', created);
      await p.save('materials', { ...m, topicIds: [...new Set([...m.topicIds, ...ids])], updatedAt: now });
      setPick(new Set());
    }, 'Assuntos adicionados à disciplina e associados a este material.');

  const toggleAssoc = (t: PTopic) => run(() => p.save('materials', { ...m, topicIds: m.topicIds.includes(t.id) ? m.topicIds.filter((x) => x !== t.id) : [...m.topicIds, t.id], updatedAt: nowIso() }));
  const del = materialDeletion(m);
  const unit = m.kind === 'pdf' ? 'página' : 'trecho';

  return (
    <>
      <button type="button" className="back" onClick={() => go(`#/disciplina?id=${m.disciplineId}`)}><ArrowLeft size={18} aria-hidden="true" /> {d?.name ?? 'Disciplina'}</button>
      <h1 className="screen-title mat-title">{m.title}</h1>
      <p className="sub">{m.kind === 'pdf' ? `PDF · ${m.fileName}` : 'Texto colado'} · {m.pageCount} {unit}{m.pageCount === 1 ? '' : 's'} · versão {m.version}</p>

      <section className="panel" aria-labelledby="h-status">
        <div className="panel-head"><h2 id="h-status">Processamento</h2><StatusBadge status={status} /></div>
        <p>{isStuck(m) ? 'O processamento foi interrompido (aba fechada ou sem conexão).' : STATUS_HELP[status]}</p>
        {m.statusDetail && <p className="form-error">{m.statusDetail}</p>}
        {!ctx.cloud && status === 'falhou' && <p className="hint">Neste aparelho o processamento acontece na hora: exclua este material e adicione o arquivo de novo.</p>}
        {ctx.cloud && m.serverCheckedAt && <p className="hint">Conferido no servidor em {new Date(m.serverCheckedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.</p>}
        {ctx.cloud && (status === 'falhou' || status === 'recebido') && (
          <div className="row wrap">
            {m.kind === 'pdf' ? (
              <>
                <button type="button" className="ghost" disabled={busy} onClick={() => fileRef.current?.click()}><FileUp size={16} aria-hidden="true" /> Tentar de novo (escolher o mesmo PDF)</button>
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void retry(f); }} />
              </>
            ) : (
              <button type="button" className="ghost" disabled={busy} onClick={() => void retry()}><RotateCcw size={16} aria-hidden="true" /> Tentar de novo</button>
            )}
          </div>
        )}
        {m.issues.length > 0 && (
          <ul className="issues">
            {m.issues.map((i) => (
              <li key={i.code} className={i.severity === 'bloqueia' ? 'blocking' : ''}>
                {i.severity === 'bloqueia' ? <AlertTriangle size={15} aria-hidden="true" /> : <FileText size={15} aria-hidden="true" />}
                <span>{i.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="h-topics">
        <div className="panel-head"><h2 id="h-topics">Assuntos</h2></div>
        {m.suggestedTopics.length > 0 && (
          <>
            <p className="hint">Sugeridos a partir dos títulos do material. Confira antes de adicionar: nada entra na disciplina sem você marcar.</p>
            <ul className="pick-list">
              {m.suggestedTopics.map((s) => {
                const already = discTopics.some((t) => topicKey(t.name) === topicKey(s.name));
                return (
                  <li key={s.name}>
                    <label className="check-row">
                      <input type="checkbox" disabled={already} checked={already || pick.has(s.name)} onChange={() => setPick((x) => { const n = new Set(x); if (n.has(s.name)) n.delete(s.name); else n.add(s.name); return n; })} />
                      <span>{s.name}<small> · {unit} {s.pages.join(', ')}{already ? ' · já na disciplina' : ''}</small></span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="ghost" disabled={busy || pick.size === 0} onClick={() => void addTopics()}>Adicionar {pick.size || ''} assunto{pick.size === 1 ? '' : 's'} à disciplina</button>
          </>
        )}
        {discTopics.length > 0 ? (
          <>
            <p className="hint">Assuntos da disciplina tratados neste material (usado para filtrar guias e questões):</p>
            <ul className="chips">
              {discTopics.map((t) => (
                <li key={t.id}><button type="button" className={'chip' + (m.topicIds.includes(t.id) ? ' on' : '')} aria-pressed={m.topicIds.includes(t.id)} disabled={busy} onClick={() => void toggleAssoc(t)}>{t.name}</button></li>
              ))}
            </ul>
          </>
        ) : (
          !m.suggestedTopics.length && <p className="muted">Nenhum assunto identificado. Cadastre os assuntos na página da disciplina.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="h-preview">
        <div className="panel-head"><h2 id="h-preview">Prévia do texto extraído</h2><small className="muted">{m.charCount.toLocaleString('pt-BR')} caracteres</small></div>
        {!pages ? (
          <p className="muted" role="status">Carregando texto…</p>
        ) : pages.length === 0 ? (
          <p className="muted">Sem texto salvo.</p>
        ) : (
          <ol className="page-preview">
            {pages.map((pg) => (
              <li key={pg.page}>
                <details>
                  <summary><b>{unit === 'página' ? 'Página' : 'Trecho'} {pg.page}</b> <span className="muted">{pg.text ? pg.text.slice(0, 90).replace(/\s+/g, ' ') + (pg.text.length > 90 ? '…' : '') : '(sem texto)'}</span></summary>
                  <pre className="page-text">{pg.text || '(sem texto nesta página)'}</pre>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel" aria-labelledby="h-del">
        <div className="panel-head"><h2 id="h-del">Excluir material</h2></div>
        {confirmDelete ? (
          <div className="confirm" role="alertdialog" aria-label="Excluir material">
            <p>Serão excluídos {del.file ? (ctx.cloud ? 'o arquivo PDF da sua pasta privada, ' : '') : ''}o texto extraído ({m.pageCount} {unit}{m.pageCount === 1 ? '' : 's'}) e este registro{ctx.cloud ? ', na sua conta' : ', neste aparelho'}. Os assuntos da disciplina continuam. Não dá para desfazer.</p>
            <div className="row wrap">
              <button type="button" className="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button type="button" className="danger" disabled={busy} onClick={() => void run(async () => { await deleteMaterial(ctx, m); go(`#/disciplina?id=${m.disciplineId}`); })}>Excluir</button>
            </div>
          </div>
        ) : (
          <button type="button" className="text-btn danger-text" onClick={() => setConfirmDelete(true)}><Trash2 size={14} aria-hidden="true" /> Excluir material</button>
        )}
      </section>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </>
  );
}
