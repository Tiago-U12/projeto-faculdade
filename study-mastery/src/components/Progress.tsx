import { AlertTriangle, ArrowLeft, CalendarDays, ClipboardCopy, Download, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { reviewConfig } from '../lib/review';
import { reviewCounts } from '../lib/engine';
import { evidenceText, MIN_ANSWERS, pendingActivities, topicProgress, upcomingExams, weekly } from '../lib/progress';
import type { DisciplineId, SessionConfig } from '../types';
import { DIFFICULTIES, MODE_LABEL } from '../types';
import { useStudy } from '../state';
import { useAccount } from '../account';
import { useCatalog, useTimeZone } from '../calendar/hooks';
import { brDate, shortDate } from '../calendar/time';
import { usePersonalOptional } from '../personal/context';
import { usePersonalQuiz } from '../personal/quiz';
import { copyText } from './Help';
import { formatReport } from './ReportError';
import { LabsProgressSection } from '../labs/integration';
import { plural } from './MaterialPage';

export function Progress({ go }: { go: (to: string) => void }) {
  const { bank, state, start, startPersonal, persisted, exportJson, importJson, clearAll } = useStudy();
  const account = useAccount();
  const inAccount = account.status === 'signedIn';
  const [clearing, setClearing] = useState(false);
  /** na conta, apagar também no servidor; senão o progresso voltaria na próxima sincronização */
  const clearEverywhere = async () => {
    setClearing(true);
    try {
      if (inAccount) {
        const sb = await account.client();
        for (const t of ['attempts', 'question_reports']) {
          const { error } = await sb.from(t).delete().eq('owner_id', account.user!.id);
          if (error) throw new Error(error.message);
        }
        const { error } = await sb.from('profiles').update({ active_session: null, active_updated_at: new Date().toISOString() }).eq('id', account.user!.id);
        if (error) throw new Error(error.message);
      }
      clearAll();
      setConfirmClear(false);
      setMsg(inAccount ? 'Histórico apagado da conta e deste aparelho.' : 'Dados apagados.');
    } catch (e) {
      setMsg('Nada foi apagado: ' + (e as Error).message);
    } finally {
      setClearing(false);
    }
  };
  const catalog = useCatalog();
  const [tz] = useTimeZone();
  const p = usePersonalOptional();
  const events = p?.items('events');
  useEffect(() => {
    if (p && !events) void p.load('events');
  }, [p, events]);
  const now = Date.now();
  const exams = upcomingExams(events ?? [], now, tz);
  const pending = pendingActivities(events ?? [], now, tz);

  const [disciplineId, setDisciplineId] = useState<string>('calculo2');
  const [msg, setMsg] = useState<string>('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<'merge' | 'replace'>('merge');
  const d = catalog.get(disciplineId) ?? catalog.get('calculo2')!;
  const isBank = d.kind === 'banco';
  const { questions: personalQs } = usePersonalQuiz(isBank ? '' : d.id);

  const attempts = state.attempts.filter((a) => a.disciplineId === d.id);
  const answers = attempts.flatMap((a) => a.answers).filter((a) => a.chosenOptionId !== null);
  const pct = answers.length ? Math.round((100 * answers.filter((a) => a.correct).length) / answers.length) : null;
  const perTopic = useMemo(() => topicProgress(state.attempts, d.id, d.topics.map((t) => t.id)), [state.attempts, d]);
  const bankTotals = useMemo(() => {
    const m = new Map<string, number>();
    if (isBank) for (const q of bank.questions) if (q.disciplineId === d.id) m.set(q.topicId, (m.get(q.topicId) ?? 0) + 1);
    return m;
  }, [bank, d, isBank]);
  /** questões do banco já vistas por assunto (pelas estatísticas, como antes da 0.6) */
  const bankPracticed = useMemo(() => {
    const m = new Map<string, number>();
    if (isBank) for (const id of Object.keys(state.stats)) { const q = bank.byId.get(id); if (q && q.disciplineId === d.id) m.set(q.topicId, (m.get(q.topicId) ?? 0) + 1); }
    return m;
  }, [bank, d, isBank, state.stats]);
  const usableMine = personalQs.filter((q) => q.status !== 'reportada' && q.status !== 'arquivada');
  const rev = useMemo(() => reviewCounts(isBank ? bank.questions.filter((q) => q.disciplineId === d.id) : usableMine, state.stats), [bank, d, isBank, usableMine, state.stats]);
  const weeks = useMemo(() => weekly(state.attempts, d.id, tz), [state.attempts, d, tz]);
  const studyDone = (events ?? []).filter((e) => e.disciplineId === d.id && e.status === 'concluido' && e.type !== 'prova' && e.type !== 'entrega').length;
  const listed = catalog.list.filter((c) => c.kind === 'banco' || state.attempts.some((a) => a.disciplineId === c.id) || (p?.items('questions') ?? []).some((q) => q.disciplineId === c.id));

  const reviewErrors = () => {
    if (isBank) {
      const questions = bank.questions.filter((q) => q.disciplineId === d.id && state.stats[q.id]?.lastCorrect === false);
      if (start(reviewConfig(d.id as DisciplineId, questions), questions.map((q) => q.id))) go('#/quiz');
      return;
    }
    const wrong = usableMine.filter((q) => state.stats[q.id]?.lastCorrect === false);
    const cfg: SessionConfig = { disciplineId: d.id, topicIds: [...new Set(wrong.map((q) => q.topicId))], difficulties: [...DIFFICULTIES], scope: 'aula', mode: 'revisao', size: Math.min(20, wrong.length) };
    if (startPersonal(cfg, wrong)) go('#/quiz');
  };

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
      <p className="sub">{inAccount ? 'Salvo na sua conta e sincronizado entre os aparelhos em que você entrar.' : 'Tudo fica salvo neste aparelho. Exporte o histórico para levar para outro dispositivo.'}</p>
      {!persisted && <p className="notice"><AlertTriangle size={15} aria-hidden="true" /> Seu navegador bloqueou o armazenamento local: o progresso só dura enquanto esta aba estiver aberta. Use “Exportar” para guardar.</p>}

      {(exams.length > 0 || pending.overdue.length > 0 || pending.today.length > 0) && (
        <section className="panel" aria-labelledby="h-next">
          <div className="panel-head"><h2 id="h-next"><CalendarDays size={18} aria-hidden="true" /> Agenda</h2></div>
          {exams.length > 0 && (
            <ul className="plain">
              {exams.slice(0, 4).map((x) => <li key={x.event.id}><b>{x.event.title}</b> · {brDate(x.date)} · {x.daysLeft === 0 ? 'é hoje' : `faltam ${plural(x.daysLeft, 'dia', 'dias')}`}</li>)}
            </ul>
          )}
          <p className="hint">
            {pending.overdue.length ? `${plural(pending.overdue.length, 'atividade atrasada', 'atividades atrasadas')} (não concluída${pending.overdue.length === 1 ? '' : 's'}). ` : ''}
            {pending.today.length ? `${plural(pending.today.length, 'atividade', 'atividades')} para hoje.` : ''}
          </p>
          <button type="button" className="ghost" onClick={() => go('#/agenda')}>Abrir agenda</button>
        </section>
      )}

      <ul className="chips disc-chips" aria-label="Disciplina">
        {listed.map((c) => (
          <li key={c.id}><button type="button" aria-pressed={c.id === d.id} className={'chip' + (c.id === d.id ? ' on' : '')} onClick={() => setDisciplineId(c.id)}>{c.kind === 'banco' ? (bank.taxonomy.disciplines.find((x) => x.id === c.id)?.short ?? c.name) : `${c.name} · sua`}</button></li>
        ))}
      </ul>
      <p className="hint">{isBank ? 'Questões do banco existente.' : 'Suas questões pessoais (separadas do banco existente).'} <b>Atividade</b> é o que você fez; <b>desempenho</b> são os acertos no questionário; <b>evidência</b> diz se já há respostas suficientes para alguma conclusão. Nenhum número aqui indica que você domina um assunto.</p>

      <div className="metrics">
        <div><span>ATIVIDADE</span><strong>{attempts.length}</strong><small>{plural(attempts.length, 'sessão concluída', 'sessões concluídas')}{studyDone ? ` · ${studyDone} na agenda` : ''}</small></div>
        <div><span>DESEMPENHO</span><strong>{pct === null ? '—' : pct + '%'}</strong><small>acertos em {plural(answers.length, 'resposta', 'respostas')}</small></div>
        <div><span>PARA REVISAR</span><strong>{rev.errors + rev.due}</strong><small>{rev.errors} erros · {rev.due} vencidas</small></div>
      </div>

      <button type="button" className="primary" disabled={rev.errors === 0} onClick={reviewErrors}>Revisar meus erros</button>

      <section className="panel" aria-labelledby="h-topic-acc">
        <div className="panel-head"><h2 id="h-topic-acc">Por assunto</h2></div>
        {d.topics.length === 0 && <p className="muted">Esta disciplina não tem assuntos cadastrados.</p>}
        {d.topics.map((t) => {
          const c = perTopic.get(t.id)!;
          const total = bankTotals.get(t.id);
          return (
            <div className={'bar-row' + (c.evidence === 'insuficiente' ? ' weak-evidence' : '')} key={t.id}>
              <span className="bar-label">{t.name}<small>{evidenceText(c)}{isBank ? ` · ${total ? `${bankPracticed.get(t.id) ?? 0}/${total} questões praticadas` : 'sem questões disponíveis'}` : ''}</small></span>
              <span className="meter" aria-hidden="true"><i style={{ width: `${c.rate ?? 0}%` }} /></span>
              <span className="bar-val">{c.rate === null ? '—' : c.rate + '%'}</span>
            </div>
          );
        })}
        <p className="src-meta">Percentual = acertos ÷ respostas no assunto. Com menos de {MIN_ANSWERS} respostas, o número aparece, mas não sustenta conclusão.</p>
      </section>

      <section className="panel" aria-labelledby="h-weeks">
        <div className="panel-head"><h2 id="h-weeks">Evolução por semana</h2></div>
        {weeks.length < 2 ? (
          <p className="muted">{weeks.length ? 'Só há respostas em uma semana: ainda não dá para comparar.' : 'Nenhuma resposta ainda nesta disciplina.'}</p>
        ) : (
          weeks.map((w) => {
            const rate = Math.round((100 * w.correct) / w.answered);
            return (
              <div className={'bar-row' + (w.answered < MIN_ANSWERS ? ' weak-evidence' : '')} key={w.weekStart}>
                <span className="bar-label">Semana de {shortDate(w.weekStart)}<small>{plural(w.sessions, 'sessão', 'sessões')} · {plural(w.answered, 'resposta', 'respostas')}</small></span>
                <span className="meter" aria-hidden="true"><i style={{ width: `${rate}%` }} /></span>
                <span className="bar-val">{rate}%</span>
              </div>
            );
          })
        )}
      </section>

      <LabsProgressSection go={go} />

      <section className="panel" aria-labelledby="h-hist">
        <div className="panel-head"><h2 id="h-hist">Últimas sessões</h2></div>
        {attempts.length === 0 ? <p className="muted">Nenhuma sessão concluída ainda.</p> : (
          <ul className="hist">
            {attempts.slice(0, 10).map((a) => {
              const ok = a.answers.filter((x) => x.correct).length;
              return <li key={a.id}><a href={`#/results?id=${encodeURIComponent(a.id)}`}>{new Date(a.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</a><span>{MODE_LABEL[a.mode]}</span><b>{ok}/{a.answers.length}</b></li>;
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
          {/* acionado pelos botões “Importar…”: fora do Tab e da árvore de acessibilidade para não virar um controle invisível duplicado */}
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} aria-label="Arquivo de histórico para importar" />
        </div>
        {confirmClear ? (
          <div className="confirm" role="alertdialog" aria-label="Apagar dados">
            <p>{inAccount ? 'Apagar todo o histórico, as estatísticas e os relatos desta conta, em todos os aparelhos?' : 'Apagar todo o histórico e as estatísticas deste aparelho?'} Isso não pode ser desfeito (exporte antes, se quiser guardar).</p>
            <div className="row"><button type="button" className="ghost" onClick={() => setConfirmClear(false)}>Cancelar</button><button type="button" className="danger" disabled={clearing} onClick={() => void clearEverywhere()}>Apagar tudo</button></div>
          </div>
        ) : <button type="button" className="text-btn danger-text" onClick={() => setConfirmClear(true)}><Trash2 size={14} aria-hidden="true" /> Apagar meus dados</button>}
        {(state.reports?.length ?? 0) > 0 && (
          <p className="hint">
            {state.reports!.length} relato(s) de erro salvos.{' '}
            <button type="button" className="text-btn" onClick={async () => setMsg((await copyText(state.reports!.map(formatReport).join('\n\n'))) ? 'Relatos copiados.' : 'Não foi possível copiar automaticamente.')}><ClipboardCopy size={14} aria-hidden="true" /> Copiar relatos</button>
          </p>
        )}
        <p role="status" className="hint">{msg}</p>
      </section>
    </>
  );
}
