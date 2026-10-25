import { ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { DIFFICULTIES, DIFFICULTY_LABEL, MODE_LABEL, type DisciplineId, type QuizQuestion } from '../types';
import { usePersonalQuiz } from '../personal/quiz';
import { topicName } from '../lib/bank';
import { useStudy } from '../state';
import { ExplanationBlock } from './Explanation';
import { reviewConfig } from '../lib/review';
import { RichText } from './RichText';

export function Results({ attemptId, go }: { attemptId?: string; go: (to: string) => void }) {
  const { bank, state, start, startPersonal } = useStudy();
  const attempt = attemptId === undefined ? state.attempts[0] : state.attempts.find((a) => a.id === attemptId);
  const personal = attempt?.source === 'pessoal';
  // tentativa com questões pessoais: o texto respondido vem da cópia guardada na tentativa
  const lookup = (id: string): QuizQuestion | undefined => attempt?.snapshots?.[id] ?? bank.byId.get(id);
  const current = usePersonalQuiz(personal ? attempt!.disciplineId : '');
  const nameOfTopic = (t: string) => {
    if (!personal) return topicName(bank, attempt!.disciplineId as DisciplineId, t);
    const snap = Object.values(attempt!.snapshots ?? {}).find((x) => x.topicId === t);
    return snap?.topicName ?? current.questions.find((x) => x.topicId === t)?.topicName ?? 'Assunto';
  };
  const stats = useMemo(() => {
    if (!attempt) return null;
    const total = attempt.answers.length;
    const ok = attempt.answers.filter((a) => a.correct).length;
    const byTopic = new Map<string, { ok: number; n: number }>();
    const byDiff = new Map<string, { ok: number; n: number }>();
    for (const a of attempt.answers) {
      for (const [m, k] of [[byTopic, a.topicId], [byDiff, a.difficulty]] as const) {
        const c = m.get(k) ?? { ok: 0, n: 0 };
        c.n++;
        if (a.correct) c.ok++;
        m.set(k, c);
      }
    }
    return { total, ok, pct: total ? Math.round((100 * ok) / total) : 0, byTopic, byDiff };
  }, [attempt]);

  if (!attempt || !stats) {
    return (
      <section className="empty">
        <h1 className="screen-title">{attemptId === undefined ? 'Nada por aqui ainda' : 'Tentativa não encontrada neste aparelho'}</h1>
        <button type="button" className="primary" onClick={() => go('#/setup')}>Configurar sessão <ArrowRight size={18} aria-hidden="true" /></button>
      </section>
    );
  }
  const wrongIds = attempt.answers.filter((a) => !a.correct).map((a) => a.questionId);
  const msg = stats.pct >= 85 ? 'Excelente rodada! Experimente a camada de desafio.' : stats.pct >= 60 ? 'Bom caminho. Revise os pontos abaixo para consolidar.' : 'Ótimo ponto de partida: os erros mostram exatamente o que revisar.';
  const redoPool = personal ? current.questions.filter((q) => wrongIds.includes(q.id) && q.status !== 'arquivada' && q.status !== 'reportada') : bank.questions.filter((q) => wrongIds.includes(q.id) && q.disciplineId === attempt.disciplineId);
  const redo = () => {
    if (personal) {
      const qs = current.questions.filter((q) => redoPool.some((x) => x.id === q.id));
      const cfg = { disciplineId: attempt.disciplineId, topicIds: [...new Set(qs.map((q) => q.topicId))], difficulties: [...new Set(qs.map((q) => q.difficulty))], scope: 'aula' as const, mode: 'revisao' as const, size: Math.min(20, qs.length) };
      if (startPersonal(cfg, qs)) go('#/quiz');
      return;
    }
    const questions = bank.questions.filter((q) => wrongIds.includes(q.id) && q.disciplineId === attempt.disciplineId);
    if (start(reviewConfig(attempt.disciplineId as DisciplineId, questions), wrongIds)) go('#/quiz');
  };

  return (
    <>
      <section className="result">
        <div className="result-icon"><Trophy size={36} aria-hidden="true" /></div>
        <div className="eyebrow">SESSÃO FINALIZADA · {MODE_LABEL[attempt.mode].toUpperCase()}</div>
        <h1>Você está <em>evoluindo.</em></h1>
        <p className="score" aria-label={`${stats.ok} de ${stats.total} acertos`}><strong>{stats.ok}</strong> / {stats.total} acertos · {stats.pct}%</p>
        <p className="sub">{msg}</p>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Por assunto</h2></div>
        {[...stats.byTopic.entries()].map(([t, c]) => (
          <div className="bar-row" key={t}>
            <span className="bar-label">{nameOfTopic(t)}</span>
            <span className="meter" aria-hidden="true"><i style={{ width: `${(100 * c.ok) / c.n}%` }} /></span>
            <span className="bar-val">{c.ok}/{c.n}</span>
          </div>
        ))}
        <div className="panel-head sub-head"><h2>Por dificuldade</h2></div>
        {DIFFICULTIES.filter((d) => stats.byDiff.has(d)).map((d) => {
          const c = stats.byDiff.get(d)!;
          return (
            <div className="bar-row" key={d}>
              <span className="bar-label">{DIFFICULTY_LABEL[d]}</span>
              <span className="meter" aria-hidden="true"><i style={{ width: `${(100 * c.ok) / c.n}%` }} /></span>
              <span className="bar-val">{c.ok}/{c.n}</span>
            </div>
          );
        })}
      </section>

      <section className="panel" aria-labelledby="h-review">
        <div className="panel-head"><h2 id="h-review">Revisão questão a questão</h2></div>
        <ol className="review-list">
          {attempt.answers.map((a, i) => {
            const q = lookup(a.questionId);
            if (!q) return <li key={a.questionId} className="review-item gone">{personal ? `Questão ${i + 1}: ${a.correct ? 'acertou' : 'errou'}. O texto não está guardado aqui (questão excluída com o material, ou tentativa antiga: o texto completo fica na conta).` : `Questão ${a.questionId} saiu do banco nesta versão.`}</li>;
            const mine = q.options.find((o) => o.id === a.chosenOptionId);
            const right = q.options.find((o) => o.id === q.correctOptionId)!;
            return (
              <li key={a.questionId} className={'review-item ' + (a.correct ? 'ok' : 'no')}>
                <details open={!a.correct}>
                  <summary><span className="rv-n">{i + 1}</span><span className="rv-stem"><RichText text={q.stem.split('\n')[0]} /></span><span className="rv-badge">{a.correct ? 'acertou' : a.chosenOptionId ? 'errou' : 'em branco'}</span></summary>
                  <div className="rv-body">
                    <RichText as="div" className="rv-full" text={q.stem} />
                    {!a.correct && <div className="rv-line"><b>Sua resposta:</b> {mine ? <RichText text={mine.text} /> : 'sem resposta'}</div>}
                    <div className="rv-line"><b>Correta:</b> <RichText text={right.text} /></div>
                    <ExplanationBlock q={q} chosenId={a.chosenOptionId} bank={bank} />
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="result-actions">
        {redoPool.length > 0 && <button type="button" className="primary" onClick={redo}><RotateCcw size={17} aria-hidden="true" /> Refazer os {redoPool.length} erro{redoPool.length > 1 ? 's' : ''}</button>}
        <button type="button" className="ghost" onClick={() => go(personal ? `#/disciplina?id=${attempt.disciplineId}` : '#/setup')}>Outra sessão</button>
        <button type="button" className="text-btn" onClick={() => go('#/')}>Início</button>
      </div>
    </>
  );
}
