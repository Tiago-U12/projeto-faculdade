// Conquistas locais, guardadas no navegador junto com os recordes do Desafio.

export const ACHIEVEMENTS = [
  { id: 'first_dish', name: 'Primeiro prato', desc: 'Entregue o primeiro pedido correto.' },
  { id: 'five_streak', name: 'Cinco sem errar', desc: 'Entregue cinco pratos seguidos sem erro.' },
  { id: 'five_stars', name: 'Cinco estrelas', desc: 'Receba uma avaliação perfeita.' },
  { id: 'diplomat', name: 'Diplomata do salão', desc: 'Resolva três conflitos (somando todas as partidas).' },
  { id: 'no_charcoal', name: 'Sem carvão', desc: 'Termine uma noite da campanha sem queimar nenhum prato.' },
  { id: 'cookbook', name: 'Livro completo', desc: 'Prepare as doze receitas pelo menos uma vez.' },
  { id: 'friends', name: 'Amigo de todos', desc: 'Alcance confiança 3 com os oito clientes numa campanha.' },
  { id: 'challenge_1500', name: 'Mestre do Desafio', desc: 'Faça 1500 pontos no modo Desafio.' },
  { id: 'all_endings', name: 'Os três luares', desc: 'Veja os três finais da campanha.' },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
