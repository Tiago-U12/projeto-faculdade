import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cloudflareAPI, provision } from '../../tools/cloudflare-feedback.mjs';

const ACCOUNT = 'a'.repeat(32), SHA = 'b'.repeat(40);
const DB = '11111111-1111-4111-8111-111111111111';
const PROD_DB = '22222222-2222-4222-8222-222222222222';
const DEPLOY = '33333333-3333-4333-8333-333333333333';
const RECEIPT = '44444444-4444-4444-8444-444444444444';
const ADMIN = 'preview-' + 'A'.repeat(40), PROD_ADMIN = 'production-' + 'B'.repeat(40);
const TURNSTILE = 'private-turnstile-secret-for-test';
const clone = value => structuredClone(value);
const migration = readFileSync(new URL('../../migrations-feedback/0001_feedback.sql', import.meta.url), 'utf8');
const version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;
const options = { accountId: ACCOUNT, target: 'preview', commitSha: SHA, adminToken: ADMIN, apply: true, freePlanConfirmed: true };

function fixture(t) {
  const state = {
    calls: [], logs: [], databases: [], widgets: [], sql: new Map(),
    project: {
      name: 'study-mastery', subdomain: 'study-mastery.pages.dev', production_branch: 'main',
      source: { type: 'github', config: { owner: 'Tiago-U12', repo_name: 'projeto-faculdade' } },
      build_config: { root_dir: 'study-mastery', destination_dir: 'dist', build_command: 'npm run build' },
      deployment_configs: Object.fromEntries(['preview', 'production'].map(target => [target, {
        env_vars: { EXISTING: { type: 'plain_text', value: `keep-${target}` }, EXISTING_SECRET: { type: 'secret_text', value: '' } },
        d1_databases: { OTHER_DB: { id: `unrelated-${target}` } }, compatibility_flags: ['nodejs_compat'],
      }])),
    },
    deployment: {
      id: DEPLOY, project_name: 'study-mastery', environment: 'preview', url: 'https://abc.study-mastery.pages.dev',
      deployment_trigger: { metadata: { branch: 'feat/feedback-inbox', commit_hash: SHA } },
      latest_stage: { status: 'success' }, env_vars: {}, created_on: new Date(Date.now() - 60_000).toISOString(),
    },
  };
  t.after(() => { for (const sql of state.sql.values()) sql.close(); });
  const addDB = (name, id = DB) => {
    state.databases.push({ name, uuid: id });
    state.sql.set(id, new DatabaseSync(':memory:'));
  };
  const api = async (method, path, body) => {
    state.calls.push({ method, path, body: clone(body) });
    const url = new URL(`https://api.cloudflare.com${path}`);
    const route = url.pathname.replace(`/accounts/${ACCOUNT}`, '');
    if (route === '/pages/projects/study-mastery') {
      if (method === 'GET') return clone(state.project);
      assert.equal(method, 'PATCH');
      for (const [target, value] of Object.entries(body.deployment_configs)) {
        Object.assign(state.project.deployment_configs[target].env_vars, clone(value.env_vars));
        state.project.deployment_configs[target].d1_databases = clone(value.d1_databases);
      }
      state.project.modified_on = '2026-10-25T21:00:00Z';
      return clone(state.project);
    }
    if (route === '/d1/database') {
      if (method === 'GET') return clone(state.databases);
      assert.equal(method, 'POST');
      addDB(body.name, body.name.endsWith('-production') ? PROD_DB : DB);
      return clone(state.databases.at(-1));
    }
    const q = /^\/d1\/database\/([^/]+)\/query$/.exec(route);
    if (q) {
      assert.equal(method, 'POST');
      const sql = state.sql.get(q[1]);
      if (/^(SELECT|PRAGMA)/i.test(body.sql)) return [{ success: true, results: sql.prepare(body.sql).all(...body.params) }];
      sql.exec(body.sql);
      return [{ success: true, results: [] }];
    }
    if (route === '/challenges/widgets') {
      if (method === 'GET') return clone(state.widgets);
      assert.equal(method, 'POST');
      const widget = { ...body, sitekey: `sitekey-${state.widgets.length}`, secret: TURNSTILE };
      state.widgets.push(widget);
      return clone(widget);
    }
    if (route.startsWith('/challenges/widgets/')) {
      assert.equal(method, 'GET');
      return clone(state.widgets.find(w => w.sitekey === route.split('/').at(-1)));
    }
    if (route === '/pages/projects/study-mastery/deployments') return [clone(state.deployment)];
    if (route === `/pages/projects/study-mastery/deployments/${DEPLOY}`) return clone(state.deployment);
    if (route === `/pages/projects/study-mastery/deployments/${DEPLOY}/retry`) {
      assert.equal(method, 'POST'); return clone(state.deployment);
    }
    throw new Error(`Unexpected fake route: ${method} ${route}`);
  };
  return { ...state, state, addDB, api, log: message => state.logs.push(message) };
}
const writes = f => f.state.calls.filter(c => c.method !== 'GET' && !(c.path.endsWith('/query') && /^(SELECT|PRAGMA)/i.test(c.body.sql)));

test('plano padrão faz somente GET, sem exigir chave administrativa', async t => {
  const f = fixture(t);
  const result = await provision({ ...options, apply: false, adminToken: undefined, freePlanConfirmed: false }, f);
  assert.equal(result.apply, false);
  assert(f.calls.every(c => c.method === 'GET'));
});

test('preview aplica SQL real, preserva produção/configuração e não expõe chaves', async t => {
  const f = fixture(t), previous = clone(f.project);
  await provision(options, f);
  assert.deepEqual(f.project.deployment_configs.production, previous.deployment_configs.production);
  assert.deepEqual(f.project.build_config, previous.build_config);
  const selected = f.project.deployment_configs.preview;
  assert.equal(selected.d1_databases.FEEDBACK_DB.id, DB);
  assert.deepEqual(selected.d1_databases.OTHER_DB, previous.deployment_configs.preview.d1_databases.OTHER_DB);
  assert.deepEqual(selected.env_vars.EXISTING_SECRET, previous.deployment_configs.preview.env_vars.EXISTING_SECRET);
  assert.equal(selected.env_vars.FEEDBACK_ADMIN_TOKEN_SHA256.value, createHash('sha256').update(ADMIN).digest('hex'));
  assert.equal(selected.env_vars.TURNSTILE_SECRET_KEY.type, 'secret_text');
  const columns = f.sql.get(DB).prepare('PRAGMA table_info(feedback_reports)').all();
  assert.deepEqual(columns.map(c => c.name), ['id', 'created_at', 'ip_hash', 'payload_json', 'payload_hash', 'status', 'note']);
  const patch = f.calls.find(c => c.method === 'PATCH');
  assert.deepEqual(Object.keys(patch.body.deployment_configs), ['preview']);
  assert(!('EXISTING_SECRET' in patch.body.deployment_configs.preview.env_vars));
  assert(!JSON.stringify(f.logs).includes(ADMIN)); assert(!JSON.stringify(f.logs).includes(TURNSTILE));
  assert(!f.calls.some(c => c.path.endsWith('/retry')));
});

test('reexecução reutiliza banco/widget sem duplicar recursos ou perder relatos', async t => {
  const f = fixture(t);
  await provision(options, f);
  const sql = f.sql.get(DB);
  sql.prepare('INSERT INTO feedback_reports VALUES (?, ?, ?, ?, ?, ?, ?)').run(RECEIPT, 'today', 'hash', '{}', 'hash', 'new', 'preserve');
  await provision(options, f);
  assert.equal(f.databases.length, 1); assert.equal(f.widgets.length, 1);
  assert.equal(sql.prepare('SELECT note FROM feedback_reports').get().note, 'preserve');
});

for (const [name, changed] of [
  ['plano não confirmado', { freePlanConfirmed: false }],
  ['chave curta', { adminToken: 'short' }],
  ['chave com quebra de linha', { adminToken: ADMIN + '\n' }],
  ['destino desconhecido', { target: 'other' }],
  ['SHA inválido', { commitSha: 'main' }],
  ['conta inválida', { accountId: '../another' }],
]) test(`bloqueia antes de escrever: ${name}`, async t => {
  const f = fixture(t);
  await assert.rejects(provision({ ...options, ...changed }, f));
  assert.equal(writes(f).length, 0);
});

for (const [name, change] of [
  ['repositório', p => { p.source.config.repo_name = 'another'; }],
  ['diretório', p => { p.build_config.root_dir = 'TrocaTicket'; }],
  ['branch', p => { p.production_branch = 'release'; }],
  ['Wrangler', p => { p.deployment_configs.preview.wrangler_config_hash = 'hash'; }],
  ['binding de outro banco', p => { p.deployment_configs.preview.d1_databases.FEEDBACK_DB = { id: PROD_DB }; }],
  ['chave existente sem propriedade', p => { p.deployment_configs.preview.env_vars.TURNSTILE_SECRET_KEY = { type: 'secret_text', value: '' }; }],
]) test(`não substitui configuração inesperada: ${name}`, async t => {
  const f = fixture(t); change(f.project);
  await assert.rejects(provision(options, f)); assert.equal(writes(f).length, 0);
});

test('banco nomeado mas ligado à produção não pode virar preview', async t => {
  const f = fixture(t); f.addDB('study-mastery-feedback-preview');
  f.project.deployment_configs.production.d1_databases.UNRELATED = { id: DB };
  await assert.rejects(provision(options, f), /compartilhado/); assert.equal(writes(f).length, 0);
});

test('schema incompatível não recebe alterações', async t => {
  const f = fixture(t); f.addDB('study-mastery-feedback-preview');
  f.sql.get(DB).exec('CREATE TABLE feedback_reports (id INTEGER PRIMARY KEY)');
  await assert.rejects(provision(options, f), /Schema/); assert.equal(writes(f).length, 0);
});

test('widget incompatível não é alterado', async t => {
  const f = fixture(t); f.widgets.push({ name: 'study-mastery-feedback-preview', sitekey: 'existing', domains: ['other.example'], mode: 'managed' });
  await assert.rejects(provision(options, f), /Widget existente/); assert.equal(writes(f).length, 0);
});

test('interrupção após criar recursos permite recuperar sem sobrescrever segredos', async t => {
  const f = fixture(t), original = f.api;
  await assert.rejects(provision(options, { ...f, api: async (method, path, body) => {
    if (method === 'PATCH') throw new Error('simulated interruption');
    return original(method, path, body);
  } }));
  await provision(options, f);
  assert.equal(f.databases.length, 1); assert.equal(f.widgets.length, 1);
});

test('uma chave administrativa diferente não substitui a existente', async t => {
  const f = fixture(t); await provision(options, f); f.calls.length = 0;
  await assert.rejects(provision({ ...options, adminToken: PROD_ADMIN }, f), /outra origem/);
  assert.equal(writes(f).length, 0);
});

test('mudança concorrente interrompe antes do PATCH', async t => {
  const f = fixture(t), original = f.api;
  await assert.rejects(provision(options, { ...f, api: async (method, path, body) => {
    const result = await original(method, path, body);
    if (method === 'POST' && path.endsWith('/challenges/widgets')) f.project.build_config.root_dir = 'changed';
    return result;
  } }), /mudou/);
  assert(!f.calls.some(c => c.method === 'PATCH'));
});

test('retry explícito redescobre somente preview do SHA em revisão', async t => {
  const f = fixture(t);
  await provision({ ...options, retryPreview: true }, f);
  assert.equal(f.calls.filter(c => c.path.endsWith('/retry')).length, 1);
});

test('nenhum recurso é criado se o preview do commit ainda não existe', async t => {
  const f = fixture(t); f.deployment.deployment_trigger.metadata.commit_hash = 'c'.repeat(40);
  await assert.rejects(provision({ ...options, retryPreview: true }, f), /Aguarde/);
  assert.equal(writes(f).length, 0);
});

test('retry nunca aceita deploy de produção', async t => {
  const f = fixture(t); f.deployment.environment = 'production';
  await assert.rejects(provision({ ...options, retryPreview: true, previewDeploymentId: DEPLOY }, f), /não é um preview/);
  assert.equal(writes(f).length, 0);
});

async function reviewedPreview(f) {
  await provision(options, f);
  f.deployment.env_vars = clone(f.project.deployment_configs.preview.env_vars);
  f.sql.get(DB).prepare('INSERT INTO feedback_reports VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    RECEIPT, new Date().toISOString(), 'hash', JSON.stringify({ id: RECEIPT, appVersion: version, images: [{ name: 'print.jpg', dataUrl: 'test-fixture' }] }), 'hash', 'reviewing', 'checked');
  f.calls.length = 0;
}
const production = { ...options, target: 'production', adminToken: PROD_ADMIN, confirmProduction: 'PUBLICAR_FEEDBACK', reviewed: true, previewDeploymentId: DEPLOY, previewReceipt: RECEIPT };

test('produção exige relato com imagem revisto no banco separado e não publica', async t => {
  const f = fixture(t); await reviewedPreview(f);
  const preview = clone(f.project.deployment_configs.preview);
  await provision(production, f);
  assert.deepEqual(f.project.deployment_configs.preview, preview);
  assert.equal(f.project.deployment_configs.production.d1_databases.FEEDBACK_DB.id, PROD_DB);
  assert(!f.calls.some(c => c.path.endsWith('/retry') || (c.method === 'POST' && c.path.endsWith('/deployments'))));
});

for (const [name, optionChange, mutate] of [
  ['confirmação ausente', { confirmProduction: '' }],
  ['revisão ausente', { reviewed: false }],
  ['mesma chave de preview', { adminToken: ADMIN }],
  ['protocolo inexistente', { previewReceipt: PROD_DB }],
  ['commit diferente', { commitSha: 'c'.repeat(40) }],
  ['deploy incompleto', {}, f => { f.deployment.latest_stage.status = 'active'; }],
  ['binding diferente', {}, f => { f.deployment.env_vars.FEEDBACK_SETUP_DB_ID.value = PROD_DB; }],
  ['relato ainda não revisto', {}, f => f.sql.get(DB).exec("UPDATE feedback_reports SET status = 'new'")],
  ['print ausente', {}, f => f.sql.get(DB).exec("UPDATE feedback_reports SET payload_json = json_set(payload_json, '$.images', json('[]'))")],
  ['relato anterior ao deploy', {}, f => f.sql.get(DB).exec("UPDATE feedback_reports SET created_at = '2020-01-01T00:00:00Z'")],
  ['deploy anterior à configuração', {}, f => { f.deployment.env_vars = {}; }],
]) test(`produção bloqueada: ${name}`, async t => {
  const f = fixture(t); await reviewedPreview(f); mutate?.(f);
  await assert.rejects(provision({ ...production, ...optionChange }, f));
  assert.equal(writes(f).length, 0);
});

test('cliente API limita origem, redirecionamento e erro sem expor segredo', async () => {
  const token = 'cloudflare-secret-' + 'x'.repeat(30);
  let call;
  const api = cloudflareAPI(token, async (url, init) => { call = { url, init }; return new Response(JSON.stringify({ success: false, errors: [{ message: TURNSTILE }] }), { status: 403 }); });
  await assert.rejects(api('GET', `/accounts/${ACCOUNT}/pages/projects/study-mastery`), e => !e.message.includes(TURNSTILE) && /403/.test(e.message));
  assert.equal(call.init.redirect, 'error'); assert(call.init.signal instanceof AbortSignal);
  assert(call.url.startsWith('https://api.cloudflare.com/client/v4/accounts/'));
  await assert.rejects(api('GET', 'https://evil.example'), /inválido/);
  const offline = cloudflareAPI(token, async () => { throw new Error(token); });
  await assert.rejects(offline('GET', `/accounts/${ACCOUNT}/pages/projects/study-mastery`), e => !e.message.includes(token));
});

test('cliente rejeita envelopes de erro mesmo com HTTP 200', async () => {
  const api = cloudflareAPI('token-'.repeat(8), async () => new Response(JSON.stringify({ success: false, errors: ['private'] })));
  await assert.rejects(api('GET', `/accounts/${ACCOUNT}/pages/projects/study-mastery`), /recusou/);
});
