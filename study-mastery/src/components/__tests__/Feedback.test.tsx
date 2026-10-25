// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { FeedbackDraft } from '../../feedback/client';
import { Feedback } from '../Feedback';

const api = vi.hoisted(() => ({ get: vi.fn(), send: vi.fn(), prepare: vi.fn(), load: vi.fn(), save: vi.fn(), clear: vi.fn() }));
vi.mock('../../feedback/client', () => ({
  getFeedbackConfig: api.get, sendFeedback: api.send, prepareImage: api.prepare,
  loadDraft: api.load, saveDraft: api.save, clearDraft: api.clear,
  newDraft: (context: { questionId?: string; questionVersion?: number } = {}) => ({ id: crypto.randomUUID(), kind: context.questionId ? 'question' : 'bug', message: '', ...context, appVersion: 'test', page: '#/feedback', images: [] }),
}));
vi.mock('../FeedbackChallenge', () => ({ FeedbackChallenge: ({ onToken }: { onToken: (value: string) => void }) => <button type="button" onClick={() => onToken('captcha-valid')}>Concluir verificação</button> }));

const MESSAGE = 'A alternativa C parece incorreta quando aplico a regra.';
const fill = () => fireEvent.change(screen.getByLabelText('O que aconteceu ou o que você sugere?'), { target: { value: MESSAGE } });
const consent = () => fireEvent.click(screen.getByRole('checkbox', { name: /Revisei o texto/ }));
async function ready() {
  await screen.findByRole('button', { name: 'Enviar feedback' });
  await waitFor(() => expect(screen.queryByText('Conferindo disponibilidade do envio…')).not.toBeInTheDocument());
}
const saved: FeedbackDraft = { id: 'saved-id', kind: 'suggestion', message: 'Meu rascunho anterior importante.', appVersion: 'test', page: '#/', images: [{ name: 'print.jpg', dataUrl: 'data:image/jpeg;base64,/9j/2Q==' }] };
beforeEach(() => {
  vi.resetAllMocks();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  api.get.mockResolvedValue({ enabled: true, siteKey: 'public-site-key' });
  api.load.mockResolvedValue(null); api.save.mockResolvedValue(undefined); api.clear.mockResolvedValue(undefined);
  api.prepare.mockResolvedValue({ name: 'print.jpg', dataUrl: 'data:image/jpeg;base64,/9j/2Q==' });
  api.send.mockImplementation(async (draft: FeedbackDraft) => ({ id: draft.id }));
});
afterEach(cleanup);

describe('feedback do estudante', () => {
  it('não carrega desafio antes do consentimento e exige texto, consentimento e captcha para enviar', async () => {
    render(<Feedback go={() => {}} />); await ready();
    const button = screen.getByRole('button', { name: 'Enviar feedback' });
    expect(button).toBeDisabled(); expect(screen.queryByText('Concluir verificação')).toBeNull();
    fill(); consent(); expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Concluir verificação' }));
    expect(button).toBeEnabled(); expect(api.send).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(await screen.findByRole('heading', { name: 'Feedback recebido' })).toBeVisible();
    expect(api.send).toHaveBeenCalledOnce();
    expect(api.send).toHaveBeenCalledWith(expect.objectContaining({ message: MESSAGE, kind: 'bug' }), 'captcha-valid');
    expect(screen.getByText(/não significa que o problema já foi revisado/)).toBeVisible();
  });
  it('leva só o identificador e a versão da questão, sem respostas, material ou histórico', async () => {
    localStorage.setItem('study-mastery:state:v1', JSON.stringify({ answers: ['privado'], material: 'privado' }));
    render(<Feedback go={() => {}} questionId="c2-lhopital-004" questionVersion={3} />); await ready();
    expect(screen.getByLabelText('Identificador da questão (opcional)')).toHaveValue('c2-lhopital-004');
    expect(screen.getByRole('radio', { name: 'Erro em uma questão' })).toBeChecked();
    fill(); consent(); fireEvent.click(screen.getByText('Concluir verificação'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar feedback' }));
    await screen.findByRole('heading', { name: 'Feedback recebido' });
    const payload = api.send.mock.calls[0][0];
    expect(payload).toMatchObject({ questionId: 'c2-lhopital-004', questionVersion: 3 });
    expect(JSON.stringify(payload)).not.toContain('privado');
    localStorage.clear();
  });
  it('mantém texto e imagens quando o servidor falha, sem declarar recebimento', async () => {
    api.send.mockRejectedValue(new Error('Limite temporário. Tente novamente depois.'));
    render(<Feedback go={() => {}} />); await ready(); fill();
    fireEvent.change(screen.getByLabelText('Anexar prints (opcional)'), { target: { files: [new File(['x'], 'print.png', { type: 'image/png' })] } });
    await screen.findByAltText('Print 1: print.jpg');
    consent(); fireEvent.click(screen.getByText('Concluir verificação')); fireEvent.click(screen.getByRole('button', { name: 'Enviar feedback' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Limite temporário');
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'Feedback recebido' })).toBeNull();
    expect(screen.getByLabelText('O que aconteceu ou o que você sugere?')).toHaveValue(MESSAGE);
    expect(screen.getByAltText('Print 1: print.jpg')).toBeVisible();
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await screen.findByText('Rascunho salvo neste aparelho. Ainda não foi enviado.');
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ message: MESSAGE, images: [expect.any(Object)] }));
  });
  it('serviço desativado permite rascunho, sem envio fictício', async () => {
    api.get.mockResolvedValue({ enabled: false });
    render(<Feedback go={() => {}} />);
    expect(await screen.findByText('Envio ainda não disponível. Você pode salvar um rascunho neste aparelho.')).toBeVisible();
    fill(); consent();
    expect(screen.getByRole('button', { name: 'Enviar feedback' })).toBeDisabled();
    expect(screen.queryByText('Concluir verificação')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await screen.findByText('Rascunho salvo neste aparelho. Ainda não foi enviado.');
    expect(api.send).not.toHaveBeenCalled();
  });
  it('rascunho só é retomado por escolha e precisa de confirmação para substituir outro', async () => {
    api.load.mockResolvedValue(saved);
    render(<Feedback go={() => {}} />); await ready();
    await screen.findByRole('button', { name: 'Retomar rascunho' });
    expect(screen.getByLabelText('O que aconteceu ou o que você sugere?')).toHaveValue('');
    fill(); fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await screen.findByRole('button', { name: 'Substituir rascunho salvo' });
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Substituir rascunho salvo' }));
    await screen.findByText('Rascunho salvo neste aparelho. Ainda não foi enviado.');
    expect(api.save).toHaveBeenCalledOnce();
    expect(api.send).not.toHaveBeenCalled();
  });
  it('retoma prints offline e nunca envia automaticamente ao reconectar', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    api.load.mockResolvedValue(saved);
    render(<Feedback go={() => {}} />); await ready();
    fireEvent.click(await screen.findByRole('button', { name: 'Retomar rascunho' }));
    expect(screen.getByLabelText('O que aconteceu ou o que você sugere?')).toHaveValue(saved.message);
    expect(screen.getByAltText('Print 1: print.jpg')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Enviar feedback' })).toBeDisabled();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    fireEvent(window, new Event('online'));
    expect(api.send).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar feedback' })).toBeDisabled();
  });
  it('rejeita mais de dois prints, permite remover e colar uma imagem', async () => {
    render(<Feedback go={() => {}} />); await ready();
    const file = () => new File(['x'], 'print.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Anexar prints (opcional)'), { target: { files: [file(), file(), file()] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('no máximo 2');
    expect(api.prepare).not.toHaveBeenCalled();
    fireEvent.paste(screen.getByRole('form', { name: 'Enviar feedback' }), { clipboardData: { files: [file()] } });
    await screen.findByAltText('Print 1: print.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Remover print 1' }));
    expect(screen.queryByAltText('Print 1: print.jpg')).toBeNull();
  });
  it('não substitui um rascunho diferente após um envio', async () => {
    api.load.mockResolvedValue(saved);
    render(<Feedback go={() => {}} />); await ready(); fill(); consent();
    fireEvent.click(screen.getByText('Concluir verificação')); fireEvent.click(screen.getByRole('button', { name: 'Enviar feedback' }));
    await screen.findByRole('heading', { name: 'Feedback recebido' });
    expect(api.clear).not.toHaveBeenCalled();
  });
});
