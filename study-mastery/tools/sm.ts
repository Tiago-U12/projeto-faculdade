#!/usr/bin/env tsx
/**
 * Study Mastery — CLI de manutenção editorial (separado do app do estudante).
 *   npm run sm -- <comando> [opções]
 * Comandos: import, ingest, generate-drafts, validate, review, publish, coverage-report, dedupe, stats
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Difficulty, DisciplineId, Scope } from '../src/types';
import { buildCoverage, renderCoverageMarkdown } from './lib/coverage';
import { findDuplicates } from './lib/dedupe';
import { toQuestion, contentHash, type DraftSpec } from './lib/dsl';
import { AnthropicProvider, generateDrafts, loadExcerpts, MockProvider, type Provider } from './lib/generator';
import { downloadDriveFolder, importDirectory } from './lib/importer';
import { BATCHES_DIR, CONTENT, EXTRACTED_DIR, REPORTS_DIR, ROOT } from './lib/paths';
import { validateAll } from './lib/pipeline';
import { publish, PublishError } from './lib/publish';
import { approve, reject, reviewQueue, ReviewError, REVIEW_CHECKLIST } from './lib/review';
import { loadQuestions, loadSources, loadTaxonomy, readJson, saveQuestions, writeJson } from './lib/store';

type Flags = Record<string, string | boolean>;
function parseArgs(argv: string[]): { cmd: string; pos: string[]; flags: Flags } {
  const [cmd = 'help', ...rest] = argv;
  const pos: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) { flags[k] = next; i++; } else flags[k] = true;
    } else pos.push(a);
  }
  return { cmd, pos, flags };
}

const HELP = `Study Mastery — manutenção do banco de questões

  import [pasta] [--drive <idPasta>] [--discipline calculo2|fullstack] [--dry-run]
      Inventaria materiais autorizados (PDF/MD/TXT/ZIP/Drive), calcula hash, detecta duplicatas/atualizações,
      extrai texto (content/extracted, não versionado), classifica assuntos e sugere assuntos novos.
  ingest <lote.mjs> [--update]            Importa um lote de rascunhos (DSL) para content/questions (status draft)
  generate-drafts --discipline D --topic T --difficulty facil|medio|dificil [--scope aula|aprofundamento|desafio]
                  [--count N<=20] [--provider mock|anthropic] [--mock-file arquivo.json]
      Gera RASCUNHOS com IA (ANTHROPIC_API_KEY só no ambiente). Nunca aprova nem publica.
  validate [--ids a,b] [--skip-verify] [--recheck-approved]
      Schema, LaTeX, fontes, duplicatas, SymPy+numérico, execução isolada de JS. draft → verified.
  review list | show <id> | approve <ids|--all-verified> --reviewer NOME --type human|ai-assisted --attest-checklist [--notes ..]
         | reject <ids> --reason ".." --reviewer NOME --type human|ai-assisted
  publish [--dry-run] [--skip-recheck] [--require-human]   Publica somente questões aprovadas (src/data/published)
  coverage-report [--write]               Aprovadas por disciplina × dificuldade × assunto, lacunas e qualidade
  dedupe                                  Lista possíveis duplicatas
  stats                                   Contagem por status
`;

const num = (v: string | boolean | undefined, d: number) => (typeof v === 'string' && !Number.isNaN(+v) ? +v : d);
const hr = (s: string) => console.log(`\n== ${s} ==`);

async function main() {
  const { cmd, pos, flags } = parseArgs(process.argv.slice(2));
  const tax = loadTaxonomy();
  const sources = loadSources();
  switch (cmd) {
    case 'help':
    case '--help':
      console.log(HELP);
      return;

    case 'stats': {
      const all = loadQuestions();
      const c: Record<string, number> = {};
      for (const q of all) c[`${q.disciplineId}/${q.status}`] = (c[`${q.disciplineId}/${q.status}`] ?? 0) + 1;
      console.log(JSON.stringify(c, null, 1), `\ntotal: ${all.length}`);
      return;
    }

    case 'ingest': {
      const file = pos[0];
      if (!file) throw new Error('Informe o lote: sm ingest content/batches/xxx.mjs');
      const mod = await import(pathToFileURL(path.resolve(file)).href);
      const specs: DraftSpec[] = mod.default;
      const all = loadQuestions();
      const byId = new Map(all.map((q) => [q.id, q]));
      let added = 0, updated = 0, same = 0;
      for (const s of specs) {
        const q = toQuestion(s);
        const cur = byId.get(q.id);
        if (!cur) { all.push(q); byId.set(q.id, q); added++; continue; }
        if (contentHash(cur) === contentHash(q)) { same++; continue; }
        if (cur.status === 'approved' || cur.status === 'rejected') throw new Error(`${q.id} já está ${cur.status}: não pode ser sobrescrito por ingest. Crie um novo ID.`);
        if (!flags.update) throw new Error(`${q.id} já existe com conteúdo diferente (use --update para atualizar rascunhos).`);
        Object.assign(cur, { ...q, createdAt: cur.createdAt, version: cur.version, status: 'draft' as const });
        updated++;
      }
      saveQuestions(all);
      console.log(`lote ${path.basename(file)}: ${added} novas, ${updated} atualizadas, ${same} idênticas (todas como draft).`);
      return;
    }

    case 'import': {
      const keywords = readJson<Record<string, string[]>>(path.join(CONTENT, 'keywords.json'), {});
      let dir = pos[0] ?? path.join(ROOT, 'materiais');
      if (typeof flags.drive === 'string') {
        const token = process.env.GOOGLE_DRIVE_TOKEN;
        if (!token) throw new Error('Defina GOOGLE_DRIVE_TOKEN (token OAuth com escopo drive.readonly) no ambiente. Nunca grave tokens no repositório.');
        dir = path.join(ROOT, 'materiais', 'drive-cache');
        const files = await downloadDriveFolder(flags.drive, dir, token);
        console.log(`Drive: ${files.length} arquivo(s) baixado(s) para ${path.relative(ROOT, dir)}`);
      }
      if (!fs.existsSync(dir)) throw new Error(`Pasta não encontrada: ${dir}`);
      const rep = importDirectory({ dir, tax, keywords, existingSources: sources, disciplineHint: typeof flags.discipline === 'string' ? flags.discipline : undefined, dryRun: !!flags['dry-run'] });
      const by: Record<string, number> = {};
      for (const e of rep.entries) by[e.status] = (by[e.status] ?? 0) + 1;
      console.log(`Inventário de ${path.relative(ROOT, dir) || dir}:`, by);
      for (const e of rep.entries.filter((x) => x.status !== 'unchanged')) {
        console.log(` - [${e.status}] ${e.path} ${e.topics.length ? '→ ' + e.topics.map((t) => `${t.topicId}(${t.score})`).join(', ') : ''}${e.note ? ' — ' + e.note : ''}`);
        if (e.newTopicCandidates.length) console.log(`     possíveis assuntos novos: ${e.newTopicCandidates.slice(0, 5).join(' | ')}`);
      }
      if (rep.newSources.length && !flags['dry-run']) {
        writeJson(path.join(CONTENT, 'sources.json'), [...sources, ...rep.newSources]);
        console.log(`${rep.newSources.length} fonte(s) nova(s) registrada(s) em content/sources.json`);
      }
      void EXTRACTED_DIR;
      return;
    }

    case 'generate-drafts': {
      const disciplineId = String(flags.discipline) as DisciplineId;
      const topicId = String(flags.topic);
      const difficulty = String(flags.difficulty) as Difficulty;
      const scope = (typeof flags.scope === 'string' ? flags.scope : 'aula') as Scope;
      const topic = tax.disciplines.find((d) => d.id === disciplineId)?.topics.find((t) => t.id === topicId);
      if (!topic) throw new Error('--discipline/--topic inválidos');
      let provider: Provider;
      if (flags.provider === 'anthropic') provider = new AnthropicProvider();
      else if (flags.provider === 'mock') {
        const f = typeof flags['mock-file'] === 'string' ? flags['mock-file'] : path.join(ROOT, 'tools', 'fixtures', 'mock-generation.json');
        provider = new MockProvider(fs.readFileSync(f, 'utf8'));
      } else throw new Error('Informe --provider mock|anthropic');
      const all = loadQuestions();
      const excerpts = loadExcerpts(sources.filter((s) => topic.sourceIds.includes(s.id) && s.sha256).map((s) => path.join(EXTRACTED_DIR, `${s.sha256!.slice(0, 8)}-${path.basename(s.origin).replace(/[^\w.-]+/g, '_')}.txt`)));
      const res = await generateDrafts({ tax, sources, existing: all, disciplineId, topicId, difficulty, scope, count: num(flags.count, 10), provider, excerpts });
      all.push(...res.drafts);
      saveQuestions(all);
      fs.mkdirSync(path.join(BATCHES_DIR, 'generated'), { recursive: true });
      writeJson(path.join(BATCHES_DIR, 'generated', `${new Date().toISOString().replace(/[:.]/g, '-')}-${topicId}-${difficulty}.json`), { provider: provider.name, model: provider.model, promptHash: res.promptHash, ids: res.drafts.map((d) => d.id), rejected: res.rejected });
      console.log(`${res.drafts.length} rascunho(s) criados (status draft), ${res.rejected.length} descartado(s) por formato. Próximo passo: sm validate.`);
      return;
    }

    case 'validate': {
      const all = loadQuestions();
      const only = typeof flags.ids === 'string' ? new Set(flags.ids.split(',')) : undefined;
      const rep = await validateAll(all, tax, sources, { skipVerify: !!flags['skip-verify'], recheckApproved: !!flags['recheck-approved'], only });
      saveQuestions(all);
      hr('Validação');
      for (const t of rep.transitions) console.log(`  ${t.id}: ${t.from} → ${t.to}`);
      const errors = rep.issues.filter((i) => i.level === 'error');
      for (const i of rep.issues.slice(0, 80)) console.log(`  [${i.level}] ${i.id} (${i.code}): ${i.message}`);
      if (rep.issues.length > 80) console.log(`  … e mais ${rep.issues.length - 80}`);
      console.log(`\n${rep.verified} verificada(s) · ${errors.length} erro(s) · ${rep.issues.length - errors.length} aviso(s) · ${rep.duplicates.length} par(es) suspeito(s) de duplicata`);
      if (rep.regressions.length) console.log(`ATENÇÃO: aprovadas que falharam na revalidação: ${rep.regressions.join(', ')}`);
      process.exitCode = errors.some((e) => all.find((q) => q.id === e.id)?.status === 'approved') ? 1 : 0;
      return;
    }

    case 'review': {
      const sub = pos[0];
      const all = loadQuestions();
      if (sub === 'list') {
        const q = reviewQueue(all);
        console.log(`${q.length} questão(ões) verificada(s) aguardando revisão:`);
        for (const x of q) console.log(` - ${x.id} [${x.difficulty}/${x.scope}] ${x.stem.replace(/\s+/g, ' ').slice(0, 90)}`);
        return;
      }
      if (sub === 'show') {
        const q = all.find((x) => x.id === pos[1]);
        if (!q) throw new Error('questão não encontrada');
        console.log(JSON.stringify(q, null, 2));
        return;
      }
      const reviewer = typeof flags.reviewer === 'string' ? flags.reviewer : '';
      const type = flags.type === 'human' ? 'human' : 'ai-assisted';
      if (sub === 'approve') {
        const ids = flags['all-verified'] ? reviewQueue(all).map((q) => q.id) : pos.slice(1);
        if (!ids.length) throw new Error('nenhuma questão para aprovar');
        if (!flags['attest-checklist']) throw new Error(`Aprovação exige --attest-checklist (você atesta: ${REVIEW_CHECKLIST.join(', ')}).`);
        const checklist = Object.fromEntries(REVIEW_CHECKLIST.map((k) => [k, true]));
        const r = approve(all, ids, tax, sources, { reviewer, reviewerType: type, notes: typeof flags.notes === 'string' ? flags.notes : undefined, checklist });
        saveQuestions(all);
        console.log(`${r.length} questão(ões) aprovada(s) por ${reviewer} (${type}).`);
        return;
      }
      if (sub === 'reject') {
        const r = reject(all, pos.slice(1), String(flags.reason ?? ''), reviewer || 'desconhecido', type);
        saveQuestions(all);
        console.log(`${r.length} questão(ões) rejeitada(s).`);
        return;
      }
      throw new Error('review: use list | show | approve | reject');
    }

    case 'publish': {
      const all = loadQuestions();
      try {
        const r = await publish(all, tax, sources, { recheck: !flags['skip-recheck'], requireHuman: !!flags['require-human'], dryRun: !!flags['dry-run'] });
        console.log(`${flags['dry-run'] ? '[dry-run] ' : ''}Banco ${r.manifest.bankVersion}: ${r.manifest.totals.approved} questões aprovadas publicadas`, JSON.stringify(r.manifest.byDiscipline));
      } catch (e) {
        if (e instanceof PublishError) { console.error(e.message); process.exitCode = 1; return; }
        throw e;
      }
      return;
    }

    case 'coverage-report': {
      const all = loadQuestions();
      const cov = buildCoverage(all, tax, sources);
      const md = renderCoverageMarkdown(cov);
      if (flags.write) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
        writeJson(path.join(REPORTS_DIR, 'coverage.json'), cov);
        fs.writeFileSync(path.join(REPORTS_DIR, 'coverage.md'), md);
      }
      console.log(md);
      return;
    }

    case 'dedupe': {
      const all = loadQuestions().filter((q) => q.status !== 'rejected');
      const d = findDuplicates(all);
      for (const p of d) console.log(`${p.a} ~ ${p.b}  (${p.kind}, ${p.score.toFixed(2)})`);
      console.log(`${d.length} par(es) suspeito(s) em ${all.length} questões.`);
      return;
    }

    default:
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e instanceof ReviewError ? `Revisão recusada: ${e.message}` : `Erro: ${e.message}`);
  process.exitCode = 1;
});
