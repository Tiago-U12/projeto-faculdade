import { ArrowLeft, Ban, CalendarClock, Check, ExternalLink, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { eventLinkHref, useCatalog, useTimeZone } from '../calendar/hooks';
import { busyFrom, conflictsWith, eventDay, eventTimes, isOverdue, suggestReschedule } from '../calendar/plan';
import { LabPracticeLink } from '../labs/integration';
import { brDate, cap, instantToZoned, isHHMM, isYMD, longDate, shortDate, todayIn, zonedToInstant } from '../calendar/time';
import { useCollection, usePersonal } from '../personal/context';
import { EVENT_STATUS_LABEL, EVENT_TYPE_LABEL, EVENT_TYPES, LIMITS, newId, nowIso, type EventLink, type EventStatus, type EventType, type PEvent } from '../personal/types';

const DURATIONS = [15, 25, 30, 45, 50, 60, 90, 120, 180];

/** "sáb., 24/10 19:00" ou "24/10 (dia inteiro)" — para o histórico de reagendamentos. */
export function whenText(e: Pick<PEvent, 'allDay' | 'date' | 'start'>, tz: string): string {
  if (e.allDay) return `${shortDate(e.date!)} (dia inteiro)`;
  const z = instantToZoned(Date.parse(e.start!), tz);
  return `${shortDate(z.date)} ${z.time}`;
}

export function EventForm({ id, date, disciplineId, type, go }: { id?: string; date?: string; disciplineId?: string; type?: EventType; go: (to: string) => void }) {
  const p = usePersonal();
  const [tz] = useTimeZone();
  const catalog = useCatalog();
  const { items: events, loading } = useCollection('events');
  const { items: guides } = useCollection('guides');
  const existing = id ? events.find((e) => e.id === id) : undefined;
  if (loading || catalog.loading) return <p className="muted" role="status">Carregando…</p>;
  if (id && !existing) return <NotFound go={go} />;
  return <EventFormInner key={existing?.id ?? 'novo'} existing={existing} date={date} disciplineId={disciplineId} type={type} tz={tz} catalog={catalog} events={events} guides={guides} save={(e) => p.save('events', e)} go={go} />;
}

function EventFormInner({ existing, date, disciplineId, type: type0, tz, catalog, events, guides, save, go }: {
  existing?: PEvent; date?: string; disciplineId?: string; type?: EventType; tz: string; catalog: ReturnType<typeof useCatalog>; events: PEvent[]; guides: { id: string; title: string; disciplineId: string }[]; save: (e: PEvent) => Promise<void>; go: (to: string) => void;
}) {
  const ex = existing;
  const exTimes = ex && !ex.allDay ? instantToZoned(Date.parse(ex.start!), tz) : null;
  const [type, setType] = useState<EventType>(ex?.type ?? type0 ?? 'prova');
  const [title, setTitle] = useState(ex?.title ?? '');
  const [disc, setDisc] = useState(ex?.disciplineId ?? (disciplineId && catalog.get(disciplineId) ? disciplineId : catalog.list[0]?.id ?? ''));
  const [day, setDay] = useState(ex ? eventDay(ex, tz) : date && isYMD(date) ? date : todayIn(tz));
  const [allDay, setAllDay] = useState(ex?.allDay ?? (type0 === 'prova' || type0 === 'entrega' || !type0));
  const [time, setTime] = useState(exTimes?.time ?? '19:00');
  const [duration, setDuration] = useState<string>(ex?.durationMin ? String(ex.durationMin) : type0 && ['estudo', 'revisao', 'simulado'].includes(type0) ? '50' : '');
  const [topicIds, setTopicIds] = useState<string[]>(ex?.topicIds ?? []);
  const [notes, setNotes] = useState(ex?.notes ?? '');
  // questões/banco com modo (vindo do planejamento) aparecem como "padrão" e são mantidos ao salvar
  const [link, setLink] = useState<string>(ex?.link?.kind === 'guia' ? `guia:${ex.link.guideId}` : ex?.link?.kind === 'nenhum' ? 'nenhum' : ex?.link ? 'mantido' : 'padrao');
  const [status, setStatus] = useState<EventStatus>(ex?.status ?? 'agendado');
  const [err, setErr] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const d = catalog.get(disc);
  const discGuides = guides.filter((g) => g.disciplineId === disc);

  const submit = async (force = false) => {
    setErr(null);
    if (!d) return setErr('Escolha a disciplina.');
    if (!isYMD(day)) return setErr('Informe uma data válida.');
    if (!allDay && !isHHMM(time)) return setErr('Informe o horário (hh:mm) ou marque “Dia inteiro”.');
    if (notes.length > LIMITS.eventNotes) return setErr(`As observações podem ter até ${LIMITS.eventNotes} caracteres.`);
    const finalTitle = (title.trim() || `${EVENT_TYPE_LABEL[type]}: ${d.name}`).slice(0, LIMITS.eventTitle);
    const start = allDay ? undefined : new Date(zonedToInstant(day, time, tz)).toISOString();
    const dur = !allDay && duration ? Number(duration) : undefined;
    if (!allDay && status === 'agendado' && !force) {
      const s = Date.parse(start!);
      const hit = conflictsWith({ start: s, end: s + (dur ?? 60) * 60000 }, busyFrom(events, ex?.id));
      if (hit.length) return setConflicts(hit.map((h) => `${h.title} (${instantToZoned(h.start, tz).time}–${instantToZoned(h.end, tz).time})`));
    }
    const linkVal: EventLink | undefined = link === 'padrao' ? undefined : link === 'nenhum' ? { kind: 'nenhum' } : link.startsWith('guia:') ? { kind: 'guia', guideId: link.slice(5) } : ex?.link;
    const now = nowIso();
    const moved = ex && (ex.allDay !== allDay || (allDay ? ex.date !== day : ex.start !== start));
    const e: PEvent = {
      id: ex?.id ?? newId(), createdAt: ex?.createdAt ?? now, updatedAt: now, disciplineId: d.id, type, title: finalTitle, status, allDay,
      ...(allDay ? { date: day } : { start, ...(dur ? { durationMin: dur } : {}) }),
      timeZone: tz, topicIds: topicIds.filter((t) => d.topics.some((x) => x.id === t)), notes: notes.trim(),
      ...(linkVal ? { link: linkVal } : {}),
      ...(status === 'concluido' ? { completedAt: ex?.completedAt ?? now } : {}),
      ...(ex?.plan ? { plan: ex.plan } : {}),
      history: [...(ex?.history ?? []), ...(moved ? [{ at: now, from: whenText(ex!, tz), to: whenText({ allDay, date: day, start }, tz) }] : [])].slice(-20),
    };
    if (!e.history?.length) delete e.history;
    setBusy(true);
    try {
      await save(e);
      go(`#/evento?id=${e.id}`);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="back" onClick={() => go(ex ? `#/evento?id=${ex.id}` : `#/agenda?v=lista&d=${day}`)}><ArrowLeft size={18} aria-hidden="true" /> {ex ? 'Evento' : 'Agenda'}</button>
      <h1 className="screen-title">{ex ? 'Editar evento' : 'Novo evento'}</h1>
      <form className="form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="row wrap practice-opts">
          <label className="field compact">
            <span>Tipo</span>
            <select value={type} onChange={(e) => setType(e.target.value as EventType)}>{EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>)}</select>
          </label>
          <label className="field compact">
            <span>Disciplina</span>
            <select value={disc} onChange={(e) => { setDisc(e.target.value); setTopicIds([]); setLink('padrao'); }}>
              {catalog.list.map((c) => <option key={c.id} value={c.id}>{c.name}{c.kind === 'banco' ? ' (banco)' : ''}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Título <small>· opcional (padrão: “{EVENT_TYPE_LABEL[type]}: {d?.name ?? '…'}”)</small></span>
          <input value={title} maxLength={LIMITS.eventTitle} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="row wrap practice-opts">
          <label className="field compact">
            <span>Data</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
          </label>
          {!allDay && (
            <>
              <label className="field compact">
                <span>Horário</span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
              <label className="field compact">
                <span>Duração</span>
                <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                  <option value="">Sem duração</option>
                  {DURATIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </label>
            </>
          )}
        </div>
        <label className="check-row">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          <span>Dia inteiro <small>· a data fica a mesma em qualquer fuso</small></span>
        </label>
        {!allDay && <p className="hint">Horário em {tz}.</p>}
        {d && d.topics.length > 0 && (
          <fieldset className="fs">
            <legend>Assuntos</legend>
            <ul className="chips">
              {d.topics.map((t) => (
                <li key={t.id}><button type="button" className={'chip' + (topicIds.includes(t.id) ? ' on' : '')} aria-pressed={topicIds.includes(t.id)} onClick={() => setTopicIds((x) => (x.includes(t.id) ? x.filter((y) => y !== t.id) : [...x, t.id]))}>{t.name}</button></li>
              ))}
            </ul>
          </fieldset>
        )}
        <label className="field">
          <span>Conteúdo vinculado</span>
          <select value={link} onChange={(e) => setLink(e.target.value)}>
            {link === 'mantido' && <option value="mantido">{ex?.link && 'mode' in ex.link && ex.link.mode ? `Questões (modo ${ex.link.mode})` : 'Questões'}</option>}
            <option value="padrao">{d?.kind === 'banco' ? 'Questões do banco' : 'Questões da disciplina'}</option>
            {d?.kind === 'pessoal' && discGuides.map((g) => <option key={g.id} value={`guia:${g.id}`}>Guia: {g.title}</option>)}
            <option value="nenhum">Nenhum</option>
          </select>
        </label>
        <label className="field">
          <span>Observações <small>· opcional</small></span>
          <textarea rows={3} value={notes} maxLength={LIMITS.eventNotes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {ex && (
          <label className="field compact">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>{(['agendado', 'concluido', 'cancelado'] as EventStatus[]).map((s) => <option key={s} value={s}>{EVENT_STATUS_LABEL[s]}</option>)}</select>
          </label>
        )}
        {conflicts && (
          <div className="confirm" role="alertdialog" aria-label="Conflito de horário">
            <p>Esse horário coincide com: {conflicts.join('; ')}. Salvar mesmo assim?</p>
            <div className="row wrap">
              <button type="button" className="ghost" onClick={() => setConflicts(null)}>Mudar horário</button>
              <button type="button" className="primary" disabled={busy} onClick={() => { setConflicts(null); void submit(true); }}>Salvar mesmo assim</button>
            </div>
          </div>
        )}
        {err && <p className="form-error" role="alert">{err}</p>}
        <div className="row wrap">
          <button type="button" className="ghost" onClick={() => go(ex ? `#/evento?id=${ex.id}` : `#/agenda?v=lista&d=${day}`)}>Cancelar</button>
          <button type="submit" className="primary" disabled={busy || !catalog.list.length}><Check size={16} aria-hidden="true" /> Salvar</button>
        </div>
      </form>
    </>
  );
}

function NotFound({ go }: { go: (to: string) => void }) {
  return (
    <section className="empty">
      <h1 className="screen-title">Evento não encontrado</h1>
      <p className="sub">Ele pode ter sido excluído (por exemplo, junto com a disciplina) ou pertencer a outro espaço.</p>
      <button type="button" className="primary" onClick={() => go('#/agenda')}>Abrir a agenda</button>
    </section>
  );
}

export function EventPage({ id, go }: { id: string; go: (to: string) => void }) {
  const p = usePersonal();
  const [tz] = useTimeZone();
  const catalog = useCatalog();
  const { items: events, loading } = useCollection('events');
  const { items: guides } = useCollection('guides');
  const e = events.find((x) => x.id === id);
  const [panel, setPanel] = useState<'reagendar' | 'excluir' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [manual, setManual] = useState<{ date: string; time: string } | null>(null);
  const [manualConflict, setManualConflict] = useState<string[] | null>(null);
  const now = Date.now();
  const sugg = useMemo(() => (e && panel === 'reagendar' ? suggestReschedule(e, events, now, tz) : null), [e, events, panel, tz]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p className="muted" role="status">Carregando…</p>;
  if (!e) return <NotFound go={go} />;
  const d = catalog.get(e.disciplineId);
  const t = eventTimes(e, tz);
  const day = eventDay(e, tz);
  const late = isOverdue(e, now, tz);
  const link = eventLinkHref(e, d);
  const linkedGuideMissing = e.link?.kind === 'guia' && !guides.some((g) => g.id === (e.link as { guideId: string }).guideId);
  const topicNames = e.topicIds.map((x) => d?.topics.find((y) => y.id === x)?.name).filter(Boolean);

  const update = async (patch: Partial<PEvent>, ok: string) => {
    setMsg(null);
    try {
      const next = { ...e, ...patch, updatedAt: nowIso() } as PEvent;
      if (next.status !== 'concluido') delete next.completedAt;
      await p.save('events', next);
      setMsg({ ok: true, text: ok });
      setPanel(null);
      setManual(null);
    } catch (x) {
      setMsg({ ok: false, text: (x as Error).message });
    }
  };
  const moveTo = (date: string, time: string | null, ok: string) => {
    const to = e.allDay || time === null ? { allDay: true, date } : { allDay: false, start: new Date(zonedToInstant(date, time, tz)).toISOString() };
    const history = [...(e.history ?? []), { at: nowIso(), from: whenText(e, tz), to: whenText(to as PEvent, tz) }].slice(-20);
    return update({ ...(to as Partial<PEvent>), history, status: 'agendado' }, ok);
  };
  const tryManual = (force = false) => {
    if (!manual || !isYMD(manual.date) || (!e.allDay && !isHHMM(manual.time))) return setMsg({ ok: false, text: 'Informe a nova data' + (e.allDay ? '.' : ' e o horário.') });
    if (!e.allDay && !force) {
      const s = zonedToInstant(manual.date, manual.time, tz);
      const hit = conflictsWith({ start: s, end: s + (e.durationMin ?? 60) * 60000 }, busyFrom(events, e.id));
      if (hit.length) return setManualConflict(hit.map((h) => h.title));
    }
    setManualConflict(null);
    void moveTo(manual.date, e.allDay ? null : manual.time, `Evento movido para ${brDate(manual.date)}${e.allDay ? '' : ' às ' + manual.time}.`);
  };

  return (
    <>
      <button type="button" className="back" onClick={() => go(`#/agenda?v=lista&d=${day}`)}><ArrowLeft size={18} aria-hidden="true" /> Agenda</button>
      <header className="disc-head" data-c={d?.color ?? 'ardosia'}>
        <h1 className="screen-title">{e.title}</h1>
        <p className="sub">{EVENT_TYPE_LABEL[e.type]} · {d?.name ?? 'Disciplina excluída'}{d?.kind === 'banco' ? ' (banco existente)' : ''}</p>
      </header>
      <section className="panel ev-detail" aria-label="Quando">
        <p><b>{cap(longDate(day))}</b></p>
        <p>{t ? `${t.start}${t.end ? `–${t.end}` : ''}${e.durationMin ? ` (${e.durationMin} min)` : ''}` : 'Dia inteiro'}{t && e.timeZone !== tz ? ` · informado em ${e.timeZone}` : ''}</p>
        <p>
          Status: <b>{late ? 'Atrasado (não foi marcado como concluído)' : EVENT_STATUS_LABEL[e.status]}</b>
          {e.status === 'concluido' && e.completedAt && ` em ${new Date(e.completedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: tz })}`}
        </p>
        {topicNames.length > 0 && <p>Assuntos: {topicNames.join(', ')}</p>}
        {e.notes && <p className="ev-notes">{e.notes}</p>}
        {e.plan && <p className="hint">Criado pelo planejamento para a prova de {brDate(e.plan.examDate)}.</p>}
        {link && !linkedGuideMissing && <button type="button" className="ghost" onClick={() => go(link.href)}><ExternalLink size={16} aria-hidden="true" /> {link.label}</button>}
        {e.topicIds.length > 0 && e.type !== 'prova' && e.type !== 'entrega' && <LabPracticeLink disciplineId={e.disciplineId} topicIds={e.topicIds} label="Praticar no Lab" go={go} />}
        {linkedGuideMissing && <p className="muted">O guia vinculado foi excluído. <button type="button" className="text-btn" onClick={() => go(`#/questoes?d=${e.disciplineId}`)}>Abrir questões</button></p>}
      </section>

      <section className="panel" aria-labelledby="h-ev-act">
        <div className="panel-head"><h2 id="h-ev-act">Ações</h2></div>
        <div className="row wrap">
          {e.status === 'agendado' && (
            <>
              <button type="button" className="primary" onClick={() => void update({ status: 'concluido', completedAt: nowIso() }, 'Marcado como concluído.')}><Check size={16} aria-hidden="true" /> Concluir</button>
              <button type="button" className="ghost" aria-expanded={panel === 'reagendar'} onClick={() => { setPanel(panel === 'reagendar' ? null : 'reagendar'); setManual({ date: day, time: t?.start ?? '19:00' }); }}><CalendarClock size={16} aria-hidden="true" /> Reagendar</button>
              <button type="button" className="ghost" onClick={() => void update({ status: 'cancelado' }, 'Evento cancelado. Dá para reativar.')}><Ban size={16} aria-hidden="true" /> Cancelar evento</button>
            </>
          )}
          {e.status === 'concluido' && <button type="button" className="ghost" onClick={() => void update({ status: 'agendado' }, 'Conclusão desfeita.')}><RotateCcw size={16} aria-hidden="true" /> Desfazer conclusão</button>}
          {e.status === 'cancelado' && <button type="button" className="ghost" onClick={() => void update({ status: 'agendado' }, 'Evento reativado.')}><RotateCcw size={16} aria-hidden="true" /> Reativar</button>}
          <button type="button" className="ghost" onClick={() => go(`#/evento-editar?id=${e.id}`)}><Pencil size={16} aria-hidden="true" /> Editar</button>
          <button type="button" className="text-btn danger-text" onClick={() => setPanel('excluir')}><Trash2 size={14} aria-hidden="true" /> Excluir</button>
        </div>

        {panel === 'reagendar' && (
          <div className="resched">
            {sugg?.suggestion ? (
              <div className="confirm" role="group" aria-label="Sugestão de novo horário">
                <p><b>Sugestão:</b> {sugg.suggestion.impact}</p>
                <div className="row wrap">
                  <button type="button" className="primary" onClick={() => void moveTo(sugg.suggestion!.date, e.allDay ? null : sugg.suggestion!.start, `Reagendado para ${shortDate(sugg.suggestion!.date)} às ${sugg.suggestion!.start}.`)}>Aplicar sugestão</button>
                </div>
              </div>
            ) : (
              sugg?.reason && <p className="hint">{sugg.reason}</p>
            )}
            <p className="hint">Ou escolha a nova data{e.allDay ? '' : ' e o horário'}:</p>
            <div className="row wrap practice-opts">
              <label className="field compact">
                <span>Nova data</span>
                <input type="date" value={manual?.date ?? ''} onChange={(x) => setManual((m) => ({ date: x.target.value, time: m?.time ?? '19:00' }))} />
              </label>
              {!e.allDay && (
                <label className="field compact">
                  <span>Novo horário</span>
                  <input type="time" value={manual?.time ?? ''} onChange={(x) => setManual((m) => ({ date: m?.date ?? day, time: x.target.value }))} />
                </label>
              )}
              <button type="button" className="ghost" onClick={() => tryManual()}>Mover</button>
            </div>
            {manualConflict && (
              <div className="confirm" role="alertdialog" aria-label="Conflito de horário">
                <p>Coincide com: {manualConflict.join('; ')}. Mover mesmo assim?</p>
                <div className="row wrap">
                  <button type="button" className="ghost" onClick={() => setManualConflict(null)}>Escolher outro</button>
                  <button type="button" className="primary" onClick={() => tryManual(true)}>Mover mesmo assim</button>
                </div>
              </div>
            )}
          </div>
        )}
        {panel === 'excluir' && (
          <div className="confirm" role="alertdialog" aria-label="Excluir evento">
            <p>Excluir “{e.title}” da agenda? Para manter o registro, use “Cancelar evento”. Não dá para desfazer.</p>
            <div className="row wrap">
              <button type="button" className="ghost" onClick={() => setPanel(null)}>Voltar</button>
              <button type="button" className="danger" onClick={() => void p.removeIds('events', [e.id]).then(() => go(`#/agenda?v=lista&d=${day}`), (x) => setMsg({ ok: false, text: (x as Error).message }))}>Excluir</button>
            </div>
          </div>
        )}
        {e.history && e.history.length > 0 && (
          <details className="src-details">
            <summary>Reagendamentos ({e.history.length})</summary>
            <ul className="plain">{e.history.map((h, i) => <li key={i}>{h.from} → {h.to}</li>)}</ul>
          </details>
        )}
      </section>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </>
  );
}
