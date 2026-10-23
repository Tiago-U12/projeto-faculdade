import { ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { DIFFICULTIES, DIFFICULTY_LABEL, MODE_LABEL } from '../types';
import { topicName } from '../lib/bank';
import { useStudy } from '../state';
import { ExplanationBlock } from './Explanation';
import { RichText } from './RichText';

export function Results({ go }: { go: (to: string) => void }) {
  const { bank, state, start } = useStudy();
  const attempt = state.attempts[0];
  const last = state.settings.lastConfig;
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
        <h1 className="screen-title">Nada por aqui ainda</h1>
        <button type="button" className="primary" onClick={() => go('#/setup')}>Configurar sessão <ArrowRight size={18} aria-hidden="true" /></button>
      </section>
    );
  }
  const wrongIds = attempt.answers.filter((a) => !a.correct).map((a) => a.questionId);
  const msg = stats.pct >= 85 ? 'Excelente rodada! Experimente a camada de desafio.' : stats.pct >= 60 ? 'Bom caminho. Revise os pontos abaixo para consolidar.' : 'Ótimo ponto de partida: os erros mostram exatamente o que revisar.';
  const redo = () => {
    if (!last) return;
    if (start({ ...last, mode: 'revisao', size: Math.min(20, wrongIds.length) }, wrongIds)) go('#/quiz');
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
            <span className="bar-label">{topicName(bank, attempt.disciplineId, t)}</span>
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
            const q = bank.byId.get(a.questionId);
            if (!q) return <li key={a.questionId} className="review-item gone">Questão {a.questionId} saiu do banco nesta versão.</li>;
            const mine = q.options.find((o) => o.id === a.chosenOptionId);
            const right = q.options.find((o) => o.id === q.correctOptionId)!;
            return (
              <li key={a.questionId} className={'review-item ' + (a.correct ? 'ok' : 'no')}>
                <details open={!a.correct}>
                  <summary><span className="rv-n">{i + 1}</span><span className="rv-stem"><RichText text={q.stem.split('\n')[0]} /></span><span className="rv-badge">{a.correct ? 'acertou' : a.chosenOptionId ? 'errou' : 'em branco'}</span></summary>
                  <div className="rv-body">
                    <RichText as="div" className="rv-full" text={q.stem} />
                    {!a.correct && <p className="rv-line"><b>Sua resposta:</b> {mine ? <RichText text={mine.text} /> : 'sem resposta'}</p>}
                    <p className="rv-line"><b>Correta:</b> <RichText text={right.text} /></p>
                    <ExplanationBlock q={q} chosenId={a.chosenOptionId} bank={bank} />
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="result-actions">
        {wrongIds.length > 0 && last && <button type="button" className="primary" onClick={redo}><RotateCcw size={17} aria-hidden="true" /> Refazer os {wrongIds.length} erro{wrongIds.length > 1 ? 's' : ''}</button>}
        <button type="button" className="ghost" onClick={() => go('#/setup')}>Outra sessão</button>
        <button type="button" className="text-btn" onClick={() => go('#/')}>Início</button>
      </div>
    </>
  );
}
