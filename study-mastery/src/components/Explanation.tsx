import { Lightbulb, TriangleAlert } from 'lucide-react';
import type { PersonalQuizQuestion, PublishedQuestion, QuizQuestion } from '../types';
import { DIFFICULTY_LABEL, isPersonal, SCOPE_LABEL } from '../types';
import type { Bank } from '../lib/bank';
import { ReportError } from './ReportError';
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

/** Origem de uma questão pessoal: material, página/trecho e o trecho citado (conferido no material na geração). */
export function PersonalSources({ q }: { q: PersonalQuizQuestion }) {
  if (!q.refs.length) return <p className="src-meta">Sem trecho de material associado.</p>;
  return (
    <ul className="sources">
      {q.refs.map((r, i) => (
        <li key={i}>
          <b>{r.materialTitle}</b> — {r.unit} {r.page}
          <blockquote className="ref-quote">“{r.quote}”</blockquote>
        </li>
      ))}
    </ul>
  );
}

/** O que foi (e o que não foi) conferido numa questão pessoal — nada herdado do banco existente. */
export function personalProvenance(q: PersonalQuizQuestion): string {
  const byStudent = q.origin ? q.origin === 'aluno' : q.status === 'criada_aluno';
  if (byStudent) return 'Questão criada por você: o gabarito não passou por verificação automática. Sem revisão humana.';
  const c = q.checks;
  const parts = ['Gerada por IA a partir do seu material'];
  if (c) parts.push(`checagens automáticas${q.edited ? ' (da versão gerada)' : ''}: estrutura${c.alternativasDistintas ? ', alternativas distintas' : ''}, ${c.trechosConferidos} trecho(s) conferido(s) no material${c.semDuplicata ? ', sem duplicata' : ''}`);
  if (q.edited) parts.push('editada por você depois da geração');
  parts.push('cálculos e código não foram conferidos por ferramenta', 'sem revisão humana');
  return parts.join(' · ') + '.';
}

/** Explicação completa: por que está certa, passo a passo, por que a escolhida está errada e erros frequentes. */
export function ExplanationBlock({ q, chosenId, bank }: { q: QuizQuestion; chosenId: string | null; bank: Bank }) {
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
      {isPersonal(q) ? (
        <details className="src-details">
          <summary>Fonte e verificação</summary>
          <PersonalSources q={q} />
          <p className="src-meta">Nível estimado: {DIFFICULTY_LABEL[q.difficulty]} · versão {q.version} · {personalProvenance(q)}</p>
        </details>
      ) : (
        <details className="src-details">
          <summary>Fonte e referência</summary>
          <Sources q={q} bank={bank} />
          <p className="src-meta">Camada: {SCOPE_LABEL[q.scope]} · Nível: {DIFFICULTY_LABEL[q.difficulty]} · Verificação: {q.verifiedBy} · Revisão: {q.reviewedBy === 'human' ? 'humana' : 'assistida por IA (revisão humana pendente)'}</p>
        </details>
      )}
      <ReportError questionId={q.id} version={q.version} source={isPersonal(q) ? 'pessoal' : 'banco'} />
    </div>
  );
}
