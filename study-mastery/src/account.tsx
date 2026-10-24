import type { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSupabase, isAuthCallback } from './cloud/client';
import { appUrl, cloudConfig } from './cloud/config';

export type AccountStatus = 'off' | 'loading' | 'signedOut' | 'signedIn';

export interface AccountUser {
  id: string;
  email: string;
}

export interface Account {
  /** contas ativadas neste site (variáveis do Supabase presentes no build) */
  configured: boolean;
  status: AccountStatus;
  user: AccountUser | null;
  /** chegou pelo link de "esqueci a senha": pedir a nova senha */
  recovery: boolean;
  /** mensagem vinda de um link de e-mail (expirado, inválido…) */
  notice: string | null;
  clearNotice(): void;
  client(): Promise<SupabaseClient>;
  signUp(email: string, password: string): Promise<string>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  sendReset(email: string): Promise<string>;
  updatePassword(password: string): Promise<string>;
}

const off = () => Promise.reject(new Error('Contas não estão ativadas neste site.'));
/** Sem provedor (testes de componente, telas isoladas): contas desativadas. */
const OFF: Account = { configured: false, status: 'off', user: null, recovery: false, notice: null, clearNotice: () => undefined, client: off, signUp: off, signIn: off, signOut: off, sendReset: off, updatePassword: off };

const Ctx = createContext<Account | null>(null);
export const useAccount = (): Account => useContext(Ctx) ?? OFF;
/** Para testes de componente com uma conta simulada. */
export const AccountContext = Ctx;

export const MIN_PASSWORD = 8;

/** Mensagens de erro de autenticação em português, com orientação. */
export function authMessage(e: Pick<AuthError, 'message'> & { code?: string; status?: number }): string {
  const code = e.code ?? '';
  if (code === 'invalid_credentials' || /Invalid login credentials/i.test(e.message)) return 'E-mail ou senha incorretos.';
  if (code === 'email_not_confirmed' || /Email not confirmed/i.test(e.message)) return 'Confirme seu e-mail antes de entrar: abra o link que enviamos (veja também o spam).';
  if (code === 'weak_password' || /Password should be/i.test(e.message)) return `Use uma senha mais forte, com pelo menos ${MIN_PASSWORD} caracteres.`;
  if (code === 'same_password') return 'A nova senha precisa ser diferente da atual.';
  if (code === 'over_email_send_rate_limit' || /rate limit/i.test(e.message)) return 'Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.';
  if (code === 'over_request_rate_limit' || e.status === 429) return 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.';
  if (code === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(e.message)) return 'Este e-mail não parece válido.';
  if (code === 'email_address_not_authorized' || /not authorized/i.test(e.message)) return 'O envio de e-mails ainda não foi configurado para este endereço. Avise o responsável pelo Study Mastery.';
  if (code === 'signup_disabled') return 'Novos cadastros estão desativados no momento.';
  if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(e.message)) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  return 'Não foi possível concluir: ' + e.message;
}

/** Lê o erro que o Supabase devolve no fragmento do link (#error=…&error_description=…). */
export function callbackError(hash: string): string | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const code = p.get('error_code');
  if (!code && !p.get('error')) return null;
  if (code === 'otp_expired') return 'O link do e-mail expirou ou já foi usado. Peça um novo.';
  return 'O link do e-mail não pôde ser usado: ' + (p.get('error_description') ?? code ?? 'erro');
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const configured = !!cloudConfig();
  const [status, setStatus] = useState<AccountStatus>(configured ? 'loading' : 'off');
  const [user, setUser] = useState<AccountUser | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [notice, setNotice] = useState<string | null>(() => (isAuthCallback() ? callbackError(location.hash) : null));

  const client = useCallback(() => {
    const c = getSupabase();
    if (!c) return Promise.reject(new Error('Contas não estão ativadas neste site.'));
    return c;
  }, []);

  useEffect(() => {
    if (!configured) return;
    let unsub: (() => void) | undefined;
    let alive = true;
    const fromLink = isAuthCallback();
    void client().then(async (sb) => {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (!alive) return;
        const u = session?.user;
        setUser(u ? { id: u.id, email: u.email ?? '' } : null);
        setStatus(u ? 'signedIn' : 'signedOut');
        if (event === 'PASSWORD_RECOVERY') setRecovery(true);
        if (u && event === 'SIGNED_IN') {
          // cria o perfil na primeira entrada (o RLS só permite o próprio id)
          void sb.from('profiles').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true });
        }
        // depois de processar um link de e-mail, sai do fragmento com tokens e mostra a conta
        if (fromLink && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION')) {
          if (isAuthCallback()) history.replaceState(null, '', location.pathname + location.search + '#/conta');
          dispatchEvent(new HashChangeEvent('hashchange'));
        }
      });
      unsub = () => data.subscription.unsubscribe();
    }, () => alive && setStatus('signedOut'));
    if (fromLink && callbackError(location.hash)) {
      history.replaceState(null, '', location.pathname + location.search + '#/conta');
      dispatchEvent(new HashChangeEvent('hashchange'));
    }
    return () => {
      alive = false;
      unsub?.();
    };
  }, [configured, client]);

  const value = useMemo<Account>(
    () => ({
      configured,
      status,
      user,
      recovery,
      notice,
      clearNotice: () => setNotice(null),
      client,
      async signUp(email, password) {
        if (password.length < MIN_PASSWORD) throw new Error(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
        const sb = await client();
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: appUrl() } });
        if (error) throw new Error(authMessage(error));
        if (data.session) return 'Conta criada. Você já está dentro.';
        // o Supabase não revela se o e-mail já tinha conta (evita descobrir e-mails cadastrados)
        return `Se ${email.trim()} ainda não tinha conta, enviamos um link de confirmação. Abra-o neste aparelho para ativar a conta.`;
      },
      async signIn(email, password) {
        const sb = await client();
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(authMessage(error));
      },
      async signOut() {
        const sb = await client();
        // "local": encerra só neste aparelho
        const { error } = await sb.auth.signOut({ scope: 'local' });
        if (error) throw new Error(authMessage(error));
        setRecovery(false);
      },
      async sendReset(email) {
        const sb = await client();
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl() });
        if (error) throw new Error(authMessage(error));
        return `Se ${email.trim()} tiver conta, enviamos um link para criar uma nova senha.`;
      },
      async updatePassword(password) {
        if (password.length < MIN_PASSWORD) throw new Error(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
        const sb = await client();
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw new Error(authMessage(error));
        setRecovery(false);
        return 'Senha alterada.';
      },
    }),
    [configured, status, user, recovery, notice, client],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
