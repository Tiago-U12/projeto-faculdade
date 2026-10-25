import { useCallback, useEffect, useState } from 'react';

type Focus = { topics?: string[]; mode?: 'aprender' | 'simulado' | 'revisao' | 'misto' };
export type Route = { name: 'home' } | ({ name: 'setup'; disciplineId?: string; preset?: string } & Focus) | { name: 'quiz' } | { name: 'results'; id?: string } | { name: 'progress' } | { name: 'library' } | { name: 'help' } | { name: 'account' } | { name: 'disciplines' } | { name: 'discipline'; id: string } | { name: 'materialNew'; disciplineId: string } | { name: 'material'; id: string } | ({ name: 'questions'; disciplineId: string } & Focus) | { name: 'guideNew'; disciplineId: string } | { name: 'guide'; id: string }
  | { name: 'calendar'; view: 'lista' | 'semana' | 'mes'; date?: string } | { name: 'event'; id: string } | { name: 'eventNew'; date?: string; disciplineId?: string; type?: string } | { name: 'eventEdit'; id: string } | { name: 'planner'; disciplineId?: string; guideId?: string } | { name: 'privacy' };

const MODES = ['aprender', 'simulado', 'revisao', 'misto'] as const;
/** assuntos (t=a,b) e modo (m=revisao) vindos de um evento da agenda */
function focus(params: URLSearchParams): Focus {
  const t = params.get('t')?.split(',').filter(Boolean);
  const m = params.get('m') as Focus['mode'];
  return { ...(t?.length ? { topics: t } : {}), ...(m && MODES.includes(m) ? { mode: m } : {}) };
}

export function parseHash(hash: string): Route {
  const [path, query] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query ?? '');
  switch (path) {
    case 'setup':
      return { name: 'setup', disciplineId: params.get('d') ?? undefined, preset: params.get('preset') ?? undefined, ...focus(params) };
    case 'quiz':
      return { name: 'quiz' };
    case 'results':
      return { name: 'results', id: params.get('id') ?? undefined };
    case 'progress':
      return { name: 'progress' };
    case 'library':
      return { name: 'library' };
    case 'ajuda':
      return { name: 'help' };
    case 'conta':
      return { name: 'account' };
    case 'dados':
      return { name: 'privacy' };
    case 'disciplinas':
      return { name: 'disciplines' };
    case 'material-novo':
      return params.get('d') ? { name: 'materialNew', disciplineId: params.get('d')! } : { name: 'disciplines' };
    case 'material':
      return params.get('id') ? { name: 'material', id: params.get('id')! } : { name: 'disciplines' };
    case 'questoes':
      return params.get('d') ? { name: 'questions', disciplineId: params.get('d')!, ...focus(params) } : { name: 'disciplines' };
    case 'guia-novo':
      return params.get('d') ? { name: 'guideNew', disciplineId: params.get('d')! } : { name: 'disciplines' };
    case 'guia':
      return params.get('id') ? { name: 'guide', id: params.get('id')! } : { name: 'disciplines' };
    case 'agenda': {
      const v = params.get('v');
      const d = params.get('d');
      return { name: 'calendar', view: v === 'semana' || v === 'mes' ? v : 'lista', ...(d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? { date: d } : {}) };
    }
    case 'evento':
      return params.get('id') ? { name: 'event', id: params.get('id')! } : { name: 'calendar', view: 'lista' };
    case 'evento-novo':
      return { name: 'eventNew', date: params.get('date') ?? undefined, disciplineId: params.get('d') ?? undefined, type: params.get('type') ?? undefined };
    case 'evento-editar':
      return params.get('id') ? { name: 'eventEdit', id: params.get('id')! } : { name: 'calendar', view: 'lista' };
    case 'planejar':
      return { name: 'planner', disciplineId: params.get('d') ?? undefined, guideId: params.get('g') ?? undefined };
    case 'disciplina':
      return params.get('id') ? { name: 'discipline', id: params.get('id')! } : { name: 'disciplines' };
    default:
      return { name: 'home' };
  }
}

export function useHashRoute(): [Route, (to: string) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(globalThis.location?.hash ?? ''));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((to: string) => {
    if (location.hash !== to) location.hash = to;
    else setRoute(parseHash(to));
    scrollTo?.({ top: 0 });
  }, []);
  return [route, go];
}
