// @vitest-environment jsdom
// Interface do Web Lab/React Lab dentro da página do Core (layout de celular: o jsdom não tem matchMedia). O jsdom não
// executa o iframe isolado — prévia, testes e isolamento rodam no Chromium (tests/e2e/labs.ts).
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { makeBank } from '../../../lib/bank';
import { StudyProvider } from '../../../state';
import { resetCatalogCache } from '../../catalog';
import { labStoreFor, resetLabStores } from '../../hooks';
import { LabPage } from '../../LabPage';
import { memoryLabStore } from '../../storage';
import { WEB_EXERCISES } from '../exercises';

const tools = vi.hoisted(() => ({ fail: false }));
vi.mock('../compile', () => ({
  loadReactTools: async () => {
    if (tools.fail) throw new Error('rede indisponível');
    return { runtime: 'window.React={};', compile: (s: string) => ({ code: s }) };
  },
}));

const bank = makeBank([], { schemaVersion: 1, bankVersion: 'test', generatedAt: '', totals: { approved: 0 }, byDiscipline: {} });
const mount = (id: string) => render(<StudyProvider bank={bank} store={null}><LabPage id={id} go={vi.fn()} /></StudyProvider>);
const editor = () => screen.findByLabelText(/^Editor de/) as Promise<HTMLTextAreaElement>;

beforeEach(() => {
  tools.fail = false;
  resetCatalogCache();
  resetLabStores();
  void labStoreFor('device', async (s) => memoryLabStore(s, true));
});
afterEach(cleanup);

describe('Web Lab', () => {
  it('abas de arquivo, prévia isolada e abas de painel no celular', async () => {
    mount('web-funcoes-carrinho');
    expect(await screen.findByRole('tab', { name: 'script.js' })).toHaveAttribute('aria-selected', 'true');
    expect((await editor()).value).toBe(WEB_EXERCISES.find((e) => e.id === 'web-funcoes-carrinho')!.files['script.js']);
    fireEvent.click(screen.getByRole('tab', { name: 'index.html' }));
    expect(await screen.findByLabelText('Editor de index.html (HTML)')).toBeInTheDocument();
    const tabs = screen.getByRole('tablist', { name: 'Áreas do laboratório' });
    expect([...tabs.querySelectorAll('[role=tab]')].map((t) => t.textContent)).toEqual(['Código', 'Prévia', 'Console', 'Testes']);
    fireEvent.click(screen.getByRole('tab', { name: 'Prévia' }));
    const frame = document.querySelector('iframe.web-frame')!;
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
    expect(frame.getAttribute('srcdoc')).toContain('Content-Security-Policy');
    fireEvent.click(screen.getByRole('tab', { name: 'Testes' }));
    expect(screen.getByText('subtotal soma preço × quantidade (e vale 0 para carrinho vazio)')).toBeInTheDocument();
  });

  it('arquivo de apoio é só leitura; edição vira rascunho dos arquivos editáveis; restaurar volta ao inicial', async () => {
    const first = mount('react-contador');
    fireEvent.click(await screen.findByRole('tab', { name: /index\.html/ }));
    expect(await screen.findByLabelText('Editor de index.html (HTML)')).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('tab', { name: 'App.jsx' }));
    fireEvent.change(await screen.findByLabelText('Editor de App.jsx (JSX)'), { target: { value: 'export default function App() { return null; }' } });
    await waitFor(() => expect(screen.getByText('Rascunho salvo neste aparelho.')).toBeInTheDocument(), { timeout: 2000 });
    const draft = await (await labStoreFor('device')).getDraft('react-contador');
    expect(Object.keys(draft!.files!).sort()).toEqual(['App.jsx', 'style.css']);
    first.unmount();
    mount('react-contador');
    await waitFor(async () => expect((await screen.findByLabelText('Editor de App.jsx (JSX)') as HTMLTextAreaElement).value).toBe('export default function App() { return null; }'));
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar exercício' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    await waitFor(async () => expect((await screen.findByLabelText('Editor de App.jsx (JSX)') as HTMLTextAreaElement).value).toContain("import { useState } from 'react';"));
  });

  it('React Lab sem as ferramentas (primeira abertura offline): aviso, botões desligados e "Tentar de novo"', async () => {
    tools.fail = true;
    mount('react-busca-lista');
    expect(await screen.findByText(/Não foi possível carregar o React deste laboratório/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Executar' })).toBeDisabled();
    tools.fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Executar' })).toBeEnabled());
  });
});
