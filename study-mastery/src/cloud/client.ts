import type { SupabaseClient } from '@supabase/supabase-js';
import { cloudConfig } from './config';

let client: Promise<SupabaseClient> | null = null;

/** Cliente carregado sob demanda: quem não usa conta não baixa o supabase-js. */
export function getSupabase(): Promise<SupabaseClient> | null {
  const cfg = cloudConfig();
  if (!cfg) return null;
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(cfg.url, cfg.key, {
      auth: {
        // fluxo implícito: o link do e-mail funciona mesmo aberto em outro navegador/app do celular
        flowType: 'implicit',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'study-mastery:auth',
      },
    }),
  );
  return client;
}

/** O endereço atual traz retorno de um link de e-mail (tokens ou erro no fragmento)? */
export function isAuthCallback(hash = location.hash): boolean {
  return /(^|[#&])(access_token|error_description|error_code)=/.test(hash);
}
