import { AlertTriangle, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Globe, List, Plus, Route as RouteIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCatalog, useTimeZone, type CalDiscipline } from '../calendar/hooks';
import { eventDay, eventTimes, isOverdue } from '../calendar/plan';
import { addDays, addMonths, cap, COMMON_TZ, deviceTimeZone, longDate, monthGrid, monthTitle, shortDate, startOfWeek, todayIn, WEEKDAY_SHORT, type YMD } from '../calendar/time';
import { useCollection } from '../personal/context';
import { EVENT_TYPE_LABEL, type PEvent } from '../personal/types';

export type CalView = 'lista' | 'semana' | 'mes';
const VIEW_LABEL: Record<CalView, string> = { lista: 'Lista', semana: 'Semana', mes: 'Mês' };

/** Ordena eventos do dia: dia inteiro primeiro, depois por horário. */
export function sortDay(list: PEvent[]): PEvent[] {
  return [...list].sort((a, b) => (a.allDay === b.allDay ? (a.start ?? '').localeCompare(b.start ?? '') || a.title.localeCompare(b.title, 'pt-BR') : a.allDay ? -1 : 1));
}

export function useEventsByDay(tz: string): { byDay: Map<YMD, PEvent[]>; events: PEvent[]; loading: boolean } {
  const { items: events, loading } = useCollection('events');
  const byDay = useMemo(() => {
    const m = new Map<YMD, PEvent[]>();
    for (const e of events) {
      const d = eventDay(e, tz);
      m.set(d, [...(m.get(d) ?? []), e]);
    }
    for (const [d, l] of m) m.set(d, sortDay(l));
    return m;
  }, [events, tz]);
  return { byDay, events, loading };
}

export function EventRow({ e, d, tz, now, go }: { e: PEvent; d?: CalDiscipline; tz: string; now: number; go: (to: string) => void }) {
  const t = eventTimes(e, tz);
  const late = isOverdue(e, now, tz);
  return (
    <li>
      <button type="button" className={'ev-row st-' + e.status + (late ? ' late' : '')} data-c={d?.color ?? 'ardosia'} onClick={() => go(`#/evento?id=${e.id}`)}>
        <span className="ev-time">{t ? <>{t.start}{t.end && <small>{t.end}</small>}</> : <small>dia inteiro</small>}</span>
        <span className="ev-body">
          <strong>{e.title}</strong>
          <small>{EVENT_TYPE_LABEL[e.type]} · {d?.name ?? 'Disciplina excluída'}</small>
        </span>
        {late ? <span className="q-badge b-warn">Atrasado</span> : e.status !== 'agendado' ? <span className={'q-badge ev-st-' + e.status}>{e.status === 'concluido' ? 'Concluído' : 'Cancelado'}</span> : null}
      </button>
    </li>
  );
}

export function Calendar({ view, date, go }: { view: CalView; date?: string; go: (to: string) => void }) {
  const [tz, setTz] = useTimeZone();
  const catalog = useCatalog();
  const now = Date.now();
  const today = todayIn(tz, now);
  const anchor = date ?? today;
  const { byDay, events, loading } = useEventsByDay(tz);
  const [tzOpen, setTzOpen] = useState(false);
  const nav = (v: CalView, d: YMD) => go(`#/agenda?v=${v}&d=${d}`);
  const step = (dir: 1 | -1) => nav(view, view === 'mes' ? addMonths(anchor, dir) : addDays(anchor, dir * (view === 'semana' ? 7 : 14)));
  const late = events.filter((e) => isOverdue(e, now, tz)).sort((a, b) => eventDay(a, tz).localeCompare(eventDay(b, tz)));
  const row = (e: PEvent) => <EventRow key={e.id} e={e} d={catalog.get(e.disciplineId)} tz={tz} now={now} go={go} />;

  const range =
    view === 'mes' ? monthTitle(anchor) : view === 'semana' ? `${shortDate(startOfWeek(anchor))} – ${shortDate(addDays(startOfWeek(anchor), 6))}` : `${shortDate(anchor)} – ${shortDate(addDays(anchor, 13))}`;

  return (
    <>
      <h1 className="screen-title">Agenda</h1>
      <p className="sub">Provas, entregas e sessões de estudo. Tudo funciona por botões e formulários; nada é concluído sozinho.</p>
      <div className="row wrap cal-actions">
        <button type="button" className="primary" onClick={() => go(`#/evento-novo?date=${anchor}`)}><Plus size={16} aria-hidden="true" /> Novo evento</button>
        <button type="button" className="ghost" onClick={() => go('#/planejar')}><RouteIcon size={16} aria-hidden="true" /> Planejar até a prova</button>
      </div>

      {late.length > 0 && (
        <section className="panel late-box" aria-labelledby="h-late">
          <div className="panel-head"><h2 id="h-late"><AlertTriangle size={18} aria-hidden="true" /> Atrasados</h2><small className="muted">{late.length}</small></div>
          <p className="hint">Passaram do horário sem ser marcados. Conclua, reagende ou cancele cada um — nada muda sem você confirmar.</p>
          <ul className="ev-list">{late.slice(0, 5).map(row)}</ul>
          {late.length > 5 && <p className="muted">E mais {late.length - 5}.</p>}
        </section>
      )}

      <div className="cal-bar">
        <div className="seg" role="group" aria-label="Visualização">
          {(Object.keys(VIEW_LABEL) as CalView[]).map((v) => (
            <button key={v} type="button" className={'seg-btn' + (view === v ? ' active' : '')} aria-pressed={view === v} onClick={() => nav(v, anchor)}>
              {v === 'lista' ? <List size={15} aria-hidden="true" /> : v === 'semana' ? <CalendarRange size={15} aria-hidden="true" /> : <CalendarDays size={15} aria-hidden="true" />} {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
        <div className="cal-nav">
          <button type="button" className="icon-btn" aria-label="Anterior" onClick={() => step(-1)}><ChevronLeft size={20} aria-hidden="true" /></button>
          <button type="button" className="ghost small" onClick={() => nav(view, today)}>Hoje</button>
          <button type="button" className="icon-btn" aria-label="Próximo" onClick={() => step(1)}><ChevronRight size={20} aria-hidden="true" /></button>
        </div>
      </div>
      <h2 className="cal-range" aria-live="polite">{range}</h2>

      {loading ? (
        <p className="muted" role="status">Carregando…</p>
      ) : view === 'lista' ? (
        <ListView anchor={anchor} today={today} byDay={byDay} row={row} empty={!events.length} />
      ) : view === 'semana' ? (
        <div className="week">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)).map((d) => (
            <section key={d} className={'day-block' + (d === today ? ' today' : '')} aria-label={longDate(d)}>
              <h3>{cap(shortDate(d))}{d === today && <span className="today-tag">hoje</span>}</h3>
              {byDay.get(d)?.length ? <ul className="ev-list">{byDay.get(d)!.map(row)}</ul> : <p className="muted small">Nada marcado.</p>}
            </section>
          ))}
        </div>
      ) : (
        <MonthView anchor={anchor} today={today} byDay={byDay} catalog={catalog} onPick={(d) => nav('mes', d)} row={row} />
      )}

      <section className="panel" aria-labelledby="h-tz">
        <div className="panel-head"><h2 id="h-tz"><Globe size={18} aria-hidden="true" /> Fuso horário</h2></div>
        <p className="hint">Horários aparecem em <b>{tz}</b>{tz !== deviceTimeZone() ? ` (o aparelho está em ${deviceTimeZone()})` : ''}. Eventos de dia inteiro mantêm a data em qualquer fuso.</p>
        {tzOpen ? (
          <label className="field compact">
            <span>Fuso da agenda</span>
            <select value={tz} onChange={(e) => { setTz(e.target.value); setTzOpen(false); }}>
              {[...new Set([deviceTimeZone(), tz, ...COMMON_TZ])].map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </label>
        ) : (
          <button type="button" className="text-btn" onClick={() => setTzOpen(true)}>Alterar fuso</button>
        )}
        <p className="muted small">Lembretes: nesta versão não há notificações com o site fechado. Abra a agenda para ver o que vem a seguir.</p>
      </section>
    </>
  );
}

function ListView({ anchor, today, byDay, row, empty }: { anchor: YMD; today: YMD; byDay: Map<YMD, PEvent[]>; row: (e: PEvent) => React.ReactNode; empty: boolean }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(anchor, i)).filter((d) => byDay.get(d)?.length || d === today);
  if (empty) return <p className="muted empty-cal">Nenhum evento ainda. Use “Novo evento” para marcar uma prova ou entrega, ou “Planejar até a prova” para montar as sessões de estudo.</p>;
  if (!days.length) return <p className="muted">Nada marcado nestes 14 dias.</p>;
  return (
    <div className="agenda">
      {days.map((d) => (
        <section key={d} className={'day-block' + (d === today ? ' today' : '')} aria-label={longDate(d)}>
          <h3>{cap(shortDate(d))}{d === today && <span className="today-tag">hoje</span>}</h3>
          {byDay.get(d)?.length ? <ul className="ev-list">{byDay.get(d)!.map(row)}</ul> : <p className="muted small">Nada marcado hoje.</p>}
        </section>
      ))}
    </div>
  );
}

function MonthView({ anchor, today, byDay, catalog, onPick, row }: { anchor: YMD; today: YMD; byDay: Map<YMD, PEvent[]>; catalog: ReturnType<typeof useCatalog>; onPick: (d: YMD) => void; row: (e: PEvent) => React.ReactNode }) {
  const grid = monthGrid(anchor);
  const month = anchor.slice(0, 7);
  const sel = byDay.get(anchor) ?? [];
  return (
    <>
      <div className="month" aria-label={monthTitle(anchor)} role="group">
        <div className="month-head" aria-hidden="true">{WEEKDAY_SHORT.map((w) => <span key={w}>{w}</span>)}</div>
        {Array.from({ length: 6 }, (_, w) => (
          <div key={w} className="month-row">
            {grid.slice(w * 7, w * 7 + 7).map((d) => {
              const list = (byDay.get(d) ?? []).filter((e) => e.status !== 'cancelado');
              return (
                <button
                  key={d}
                  type="button"
                  className={'mday' + (d.slice(0, 7) !== month ? ' other' : '') + (d === today ? ' today' : '') + (d === anchor ? ' sel' : '')}
                  aria-pressed={d === anchor}
                  aria-label={`${shortDate(d)}: ${list.length ? `${list.length} evento${list.length === 1 ? '' : 's'}` : 'nada marcado'}`}
                  onClick={() => onPick(d)}
                >
                  <span className="mnum">{Number(d.slice(8))}</span>
                  <span className="mdots" aria-hidden="true">
                    {list.slice(0, 3).map((e) => <i key={e.id} data-c={catalog.get(e.disciplineId)?.color ?? 'ardosia'} className={e.type === 'prova' ? 'prova' : ''} />)}
                    {list.length > 3 && <b>+{list.length - 3}</b>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <section className="day-block" aria-label={longDate(anchor)}>
        <h3>{cap(longDate(anchor))}</h3>
        {sel.length ? <ul className="ev-list">{sel.map(row)}</ul> : <p className="muted small">Nada marcado neste dia.</p>}
      </section>
    </>
  );
}
