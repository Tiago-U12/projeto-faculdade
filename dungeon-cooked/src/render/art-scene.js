// Cenário (parede da taberna, balcão, piso) e estações com estados visuais.
import { PAL, rr, ell, circle, poly, line, arcStroke, glow, sparkle, star, shade, hash, text } from './paint.js';
import { drawIngredient, drawDish, brothColor } from './art-items.js';
import { COUNTER, WORLD, FLOOR, SEAT_X, STATION_LAYOUT } from '../sim/world.js';
import { SHELVES } from '../data/ingredients.js';
import { STATION_STATE, BOARD_STATE, contentIds, isNearBurn } from '../sim/kitchen.js';

const INK = PAL.ink;

// ---------- Fundo estático ----------
// opts: { decor: [], hc: alto contraste }
export function drawBackground(ctx, opts = {}) {
  const decor = opts.decor || [];
  // Parede de pedra do salão
  const wall = ctx.createLinearGradient(0, 0, 0, COUNTER.y);
  wall.addColorStop(0, '#2c2138');
  wall.addColorStop(1, '#45324f');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, WORLD.w, COUNTER.y + 10);
  for (let row = 0; row < 8; row++) {
    const y = 16 + row * 22;
    for (let i = -1; i < 18; i++) {
      const x = i * 58 + (row % 2) * 29;
      const n = hash(row * 31 + i);
      rr(ctx, x + 2, y + 2, 54, 18, 4, n > 0.5 ? '#3d2d48' : '#433350', '#2a1f33', 1);
    }
  }
  // Janelas em arco com o luar
  for (const [i, wx] of [110, 358, 600, 846].entries()) {
    const wy = 44;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wx - 30, wy + 82);
    ctx.lineTo(wx - 30, wy + 28);
    ctx.arc(wx, wy + 28, 30, Math.PI, 0);
    ctx.lineTo(wx + 30, wy + 82);
    ctx.closePath();
    const sky = ctx.createLinearGradient(0, wy, 0, wy + 82);
    sky.addColorStop(0, '#1b2350');
    sky.addColorStop(1, '#3a3f7a');
    ctx.fillStyle = sky;
    ctx.fill();
    ctx.clip();
    for (let s = 0; s < 7; s++) circle(ctx, wx - 24 + hash(i * 9 + s) * 48, wy + 6 + hash(i * 13 + s) * 60, 1 + hash(s + i) * 0.8, '#fff6d6');
    if (i === 1) {
      glow(ctx, wx + 8, wy + 26, 30, '#fff3c4', 0.5);
      circle(ctx, wx + 8, wy + 26, 11, '#fff3c4');
      circle(ctx, wx + 13, wy + 22, 10, '#3a3f7a');
    }
    // Silhueta da dungeon lá fora
    poly(ctx, [[wx - 32, wy + 84], [wx - 22, wy + 60], [wx - 12, wy + 70], [wx, wy + 52], [wx + 12, wy + 68], [wx + 22, wy + 58], [wx + 32, wy + 84]], '#151a3a');
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(wx - 30, wy + 82);
    ctx.lineTo(wx - 30, wy + 28);
    ctx.arc(wx, wy + 28, 30, Math.PI, 0);
    ctx.lineTo(wx + 30, wy + 82);
    ctx.strokeStyle = '#7a5a4a';
    ctx.lineWidth = 5;
    ctx.stroke();
    line(ctx, wx, wy, wx, wy + 82, '#7a5a4a', 3);
    line(ctx, wx - 30, wy + 46, wx + 30, wy + 46, '#7a5a4a', 3);
    rr(ctx, wx - 36, wy + 80, 72, 7, 2, '#8a6450', INK, 1.5);
  }
  // Viga superior
  rr(ctx, 0, 0, WORLD.w, 12, 0, '#5a3a30');
  line(ctx, 0, 12, WORLD.w, 12, '#2a1a1e', 2);
  // Placa da taberna
  if (decor.includes('sign')) {
    rr(ctx, 400, 14, 168, 30, 6, '#8a5a3c', INK, 2.5);
    rr(ctx, 405, 18, 158, 22, 4, '#a7704a');
    text(ctx, 'MESA DO LUAR', 484, 30, { size: 15, color: PAL.gold, weight: 900, stroke: '#4a2d27', strokeWidth: 3 });
    sparkle(ctx, 412, 22, 4, PAL.gold);
    sparkle(ctx, 556, 36, 3, PAL.gold);
  } else {
    ctx.save();
    ctx.translate(484, 30);
    ctx.rotate(-0.06);
    rr(ctx, -70, -13, 140, 26, 5, '#5e4234', INK, 2);
    text(ctx, 'M  S   D    L  A ', 0, 1, { size: 13, color: '#9b8370', weight: 900 });
    line(ctx, -30, -12, -10, 12, '#2a1a1e', 2);
    ctx.restore();
  }
  // Prateleira com garrafas à esquerda
  rr(ctx, 26, 92, 60, 6, 2, '#6e4636', INK, 1.5);
  for (let i = 0; i < 4; i++) {
    const bx = 34 + i * 14;
    rr(ctx, bx - 4, 74, 8, 18, 3, ['#7fd18b', '#c94b4b', '#9fd8ff', '#ffd166'][i] + 'cc', INK, 1.2);
    rr(ctx, bx - 2, 70, 4, 5, 1, '#c9a27a', INK, 1);
  }
  // Lanternas penduradas sobre os lugares
  for (const lx of [SEAT_X[0] - 70, SEAT_X[1] - 70, SEAT_X[2] + 70]) {
    line(ctx, lx, 12, lx, 30, '#2a1a1e', 2);
    glow(ctx, lx, 40, 46, '#ffcf7a', 0.28);
    rr(ctx, lx - 8, 30, 16, 18, 4, '#ffcf7a', INK, 2);
    line(ctx, lx - 8, 39, lx + 8, 39, '#c98f3c', 1.4);
    rr(ctx, lx - 10, 28, 20, 4, 2, '#5a3a30', INK, 1.4);
  }
  if (decor.includes('lanterns')) {
    // Varal de vagalumes
    ctx.beginPath();
    ctx.moveTo(0, 16);
    for (let x = 0; x <= WORLD.w; x += 60) ctx.quadraticCurveTo(x + 30, 30, x + 60, 16);
    ctx.strokeStyle = '#2a1a1e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (let x = 30; x < WORLD.w; x += 60) {
      glow(ctx, x, 24, 10, '#d9ff8a', 0.7);
      circle(ctx, x, 24, 2.6, '#eaffb0');
    }
  }
  drawCounter(ctx);
  drawFloor(ctx, decor);
}

function drawCounter(ctx) {
  const { x, y, w, h } = COUNTER;
  // Frente do balcão
  rr(ctx, x, y + 16, w, h - 14, 4, '#7a4c38', INK, 2.5);
  for (let px = x + 16; px < x + w - 10; px += 48) {
    rr(ctx, px, y + 26, 38, h - 34, 4, '#6a3f30', '#4a2a22', 1.5);
  }
  line(ctx, x, y + h - 6, x + w, y + h - 6, '#c9a27a', 2);
  // Tampo
  rr(ctx, x - 6, y, w + 12, 22, 6, '#c08a5c', INK, 2.5);
  for (let px = x + 30; px < x + w; px += 90) line(ctx, px, y + 3, px, y + 19, '#a8744c', 1.5);
  line(ctx, x, y + 6, x + w, y + 6, '#d9a877', 1.5);
  // Jogos americanos nos três lugares
  for (const sx of SEAT_X) {
    rr(ctx, sx - 34, y + 3, 68, 15, 6, '#e9d6b2', '#8a6450', 1.5);
    rr(ctx, sx - 28, y + 6, 56, 9, 4, '#f4e6c8');
  }
  // Torneiras de chope à esquerda
  for (let i = 0; i < 2; i++) {
    const tx = 44 + i * 26;
    rr(ctx, tx - 3, y - 18, 6, 20, 2, '#c9a24a', INK, 1.4);
    circle(ctx, tx, y - 20, 5, '#3a2c48', INK, 1.4);
  }
  rr(ctx, 36, y + 2, 44, 10, 3, '#8a6450', INK, 1.2);
}

function drawFloor(ctx, decor) {
  const { x, y, w, h } = FLOOR;
  ctx.fillStyle = '#9c7158';
  ctx.fillRect(0, y, WORLD.w, WORLD.h - y);
  const tile = 38;
  for (let ty = y; ty < y + h; ty += tile) {
    for (let tx = x; tx < x + w; tx += tile) {
      const n = hash(tx * 0.13 + ty * 7.1);
      const odd = ((tx - x) / tile + (ty - y) / tile) % 2 === 0;
      const base = odd ? '#c49674' : '#b9896a';
      rr(ctx, tx + 1, ty + 1, tile - 2, tile - 2, 4, shade(base, (n - 0.5) * 0.08));
      line(ctx, tx + 4, ty + 3, tx + tile - 6, ty + 3, '#ffffff1a', 1.5);
    }
  }
  // Sombra do balcão no piso
  const sh = ctx.createLinearGradient(0, y, 0, y + 26);
  sh.addColorStop(0, '#2a1a1e88');
  sh.addColorStop(1, '#2a1a1e00');
  ctx.fillStyle = sh;
  ctx.fillRect(x, y, w, 26);
  // Paredes laterais e rodapé
  ctx.fillStyle = '#3a2a40';
  ctx.fillRect(0, y, x, WORLD.h - y);
  ctx.fillRect(x + w, y, WORLD.w - x - w, WORLD.h - y);
  ctx.fillRect(0, y + h, WORLD.w, WORLD.h - y - h);
  line(ctx, x, y, x, y + h, '#6e5470', 3);
  line(ctx, x + w, y, x + w, y + h, '#6e5470', 3);
  line(ctx, x, y + h, x + w, y + h, '#6e5470', 3);
  // Tapete (reforma) ou círculo rúnico
  const cx = 484;
  const cy = 488;
  if (decor.includes('rug')) {
    rr(ctx, cx - 170, cy - 64, 340, 128, 26, '#7a3f5a', INK, 2.5);
    rr(ctx, cx - 158, cy - 52, 316, 104, 20, '#9a5272', PAL.gold, 2);
    for (let i = 0; i < 6; i++) {
      const fx = cx - 120 + i * 48;
      circle(ctx, fx, cy, 9, '#e9b858', INK, 1.4);
      heartPattern(ctx, fx, cy);
    }
    for (let i = 0; i < 14; i++) {
      line(ctx, cx - 160 + i * 24, cy + 64, cx - 160 + i * 24, cy + 72, '#e9d6b2', 2);
      line(ctx, cx - 160 + i * 24, cy - 64, cx - 160 + i * 24, cy - 72, '#e9d6b2', 2);
    }
  }
  ctx.save();
  ctx.globalAlpha = 0.16;
  arcStroke(ctx, cx, cy, 58, 0, Math.PI * 2, '#fff6d4', 3);
  arcStroke(ctx, cx, cy, 44, 0, Math.PI * 2, '#fff6d4', 2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    line(ctx, cx + Math.cos(a) * 44, cy + Math.sin(a) * 44, cx + Math.cos(a) * 58, cy + Math.sin(a) * 58, '#fff6d4', 2);
  }
  star(ctx, cx, cy, 14, null, '#fff6d4', 6, 0.5);
  ctx.restore();
}

function heartPattern(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y + 4);
  ctx.bezierCurveTo(x - 6, y - 1, x - 3, y - 6, x, y - 2);
  ctx.bezierCurveTo(x + 3, y - 6, x + 6, y - 1, x, y + 4);
  ctx.fillStyle = '#c94b4b';
  ctx.fill();
}

// ---------- Estações ----------
function rectOf(id) {
  return STATION_LAYOUT[id].rect;
}

export function drawPantry(ctx, id, unlocked, available, t, highlight = null) {
  const { x, y, w, h } = rectOf(id);
  const arcane = id === 'arcano';
  const body = arcane ? '#4a3560' : id === 'horta' ? '#6e4e36' : '#7a4c38';
  ell(ctx, x + w / 2, y + h + 2, w / 2, 7, '#1d163255');
  rr(ctx, x, y + 6, w, h - 6, 8, shade(body, -0.25), INK, 2.5);
  rr(ctx, x, y, w, h - 10, 8, body, INK, 2.5);
  rr(ctx, x + 6, y + 6, w - 12, h - 22, 5, shade(body, -0.35));
  line(ctx, x + 6, y + (h - 10) / 2 + 2, x + w - 6, y + (h - 10) / 2 + 2, shade(body, 0.15), 3);
  const items = SHELVES[STATION_LAYOUT[id].shelf].items;
  items.forEach((ing, i) => {
    const cx = x + 30 + (i % 2) * 50;
    const cy = y + 18 + Math.floor(i / 2) * 26;
    const isOpen = available && unlocked.includes(ing);
    if (highlight === ing) glow(ctx, cx, cy, 18, '#fff6c9', 0.8);
    drawIngredient(ctx, ing, { x: cx, y: cy, size: 24, silhouette: !isOpen });
    if (!isOpen && available) {
      // Cadeado pequeno: ainda não desbloqueado nesta noite
      rr(ctx, cx + 4, cy + 1, 9, 7, 2, '#c9a24a', INK, 1);
      arcStroke(ctx, cx + 8.5, cy + 1, 3, Math.PI, Math.PI * 2, INK, 1.4);
    }
  });
  if (arcane) {
    if (available) {
      const pulse = 0.4 + Math.sin(t * 2) * 0.15;
      ctx.save();
      ctx.globalAlpha = pulse;
      arcStroke(ctx, x + w / 2, y + 2, 10, Math.PI * 1.1, Math.PI * 1.9, PAL.mint, 2);
      ctx.restore();
      sparkle(ctx, x + w - 10, y + 6, 3, PAL.mint);
    } else {
      // Correntes e cadeado: trancado até a Noite 2
      line(ctx, x + 4, y + 8, x + w - 4, y + h - 16, '#8b8796', 3);
      line(ctx, x + w - 4, y + 8, x + 4, y + h - 16, '#8b8796', 3);
      rr(ctx, x + w / 2 - 10, y + h / 2 - 12, 20, 16, 3, '#c9a24a', INK, 2);
      arcStroke(ctx, x + w / 2, y + h / 2 - 12, 6, Math.PI, Math.PI * 2, INK, 3);
    }
  }
}

export function drawBoard(ctx, board, t, available = true) {
  const { x, y, w, h } = rectOf('board');
  ell(ctx, x + w / 2, y + h + 2, w / 2, 7, '#1d163255');
  rr(ctx, x, y + 8, w, h - 8, 8, '#5e4150', INK, 2.5);
  rr(ctx, x, y, w, h - 12, 8, '#8a5a40', INK, 2.5);
  rr(ctx, x + 12, y + 7, w - 24, h - 26, 7, '#e2b77f', INK, 2);
  for (let i = 0; i < 4; i++) line(ctx, x + 18, y + 14 + i * 7, x + w - 30, y + 12 + i * 7, '#c99a62', 1);
  // Faca
  const chopping = board.chopAnim > 0;
  ctx.save();
  ctx.translate(x + w - 26, y + 16);
  ctx.rotate(chopping ? -0.9 + (1 - board.chopAnim) * 0.9 : 0.15);
  rr(ctx, -2, -2, 22, 7, 3, '#d9e2ec', INK, 1.6);
  rr(ctx, 18, -2, 12, 7, 2, '#5a3a30', INK, 1.6);
  ctx.restore();
  if (board.item) {
    const done = board.state === BOARD_STATE.DONE;
    drawIngredient(ctx, board.item.id, { x: x + w / 2 - 8, y: y + 22 + (chopping ? 1 : 0), size: 30, prepared: done });
    // Progresso dos cortes: pontos preenchidos
    for (let i = 0; i < 2; i++) circle(ctx, x + w / 2 - 14 + i * 12, y + h - 4, 4.5, i < board.chops ? PAL.mint : '#3a2c48', INK, 1.4);
  }
}

export function drawCauldron(ctx, st, t, opts = {}) {
  const { x, y, w, h } = rectOf('cauldron');
  const cx = x + w / 2;
  const cy = y + h / 2 + 4;
  // Lareira de pedra
  ell(ctx, cx, y + h - 6, w / 2 + 2, 14, '#3a2a40', INK, 2.5);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.05 + i * 0.15);
    ell(ctx, cx + Math.cos(a) * (w / 2 - 4), y + h - 6 + Math.sin(a) * 9, 9, 6, i % 2 ? '#6b5872' : '#5d4b66', INK, 1.4);
  }
  // Fogo
  const busy = st.state === STATION_STATE.PROCESSING;
  const fireScale = busy ? 1.2 : st.state === STATION_STATE.EMPTY ? 0.5 : 0.8;
  for (let i = -2; i <= 2; i++) {
    const fh = (14 + Math.sin(t * 9 + i * 1.7) * 4) * fireScale;
    const fx = cx + i * 13;
    ctx.beginPath();
    ctx.moveTo(fx - 7, y + h - 4);
    ctx.quadraticCurveTo(fx - 6, y + h - 4 - fh, fx, y + h - 6 - fh * 1.3);
    ctx.quadraticCurveTo(fx + 6, y + h - 4 - fh, fx + 7, y + h - 4);
    ctx.fillStyle = i % 2 ? PAL.fire : '#ff7a2f';
    ctx.fill();
  }
  glow(ctx, cx, y + h - 10, 44 * fireScale, '#ff9b3d', 0.35);
  // Panela
  ell(ctx, cx, cy + 2, w / 2 - 6, h / 2 - 10, PAL.iron, INK, 3);
  ell(ctx, cx - 10, cy + 6, 16, 12, PAL.ironLight);
  rr(ctx, x + 2, cy - 18, 12, 8, 3, PAL.ironLight, INK, 2);
  rr(ctx, x + w - 14, cy - 18, 12, 8, 3, PAL.ironLight, INK, 2);
  ell(ctx, cx, cy - 12, w / 2 - 8, 14, '#1b1825', INK, 3);
  // Conteúdo
  const ids = contentIds(st);
  let liquid = '#3d4f6b';
  if (st.state === STATION_STATE.LOADING) liquid = brothColor(ids);
  else if (busy || st.state === STATION_STATE.READY) liquid = brothColor(st.recipeId ? opts.recipeIngredients || ids : ids);
  else if (st.state === STATION_STATE.SPOILED) liquid = '#2a2226';
  if (opts.whisper) liquid = '#a6edd8';
  ell(ctx, cx, cy - 11, w / 2 - 14, 9, liquid);
  if (st.state !== STATION_STATE.EMPTY || opts.whisper) {
    for (let i = 0; i < 5; i++) {
      const bp = (t * (busy ? 2.2 : 1) + i * 0.37) % 1;
      const bx = cx - 26 + i * 13 + Math.sin(i * 3.1) * 3;
      circle(ctx, bx, cy - 10 - bp * 4, 2 + bp * 2.5, shade(liquid, 0.35));
    }
  }
  if (opts.whisper) {
    glow(ctx, cx, cy - 20, 50, '#a6edd8', 0.45 + Math.sin(t * 4) * 0.15);
    for (let i = 0; i < 3; i++) sparkle(ctx, cx - 20 + i * 20, cy - 30 - ((t * 20 + i * 11) % 24), 3, '#ffffff');
  }
  if (st.state === STATION_STATE.LOADING) {
    ids.forEach((id, i) => drawIngredient(ctx, id, { x: cx - 16 + i * 16, y: cy - 22 + Math.sin(t * 3 + i) * 2, size: 18, prepared: true }));
  }
}

export function drawColdBench(ctx, st, t) {
  const { x, y, w, h } = rectOf('cold');
  ell(ctx, x + w / 2, y + h + 2, w / 2, 7, '#1d163255');
  rr(ctx, x, y + 8, w, h - 8, 8, '#4f6b86', INK, 2.5);
  rr(ctx, x, y, w, h - 12, 8, '#cfe8f5', INK, 2.5);
  rr(ctx, x + 6, y + 5, w - 12, h - 24, 6, '#e6f6ff');
  // Cristais de gelo nas bordas
  for (const [px, py] of [[x + 10, y + 8], [x + w - 12, y + 10], [x + 14, y + h - 18]]) sparkle(ctx, px, py, 4, '#ffffff');
  line(ctx, x + 6, y + h - 14, x + w - 6, y + h - 14, '#9fc9e0', 2);
  const cx = x + w / 2;
  const cy = y + 22;
  ell(ctx, cx, cy + 4, 24, 9, '#ffffff', '#9fc9e0', 1.5);
  if (st.state === STATION_STATE.LOADING) {
    contentIds(st).forEach((id, i) => drawIngredient(ctx, id, { x: cx - 10 + i * 18, y: cy, size: 20, prepared: true }));
  } else if (st.dish) {
    drawDish(ctx, st.dish.recipeId, { x: cx, y: cy - 2, size: 34, quality: st.dish.quality, t });
  }
}

export function drawOven(ctx, st, t, available) {
  const { x, y, w, h } = rectOf('oven');
  ell(ctx, x + w / 2, y + h + 2, w / 2, 7, '#1d163255');
  const brick = available ? '#a8563f' : '#7a6a66';
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h);
  ctx.lineTo(x + 4, y + 34);
  ctx.quadraticCurveTo(x + w / 2, y - 22, x + w - 4, y + 34);
  ctx.lineTo(x + w - 4, y + h);
  ctx.closePath();
  ctx.fillStyle = brick;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 6; col++) {
      const bx = x + col * 22 + (row % 2) * 11;
      const by = y + 6 + row * 12;
      rr(ctx, bx, by, 20, 10, 2, shade(brick, (hash(row * 7 + col) - 0.5) * 0.2), shade(brick, -0.3), 1);
    }
  }
  ctx.restore();
  // Boca do forno
  const busy = st.state === STATION_STATE.PROCESSING;
  const mx = x + w / 2;
  const my = y + h - 10;
  ctx.beginPath();
  ctx.moveTo(mx - 28, my);
  ctx.lineTo(mx - 28, my - 24);
  ctx.arc(mx, my - 24, 28, Math.PI, 0);
  ctx.lineTo(mx + 28, my);
  ctx.closePath();
  ctx.fillStyle = available ? (busy ? '#ff9b3d' : '#3b1d16') : '#2a2226';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  if (available) {
    const heat = busy ? 0.7 + Math.sin(t * 7) * 0.15 : st.state === STATION_STATE.EMPTY ? 0.15 : 0.35;
    glow(ctx, mx, my - 14, 34, '#ffcf7a', heat);
    for (let i = -1; i <= 1; i++) {
      const fh = 10 + Math.sin(t * 8 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(mx + i * 12 - 6, my);
      ctx.quadraticCurveTo(mx + i * 12, my - fh * 1.6, mx + i * 12 + 6, my);
      ctx.fillStyle = busy ? '#ffd36b' : '#ff7a2f';
      ctx.fill();
    }
    if (st.dish) drawDish(ctx, st.dish.recipeId, { x: mx, y: my - 30, size: 30, quality: st.dish.quality, t });
  } else {
    // Rachaduras e teia: forno quebrado
    line(ctx, x + 20, y + 30, x + 34, y + 46, '#2a1a1e', 2);
    line(ctx, x + 34, y + 46, x + 28, y + 58, '#2a1a1e', 2);
    line(ctx, x + w - 22, y + 26, x + w - 30, y + 40, '#2a1a1e', 2);
    ctx.save();
    ctx.globalAlpha = 0.6;
    for (let r = 6; r <= 18; r += 6) arcStroke(ctx, x + w - 10, y + h - 12, r, Math.PI, Math.PI * 1.5, '#e9e4ff', 1);
    line(ctx, x + w - 10, y + h - 12, x + w - 28, y + h - 12, '#e9e4ff', 1);
    line(ctx, x + w - 10, y + h - 12, x + w - 10, y + h - 30, '#e9e4ff', 1);
    ctx.restore();
  }
  // Chaminé
  rr(ctx, x + w / 2 - 9, y - 10, 18, 16, 3, shade(brick, -0.2), INK, 2);
}

export function drawGrill(ctx, st, t, available) {
  const { x, y, w, h } = rectOf('grill');
  ell(ctx, x + w / 2, y + h + 2, w / 2, 7, '#1d163255');
  if (!available) {
    // Caixotes empilhados: a grelha chega na Noite 4
    rr(ctx, x + 6, y + 22, 50, 48, 4, '#a77450', INK, 2);
    rr(ctx, x + 54, y + 30, 46, 40, 4, '#b98765', INK, 2);
    rr(ctx, x + 24, y - 2, 44, 28, 4, '#c99a6b', INK, 2);
    for (const [bx, by, bw, bh] of [[x + 6, y + 22, 50, 48], [x + 54, y + 30, 46, 40], [x + 24, y - 2, 44, 28]]) {
      line(ctx, bx + 4, by + 4, bx + bw - 4, by + bh - 4, '#6e4636', 2);
      line(ctx, bx + bw - 4, by + 4, bx + 4, by + bh - 4, '#6e4636', 2);
    }
    return;
  }
  rr(ctx, x, y + 10, w, h - 10, 8, '#4b4760', INK, 2.5);
  rr(ctx, x + 6, y + 4, w - 12, h - 22, 6, '#24202e', INK, 2.5);
  const busy = st.state === STATION_STATE.PROCESSING;
  // Brasas
  for (let i = 0; i < 9; i++) {
    const bx = x + 16 + (i % 5) * 19;
    const by = y + 16 + Math.floor(i / 5) * 18;
    const heat = 0.5 + Math.sin(t * 5 + i) * 0.3;
    circle(ctx, bx, by, 6, busy ? `rgba(255,${120 + heat * 80},60,1)` : '#7a3a2a');
  }
  glow(ctx, x + w / 2, y + 26, 50, '#ff9b3d', busy ? 0.5 : 0.18);
  for (let i = 0; i < 6; i++) line(ctx, x + 12 + i * 18, y + 8, x + 12 + i * 18, y + h - 22, '#9aa6b8', 3);
  line(ctx, x + 8, y + 18, x + w - 8, y + 18, '#9aa6b8', 2);
  line(ctx, x + 8, y + 34, x + w - 8, y + 34, '#9aa6b8', 2);
  if (busy) {
    for (let i = 0; i < 3; i++) {
      const fx = x + 30 + i * 25;
      const fh = 8 + Math.sin(t * 9 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(fx - 5, y + 30);
      ctx.quadraticCurveTo(fx, y + 30 - fh * 2, fx + 5, y + 30);
      ctx.fillStyle = '#ffd36b';
      ctx.fill();
    }
    if (st.contents.length) drawIngredient(ctx, st.contents[0].id, { x: x + w / 2, y: y + 24, size: 30, prepared: true });
  }
  if (st.state === STATION_STATE.LOADING) {
    contentIds(st).forEach((id, i) => drawIngredient(ctx, id, { x: x + 36 + i * 30, y: y + 24, size: 24, prepared: true }));
  }
  if (st.dish) drawDish(ctx, st.dish.recipeId, { x: x + w / 2, y: y + 22, size: 34, quality: st.dish.quality, t });
}

export function drawTrash(ctx, t, hasItems) {
  const { x, y, w, h } = rectOf('trash');
  ell(ctx, x + w / 2, y + h + 2, w / 2, 6, '#1d163255');
  rr(ctx, x + 6, y + 10, w - 12, h - 10, 10, '#6b7f86', INK, 2.5);
  for (let i = 0; i < 3; i++) line(ctx, x + 18 + i * 14, y + 18, x + 18 + i * 14, y + h - 6, '#4f6066', 2);
  ctx.save();
  const lift = hasItems ? -0.15 : 0;
  ctx.translate(x + 4, y + 10);
  ctx.rotate(lift);
  rr(ctx, 0, -6, w - 8, 10, 4, '#7f949b', INK, 2.5);
  rr(ctx, (w - 8) / 2 - 7, -11, 14, 6, 3, '#5a6b70', INK, 2);
  ctx.restore();
}

export function drawBell(ctx, cooldown, total, available, t, ringing = 0) {
  const { x, y, w, h } = rectOf('bell');
  const cx = x + w / 2;
  const cy = y + 22;
  rr(ctx, x + 10, y + h - 26, w - 20, 10, 3, '#6e4636', INK, 2);
  line(ctx, cx - 20, y + h - 24, cx - 20, cy - 16, '#5a3a30', 4);
  line(ctx, cx + 20, y + h - 24, cx + 20, cy - 16, '#5a3a30', 4);
  line(ctx, cx - 22, cy - 16, cx + 22, cy - 16, '#5a3a30', 4);
  ctx.save();
  ctx.translate(cx, cy - 14);
  ctx.rotate(Math.sin(t * 25) * 0.4 * ringing);
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.quadraticCurveTo(-14, 0, 0, 0);
  ctx.quadraticCurveTo(14, 0, 14, 22);
  ctx.closePath();
  ctx.fillStyle = available ? PAL.gold : '#9b8a6a';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  rr(ctx, -16, 20, 32, 5, 2, available ? PAL.goldDeep : '#7a6a50', INK, 1.6);
  circle(ctx, 0, 27, 3, available ? PAL.goldDeep : '#7a6a50', INK, 1.4);
  if (available) ell(ctx, -6, 9, 2.4, 6, '#fff3c4');
  ctx.restore();
  if (!available) {
    // Pano amarrado: sino mudo
    poly(ctx, [[cx - 16, cy + 2], [cx + 16, cy - 2], [cx + 14, cy + 8], [cx - 14, cy + 12]], '#c9b8a0', INK, 1.6);
    line(ctx, cx + 14, cy + 4, cx + 22, cy + 12, '#c9b8a0', 2);
  } else if (cooldown > 0) {
    arcStroke(ctx, cx, cy - 2, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cooldown / total), PAL.mint, 3);
  } else {
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.2;
    sparkle(ctx, cx + 20, cy - 18, 4, PAL.gold);
    ctx.restore();
  }
}

export function isHot(st) {
  return st.state === STATION_STATE.READY && isNearBurn(st);
}
