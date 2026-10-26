// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackAdmin } from '../FeedbackAdmin';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../feedback/client', async importOriginal => ({ ...await importOriginal<typeof import('../../feedback/client')>(), feedbackRequest: request }));
const item = { id: 'abc', kind: 'bug', message: '<script>não executar</script> Problema ao abrir', createdAt: '2026-10-25T12:00:00Z', status: 'new', imageCount: 0, images: [], appVersion: '0.6.1', page: '#/quiz', note: '' };
beforeEach(() => { request.mockReset(); localStorage.clear(); sessionStorage.clear(); });
afterEach(cleanup);
describe('caixa privada de feedbacks', () => {
  it('não solicita relatos antes de autenticar nem guarda a chave no navegador', async () => {
    render(<FeedbackAdmin />); expect(request).not.toHaveBeenCalled();
    request.mockResolvedValueOnce({ items: [item] }); const user = userEvent.setup();
    await user.type(screen.getByLabelText('Chave de acesso da administração'), 'uma-chave-privada-com-32-caracteres');
    await user.click(screen.getByRole('button', { name: 'Abrir caixa' }));
    expect(await screen.findByText(item.message)).toBeVisible();
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
    await user.click(screen.getByRole('button', { name: 'Sair da administração' }));
    expect(screen.queryByText(item.message)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Chave de acesso da administração')).toHaveValue('');
  });
  it('mostra recusa de acesso sem abrir a caixa', async () => {
    request.mockRejectedValueOnce(new Error('Acesso restrito.')); render(<FeedbackAdmin />); const user = userEvent.setup();
    await user.type(screen.getByLabelText('Chave de acesso da administração'), 'invalida'); await user.click(screen.getByRole('button', { name: 'Abrir caixa' }));
    expect(await screen.findByText('Acesso restrito.')).toBeVisible(); expect(screen.queryByText('Nenhum feedback recebido.')).toBeNull();
  });
  it('atualiza status com autorização, mantém texto como texto e exige confirmar exclusão', async () => {
    request.mockResolvedValueOnce({ items: [item] }).mockResolvedValueOnce({ item }).mockResolvedValue({ id: 'abc' });
    render(<FeedbackAdmin />); const user = userEvent.setup();
    await user.type(screen.getByLabelText('Chave de acesso da administração'), 'chave'); await user.click(screen.getByRole('button', { name: 'Abrir caixa' }));
    await user.click(await screen.findByRole('button', { name: /Erro|Problema no site/ }));
    await user.selectOptions(await screen.findByLabelText('Status'), 'reviewing');
    await user.type(screen.getByLabelText('Anotações da análise (privadas)'), 'Reproduzido em 320 px');
    await user.click(screen.getByRole('button', { name: 'Salvar acompanhamento' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('?id=abc', { method: 'PATCH', body: JSON.stringify({ status: 'reviewing', note: 'Reproduzido em 320 px' }) }, 'chave'));
    await user.click(screen.getByRole('button', { name: 'Excluir relato' }));
    expect(request.mock.calls.some(call => call[1]?.method === 'DELETE')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('?id=abc', { method: 'DELETE' }, 'chave'));
    expect(await screen.findByText('Relato e anexos excluídos.')).toBeVisible();
  });
});
