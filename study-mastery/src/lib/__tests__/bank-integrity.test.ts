// Integridade do banco REAL publicado (src/data/published) e filtros estritos sobre ele.
// Complementa o pipeline: falha se o JSON servido ao estudante divergir do que foi aprovado em content/questions.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BankManifest, Difficulty, DisciplineId, PublishedQuestion, PublishedSource, Question, Scope, SessionConfig } from '../../types';
import { DIFFICULTIES, SCOPES } from '../../types';
import calculo2 from '../../data/published/calculo2.json';
import fullstack from '../../data/published/fullstack.json';
import manifestJson from '../../data/published/manifest.json';
import sourcesJson from '../../data/published/sources.json';
import { taxonomy } from '../bank';
import { buildSession, eligible, scopeAllows } from '../engine';
import { mulberry32 } from '../rng';
import { nextStat } from '../srs';
import { toPublished } from '../../../tools/lib/publish';
import { purposeOf, qualitySummary } from '../quality';

const bank = [...calculo2, ...fullstack] as unknown as PublishedQuestion[];
const manifest = manifestJson as BankManifest;
const sources = new Map((sourcesJson as PublishedSource[]).map((s) => [s.id, s]));
const QUESTIONS_DIR = path.resolve(import.meta.dirname, '../../../content/questions');

function approvedSource(): Question[] {
  const out: Question[] = [];
  for (const d of fs.readdirSync(QUESTIONS_DIR)) {
    for (const f of fs.readdirSync(path.join(QUESTIONS_DIR, d)).filter((x) => x.endsWith('.json'))) {
      out.push(...(JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, d, f), 'utf8')) as Question[]).filter((q) => q.status === 'approved'));
    }
  }
  return out;
}

describe('banco publicado: contagens e distribuição', () => {
  it('600 questões, 100 por dificuldade em cada disciplina', () => {
    expect(bank).toHaveLength(600);
    for (const d of ['calculo2', 'fullstack'] as DisciplineId[]) {
      for (const k of DIFFICULTIES) expect(bank.filter((q) => q.disciplineId === d && q.difficulty === k)).toHaveLength(100);
    }
  });

  it('o manifest bate com o conteúdo dos arquivos', () => {
    expect(manifest.totals.approved).toBe(bank.length);
    for (const [d, c] of Object.entries(manifest.byDiscipline)) {
      for (const k of DIFFICULTIES) expect(bank.filter((q) => q.disciplineId === d && q.difficulty === k).length).toBe(c[k]);
    }
  });

  it('cada assunto cumpre exatamente a cota da taxonomia', () => {
    for (const d of taxonomy.disciplines) {
      for (const t of d.topics) {
        for (const k of DIFFICULTIES) expect(bank.filter((q) => q.disciplineId === d.id && q.topicId === t.id && q.difficulty === k).length, `${t.id}/${k}`).toBe(t.quota[k]);
      }
    }
  });
});

describe('banco publicado: consistência de cada questão', () => {
  const topicIds = new Map(taxonomy.disciplines.map((d) => [d.id, new Set(d.topics.map((t) => t.id))]));

  it('IDs únicos e prefixo coerente com a disciplina', () => {
    expect(new Set(bank.map((q) => q.id)).size).toBe(bank.length);
    for (const q of bank) expect(q.id.startsWith(q.disciplineId === 'calculo2' ? 'c2-' : 'fs-'), q.id).toBe(true);
  });

  it.each(bank.map((q) => [q.id, q] as const))('%s', (_id, q) => {
    expect(q.status).toBe('approved');
    expect(topicIds.get(q.disciplineId)?.has(q.topicId)).toBe(true);
    expect(DIFFICULTIES).toContain(q.difficulty);
    expect(SCOPES).toContain(q.scope);
    expect(q.stem.trim().length).toBeGreaterThan(15);
    // 4 alternativas com IDs e textos distintos; o gabarito é uma delas
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
    expect(new Set(q.options.map((o) => o.text.trim())).size).toBe(4);
    expect(q.options.map((o) => o.id)).toContain(q.correctOptionId);
    // explicação da correta e de CADA alternativa errada
    expect(q.explanation.correct.trim().length).toBeGreaterThan(30);
    for (const o of q.options) if (o.id !== q.correctOptionId) expect(q.explanation.wrong?.[o.id]?.trim().length ?? 0, `${q.id}: explicação da ${o.id}`).toBeGreaterThan(10);
    expect(Object.keys(q.explanation.wrong ?? {})).not.toContain(q.correctOptionId);
    // fonte citada existe na lista publicada; aula exige material da faculdade
    expect(q.sourceRefs.length).toBeGreaterThan(0);
    for (const r of q.sourceRefs) expect(sources.has(r.sourceId), r.sourceId).toBe(true);
    if (q.scope === 'aula') expect(q.sourceRefs.some((r) => ['aula-pdf', 'aula-readme', 'lista', 'programa'].includes(sources.get(r.sourceId)!.kind))).toBe(true);
    // revisão: nada é declarado como humano sem ter sido
    expect(q.reviewedBy).toBe('ai-assisted');
    expect(q.verifiedBy).not.toBe('desconhecido');
    // LaTeX com delimitadores pareados em todos os textos exibidos
    const texts = [q.stem, ...q.options.map((o) => o.text), q.explanation.correct, ...(q.explanation.steps ?? []), ...Object.values(q.explanation.wrong ?? {}), ...(q.explanation.commonMistakes ?? [])];
    for (const t of texts) {
      const semCodigo = t.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '').replace(/\\\$/g, '');
      expect((semCodigo.match(/\$/g) ?? []).length % 2, `${q.id}: $ ímpar em «${t.slice(0, 60)}»`).toBe(0);
      expect((t.match(/```/g) ?? []).length % 2, `${q.id}: bloco de código aberto`).toBe(0);
    }
  });

  it('o JSON publicado é exatamente o que foi aprovado em content/questions', () => {
    const src = approvedSource();
    expect(src).toHaveLength(bank.length);
    const pub = new Map(bank.map((q) => [q.id, q]));
    for (const q of src) expect(pub.get(q.id), q.id).toEqual(toPublished(q));
  });
});

describe('“Como verificamos as questões”: contagens derivadas do banco', () => {
  it('todo método de verificação publicado cai em uma finalidade conhecida e as contagens fecham', () => {
    expect(bank.filter((q) => purposeOf(q.verifiedBy) === 'outro').map((q) => `${q.id}: ${q.verifiedBy}`)).toEqual([]);
    const s = qualitySummary(bank);
    expect(s.automatic + s.sourceOnly).toBe(bank.length);
    expect(s.groups.reduce((n, g) => n + g.count, 0)).toBe(bank.length);
    expect(s.aiReviewed + s.humanReviewed).toBe(bank.length);
  });
});

describe('filtros estritos sobre o banco real', () => {
  const cfgs: Omit<SessionConfig, 'mode' | 'size'>[] = [];
  const rng = mulberry32(2026);
  for (const d of taxonomy.disciplines) {
    // cada assunto isolado, em cada dificuldade e profundidade
    for (const t of d.topics) for (const k of DIFFICULTIES) for (const s of SCOPES) cfgs.push({ disciplineId: d.id, topicIds: [t.id], difficulties: [k], scope: s });
    // combinações aleatórias de assuntos/dificuldades
    for (let i = 0; i < 60; i++) {
      const topics = d.topics.filter(() => rng() < 0.35).map((t) => t.id);
      const diffs = DIFFICULTIES.filter(() => rng() < 0.6);
      cfgs.push({ disciplineId: d.id, topicIds: topics.length ? topics : [d.topics[0].id], difficulties: diffs.length ? diffs : ['medio'], scope: SCOPES[Math.floor(rng() * 3)] });
    }
  }

  it('eligible devolve TODAS e SOMENTE as questões que atendem a cada filtro', () => {
    for (const c of cfgs) {
      const got = eligible(bank, c);
      const want = bank.filter((q) => q.disciplineId === c.disciplineId && c.topicIds.includes(q.topicId) && c.difficulties.includes(q.difficulty) && scopeAllows(c.scope, q.scope));
      expect(got.map((q) => q.id).sort()).toEqual(want.map((q) => q.id).sort());
    }
  });

  it('nenhuma sessão (4 modos × 5/10/20) traz questão fora do filtro nem repetida', () => {
    let seed = 1;
    const byId = new Map(bank.map((q) => [q.id, q]));
    // histórico simulado para exercitar o modo Revisão (erros, vencidas e não vistas)
    const stats: Record<string, ReturnType<typeof nextStat>> = {};
    const past = new Date('2026-10-01T12:00:00Z');
    bank.forEach((q, i) => {
      if (i % 3 === 0) stats[q.id] = nextStat(undefined, i % 2 === 0, past);
    });
    // violações acumuladas e conferidas no fim: as mesmas checagens, sem ~280 mil chamadas de expect
    const erros: string[] = [];
    let sessoes = 0;
    for (const c of cfgs) {
      const pool = eligible(bank, c);
      for (const mode of ['aprender', 'simulado', 'revisao', 'misto'] as const) {
        for (const size of [5, 10, 20]) {
          const s = buildSession(pool, { ...c, mode, size }, { stats, now: new Date('2026-10-23T12:00:00Z') }, seed++);
          sessoes++;
          const tag = `${mode}/${size}/${c.disciplineId}:${c.topicIds.join('+')}:${c.difficulties.join('+')}:${c.scope}`;
          const ids = s.items.map((it) => it.questionId);
          if (ids.length !== Math.min(size, pool.length)) erros.push(`${tag}: ${ids.length} itens (esperado ${Math.min(size, pool.length)})`);
          if (new Set(ids).size !== ids.length) erros.push(`${tag}: questão repetida`);
          for (const it of s.items) {
            const q = byId.get(it.questionId);
            if (!q) {
              erros.push(`${tag}: ${it.questionId} não existe`);
              continue;
            }
            if (q.disciplineId !== c.disciplineId || !c.topicIds.includes(q.topicId) || !c.difficulties.includes(q.difficulty as Difficulty) || !scopeAllows(c.scope as Scope, q.scope)) erros.push(`${tag}: ${q.id} fora do filtro`);
            // embaralhamento preserva o gabarito: a ordem é uma permutação das alternativas
            if ([...it.order].sort().join() !== q.options.map((o) => o.id).sort().join()) erros.push(`${tag}: ${q.id} ordem inválida`);
          }
        }
      }
    }
    expect(sessoes).toBe(cfgs.length * 12);
    expect(erros).toEqual([]);
  }, 30000);
});
