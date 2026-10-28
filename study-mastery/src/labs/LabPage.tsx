import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lightbulb, RotateCcw } from 'lucide-react';
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useCatalog as useDisciplines } from '../calendar/hooks';
import { RichText } from '../components/RichText';
import { DIFFICULTY_LABEL, SCOPE_LABEL } from '../types';
import { useLabCatalog } from './catalog';
import { PRACTICE_KEY, SESSION_KEY, STARTED_KEY, useLabStore } from './hooks';
import { labByKind } from './registry';
import type { LabStore } from './storage';
import type { LabAttempt, LabDraft, LabExerciseBase, LabGrade, LabSession } from './types';

/** Falha ao carregar o código de um laboratório não derruba o app: só esta área mostra o aviso. */
class LabLoadBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    (window.__smErrors ??= []).push('laboratório: ' + error.message);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="panel crash" role="alert">
        <h2>Não foi possível abrir este laboratório</h2>
        <p>Se for a primeira vez, ele precisa de conexão para ser baixado. O restante do Study Mastery continua funcionando.</p>
        <p className="muted">Detalhe: {this.state.error.message}</p>
        <button type="button" className="ghost" onClick={() => { this.setState({ error: null }); this.props.onRetry(); }}>Tentar de novo</button>
      </section>
    );
  }
}

const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Página de um exercício: enunciado, área do laboratório, dicas graduais, histórico, conclusão e sessão. */
export function LabPage({ id, sessionId, go }: { id: string; sessionId?: string; go: (to: string) => void }) {
  const { catalog, loading } = useLabCatalog();
  const store = useLabStore();
  const exercise = catalog?.exercises.find((e) => e.id === id);
  if (loading || !store) return <p className="muted" role="status">Carregando o laboratório…</p>;
  if (!exercise) {
    return (
      <section className="empty">
        <h1 className="screen-title">Exercício não encontrado</h1>
        <p className="sub">{catalog?.failedLabs.length ? 'O laboratório não carregou agora (talvez sem conexão na primeira abertura).' : 'Ele pode ter sido removido ou renomeado nesta versão.'}</p>
        <button type="button" className="primary" onClick={() => go('#/labs')}>Ver os laboratórios</button>
      </section>
    );
  }
  return <LabExercisePage key={exercise.id + '@' + exercise.version} exercise={exercise} store={store} sessionId={sessionId} go={go} />;
}

function LabExercisePage({ exercise, store, sessionId, go }: { exercise: LabExerciseBase; store: LabStore; sessionId?: string; go: (to: string) => void }) {
  const lab = labByKind(exercise.kind);
  const disciplines = useDisciplines();
  const disc = disciplines.get(exercise.disciplineId);
  const [draft, setDraft] = useState<{ current?: LabDraft; outdated?: LabDraft } | null>(null);
  const [attempts, setAttempts] = useState<LabAttempt[]>([]);
  const [session, setSession] = useState<LabSession | null>(null);
  const [hints, setHints] = useState(0);
  const [mount, setMount] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error' | 'memory'>('idle');
  const [saveError, setSaveError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedAt = useRef(new Date().toISOString());

  useEffect(() => {
    let live = true;
    void Promise.all([store.getDraft(exercise.id), store.listAttempts(exercise.id), store.getMeta<LabSession>(SESSION_KEY)]).then(([d, a, s]) => {
      if (!live) return;
      setDraft(d ? (d.exerciseVersion === exercise.version ? { current: d } : { outdated: d }) : {});
      setAttempts(a);
      setSession(s && s.id === sessionId && s.exerciseIds.includes(exercise.id) ? s : null);
    });
    return () => {
      live = false;
    };
  }, [store, exercise.id, exercise.version, sessionId]);

  // tempo aproximado de prática: conta enquanto a aba está visível e houve interação nos últimos 2 minutos
  useEffect(() => {
    let last = Date.now();
    let active = 0;
    const touch = () => (last = Date.now());
    const evs = ['keydown', 'pointerdown', 'input'] as const;
    for (const ev of evs) addEventListener(ev, touch, true);
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - last < 120_000) active += 5000;
    }, 5000);
    const flush = async () => {
      if (!active) return;
      const add = active;
      active = 0;
      const cur = (await store.getMeta<Record<string, number>>(PRACTICE_KEY)) ?? {};
      await store.setMeta(PRACTICE_KEY, { ...cur, [exercise.id]: (cur[exercise.id] ?? 0) + add });
    };
    const fl = setInterval(() => void flush().catch(() => undefined), 30_000);
    return () => {
      for (const ev of evs) removeEventListener(ev, touch, true);
      clearInterval(iv);
      clearInterval(fl);
      void flush().catch(() => undefined);
    };
  }, [store, exercise.id]);

  const markStarted = useCallback(async () => {
    const cur = (await store.getMeta<string[]>(STARTED_KEY)) ?? [];
    if (!cur.includes(exercise.id)) await store.setMeta(STARTED_KEY, [...cur, exercise.id]);
  }, [store, exercise.id]);

  const saveDraft = useCallback(
    (d: Pick<LabDraft, 'sql' | 'files'>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        store
          .putDraft({ exerciseId: exercise.id, exerciseVersion: exercise.version, ...d, updatedAt: new Date().toISOString() })
          .then(() => {
            setSaveState(store.persistent ? 'saved' : 'memory');
            return markStarted();
          })
          .catch((e) => {
            setSaveState('error');
            setSaveError((e as Error).message);
          });
      }, 700);
    },
    [store, exercise.id, exercise.version, markStarted],
  );
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const clearDraft = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await store.deleteDraft(exercise.id);
    setDraft({});
    setSaveState('idle');
    setMount((m) => m + 1);
  }, [store, exercise.id]);

  const recordAttempt = useCallback(
    async (g: LabGrade) => {
      const a: LabAttempt = {
        id: crypto.randomUUID(), exerciseId: exercise.id, exerciseVersion: exercise.version, kind: exercise.kind, disciplineId: exercise.disciplineId, topicIds: exercise.topicIds,
        startedAt: openedAt.current, finishedAt: new Date().toISOString(), score: g.score, passed: g.passed, testResults: g.results, summary: g.summary,
      };
      await store.addAttempt(a);
      await markStarted();
      setAttempts((xs) => [a, ...xs]);
    },
    [store, exercise, markStarted],
  );

  const completed = attempts.some((a) => a.passed);
  const pageProps = useMemo(
    () => ({ exercise, initialDraft: draft?.current, saveDraft, clearDraft, attempts, recordAttempt, completed }),
    [exercise, draft, saveDraft, clearDraft, attempts, recordAttempt, completed],
  );
  // um React.lazy que falhou fica falho para sempre: cada nova tentativa cria outro (mount muda)
  const Page = useMemo(() => (lab ? lazy(lab.loadPage) : null), [lab, mount]) as ComponentType<typeof pageProps> | null; // eslint-disable-line react-hooks/exhaustive-deps
  if (!lab || !Page) return <section className="panel crash" role="alert"><p>Este tipo de laboratório ({exercise.kind}) não está disponível nesta versão.</p></section>;
  if (!draft) return <p className="muted" role="status">Carregando seu rascunho…</p>;
  const pos = session ? session.exerciseIds.indexOf(exercise.id) : -1;
  const next = session && pos >= 0 && pos < session.exerciseIds.length - 1 ? session.exerciseIds[pos + 1] : null;
  const topicNames = exercise.topicIds.map((t) => disc?.topics.find((x) => x.id === t)?.name ?? t);

  const goNext = async () => {
    if (!session || !next) return;
    await store.setMeta(SESSION_KEY, { ...session, index: pos + 1 });
    go(`#/lab?id=${encodeURIComponent(next)}&s=${session.id}`);
  };

  return (
    <>
      <button type="button" className="back" onClick={() => go(`#/labs?d=${encodeURIComponent(exercise.disciplineId)}`)}><ArrowLeft size={18} aria-hidden="true" /> Labs</button>
      {session && <p className="lab-session" role="status">Sessão prática · exercício {pos + 1} de {session.exerciseIds.length}</p>}
      <header className="lab-head">
        <p className="lab-meta">{lab.name} · {disc?.name ?? exercise.disciplineId} · {topicNames.join(', ')}</p>
        <h1 className="screen-title lab-title">{exercise.title}</h1>
        <p className="lab-tags">
          <span className="q-badge">{DIFFICULTY_LABEL[exercise.difficulty]}</span>
          <span className="q-badge">{SCOPE_LABEL[exercise.scope]}</span>
          <span className="q-badge"><Clock size={12} aria-hidden="true" /> ~{exercise.estimatedMinutes} min</span>
          {completed && <span className="q-badge ok-badge"><CheckCircle2 size={12} aria-hidden="true" /> Concluído</span>}
        </p>
      </header>
      <section className="panel lab-prompt" aria-labelledby="h-lab-prompt">
        <h2 id="h-lab-prompt" className="sr-only">Enunciado</h2>
        <RichText as="div" text={exercise.prompt} />
        <details className="src-details">
          <summary>Objetivos de aprendizagem</summary>
          <ul className="plain">{exercise.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
        </details>
      </section>

      {draft.current && (
        <p className="notice lab-restored" role="status">
          Rascunho restaurado ({fmt(draft.current.updatedAt)}).
          <button type="button" className="text-btn" onClick={() => void clearDraft()}><RotateCcw size={14} aria-hidden="true" /> Começar do zero</button>
        </p>
      )}
      {draft.outdated && (
        <p className="notice" role="status">
          Você tem um rascunho da versão {draft.outdated.exerciseVersion} deste exercício, que mudou desde então.
          <button type="button" className="text-btn" onClick={() => setDraft({ current: { ...draft.outdated!, exerciseVersion: exercise.version } })}>Usar o rascunho antigo</button>
          <button type="button" className="text-btn" onClick={() => void clearDraft()}>Descartar</button>
        </p>
      )}

      <LabLoadBoundary onRetry={() => setMount((m) => m + 1)}>
        <Suspense fallback={<p className="muted" role="status">Carregando o {lab.name}…</p>}>
          <Page key={mount} {...pageProps} />
        </Suspense>
      </LabLoadBoundary>

      <p className="save-state" role="status" aria-live="polite">
        {saveState === 'saved' ? 'Rascunho salvo neste aparelho.' : saveState === 'memory' ? 'Armazenamento indisponível: o rascunho vale só enquanto esta aba estiver aberta.' : saveState === 'error' ? `O rascunho não foi salvo: ${saveError}` : ''}
      </p>

      <section className="panel" aria-labelledby="h-lab-hints">
        <div className="panel-head"><h2 id="h-lab-hints"><Lightbulb size={18} aria-hidden="true" /> Dicas</h2><small className="muted">{hints}/{exercise.hints.length}</small></div>
        {hints > 0 && <ol className="lab-hints">{exercise.hints.slice(0, hints).map((h, i) => <li key={i}><RichText text={h} /></li>)}</ol>}
        {hints < exercise.hints.length ? <button type="button" className="ghost" onClick={() => setHints((h) => h + 1)}>{hints === 0 ? 'Ver a primeira dica' : 'Ver mais uma dica'}</button> : <p className="hint">Todas as dicas estão abertas.</p>}
      </section>

      {completed && (
        <section className="panel lab-done" aria-labelledby="h-lab-expl">
          <div className="panel-head"><h2 id="h-lab-expl"><CheckCircle2 size={18} aria-hidden="true" /> Concluído — entenda a solução</h2></div>
          <RichText as="div" text={exercise.explanation} />
        </section>
      )}

      <section className="panel" aria-labelledby="h-lab-hist">
        <div className="panel-head"><h2 id="h-lab-hist">Histórico de tentativas</h2><small className="muted">{attempts.length}</small></div>
        {attempts.length === 0 ? (
          <p className="muted">Nenhuma verificação ainda. “Executar” serve para experimentar; só “Verificar resposta” conta como tentativa.</p>
        ) : (
          <ul className="lab-attempts">
            {attempts.slice(0, 10).map((a) => (
              <li key={a.id}>
                <span className={a.passed ? 'ok-text' : 'warn-text'}>{a.passed ? 'Aprovado' : 'Ainda não'} · {a.score}%</span>
                <small>{fmt(a.finishedAt)}{a.exerciseVersion !== exercise.version ? ` · versão ${a.exerciseVersion}` : ''}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      {session && (
        <div className="row wrap lab-session-nav">
          {next ? (
            <button type="button" className="primary" onClick={() => void goNext()}>Próximo exercício <ArrowRight size={16} aria-hidden="true" /></button>
          ) : (
            <button type="button" className="primary" onClick={() => { void store.setMeta(SESSION_KEY, null); go('#/labs'); }}>Encerrar sessão</button>
          )}
        </div>
      )}
    </>
  );
}
