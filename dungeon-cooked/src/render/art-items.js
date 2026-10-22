// Ingredientes e pratos desenhados por código, centralizados em (0,0),
// numa caixa de ~32 unidades. Quem chama faz translate/scale.
import { PAL, rr, ell, circle, poly, line, arcStroke, glow, sparkle, star, shade, mix } from './paint.js';
import { RECIPE_BY_ID } from '../data/recipes.js';

const INK = PAL.ink;

const INGREDIENT_ART = {
  mush(ctx) {
    rr(ctx, -5, -2, 10, 14, 4, '#f3e6d0', INK, 2);
    line(ctx, -2, 3, -2, 9, '#d8c7ad', 1.5);
    ctx.beginPath();
    ctx.moveTo(-14, 1);
    ctx.quadraticCurveTo(-13, -13, 0, -13);
    ctx.quadraticCurveTo(13, -13, 14, 1);
    ctx.quadraticCurveTo(0, 5, -14, 1);
    ctx.fillStyle = '#9b86ea';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ell(ctx, -5, -7, 3, 2.2, '#f6f0ff');
    ell(ctx, 5, -9, 2.2, 1.7, '#f6f0ff');
    ell(ctx, 7, -3, 1.8, 1.4, '#f6f0ff');
    arcStroke(ctx, 0, -2, 11, Math.PI * 1.1, Math.PI * 1.35, '#ffffff88', 2);
  },
  root(ctx) {
    ctx.save();
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.moveTo(-6, -10);
    ctx.quadraticCurveTo(-8, 6, 0, 15);
    ctx.quadraticCurveTo(8, 6, 6, -10);
    ctx.closePath();
    ctx.fillStyle = '#e09a55';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    line(ctx, -4, -3, 3, -2, '#a8633a', 1.5);
    line(ctx, -3, 4, 3, 5, '#a8633a', 1.5);
    // Runa brilhante
    ctx.strokeStyle = '#a6edd8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 7);
    ctx.moveTo(-2.5, -2);
    ctx.lineTo(2.5, 1);
    ctx.stroke();
    poly(ctx, [[-1, -10], [-7, -17], [-2, -12]], '#69b85e', INK, 1.5);
    poly(ctx, [[1, -10], [6, -18], [2, -11]], '#7fd18b', INK, 1.5);
    ctx.restore();
  },
  leaf(ctx) {
    ctx.save();
    ctx.rotate(-0.6);
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.quadraticCurveTo(-13, 2, 0, -15);
    ctx.quadraticCurveTo(13, 2, 0, 15);
    ctx.fillStyle = '#6cc77d';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    line(ctx, 0, 13, 0, -11, '#3f8f55', 1.6);
    for (let i = -1; i <= 1; i++) {
      line(ctx, 0, 2 + i * 6, -5, -2 + i * 6, '#3f8f55', 1.2);
      line(ctx, 0, 2 + i * 6, 5, -2 + i * 6, '#3f8f55', 1.2);
    }
    ctx.restore();
    sparkle(ctx, 9, -10, 3, '#e8ffd9');
  },
  fairyfruit(ctx) {
    ell(ctx, -9, -6, 6, 4, '#ffffffaa', '#c7a3d988', 1, -0.6);
    ell(ctx, 9, -6, 6, 4, '#ffffffaa', '#c7a3d988', 1, 0.6);
    circle(ctx, 0, 2, 11, '#ff9fb8', INK, 2);
    arcStroke(ctx, 0, 2, 11, -Math.PI * 0.5, -Math.PI * 0.42, '#d06e8c', 2);
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.quadraticCurveTo(-1, 2, 0, 12);
    ctx.strokeStyle = '#e47f9e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ell(ctx, -4, -2, 3, 2, '#ffe2ea');
    sparkle(ctx, 8, -12, 3.2, PAL.gold);
  },
  meat(ctx) {
    ctx.save();
    ctx.rotate(-0.4);
    rr(ctx, 6, -3, 11, 6, 3, '#f7ead4', INK, 2);
    circle(ctx, 17, -4, 3.4, '#f7ead4', INK, 1.6);
    circle(ctx, 17, 3, 3.4, '#f7ead4', INK, 1.6);
    ell(ctx, -3, 0, 12, 10, '#d9776a', INK, 2);
    ell(ctx, -5, -2, 7, 5, '#e89a8a');
    arcStroke(ctx, -3, 1, 7, 0.3, 1.6, '#b05a50', 1.6);
    ctx.restore();
  },
  pepper(ctx) {
    ctx.save();
    ctx.rotate(0.5);
    ctx.beginPath();
    ctx.moveTo(-4, -9);
    ctx.quadraticCurveTo(-8, 4, 1, 15);
    ctx.quadraticCurveTo(10, 2, 5, -9);
    ctx.closePath();
    ctx.fillStyle = '#ff5a4a';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ell(ctx, -1, -2, 1.8, 5, '#ffb3a6');
    rr(ctx, -4, -13, 9, 5, 2, '#4f9d4c', INK, 1.6);
    line(ctx, 0, -13, 2, -17, '#4f9d4c', 2);
    ctx.restore();
    poly(ctx, [[8, 11], [12, 4], [14, 12]], '#ffd36b');
  },
  cheese(ctx) {
    poly(ctx, [[-14, 8], [14, 8], [14, -2], [-8, -9]], '#ffd166', INK, 2);
    poly(ctx, [[-14, 8], [14, 8], [14, 11], [-14, 11]], '#e9b43f', INK, 2);
    circle(ctx, -3, 1, 2.4, '#e2a93a');
    circle(ctx, 6, 3, 1.8, '#e2a93a');
    circle(ctx, 9, -1, 1.4, '#e2a93a');
  },
  cavefish(ctx) {
    poly(ctx, [[10, 0], [17, -7], [17, 7]], '#4f93b5', INK, 2);
    ell(ctx, -1, 0, 13, 8, '#6fb7d9', INK, 2);
    ell(ctx, -3, 3, 8, 3, '#bfe6f5');
    circle(ctx, -8, -2, 2.2, '#fff');
    circle(ctx, -8.4, -2, 1.2, INK);
    ctx.beginPath();
    ctx.moveTo(-9, -7);
    ctx.quadraticCurveTo(-12, -16, -17, -13);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    glow(ctx, -17, -13, 6, '#fff7a8', 0.9);
    circle(ctx, -17, -13, 2.2, '#fff7a8', INK, 1);
    arcStroke(ctx, 1, 0, 6, -0.8, 0.8, '#3f7f9f', 1.4);
  },
  moonwater(ctx) {
    rr(ctx, -4, -15, 8, 6, 2, '#b98765', INK, 1.6);
    ctx.beginPath();
    ctx.moveTo(-4, -9);
    ctx.lineTo(-4, -6);
    ctx.quadraticCurveTo(-12, -2, -11, 6);
    ctx.quadraticCurveTo(-10, 14, 0, 14);
    ctx.quadraticCurveTo(10, 14, 11, 6);
    ctx.quadraticCurveTo(12, -2, 4, -6);
    ctx.lineTo(4, -9);
    ctx.closePath();
    ctx.fillStyle = '#dff3ffcc';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#7fc8f8';
    ctx.fillRect(-12, 0, 24, 16);
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1, 7, 4, Math.PI * 0.3, Math.PI * 1.7);
    ctx.arc(3, 6, 3, Math.PI * 1.6, Math.PI * 0.4, true);
    ctx.fillStyle = '#fff6c9';
    ctx.fill();
    line(ctx, -7, -2, -8, 5, '#ffffffaa', 2);
  },
  ember(ctx) {
    glow(ctx, 0, 2, 16, '#ff9b3d', 0.55);
    poly(ctx, [[-11, 9], [-7, -2], [0, -4], [9, -1], [12, 9], [3, 13], [-6, 13]], '#5a2e2a', INK, 2);
    poly(ctx, [[-6, 6], [-3, 0], [3, 1], [6, 7], [1, 10]], '#ff7a2f');
    poly(ctx, [[-3, 6], [0, 2], [3, 6], [0, 8]], '#ffd36b');
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.quadraticCurveTo(-6, -11, 0, -16);
    ctx.quadraticCurveTo(1, -9, 5, -10);
    ctx.quadraticCurveTo(7, -4, 4, -2);
    ctx.fillStyle = '#ff9b3d';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-1, -3);
    ctx.quadraticCurveTo(-2, -9, 1, -11);
    ctx.quadraticCurveTo(3, -6, 2, -3);
    ctx.fillStyle = '#ffe28a';
    ctx.fill();
  },
  crystal(ctx) {
    glow(ctx, 0, 0, 15, '#a6edd8', 0.45);
    poly(ctx, [[-10, 12], [-13, 0], [-8, -6], [-5, 12]], '#7fd6c0', INK, 1.8);
    poly(ctx, [[8, 12], [13, -2], [9, -8], [4, 12]], '#8fe3cd', INK, 1.8);
    poly(ctx, [[-5, 12], [-6, -6], [0, -16], [6, -6], [5, 12]], '#b8f5e4', INK, 2);
    poly(ctx, [[0, -16], [6, -6], [5, 12], [1, 12], [1, -6]], '#95e6d1');
    line(ctx, -3, -4, -3, 6, '#ffffffcc', 1.6);
    sparkle(ctx, -9, -10, 3, '#ffffff');
  },
  slimegel(ctx) {
    ctx.beginPath();
    ctx.moveTo(-13, 10);
    ctx.quadraticCurveTo(-15, -4, -6, -11);
    ctx.quadraticCurveTo(0, -15, 6, -11);
    ctx.quadraticCurveTo(15, -4, 13, 10);
    ctx.quadraticCurveTo(0, 14, -13, 10);
    ctx.fillStyle = '#8fea9acc';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ell(ctx, -5, -6, 4, 2.5, '#ffffffaa');
    circle(ctx, 6, 4, 2, '#d4ffd9');
    circle(ctx, -6, 6, 1.4, '#d4ffd9');
    circle(ctx, -3, 1, 1.4, INK);
    circle(ctx, 3, 1, 1.4, INK);
    arcStroke(ctx, 0, 3, 2.4, 0.3, Math.PI - 0.3, INK, 1.2);
  },
};

export function drawIngredient(ctx, id, { x = 0, y = 0, size = 32, prepared = false, alpha = 1, silhouette = false } = {}) {
  const art = INGREDIENT_ART[id];
  if (!art) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= alpha;
  const s = size / 32;
  ctx.scale(s, s);
  // Bloqueado: bem apagado (ctx.filter não é confiável no Safari).
  if (silhouette) ctx.globalAlpha *= 0.28;
  if (prepared) {
    // Picado: três pedacinhos com marcas de corte.
    const pieces = [[-7, 4, -0.3], [6, 5, 0.4], [0, -6, 0.1]];
    for (const [px, py, rot] of pieces) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.scale(0.55, 0.55);
      art(ctx);
      ctx.restore();
    }
    line(ctx, -12, -12, -6, -6, '#ffffffcc', 2);
    line(ctx, -9, -14, -3, -8, '#ffffffcc', 2);
  } else {
    art(ctx);
  }
  ctx.restore();
}

// ---------- Pratos ----------
function bowl(ctx, broth, rim = '#e9dccb') {
  ell(ctx, 0, 6, 15, 7, '#00000033');
  ctx.beginPath();
  ctx.moveTo(-15, -2);
  ctx.quadraticCurveTo(-14, 13, 0, 13);
  ctx.quadraticCurveTo(14, 13, 15, -2);
  ctx.closePath();
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  line(ctx, -10, 6, 10, 6, '#b9a58f', 1.4);
  ell(ctx, 0, -2, 15, 5.5, broth, INK, 2);
}

function plate(ctx, rim = '#f4ead8') {
  ell(ctx, 0, 6, 16, 6, '#00000033');
  ell(ctx, 0, 2, 16, 8, rim, INK, 2);
  ell(ctx, 0, 1.5, 11, 5, shade(rim, -0.06));
}

function steam(ctx, t = 0, color = '#ffffffaa') {
  for (let i = -1; i <= 1; i++) {
    const ox = i * 6;
    ctx.beginPath();
    ctx.moveTo(ox, -8);
    ctx.bezierCurveTo(ox - 3, -12, ox + 3, -15, ox, -19 - Math.sin(t * 3 + i) * 1.5);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

const DISH_ART = {
  soup(ctx, t) {
    bowl(ctx, '#c9c3ea');
    ell(ctx, -6, -3, 3, 1.5, '#9b86ea');
    ell(ctx, 4, -1, 2.4, 1.4, '#e09a55');
    ell(ctx, 7, -3, 2, 1.2, '#e09a55');
    ctx.beginPath();
    ctx.arc(-1, -3, 2.5, Math.PI * 0.3, Math.PI * 1.7);
    ctx.fillStyle = '#fff6c9';
    ctx.fill();
    steam(ctx, t);
  },
  stew(ctx, t) {
    bowl(ctx, '#b4492f');
    ell(ctx, -5, -2, 3.5, 2.2, '#d9776a', INK, 1);
    ell(ctx, 4, -3, 3, 2, '#d9776a', INK, 1);
    ell(ctx, 1, 0, 2.4, 1, '#ff5a4a');
    steam(ctx, t);
  },
  salad(ctx) {
    bowl(ctx, '#5fb36e', '#d8f0e0');
    for (const [x, y, r] of [[-7, -4, -0.6], [0, -6, 0.2], [6, -3, 0.8], [-2, -1, 1.4]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      ell(ctx, 0, 0, 4.5, 2.2, '#7fd18b', '#3f8f55', 1);
      ctx.restore();
    }
    ell(ctx, 3, -1, 2.6, 1.8, '#b7a4f5', INK, 1);
    sparkle(ctx, 10, -10, 2.6, '#e8ffd9');
  },
  roots(ctx, t) {
    plate(ctx);
    for (const [x, y] of [[-6, 0], [0, -2], [6, 1]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.4);
      ell(ctx, 0, 0, 3.4, 6, '#e09a55', INK, 1.2);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(-9, -3);
    ctx.quadraticCurveTo(0, -8, 9, -2);
    ctx.quadraticCurveTo(5, 1, 0, -1);
    ctx.quadraticCurveTo(-5, 1, -9, -3);
    ctx.fillStyle = '#ffd166';
    ctx.fill();
    steam(ctx, t);
  },
  herbal(ctx, t) {
    ell(ctx, 0, 9, 14, 4, '#00000033');
    ell(ctx, 0, 9, 14, 4, '#f4ead8', INK, 1.6);
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-8, 8);
    ctx.lineTo(8, 8);
    ctx.lineTo(10, -4);
    ctx.closePath();
    ctx.fillStyle = '#f4ead8';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    arcStroke(ctx, 11, 2, 4, -1.2, 1.4, INK, 2);
    ell(ctx, 0, -4, 10, 3, '#9fd8ff', INK, 1.6);
    ell(ctx, -3, -4, 3, 1.4, '#7fd18b');
    steam(ctx, t, '#cfeaffaa');
  },
  emberstew(ctx, t) {
    bowl(ctx, '#d4581f');
    glow(ctx, 0, -2, 12, '#ffd36b', 0.5);
    ell(ctx, -6, -2, 3.5, 2.2, '#d9776a', INK, 1);
    ell(ctx, 5, -2, 3, 2, '#d9776a', INK, 1);
    poly(ctx, [[-1, -3], [1, -6], [3, -3], [1, -1]], '#ffd36b');
    steam(ctx, t, '#ffd8b0aa');
  },
  fairysalad(ctx) {
    bowl(ctx, '#5fb36e', '#ffe7ef');
    for (const [x, y, r] of [[-7, -4, -0.6], [6, -4, 0.8], [0, -1, 1.4]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      ell(ctx, 0, 0, 4.5, 2.2, '#7fd18b', '#3f8f55', 1);
      ctx.restore();
    }
    circle(ctx, -2, -5, 3, '#ff9fb8', INK, 1);
    circle(ctx, 4, -1, 2.6, '#ff9fb8', INK, 1);
    sparkle(ctx, 9, -11, 3, PAL.gold);
    sparkle(ctx, -10, -9, 2.2, '#ffffff');
  },
  spicebread(ctx, t) {
    plate(ctx);
    ctx.beginPath();
    ctx.moveTo(-12, 3);
    ctx.quadraticCurveTo(-11, -10, 0, -10);
    ctx.quadraticCurveTo(11, -10, 12, 3);
    ctx.closePath();
    ctx.fillStyle = '#e8b25c';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    poly(ctx, [[-3, -9], [0, -2], [3, -9], [1, -4], [-1, -4]], '#ff5a4a');
    for (let i = -2; i <= 2; i++) line(ctx, i * 4, 2, i * 4 + 1, 0, '#c98f3c', 1.2);
    glow(ctx, 0, -8, 6, '#ff9b3d', 0.6);
    steam(ctx, t, '#ffd8b0aa');
  },
  cavefish(ctx, t) {
    plate(ctx);
    poly(ctx, [[8, 0], [14, -5], [14, 5]], '#5d9cbf', INK, 1.6);
    ell(ctx, -1, 0, 10, 5.5, '#c9884f', INK, 1.8);
    for (let i = -1; i <= 1; i++) line(ctx, -5 + i * 4, -4, -2 + i * 4, 4, '#7a4a28', 1.6);
    circle(ctx, -7, -1, 1.2, INK);
    ctx.save();
    ctx.translate(-8, 5);
    ctx.rotate(-0.3);
    ell(ctx, 0, 0, 4, 2, '#7fd18b', '#3f8f55', 1);
    ctx.restore();
    steam(ctx, t);
  },
  glimmer(ctx, t) {
    bowl(ctx, '#7fe0c6');
    glow(ctx, 0, -2, 13, '#d9fff5', 0.6);
    poly(ctx, [[-4, -2], [-2, -9], [0, -2]], '#b8f5e4', INK, 1);
    poly(ctx, [[3, -1], [5, -7], [7, -1]], '#b8f5e4', INK, 1);
    ell(ctx, -8, -2, 2.4, 1.4, '#9b86ea');
    sparkle(ctx, 8, -10, 2.6, '#ffffff');
    sparkle(ctx, -9, -9, 2, '#ffffff');
    steam(ctx, t, '#d9fff5aa');
  },
  spectral(ctx, t) {
    plate(ctx, '#e9e4ff');
    const wob = Math.sin(t * 6) * 0.8;
    ctx.beginPath();
    ctx.moveTo(-11, 3);
    ctx.quadraticCurveTo(-11 - wob, -12, 0, -13);
    ctx.quadraticCurveTo(11 + wob, -12, 11, 3);
    ctx.closePath();
    ctx.fillStyle = '#bff7e6dd';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    circle(ctx, -3, -5, 1.4, INK);
    circle(ctx, 3, -5, 1.4, INK);
    ell(ctx, 0, -1, 2, 1.5, INK);
    circle(ctx, 0, -14, 3, '#ff9fb8', INK, 1);
    ell(ctx, -6, -8, 2, 3, '#ffffffaa');
  },
  harmony(ctx, t) {
    ell(ctx, 0, 6, 17, 6, '#00000033');
    ell(ctx, 0, 2, 17, 9, '#ffe2a6', INK, 2);
    ell(ctx, 0, 1.5, 13, 6.5, '#f5cf86');
    ell(ctx, -4, -1, 7, 5, '#b8573f', INK, 1.5);
    for (const [x, y] of [[6, 1], [9, -2], [-10, 2]]) ell(ctx, x, y, 3, 2, '#e09a55', INK, 1);
    glow(ctx, 3, -7, 9, '#a6edd8', 0.8);
    poly(ctx, [[1, -3], [3, -12], [5, -3]], '#b8f5e4', INK, 1.4);
    sparkle(ctx, -11, -9, 3, PAL.gold);
    sparkle(ctx, 12, -8, 2.4, PAL.gold);
    steam(ctx, t);
  },
};

export function drawDish(ctx, recipeId, { x = 0, y = 0, size = 32, quality = 'perfect', t = 0, alpha = 1 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= alpha;
  const s = size / 32;
  ctx.scale(s, s);
  if (quality === 'burnt') {
    const recipe = RECIPE_BY_ID[recipeId];
    if (recipe && recipe.station === 'cauldron') bowl(ctx, '#2c2326', '#8b8076');
    else plate(ctx, '#bfb3a5');
    poly(ctx, [[-9, -1], [-5, -7], [1, -5], [6, -8], [10, -1], [2, 2], [-6, 2]], '#1d1719', INK, 1.5);
    ell(ctx, -2, -4, 2, 1, '#ff7a2f');
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 6, -8);
      ctx.bezierCurveTo(i * 6 - 4, -13, i * 6 + 4, -16, i * 6, -21 - Math.sin(t * 2 + i) * 2);
      ctx.strokeStyle = '#6b6370aa';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
  } else {
    const art = DISH_ART[recipeId];
    if (art) art(ctx, t);
  }
  ctx.restore();
}

// Ícone de categoria para pedidos abertos (tag).
export function drawTagIcon(ctx, tag, { x = 0, y = 0, size = 32 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 32, size / 32);
  circle(ctx, 0, 0, 13, '#3a2c48', INK, 2);
  const c = '#ffe1a6';
  switch (tag) {
    case 'quente':
      ctx.beginPath();
      ctx.moveTo(0, 9);
      ctx.quadraticCurveTo(-9, 3, -3, -9);
      ctx.quadraticCurveTo(-1, -2, 2, -4);
      ctx.quadraticCurveTo(9, 2, 0, 9);
      ctx.fillStyle = '#ff9b3d';
      ctx.fill();
      break;
    case 'picante':
      ctx.save();
      ctx.scale(0.7, 0.7);
      INGREDIENT_ART.pepper(ctx);
      ctx.restore();
      break;
    case 'fresco':
    case 'paz':
      ctx.save();
      ctx.scale(0.7, 0.7);
      INGREDIENT_ART.leaf(ctx);
      ctx.restore();
      if (tag === 'paz') circle(ctx, 7, 7, 4, '#a6edd8', INK, 1);
      break;
    case 'caldo':
      ctx.save();
      ctx.scale(0.75, 0.75);
      bowl(ctx, '#c9c3ea');
      ctx.restore();
      break;
    case 'assado':
    case 'queijo':
      ctx.save();
      ctx.scale(0.7, 0.7);
      INGREDIENT_ART.cheese(ctx);
      ctx.restore();
      break;
    case 'robusto':
      ctx.save();
      ctx.scale(0.7, 0.7);
      INGREDIENT_ART.meat(ctx);
      ctx.restore();
      break;
    case 'magico':
    case 'insolito':
      sparkle(ctx, 0, 0, 9, tag === 'magico' ? PAL.mint : PAL.pink);
      sparkle(ctx, 6, -6, 3, c);
      break;
    case 'doce':
      ctx.save();
      ctx.scale(0.7, 0.7);
      INGREDIENT_ART.fairyfruit(ctx);
      ctx.restore();
      break;
    case 'peixe':
      ctx.save();
      ctx.scale(0.7, 0.7);
      INGREDIENT_ART.cavefish(ctx);
      ctx.restore();
      break;
    default:
      star(ctx, 0, 0, 8, c);
  }
  ctx.restore();
}

export function dishColor(recipeId) {
  const map = { soup: '#c9c3ea', stew: '#b4492f', salad: '#5fb36e', roots: '#ffd166', herbal: '#9fd8ff', emberstew: '#d4581f', fairysalad: '#ff9fb8', spicebread: '#e8b25c', cavefish: '#6fb7d9', glimmer: '#7fe0c6', spectral: '#bff7e6', harmony: '#ffe2a6' };
  return map[recipeId] || '#cccccc';
}

export function brothColor(ids) {
  // Cor do caldo conforme ingredientes já no caldeirão.
  const colors = { mush: '#b7a4f5', root: '#e09a55', meat: '#b4492f', pepper: '#ff5a4a', leaf: '#6cc77d', moonwater: '#7fc8f8', ember: '#ff7a2f', crystal: '#a6edd8', cheese: '#ffd166', cavefish: '#6fb7d9', fairyfruit: '#ff9fb8', slimegel: '#8fea9a' };
  if (!ids.length) return '#4a6b8a';
  let c = colors[ids[0]] || '#888888';
  for (let i = 1; i < ids.length; i++) c = mix(c, colors[ids[i]] || '#888888', 0.5);
  return c;
}
