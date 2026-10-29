// Protocolo tipado entre a página e o Web Worker do SQL Lab. Os dois lados validam o formato antes de usar.
import type { LabGrade } from '../types';
import type { RunFailure, RunOutput, TableView } from './engine';
import type { SqlLabExercise } from './types';

export type SqlWorkerRequest =
  | { id: number; type: 'init' }
  | { id: number; type: 'run'; exercise: SqlLabExercise; sql: string }
  | { id: number; type: 'grade'; exercise: SqlLabExercise; sql: string }
  | { id: number; type: 'describe'; exercise: SqlLabExercise };

export type SqlWorkerResponse =
  | { id: number; type: 'ready'; sqliteVersion: string }
  | { id: number; type: 'run'; result: RunOutput | RunFailure; ms: number }
  | { id: number; type: 'grade'; grade: LabGrade; ms: number }
  | { id: number; type: 'describe'; tables: TableView[] }
  | { id: number; type: 'error'; message: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const isExercise = (x: unknown): x is SqlLabExercise =>
  isObj(x) && x.kind === 'sql' && typeof x.id === 'string' && typeof x.schemaSql === 'string' && Array.isArray(x.fixtures) && x.fixtures.length > 0 && typeof x.solutionSql === 'string' && isObj(x.grading);

export function isSqlRequest(x: unknown): x is SqlWorkerRequest {
  if (!isObj(x) || !Number.isSafeInteger(x.id)) return false;
  switch (x.type) {
    case 'init':
      return true;
    case 'run':
    case 'grade':
      return isExercise(x.exercise) && typeof x.sql === 'string';
    case 'describe':
      return isExercise(x.exercise);
    default:
      return false;
  }
}

export function isSqlResponse(x: unknown): x is SqlWorkerResponse {
  if (!isObj(x) || !Number.isSafeInteger(x.id)) return false;
  switch (x.type) {
    case 'ready':
      return typeof x.sqliteVersion === 'string';
    case 'run':
      return isObj(x.result) && typeof x.result.ok === 'boolean' && typeof x.ms === 'number';
    case 'grade':
      return isObj(x.grade) && typeof x.grade.passed === 'boolean' && Array.isArray(x.grade.results) && typeof x.ms === 'number';
    case 'describe':
      return Array.isArray(x.tables);
    case 'error':
      return typeof x.message === 'string';
    default:
      return false;
  }
}
