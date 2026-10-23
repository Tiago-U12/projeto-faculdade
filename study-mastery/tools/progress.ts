#!/usr/bin/env tsx
/** Regenera a seção de contagens do PROGRESSO.md (entre os marcadores) a partir do banco real. */
import fs from 'node:fs';
import path from 'node:path';
import { buildCoverage } from './lib/coverage';
import { ROOT } from './lib/paths';
import { loadQuestions, loadSources, loadTaxonomy } from './lib/store';
import { DIFFICULTIES, DIFFICULTY_LABEL, type Status } from '../src/types';

const START = '<!-- CONTAGENS:INICIO -->';
const END = '<!-- CONTAGENS:FIM -->';
const all = loadQuestions();
const cov = buildCoverage(all, loadTaxonomy(), loadSources());
const L: string[] = [];
L.push(`_Gerado automaticamente em ${cov.generatedAt} por \`npm run progress\`. Só contam questões **aprovadas**; rascunhos, verificadas-não-aprovadas e rejeitadas ficam fora._`, '');
L.push(`**Total aprovado: ${cov.totals.approved} de ${cov.totals.goal}** (faltam ${cov.totals.remaining}).`, '');
L.push('| Disciplina | ' + DIFFICULTIES.map((d) => DIFFICULTY_LABEL[d]).join(' | ') + ' | Total |', '|---|---:|---:|---:|---:|');
for (const d of cov.disciplines) L.push(`| ${d.name} | ${DIFFICULTIES.map((k) => `${d.approved[k]}/${d.quota[k]}`).join(' | ')} | ${DIFFICULTIES.reduce((s, k) => s + d.approved[k], 0)}/${DIFFICULTIES.reduce((s, k) => s + d.quota[k], 0)} |`);
L.push('');
for (const d of cov.disciplines) {
  L.push(`#### ${d.name} — por assunto`, '', '| Assunto | Fácil | Média | Difícil | Total | Sessão de 20? |', '|---|---:|---:|---:|---:|:--:|');
  for (const t of d.topics) L.push(`| ${t.name}${t.examFocus ? ' ★' : ''} | ${t.approved.facil}/${t.quota.facil} | ${t.approved.medio}/${t.quota.medio} | ${t.approved.dificil}/${t.quota.dificil} | ${t.totalApproved}/${t.totalQuota} | ${t.sessionOf20 ? 'sim' : 'não'} |`);
  const st = (s: Status) => DIFFICULTIES.reduce((a, k) => a + d.byStatus[s][k], 0);
  L.push('', `Fluxo editorial (todas as questões da disciplina): aprovadas ${st('approved')} · verificadas aguardando revisão ${st('verified')} · rascunhos ${st('draft')} · rejeitadas ${st('rejected')}.`, '');
}
L.push('★ = assunto cobrado na prova de 26/10/2026.', '');
L.push('Verificação das aprovadas: ' + Object.entries(cov.verificationMethods).map(([k, v]) => `${v} por \`${k}\``).join(' · ') + '.');
L.push('Revisão das aprovadas: ' + Object.entries(cov.reviewerTypes).map(([k, v]) => `${v} \`${k}\``).join(' · ') + '. **Nenhuma questão passou por revisão humana ainda** quando `human` não aparece acima.');
const block = `${START}\n${L.join('\n')}\n${END}`;
const file = path.join(ROOT, 'PROGRESSO.md');
const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : `# Progresso — Study Mastery\n\n## Contagens validadas\n\n${START}\n${END}\n`;
fs.writeFileSync(file, cur.includes(START) ? cur.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block) : cur + '\n' + block + '\n');
console.log(`PROGRESSO.md atualizado: ${cov.totals.approved}/${cov.totals.goal} aprovadas.`);
