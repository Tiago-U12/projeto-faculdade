// Catálogo de 12 receitas. Uma receita é identificada pelo multiconjunto de
// ingredientes + estação. Tempos em segundos de simulação (ajustáveis).

export const COOK_STATIONS = {
  cauldron: { id: 'cauldron', name: 'Caldeirão', verb: 'ferver', heat: true },
  oven: { id: 'oven', name: 'Forno', verb: 'assar', heat: true },
  grill: { id: 'grill', name: 'Grelha', verb: 'grelhar', heat: true },
  cold: { id: 'cold', name: 'Bancada Fria', verb: 'montar', heat: false },
};

export const TAGS = {
  quente: { id: 'quente', name: 'Quente', adjective: 'quentinho' },
  picante: { id: 'picante', name: 'Picante', adjective: 'apimentado' },
  fresco: { id: 'fresco', name: 'Fresco', adjective: 'fresquinho' },
  caldo: { id: 'caldo', name: 'Caldo', adjective: 'de colher, com caldo' },
  assado: { id: 'assado', name: 'Assado', adjective: 'assado no forno' },
  robusto: { id: 'robusto', name: 'Robusto', adjective: 'bem sustancioso' },
  magico: { id: 'magico', name: 'Mágico', adjective: 'que brilhe de magia' },
  doce: { id: 'doce', name: 'Doce', adjective: 'docinho' },
  insolito: { id: 'insolito', name: 'Insólito', adjective: 'esquisito (no bom sentido)' },
  queijo: { id: 'queijo', name: 'Com queijo', adjective: 'com queijo' },
  peixe: { id: 'peixe', name: 'Peixe', adjective: 'com peixe' },
  paz: { id: 'paz', name: 'Da paz', adjective: 'que acalme os ânimos' },
};

// Aversões que não são tags de receita, avaliadas na entrega.
export const SPECIAL_PREFS = {
  queimado: 'prato queimado',
  espera: 'espera longa',
};

export function prefName(tag) {
  if (TAGS[tag]) return TAGS[tag].name.toLowerCase();
  return SPECIAL_PREFS[tag] || tag;
}

export const RECIPES = [
  {
    id: 'soup', name: 'Sopa da Lua', ingredients: ['mush', 'root'], station: 'cauldron',
    cookSeconds: 5, spoilSeconds: 18, baseValue: 65, unlockNight: 1,
    tags: ['quente', 'caldo'], peace: 0,
    desc: 'Caldo prateado que acalma até estômago de troll.',
  },
  {
    id: 'stew', name: 'Ensopado do Dragão', ingredients: ['meat', 'pepper'], station: 'cauldron',
    cookSeconds: 6, spoilSeconds: 16, baseValue: 78, unlockNight: 1,
    tags: ['quente', 'picante', 'robusto'], peace: 0,
    desc: 'Arde três vezes: na língua, no coração e na memória.',
  },
  {
    id: 'salad', name: 'Salada da Paz', ingredients: ['leaf', 'mush'], station: 'cold',
    cookSeconds: 0, spoilSeconds: null, baseValue: 70, unlockNight: 1,
    tags: ['fresco', 'paz'], peace: 14,
    desc: 'Folhas élficas e cogumelo lunar. Servida fria, desarma discussões.',
  },
  {
    id: 'roots', name: 'Raízes Douradas', ingredients: ['root', 'cheese'], station: 'oven',
    cookSeconds: 6, spoilSeconds: 16, baseValue: 74, unlockNight: 2,
    tags: ['quente', 'assado', 'queijo'], peace: 0,
    desc: 'Raiz rúnica gratinada. Receita favorita de quem consertou o forno.',
  },
  {
    id: 'herbal', name: 'Infusão do Descanso', ingredients: ['leaf', 'moonwater'], station: 'cauldron',
    cookSeconds: 4, spoilSeconds: 22, baseValue: 72, unlockNight: 2,
    tags: ['caldo', 'fresco', 'magico'], peace: 6,
    desc: 'Fervura suave de luar e erva. Cheira a cobertor quentinho.',
  },
  {
    id: 'emberstew', name: 'Caldeirada das Brasas', ingredients: ['meat', 'ember'], station: 'cauldron',
    cookSeconds: 6, spoilSeconds: 14, baseValue: 95, unlockNight: 3,
    tags: ['quente', 'picante', 'robusto'], peace: 0,
    desc: 'Javali cozido em brasa encantada. Não sopre: ele sopra de volta.',
  },
  {
    id: 'fairysalad', name: 'Jardim das Fadas', ingredients: ['leaf', 'fairyfruit'], station: 'cold',
    cookSeconds: 0, spoilSeconds: null, baseValue: 86, unlockNight: 3,
    tags: ['fresco', 'doce', 'paz'], peace: 14,
    desc: 'Fruta de fada sobre folhas. Dizem que dá para ouvir risadinhas.',
  },
  {
    id: 'spicebread', name: 'Pastel do Vulcão', ingredients: ['cheese', 'pepper', 'ember'], station: 'oven',
    cookSeconds: 7, spoilSeconds: 14, baseValue: 105, unlockNight: 3,
    tags: ['quente', 'picante', 'assado', 'queijo'], peace: 0,
    desc: 'Massa crocante com recheio em erupção controlada.',
  },
  {
    id: 'cavefish', name: 'Peixe das Profundezas', ingredients: ['cavefish', 'leaf'], station: 'grill',
    cookSeconds: 6, spoilSeconds: 13, baseValue: 98, unlockNight: 4,
    tags: ['quente', 'robusto', 'peixe'], peace: 0,
    desc: 'Peixe abissal grelhado com folha élfica. Brilha um pouquinho no escuro.',
  },
  {
    id: 'glimmer', name: 'Caldo Cintilante', ingredients: ['moonwater', 'crystal', 'mush'], station: 'cauldron',
    cookSeconds: 6, spoilSeconds: 16, baseValue: 112, unlockNight: 5,
    tags: ['caldo', 'magico', 'insolito'], peace: 0,
    desc: 'Cada colherada mostra uma lembrança. Nem sempre a sua.',
  },
  {
    id: 'spectral', name: 'Pudim Espectral', ingredients: ['slimegel', 'fairyfruit'], station: 'cold',
    cookSeconds: 0, spoilSeconds: null, baseValue: 118, unlockNight: 6,
    tags: ['doce', 'magico', 'insolito'], peace: 0,
    desc: 'Treme quando você olha. Treme mais quando você come.',
  },
  {
    id: 'harmony', name: 'Banquete do Reencontro', ingredients: ['root', 'meat', 'crystal'], station: 'cauldron',
    cookSeconds: 8, spoilSeconds: 20, baseValue: 145, unlockNight: 7,
    tags: ['quente', 'robusto', 'magico', 'paz'], peace: 18, special: true,
    desc: 'Raiz de casa, força do javali e o cristal que guarda lembranças. A receita que ficou por servir.',
  },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

export function recipesUnlockedBy(night) {
  return RECIPES.filter((r) => r.unlockNight <= night).map((r) => r.id);
}

export function dishName(recipe, quality) {
  return quality === 'burnt' ? `Carvão de ${recipe.name}` : recipe.name;
}
