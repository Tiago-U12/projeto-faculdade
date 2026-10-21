// Geometria da cozinha em coordenadas de mundo (960 x 600): estações, colisão,
// alcance de interação e navegação A* para clique/toque.
import { clamp, distance, distanceToRect, circleHitsRect, pointInRect } from '../core/util.js';

export const WORLD = { w: 960, h: 600 };
export const COUNTER = { x: 24, y: 138, w: 912, h: 74 };
export const FLOOR = { x: 24, y: 212, w: 912, h: 376 };
export const PLAYER_RADIUS = 16;
export const REACH = 30;
export const SEAT_X = [232, 484, 714];
export const SEAT_Y = 104;
export const DOOR_LEFT = -70;
export const DOOR_RIGHT = WORLD.w + 70;
export const PLAYER_START = { x: 484, y: 470 };

export const STATION_LAYOUT = {
  horta: { id: 'horta', kind: 'pantry', shelf: 'horta', label: 'Horta Subterrânea', rect: { x: 28, y: 256, w: 110, h: 78 } },
  rustica: { id: 'rustica', kind: 'pantry', shelf: 'rustica', label: 'Despensa Rústica', rect: { x: 28, y: 362, w: 110, h: 78 } },
  arcano: { id: 'arcano', kind: 'pantry', shelf: 'arcano', label: 'Armário Arcano', rect: { x: 28, y: 468, w: 110, h: 78 } },
  board: { id: 'board', kind: 'board', label: 'Tábua de Corte', rect: { x: 236, y: 304, w: 116, h: 68 } },
  cauldron: { id: 'cauldron', kind: 'cook', cook: 'cauldron', label: 'Caldeirão', rect: { x: 424, y: 292, w: 112, h: 90 } },
  cold: { id: 'cold', kind: 'cook', cook: 'cold', label: 'Bancada Fria', rect: { x: 606, y: 304, w: 126, h: 68 } },
  oven: { id: 'oven', kind: 'cook', cook: 'oven', label: 'Forno', rect: { x: 822, y: 256, w: 110, h: 86 } },
  grill: { id: 'grill', kind: 'cook', cook: 'grill', label: 'Grelha', rect: { x: 822, y: 366, w: 110, h: 76 } },
  trash: { id: 'trash', kind: 'trash', label: 'Lixeira', rect: { x: 852, y: 480, w: 72, h: 66 } },
  bell: { id: 'bell', kind: 'bell', label: 'Sino da Harmonia', onCounter: true, rect: { x: 834, y: 146, w: 74, h: 60 } },
  seat0: { id: 'seat0', kind: 'seat', seat: 0, label: 'Balcão', onCounter: true, rect: { x: 96, y: 138, w: 272, h: 74 } },
  seat1: { id: 'seat1', kind: 'seat', seat: 1, label: 'Balcão', onCounter: true, rect: { x: 368, y: 138, w: 234, h: 74 } },
  seat2: { id: 'seat2', kind: 'seat', seat: 2, label: 'Balcão', onCounter: true, rect: { x: 602, y: 138, w: 226, h: 74 } },
};

export const STATION_ORDER = Object.keys(STATION_LAYOUT);

// Obstáculos sólidos: balcão + estações que ficam no chão da cozinha.
export const SOLIDS = [COUNTER, ...STATION_ORDER.filter((id) => !STATION_LAYOUT[id].onCounter).map((id) => STATION_LAYOUT[id].rect)];

export function stationCenter(id) {
  const r = STATION_LAYOUT[id].rect;
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function collides(x, y, radius = PLAYER_RADIUS) {
  if (x - radius < FLOOR.x || x + radius > FLOOR.x + FLOOR.w) return true;
  if (y - radius < FLOOR.y || y + radius > FLOOR.y + FLOOR.h) return true;
  for (const rect of SOLIDS) if (circleHitsRect(x, y, radius, rect)) return true;
  return false;
}

// Move com colisão separada por eixo: desliza ao longo das bancadas.
export function moveWithCollision(pos, dx, dy, radius = PLAYER_RADIUS) {
  let moved = false;
  if (dx !== 0) {
    const nx = pos.x + dx;
    if (!collides(nx, pos.y, radius)) { pos.x = nx; moved = true; }
  }
  if (dy !== 0) {
    const ny = pos.y + dy;
    if (!collides(pos.x, ny, radius)) { pos.y = ny; moved = true; }
  }
  return moved;
}

// Estação mais próxima ao alcance do chef (distância até a borda do retângulo).
export function nearestStation(x, y, ids = STATION_ORDER) {
  let best = null;
  let bestDist = Infinity;
  let bestCenter = Infinity;
  for (const id of ids) {
    const layout = STATION_LAYOUT[id];
    const d = distanceToRect(x, y, layout.rect);
    if (d > REACH) continue;
    const c = stationCenter(id);
    const cd = distance(x, y, c.x, c.y);
    if (d < bestDist - 0.5 || (Math.abs(d - bestDist) <= 0.5 && cd < bestCenter)) {
      best = id;
      bestDist = d;
      bestCenter = cd;
    }
  }
  return best;
}

export function stationAt(wx, wy) {
  // Prioriza estações do chão (menores) sobre o balcão.
  for (const id of STATION_ORDER) {
    if (STATION_LAYOUT[id].onCounter) continue;
    if (pointInRect(wx, wy, STATION_LAYOUT[id].rect)) return id;
  }
  // Clientes são desenhados acima do balcão: clicar neles também conta.
  for (const id of STATION_ORDER) {
    const layout = STATION_LAYOUT[id];
    if (!layout.onCounter) continue;
    const r = layout.rect;
    const area = layout.kind === 'seat' ? { x: r.x + 20, y: 40, w: r.w - 40, h: r.y + r.h - 40 } : r;
    if (pointInRect(wx, wy, area)) return id;
  }
  return null;
}

// ---------- Navegação ----------
export const NAV_CELL = 12;

export function createNavGrid() {
  const cols = Math.ceil(WORLD.w / NAV_CELL);
  const rows = Math.ceil(WORLD.h / NAV_CELL);
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * NAV_CELL + NAV_CELL / 2;
      const y = r * NAV_CELL + NAV_CELL / 2;
      blocked[r * cols + c] = collides(x, y, PLAYER_RADIUS + 1) ? 1 : 0;
    }
  }
  return { cols, rows, blocked };
}

function cellOf(grid, x, y) {
  return {
    c: clamp(Math.floor(x / NAV_CELL), 0, grid.cols - 1),
    r: clamp(Math.floor(y / NAV_CELL), 0, grid.rows - 1),
  };
}

function nearestOpenCell(grid, cell) {
  if (!grid.blocked[cell.r * grid.cols + cell.c]) return cell;
  for (let radius = 1; radius < 8; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const r = cell.r + dr;
        const c = cell.c + dc;
        if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) continue;
        if (!grid.blocked[r * grid.cols + c]) return { r, c };
      }
    }
  }
  return null;
}

// A* em grade 8-direções com limite de nós; retorna lista de pontos ou null.
export function findPath(grid, from, to, maxNodes = 4000) {
  const start = nearestOpenCell(grid, cellOf(grid, from.x, from.y));
  const goal = nearestOpenCell(grid, cellOf(grid, to.x, to.y));
  if (!start || !goal) return null;
  const { cols, rows, blocked } = grid;
  const key = (r, c) => r * cols + c;
  const goalKey = key(goal.r, goal.c);
  const g = new Map([[key(start.r, start.c), 0]]);
  const came = new Map();
  const open = [{ k: key(start.r, start.c), r: start.r, c: start.c, f: 0 }];
  const closed = new Set();
  const h = (r, c) => {
    const dr = Math.abs(r - goal.r);
    const dc = Math.abs(c - goal.c);
    return Math.max(dr, dc) + 0.414 * Math.min(dr, dc);
  };
  let expanded = 0;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (closed.has(cur.k)) continue;
    if (cur.k === goalKey) {
      const cells = [cur.k];
      let k = cur.k;
      while (came.has(k)) { k = came.get(k); cells.push(k); }
      cells.reverse();
      const points = cells.map((ck) => ({ x: (ck % cols) * NAV_CELL + NAV_CELL / 2, y: Math.floor(ck / cols) * NAV_CELL + NAV_CELL / 2 }));
      points.push({ x: to.x, y: to.y });
      return smoothPath(from, points);
    }
    closed.add(cur.k);
    if (++expanded > maxNodes) return null;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r = cur.r + dr;
        const c = cur.c + dc;
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const nk = key(r, c);
        if (blocked[nk] || closed.has(nk)) continue;
        // Não corta quinas: diagonal exige os dois vizinhos livres.
        if (dr && dc && (blocked[key(cur.r + dr, cur.c)] || blocked[key(cur.r, cur.c + dc)])) continue;
        const cost = (g.get(cur.k) || 0) + (dr && dc ? 1.414 : 1);
        if (cost < (g.get(nk) ?? Infinity)) {
          g.set(nk, cost);
          came.set(nk, cur.k);
          open.push({ k: nk, r, c, f: cost + h(r, c) });
        }
      }
    }
  }
  return null;
}

export function segmentWalkable(a, b, radius = PLAYER_RADIUS) {
  const len = distance(a.x, a.y, b.x, b.y);
  const steps = Math.max(1, Math.ceil(len / 6));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (collides(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radius)) return false;
  }
  return true;
}

// Remove pontos intermediários quando há linha livre (puxa o "barbante").
function smoothPath(from, points) {
  const result = [];
  let anchor = from;
  let i = 0;
  while (i < points.length) {
    let far = i;
    for (let j = points.length - 1; j > i; j--) {
      if (segmentWalkable(anchor, points[j])) { far = j; break; }
    }
    result.push(points[far]);
    anchor = points[far];
    i = far + 1;
  }
  // O último ponto pode ser inalcançável (ex.: clique dentro de bancada).
  const last = result[result.length - 1];
  if (last && collides(last.x, last.y)) result.pop();
  return result.length ? result : null;
}

// Pontos de acesso ao redor de uma estação, ordenados pela proximidade do chef.
export function accessPoints(id, from) {
  const r = STATION_LAYOUT[id].rect;
  const gap = PLAYER_RADIUS + 8;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const pts = [
    { x: cx, y: r.y + r.h + gap }, { x: cx, y: r.y - gap },
    { x: r.x - gap, y: cy }, { x: r.x + r.w + gap, y: cy },
    { x: r.x + r.w * 0.25, y: r.y + r.h + gap }, { x: r.x + r.w * 0.75, y: r.y + r.h + gap },
  ];
  if (STATION_LAYOUT[id].kind === 'seat' || STATION_LAYOUT[id].kind === 'bell') {
    const px = clamp(from.x, r.x + 24, r.x + r.w - 24);
    pts.unshift({ x: px, y: r.y + r.h + gap });
  }
  return pts
    .filter((p) => !collides(p.x, p.y) && nearestStationIs(id, p))
    .sort((a, b) => distance(a.x, a.y, from.x, from.y) - distance(b.x, b.y, from.x, from.y));
}

function nearestStationIs(id, p) {
  return distanceToRect(p.x, p.y, STATION_LAYOUT[id].rect) <= REACH;
}
