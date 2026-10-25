// @vitest-environment jsdom
// Conta SIMULADA (sem Supabase): confere textos, erros e o que a tela faz com os dados do aparelho.
// A autenticação real só é comprovada no projeto Supabase configurado (tests/integration).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AccountContext, authMessage, callbackError, type Account } from '../../account';
import { makeBank } from '../../lib/bank';
import { accountStateKey, emptyState, saveState } from '../../lib/storage';
import { memoryBackend } from '../../personal/backend';
import { PersonalProvider } from '../../personal/context';
import { LocalRepo } from '../../personal/repo';
import { StudyProvider } from '../../state';
import { Account as AccountPage } from '../Account';

const bank = makeBank([], { schemaVersion: 1, bankVersion: 'test', generatedAt: '', totals: { approved: 0 }, byDiscipline: {} });
const base: Account = {
  configured: true, status: 'signedOut', user: null, recovery: false, notice: null, clearNotice: () => undefined,
  client: () => Promise.reject(new Error('sem rede')), signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), sendReset: vi.fn(), updatePassword: vi.fn(),
};
function mount(a: Partial<Account>) {
  return render(
    <AccountContext.Provider value={{ ...base, ...a }}>
      <StudyProvider bank={bank} store={localStorage}>
        <PersonalProvider repo={new LocalRepo(memoryBackend())}>
          <AccountPage go={vi.fn()} />
        </PersonalProvider>
      </StudyProvider>
    </AccountContext.Provider>,
  );
}
afterEach(() => { cleanup(); localStorage.clear(); });

describe('tela Conta (conta simulada)', () => {
  it('erro de login aparece em português e a senha não é apagada do formulário', async () => {
    mount({ signIn: vi.fn().mockRejectedValue(new Error(authMessage({ message: 'Invalid login credentials', code: 'invalid_credentials' }))) });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^Senha/), { target: { value: 'senhaerrada' } });
    fireEvent.click(within(screen.getByRole('form', { name: 'Entrar' })).getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });

  it('criar conta não revela se o e-mail já existia', async () => {
    mount({ signUp: vi.fn().mockResolvedValue('Se a@b.com ainda não tinha conta, enviamos um link de confirmação.') });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^Senha/), { target: { value: '12345678' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Criar conta' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Se a@b.com ainda não tinha conta/);
  });

  it('sair sem pendências apaga a cópia da conta neste aparelho (aparelho compartilhado)', async () => {
    const uid = 'u-1';
    saveState(localStorage, { ...emptyState(), sync: {} }, accountStateKey(uid));
    const signOut = vi.fn().mockResolvedValue(undefined);
    mount({ status: 'signedIn', user: { id: uid, email: 'a@b.com' }, signOut });
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Sair' })).getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    await waitFor(() => expect(localStorage.getItem(accountStateKey(uid))).toBeNull());
  });
});

describe('links de e-mail', () => {
  it('link expirado vira orientação', () => {
    expect(callbackError('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid')).toMatch(/expirou/);
    expect(callbackError('#/conta')).toBeNull();
  });
});

