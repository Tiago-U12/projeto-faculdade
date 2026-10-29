// Tipos do Web Lab (HTML/CSS/JavaScript e React). Exercícios são DADOS: arquivos iniciais, testes declarativos e uma
// solução de referência (usada só nos testes automatizados do próprio app; não é mostrada).
import type { LabExerciseBase } from '../types';

/** Conferência feita DENTRO do sandbox, sobre a página do estudante. `what` descreve o alvo para o feedback. */
export type WebCheck =
  | { kind: 'exists'; sel: string; what: string }
  | { kind: 'count'; sel: string; what: string; min?: number; max?: number }
  | { kind: 'text'; sel: string; what: string; equals?: string; includes?: string; nonEmpty?: boolean; caseSensitive?: boolean }
  | { kind: 'attr'; sel: string; what: string; name: string; equals?: string; present?: boolean; nonEmpty?: boolean }
  | { kind: 'style'; sel: string; what: string; prop: string; oneOf: string[] }
  | { kind: 'columns'; sel: string; what: string; equals: number }
  | { kind: 'labelled'; sel: string; what: string }
  | { kind: 'disabled'; sel: string; what: string; equals: boolean }
  /** valor atual de um campo (propriedade value) */
  | { kind: 'value'; sel: string; what: string; equals: string }
  /** a página cabe na largura (sem rolagem lateral) */
  | { kind: 'fits' }
  /** chama uma função do script (listada em `exports`) com argumentos JSON; `pure` confere que os argumentos não mudaram */
  | { kind: 'call'; fn: string; args: unknown[]; equals: unknown; pure?: boolean; reveal?: boolean }
  /** a função precisa lançar um erro com este nome (e propriedades) */
  | { kind: 'throws'; fn: string; args: unknown[]; errorName: string; props?: Record<string, unknown> }
  | { kind: 'no-errors' };

export type WebStep =
  | { do: 'fill'; sel: string; what: string; value: string }
  | { do: 'click'; sel: string; what: string }
  | { do: 'submit'; sel: string; what: string };

export interface WebTest {
  id: string;
  /** o que o teste confere (mostrado ao estudante) */
  label: string;
  /** largura da página de teste (padrão 390) — para media queries */
  width?: number;
  steps?: WebStep[];
  checks: WebCheck[];
}

export type WebFileName = 'index.html' | 'style.css' | 'script.js' | 'App.jsx';

export interface WebLabExercise extends LabExerciseBase {
  kind: 'web' | 'react';
  /** arquivos iniciais (a ordem é a das abas) */
  files: Partial<Record<WebFileName, string>>;
  /** arquivos que o estudante edita (os outros aparecem só para leitura) */
  editable: WebFileName[];
  /** nomes declarados no script que os testes chamam (funções puras) */
  exports?: string[];
  tests: WebTest[];
  /** solução de referência (testes automatizados do app; não aparece na interface) */
  solution: Partial<Record<WebFileName, string>>;
}
