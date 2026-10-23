import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fsx = require('node:fs'); const osx = require('node:os'); const px = require('node:path');
  const d = fsx.mkdtempSync(px.join(osx.tmpdir(), 'sm-test-'));
  process.env.SM_CONTENT_DIR = d;
  return d as string;
});

import { staticCheck, checkMathSyntax } from '../staticCheck';
import { validateAll } from '../pipeline';
import { approve, reject, ReviewError, REVIEW_CHECKLIST } from '../review';
import { publish, PublishError } from '../publish';
import { findDuplicates } from '../dedupe';
import { verifyJs } from '../verify';
import { buildCoverage } from '../coverage';
import { jsSpec, limitSpec, mk, SOURCES, TAX } from './helpers';
import type { Question } from '../../../src/types';

beforeEach(() => fs.rmSync(path.join(tmp, 'published-ledger.json'), { force: true }));

const ALL_CHECKS = Object.fromEntries(REVIEW_CHECKLIST.map((k) => [k, true]));
const errs = (q: Question, o = { requireComplete: true }) => staticCheck(q, TAX, SOURCES, o).filter((i) => i.level === 'error').map((i) => i.code);

describe('DSL → questão', () => {
  it('mapeia corretamente gabarito, motivos e valores de verificação mesmo após permutar', () => {
    for (let i = 0; i < 40; i++) {
      const q = mk(limitSpec({ id: `c2-lhopital-${String(i + 1).padStart(3, '0')}` }));
      const correct = q.options.find((o) => o.id === q.correctOptionId)!;
      expect(correct.text).toBe('$1$');
      expect(q.verification!.optionValues![q.correctOptionId]).toBe('1');
      const wrongId = q.options.find((o) => o.text === '$0$')!.id;
      expect(q.explanation.wrong![wrongId]).toMatch(/cos x\/1/);
      expect(q.verification!.optionValues![wrongId]).toBe('0');
      expect(q.explanation.wrong![q.correctOptionId]).toBeUndefined();
    }
  });
  it('não deixa a correta sempre na mesma posição', () => {
    const pos = new Set(Array.from({ length: 40 }, (_, i) => mk(limitSpec({ id: `c2-lhopital-${i + 1}` })).correctOptionId));
    expect(pos.size).toBeGreaterThan(2);
  });
});

describe('checagens estáticas', () => {
  it('aceita questão completa', () => expect(errs(mk(limitSpec()))).toEqual([]));
  it('exige explicação, motivos dos distratores e passos em cálculo', () => {
    const q = mk(limitSpec());
    q.explanation = { correct: 'curta' };
    expect(errs(q)).toEqual(expect.arrayContaining(['explanation', 'explanation-wrong', 'steps']));
  });
  it('rejeita alternativas duplicadas e "todas as anteriores"', () => {
    expect(errs(mk(limitSpec({ opts: ['$1$', '$1$', '$\\infty$', 'nenhuma das anteriores'] })))).toEqual(expect.arrayContaining(['options-dup', 'options-relational']));
  });
  it('bloqueia fonte desconhecida e fonte não acessada (sem alegar proveniência)', () => {
    expect(errs(mk(limitSpec({ src: [['nao-existe']] })))).toContain('source-unknown');
    expect(errs(mk(limitSpec({ src: [['src-ext-nao-lida'], ['src-aula']] })))).toContain('source-unaccessed');
  });
  it('camada aula exige fonte da faculdade', () => {
    expect(errs(mk(jsSpec({ scope: 'aula' })))).toContain('scope-aula-source');
  });
  it('detecta LaTeX inválido e "$" não fechado', () => {
    expect(checkMathSyntax('valor $\\frac{1}{$')).not.toEqual([]);
    expect(checkMathSyntax('custa $5')).not.toEqual([]);
    expect(checkMathSyntax('ok $x^2$ e `$HOME` em código')).toEqual([]);
    expect(errs(mk(limitSpec({ stem: 'Calcule $\\lim_{x\\to0 \\frac{1}{x}$ com cuidado e atenção.' })))).toContain('math');
  });
  it('exige assunto existente e 4 alternativas', () => {
    expect(errs(mk(limitSpec({ topic: 'inexistente' })))).toContain('topic');
    const q = mk(limitSpec());
    q.options.pop();
    expect(errs(q)).toContain('options-count');
  });
});

describe('validate: verificação de verdade (SymPy + numérico, JS isolado)', () => {
  it('promove draft → verified quando o gabarito é demonstravelmente correto', async () => {
    const q = mk(limitSpec());
    const rep = await validateAll([q], TAX, SOURCES);
    expect(rep.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(q.status).toBe('verified');
    expect(q.verification!.result!.ok).toBe(true);
    expect(q.verification!.result!.method).toContain('sympy');
  }, 60000);

  it('reprova gabarito errado e duas alternativas corretas', async () => {
    const wrongKey = mk(limitSpec({ id: 'c2-lhopital-002', opts: ['$0$', '$1$', '$\\infty$', 'O limite não existe'], verify: { kind: 'limit', params: { expr: 'sin(x)/x', at: '0', dir: '+-' }, values: ['0', '1', 'oo', 'DNE'] } }));
    const twoRight = mk(limitSpec({ id: 'c2-lhopital-003', stem: 'Qual é o valor de $\\lim_{x\\to 0} \\frac{\\sin(2x)}{2x}$ calculado por derivadas?', opts: ['$1$', '$\\frac{2}{2}$', '$0$', '$\\infty$'], verify: { kind: 'limit', params: { expr: 'sin(2*x)/(2*x)', at: '0', dir: '+-' }, values: ['1', '2/2', '0', 'oo'] } }));
    await validateAll([wrongKey, twoRight], TAX, SOURCES);
    expect(wrongKey.status).toBe('draft');
    expect(wrongKey.verification!.result!.ok).toBe(false);
    expect(twoRight.status).toBe('draft');
    expect(twoRight.verification!.result!.details).toMatch(/alternativas que satisfazem/);
  }, 60000);

  it('integral dupla: valor exato, quadratura aninhada e Fubini (ordem original sem primitiva elementar)', async () => {
    const seg = (v: string, lo: string, hi: string) => ({ var: v, lo, hi });
    const good = mk(limitSpec({ id: 'c2-lhopital-010', opts: ['$\\frac{e-1}{3}$', '$e-1$', '$\\frac{e-1}{2}$', '$\\frac13$'], verify: { kind: 'double', params: { expr: 'exp(x**3)', inner: seg('x', 'sqrt(y)', '1'), outer: seg('y', '0', '1'), swap: { inner: seg('y', '0', 'x**2'), outer: seg('x', '0', '1') }, exactFrom: 'swap' }, values: ['(E-1)/3', 'E-1', '(E-1)/2', '1/3'] } }));
    const bad = mk(limitSpec({ id: 'c2-lhopital-011', opts: ['$e-1$', '$\\frac{e-1}{3}$', '$\\frac{e-1}{2}$', '$\\frac13$'], verify: { kind: 'double', params: { expr: 'exp(x**3)', inner: seg('x', 'sqrt(y)', '1'), outer: seg('y', '0', '1'), swap: { inner: seg('y', '0', 'x**2'), outer: seg('x', '0', '1') }, exactFrom: 'swap' }, values: ['E-1', '(E-1)/3', '(E-1)/2', '1/3'] } }));
    await validateAll([good, bad], TAX, SOURCES);
    expect(good.status).toBe('verified');
    expect(good.verification!.result!.details).toMatch(/quadratura ok/);
    expect(bad.status).toBe('draft');
  }, 60000);

  it('kind=node executa Express/JWT/bcrypt reais no sandbox; kind=web mede HTML/CSS no Chromium', async () => {
    const node = mk(jsSpec({ id: 'fs-js-funcoes-010', opts: ['200 3', '201 3', '200 4', '404 3'], verify: { kind: 'node', params: { code: "import express from 'express';\nconst app=express();app.get('/n',(req,res)=>res.json({n:3}));\nconst s=app.listen(0,async()=>{const r=await fetch('http://127.0.0.1:'+s.address().port+'/n');const j=await r.json();console.log(r.status,j.n);s.close();});" }, values: ['200 3', '201 3', '200 4', '404 3'] } }));
    const web = mk(jsSpec({ id: 'fs-js-funcoes-011', opts: ['flex', 'block', 'grid', 'inline'], verify: { kind: 'web', params: { html: '<style>.a{display:flex}</style><div class="a" id="x"></div>', probe: "return getComputedStyle(document.getElementById('x')).display;" }, values: ['flex', 'block', 'grid', 'inline'] } }));
    const wrong = mk(jsSpec({ id: 'fs-js-funcoes-012', opts: ['block', 'flex', 'grid', 'inline'], verify: { kind: 'web', params: { html: '<style>.a{display:flex}</style><div class="a" id="x"></div>', probe: "return getComputedStyle(document.getElementById('x')).display;" }, values: ['block', 'flex', 'grid', 'inline'] } }));
    await validateAll([node, web, wrong], TAX, SOURCES);
    expect(node.verification!.result!.details).toMatch(/200 3/);
    expect(node.status).toBe('verified');
    expect(web.status).toBe('verified');
    expect(wrong.status).toBe('draft');
  }, 90000);

  it('kind=web com servidores locais: CORS real entre duas origens (sem e com Allow-Origin)', async () => {
    const mkCors = (id: string, apiHeaders: Record<string, string>, values: string[]) =>
      mk(jsSpec({ id, opts: ['rejeitou TypeError', 'resolveu 200', 'resolveu 403', 'resolveu 204'], verify: { kind: 'web', params: { page: 'app', servers: [{ name: 'app', routes: { '/': { type: 'text/html', body: '<p>app</p>' } } }, { name: 'api', headers: apiHeaders, routes: { 'GET /d': { body: '{}' } } }], probe: "try { const r = await fetch(__bases.api + '/d'); return 'resolveu ' + r.status; } catch (e) { return 'rejeitou ' + e.name; }" }, values: values as [string, string, string, string] } }));
    const semCors = mkCors('fs-js-funcoes-020', {}, ['rejeitou TypeError', 'resolveu 200', 'resolveu 403', 'resolveu 204']);
    const comCors = mkCors('fs-js-funcoes-021', { 'Access-Control-Allow-Origin': '*' }, ['resolveu 200', 'rejeitou TypeError', 'resolveu 403', 'resolveu 204']);
    await validateAll([semCors, comCors], TAX, SOURCES);
    expect(semCors.status).toBe('verified');
    expect(comCors.status).toBe('verified');
  }, 90000);

  it('rejeita expressões inseguras (sem executar nada)', async () => {
    const q = mk(limitSpec({ id: 'c2-lhopital-004', verify: { kind: 'limit', params: { expr: "__import__('os').system('touch /tmp/pwned_sm')", at: '0' }, values: ['1', '0', 'oo', 'DNE'] } }));
    await validateAll([q], TAX, SOURCES);
    expect(q.status).toBe('draft');
    expect(q.verification!.result!.details).toMatch(/insegura/);
    expect(fs.existsSync('/tmp/pwned_sm')).toBe(false);
  }, 60000);

  it('executa JS isolado e confere a saída real', async () => {
    const q = mk(jsSpec());
    await validateAll([q], TAX, SOURCES);
    expect(q.status).toBe('verified');
    const bad = mk(jsSpec({ id: 'fs-js-funcoes-002', opts: ['1,2,3 1,2,3', '3,1,2 1,2,3', '3,1,2 3,1,2', '1,2,3 3,1,2'], verify: { kind: 'js', params: { code: 'const a=[3,1,2];const b=[...a].sort();console.log(a.join(),b.join());' }, values: ['1,2,3 1,2,3', '3,1,2 1,2,3', '3,1,2 3,1,2', '1,2,3 3,1,2'] } }));
    await validateAll([bad], TAX, SOURCES);
    expect(bad.status).toBe('draft');
  }, 60000);

  it('bloqueia acesso a arquivos, processos e laços infinitos no código candidato', async () => {
    const mkjs = (code: string, format?: string) => ({ ...mk(jsSpec()), verification: { kind: 'js' as const, params: { code, ...(format ? { format } : {}) }, optionValues: { a: 'x', b: 'y', c: 'z', d: 'w' } } });
    const rd = await verifyJs(mkjs("const fs=require('node:fs');console.log(fs.readFileSync('/etc/passwd','utf8').length)", 'cjs'));
    expect(rd.details).toMatch(/restricted|permission|denied|ERR_ACCESS/i);
    const cp = await verifyJs(mkjs("const cp=require('node:child_process');console.log(cp.execSync('id').toString())", 'cjs'));
    expect(cp.details).toMatch(/restricted|permission|denied|ERR_ACCESS/i);
    const loop = await verifyJs(mkjs('while(true){}'));
    expect(loop.details).toMatch(/tempo esgotado/);
  }, 60000);

  it('reproduz a ordem real do event loop (CommonJS)', async () => {
    const code = "console.log('A');setTimeout(()=>console.log('B'),0);Promise.resolve().then(()=>console.log('C'));process.nextTick(()=>console.log('D'));console.log('E');";
    const q = { ...mk(jsSpec()), correctOptionId: 'a', verification: { kind: 'js' as const, params: { code, format: 'cjs' }, optionValues: { a: 'A\\nE\\nD\\nC\\nB', b: 'A\\nE\\nC\\nD\\nB', c: 'A\\nB\\nC\\nD\\nE', d: 'x' } } };
    expect((await verifyJs(q)).ok).toBe(true);
  }, 30000);
});

describe('duplicatas', () => {
  it('pega o mesmo molde com números trocados e expressões iguais', () => {
    const a = mk(limitSpec({ id: 'c2-lhopital-010', stem: 'Calcule $\\lim_{x\\to 0} \\frac{e^{x}-1}{x}$ pela regra de L’Hôpital.', verify: { kind: 'limit', params: { expr: '(exp(x)-1)/x', at: '0' }, values: ['1', '0', 'oo', 'DNE'] } }));
    const b = mk(limitSpec({ id: 'c2-lhopital-011', stem: 'Calcule $\\lim_{x\\to 0} \\frac{e^{x}-1}{x}$ pela regra de L’Hôpital.', verify: { kind: 'limit', params: { expr: '(exp(x)-1)/x', at: '0' }, values: ['1', '0', 'oo', 'DNE'] } }));
    expect(findDuplicates([a, b]).length).toBe(1);
    const c = mk(limitSpec({ id: 'c2-lhopital-012', stem: 'Por que $\\frac{\\ln x}{x}$ tende a zero quando $x$ cresce sem limite?', verify: { kind: 'limit', params: { expr: 'log(x)/x', at: 'oo' }, values: ['0', '1', 'oo', 'DNE'] } }));
    expect(findDuplicates([a, c])).toHaveLength(0);
  });
  it('bloqueia a segunda duplicata na validação', async () => {
    const a = mk(limitSpec());
    const b = mk(limitSpec({ id: 'c2-lhopital-005' }));
    await validateAll([a, b], TAX, SOURCES);
    expect([a.status, b.status]).toEqual(['verified', 'draft']);
  }, 60000);
});

describe('permissões de revisão e publicação', () => {
  const verified = async (): Promise<Question[]> => {
    const a = mk(limitSpec());
    await validateAll([a], TAX, SOURCES);
    return [a];
  };
  const input = { reviewer: 'Maria', reviewerType: 'human' as const, checklist: ALL_CHECKS, now: new Date('2026-10-22T10:00:00Z') };

  it('só aprova "verified", com checklist completo e revisor', async () => {
    const [q] = await verified();
    expect(() => approve([q], [q.id], TAX, SOURCES, { ...input, checklist: { ...ALL_CHECKS, 'gabarito-correto-e-unico': false } }, false)).toThrow(ReviewError);
    expect(() => approve([q], [q.id], TAX, SOURCES, { ...input, reviewer: ' ' }, false)).toThrow(ReviewError);
    const draft = mk(limitSpec({ id: 'c2-lhopital-020' }));
    expect(() => approve([draft], [draft.id], TAX, SOURCES, input, false)).toThrow(/verified/);
    expect(approve([q], [q.id], TAX, SOURCES, input, false)).toHaveLength(1);
    expect(q.status).toBe('approved');
    expect(q.review).toMatchObject({ decision: 'approved', reviewer: 'Maria', reviewerType: 'human' });
  }, 60000);

  it('rejeição exige motivo e é definitiva para o ID', async () => {
    const [q] = await verified();
    expect(() => reject([q], [q.id], ' ', 'Maria', 'human', undefined, false)).toThrow(ReviewError);
    reject([q], [q.id], 'gabarito ambíguo', 'Maria', 'human', undefined, false);
    expect(q.status).toBe('rejected');
  }, 60000);

  it('publica somente aprovadas e nunca rascunhos, verificadas ou rejeitadas', async () => {
    const a = mk(limitSpec());
    const b = mk(limitSpec({ id: 'c2-primitivas-001', topic: 'primitivas', stem: 'Qual é a derivada de $\\sin x$? Responda usando a tabela de derivadas da aula.', opts: ['$\\cos x$', '$-\\cos x$', '$\\sin x$', '$-\\sin x$'], verify: { kind: 'derivative', params: { expr: 'sin(x)', var: 'x' }, values: ['cos(x)', '-cos(x)', 'sin(x)', '-sin(x)'] } }));
    const c = mk(limitSpec({ id: 'c2-lhopital-099', stem: 'Pergunta ainda em rascunho sem verificação, apenas para teste do publicador.' }));
    await validateAll([a, b], TAX, SOURCES);
    approve([a, b, c], [a.id], TAX, SOURCES, input, false);
    const out = path.join(tmp, 'pub');
    const r = await publish([a, b, c], TAX, SOURCES, { outDir: out });
    const pub = JSON.parse(fs.readFileSync(path.join(out, 'calculo2.json'), 'utf8')) as any[];
    expect(pub.map((p) => p.id)).toEqual([a.id]);
    expect(pub[0].verification).toBeUndefined();
    expect(pub[0].review).toBeUndefined();
    expect(pub[0]).toMatchObject({ status: 'approved', reviewedBy: 'human' });
    expect(r.manifest.totals.approved).toBe(1);
    expect(r.manifest.byDiscipline.calculo2).toEqual({ facil: 1, medio: 0, dificil: 0 });
    const ledger = JSON.parse(fs.readFileSync(path.join(tmp, 'published-ledger.json'), 'utf8'));
    expect(ledger[a.id].lastVersion).toBe(1);
  }, 90000);

  it('bloqueia publicação de aprovada sem verificação e marca IDs aposentados', async () => {
    const [q] = await verified();
    approve([q], [q.id], TAX, SOURCES, input, false);
    await publish([q], TAX, SOURCES, { outDir: path.join(tmp, 'pub1'), recheck: false });
    const tampered = structuredClone(q);
    tampered.verification!.result!.ok = false;
    await expect(publish([tampered], TAX, SOURCES, { outDir: path.join(tmp, 'pub2'), recheck: false })).rejects.toBeInstanceOf(PublishError);
    // retira a questão do banco: o ID fica registrado como aposentado e não pode voltar
    await publish([], TAX, SOURCES, { outDir: path.join(tmp, 'pub3'), recheck: false });
    const ledger = JSON.parse(fs.readFileSync(path.join(tmp, 'published-ledger.json'), 'utf8'));
    expect(ledger[q.id].retired).toBeTruthy();
    await expect(publish([q], TAX, SOURCES, { outDir: path.join(tmp, 'pub4'), recheck: false })).rejects.toThrow(/aposentado/);
  }, 90000);

  it('--require-human exclui aprovações assistidas por IA', async () => {
    const [q] = await verified();
    approve([q], [q.id], TAX, SOURCES, { ...input, reviewerType: 'ai-assisted' }, false);
    const r = await publish([q], TAX, SOURCES, { outDir: path.join(tmp, 'pub5'), recheck: false, requireHuman: true, dryRun: true });
    expect(r.manifest.totals.approved).toBe(0);
  }, 60000);

  it('relatório de cobertura conta apenas aprovadas', async () => {
    const [q] = await verified();
    const draft = mk(limitSpec({ id: 'c2-lhopital-050' }));
    approve([q], [q.id], TAX, SOURCES, input, false);
    const cov = buildCoverage([q, draft], TAX, SOURCES);
    expect(cov.totals.approved).toBe(1);
    expect(cov.disciplines[0].byStatus.draft.facil).toBe(1);
    expect(cov.disciplines[0].topics[0].gaps.facil).toBe(1);
  }, 60000);
});

void os;
