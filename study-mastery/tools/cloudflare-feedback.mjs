// Configuração restrita à caixa de feedbacks. Node 22+, sem dependências ou arquivos de chaves.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const APP = new URL('../', import.meta.url);
const PROJECT = 'study-mastery';
const HOST = `${PROJECT}.pages.dev`;
const MARKER = 'FEEDBACK_SETUP_OWNER';
const ENV_KEYS = ['FEEDBACK_ADMIN_TOKEN_SHA256', 'TURNSTILE_SECRET_KEY', 'TURNSTILE_SITE_KEY', 'FEEDBACK_SETUP_DB_ID', MARKER];
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const sqlFile = readFileSync(new URL('migrations-feedback/0001_feedback.sql', APP), 'utf8');
const statements = sqlFile.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean);
const normalizeSQL = sql => sql.replace(/\bIF NOT EXISTS\s*/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();
const schema = new Map(statements.map(sql => [sql.match(/CREATE (?:TABLE|INDEX) IF NOT EXISTS (\w+)/i)[1], normalizeSQL(sql)]));

/** Fixed origin, no redirects, bounded requests, and no remote body in exceptions/logs. */
export function cloudflareAPI(token, fetcher = fetch) {
  // Copiar de uma tela pode acrescentar espaço/quebra de linha nas bordas.
  // Espaços internos ou um comando curl completo continuam inválidos.
  const credential = typeof token === 'string' ? token.trim() : token;
  requireThat(typeof credential === 'string' && /^[\x21-\x7e]{20,256}$/.test(credential), 'O segredo CLOUDFLARE_API_TOKEN está ausente ou em formato inválido. Salve somente o código do token.');
  return async (method, path, body) => {
    requireThat(/^\/accounts\/[a-f0-9]{32}\//i.test(path) && !path.includes('..'), 'Caminho de API inválido.');
    let response;
    try {
      response = await fetcher(`https://api.cloudflare.com/client/v4${path}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch { throw new Error('Não foi possível concluir a chamada Cloudflare. Confira rede e credencial; não houve retry automático.'); }
    if (!response.ok) {
      let fields = [];
      try {
        const body = await response.json();
        const messages = (Array.isArray(body.errors) ? body.errors : []).map(e => String(e.message ?? '')).join(' ');
        fields = ['per_page', 'page', 'env'].filter(field => new RegExp(`\\b${field}\\b`).test(messages));
      } catch { /* O corpo remoto nunca é incluído no erro. */ }
      const operation = path.split('?')[0].replace(/^\/accounts\/[a-f0-9]{32}/i, '');
      throw new Error(`Cloudflare ${method} ${operation}: HTTP ${response.status}${fields.length ? `; campo(s): ${fields.join(', ')}` : ''}. Detalhes privados não são registrados.`);
    }
    let envelope;
    try { envelope = await response.json(); } catch { throw new Error('Cloudflare retornou uma resposta não JSON.'); }
    requireThat(envelope.success === true, 'Cloudflare recusou a operação. Confira o painel; detalhes privados não são registrados.');
    return envelope.result;
  };
}

async function list(api, path, perPage = 100) {
  const items = [];
  for (let page = 1; page <= 20; page++) {
    const part = await api('GET', `${path}${path.includes('?') ? '&' : '?'}per_page=${perPage}&page=${page}`);
    requireThat(Array.isArray(part), 'Resposta de listagem inesperada.');
    items.push(...part);
    if (part.length < perPage) return items;
  }
  throw new Error('Listagem excede o limite de segurança; revise os recursos existentes no painel.');
}

function checkProject(project) {
  requireThat(project.name === PROJECT && project.subdomain === HOST, 'Projeto/domínio Pages não corresponde ao Study Mastery.');
  const source = project.source;
  requireThat(source?.type === 'github' && source.config?.owner === 'Tiago-U12' && source.config?.repo_name === 'projeto-faculdade', 'Integração GitHub diferente da esperada.');
  requireThat(project.production_branch === 'main', 'Branch de produção mudou; revise antes de configurar.');
  const build = project.build_config;
  requireThat(build?.root_dir === 'study-mastery' && build.destination_dir === 'dist' && build.build_command === 'npm run build', 'Configuração de build diferente da esperada; nenhuma substituição será feita.');
  for (const target of ['preview', 'production']) {
    requireThat(project.deployment_configs?.[target] && !project.deployment_configs[target].wrangler_config_hash, 'Configuração ausente ou controlada por Wrangler; revisar manualmente antes de usar esta automação.');
  }
}

const config = (p, target) => p.deployment_configs[target];
const binding = (p, target) => config(p, target).d1_databases?.FEEDBACK_DB?.id;
const marker = token => `study-mastery-feedback-v1:${sha(`setup-key:${token}`)}`;

function checkOwnership(project, target, token) {
  const env = config(project, target).env_vars ?? {};
  const occupied = binding(project, target) || ENV_KEYS.some(key => key in env);
  if (occupied) requireThat(env[MARKER]?.value === marker(token), 'Feedback já configurado por outra origem/chave. Pare para revisar; chaves existentes não serão substituídas.');
}

function withoutFeedback(project, target) {
  const copy = structuredClone(project);
  delete copy.modified_on;
  const selected = config(copy, target);
  for (const key of ENV_KEYS) delete selected.env_vars?.[key];
  delete selected.d1_databases?.FEEDBACK_DB;
  // A API pode omitir mapas vazios antes do primeiro binding.
  selected.env_vars ??= {};
  selected.d1_databases ??= {};
  return copy;
}
const stable = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object'
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

async function query(api, prefix, db, sql, params = []) {
  const result = await api('POST', `${prefix}/d1/database/${db}/query`, { sql, params });
  requireThat(Array.isArray(result) && result.every(r => r.success === true && Array.isArray(r.results)), 'Consulta D1 não concluída; nenhuma resposta privada será exibida.');
  return result.flatMap(r => r.results);
}

async function checkSchema(api, prefix, db, complete = false) {
  const rows = await query(api, prefix, db, "SELECT name, sql FROM sqlite_master WHERE name IN ('feedback_reports','feedback_created','feedback_rate')");
  requireThat(rows.every(r => schema.get(r.name) === normalizeSQL(r.sql ?? '')), 'Schema existente incompatível; migração destrutiva não será executada.');
  if (complete) requireThat(rows.length === schema.size, 'Schema D1 incompleto.');
}

function checkDeployment(deployment, expectedSha, project) {
  requireThat(deployment.project_name === PROJECT && deployment.environment === 'preview', 'O deploy informado não é um preview deste projeto.');
  requireThat(deployment.deployment_trigger?.metadata?.branch && deployment.deployment_trigger.metadata.branch !== project.production_branch, 'O deploy aponta para a branch de produção.');
  requireThat(deployment.deployment_trigger.metadata.commit_hash === expectedSha, 'O preview não corresponde ao commit em revisão.');
  const url = new URL(deployment.url);
  requireThat(url.protocol === 'https:' && url.hostname.endsWith(`.${HOST}`) && !url.username && !url.password && !url.port, 'URL de preview inesperada.');
}

export async function checkProductionProof(options, api, prefix, project) {
  requireThat(options.confirmProduction === 'PUBLICAR_FEEDBACK' && options.reviewed === true, 'Produção exige PUBLICAR_FEEDBACK e confirmação da revisão do relato/print no preview.');
  requireThat(uuid.test(options.previewDeploymentId ?? '') && uuid.test(options.previewReceipt ?? ''), 'Informe o ID do deploy de preview e o protocolo de teste.');
  const deployment = await api('GET', `${prefix}/pages/projects/${PROJECT}/deployments/${options.previewDeploymentId}`);
  checkDeployment(deployment, options.commitSha, project);
  requireThat(deployment.latest_stage?.status === 'success', 'O deploy de preview ainda não terminou com sucesso.');
  const previewDB = binding(project, 'preview');
  // A API pública de deployments expõe env_vars, mas não o mapa de bindings D1.
  const deployedEnv = deployment.env_vars ?? {};
  requireThat(uuid.test(previewDB ?? '') && deployedEnv.FEEDBACK_SETUP_DB_ID?.value === previewDB && previewDB !== binding(project, 'production'), 'Banco do preview não é separado/compatível com o deploy testado.');
  requireThat(deployedEnv[MARKER]?.value && deployedEnv[MARKER].value === config(project, 'preview').env_vars?.[MARKER]?.value, 'Preview anterior à configuração atual; refaça o deploy e o teste.');
  const rows = await query(api, prefix, previewDB, 'SELECT payload_json, status, created_at FROM feedback_reports WHERE id = ?', [options.previewReceipt]);
  let payload;
  try { payload = JSON.parse(rows[0]?.payload_json); } catch { throw new Error('Protocolo de teste não encontrado no banco de preview.'); }
  const version = JSON.parse(readFileSync(new URL('package.json', APP), 'utf8')).version;
  const created = Date.parse(rows[0].created_at), deployed = Date.parse(deployment.created_on);
  requireThat(Number.isFinite(created) && Number.isFinite(deployed) && created >= deployed && created <= Date.now(), 'O relato deve ter sido enviado após a criação do deploy de preview informado.');
  requireThat(payload.id === options.previewReceipt, 'O identificador no relato não corresponde ao protocolo informado.');
  requireThat(payload.appVersion === version, 'O relato foi enviado por outra versão do aplicativo; repita o teste no preview indicado.');
  requireThat(Array.isArray(payload.images) && payload.images.length > 0, 'O relato de teste não tem print anexado; envie um novo relato com print.');
  requireThat(rows[0].status === 'reviewing', 'O relato de teste ainda não está Em análise. Confira texto/print na administração e marque Em análise.');
}

/** Plan by default. Mutates only the selected environment, never merges or deploys production. */
export async function provision(options, { api, log = () => {} }) {
  requireThat(/^[a-f0-9]{32}$/i.test(options.accountId ?? ''), 'CLOUDFLARE_ACCOUNT_ID inválido.');
  requireThat(['preview', 'production'].includes(options.target), 'Destino deve ser preview ou production.');
  requireThat(/^[a-f0-9]{40}$/i.test(options.commitSha ?? ''), 'Informe o SHA completo do commit em revisão.');
  const prefix = `/accounts/${options.accountId}`;
  const projectPath = `${prefix}/pages/projects/${PROJECT}`;
  const project = await api('GET', projectPath);
  checkProject(project);
  const other = options.target === 'preview' ? 'production' : 'preview';
  const dbName = `${PROJECT}-feedback-${options.target}`;
  const widgetName = `${PROJECT}-feedback-${options.target}`;
  const databases = (await list(api, `${prefix}/d1/database`)).filter(db => db.name === dbName);
  const widgets = (await list(api, `${prefix}/challenges/widgets`)).filter(widget => widget.name === widgetName);
  requireThat(databases.length <= 1 && widgets.length <= 1, 'Nomes de recursos ambíguos; revise no painel.');
  let db = databases[0];
  requireThat(!db || uuid.test(db.uuid ?? ''), 'Identificador D1 inválido.');
  requireThat(!binding(project, options.target) || binding(project, options.target) === db?.uuid, 'Binding existente aponta para outro banco; não será substituído.');
  requireThat(!db || !Object.values(config(project, other).d1_databases ?? {}).some(b => b.id === db.uuid), 'Banco compartilhado entre preview e produção; operação bloqueada.');
  const plan = { project: PROJECT, target: options.target, database: dbName, widget: widgetName, apply: options.apply === true };
  log(`Destino: ${PROJECT}/${options.target}. Banco: ${dbName}. Widget: ${widgetName}.`);
  if (options.apply !== true) { log('Somente leitura; nenhum recurso configurado.'); return plan; }
  requireThat(options.freePlanConfirmed === true, 'Confirme Workers Free e Turnstile Free no painel antes de aplicar.');
  requireThat(typeof options.adminToken === 'string' && /^[\x21-\x7e]{32,256}$/.test(options.adminToken), 'Configure uma chave administrativa aleatória de 32–256 caracteres como segredo.');
  checkOwnership(project, options.target, options.adminToken);
  const otherEnv = config(project, other).env_vars ?? {};
  requireThat(otherEnv[MARKER]?.value !== marker(options.adminToken), 'Use chaves administrativas diferentes no preview e na produção.');
  if (options.target === 'production') await checkProductionProof(options, api, prefix, project);
  let retryDeployment;
  if (options.retryPreview) {
    requireThat(options.target === 'preview', 'Retry permitido somente para preview.');
    if (options.previewDeploymentId) {
      requireThat(uuid.test(options.previewDeploymentId), 'Identificador de deploy inválido.');
      retryDeployment = await api('GET', `${projectPath}/deployments/${options.previewDeploymentId}`);
    } else {
      retryDeployment = (await list(api, `${projectPath}/deployments`, 25)).find(d => d.environment === 'preview' && d.deployment_trigger?.metadata?.commit_hash === options.commitSha && d.latest_stage?.status === 'success');
      requireThat(retryDeployment, 'Aguarde o preview deste commit terminar no Cloudflare e execute novamente. Nenhuma configuração foi alterada.');
    }
    requireThat(uuid.test(retryDeployment.id ?? ''), 'Deploy não retornou identificador válido.');
    checkDeployment(retryDeployment, options.commitSha, project);
  }
  let widget;
  if (widgets[0]) {
    requireThat(/^[\w-]+$/.test(widgets[0].sitekey), 'Site key inválida.');
    widget = await api('GET', `${prefix}/challenges/widgets/${widgets[0].sitekey}`);
    requireThat(widget.name === widgetName && widget.mode === 'managed' && stable(widget.domains) === stable([HOST]), 'Widget existente incompatível; não será alterado.');
  }
  if (db) await checkSchema(api, prefix, db.uuid);
  // Releitura antes de criar recursos: detecta alterações concorrentes no projeto.
  requireThat(stable(await api('GET', projectPath)) === stable(project), 'Configuração mudou durante a preparação; execute novamente.');
  if (!db) db = await api('POST', `${prefix}/d1/database`, { name: dbName });
  requireThat(uuid.test(db?.uuid ?? ''), 'Criação D1 não retornou um identificador válido.');
  for (const sql of statements) await query(api, prefix, db.uuid, sql);
  await checkSchema(api, prefix, db.uuid, true);
  if (!widget) widget = await api('POST', `${prefix}/challenges/widgets`, { name: widgetName, domains: [HOST], mode: 'managed' });
  requireThat(widget?.secret && widget?.sitekey, 'Widget não retornou as chaves; revise as permissões Turnstile.');
  const latest = await api('GET', projectPath);
  requireThat(stable(latest) === stable(project), 'Configuração mudou; recursos preservados, binding não aplicado.');
  const env = {
    FEEDBACK_ADMIN_TOKEN_SHA256: { type: 'secret_text', value: sha(options.adminToken) },
    TURNSTILE_SECRET_KEY: { type: 'secret_text', value: widget.secret },
    TURNSTILE_SITE_KEY: { type: 'plain_text', value: widget.sitekey },
    FEEDBACK_SETUP_DB_ID: { type: 'plain_text', value: db.uuid },
    [MARKER]: { type: 'plain_text', value: marker(options.adminToken) },
  };
  // PATCH parcial de env_vars, conforme Wrangler pages secret put. Nunca reenviar secrets mascaradas.
  await api('PATCH', projectPath, { deployment_configs: { [options.target]: {
    env_vars: env, d1_databases: { ...(config(latest, options.target).d1_databases ?? {}), FEEDBACK_DB: { id: db.uuid } },
  } } });
  const updated = await api('GET', projectPath);
  requireThat(stable(withoutFeedback(updated, options.target)) === stable(withoutFeedback(latest, options.target)), 'A resposta indica mudança fora do escopo; pare e confira o painel. Não há rollback automático de segredos.');
  requireThat(binding(updated, options.target) === db.uuid && Object.keys(env).every(key => config(updated, options.target).env_vars?.[key]?.type === env[key].type), 'Binding/variáveis não confirmados pela API.');
  requireThat(config(updated, options.target).env_vars[MARKER].value === marker(options.adminToken) && config(updated, options.target).env_vars.TURNSTILE_SITE_KEY.value === widget.sitekey, 'Variáveis públicas de configuração não confirmadas.');
  log('Banco/schema, widget e configuração confirmados pela API. A validação de um envio real continua necessária.');
  if (retryDeployment) {
    // Revalidar antes da única operação de deploy permitida por este script.
    const current = await api('GET', projectPath);
    checkProject(current);
    checkDeployment(retryDeployment, options.commitSha, current);
    const retry = await api('POST', `${projectPath}/deployments/${retryDeployment.id}/retry`);
    checkDeployment(retry, options.commitSha, current);
    log(`Novo preview solicitado: ${retry.url}. Aguarde o build e valide o formulário.`);
  }
  return { ...plan, configured: true };
}

async function main() {
  const allowed = new Set(['--apply', '--retry-preview']);
  requireThat(process.argv.slice(2).every(arg => allowed.has(arg)), 'Use somente --apply e, opcionalmente, --retry-preview. Configuração por variáveis de ambiente.');
  for (const name of ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc']) {
    requireThat(!existsSync(new URL(name, APP)), 'Wrangler local encontrado; revisar antes de usar configuração pelo painel/API.');
  }
  const env = process.env;
  await provision({
    accountId: env.CLOUDFLARE_ACCOUNT_ID, target: env.FEEDBACK_TARGET ?? 'preview',
    commitSha: env.FEEDBACK_COMMIT_SHA ?? env.GITHUB_SHA, adminToken: env.FEEDBACK_ADMIN_TOKEN,
    apply: process.argv.includes('--apply'), retryPreview: process.argv.includes('--retry-preview'),
    freePlanConfirmed: env.FEEDBACK_FREE_CONFIRMED === 'true', reviewed: env.FEEDBACK_PREVIEW_REVIEWED === 'true',
    confirmProduction: env.FEEDBACK_PRODUCTION_CONFIRM, previewDeploymentId: env.FEEDBACK_PREVIEW_DEPLOYMENT_ID,
    previewReceipt: env.FEEDBACK_PREVIEW_RECEIPT,
  }, { api: cloudflareAPI(env.CLOUDFLARE_API_TOKEN), log: console.log });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
