// Ícones para a interface DOM gerados com a mesma arte do Canvas (cacheados como data URL).
import { drawIngredient, drawDish, drawTagIcon } from '../render/art-items.js';
import { drawPortrait, drawChefPortrait } from '../render/art-characters.js';
import { PAL, rr, glow } from '../render/paint.js';

const cache = new Map();

function make(key, size, draw) {
  if (cache.has(key)) return cache.get(key);
  const scale = 2;
  const c = document.createElement('canvas');
  c.width = size * scale;
  c.height = size * scale;
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  try {
    draw(ctx, size);
  } catch (error) {
    console.error('[ícones]', key, error);
  }
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

export function ingredientIcon(id, prepared = false, size = 48) {
  return make(`ing:${id}:${prepared}:${size}`, size, (ctx) => drawIngredient(ctx, id, { x: size / 2, y: size / 2, size: size * 0.86, prepared }));
}

export function dishIcon(recipeId, quality = 'perfect', size = 48) {
  return make(`dish:${recipeId}:${quality}:${size}`, size, (ctx) => drawDish(ctx, recipeId, { x: size / 2, y: size / 2 + 2, size: size * 0.86, quality, t: 0.4 }));
}

export function tagIcon(tag, size = 48) {
  return make(`tag:${tag}:${size}`, size, (ctx) => drawTagIcon(ctx, tag, { x: size / 2, y: size / 2, size: size * 0.9 }));
}

export function portraitIcon(npcId, mood = 'neutral', size = 64) {
  return make(`npc:${npcId}:${mood}:${size}`, size, (ctx) => {
    rr(ctx, 0, 0, size, size, size * 0.2, '#3a2c48');
    glow(ctx, size / 2, size * 0.45, size * 0.6, '#ffcf7a', 0.25);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.clip();
    drawPortrait(ctx, npcId, size, mood);
    ctx.restore();
  });
}

export function chefIcon(mood = 'neutral', size = 64) {
  return make(`chef:${mood}:${size}`, size, (ctx) => {
    rr(ctx, 0, 0, size, size, size * 0.2, '#3a2c48');
    glow(ctx, size / 2, size * 0.5, size * 0.6, '#c9bfff', 0.35);
    drawChefPortrait(ctx, size, mood);
  });
}

export function voiceIcon(size = 64) {
  return make(`voice:${size}`, size, (ctx) => {
    rr(ctx, 0, 0, size, size, size * 0.2, '#14302a');
    glow(ctx, size / 2, size / 2, size * 0.5, PAL.mint, 0.8);
    ctx.fillStyle = '#2f2c3d';
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.6, size * 0.32, size * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.mint;
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.48, size * 0.26, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}
