/**
 * Auditoria: as questões de React que montam componentes no cliente (createRoot) são executadas de novo DENTRO de
 * <React.StrictMode> — como no main.jsx dos starters das aulas — e a saída é comparada à execução sem StrictMode.
 * Questões cuja resposta muda precisam dizer no enunciado em que condição a saída vale.
 *   npx tsx tools/audit/strictmode.ts
 */
import type { Question } from '../../src/types';
import { loadQuestions } from '../lib/store';
import { verifyNode } from '../lib/verify';

const alvo = loadQuestions().filter((q) => q.status === 'approved' && q.verification?.kind === 'node' && /createRoot/.test(String(q.verification.params?.code ?? '')));
const comStrict = (q: Question): Question => {
  const code = String(q.verification!.params!.code)
    .replace('root.render(el)', 'root.render(<React.StrictMode>{el}</React.StrictMode>)')
    .replace('root.render(<MemoryRouter', 'root.render(<React.StrictMode><MemoryRouter')
    .replace('</MemoryRouter>))', '</MemoryRouter></React.StrictMode>))')
    .replace('root.render(<ul>', 'root.render(<React.StrictMode><ul>')
    .replace('</ul>); });', '</ul></React.StrictMode>); });');
  return { ...q, id: `${q.id}-strict`, verification: { ...q.verification!, params: { ...q.verification!.params, code } } };
};
let mudam = 0;
for (const q of alvo) {
  // em sequência e com IDs distintos: cada execução grava seu próprio arquivo em tools/sandbox/casos
  const a = await verifyNode(q);
  const b = await verifyNode(comStrict(q));
  const igual = a.details === b.details;
  if (!igual) mudam++;
  const correta = q.verification!.optionValues?.[q.correctOptionId];
  console.log(`${igual ? '=' : '≠'} ${q.id}  sem: ${a.details}${igual ? '' : `\n      com StrictMode: ${b.details}  (bate com alternativa: ${Object.entries(q.verification!.optionValues ?? {}).filter(([, v]) => 'saída: ' + v.replace(/\n/g, ' ⏎ ') === b.details).map(([k]) => k + (k === q.correctOptionId ? ' = correta' : ' = DISTRATOR')).join(',') || 'nenhuma'}; correta: ${correta})`}`);
}
console.log(`\n${alvo.length} questões montadas no cliente; ${mudam} mudam com StrictMode.`);
