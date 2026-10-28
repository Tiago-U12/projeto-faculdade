// Definição do SQL Lab para o registro. Exercícios e página são baixados só quando usados.
import type { LabDefinition } from '../registry';

export const sqlLab: LabDefinition = {
  kind: 'sql',
  name: 'SQL Lab',
  summary: 'Consultas e comandos SQL de verdade, corrigidos pelo resultado em vários bancos de teste.',
  runtime: 'SQLite (WebAssembly) no seu aparelho',
  offline: true,
  loadExercises: () => import('./exercises').then((m) => m.SQL_EXERCISES),
  loadPage: () => import('./SqlLab'),
};
