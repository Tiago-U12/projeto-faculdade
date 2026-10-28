import { CheckCircle2, Circle, CircleDot, FlaskConical, Play, WifiOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCatalog as useDisciplines } from '../calendar/hooks';
import { DIFFICULTIES, DIFFICULTY_LABEL, SCOPE_LABEL, SCOPES, type Difficulty, type Scope } from '../types';
import { useLabCatalog } from './catalog';
import { countForTopic, filterExercises, pickSession } from './filters';
import { SESSION_KEY, useAssociations, useLabActivity, useLabContext, useLabStore } from './hooks';
import { exerciseStatus, summarize } from './progress';
import { LABS, labByKind } from './registry';
import type { LabExerciseBase, LabSession, LabSessionSize } from './types';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function StatusIcon({ s }: { s: 'novo' | 'iniciado' | 'concluido' }) {
  if (s === 'concluido') return <CheckCircle2 size={16} aria-label="concluído" className="lab-st done" />;
  if (s === 'iniciado') return <CircleDot size={16} aria-label="iniciado" className="lab-st started" />;
  return <Circle size={16} aria-label="não iniciado" className="lab-st" />;
}

/** Central dos laboratórios: escolher disciplina e assuntos (filtro estrito) e começar 1 ou 3 exercícios. */
export function LabsHub({ disciplineId: initialD, topicIds: initialT, kind: initialK, go }: { disciplineId?: string; topicIds?: string[]; kind?: string; go: (to: string) => void }) {
  const { catalog, loading } = useLabCatalog();
  const disciplines = useDisciplines();
  const store = useLabStore();
  const { assoc } = useAssociations(store);
  const ctx = useLabContext(assoc);
  const activity = useLabActivity(store);
  const exercises = useMemo(() => catalog?.exercises ?? [], [catalog]);

  // disciplinas com algum exercício (banco direto; pessoais pelas associações)
  const withLabs = disciplines.list.filter((d) => d.topics.some((t) => countForTopic(exercises, d.id, t.id, ctx) > 0));
  const [disciplineId, setDisciplineId] = useState<string | null>(initialD ?? null);
  const d = disciplines.get(disciplineId ?? '') ?? withLabs[0];
  const topicsWith = (d?.topics ?? []).filter((t) => countForTopic(exercises, d!.id, t.id, ctx) > 0);
  const [topicIds, setTopicIds] = useState<string[] | null>(initialT ?? null);
  const chosen = (topicIds ?? topicsWith.map((t) => t.id)).filter((t) => d?.topics.some((x) => x.id === t));
  const [difficulties, setDifficulties] = useState<Difficulty[]>([...DIFFICULTIES]);
  const [kinds, setKinds] = useState<string[]>(initialK ? [initialK] : []);
  const [scope, setScope] = useState<Scope>('desafio');
  const toggle = <T,>(l: T[], x: T) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]);

  const filter = { disciplineId: d?.id ?? '', topicIds: chosen, difficulties, kinds, scope };
  const matched = d ? filterExercises(exercises, filter, ctx) : [];
  const status = (id: string) => exerciseStatus(id, activity.attempts, activity.started);
  const prog = summarize(exercises, activity.attempts, activity.started, activity.practiceMs);
  // tipos de prática existentes na disciplina inteira (o filtro de tipo só aparece se houver mais de um)
  const kindsHere = d ? [...new Set(filterExercises(exercises, { disciplineId: d.id, topicIds: d.topics.map((t) => t.id), difficulties: [...DIFFICULTIES], kinds: [], scope: 'desafio' }, ctx).map((e) => e.kind))] : [];

  const start = async (size: LabSessionSize) => {
    if (!store || !matched.length) return;
    const picked = pickSession(matched, size, status, Date.now() & 0xffffffff);
    const session: LabSession = { id: crypto.randomUUID(), exerciseIds: picked.map((e) => e.id), index: 0, startedAt: new Date().toISOString(), filter };
    await store.setMeta(SESSION_KEY, session);
    go(`#/lab?id=${encodeURIComponent(picked[0].id)}&s=${session.id}`);
  };

  return (
    <>
      <div className="eyebrow"><FlaskConical size={15} aria-hidden="true" /> PRÁTICA EXECUTÁVEL</div>
      <h1 className="screen-title">Study <em>Labs.</em></h1>
      <p className="sub">Escreva SQL de verdade, monte páginas e componentes e receba correção pelo resultado — não pelo texto da resposta. Os laboratórios são separados do quiz e do banco de 600 questões.</p>

      {LABS.length === 0 ? (
        <section className="empty-card"><p>Nenhum laboratório disponível nesta versão.</p></section>
      ) : (
        <ul className="lab-cards" aria-label="Laboratórios">
          {LABS.map((l) => {
            const n = exercises.filter((e) => e.kind === l.kind).length;
            const failed = catalog?.failedLabs.includes(l.kind);
            return (
              <li key={l.kind} className="lab-card">
                <strong>{l.name}</strong>
                <span>{l.summary}</span>
                <small>{l.runtime} · {loading ? 'carregando…' : failed ? 'não carregou agora' : plural(n, 'exercício', 'exercícios')}</small>
                <small className={l.offline ? 'ok-text' : 'warn-text'}>{l.offline ? 'Funciona offline depois de carregado' : <><WifiOff size={13} aria-hidden="true" /> {l.note ?? 'Precisa de conexão'}</>}</small>
              </li>
            );
          })}
        </ul>
      )}
      {store && !store.persistent && <p className="notice" role="status">O armazenamento deste navegador está indisponível: rascunhos e tentativas valem só enquanto esta aba estiver aberta.</p>}

      {LABS.length > 0 && (
        <section className="panel" aria-labelledby="h-lab-session">
          <div className="panel-head"><h2 id="h-lab-session">Montar prática</h2></div>
          {loading || disciplines.loading ? (
            <p className="muted" role="status">Carregando exercícios…</p>
          ) : !withLabs.length ? (
            <p className="muted">Nenhuma disciplina com exercícios práticos. Disciplinas pessoais entram quando você associa os assuntos delas às capacidades dos Labs (na página da disciplina).</p>
          ) : (
            <>
              <fieldset className="fs">
                <legend>Disciplina</legend>
                <ul className="chips">
                  {withLabs.map((x) => (
                    <li key={x.id}><button type="button" className={'chip' + (x.id === d?.id ? ' on' : '')} aria-pressed={x.id === d?.id} onClick={() => { setDisciplineId(x.id); setTopicIds(null); }}>{x.name}</button></li>
                  ))}
                </ul>
              </fieldset>
              <fieldset className="fs">
                <legend>Assuntos</legend>
                <ul className="chips">
                  {topicsWith.map((t) => (
                    <li key={t.id}><button type="button" className={'chip' + (chosen.includes(t.id) ? ' on' : '')} aria-pressed={chosen.includes(t.id)} onClick={() => setTopicIds(toggle(chosen, t.id))}>{t.name} · {countForTopic(exercises, d!.id, t.id, ctx)}</button></li>
                  ))}
                </ul>
                {d && d.topics.length > topicsWith.length && <p className="hint">{plural(d.topics.length - topicsWith.length, 'assunto desta disciplina ainda não tem', 'assuntos desta disciplina ainda não têm')} exercício prático.</p>}
              </fieldset>
              <fieldset className="fs">
                <legend>Dificuldade</legend>
                <ul className="chips">
                  {DIFFICULTIES.map((x) => <li key={x}><button type="button" className={'chip' + (difficulties.includes(x) ? ' on' : '')} aria-pressed={difficulties.includes(x)} onClick={() => setDifficulties(toggle(difficulties, x))}>{DIFFICULTY_LABEL[x]}</button></li>)}
                </ul>
              </fieldset>
              {kindsHere.length > 1 && (
                <fieldset className="fs">
                  <legend>Tipo de prática</legend>
                  <ul className="chips">
                    {kindsHere.map((k) => <li key={k}><button type="button" className={'chip' + (kinds.includes(k) ? ' on' : '')} aria-pressed={kinds.includes(k)} onClick={() => setKinds(toggle(kinds, k))}>{labByKind(k)?.name ?? k}</button></li>)}
                  </ul>
                  <p className="hint">Nenhum marcado = todos os tipos.</p>
                </fieldset>
              )}
              <label className="field compact">
                <span>Profundidade</span>
                <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
                  {SCOPES.map((s) => <option key={s} value={s}>{s === 'aula' ? 'Só aula' : s === 'aprofundamento' ? 'Aula + aprofundamento' : 'Também desafios'}</option>)}
                </select>
              </label>
              <p className={matched.length ? 'hint' : 'form-error'} role="status">
                {matched.length === 0 ? 'Nenhum exercício prático com estes filtros. Nada de outros assuntos é usado para completar.' : `${plural(matched.length, 'exercício', 'exercícios')} com estes filtros.${matched.length < 3 ? ` A sessão prática terá ${matched.length} (não completamos com outros assuntos).` : ''}`}
              </p>
              <div className="row wrap">
                <button type="button" className="primary" disabled={!matched.length || !store} onClick={() => void start(1)}><Play size={16} aria-hidden="true" /> Exercício rápido</button>
                <button type="button" className="ghost" disabled={!matched.length || !store} onClick={() => void start(3)}>Sessão prática ({Math.min(3, matched.length)})</button>
              </div>
            </>
          )}
        </section>
      )}

      {matched.length > 0 && (
        <section className="panel" aria-labelledby="h-lab-list">
          <div className="panel-head"><h2 id="h-lab-list">Exercícios</h2><small className="muted">{matched.length}</small></div>
          <ul className="lab-list">
            {matched.map((e) => <ExerciseRow key={e.id} e={e} status={status(e.id)} best={prog.bestScore[e.id]} go={go} />)}
          </ul>
        </section>
      )}

      {prog.started > 0 && (
        <section className="panel" aria-labelledby="h-lab-prog">
          <div className="panel-head"><h2 id="h-lab-prog">Sua prática</h2></div>
          <p>{plural(prog.completed, 'exercício concluído', 'exercícios concluídos')} de {prog.started} iniciados · {plural(prog.attempts, 'tentativa verificada', 'tentativas verificadas')}{prog.practiceMinutes ? ` · cerca de ${prog.practiceMinutes} min de prática` : ''}.</p>
          <p className="hint">Separado do quiz: concluir um laboratório é evidência prática, diferente de acertar uma questão objetiva. Guardado só neste aparelho.</p>
        </section>
      )}
    </>
  );
}

function ExerciseRow({ e, status, best, go }: { e: LabExerciseBase; status: 'novo' | 'iniciado' | 'concluido'; best?: number; go: (to: string) => void }) {
  return (
    <li>
      <button type="button" className="mat-row" onClick={() => go(`#/lab?id=${encodeURIComponent(e.id)}`)}>
        <StatusIcon s={status} />
        <span className="mat-body">
          <strong>{e.title}</strong>
          <small>{labByKind(e.kind)?.name ?? e.kind} · {DIFFICULTY_LABEL[e.difficulty]} · {SCOPE_LABEL[e.scope]} · ~{e.estimatedMinutes} min{best !== undefined ? ` · melhor: ${best}%` : ''}</small>
        </span>
      </button>
    </li>
  );
}
