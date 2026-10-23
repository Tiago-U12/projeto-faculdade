// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RadioProvider } from '../../radio';
import { RadioPlayer } from '../RadioPlayer';

// jsdom não decodifica mídia nem implementa IndexedDB; a UI e o provider são reais.
vi.mock('../../lib/radio', async (original) => ({
  ...await original<typeof import('../../lib/radio')>(),
  probeAppTrack: async () => 'ausente',
  loadDeviceTrack: async () => null,
  saveDeviceTrack: async () => { throw Error('armazenamento bloqueado'); },
  removeDeviceTrack: async () => {},
}));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('Audio', class extends EventTarget {
    paused = true;
    loop = false;
    preload = '';
    src = '';
    volume = 1;
    play() { this.paused = false; this.dispatchEvent(new Event('playing')); return Promise.resolve(); }
    pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
    getAttribute() { return this.src; }
  });
  vi.stubGlobal('URL', class extends URL { static createObjectURL() { return 'blob:test'; } static revokeObjectURL() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('RadioPlayer com RadioProvider', () => {
  it('informa ausência de música, desabilita play e devolve foco ao fechar com Escape', async () => {
    render(<RadioProvider><RadioPlayer /></RadioProvider>);
    const trigger = screen.getByRole('button', { name: 'Study Radio' });
    fireEvent.click(trigger);
    expect(await screen.findByText('Sem música ainda')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tocar música' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
  it('rejeita arquivo inválido e mantém música tocando quando o painel fecha ou a tela muda', async () => {
    const app = (page: string) => <RadioProvider><RadioPlayer /><main>{page}</main></RadioProvider>;
    const view = render(app('Questão 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Study Radio' }));
    await screen.findByText('Sem música ainda');
    const input = screen.getByLabelText('Arquivo MP3 do aparelho');
    fireEvent.change(input, { target: { files: [new File(['x'], 'errado.txt', { type: 'text/plain' })] } });
    expect(await screen.findByText('Escolha um arquivo MP3.')).toBeVisible();
    fireEvent.change(input, { target: { files: [new File(['test fixture'], 'teste.mp3', { type: 'audio/mpeg' })] } });
    await screen.findByText(/carregado só nesta aba/);
    fireEvent.click(screen.getByRole('button', { name: 'Tocar música' }));
    expect(await screen.findByText('Tocando em loop')).toBeVisible();
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '35' } });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '35%');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Study Radio' }));
    view.rerender(app('Questão 2'));
    fireEvent.click(screen.getByRole('button', { name: 'Study Radio (tocando)' }));
    expect(screen.getByText('Tocando em loop')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Pausar música' }));
    expect(await screen.findByText('Pausada')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tocar música' })).toBeDisabled());
  });
});
