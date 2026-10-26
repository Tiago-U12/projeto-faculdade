// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFeedbackConfig, newDraft, prepareImage, sendFeedback } from './client';
afterEach(() => { vi.unstubAllGlobals(); location.hash = ''; });
describe('cliente de feedback', () => {
  it('exclui parâmetros privados do contexto e não lê histórico', () => {
    location.hash = '#/material?id=segredo';
    localStorage.setItem('study-mastery:state:v1', 'respostas privadas');
    const draft = newDraft();
    expect(draft.page).toBe('#/material');
    expect(JSON.stringify(draft)).not.toMatch(/segredo|respostas privadas/);
    localStorage.clear();
  });
  it('não confunde HTML de fallback do Pages com API disponível', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Home</html>', { headers: { 'content-type': 'text/html' } })));
    await expect(getFeedbackConfig()).rejects.toThrow('ainda não está disponível');
  });
  it('exige configuração explícita e chave pública do desafio', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"enabled":true}', { headers: { 'content-type': 'application/json' } })));
    expect(await getFeedbackConfig()).toEqual({ enabled: false, siteKey: undefined });
  });
  it('só confirma um protocolo correspondente à requisição', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"id":"outro"}', { headers: { 'content-type': 'application/json' } })));
    await expect(sendFeedback(newDraft(), 'captcha')).rejects.toThrow('não confirmou o protocolo');
  });
  it('erro do servidor não vira sucesso e envio usa no-store', async () => {
    const mock = vi.fn().mockResolvedValue(new Response('{"error":"Limite atingido"}', { status: 429, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', mock);
    await expect(sendFeedback(newDraft(), 'captcha')).rejects.toThrow('Limite atingido');
    expect(mock.mock.calls[0][1]).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit' });
  });
  it('rejeita SVG, arquivo vazio e tamanho excessivo antes de decodificar', async () => {
    await expect(prepareImage(new File(['<svg/>'], 'print.svg', { type: 'image/svg+xml' }))).rejects.toThrow('PNG');
    await expect(prepareImage(new File([], 'print.jpg', { type: 'image/jpeg' }))).rejects.toThrow('vazio');
    await expect(prepareImage(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'print.png', { type: 'image/png' }))).rejects.toThrow('10 MB');
  });
});
