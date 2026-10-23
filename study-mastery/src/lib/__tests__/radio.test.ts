import { describe, expect, it } from 'vitest';
import { acceptsFile, appTrackUrl, clampVolume, DEFAULT_PREFS, isAudioResponse, loadPrefs, MAX_DEVICE_TRACK_BYTES, savePrefs } from '../radio';

describe('Study Radio', () => {
  it('carrega padrões diante de preferências ausentes, inválidas ou bloqueadas', () => {
    for (const raw of [null, '{', 'null']) expect(loadPrefs({ getItem: () => raw })).toEqual(DEFAULT_PREFS);
    expect(loadPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(loadPrefs({ getItem: () => { throw Error('bloqueado'); } })).toEqual(DEFAULT_PREFS);
  });
  it('persiste origem e volume normalizado sem falhar com armazenamento bloqueado', () => {
    const values = new Map<string, string>();
    const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    savePrefs(store, { volume: 2, source: 'app' });
    expect(loadPrefs(store)).toEqual({ volume: 1, source: 'app' });
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(NaN)).toBe(DEFAULT_PREFS.volume);
    expect(() => savePrefs({ setItem: () => { throw Error('quota'); } }, DEFAULT_PREFS)).not.toThrow();
  });
  it('aceita MP3 por MIME ou extensão, respeitando os limites de tamanho', () => {
    expect(acceptsFile({ name: 'a.MP3', type: '', size: 1 })).toBeNull();
    expect(acceptsFile({ name: 'a', type: 'audio/mpeg', size: MAX_DEVICE_TRACK_BYTES })).toBeNull();
    expect(acceptsFile({ name: 'a.mp3', type: '', size: 0 })).toMatch(/vazio/);
    expect(acceptsFile({ name: 'a.mp3', type: '', size: MAX_DEVICE_TRACK_BYTES + 1 })).toMatch(/grande/);
    expect(acceptsFile({ name: 'a.wav', type: 'audio/wav', size: 10 })).toMatch(/MP3/);
  });
  it('distingue áudio de um fallback HTML e de erros HTTP', () => {
    for (const type of ['audio/mpeg', 'audio/mp3', 'application/octet-stream']) expect(isAudioResponse(new Response('', { headers: { 'content-type': type } }))).toBe(true);
    expect(isAudioResponse(new Response('', { headers: { 'content-type': 'text/html' } }))).toBe(false);
    expect(isAudioResponse(new Response('', { status: 404, headers: { 'content-type': 'audio/mpeg' } }))).toBe(false);
    expect(appTrackUrl('https://example.org/projeto-faculdade/study-mastery/')).toBe('https://example.org/projeto-faculdade/study-mastery/audio/study-radio.mp3');
  });
});
