// Postgres temporário para testar as migrações do Supabase com RLS, imitando como a API do Supabase (PostgREST)
// executa cada requisição: transação com `set local role authenticated` e o JWT em request.jwt.claims.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

const ROOT = path.resolve(import.meta.dirname, '../..');

export function findPgBin(): string | null {
  const candidates = [process.env.PG_BIN, ...(fs.existsSync('/usr/lib/postgresql') ? fs.readdirSync('/usr/lib/postgresql').sort().reverse().map((v) => `/usr/lib/postgresql/${v}/bin`) : [])];
  for (const c of candidates) if (c && fs.existsSync(path.join(c, 'initdb'))) return c;
  return null;
}

export interface Db {
  /** consulta como o papel postgres (dono das tabelas, sem RLS) */
  admin<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params?: unknown[]): Promise<pg.QueryResult<T>>;
  /** requisição de um usuário autenticado (RLS ativo) */
  as(uid: string): Requester;
  anon(): Requester;
  /** chave secreta do servidor (Edge Functions): ignora RLS */
  service(): Requester;
  createUser(email: string): Promise<string>;
  stop(): Promise<void>;
}

export interface Requester {
  q<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params?: unknown[]): Promise<pg.QueryResult<T>>;
}

export async function startDb(): Promise<Db> {
  const bin = findPgBin();
  if (!bin) throw new Error('Postgres não encontrado (defina PG_BIN)');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-pg-'));
  const asRoot = process.getuid?.() === 0;
  const run = (cmd: string, args: string[]) => (asRoot ? ['runuser', ['-u', 'postgres', '--', path.join(bin, cmd), ...args]] : [path.join(bin, cmd), args]) as [string, string[]];
  if (asRoot) execFileSync('chown', ['postgres', dir]);
  const data = path.join(dir, 'data');
  execFileSync(...run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C.UTF-8']), { stdio: 'ignore' });
  const port = 20000 + Math.floor(Math.random() * 20000);
  const proc: ChildProcess = spawn(...run('postgres', ['-D', data, '-k', dir, '-p', String(port), '-c', "listen_addresses=", '-c', 'fsync=off']), { stdio: 'ignore' });
  let client!: pg.Client;
  for (let i = 0; ; i++) {
    // um cliente novo por tentativa: o pg não reaproveita um cliente que falhou ao conectar
    client = new pg.Client({ host: dir, port, user: 'postgres', database: 'postgres' });
    try {
      await client.connect();
      break;
    } catch (e) {
      if (i > 80) throw e;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  await client.query(fs.readFileSync(path.join(ROOT, 'tests/db/supabase-shim.sql'), 'utf8'));
  const migDir = path.join(ROOT, 'supabase/migrations');
  for (const f of fs.readdirSync(migDir).filter((x) => x.endsWith('.sql')).sort()) {
    try {
      await client.query(fs.readFileSync(path.join(migDir, f), 'utf8'));
    } catch (e) {
      throw new Error(`migração ${f}: ${(e as Error).message}`);
    }
  }

  const request = (role: 'authenticated' | 'anon' | 'service_role', uid?: string): Requester => ({
    async q(sql, params) {
      await client.query('begin');
      try {
        await client.query(`set local role ${role}`);
        await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(uid ? { sub: uid, role } : { role })]);
        const r = await client.query(sql, params as unknown[]);
        await client.query('commit');
        return r;
      } catch (e) {
        await client.query('rollback');
        throw e;
      }
    },
  });

  return {
    admin: (sql, params) => client.query(sql, params as unknown[]),
    as: (uid) => request('authenticated', uid),
    anon: () => request('anon'),
    service: () => request('service_role'),
    async createUser(email) {
      const r = await client.query<{ id: string }>('insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id', [email]);
      return r.rows[0].id;
    },
    async stop() {
      await client.end().catch(() => undefined);
      // pg_ctl encerra o servidor mesmo quando ele foi iniciado via runuser (que não repassa todos os sinais)
      const exited = new Promise((r) => proc.once('exit', r));
      try {
        execFileSync(...run('pg_ctl', ['-D', data, 'stop', '-m', 'immediate', '-w']), { stdio: 'ignore' });
      } catch {
        proc.kill('SIGKILL');
      }
      await exited;
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Espera que a promessa falhe; devolve o código SQLSTATE. */
export async function rejects(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as { code?: string }).code ?? 'erro';
  }
  throw new Error('a operação deveria ter sido recusada');
}
