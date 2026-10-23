// Study Radio: player próprio para UMA música em MP3, em loop, que continua tocando entre as questões.
// Nenhuma música acompanha o app. Duas origens possíveis, ambas opcionais:
//   1. "app": o arquivo public/audio/study-radio.mp3, se alguém o adicionar ao build (o service worker guarda uma cópia
//      depois da primeira reprodução, para tocar offline);
//   2. "aparelho": um MP3 escolhido pelo estudante, guardado só neste navegador (IndexedDB), que também toca offline.
// Sem nenhum dos dois, o player mostra "sem música" e o restante do app funciona normalmente.

export const RADIO_FILE = 'audio/study-radio.mp3';
const PREFS_KEY = 'study-mastery:radio:v1';
const DB_NAME = 'study-mastery-radio';
const STORE = 'faixas';
const TRACK_KEY = 'aparelho';

export type RadioSource = 'app' | 'aparelho';

export interface RadioPrefs {
  /** 0 a 1 */
  volume: number;
  /** origem preferida quando as duas existem */
  source: RadioSource;
}

export const DEFAULT_PREFS: RadioPrefs = { volume: 0.6, source: 'aparelho' };

export function appTrackUrl(base: string = globalThis.document?.baseURI ?? 'http://localhost/'): string {
  return new URL(RADIO_FILE, base).href;
}

export function clampVolume(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : DEFAULT_PREFS.volume;
  return Math.min(1, Math.max(0, n));
}

export function browserPrefsStore(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // acesso ao localStorage bloqueado
  }
}

export function loadPrefs(store: Pick<Storage, 'getItem'> | null): RadioPrefs {
  try {
    const raw = store?.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const p = JSON.parse(raw) as Partial<RadioPrefs>;
    return { volume: clampVolume(p.volume), source: p.source === 'app' ? 'app' : 'aparelho' };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(store: Pick<Storage, 'setItem'> | null, prefs: RadioPrefs): void {
  try {
    store?.setItem(PREFS_KEY, JSON.stringify({ volume: clampVolume(prefs.volume), source: prefs.source }));
  } catch {
    /* armazenamento bloqueado: as preferências valem só nesta aba */
  }
}

/** Uma resposta só conta como música se for áudio de verdade (servidores de SPA devolvem o index.html com 200 para caminhos inexistentes). */
export function isAudioResponse(r: Pick<Response, 'ok' | 'headers'>): boolean {
  if (!r.ok) return false;
  const type = (r.headers.get('content-type') ?? '').toLowerCase();
  return type.startsWith('audio/') || type === 'application/octet-stream';
}

/** O MP3 do app existe (na rede ou no cache do service worker)? Não baixa o arquivo: HEAD e, sem rede, consulta ao cache. */
export async function probeAppTrack(url = appTrackUrl()): Promise<'disponivel' | 'offline' | 'ausente'> {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (isAudioResponse(r)) return 'disponivel';
  } catch {
    /* sem rede: vale o cache */
  }
  try {
    const hit = await globalThis.caches?.match(url);
    if (hit) return 'offline';
  } catch {
    /* Cache API indisponível */
  }
  return 'ausente';
}

// ---------- faixa escolhida no aparelho (IndexedDB) ----------

export interface DeviceTrack {
  name: string;
  type: string;
  size: number;
  blob: Blob;
  savedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('IndexedDB indisponível'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('falha ao abrir o IndexedDB'));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        t.onerror = t.onabort = () => {
          db.close();
          reject(t.error ?? req.error ?? new Error('falha no IndexedDB'));
        };
      }),
  );
}

export const MAX_DEVICE_TRACK_BYTES = 60 * 1024 * 1024;

export function acceptsFile(f: Pick<File, 'name' | 'type' | 'size'>): string | null {
  const mp3 = f.type === 'audio/mpeg' || f.type === 'audio/mp3' || /\.mp3$/i.test(f.name);
  if (!mp3) return 'Escolha um arquivo MP3.';
  if (f.size === 0) return 'O arquivo está vazio.';
  if (f.size > MAX_DEVICE_TRACK_BYTES) return 'Arquivo grande demais (máximo de 60 MB).';
  return null;
}

export async function loadDeviceTrack(): Promise<DeviceTrack | null> {
  try {
    return ((await tx('readonly', (s) => s.get(TRACK_KEY))) as DeviceTrack | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function saveDeviceTrack(file: File): Promise<DeviceTrack> {
  const track: DeviceTrack = { name: file.name, type: file.type || 'audio/mpeg', size: file.size, blob: file, savedAt: new Date().toISOString() };
  await tx('readwrite', (s) => s.put(track, TRACK_KEY));
  return track;
}

export async function removeDeviceTrack(): Promise<void> {
  await tx('readwrite', (s) => s.delete(TRACK_KEY));
}
