import { AlertTriangle, ArrowLeft, ArrowRight, BrainCircuit, Check, Gauge, ListChecks, Shuffle, Target, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { countBy, eligible, reviewCounts, shortfall } from '../lib/engine';
import type { Route } from '../lib/route';
import { DIFFICULTIES, DIFFICULTY_LABEL, MODE_LABEL, type Difficulty, type DisciplineId, type Mode, type Scope, type SessionConfig } from '../types';
import { useStudy } from '../state';
import { LabPracticeLink } from '../labs/integration';

const MODES: { id: Mode; icon: React.ReactNode; text: string }[] = [
  { id: 'aprender', icon: <BrainCircuit size={18} aria-hidden="true" />, text: 'Feedback e explicação logo após cada resposta.' },
  { id: 'simulado', icon: <Timer size={18} aria-hidden="true" />, text: 'Sem gabarito até o final, como numa prova. Dá para voltar e trocar respostas.' },
  { id: 'revisao', icon: <ListChecks size={18} aria-hidden="true" />, text: 'Prioriza o que você errou e o que venceu na repetição espaçada.' },
  { id: 'misto', icon: <Shuffle size={18} aria-hidden="true" />, text: 'Mistura os assuntos escolhidos e as três dificuldades.' },
];
const SCOPES: { id: Scope; name: string; text: string }[] = [
  { id: 'aula', name: 'Só o conteúdo das aulas', text: 'Foco total no material da faculdade.' },
  { id: 'aprofundamento', name: 'Aulas + aprofundamento', text: 'Mesmos assuntos, mais perspectivas e métodos.' },
  { id: 'desafio', name: 'Também desafios', text: 'Problemas mais profundos dos mesmos assuntos.' },
];

export function Setup({ route, go }: { route: Extract<Route, { name: 'setup' }>; go: (to: string) => void }) {
  const { bank, state, start } = useStudy();
  const last = state.settings.lastConfig;
  const [disciplineId, setDisciplineId] = useState<DisciplineId>((route.disciplineId as DisciplineId) ?? last?.disciplineId ?? 'calculo2');
  const discipline = bank.taxonomy.disciplines.find((d) => d.id === disciplineId)!;
  const perTopic = useMemo(() => {
    const m = new Map<string, ReturnType<typeof countBy>>();
    for (const t of discipline.topics) m.set(t.id, countBy(bank.questions.filter((q) => q.disciplineId === disciplineId && q.topicId === t.id)));
    return m;
  }, [bank, discipline, disciplineId]);
  const withQuestions = (id: string) => {
    const c = perTopic.get(id)!;
    return c.facil + c.medio + c.dificil > 0;
  };
  const defaultTopics = (preset?: string) => {
    if (preset === 'exam') return discipline.topics.filter((t) => t.examFocus && withQuestions(t.id)).map((t) => t.id);
    return discipline.topics.filter((t) => withQuestions(t.id)).map((t) => t.id);
  };
  const reuse = last && last.disciplineId === disciplineId && !route.preset && !route.topics;
  // vindo da agenda: assuntos do evento (só os que têm questões)
  const fromEvent = route.topics?.filter((t) => discipline.topics.some((x) => x.id === t) && withQuestions(t));
  const [topicIds, setTopicIds] = useState<string[]>(() => (fromEvent?.length ? fromEvent : reuse ? last.topicIds.filter(withQuestions) : defaultTopics(route.preset)));
  const [scope, setScope] = useState<Scope>(reuse ? last.scope : 'aprofundamento');
  const [difficulties, setDifficulties] = useState<Difficulty[]>(reuse ? last.difficulties : [...DIFFICULTIES]);
  const [mode, setMode] = useState<Mode>(route.mode ?? (reuse ? last.mode : 'aprender'));
  const [size, setSize] = useState<number>(reuse ? last.size : 20);

  const cfg: SessionConfig = { disciplineId, topicIds, scope, difficulties, mode, size };
  const pool = useMemo(() => eligible(bank.questions, cfg), [bank.questions, disciplineId, topicIds, scope, difficulties]); // eslint-disable-line react-hooks/exhaustive-deps
  const rev = useMemo(() => reviewCounts(pool, state.stats), [pool, state.stats]);
  const missing = shortfall(pool.length, size);
  const scopeCount = (s: Scope) => eligible(bank.questions, { ...cfg, scope: s }).length;
  const hasExamTopics = discipline.topics.some((t) => t.examFocus && withQuestions(t.id));

  const switchDiscipline = (id: DisciplineId) => {
    setDisciplineId(id);
    const d = bank.taxonomy.disciplines.find((x) => x.id === id)!;
    setTopicIds(d.topics.filter((t) => bank.questions.some((q) => q.topicId === t.id && q.disciplineId === id)).map((t) => t.id));
  };
  const toggleTopic = (id: string) => setTopicIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleDiff = (d: Difficulty) => setDifficulties((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const selectable = discipline.topics.filter((t) => withQuestions(t.id)).map((t) => t.id);

  const begin = () => {
    const s = start(cfg);
    if (s) go('#/quiz');
  };

  return (
    <>
      <button type="button" className="back" onClick={() => go('#/')}><ArrowLeft size={18} aria-hidden="true" /> Voltar</button>
      <div className="eyebrow"><Target size={15} aria-hidden="true" /> ESTUDO DIRECIONADO</div>
      <h1 className="screen-title">Configure seu <em>foco.</em></h1>
      <p className="sub">Você controla o escopo: só os assuntos marcados aparecem na sessão.</p>

      {state.active && <div className="notice"><span>Há uma sessão em andamento. Iniciar outra pedirá confirmação para substituí-la.</span><button type="button" className="text-btn" onClick={() => go('#/quiz')}>Continuar sessão</button></div>}

      <section className="panel" aria-labelledby="h-disc">
        <div className="panel-head"><h2 id="h-disc">Disciplina</h2></div>
        <div className="seg" role="group" aria-label="Disciplina">
          {bank.taxonomy.disciplines.map((d) => (
            <button key={d.id} type="button" aria-pressed={d.id === disciplineId} className={d.id === disciplineId ? 'seg-btn active' : 'seg-btn'} onClick={() => switchDiscipline(d.id)}>{d.short}</button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="h-topics">
        <div className="panel-head">
          <h2 id="h-topics">Assuntos</h2>
          <div className="head-actions">
            {hasExamTopics && <button type="button" className="text-btn" onClick={() => setTopicIds(defaultTopics('exam'))}>Foco da prova</button>}
            <button type="button" className="text-btn" onClick={() => setTopicIds(topicIds.length === selectable.length ? [] : selectable)}>{topicIds.length === selectable.length ? 'Limpar' : 'Selecionar todos'}</button>
          </div>
        </div>
        <ul className="topic-list">
          {discipline.topics.map((t) => {
            const c = perTopic.get(t.id)!;
            const total = c.facil + c.medio + c.dificil;
            const on = topicIds.includes(t.id);
            return (
              <li key={t.id}>
                <label className={'topic' + (total === 0 ? ' disabled' : '') + (on ? ' on' : '')}>
                  <input type="checkbox" checked={on} disabled={total === 0} onChange={() => toggleTopic(t.id)} />
                  <span className="checkmark" aria-hidden="true"><Check size={13} /></span>
                  <span className="topic-body">
                    <span className="topic-name">{t.name}{t.examFocus && <em className="badge-exam">prova 26/10</em>}</span>
                    <small>{total === 0 ? 'ainda sem questões disponíveis' : `${total} questões · fácil ${c.facil} · média ${c.medio} · difícil ${c.dificil}`}</small>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <LabPracticeLink disciplineId={disciplineId} topicIds={topicIds} label="Praticar estes assuntos nos Labs" go={go} />

      <section className="panel" aria-labelledby="h-depth">
        <div className="panel-head"><h2 id="h-depth">Profundidade</h2></div>
        <div className="depth-options" role="radiogroup" aria-labelledby="h-depth">
          {SCOPES.map((s) => (
            <label key={s.id} className={'depth' + (scope === s.id ? ' selected' : '')}>
              <input type="radio" name="depth" checked={scope === s.id} onChange={() => setScope(s.id)} />
              <span><b>{s.name}</b><small>{s.text}</small></span>
              <i aria-label={`${scopeCount(s.id)} questões`}>{scopeCount(s.id)}</i>
            </label>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="h-diff">
        <div className="panel-head"><h2 id="h-diff">Dificuldade</h2></div>
        <div className="chips" role="group" aria-labelledby="h-diff">
          {DIFFICULTIES.map((d) => (
            <button key={d} type="button" className={'chip' + (difficulties.includes(d) ? ' on' : '')} aria-pressed={difficulties.includes(d)} onClick={() => toggleDiff(d)}>
              <Gauge size={14} aria-hidden="true" /> {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="h-mode">
        <div className="panel-head"><h2 id="h-mode">Modo de estudo</h2></div>
        <div className="mode-grid" role="radiogroup" aria-labelledby="h-mode">
          {MODES.map((m) => (
            <label key={m.id} className={'mode' + (mode === m.id ? ' selected' : '')}>
              <input type="radio" name="mode" checked={mode === m.id} onChange={() => setMode(m.id)} />
              <span className="mode-ico">{m.icon}</span>
              <span><b>{MODE_LABEL[m.id]}</b><small>{m.text}</small></span>
            </label>
          ))}
        </div>
        {mode === 'revisao' && <p className="hint">Na seleção atual: <b>{rev.errors}</b> para refazer (erros) e <b>{rev.due}</b> vencidas na repetição espaçada. O restante é completado com questões ainda não vistas dos mesmos assuntos.</p>}
      </section>

      <section className="panel" aria-labelledby="h-size">
        <div className="panel-head"><h2 id="h-size">Quantidade de questões</h2></div>
        <div className="seg" role="radiogroup" aria-labelledby="h-size">
          {[5, 10, 20].map((n) => (
            <label key={n} className={size === n ? 'seg-btn active' : 'seg-btn'}>
              <input type="radio" name="size" className="sr-only" checked={size === n} onChange={() => setSize(n)} /> {n}
            </label>
          ))}
        </div>
      </section>

      <div className="footer-action" role="region" aria-label="Resumo da sessão">
        <div>
          <strong>{pool.length} questões elegíveis</strong>
          {pool.length === 0 ? (
            <small className="warn"><AlertTriangle size={13} aria-hidden="true" /> Selecione ao menos um assunto, uma dificuldade e uma profundidade com questões disponíveis.</small>
          ) : missing > 0 ? (
            <small className="warn"><AlertTriangle size={13} aria-hidden="true" /> Só há {pool.length} questões disponíveis nesta seleção — a sessão terá {pool.length}, sem repetir e sem incluir outros assuntos.</small>
          ) : (
            <small>Sessão de {size} questões, sem repetição.</small>
          )}
        </div>
        <button type="button" className="primary" disabled={pool.length === 0} onClick={begin}>
          {missing > 0 && pool.length > 0 ? `Iniciar com ${pool.length}` : 'Iniciar sessão'} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </>
  );
}

