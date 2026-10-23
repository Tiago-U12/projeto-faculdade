import { Lightbulb, TriangleAlert } from 'lucide-react';
import type { PublishedQuestion } from '../types';
import { DIFFICULTY_LABEL, SCOPE_LABEL } from '../types';
import type { Bank } from '../lib/bank';
import { RichText } from './RichText';

export function Sources({ q, bank }: { q: PublishedQuestion; bank: Bank }) {
  return (
    <ul className="sources">
      {q.sourceRefs.map((r, i) => {
        const s = bank.sources.get(r.sourceId);
        return (
          <li key={i}>
            <b>{s?.title ?? r.sourceId}</b>
            {r.locator && <> — {r.locator}</>}
            {s?.institution && <small> · {s.institution}</small>}
            {s?.license && <small> · {s.license}</small>}
          </li>
        );
      })}
    </ul>
  );
}

/** Explicação completa: por que está certa, passo a passo, por que a escolhida está errada e erros frequentes. */
export function ExplanationBlock({ q, chosenId, bank }: { q: PublishedQuestion; chosenId: string | null; bank: Bank }) {
  const e = q.explanation;
  const wrong = chosenId && chosenId !== q.correctOptionId ? e.wrong?.[chosenId] : undefined;
  return (
    <div className="explain">
      {wrong && (
        <div className="why-wrong">
          <TriangleAlert size={16} aria-hidden="true" />
          <div><b>Por que sua resposta não serve</b><RichText as="div" className="explanation-text" text={wrong} /></div>
        </div>
      )}
      <div className="why-right">
        <Lightbulb size={16} aria-hidden="true" />
        <div><b>Por que a alternativa correta está certa</b><RichText as="div" className="explanation-text" text={e.correct} /></div>
      </div>
      {e.steps && e.steps.length > 0 && (
        <div className="steps">
          <b>Passo a passo</b>
          <ol>{e.steps.map((s, i) => <li key={i}><RichText text={s} /></li>)}</ol>
        </div>
      )}
      {e.commonMistakes && e.commonMistakes.length > 0 && (
        <div className="mistakes">
          <b>Erros frequentes</b>
          <ul>{e.commonMistakes.map((s, i) => <li key={i}><RichText text={s} /></li>)}</ul>
        </div>
      )}
      <details className="src-details">
        <summary>Fonte e referência</summary>
        <Sources q={q} bank={bank} />
        <p className="src-meta">Camada: {SCOPE_LABEL[q.scope]} · Nível: {DIFFICULTY_LABEL[q.difficulty]} · Verificação: {q.verifiedBy} · Revisão: {q.reviewedBy === 'human' ? 'humana' : 'assistida por IA (revisão humana pendente)'}</p>
      </details>
    </div>
  );
}
