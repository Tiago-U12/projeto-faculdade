import { ArrowLeft, ArrowRight, Check, Flag, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DIFFICULTY_LABEL, MODE_LABEL, SCOPE_LABEL } from '../types';
import { topicName } from '../lib/bank';
import { useStudy } from '../state';
import { ExplanationBlock } from './Explanation';
import { RichText } from './RichText';

export function Quiz({ go }: { go: (to: string) => void }) {
  const { bank, state, answer, goTo, finish, abandon } = useStudy();
  const active = state.active;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const stemRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(() => (active ? active.session.items.filter((i) => bank.byId.has(i.questionId)) : []), [active, bank]);
  const idx = active ? Math.min(active.index, Math.max(0, items.length - 1)) : 0;
  const item = items[idx];
  const q = item ? bank.byId.get(item.questionId) : undefined;
  const mode = active?.session.config.mode ?? 'aprender';
  const simulado = mode === 'simulado';
  const chosen = q && active ? active.answers[q.id] : undefined;
  const revealed = !simulado && chosen !== undefined;
  const answeredCount = active ? items.filter((i) => active.answers[i.questionId] !== undefined).length : 0;
  const isLast = idx === items.length - 1;

  useEffect(() => {
    stemRef.current?.focus({ preventScroll: true });
    setConfirmEnd(false);
  }, [idx]);
  // depois de responder, o botão escolhido fica desabilitado: o foco vai para o feedback (lido pelos leitores de tela)
  useEffect(() => {
    if (revealed) feedbackRef.current?.focus({ preventScroll: true });
  }, [revealed, idx]);
  useEffect(() => {
    if (confirmEnd) confirmRef.current?.focus();
  }, [confirmEnd]);

  const finishAndShow = (onlyAnswered = false) => {
    if (onlyAnswered && answeredCount === 0) {
      abandon();
      go('#/');
      return;
    }
    finish({ onlyAnswered });
    go('#/results');
  };
  const next = () => {
    if (!q) return;
    if (isLast) {
      if (simulado && answeredCount < items.length && !confirmEnd) return setConfirmEnd(true);
      return finishAndShow();
    }
    goTo(idx + 1);
  };

  // atalhos: 1–4 ou A–D respondem, Enter/→ avançam, ← volta (simulado). O handler é registrado uma vez e lê sempre o
  // estado mais recente por ref — sem a janela em que uma tecla, logo após trocar de questão, ia para a questão anterior.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyRef.current(e);
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);
  keyRef.current = (e: KeyboardEvent) => {
    if (!q || !item) return;
    {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest('.radio-panel, .confirm'))) return;
      const k = e.key.toLowerCase();
      const pos = '1234'.includes(k) && k ? Number(k) - 1 : 'abcd'.indexOf(k);
      if (k.length === 1 && pos >= 0 && pos < item.order.length) {
        e.preventDefault();
        answer(q.id, item.order[pos]);
      } else if ((k === 'enter' || k === 'arrowright') && (simulado || revealed) && t?.tagName !== 'BUTTON') {
        e.preventDefault();
        next();
      } else if (k === 'arrowleft' && simulado && idx > 0) goTo(idx - 1);
    }
  };

  if (!active || !q || !item) {
    return (
      <section className="empty">
        <h1 className="screen-title">Nenhuma sessão em andamento</h1>
        <p className="sub">Configure uma sessão para começar a praticar.</p>
        <button type="button" className="primary" onClick={() => go('#/setup')}>Configurar sessão <ArrowRight size={18} aria-hidden="true" /></button>
      </section>
    );
  }

  const opts = item.order.map((id) => q.options.find((o) => o.id === id)!);
  const correct = chosen === q.correctOptionId;

  return (
    <>
      <div className="quiz-bar">
        <button type="button" className="back" onClick={() => go('#/')}><ArrowLeft size={18} aria-hidden="true" /> Sair (sessão fica salva)</button>
        <span className="mode-pill">{MODE_LABEL[mode]}</span>
      </div>
      <div className="quiztop"><h2 className="qnum">Questão {idx + 1} de {items.length}</h2><span>{answeredCount} respondida{answeredCount === 1 ? '' : 's'}</span></div>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={idx + 1} aria-label="Progresso da sessão"><div style={{ width: `${((idx + 1) / items.length) * 100}%` }} /></div>

      <div className="eyebrow"><span className="dot" aria-hidden="true" />{topicName(bank, q.disciplineId, q.topicId).toUpperCase()}</div>
      <article className="quizcard" aria-labelledby="q-stem">
        <span className="tag">{SCOPE_LABEL[q.scope]} · {DIFFICULTY_LABEL[q.difficulty]}</span>
        <div id="q-stem" className="stem" tabIndex={-1} ref={stemRef}><RichText as="div" text={q.stem} /></div>
        <div className="choices" role="radiogroup" aria-labelledby="q-stem">
          {opts.map((o, i) => {
            const isChosen = chosen === o.id;
            const isRight = o.id === q.correctOptionId;
            const cls = ['choice', isChosen ? 'chosen' : '', revealed && isRight ? 'correct' : '', revealed && isChosen && !isRight ? 'incorrect' : '', revealed && !isChosen && !isRight ? 'dim' : ''].join(' ');
            return (
              <button key={o.id} type="button" role="radio" aria-checked={isChosen} className={cls} disabled={revealed} onClick={() => answer(q.id, o.id)}>
                <span className="letter" aria-hidden="true">{'ABCD'[i]}</span>
                <RichText text={o.text} className="choice-text" />
                {revealed && isRight && <Check size={18} aria-label="alternativa correta" />}
                {revealed && isChosen && !isRight && <X size={18} aria-label="sua resposta, incorreta" />}
              </button>
            );
          })}
        </div>
        <div aria-live="polite" className="feedback-live">
          {revealed && (
            <div className={'feedback ' + (correct ? 'ok' : 'no')} tabIndex={-1} ref={feedbackRef}>
              <b>{correct ? 'Correto!' : 'Ainda não — vamos entender.'}</b>
            </div>
          )}
        </div>
        {revealed && <ExplanationBlock q={q} chosenId={chosen ?? null} bank={bank} />}
        {simulado && <p className="hint">Modo simulado: o gabarito e as explicações aparecem ao final. Você pode voltar e trocar respostas.</p>}
      </article>

      {simulado && (
        <nav className="qmap" aria-label="Mapa de questões">
          {items.map((it, i) => (
            <button key={it.questionId} type="button" className={'qdot' + (i === idx ? ' current' : '') + (active.answers[it.questionId] ? ' done' : '')} onClick={() => goTo(i)} aria-label={`Questão ${i + 1}${active.answers[it.questionId] ? ', respondida' : ', sem resposta'}`} aria-current={i === idx ? 'true' : undefined}>{i + 1}</button>
          ))}
        </nav>
      )}

      {confirmEnd && (
        <div className="confirm" role="alertdialog" aria-label="Finalizar simulado">
          <p>Há {items.length - answeredCount} questão(ões) sem resposta. Elas contarão como erro. Finalizar mesmo assim?</p>
          <div className="row">
            <button type="button" className="ghost" ref={confirmRef} onClick={() => setConfirmEnd(false)}>Continuar respondendo</button>
            <button type="button" className="primary" onClick={() => finishAndShow()}>Finalizar</button>
          </div>
        </div>
      )}

      <div className="quizactions">
        {simulado ? (
          <button type="button" className="ghost" disabled={idx === 0} onClick={() => goTo(idx - 1)}><ArrowLeft size={16} aria-hidden="true" /> Anterior</button>
        ) : (
          <button type="button" className="text-btn" onClick={() => finishAndShow(true)}><Flag size={14} aria-hidden="true" /> Encerrar agora</button>
        )}
        <button type="button" className="primary" disabled={!simulado && !revealed} onClick={next}>
          {isLast ? (simulado ? 'Finalizar simulado' : 'Ver resultados') : 'Próxima questão'} <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
