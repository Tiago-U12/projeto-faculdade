import { Music, Pause, Play, Trash2, Upload, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useRadio } from '../radio';

const STATUS_TEXT = {
  parado: 'Pronta para tocar',
  carregando: 'Carregando…',
  tocando: 'Tocando em loop',
  pausado: 'Pausada',
  'sem-musica': 'Sem música ainda',
  erro: 'Não foi possível tocar',
} as const;

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(n / 1024)} KB`);

/** Botão discreto no cabeçalho + painel do Study Radio. O <audio> vive no RadioProvider: fechar o painel não para a música. */
export function RadioPlayer() {
  const r = useRadio();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const playing = r.status === 'tocando';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    addEventListener('pointerdown', onDown);
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('pointerdown', onDown);
      removeEventListener('keydown', onKey);
    };
  }, [open]);

  const vol = Math.round(r.prefs.volume * 100);
  const VolIcon = vol === 0 ? VolumeX : vol < 50 ? Volume1 : Volume2;

  return (
    <div className="radio" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={'icon-btn radio-btn' + (playing ? ' playing' : '') + (open ? ' active' : '')}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={playing ? 'Study Radio (tocando)' : 'Study Radio'}
        title="Study Radio"
        onClick={() => setOpen((o) => !o)}
      >
        {playing ? (
          <span className="eq" aria-hidden="true"><i /><i /><i /></span>
        ) : (
          <Music size={19} aria-hidden="true" />
        )}
      </button>
      {open && (
        <section id={panelId} className="radio-panel" aria-label="Study Radio">
          <div className="radio-head">
            <b><Music size={15} aria-hidden="true" /> Study Radio</b>
            <button type="button" className="icon-btn small" aria-label="Fechar Study Radio" onClick={() => setOpen(false)}><X size={16} aria-hidden="true" /></button>
          </div>
          <div className="radio-main">
            <button type="button" className="radio-play" onClick={r.toggle} disabled={!r.source && r.status !== 'tocando'} aria-label={playing ? 'Pausar música' : 'Tocar música'}>
              {playing ? <Pause size={22} aria-hidden="true" /> : <Play size={22} aria-hidden="true" />}
            </button>
            <div className="radio-info">
              <strong role="status">{STATUS_TEXT[r.status]}</strong>
              <small>
                {r.source === 'aparelho' && r.deviceTrack ? `${r.deviceTrack.name} · ${kb(r.deviceTrack.size)}` : r.source === 'app' ? (r.appTrack === 'offline' ? 'Música do app · disponível offline' : 'Música do app') : r.appTrack === null ? 'Procurando a música do app…' : 'Nenhum MP3 configurado'}
              </small>
            </div>
          </div>
          <label className="radio-vol">
            <VolIcon size={17} aria-hidden="true" />
            <span className="sr-only">Volume</span>
            <input type="range" min={0} max={100} step={5} value={vol} onChange={(e) => r.setVolume(Number(e.target.value) / 100)} aria-valuetext={`${vol}%`} />
            <span className="radio-vol-val" aria-hidden="true">{vol}%</span>
          </label>
          {r.deviceTrack && (r.appTrack === 'disponivel' || r.appTrack === 'offline') && (
            <div className="seg radio-src" role="group" aria-label="Origem da música">
              <button type="button" className={'seg-btn' + (r.source === 'app' ? ' active' : '')} aria-pressed={r.source === 'app'} onClick={() => r.chooseSource('app')}>Do app</button>
              <button type="button" className={'seg-btn' + (r.source === 'aparelho' ? ' active' : '')} aria-pressed={r.source === 'aparelho'} onClick={() => r.chooseSource('aparelho')}>Do aparelho</button>
            </div>
          )}
          <div className="radio-actions">
            <button type="button" className="text-btn" onClick={() => fileRef.current?.click()}><Upload size={14} aria-hidden="true" /> {r.deviceTrack ? 'Trocar MP3 do aparelho' : 'Escolher MP3 do aparelho'}</button>
            {r.deviceTrack && <button type="button" className="text-btn danger-text" onClick={() => void r.removeDeviceFile()}><Trash2 size={14} aria-hidden="true" /> Remover</button>}
            <input
              ref={fileRef}
              type="file"
              accept="audio/mpeg,.mp3"
              className="sr-only"
              tabIndex={-1}
              aria-label="Arquivo MP3 do aparelho"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void r.addDeviceFile(f);
              }}
            />
          </div>
          {r.message && <p className="radio-msg" role="status">{r.message}</p>}
          <p className="radio-note">Uma música em loop, sem anúncios e sem Spotify. O arquivo escolhido fica só neste aparelho.</p>
        </section>
      )}
    </div>
  );
}
