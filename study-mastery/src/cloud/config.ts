// Configuração pública da conta (Supabase). Ambas as variáveis são PÚBLICAS por natureza: a URL do projeto e a chave
// publicável (anon) servem para o navegador se identificar; o que protege os dados é o RLS no banco. A chave secreta
// (service role) nunca entra aqui — só nas Edge Functions.
export interface CloudConfig {
  url: string;
  key: string;
}

export function cloudConfig(env: Record<string, string | undefined> = import.meta.env): CloudConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url)) return null;
  // defesa: uma chave secreta colada por engano no build não é usada no navegador
  if (/^sb_secret_/.test(key) || /service_role/.test(atobSafe(key.split('.')[1] ?? ''))) return null;
  return { url, key };
}

function atobSafe(s: string): string {
  try {
    return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return '';
  }
}

/** Endereço do app para os links dos e-mails (confirmação e nova senha). */
export function appUrl(): string {
  return location.origin + location.pathname;
}
