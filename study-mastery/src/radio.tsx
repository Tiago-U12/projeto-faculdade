import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { acceptsFile, appTrackUrl, browserPrefsStore, clampVolume, loadDeviceTrack, loadPrefs, probeAppTrack, removeDeviceTrack, saveDeviceTrack, savePrefs, type DeviceTrack, type RadioPrefs, type RadioSource } from './lib/radio';

export type RadioStatus = 'parado' | 'carregando' | 'tocando' | 'pausado' | 'sem-musica' | 'erro';

export interface Radio {
  status: RadioStatus;
  prefs: RadioPrefs;
  /** MP3 do app: 'disponivel' (rede), 'offline' (só no cache), 'ausente' ou null enquanto verifica */
  appTrack: 'disponivel' | 'offline' | 'ausente' | null;
  deviceTrack: Pick<DeviceTrack, 'name' | 'size'> | null;
  /** origem que tocará (ou toca) agora; null = nenhuma música disponível */
  source: RadioSource | null;
  message: string;
  toggle(): void;
  setVolume(v: number): void;
  chooseSource(s: RadioSource): void;
  addDeviceFile(f: File): Promise<void>;
  removeDeviceFile(): Promise<void>;
  /** verifica de novo se o MP3 do app existe */
  refresh(): void;
}

const Ctx = createContext<Radio | null>(null);
export const useRadio = (): Radio => {
  const r = useContext(Ctx);
  if (!r) throw new Error('useRadio fora do RadioProvider');
  return r;
};

/**
 * Um único <audio> (fora da árvore de rotas) toca em loop: trocar de questão ou de tela não reinicia a música.
 * Nada toca sozinho: só depois de um toque em "Tocar" (exigência dos navegadores e respeito ao estudante).
 */
export function RadioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const deviceUrlRef = useRef<string | null>(null);
  const loadedRef = useRef<string | null>(null);
  const [prefs, setPrefs] = useState<RadioPrefs>(() => loadPrefs(browserPrefsStore()));
  const [status, setStatus] = useState<RadioStatus>('parado');
  const [appTrack, setAppTrack] = useState<Radio['appTrack']>(null);
  const [deviceTrack, setDeviceTrack] = useState<Radio['deviceTrack']>(null);
  const [message, setMessage] = useState('');

  const audio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.loop = true;
      a.preload = 'none';
      a.addEventListener('playing', () => setStatus('tocando'));
      a.addEventListener('pause', () => setStatus((s) => (s === 'tocando' || s === 'carregando' ? 'pausado' : s)));
      a.addEventListener('waiting', () => setStatus((s) => (s === 'tocando' ? 'carregando' : s)));
      a.addEventListener('error', () => {
        if (!a.getAttribute('src')) return;
        setStatus('erro');
        setMessage('Não foi possível tocar a música. Verifique se o arquivo é um MP3 válido.');
      });
      audioRef.current = a;
    }
    return audioRef.current;
  }, []);

  const refresh = useCallback(() => {
    setAppTrack(null);
    probeAppTrack().then(setAppTrack, () => setAppTrack('ausente'));
  }, []);

  useEffect(() => {
    refresh();
    loadDeviceTrack().then((t) => {
      if (!t) return;
      deviceUrlRef.current = URL.createObjectURL(t.blob);
      setDeviceTrack({ name: t.name, size: t.size });
    });
    return () => {
      audioRef.current?.pause();
      if (deviceUrlRef.current) URL.revokeObjectURL(deviceUrlRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    savePrefs(browserPrefsStore(), prefs);
    if (audioRef.current) audioRef.current.volume = prefs.volume;
  }, [prefs]);

  const hasApp = appTrack === 'disponivel' || appTrack === 'offline';
  const source: RadioSource | null = deviceTrack && (prefs.source === 'aparelho' || !hasApp) ? 'aparelho' : hasApp ? 'app' : deviceTrack ? 'aparelho' : null;
  const effectiveStatus: RadioStatus = !source && status !== 'tocando' && appTrack !== null ? 'sem-musica' : status;

  // Media Session: controles na tela de bloqueio/central de mídia do celular
  useEffect(() => {
    const ms = globalThis.navigator?.mediaSession;
    if (!ms || typeof MediaMetadata === 'undefined') return;
    ms.metadata = new MediaMetadata({ title: 'Study Radio', artist: 'Study Mastery', album: deviceTrack && source === 'aparelho' ? deviceTrack.name : 'Música de estudo' });
    try {
      ms.setActionHandler('play', () => void audioRef.current?.play());
      ms.setActionHandler('pause', () => audioRef.current?.pause());
    } catch {
      /* ação não suportada */
    }
  }, [deviceTrack, source]);

  const toggle = useCallback(() => {
    const a = audio();
    if (!a.paused) {
      a.pause();
      return;
    }
    const url = source === 'aparelho' ? deviceUrlRef.current : source === 'app' ? appTrackUrl() : null;
    if (!url) {
      setStatus('sem-musica');
      setMessage('Nenhuma música disponível ainda. Escolha um MP3 do aparelho.');
      return;
    }
    if (loadedRef.current !== url) {
      a.src = url;
      loadedRef.current = url;
    }
    a.volume = prefs.volume;
    setMessage('');
    setStatus('carregando');
    // play() chamado dentro do toque do estudante: exigência de autoplay de celulares
    a.play().catch((e: unknown) => {
      if ((e as { name?: string })?.name === 'AbortError') return;
      setStatus('erro');
      setMessage('O navegador não deixou tocar a música agora. Tente de novo.');
    });
  }, [audio, prefs.volume, source]);

  const value = useMemo<Radio>(
    () => ({
      status: effectiveStatus,
      prefs,
      appTrack,
      deviceTrack,
      source,
      message,
      toggle,
      setVolume: (v) => setPrefs((p) => ({ ...p, volume: clampVolume(v) })),
      chooseSource: (s) => {
        audioRef.current?.pause();
        setPrefs((p) => ({ ...p, source: s }));
      },
      async addDeviceFile(f) {
        const erro = acceptsFile(f);
        if (erro) {
          setMessage(erro);
          return;
        }
        audioRef.current?.pause();
        let stored = true;
        try {
          await saveDeviceTrack(f);
        } catch {
          stored = false; // sem IndexedDB (ex.: navegação privada): toca só nesta aba
        }
        if (deviceUrlRef.current) URL.revokeObjectURL(deviceUrlRef.current);
        deviceUrlRef.current = URL.createObjectURL(f);
        setDeviceTrack({ name: f.name, size: f.size });
        setPrefs((p) => ({ ...p, source: 'aparelho' }));
        setStatus('parado');
        setMessage(stored ? `“${f.name}” salvo neste aparelho: toca também sem internet.` : `“${f.name}” carregado só nesta aba (o navegador não permitiu salvar).`);
      },
      async removeDeviceFile() {
        if (source === 'aparelho') audioRef.current?.pause();
        try {
          await removeDeviceTrack();
        } catch {
          /* nada salvo */
        }
        if (deviceUrlRef.current) URL.revokeObjectURL(deviceUrlRef.current);
        deviceUrlRef.current = null;
        setDeviceTrack(null);
        setStatus('parado');
        setMessage('Música do aparelho removida.');
      },
      refresh,
    }),
    [effectiveStatus, prefs, appTrack, deviceTrack, source, message, toggle, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
