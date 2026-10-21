// Gerador pseudoaleatório com semente (mulberry32). Injetável para testes reproduzíveis.

export function createRng(seed = Date.now()) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    chance(p) {
      return next() < p;
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // Escolha ponderada: items = [{ value, weight }]
    weighted(items) {
      const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
      if (total <= 0) return items.length ? items[0].value : undefined;
      let roll = next() * total;
      for (const item of items) {
        roll -= Math.max(0, item.weight);
        if (roll <= 0) return item.value;
      }
      return items[items.length - 1].value;
    },
  };
}
