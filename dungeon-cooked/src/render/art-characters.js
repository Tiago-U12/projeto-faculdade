// Chef fantasma e os oito clientes, desenhados com caminhos de Canvas.
// Clientes são bustos atrás do balcão: (x, baseY) é a base central do tronco.
import { PAL, rr, ell, circle, poly, line, arcStroke, glow, sparkle, heart, shade } from './paint.js';
import { CUSTOMERS } from '../data/customers.js';

const INK = PAL.ink;

// ---------- Rostos ----------
function blinkAt(t, seed = 0) {
  const p = (t + seed * 1.7) % 4.2;
  return p > 4.05;
}

export function drawFace(ctx, cx, cy, mood, t, o = {}) {
  const gap = o.gap ?? 8;
  const eye = o.eye ?? '#2f2940';
  const blink = o.noBlink ? false : blinkAt(t, o.seed || 0);
  const ey = cy;
  const my = cy + (o.mouthY ?? 9);
  // Bochechas
  if (mood === 'happy' || o.blush) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ell(ctx, cx - gap - 4, ey + 6, 4, 2.4, '#ff8fa3');
    ell(ctx, cx + gap + 4, ey + 6, 4, 2.4, '#ff8fa3');
    ctx.restore();
  }
  // Sobrancelhas
  const brow = o.brow ?? shade(eye, 0.1);
  ctx.lineCap = 'round';
  if (mood === 'angry') {
    line(ctx, cx - gap - 4, ey - 7, cx - gap + 3, ey - 4, brow, 2.4);
    line(ctx, cx + gap + 4, ey - 7, cx + gap - 3, ey - 4, brow, 2.4);
  } else if (mood === 'impatient') {
    line(ctx, cx - gap - 4, ey - 6, cx - gap + 3, ey - 7, brow, 2);
    line(ctx, cx + gap + 4, ey - 6, cx + gap - 3, ey - 7, brow, 2);
  } else if (mood === 'sad') {
    line(ctx, cx - gap - 3, ey - 5, cx - gap + 3, ey - 8, brow, 2);
    line(ctx, cx + gap + 3, ey - 5, cx + gap - 3, ey - 8, brow, 2);
  } else if (mood === 'confused') {
    line(ctx, cx - gap - 3, ey - 6, cx - gap + 3, ey - 6, brow, 2);
    arcStroke(ctx, cx + gap, ey - 6, 4, Math.PI * 1.15, Math.PI * 1.85, brow, 2);
  } else if (o.sarcastic) {
    line(ctx, cx - gap - 3, ey - 6, cx - gap + 3, ey - 6, brow, 2);
    arcStroke(ctx, cx + gap, ey - 5, 4, Math.PI * 1.2, Math.PI * 1.8, brow, 2);
  }
  // Olhos
  if (mood === 'happy' || o.serene) {
    arcStroke(ctx, cx - gap, ey + 1, 3.4, Math.PI * 1.1, Math.PI * 1.9, eye, 2.2);
    arcStroke(ctx, cx + gap, ey + 1, 3.4, Math.PI * 1.1, Math.PI * 1.9, eye, 2.2);
  } else if (blink) {
    line(ctx, cx - gap - 3, ey, cx - gap + 3, ey, eye, 2);
    line(ctx, cx + gap - 3, ey, cx + gap + 3, ey, eye, 2);
  } else {
    const ry = o.big ? 4.2 : 3.4;
    const rx = o.big ? 3.4 : 2.7;
    ell(ctx, cx - gap, ey, rx, ry, eye);
    ell(ctx, cx + gap, ey, rx, ry, eye);
    circle(ctx, cx - gap + 1, ey - 1.4, 1.1, '#ffffff');
    circle(ctx, cx + gap + 1, ey - 1.4, 1.1, '#ffffff');
    if (o.lids) {
      // Pálpebras pesadas (sarcasmo)
      ctx.fillStyle = o.lids;
      ctx.fillRect(cx - gap - 4, ey - 5, 8, 3.6);
      ctx.fillRect(cx + gap - 4, ey - 5, 8, 3.6);
    }
  }
  // Boca
  const mouth = o.mouth ?? '#5b2f3e';
  switch (mood) {
    case 'happy':
      ctx.beginPath();
      ctx.moveTo(cx - 6, my - 1);
      ctx.quadraticCurveTo(cx, my + 8, cx + 6, my - 1);
      ctx.closePath();
      ctx.fillStyle = mouth;
      ctx.fill();
      ell(ctx, cx, my + 2.6, 2.6, 1.4, '#ff8fa3');
      break;
    case 'angry':
      arcStroke(ctx, cx, my + 5, 5, Math.PI * 1.2, Math.PI * 1.8, mouth, 2.2);
      break;
    case 'sad':
      arcStroke(ctx, cx, my + 4, 4, Math.PI * 1.2, Math.PI * 1.8, mouth, 2);
      break;
    case 'impatient':
      line(ctx, cx - 4, my + 1, cx + 4, my, mouth, 2.2);
      break;
    case 'confused':
      ctx.beginPath();
      ctx.moveTo(cx - 5, my + 1);
      ctx.quadraticCurveTo(cx - 2, my - 2, cx, my + 1);
      ctx.quadraticCurveTo(cx + 2, my + 3, cx + 5, my);
      ctx.strokeStyle = mouth;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case 'surprised':
      ell(ctx, cx, my + 1, 2.6, 3.2, mouth);
      break;
    default:
      if (o.sarcastic) {
        ctx.beginPath();
        ctx.moveTo(cx - 4, my + 1);
        ctx.quadraticCurveTo(cx + 2, my + 2, cx + 5, my - 2);
        ctx.strokeStyle = mouth;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else arcStroke(ctx, cx, my - 1, 4, 0.25, Math.PI - 0.25, mouth, 2);
  }
  // Detalhes de humor
  if (mood === 'impatient') {
    ctx.beginPath();
    const sx = cx + gap + 9;
    const sy = ey - 8 + (Math.sin(t * 4) + 1) * 1.5;
    ctx.moveTo(sx, sy - 4);
    ctx.quadraticCurveTo(sx + 3, sy, sx, sy + 2);
    ctx.quadraticCurveTo(sx - 3, sy, sx, sy - 4);
    ctx.fillStyle = '#9fd8ff';
    ctx.fill();
  }
  if (mood === 'angry') {
    const vx = cx + gap + 7;
    const vy = ey - 12;
    ctx.strokeStyle = '#ff5a4a';
    ctx.lineWidth = 1.8;
    for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
      ctx.beginPath();
      ctx.moveTo(vx + dx * 0.3, vy + dy * 0.3);
      ctx.lineTo(vx + dx * 1.4, vy + dy * 1.4);
      ctx.stroke();
    }
  }
  if (mood === 'sad') ell(ctx, cx - gap, ey + 6, 1.4, 2.4, '#9fd8ff');
}

// ---------- Chef fantasma ----------
// pose: { face: 1|-1, t, walking, anim: 'chop'|'pick'|'drop'|null, mood }
export function drawChef(ctx, x, y, pose = {}) {
  const t = pose.t || 0;
  const bob = pose.reduced ? 0 : Math.sin(t * 5) * 2;
  const tilt = pose.walking ? Math.sin(pose.walkCycle || 0) * 0.08 : 0;
  ctx.save();
  ctx.translate(x, y);
  // Sombra no chão (fantasma flutua: sombra pequena e suave).
  ell(ctx, 0, 22, 18 - bob, 6, '#1d163266');
  glow(ctx, 0, 2, 40, '#c9bfff', 0.18);
  ctx.translate(0, bob - 2);
  ctx.rotate(tilt);
  ctx.scale(pose.face || 1, 1);
  const body = '#eef8ff';
  const bodyShade = '#c7e3f0';
  // Braços
  const chop = pose.anim === 'chop';
  const armA = chop ? -0.9 + Math.sin(t * 30) * 0.4 : Math.sin(t * 7) * 0.15;
  ctx.lineCap = 'round';
  ctx.save();
  ctx.translate(-15, -2);
  ctx.rotate(-0.4 - Math.sin(t * 7) * 0.15);
  line(ctx, 0, 0, -12, 2, INK, 11);
  line(ctx, 0, 0, -12, 2, body, 7);
  ctx.restore();
  ctx.save();
  ctx.translate(15, -2);
  ctx.rotate(armA);
  line(ctx, 0, 0, 13, -2, INK, 11);
  line(ctx, 0, 0, 13, -2, body, 7);
  if (chop) {
    rr(ctx, 12, -10, 4, 12, 1, '#c9d6e2', INK, 1.4);
    rr(ctx, 11, 1, 6, 6, 2, PAL.woodDark, INK, 1.2);
  }
  ctx.restore();
  // Corpo com cauda ondulada
  const wave = Math.sin(t * 6) * 2;
  ctx.beginPath();
  ctx.moveTo(-18, -14);
  ctx.quadraticCurveTo(-25, -2, -21, 12);
  ctx.lineTo(-21, 20);
  ctx.quadraticCurveTo(-13, 14 + wave, -6, 22);
  ctx.quadraticCurveTo(0, 27 - wave, 6, 20);
  ctx.quadraticCurveTo(13, 16 + wave, 21, 23);
  ctx.lineTo(22, -6);
  ctx.quadraticCurveTo(20, -26, 0, -27);
  ctx.quadraticCurveTo(-13, -28, -18, -14);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ell(ctx, 10, 8, 14, 20, bodyShade);
  ctx.restore();
  // Avental
  rr(ctx, -12, 3, 24, 15, 5, '#f0a8a6', INK, 2);
  rr(ctx, -6, 7, 12, 6, 2, '#e48d8b');
  sparkle(ctx, 0, 10, 3, '#fff0b6');
  line(ctx, -12, 4, -17, -4, INK, 1.6);
  line(ctx, 12, 4, 17, -4, INK, 1.6);
  // Chapéu de chef
  rr(ctx, -16, -38, 32, 13, 4, '#fff7ea', INK, 2.2);
  ell(ctx, -10, -42, 11, 10, '#fffaf0', INK, 2.2);
  ell(ctx, 9, -43, 11, 10, '#fffaf0', INK, 2.2);
  ell(ctx, 0, -48, 12, 11, '#fffdf7', INK, 2.2);
  rr(ctx, -15, -36, 30, 10, 3, '#fff7ea');
  rr(ctx, -17, -29, 34, 7, 3, '#ffe6b8', INK, 2);
  // Rosto
  const mood = pose.mood || 'neutral';
  const faceMood = mood === 'oops' ? 'confused' : mood === 'worried' ? 'impatient' : mood;
  drawFace(ctx, 1, -11, faceMood, t, { gap: 7, eye: '#352d52', mouth: '#a8507a', blush: true, mouthY: 8, seed: 3 });
  ctx.restore();
}

// Itens carregados acima da cabeça do chef.
export function heldItemPositions(count) {
  if (count <= 1) return [{ dx: 22, dy: -50 }];
  return [{ dx: 24, dy: -54 }, { dx: -22, dy: -50 }];
}

// ---------- Clientes ----------
function torso(ctx, x, baseY, w, h, color, stroke = INK) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY);
  ctx.quadraticCurveTo(x - w / 2, baseY - h, x - w * 0.22, baseY - h);
  ctx.lineTo(x + w * 0.22, baseY - h);
  ctx.quadraticCurveTo(x + w / 2, baseY - h, x + w / 2, baseY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.4;
  ctx.stroke();
}

function hands(ctx, x, baseY, spread, color) {
  ell(ctx, x - spread, baseY - 4, 8, 5.5, color, INK, 2);
  ell(ctx, x + spread, baseY - 4, 8, 5.5, color, INK, 2);
}

const NPC_ART = {
  brutus(ctx, x, b, mood, t, p) {
    // Colete aberto sobre camisa, com gola de pele
    torso(ctx, x, b, 84, 44, p.cloth);
    poly(ctx, [[x - 12, b - 44], [x, b - 18], [x + 12, b - 44]], '#e9d6b2', INK, 2);
    for (let i = -3; i <= 3; i++) ell(ctx, x + i * 8, b - 44 + (i % 2) * 2, 6 + (i % 2), 5, i % 2 ? '#bdb2aa' : '#d9cfc7', INK, 1.4);
    // Cabeça grande com mandíbula
    const hy = b - 70;
    ell(ctx, x - 25, hy - 2, 8, 5, p.skin, INK, 2, 0.4);
    ell(ctx, x + 25, hy - 2, 8, 5, p.skin, INK, 2, -0.4);
    ctx.beginPath();
    ctx.moveTo(x - 22, hy - 10);
    ctx.quadraticCurveTo(x - 24, hy + 18, x, hy + 20);
    ctx.quadraticCurveTo(x + 24, hy + 18, x + 22, hy - 10);
    ctx.quadraticCurveTo(x + 20, hy - 26, x, hy - 26);
    ctx.quadraticCurveTo(x - 20, hy - 26, x - 22, hy - 10);
    ctx.fillStyle = p.skin;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    // Topete
    ell(ctx, x, hy - 30, 7, 6, '#2b2230', INK, 2);
    rr(ctx, x - 2, hy - 28, 4, 5, 1, '#c94b4b');
    drawFace(ctx, x, hy - 4, mood, t, { gap: 9, brow: '#2b2230', mouthY: 11, seed: 1 });
    // Presas
    poly(ctx, [[x - 9, hy + 12], [x - 7, hy + 4], [x - 5, hy + 12]], '#fff6dc', INK, 1.4);
    poly(ctx, [[x + 9, hy + 12], [x + 7, hy + 4], [x + 5, hy + 12]], '#fff6dc', INK, 1.4);
    hands(ctx, x, b, 30, p.skin);
  },
  liria(ctx, x, b, mood, t, p) {
    const hy = b - 66;
    // Cabelo longo atrás
    ctx.beginPath();
    ctx.moveTo(x - 20, hy - 10);
    ctx.quadraticCurveTo(x - 30, hy + 30, x - 22, b - 8);
    ctx.lineTo(x + 22, b - 8);
    ctx.quadraticCurveTo(x + 30, hy + 30, x + 20, hy - 10);
    ctx.closePath();
    ctx.fillStyle = p.hair;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    torso(ctx, x, b, 58, 40, p.cloth);
    poly(ctx, [[x - 10, b - 40], [x, b - 28], [x + 10, b - 40]], '#e9df8a', INK, 1.6);
    // Orelhas pontudas
    poly(ctx, [[x - 15, hy - 2], [x - 34, hy - 14], [x - 16, hy + 6]], p.skin, INK, 2);
    poly(ctx, [[x + 15, hy - 2], [x + 34, hy - 14], [x + 16, hy + 6]], p.skin, INK, 2);
    ell(ctx, x, hy, 17, 20, p.skin, INK, 2.4);
    // Franja
    ctx.beginPath();
    ctx.moveTo(x - 17, hy - 2);
    ctx.quadraticCurveTo(x - 14, hy - 22, x, hy - 21);
    ctx.quadraticCurveTo(x + 14, hy - 22, x + 17, hy - 2);
    ctx.quadraticCurveTo(x + 6, hy - 12, x, hy - 8);
    ctx.quadraticCurveTo(x - 8, hy - 12, x - 17, hy - 2);
    ctx.fillStyle = p.hair;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Tiara
    arcStroke(ctx, x, hy + 2, 18, Math.PI * 1.2, Math.PI * 1.8, PAL.gold, 2.6);
    poly(ctx, [[x, hy - 21], [x - 3, hy - 17], [x, hy - 13], [x + 3, hy - 17]], '#7fd18b', INK, 1.2);
    drawFace(ctx, x, hy + 2, mood, t, { gap: 7, eye: '#2d4f55', brow: '#c9b16a', mouthY: 8, seed: 2 });
    hands(ctx, x, b, 22, p.skin);
  },
  drogon(ctx, x, b, mood, t, p) {
    // Asinhas atrás
    const flap = Math.sin(t * 3) * 0.12;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(x + s * 24, b - 36);
      ctx.rotate(s * (0.5 + flap));
      poly(ctx, [[0, 0], [s * 26, -22], [s * 22, -4], [s * 30, 2], [s * 12, 8]], '#c95a3c', INK, 2);
      ctx.restore();
    }
    torso(ctx, x, b, 66, 42, p.skin);
    // Barriga com placas
    ell(ctx, x, b - 16, 16, 18, p.cloth, INK, 2);
    for (let i = 0; i < 3; i++) line(ctx, x - 12, b - 26 + i * 9, x + 12, b - 26 + i * 9, '#d18a2e', 1.4);
    const hy = b - 66;
    // Chifres
    poly(ctx, [[x - 12, hy - 16], [x - 16, hy - 34], [x - 4, hy - 19]], p.accent, INK, 2);
    poly(ctx, [[x + 12, hy - 16], [x + 16, hy - 34], [x + 4, hy - 19]], p.accent, INK, 2);
    ell(ctx, x, hy - 2, 22, 20, p.skin, INK, 2.4);
    // Focinho
    ell(ctx, x, hy + 10, 14, 9, shade(p.skin, 0.15), INK, 2);
    circle(ctx, x - 5, hy + 8, 1.6, INK);
    circle(ctx, x + 5, hy + 8, 1.6, INK);
    // Escamas na testa
    for (const dx of [-7, 0, 7]) arcStroke(ctx, x + dx, hy - 13, 3, Math.PI, Math.PI * 2, p.dark, 1.4);
    drawFace(ctx, x, hy - 4, mood, t, { gap: 9, eye: '#3a1f1a', big: true, mouthY: 19, mouth: '#7a2f22', seed: 4 });
    // Caderninho
    rr(ctx, x + 14, b - 18, 16, 13, 2, '#f7ecd7', INK, 1.8);
    line(ctx, x + 17, b - 13, x + 27, b - 13, '#a08d77', 1.2);
    line(ctx, x + 17, b - 9, x + 25, b - 9, '#a08d77', 1.2);
    hands(ctx, x, b, 26, p.skin);
  },
  grix(ctx, x, b, mood, t, p) {
    torso(ctx, x, b, 54, 34, p.cloth);
    rr(ctx, x - 14, b - 32, 28, 18, 4, shade(p.cloth, 0.15), INK, 1.6);
    circle(ctx, x - 9, b - 28, 2, PAL.gold);
    circle(ctx, x + 9, b - 28, 2, PAL.gold);
    const hy = b - 56;
    // Orelhas enormes
    poly(ctx, [[x - 14, hy - 4], [x - 44, hy - 16], [x - 34, hy + 2], [x - 14, hy + 6]], p.skin, INK, 2);
    poly(ctx, [[x + 14, hy - 4], [x + 44, hy - 16], [x + 34, hy + 2], [x + 14, hy + 6]], p.skin, INK, 2);
    ell(ctx, x, hy, 17, 17, p.skin, INK, 2.4);
    // Óculos de proteção na testa
    rr(ctx, x - 17, hy - 16, 34, 6, 3, '#6b4b2a', INK, 1.4);
    circle(ctx, x - 7, hy - 14, 5.5, '#8fd3ff', '#b8862f', 2.2);
    circle(ctx, x + 7, hy - 14, 5.5, '#8fd3ff', '#b8862f', 2.2);
    // Nariz comprido
    drawFace(ctx, x - 1, hy, mood, t, { gap: 7, eye: '#2b2a1a', mouthY: 12, seed: 5 });
    poly(ctx, [[x - 3, hy + 3], [x + 8, hy + 7], [x - 2, hy + 8]], shade(p.skin, -0.1), INK, 1.5);
    // Chave inglesa
    ctx.save();
    ctx.translate(x - 26, b - 10);
    ctx.rotate(-0.6);
    rr(ctx, -2, -16, 4, 18, 1, '#9aa6b8', INK, 1.4);
    circle(ctx, 0, -18, 5, '#9aa6b8', INK, 1.4);
    circle(ctx, 0, -20, 2.4, '#3a2c48');
    ctx.restore();
    hands(ctx, x, b, 20, p.skin);
  },
  miravel(ctx, x, b, mood, t, p) {
    torso(ctx, x, b, 62, 42, p.cloth);
    // Cachecol menta
    rr(ctx, x - 20, b - 44, 40, 9, 4, p.accent, INK, 1.8);
    rr(ctx, x + 6, b - 38, 8, 20, 3, p.accent, INK, 1.6);
    const hy = b - 66;
    // Cabelo
    ell(ctx, x, hy + 2, 22, 21, p.hair, INK, 2);
    ell(ctx, x, hy + 2, 16, 18, p.skin, INK, 2.2);
    ctx.beginPath();
    ctx.moveTo(x - 17, hy);
    ctx.quadraticCurveTo(x - 4, hy - 4, x + 2, hy - 14);
    ctx.quadraticCurveTo(x + 10, hy - 6, x + 17, hy - 2);
    ctx.lineTo(x + 18, hy - 14);
    ctx.lineTo(x - 18, hy - 14);
    ctx.closePath();
    ctx.fillStyle = p.hair;
    ctx.fill();
    // Chapéu pontudo
    ell(ctx, x, hy - 13, 30, 7, p.cloth, INK, 2.2);
    ctx.beginPath();
    ctx.moveTo(x - 18, hy - 14);
    ctx.quadraticCurveTo(x - 4, hy - 40, x + 10, hy - 58);
    ctx.quadraticCurveTo(x + 6, hy - 36, x + 18, hy - 14);
    ctx.closePath();
    ctx.fillStyle = p.cloth;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    rr(ctx, x - 17, hy - 22, 34, 6, 2, PAL.gold, INK, 1.4);
    sparkle(ctx, x + 3, hy - 36, 3.4, PAL.gold);
    sparkle(ctx, x - 6, hy - 28, 2.2, '#ffffff');
    drawFace(ctx, x, hy + 3, mood, t, { gap: 7, eye: '#3b2a4f', brow: '#3b2a4f', sarcastic: mood === 'neutral', lids: mood === 'neutral' ? p.skin : null, mouthY: 8, seed: 6 });
    hands(ctx, x, b, 24, p.skin);
  },
  ferrao(ctx, x, b, mood, t, p) {
    torso(ctx, x, b, 74, 40, p.cloth);
    // Ombreiras
    ell(ctx, x - 30, b - 34, 14, 9, shade(p.cloth, 0.12), INK, 2);
    ell(ctx, x + 30, b - 34, 14, 9, shade(p.cloth, 0.12), INK, 2);
    line(ctx, x, b - 38, x, b - 4, shade(p.cloth, -0.2), 2);
    poly(ctx, [[x - 8, b - 28], [x + 8, b - 28], [x, b - 16]], p.accent, INK, 1.4);
    const hy = b - 66;
    // Pluma
    ctx.beginPath();
    ctx.moveTo(x, hy - 26);
    ctx.quadraticCurveTo(x + 22, hy - 44, x + 30, hy - 22);
    ctx.quadraticCurveTo(x + 14, hy - 30, x + 2, hy - 20);
    ctx.fillStyle = p.accent;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Elmo com viseira aberta
    ctx.beginPath();
    ctx.moveTo(x - 22, hy + 16);
    ctx.lineTo(x - 22, hy - 8);
    ctx.quadraticCurveTo(x - 20, hy - 28, x, hy - 28);
    ctx.quadraticCurveTo(x + 20, hy - 28, x + 22, hy - 8);
    ctx.lineTo(x + 22, hy + 16);
    ctx.closePath();
    ctx.fillStyle = p.cloth;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    rr(ctx, x - 15, hy - 12, 30, 28, 8, p.skin, INK, 2);
    rr(ctx, x - 20, hy - 22, 40, 9, 4, shade(p.cloth, 0.18), INK, 2);
    for (let i = -2; i <= 2; i++) line(ctx, x + i * 6, hy - 20, x + i * 6, hy - 15, shade(p.cloth, -0.25), 1.4);
    drawFace(ctx, x, hy, mood === 'neutral' ? 'neutral' : mood, t, { gap: 7, eye: '#3a2b2a', brow: '#7a5a3a', mouthY: 9, seed: 7 });
    // Bigodinho
    arcStroke(ctx, x - 3, hy + 9, 3, Math.PI * 0.1, Math.PI * 0.9, '#7a5a3a', 2);
    arcStroke(ctx, x + 3, hy + 9, 3, Math.PI * 0.1, Math.PI * 0.9, '#7a5a3a', 2);
    hands(ctx, x, b, 28, '#9aa6b8');
  },
  nira(ctx, x, b, mood, t, p) {
    torso(ctx, x, b, 74, 40, p.cloth);
    rr(ctx, x - 18, b - 34, 36, 30, 6, '#c9a27a', INK, 1.8);
    line(ctx, x - 18, b - 26, x + 18, b - 26, '#a37f59', 1.4);
    const hy = b - 64;
    // Tranças
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) ell(ctx, x + s * 20, hy + 6 + i * 9, 6, 5.5, p.hair, INK, 1.6);
    }
    ell(ctx, x, hy, 20, 19, p.skin, INK, 2.4);
    ctx.beginPath();
    ctx.moveTo(x - 20, hy - 2);
    ctx.quadraticCurveTo(x - 18, hy - 24, x, hy - 22);
    ctx.quadraticCurveTo(x + 18, hy - 24, x + 20, hy - 2);
    ctx.quadraticCurveTo(x + 4, hy - 14, x - 20, hy - 2);
    ctx.fillStyle = p.hair;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Faixa de cabelo
    rr(ctx, x - 19, hy - 14, 38, 5, 2, p.accent, INK, 1.4);
    // Sardas
    for (const [dx, dy] of [[-11, 6], [-8, 8], [10, 6], [7, 8]]) circle(ctx, x + dx, hy + dy, 0.9, '#b8693f');
    drawFace(ctx, x, hy + 1, mood, t, { gap: 8, eye: '#3a241a', brow: p.hair, mouthY: 9, seed: 8 });
    // Martelo no ombro
    ctx.save();
    ctx.translate(x + 30, b - 30);
    ctx.rotate(0.5);
    rr(ctx, -2, -22, 4, 26, 1, PAL.woodDark, INK, 1.4);
    rr(ctx, -8, -28, 16, 9, 2, '#9aa6b8', INK, 1.6);
    ctx.restore();
    hands(ctx, x, b, 28, p.skin);
  },
  mora(ctx, x, b, mood, t, p) {
    const float = Math.sin(t * 1.6) * 3;
    ctx.save();
    ctx.translate(0, float);
    glow(ctx, x, b - 50, 60, '#bcd4ff', 0.35);
    // Corpo de névoa
    const g = ctx.createLinearGradient(0, b - 50, 0, b + 4);
    g.addColorStop(0, '#cfe3ffee');
    g.addColorStop(1, '#cfe3ff22');
    ctx.beginPath();
    ctx.moveTo(x - 30, b);
    ctx.quadraticCurveTo(x - 28, b - 44, x, b - 46);
    ctx.quadraticCurveTo(x + 28, b - 44, x + 30, b);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    // Manto
    poly(ctx, [[x - 24, b - 38], [x, b - 20], [x + 24, b - 38], [x + 12, b - 46], [x - 12, b - 46]], p.cloth, INK, 1.8);
    const hy = b - 68;
    // Cabelo de névoa esvoaçante
    const sway = Math.sin(t * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(x - 20, hy - 6);
    ctx.quadraticCurveTo(x - 34 - sway, hy + 18, x - 26, hy + 34);
    ctx.quadraticCurveTo(x - 14, hy + 20, x - 12, hy + 10);
    ctx.lineTo(x + 12, hy + 10);
    ctx.quadraticCurveTo(x + 14, hy + 20, x + 26, hy + 34);
    ctx.quadraticCurveTo(x + 34 + sway, hy + 18, x + 20, hy - 6);
    ctx.quadraticCurveTo(x, hy - 30, x - 20, hy - 6);
    ctx.fillStyle = '#8fa6d9cc';
    ctx.fill();
    ell(ctx, x, hy, 16, 18, p.skin, '#6f86bf', 2);
    // Pingente de lua
    ctx.beginPath();
    ctx.arc(x, b - 30, 5, Math.PI * 0.3, Math.PI * 1.7);
    ctx.arc(x + 2, b - 31, 4, Math.PI * 1.6, Math.PI * 0.4, true);
    ctx.fillStyle = p.accent;
    ctx.fill();
    drawFace(ctx, x, hy + 2, mood === 'neutral' ? 'neutral' : mood, t, { gap: 7, eye: '#3a4a7a', serene: mood === 'neutral', brow: '#6f86bf', mouthY: 8, seed: 9, noBlink: true });
    sparkle(ctx, x - 26, hy - 10 + sway, 3, '#ffffff');
    sparkle(ctx, x + 28, hy + 4 - sway, 2.4, PAL.gold);
    ctx.restore();
  },
};

// mood: neutral | happy | impatient | angry | sad | confused
export function drawCustomer(ctx, npcId, x, baseY, { mood = 'neutral', t = 0, walking = false, reduced = false } = {}) {
  const npc = CUSTOMERS[npcId];
  const art = NPC_ART[npcId];
  if (!npc || !art) return;
  const bob = reduced ? 0 : walking ? Math.abs(Math.sin(t * 8)) * -4 : Math.sin(t * 2) * 1.2;
  ctx.save();
  ctx.translate(0, bob);
  art(ctx, x, baseY, mood, t, npc.palette);
  ctx.restore();
}

// Retrato para HUD/diálogos: busto enquadrado.
export function drawPortrait(ctx, npcId, size, mood = 'neutral', t = 0) {
  ctx.save();
  const s = size / 110;
  ctx.scale(s, s);
  drawCustomer(ctx, npcId, 55, 118, { mood, t, reduced: true });
  ctx.restore();
}

export function drawChefPortrait(ctx, size, mood = 'neutral') {
  ctx.save();
  const s = size / 110;
  ctx.scale(s, s);
  drawChef(ctx, 55, 74, { t: 0, mood, reduced: true, face: 1 });
  ctx.restore();
}

export function drawHeartsBurst(ctx, x, y, n, t) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t;
    heart(ctx, x + Math.cos(a) * 18, y + Math.sin(a) * 10 - t * 10, 5, '#ff8fa3');
  }
}
