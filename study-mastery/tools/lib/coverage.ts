import type { Difficulty, Question, SourceRecord, Status, Taxonomy } from '../../src/types';
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../../src/types';
import { tokens } from './dedupe';

type Counts = Record<Difficulty, number>;
const zero = (): Counts => ({ facil: 0, medio: 0, dificil: 0 });
const STATUSES: Status[] = ['approved', 'verified', 'draft', 'rejected'];

export interface Coverage {
  generatedAt: string;
  disciplines: {
    id: string;
    name: string;
    approved: Counts;
    quota: Counts;
    byStatus: Record<Status, Counts>;
    topics: { id: string; name: string; examFocus: boolean; approved: Counts; quota: Counts; totalApproved: number; totalQuota: number; gaps: Counts; sessionOf20: boolean; byScope: Record<string, number> }[];
  }[];
  totals: { approved: number; goal: number; remaining: number };
  verificationMethods: Record<string, number>;
  reviewerTypes: Record<string, number>;
  sourcesUsed: { id: string; title: string; approvedQuestions: number }[];
  quality: { longestCorrectPct: number; topStemTemplates: { topicId: string; template: string; pct: number }[] };
}

export function buildCoverage(all: Question[], tax: Taxonomy, sources: SourceRecord[], now = new Date()): Coverage {
  const approved = all.filter((q) => q.status === 'approved');
  const disciplines = tax.disciplines.map((d) => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, zero()])) as Record<Status, Counts>;
    for (const q of all.filter((x) => x.disciplineId === d.id)) byStatus[q.status][q.difficulty]++;
    const topics = d.topics.map((t) => {
      const qs = approved.filter((q) => q.disciplineId === d.id && q.topicId === t.id);
      const a = zero();
      const byScope: Record<string, number> = { aula: 0, aprofundamento: 0, desafio: 0 };
      for (const q of qs) {
        a[q.difficulty]++;
        byScope[q.scope]++;
      }
      const gaps = zero();
      for (const k of DIFFICULTIES) gaps[k] = Math.max(0, t.quota[k] - a[k]);
      const total = a.facil + a.medio + a.dificil;
      return { id: t.id, name: t.name, examFocus: !!t.examFocus, approved: a, quota: t.quota, totalApproved: total, totalQuota: t.quota.facil + t.quota.medio + t.quota.dificil, gaps, sessionOf20: total >= 20, byScope };
    });
    const ap = zero();
    const quota = zero();
    for (const t of topics) for (const k of DIFFICULTIES) { ap[k] += t.approved[k]; quota[k] += t.quota[k]; }
    return { id: d.id, name: d.name, approved: ap, quota, byStatus, topics };
  });
  const goal = disciplines.reduce((s, d) => s + DIFFICULTIES.reduce((x, k) => x + d.quota[k], 0), 0);
  const total = approved.length;
  const verificationMethods: Record<string, number> = {};
  const reviewerTypes: Record<string, number> = {};
  const usage = new Map<string, number>();
  for (const q of approved) {
    const m = q.verification?.result?.method ?? 'sem verificação';
    verificationMethods[m] = (verificationMethods[m] ?? 0) + 1;
    const r = q.review?.reviewerType ?? 'sem revisão';
    reviewerTypes[r] = (reviewerTypes[r] ?? 0) + 1;
    for (const s of new Set(q.sourceRefs.map((x) => x.sourceId))) usage.set(s, (usage.get(s) ?? 0) + 1);
  }
  const sourcesUsed = [...usage.entries()].map(([id, n]) => ({ id, title: sources.find((s) => s.id === id)?.title ?? id, approvedQuestions: n })).sort((a, b) => b.approvedQuestions - a.approvedQuestions);

  // métricas de qualidade editorial
  let longest = 0;
  for (const q of approved) {
    const lens = q.options.map((o) => o.text.length);
    const c = q.options.find((o) => o.id === q.correctOptionId)!.text.length;
    if (c === Math.max(...lens) && lens.filter((l) => l === c).length === 1) longest++;
  }
  const templates: Coverage['quality']['topStemTemplates'] = [];
  const byTopic = new Map<string, Question[]>();
  for (const q of approved) (byTopic.get(`${q.disciplineId}/${q.topicId}`) ?? byTopic.set(`${q.disciplineId}/${q.topicId}`, []).get(`${q.disciplineId}/${q.topicId}`)!).push(q);
  for (const [k, qs] of byTopic) {
    if (qs.length < 8) continue;
    const c = new Map<string, number>();
    for (const q of qs) {
      const t = tokens(q.stem.replace(/\$[^$]*\$/g, ' ')).slice(0, 3).join(' ');
      c.set(t, (c.get(t) ?? 0) + 1);
    }
    const [tpl, n] = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
    templates.push({ topicId: k, template: tpl, pct: Math.round((100 * n) / qs.length) });
  }
  return {
    generatedAt: now.toISOString(),
    disciplines,
    totals: { approved: total, goal, remaining: goal - total },
    verificationMethods,
    reviewerTypes,
    sourcesUsed,
    quality: { longestCorrectPct: approved.length ? Math.round((1000 * longest) / approved.length) / 10 : 0, topStemTemplates: templates.sort((a, b) => b.pct - a.pct).slice(0, 5) },
  };
}

const row = (c: Counts) => `${c.facil} | ${c.medio} | ${c.dificil} | ${c.facil + c.medio + c.dificil}`;

export function renderCoverageMarkdown(c: Coverage): string {
  const L: string[] = [];
  L.push(`# Cobertura do banco de questões`, '', `Gerado em ${c.generatedAt}. **Somente questões \`approved\` são contadas** (rascunhos, verificadas-não-aprovadas e rejeitadas ficam de fora).`, '');
  L.push(`**Total aprovado: ${c.totals.approved} / ${c.totals.goal}** — faltam ${c.totals.remaining}.`, '');
  L.push('| Disciplina | Fácil | Média | Difícil | Total | Meta |', '|---|---:|---:|---:|---:|---:|');
  for (const d of c.disciplines) L.push(`| ${d.name} | ${d.approved.facil}/${d.quota.facil} | ${d.approved.medio}/${d.quota.medio} | ${d.approved.dificil}/${d.quota.dificil} | ${d.approved.facil + d.approved.medio + d.approved.dificil} | ${d.quota.facil + d.quota.medio + d.quota.dificil} |`);
  L.push('');
  for (const d of c.disciplines) {
    L.push(`## ${d.name}`, '', '| Assunto | Fácil | Média | Difícil | Total | Meta | Sessão de 20? |', '|---|---:|---:|---:|---:|---:|:--:|');
    for (const t of d.topics) L.push(`| ${t.name}${t.examFocus ? ' ★' : ''} | ${t.approved.facil}/${t.quota.facil} | ${t.approved.medio}/${t.quota.medio} | ${t.approved.dificil}/${t.quota.dificil} | ${t.totalApproved} | ${t.totalQuota} | ${t.sessionOf20 ? 'sim' : 'não'} |`);
    L.push('', `Fluxo editorial (todas as questões): ` + STATUSES.map((s) => `${s}: ${row(d.byStatus[s]).split(' | ').slice(-1)[0]}`).join(' · '), '');
  }
  L.push('★ = assunto cobrado na prova de 26/10/2026.', '', '## Verificação e revisão (questões aprovadas)', '');
  for (const [k, v] of Object.entries(c.verificationMethods)) L.push(`- Verificação \`${k}\`: ${v}`);
  for (const [k, v] of Object.entries(c.reviewerTypes)) L.push(`- Revisão \`${k}\`: ${v}`);
  L.push('', '## Qualidade editorial', '', `- Alternativa correta é a mais longa em ${c.quality.longestCorrectPct}% das questões (alvo: perto de 25%).`);
  for (const t of c.quality.topStemTemplates) L.push(`- Molde de enunciado mais repetido em ${t.topicId}: «${t.template}…» (${t.pct}%)`);
  L.push('', '## Fontes efetivamente usadas', '');
  for (const s of c.sourcesUsed) L.push(`- ${s.title} (\`${s.id}\`): ${s.approvedQuestions}`);
  void DIFFICULTY_LABEL;
  return L.join('\n') + '\n';
}
