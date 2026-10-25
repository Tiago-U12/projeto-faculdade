// Utilidades comuns das Edge Functions (Deno): CORS restrito às origens do app, respostas JSON e clientes do
// Supabase. A chave secreta só existe aqui, no servidor (variável de ambiente da função), nunca no navegador.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

const DEFAULT_ORIGINS = ['https://study-mastery.pages.dev', 'https://tiago-u12.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173'];

function allowedOrigins(): string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS');
  return env ? env.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_ORIGINS;
}

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const ok = allowedOrigins().includes(origin) || /^https:\/\/[a-z0-9-]+\.study-mastery\.pages\.dev$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowedOrigins()[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8' } });
}

function firstKey(jsonEnv: string, legacy: string): string {
  const raw = Deno.env.get(jsonEnv);
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      if (keys.default) return keys.default;
      const first = Object.values(keys)[0];
      if (first) return first;
    } catch {
      /* formato antigo */
    }
  }
  const k = Deno.env.get(legacy);
  if (!k) throw new Error(`variável ${jsonEnv}/${legacy} ausente`);
  return k;
}

const url = () => Deno.env.get('SUPABASE_URL') ?? '';

/** Cliente que age COMO o usuário (o RLS vale): use para ler dados dele. */
export function userClient(req: Request): SupabaseClient {
  return createClient(url(), firstKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente do servidor (ignora RLS): use só para campos que o usuário não pode definir, SEMPRE filtrando por owner_id. */
export function serviceClient(): SupabaseClient {
  return createClient(url(), firstKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await userClient(req).auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}

export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
