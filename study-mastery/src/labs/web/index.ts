// Definições do Web Lab (HTML/CSS/JS) e do React Lab para o registro. Página e exercícios carregam sob demanda.
import type { LabDefinition } from '../registry';

const loadExercises = (kind: 'web' | 'react') => () => import('./exercises').then((m) => m.WEB_EXERCISES.filter((e) => e.kind === kind));
const loadPage = () => import('./WebLab');

export const webLab: LabDefinition = {
  kind: 'web',
  name: 'Web Lab',
  summary: 'HTML, CSS e JavaScript com prévia isolada, console e testes automáticos.',
  runtime: 'página isolada no navegador',
  offline: true,
  loadExercises: loadExercises('web'),
  loadPage,
};

export const reactLab: LabDefinition = {
  kind: 'react',
  name: 'React Lab',
  summary: 'Componentes, estado e formulários em React 19 com JSX.',
  runtime: 'React 19 e JSX transformados no seu aparelho',
  offline: true,
  loadExercises: loadExercises('react'),
  loadPage,
};
