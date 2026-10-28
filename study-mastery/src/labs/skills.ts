// Capacidades praticadas nos laboratórios. São a ponte explícita entre exercícios e disciplinas pessoais: o estudante
// escolhe quais capacidades um assunto seu cobre (ex.: "Banco de Dados › Junções" → sql.join). Nada é inferido do nome.

export interface LabSkill {
  id: string;
  /** tipo de laboratório que pratica a capacidade */
  kind: string;
  label: string;
  /** o que entra (para o estudante decidir a associação) */
  detail: string;
}

export const LAB_SKILLS: LabSkill[] = [
  { id: 'sql.select', kind: 'sql', label: 'SQL — consultas simples', detail: 'SELECT, WHERE, ORDER BY, LIMIT e DISTINCT' },
  { id: 'sql.join', kind: 'sql', label: 'SQL — junções', detail: 'JOIN e LEFT JOIN entre tabelas' },
  { id: 'sql.aggregate', kind: 'sql', label: 'SQL — agregações', detail: 'GROUP BY, HAVING, COUNT, SUM e AVG' },
  { id: 'sql.subquery', kind: 'sql', label: 'SQL — subconsultas', detail: 'consultas dentro de consultas (IN, EXISTS, escalares)' },
  { id: 'sql.dml', kind: 'sql', label: 'SQL — alterar dados', detail: 'INSERT, UPDATE e DELETE' },
  { id: 'sql.ddl', kind: 'sql', label: 'SQL — estrutura', detail: 'CREATE TABLE, chaves e restrições' },
  { id: 'html.semantic', kind: 'web', label: 'HTML semântico', detail: 'header, main, nav, article, títulos e textos alternativos' },
  { id: 'html.forms', kind: 'web', label: 'Formulários HTML', detail: 'campos, rótulos, obrigatórios e tipos de entrada' },
  { id: 'css.layout', kind: 'web', label: 'CSS — layout', detail: 'Flexbox, Grid, espaçamentos e alinhamento' },
  { id: 'css.responsive', kind: 'web', label: 'CSS — responsivo', detail: 'mobile-first e media queries' },
  { id: 'js.dom', kind: 'web', label: 'JavaScript — DOM e eventos', detail: 'selecionar elementos, cliques e alterar a página' },
  { id: 'js.validation', kind: 'web', label: 'JavaScript — validação', detail: 'validar formulários e mostrar mensagens' },
  { id: 'js.arrays', kind: 'web', label: 'JavaScript — arrays na tela', detail: 'filter, map e renderizar listas' },
  { id: 'react.components', kind: 'react', label: 'React — componentes e props', detail: 'JSX, composição e props' },
  { id: 'react.state', kind: 'react', label: 'React — estado e eventos', detail: 'useState e eventos' },
  { id: 'react.forms', kind: 'react', label: 'React — formulários', detail: 'inputs controlados e validação' },
];

export const skillById = (id: string) => LAB_SKILLS.find((s) => s.id === id);
