import { ArrowLeft, CalendarCheck, Eye } from 'lucide-react';
import { useState } from 'react';
import { useCatalog, usePerformance, useTimeZone, type CalDiscipline } from '../calendar/hooks';
import { ACTIVITY_LABEL, buildPlan, busyFrom, checkPlan, eventDay, MIN_EVIDENCE, topicLevel, type Activity, type PlanInput, type PlanResult } from '../calendar/plan';
import { addDays, brDate, cap, hhmm, minutesOf, shortDate, todayIn, WEEKDAY_SHORT, zonedToInstant } from '../calendar/time';
import { useCollection, usePersonal } from '../personal/context';
import { newId, nowIso, type EventLink, type EventType, type PEvent, type PGuide } from '../personal/types';

const TYPE_OF: Record<Activity, EventType> = { estudo: 'estudo', exercicios: 'estudo', revisao: 'revisao', simulado: 'simulado' };
const MODE_OF: Record<Activity, 'aprender' | 'revisao' | 'simulado'> = { estudo: 'aprender', exercicios: 'aprender', revisao: 'revisao', simulado: 'simulado' };

function linkFor(a: Activity, topicIds: string[], d: CalDiscipline, guides: PGuide[]): EventLink {
  if (d.kind === 'banco') return { kind: 'banco', mode: MODE_OF[a] };
  if (a === 'estudo') {
    const g = guides.filter((x) => x.disciplineId === d.id && topicIds.every((t) => x.topicIds.includes(t))).sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
    if (g) return { kind: 'guia', guideId: g.id };
  }
  return { kind: 'questoes', mode: MODE_OF[a] };
}

export function Planner({ disciplineId, guideId, go }: { disciplineId?: string; guideId?: string; go: (to: string) => void }) {
  const catalog = useCatalog();
  const { items: events, loading } = useCollection('events');
  const { items: guides, loading: gl } = useCollection('guides');
  if (loading || gl || catalog.loading) return <p className="muted" role="status">Carregando…</p>;
  if (!catalog.list.length) return <p className="muted">Nenhuma disciplina disponível.</p>;
  const guide = guideId ? guides.find((g) => g.id === guideId) : undefined;
  const first = (guide && catalog.get(guide.disciplineId)) || (disciplineId && catalog.get(disciplineId)) || catalog.list[0];
  return <PlannerInner key={first.id} initial={first} guide={guide} catalog={catalog} events={events} guides={guides} go={go} />;
}

function PlannerInner({ initial, guide, catalog, events, guides, go }: { initial: CalDiscipline; guide?: PGuide; catalog: ReturnType<typeof useCatalog>; events: PEvent[]; guides: PGuide[]; go: (to: string) => void }) {
  const p = usePersonal();
  const [tz] = useTimeZone();
  const perf = usePerformance();
  const today = todayIn(tz);
  const [disc, setDisc] = useState(initial.id);
  const d = catalog.get(disc)!;
  const nextExam = (id: string) => events.filter((e) => e.disciplineId === id && e.type === 'prova' && e.status === 'agendado' && eventDay(e, tz) > today).map((e) => eventDay(e, tz)).sort()[0];
  const [examDate, setExamDate] = useState(guide?.exam?.date && guide.exam.date > today ? guide.exam.date : nextExam(initial.id) ?? '');
  const [topicIds, setTopicIds] = useState<string[]>(guide ? guide.topicIds.filter((t) => initial.topics.some((x) => x.id === t)) : initial.topics.map((t) => t.id));
  const [confirmed, setConfirmed] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [windowStart, setWindowStart] = useState('19:00');
  const [windowEnd, setWindowEnd] = useState('22:00');
  const [minutesPerDay, setMinutesPerDay] = useState(90);
  const [sessionMin, setSessionMin] = useState(45);
  const [preview, setPreview] = useState<{ input: PlanInput; result: PlanResult } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const examExists = events.some((e) => e.disciplineId === disc && e.type === 'prova' && e.status !== 'cancelado' && eventDay(e, tz) === examDate);
  const [createExam, setCreateExam] = useState(true);
  const previous = events.filter((e) => e.disciplineId === disc && e.plan && e.status === 'agendado' && (e.allDay ? e.date! : e.start!) >= (e.allDay ? today : new Date().toISOString()));
  const [replace, setReplace] = useState(true);
  const toggle = <T,>(l: T[], x: T) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]);
  const reset = () => setPreview(null);

  const makeInput = (): PlanInput => ({
    examDate, topics: d.topics.filter((t) => topicIds.includes(t.id)), availability: { weekdays: [...weekdays].sort(), windowStart, windowEnd, minutesPerDay }, sessionMin,
    now: Date.now(), timeZone: tz, busy: busyFrom(events.filter((e) => !(replace && previous.includes(e)))), performance: perf, disciplineName: d.name,
  });

  const showPreview = () => {
    setErr(null);
    if (!confirmed) return setErr('Confirme os assuntos que entram no planejamento.');
    const input = makeInput();
    setPreview({ input, result: buildPlan(input) });
  };

  const apply = async () => {
    if (!preview) return;
    // confere de novo com a agenda atual (pode ter mudado desde a prévia)
    const input = { ...preview.input, now: Date.now(), busy: busyFrom(events.filter((e) => !(replace && previous.includes(e)))) };
    const problems = checkPlan(preview.result.sessions, input);
    if (problems.length) return setErr('A agenda mudou desde a prévia: ' + problems.join('; ') + '. Gere a prévia de novo.');
    setBusy(true);
    try {
      const now = nowIso();
      const plan = { id: newId(), examDate, weekdays: input.availability.weekdays, windowStart, windowEnd, minutesPerDay };
      const created: PEvent[] = preview.result.sessions.map((s) => ({
        id: newId(), createdAt: now, updatedAt: now, disciplineId: d.id, type: TYPE_OF[s.activity], title: s.title, status: 'agendado', allDay: false,
        start: new Date(zonedToInstant(s.date, s.start, tz)).toISOString(), durationMin: s.durationMin, timeZone: tz, topicIds: s.topicIds,
        notes: `${ACTIVITY_LABEL[s.activity]} planejado: ${s.durationMin} min. Faça o quanto couber no tempo — não há número fixo de questões.`, link: linkFor(s.activity, s.topicIds, d, guides), plan,
      }));
      if (createExam && !examExists) created.push({ id: newId(), createdAt: now, updatedAt: now, disciplineId: d.id, type: 'prova', title: `Prova: ${d.name}`, status: 'agendado', allDay: true, date: examDate, timeZone: tz, topicIds, notes: '' });
      const cancelled = replace ? previous.map((e) => ({ ...e, status: 'cancelado' as const, updatedAt: now })) : [];
      await p.save('events', [...cancelled, ...created]);
      go(`#/agenda?v=lista&d=${today}`);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const r = preview?.result;
  const byDate = new Map<string, NonNullable<typeof r>['sessions']>();
  for (const s of r?.sessions ?? []) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);

  return (
    <>
      <button type="button" className="back" onClick={() => go('#/agenda')}><ArrowLeft size={18} aria-hidden="true" /> Agenda</button>
      <h1 className="screen-title">Planejar até a prova</h1>
      <p className="sub">O plano usa só regras conferíveis (datas, sua disponibilidade e a agenda). Você vê a prévia e nada é criado sem confirmar.</p>
      <form className="form" onSubmit={(e) => { e.preventDefault(); showPreview(); }} onChange={reset}>
        <div className="row wrap practice-opts">
          <label className="field compact">
            <span>Disciplina</span>
            <select value={disc} onChange={(e) => { const nd = catalog.get(e.target.value)!; setDisc(nd.id); setTopicIds(nd.topics.map((t) => t.id)); setExamDate(nextExam(nd.id) ?? ''); setConfirmed(false); }}>
              {catalog.list.map((c) => <option key={c.id} value={c.id}>{c.name}{c.kind === 'banco' ? ' (banco)' : ''}</option>)}
            </select>
          </label>
          <label className="field compact">
            <span>Data da prova</span>
            <input type="date" value={examDate} min={addDays(today, 1)} onChange={(e) => setExamDate(e.target.value)} />
          </label>
        </div>
        {examDate && !examExists && (
          <label className="check-row">
            <input type="checkbox" checked={createExam} onChange={(e) => setCreateExam(e.target.checked)} />
            <span>Criar também o evento da prova em {brDate(examDate)} (dia inteiro)</span>
          </label>
        )}
        <fieldset className="fs">
          <legend>Assuntos</legend>
          {d.topics.length === 0 ? (
            <p className="muted">Esta disciplina não tem assuntos cadastrados.</p>
          ) : (
            <ul className="chips">
              {d.topics.map((t) => {
                const lv = topicLevel(perf[t.id]);
                return (
                  <li key={t.id}>
                    <button type="button" className={'chip' + (topicIds.includes(t.id) ? ' on' : '')} aria-pressed={topicIds.includes(t.id)} onClick={() => { setTopicIds(toggle(topicIds, t.id)); setConfirmed(false); reset(); }}>
                      {t.name}{lv === 'fraco' ? ' · reforçar' : lv === 'forte' ? ' · indo bem' : ''}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="hint">“Reforçar” e “indo bem” só aparecem com pelo menos {MIN_EVIDENCE} respostas no assunto.</p>
          <label className="check-row">
            <input type="checkbox" checked={confirmed} disabled={!topicIds.length} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>Confirmo: o plano cobre só {topicIds.length ? d.topics.filter((t) => topicIds.includes(t.id)).map((t) => t.name).join(', ') : '(nenhum assunto)'}.</span>
          </label>
        </fieldset>
        <fieldset className="fs">
          <legend>Disponibilidade</legend>
          <ul className="chips" aria-label="Dias da semana disponíveis">
            {WEEKDAY_SHORT.map((w, i) => <li key={w}><button type="button" className={'chip' + (weekdays.includes(i) ? ' on' : '')} aria-pressed={weekdays.includes(i)} onClick={() => { setWeekdays(toggle(weekdays, i)); reset(); }}>{w}</button></li>)}
          </ul>
          <div className="row wrap practice-opts">
            <label className="field compact"><span>Das</span><input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} /></label>
            <label className="field compact"><span>Até</span><input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} /></label>
          </div>
          <div className="row wrap practice-opts">
            <label className="field compact">
              <span>Tempo por dia</span>
              <select value={minutesPerDay} onChange={(e) => setMinutesPerDay(Number(e.target.value))}>{[30, 45, 60, 90, 120, 150, 180, 240].map((m) => <option key={m} value={m}>{hhmmLabel(m)}</option>)}</select>
            </label>
            <label className="field compact">
              <span>Duração da sessão</span>
              <select value={sessionMin} onChange={(e) => setSessionMin(Number(e.target.value))}>{[25, 30, 45, 50, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
            </label>
          </div>
          {minutesOf(windowEnd) - minutesOf(windowStart) < minutesPerDay && minutesOf(windowEnd) > minutesOf(windowStart) && <p className="hint">A janela {windowStart}–{windowEnd} tem {hhmmLabel(minutesOf(windowEnd) - minutesOf(windowStart))}: o tempo por dia fica limitado a ela.</p>}
        </fieldset>
        {previous.length > 0 && (
          <label className="check-row">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            <span>Substituir o planejamento anterior desta disciplina ({previous.length} sessão(ões) futura(s) não feita(s) serão canceladas, não apagadas)</span>
          </label>
        )}
        {err && <p className="form-error" role="alert">{err}</p>}
        <button type="submit" className="ghost"><Eye size={16} aria-hidden="true" /> Ver prévia</button>
      </form>

      {r && (
        <section className="panel plan-preview" aria-labelledby="h-prev" aria-live="polite">
          <div className="panel-head"><h2 id="h-prev">Prévia do plano</h2></div>
          {r.errors.length > 0 ? (
            <ul className="form-error plain">{r.errors.map((x) => <li key={x}>{x}</li>)}</ul>
          ) : (
            <>
              <p>{r.sessions.length} sessão(ões) de {sessionMin} min ({hhmmLabel(r.sessions.length * sessionMin)}) até a véspera da prova de {brDate(examDate)}.{r.freeSlots > 0 ? ` Sobram ${r.freeSlots} horário(s) livre(s) na sua disponibilidade — o plano não ocupa tudo.` : ''}</p>
              {r.warnings.map((w) => <p key={w} className="notice">{w}</p>)}
              {r.conflictsAvoided.length > 0 && <p className="hint">Horários evitados por conflito com: {r.conflictsAvoided.join(', ')}.</p>}
              {[...byDate].map(([date, list]) => (
                <div key={date} className="day-block">
                  <h3>{cap(shortDate(date))}</h3>
                  <ul className="plain">{list.map((s, i) => <li key={i}>{s.start}–{hhmm(minutesOf(s.start) + s.durationMin)} · {s.title}</li>)}</ul>
                </div>
              ))}
              {r.sessions.length > 0 && (
                <button type="button" className="primary" disabled={busy} onClick={() => void apply()}>
                  <CalendarCheck size={16} aria-hidden="true" /> Criar {r.sessions.length + (createExam && !examExists ? 1 : 0)} evento(s) na agenda
                </button>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}

const hhmmLabel = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);
