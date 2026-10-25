// Diagnóstico do app no aparelho do estudante: só leitura, exceto `repairAppCache`, que remove o service worker e os
// caches DESTE app (prefixo study-mastery-) — nunca o localStorage nem o IndexedDB, onde ficam progresso e música.

declare global {
  interface Window {
    __smErrors?: string[];
    __smBooted?: boolean;
    __smBootHelp?: () => void;
    __smRepair?: () => Promise<unknown>;
  }
}

export interface DiagnosticReport {
  appVersion: string;
  bankVersion: string;
  at: string;
  url: string;
  userAgent: string;
  screen: string;
  online: boolean;
  serviceWorker: { supported: boolean; controlled: boolean; registrations: { scope: string; active?: string; waiting: boolean; installing: boolean }[] };
  caches: string[] | 'indisponível';
  storage: { usageMB?: number; quotaMB?: number; persisted?: boolean };
  localStorage: 'ok' | 'bloqueado';
  indexedDB: 'ok' | 'indisponível';
  savedStateKB: number | null;
  errors: string[];
}

const CACHE_PREFIX = 'study-mastery-';
const appBase = () => new URL('./', location.href).href;
const mb = (n?: number) => (n === undefined ? undefined : Math.round((n / 1024 / 1024) * 10) / 10);

async function idbWorks(): Promise<boolean> {
  if (!('indexedDB' in globalThis)) return false;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('study-mastery-probe');
      req.onsuccess = () => {
        req.result.close();
        resolve(true);
      };
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function collectDiagnostics(appVersion: string, bankVersion: string): Promise<DiagnosticReport> {
  const sw = navigator.serviceWorker;
  const regs = sw?.getRegistrations ? await sw.getRegistrations().catch(() => []) : [];
  let cacheNames: DiagnosticReport['caches'] = 'indisponível';
  try {
    if ('caches' in globalThis) cacheNames = (await caches.keys()).filter((k) => k.startsWith(CACHE_PREFIX));
  } catch {
    /* modo privado em alguns navegadores */
  }
  const est = await navigator.storage?.estimate?.().catch(() => undefined);
  const persisted = await navigator.storage?.persisted?.().catch(() => undefined);
  let ls: DiagnosticReport['localStorage'] = 'bloqueado';
  let savedStateKB: number | null = null;
  try {
    localStorage.setItem('__sm_diag__', '1');
    localStorage.removeItem('__sm_diag__');
    ls = 'ok';
    const raw = localStorage.getItem('study-mastery:state:v1');
    savedStateKB = raw === null ? null : Math.round(raw.length / 102.4) / 10;
  } catch {
    /* bloqueado */
  }
  return {
    appVersion,
    bankVersion,
    at: new Date().toISOString(),
    url: location.origin + location.pathname,
    userAgent: navigator.userAgent,
    screen: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`,
    online: navigator.onLine,
    serviceWorker: {
      supported: !!sw,
      controlled: !!sw?.controller,
      registrations: regs.filter((r) => r.scope.startsWith(appBase())).map((r) => ({ scope: r.scope, active: r.active?.state, waiting: !!r.waiting, installing: !!r.installing })),
    },
    caches: cacheNames,
    storage: { usageMB: mb(est?.usage), quotaMB: mb(est?.quota), persisted },
    localStorage: ls,
    indexedDB: (await idbWorks()) ? 'ok' : 'indisponível',
    savedStateKB,
    errors: [...(window.__smErrors ?? [])],
  };
}

export function formatDiagnostics(r: DiagnosticReport): string {
  const sw = r.serviceWorker;
  return [
    `Study Mastery ${r.appVersion} (banco ${r.bankVersion}) — ${r.at}`,
    `Endereço: ${r.url}`,
    `Navegador: ${r.userAgent}`,
    `Tela: ${r.screen} · ${r.online ? 'online' : 'offline'}`,
    `Service worker: ${sw.supported ? (sw.controlled ? 'controlando a página' : 'não controla esta página') : 'não suportado'}; registros: ${sw.registrations.map((x) => `${x.active ?? 'sem ativo'}${x.waiting ? ' + aguardando' : ''}${x.installing ? ' + instalando' : ''}`).join(', ') || 'nenhum'}`,
    `Caches do app: ${Array.isArray(r.caches) ? r.caches.join(', ') || 'nenhum' : r.caches}`,
    `Armazenamento: ${r.storage.usageMB ?? '?'} MB de ${r.storage.quotaMB ?? '?'} MB${r.storage.persisted === undefined ? '' : r.storage.persisted ? ' (persistente)' : ' (pode ser limpo pelo navegador)'}`,
    `localStorage: ${r.localStorage} · IndexedDB: ${r.indexedDB} · progresso salvo: ${r.savedStateKB === null ? 'nenhum' : r.savedStateKB + ' KB'}`,
    `Erros registrados: ${r.errors.length ? '\n  ' + r.errors.join('\n  ') : 'nenhum'}`,
  ].join('\n');
}

/** Remove service worker e caches deste app. Progresso (localStorage) e música do aparelho (IndexedDB) ficam intactos. */
export async function repairAppCache(): Promise<{ unregistered: number; cachesDeleted: string[] }> {
  const base = appBase();
  let unregistered = 0;
  const regs = navigator.serviceWorker?.getRegistrations ? await navigator.serviceWorker.getRegistrations() : [];
  for (const r of regs) if (r.scope.startsWith(base) && (await r.unregister())) unregistered++;
  const cachesDeleted: string[] = [];
  if ('caches' in globalThis) {
    for (const k of await caches.keys()) if (k.startsWith(CACHE_PREFIX) && (await caches.delete(k))) cachesDeleted.push(k);
  }
  return { unregistered, cachesDeleted };
}
