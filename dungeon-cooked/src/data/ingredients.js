// Ingredientes autorais. IDs estáveis (usados no save); nomes ficam só aqui.
// prep: 'chop' precisa passar pela tábua; 'none' vai direto para a estação.
// shelf: prateleira da despensa onde o ingrediente fica.

export const INGREDIENTS = {
  mush: {
    id: 'mush', name: 'Cogumelo Lunar', short: 'Cogumelo', category: 'fungo',
    prep: 'chop', prepVerb: 'fatiar', shelf: 'horta', unlockNight: 1,
    color: '#b7a4f5',
  },
  root: {
    id: 'root', name: 'Raiz Rúnica', short: 'Raiz', category: 'vegetal',
    prep: 'chop', prepVerb: 'picar', shelf: 'horta', unlockNight: 1,
    color: '#d99a5b',
  },
  leaf: {
    id: 'leaf', name: 'Folha Élfica', short: 'Folha', category: 'erva',
    prep: 'chop', prepVerb: 'rasgar', shelf: 'horta', unlockNight: 1,
    color: '#7fd18b',
  },
  fairyfruit: {
    id: 'fairyfruit', name: 'Fruta de Fada', short: 'Fruta', category: 'fruta',
    prep: 'chop', prepVerb: 'fatiar', shelf: 'horta', unlockNight: 3,
    color: '#ff9fb8',
  },
  meat: {
    id: 'meat', name: 'Javali das Cavernas', short: 'Javali', category: 'proteína',
    prep: 'chop', prepVerb: 'cortar', shelf: 'rustica', unlockNight: 1,
    color: '#d9776a',
  },
  pepper: {
    id: 'pepper', name: 'Pimenta de Dragão', short: 'Pimenta', category: 'tempero',
    prep: 'chop', prepVerb: 'picar', shelf: 'rustica', unlockNight: 1,
    color: '#ff5a4a',
  },
  cheese: {
    id: 'cheese', name: 'Queijo da Montanha', short: 'Queijo', category: 'laticínio',
    prep: 'chop', prepVerb: 'fatiar', shelf: 'rustica', unlockNight: 2,
    color: '#ffd166',
  },
  cavefish: {
    id: 'cavefish', name: 'Peixe Abissal', short: 'Peixe', category: 'proteína',
    prep: 'chop', prepVerb: 'filetar', shelf: 'rustica', unlockNight: 4,
    color: '#6fb7d9',
  },
  moonwater: {
    id: 'moonwater', name: 'Água do Luar', short: 'Água', category: 'líquido',
    prep: 'none', prepVerb: '', shelf: 'arcano', unlockNight: 2,
    color: '#9fd8ff',
  },
  ember: {
    id: 'ember', name: 'Brasa Encantada', short: 'Brasa', category: 'essência',
    prep: 'none', prepVerb: '', shelf: 'arcano', unlockNight: 3,
    color: '#ff9b3d',
  },
  crystal: {
    id: 'crystal', name: 'Cristal de Névoa', short: 'Cristal', category: 'elemento',
    prep: 'chop', prepVerb: 'lascar', shelf: 'arcano', unlockNight: 5,
    color: '#a6edd8',
  },
  slimegel: {
    id: 'slimegel', name: 'Gelatina de Slime', short: 'Gelatina', category: 'ingrediente mágico',
    prep: 'none', prepVerb: '', shelf: 'arcano', unlockNight: 6,
    color: '#9ef0a0',
  },
};

export const INGREDIENT_IDS = Object.keys(INGREDIENTS);

export const SHELVES = {
  horta: { id: 'horta', name: 'Horta Subterrânea', items: ['mush', 'root', 'leaf', 'fairyfruit'] },
  rustica: { id: 'rustica', name: 'Despensa Rústica', items: ['meat', 'pepper', 'cheese', 'cavefish'] },
  arcano: { id: 'arcano', name: 'Armário Arcano', items: ['moonwater', 'ember', 'crystal', 'slimegel'] },
};

export function ingredientsUnlockedBy(night) {
  return INGREDIENT_IDS.filter((id) => INGREDIENTS[id].unlockNight <= night);
}
