import type { PublishedQuestion } from '../types';

/** Finalidade da verificação automática, agrupando os métodos registrados em `verifiedBy` no banco publicado. */
export type CheckPurpose = 'calculo' | 'codigo' | 'navegador' | 'sql' | 'fonte' | 'outro';

export const PURPOSE_INFO: Record<CheckPurpose, { name: string; what: string }> = {
  calculo: { name: 'Cálculos', what: 'O gabarito é recalculado de forma simbólica (SymPy) e conferido numericamente (mpmath ou amostragem de pontos).' },
  codigo: { name: 'Código executado', what: 'O código do enunciado roda isolado, sem rede, em Node.js — com as bibliotecas das aulas quando necessário (Express, React, JWT…) — e a saída é comparada com cada alternativa.' },
  navegador: { name: 'Páginas no navegador', what: 'HTML e CSS são abertos em um Chromium real e a página é medida; nas questões de CORS e fetch, com servidores locais de teste.' },
  sql: { name: 'Consultas SQL', what: 'As consultas rodam em um banco MariaDB temporário compatível com MySQL e o resultado é comparado com as alternativas.' },
  fonte: { name: 'Conferência na fonte', what: 'Sem ferramenta de execução: as afirmações da questão foram conferidas na fonte citada, com assistência de IA.' },
  outro: { name: 'Outros métodos', what: 'Método não classificado.' },
};

export function purposeOf(verifiedBy: string): CheckPurpose {
  if (verifiedBy.startsWith('sympy')) return 'calculo';
  if (verifiedBy.startsWith('js-exec') || verifiedBy.startsWith('node-exec')) return 'codigo';
  if (verifiedBy.startsWith('web-chromium')) return 'navegador';
  if (verifiedBy.startsWith('sql')) return 'sql';
  if (verifiedBy === 'source-review') return 'fonte';
  return 'outro';
}

export interface QualitySummary {
  total: number;
  /** verificadas por ferramenta (cálculo, código, navegador ou SQL) */
  automatic: number;
  /** só conferência na fonte, sem execução */
  sourceOnly: number;
  aiReviewed: number;
  humanReviewed: number;
  groups: { purpose: CheckPurpose; count: number; methods: { method: string; count: number }[] }[];
}

/** Contagens derivadas do banco publicado — nada fixo no texto da interface. */
export function qualitySummary(questions: readonly PublishedQuestion[]): QualitySummary {
  const byPurpose = new Map<CheckPurpose, Map<string, number>>();
  for (const q of questions) {
    const p = purposeOf(q.verifiedBy);
    const m = byPurpose.get(p) ?? new Map<string, number>();
    m.set(q.verifiedBy, (m.get(q.verifiedBy) ?? 0) + 1);
    byPurpose.set(p, m);
  }
  const order: CheckPurpose[] = ['calculo', 'codigo', 'navegador', 'sql', 'fonte', 'outro'];
  const groups = order
    .filter((p) => byPurpose.has(p))
    .map((purpose) => {
      const methods = [...byPurpose.get(purpose)!].map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count);
      return { purpose, count: methods.reduce((s, m) => s + m.count, 0), methods };
    });
  const count = (p: CheckPurpose) => groups.find((g) => g.purpose === p)?.count ?? 0;
  return {
    total: questions.length,
    automatic: count('calculo') + count('codigo') + count('navegador') + count('sql'),
    sourceOnly: count('fonte'),
    aiReviewed: questions.filter((q) => q.reviewedBy === 'ai-assisted').length,
    humanReviewed: questions.filter((q) => q.reviewedBy === 'human').length,
    groups,
  };
}
