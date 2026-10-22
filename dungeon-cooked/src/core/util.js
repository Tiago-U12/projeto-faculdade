// Funções puras de apoio. Não acessam DOM: podem ser usadas nos testes em Node.

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function approach(value, target, step) {
  if (value < target) return Math.min(target, value + step);
  return Math.max(target, value - step);
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Distância de um ponto até a borda de um retângulo (0 se estiver dentro).
export function distanceToRect(px, py, rect) {
  const dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w));
  const dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

export function circleHitsRect(cx, cy, r, rect) {
  return distanceToRect(cx, cy, rect) < r;
}

export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Conta ocorrências de cada id; base para comparar receitas como multiconjuntos.
export function countIds(ids) {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  return counts;
}

// true se `part` cabe dentro de `whole` respeitando multiplicidade.
export function isSubMultiset(part, whole) {
  const need = countIds(part);
  const have = countIds(whole);
  for (const [id, n] of need) if ((have.get(id) || 0) < n) return false;
  return true;
}

export function sameMultiset(a, b) {
  return a.length === b.length && isSubMultiset(a, b);
}

// Ingredientes que ainda faltam em `whole` depois de usar `part`.
export function missingFrom(part, whole) {
  const left = countIds(part);
  const missing = [];
  for (const id of whole) {
    const n = left.get(id) || 0;
    if (n > 0) left.set(id, n - 1);
    else missing.push(id);
  }
  return missing;
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function uniquePush(list, value) {
  if (!list.includes(value)) list.push(value);
  return list;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}
