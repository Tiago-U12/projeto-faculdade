// Seis melhorias funcionais (alteram cálculos reais do serviço) e três reformas
// decorativas que somam reputação e mudam o salão.

export const UPGRADES = [
  {
    id: 'boots', name: 'Deslize Fantasmal', cost: 130, availableAfter: 1,
    effect: '+12% de velocidade do chef',
    desc: 'Pantufas etéreas. O chef desliza entre as bancadas.',
    mods: { speedMult: 1.12 },
  },
  {
    id: 'shelf', name: 'Prateleira Dupla', cost: 170, availableAfter: 2,
    effect: 'Carregue 2 itens (no máximo 1 prato)',
    desc: 'Uma bandeja flutuante segue o chef pela cozinha.',
    mods: { capacity: 2 },
  },
  {
    id: 'cauldron', name: 'Caldeirão Afinado', cost: 220, availableAfter: 2,
    effect: '−15% no tempo de cozimento do caldeirão',
    desc: 'Grix ajustou as runas do fundo. Ferve mais rápido, sem drama.',
    mods: { cauldronTimeMult: 0.85 },
  },
  {
    id: 'bell', name: 'Sino Restaurado', cost: 240, availableAfter: 3,
    effect: '−20% na recarga do sino de harmonia',
    desc: 'Bronze polido e badalo novo. Soa como uma trégua.',
    mods: { bellCooldownMult: 0.8 },
  },
  {
    id: 'oven', name: 'Forno das Brasas', cost: 280, availableAfter: 4,
    effect: '+25% de janela no ponto (forno e grelha)',
    desc: 'Tijolos encantados por Nira. A comida espera você sem queimar tão rápido.',
    mods: { heatWindowMult: 1.25 },
  },
  {
    id: 'tables', name: 'Mesas Acolhedoras', cost: 320, availableAfter: 5,
    effect: '+10% de paciência dos clientes',
    desc: 'Almofadas, toalhas bordadas e velas. Esperar fica mais gostoso.',
    mods: { patienceMult: 1.1 },
  },
];

export const DECOR = [
  {
    id: 'lanterns', name: 'Lanternas de Vagalume', cost: 300, availableAfter: 2,
    effect: '+1 de reputação da taberna', desc: 'Luzinhas que piscam no ritmo da conversa.', reputation: 1,
  },
  {
    id: 'rug', name: 'Tapete do Salão', cost: 450, availableAfter: 4,
    effect: '+1 de reputação da taberna', desc: 'Bordado com todas as raças da dungeon dividindo um pão.', reputation: 1,
  },
  {
    id: 'sign', name: 'Placa Restaurada', cost: 600, availableAfter: 5,
    effect: '+2 de reputação da taberna', desc: 'A placa antiga, com o nome que todo mundo esqueceu: Mesa do Luar.', reputation: 2,
  },
];

export const UPGRADE_BY_ID = Object.fromEntries([...UPGRADES, ...DECOR].map((u) => [u.id, u]));

export const BASE_MODS = {
  speedMult: 1,
  capacity: 1,
  cauldronTimeMult: 1,
  bellCooldownMult: 1,
  heatWindowMult: 1,
  patienceMult: 1,
};

// Combina as melhorias compradas num único objeto de modificadores usado pelo serviço.
export function modsFor(upgradeIds = []) {
  const mods = { ...BASE_MODS };
  for (const id of upgradeIds) {
    const upgrade = UPGRADES.find((u) => u.id === id);
    if (!upgrade) continue;
    for (const [key, value] of Object.entries(upgrade.mods)) {
      if (key === 'capacity') mods.capacity = Math.max(mods.capacity, value);
      else mods[key] *= value;
    }
  }
  return mods;
}
