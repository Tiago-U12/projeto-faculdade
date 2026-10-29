// Tipos do SQL Lab. Os exercícios são DADOS (SQL e configurações); a lógica de execução e correção fica no código.
import type { LabExerciseBase } from '../types';

export type SqlValue = number | string | null;

export interface ResultSet {
  columns: string[];
  rows: SqlValue[][];
  /** a consulta devolveu mais linhas que o limite (só as primeiras foram lidas) */
  truncated: boolean;
}

/** Banco de teste: o seed roda sobre o schema do exercício, num banco novo, descartado depois. */
export interface SqlFixture {
  id: string;
  /** o que este caso confere (aparece no resultado da verificação) */
  label: string;
  seedSql: string;
  /** dica educativa quando só este caso falha (ex.: "Confira os clientes sem pedidos") */
  hint?: string;
}

export interface SqlStateQuery {
  label: string;
  /** consulta de verificação do estado final (com ORDER BY: a ordem é comparada) */
  sql: string;
}

/** Verificação de estrutura por comportamento: o comando precisa funcionar ou ser recusado pelo banco. */
export interface SqlProbe {
  label: string;
  sql: string;
  expect: 'ok' | 'erro';
}

export type SqlGrading =
  | {
      /** compara o resultado da consulta com o da solução de referência em cada banco de teste */
      mode: 'result';
      orderMatters: boolean;
      /**
       * Chave de ordenação pedida no enunciado (colunas do resultado esperado, com desempate). Quando presente, a ordem
       * é conferida verificando se o resultado está ordenado por ela — empates sem desempate não viram erro falso.
       */
      orderKeys?: { column: string; desc?: boolean }[];
      /** exige os nomes/aliases de coluna da solução */
      columnNamesMatter: boolean;
      /** tolerância para números com casas decimais */
      tolerance: number;
    }
  | {
      /** INSERT/UPDATE/DELETE: compara o estado final das tabelas */
      mode: 'state';
      stateQueries: SqlStateQuery[];
      tolerance: number;
    }
  | {
      /** CREATE TABLE: confere colunas e restrições pelo comportamento do banco */
      mode: 'schema';
      table: string;
      columns: string[];
      probes: SqlProbe[];
    };

export interface SqlLabExercise extends LabExerciseBase {
  kind: 'sql';
  dialect: 'sqlite';
  /** banco fictício (loja, biblioteca, universidade) */
  database: string;
  schemaSql: string;
  /** o primeiro é o "Dados do enunciado", visível e usado por Executar; os demais são casos adicionais */
  fixtures: SqlFixture[];
  starterSql: string;
  /** solução de referência: gera o resultado esperado em cada banco de teste (está no cliente; não é secreta) */
  solutionSql: string;
  grading: SqlGrading;
  /** comportamento conferido também no MariaDB 10.11 (próximo do MySQL 8), quando registrado */
  portability?: 'sql-comum' | 'so-sqlite';
}
