import { AlertTriangle, ArrowLeft, Download, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { reviewCounts } from '../lib/engine';
import type { DisciplineId } from '../types';
import { MODE_LABEL } from '../types';
import { useStudy } from '../state';

export function Progress({ go }: { go: (to: string) => void }) {
  const { bank, state, persisted, exportJson, importJson, clearAll } = useStudy();
  const [disciplineId, setDisciplineId] = useState<DisciplineId>('calculo2');
  const [msg, setMsg] = useState<string>('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<'merge' | 'replace'>('merge');
  const discipline = bank.taxonomy.disciplines.find((d) => d.id === disciplineId)!;

  const attempts = state.attempts.filter((a) => a.disciplineId === disciplineId);
  const answers = attempts.flatMap((a) => a.answers);
  const pct = answers.length ? Math.round((100 * answers.filter((a) => a.correct).length) / answers.length) : null;
  const perTopic = useMemo(() => {
    const m = new Map<string, { seen: number; ok: number; distinct: number; total: number }>();
    for (const t of discipline.topics) m.set(t.id, { seen: 0, ok: 0, distinct: 0, total: bank.questions.filter((q) => q.topicId === t.id).length });
    for (const [id, s] of Object.entries(state.stats)) {
      const q = bank.byId.get(id);
      if (!q || q.disciplineId !== disciplineId) continue;
      const c = m.get(q.topicId)!;
      c.seen += s.seen;
      c.ok += s.correct;
      c.distinct++;
    }
    return m;
  }, [bank, discipline, disciplineId, state.stats]);
  const rev = useMemo(() => reviewCounts(bank.questions.filter((q) => q.disciplineId === disciplineId), state.stats), [bank, disciplineId, state.stats]);

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `study-mastery-historico-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg('Histórico exportado.');
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const r = importJson(await f.text(), modeRef.current);
    setMsg(r.ok ? `Importado: ${r.attemptsAdded} sessão(ões) ${modeRef.current === 'merge' ? 'adicionada(s)' : 'carregada(s)'}.` : r.error);
  };

  return (
    <>
      <button type="button" className="back" onClick={() => go('#/')}><ArrowLeft size={18} aria-hidden="true" /> Início</button>
      <h1 className="screen-title">Seu <em>progresso.</em></h1>
      <p className="sub">Tudo fica salvo neste aparelho. Exporte o histórico para levar para outro dispositivo.</p>
      {!persisted && <p className="notice"><AlertTriangle size={15} aria-hidden="true" /> Seu navegador bloqueou o armazenamento local: o progresso só dura enquanto esta aba estiver aberta. Use “Exportar” para guardar.</p>}

      <div className="seg" role="tablist" aria-label="Disciplina">
        {bank.taxonomy.disciplines.map((d) => (
          <button key={d.id} type="button" role="tab" aria-selected={d.id === disciplineId} className={d.id === disciplineId ? 'seg-btn active' : 'seg-btn'} onClick={() => setDisciplineId(d.id)}>{d.short}</button>
        ))}
      </div>

      <div className="metrics">
        <div><span>SESSÕES</span><strong>{attempts.length}</strong><small>nesta disciplina</small></div>
        <div><span>ACERTOS</span><strong>{pct === null ? '—' : pct + '%'}</strong><small>{answers.length} respostas</small></div>
        <div><span>PARA REVISAR</span><strong>{rev.errors + rev.due}</strong><small>{rev.errors} erros · {rev.due} vencidas</small></div>
      </div>

      <section className="panel" aria-labelledby="h-topic-acc">
        <div className="panel-head"><h2 id="h-topic-acc">Evolução por assunto</h2></div>
        {discipline.topics.map((t) => {
          const c = perTopic.get(t.id)!;
          const rate = c.seen ? Math.round((100 * c.ok) / c.seen) : null;
          return (
            <div className="bar-row" key={t.id}>
              <span className="bar-label">{t.name}<small>{c.total ? `${c.distinct}/${c.total} questões praticadas` : 'sem questões aprovadas'}</small></span>
              <span className="meter" aria-hidden="true"><i style={{ width: `${rate ?? 0}%` }} /></span>
              <span className="bar-val">{rate === null ? '—' : rate + '%'}</span>
            </div>
          );
        })}
      </section>

      <section className="panel" aria-labelledby="h-hist">
        <div className="panel-head"><h2 id="h-hist">Últimas sessões</h2></div>
        {attempts.length === 0 ? <p className="muted">Nenhuma sessão concluída ainda.</p> : (
          <ul className="hist">
            {attempts.slice(0, 10).map((a) => {
              const ok = a.answers.filter((x) => x.correct).length;
              return <li key={a.id}><span>{new Date(a.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span><span>{MODE_LABEL[a.mode]}</span><b>{ok}/{a.answers.length}</b></li>;
            })}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="h-data">
        <div className="panel-head"><h2 id="h-data">Seus dados</h2></div>
        <div className="row wrap">
          <button type="button" className="ghost" onClick={download}><Download size={16} aria-hidden="true" /> Exportar histórico</button>
          <button type="button" className="ghost" onClick={() => { modeRef.current = 'merge'; fileRef.current?.click(); }}><Upload size={16} aria-hidden="true" /> Importar e mesclar</button>
          <button type="button" className="ghost" onClick={() => { modeRef.current = 'replace'; fileRef.current?.click(); }}><Upload size={16} aria-hidden="true" /> Importar e substituir</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={onFile} aria-label="Arquivo de histórico para importar" />
        </div>
        {confirmClear ? (
          <div className="confirm" role="alertdialog" aria-label="Apagar dados">
            <p>Apagar todo o histórico e as estatísticas deste aparelho? Isso não pode ser desfeito (exporte antes, se quiser guardar).</p>
            <div className="row"><button type="button" className="ghost" onClick={() => setConfirmClear(false)}>Cancelar</button><button type="button" className="danger" onClick={() => { clearAll(); setConfirmClear(false); setMsg('Dados apagados.'); }}>Apagar tudo</button></div>
          </div>
        ) : <button type="button" className="text-btn danger-text" onClick={() => setConfirmClear(true)}><Trash2 size={14} aria-hidden="true" /> Apagar meus dados</button>}
        <p role="status" className="hint">{msg}</p>
      </section>
    </>
  );
}
