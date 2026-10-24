import { useCallback, useEffect, useState } from 'react';

export type Route = { name: 'home' } | { name: 'setup'; disciplineId?: string; preset?: string } | { name: 'quiz' } | { name: 'results'; id?: string } | { name: 'progress' } | { name: 'library' } | { name: 'help' } | { name: 'account' } | { name: 'disciplines' } | { name: 'discipline'; id: string } | { name: 'materialNew'; disciplineId: string } | { name: 'material'; id: string } | { name: 'questions'; disciplineId: string } | { name: 'guideNew'; disciplineId: string } | { name: 'guide'; id: string };

export function parseHash(hash: string): Route {
  const [path, query] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query ?? '');
  switch (path) {
    case 'setup':
      return { name: 'setup', disciplineId: params.get('d') ?? undefined, preset: params.get('preset') ?? undefined };
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
    case 'disciplinas':
      return { name: 'disciplines' };
    case 'material-novo':
      return params.get('d') ? { name: 'materialNew', disciplineId: params.get('d')! } : { name: 'disciplines' };
    case 'material':
      return params.get('id') ? { name: 'material', id: params.get('id')! } : { name: 'disciplines' };
    case 'questoes':
      return params.get('d') ? { name: 'questions', disciplineId: params.get('d')! } : { name: 'disciplines' };
    case 'guia-novo':
      return params.get('d') ? { name: 'guideNew', disciplineId: params.get('d')! } : { name: 'disciplines' };
    case 'guia':
      return params.get('id') ? { name: 'guide', id: params.get('id')! } : { name: 'disciplines' };
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
