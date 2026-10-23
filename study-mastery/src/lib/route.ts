import { useCallback, useEffect, useState } from 'react';

export type Route = { name: 'home' } | { name: 'setup'; disciplineId?: string; preset?: string } | { name: 'quiz' } | { name: 'results' } | { name: 'progress' } | { name: 'library' };

export function parseHash(hash: string): Route {
  const [path, query] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query ?? '');
  switch (path) {
    case 'setup':
      return { name: 'setup', disciplineId: params.get('d') ?? undefined, preset: params.get('preset') ?? undefined };
    case 'quiz':
      return { name: 'quiz' };
    case 'results':
      return { name: 'results' };
    case 'progress':
      return { name: 'progress' };
    case 'library':
      return { name: 'library' };
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
