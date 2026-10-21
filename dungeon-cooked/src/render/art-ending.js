// Ilustrações dos três finais (desenhadas na hora, sem imagens externas).
import { PAL, rr, ell, circle, glow, sparkle, star, heart, line } from './paint.js';
import { drawChef, drawCustomer } from './art-characters.js';
import { drawDish } from './art-items.js';

export function drawEndingArt(ctx, w, h, ending, t = 0) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, ending === 'segredo' ? '#14243f' : '#2c2138');
  sky.addColorStop(1, ending === 'lenda' ? '#5a3a30' : '#45324f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const s = h / 240;
  ctx.save();
  ctx.scale(s, s);
  const W = w / s;
  for (let i = 0; i < 18; i++) circle(ctx, (i * 53) % W, 12 + ((i * 37) % 70), 1.2, '#fff6d6');
  if (ending === 'mesa') {
    glow(ctx, W / 2, 150, 160, '#ffcf7a', 0.35);
    rr(ctx, W / 2 - 170, 168, 340, 26, 10, '#a77450', PAL.ink, 3);
    const cast = ['brutus', 'liria', 'grix', 'ferrao', 'drogon', 'miravel', 'nira'];
    cast.forEach((id, i) => drawCustomer(ctx, id, W / 2 - 150 + i * 50, 172, { mood: 'happy', t: t + i, reduced: true }));
    drawDish(ctx, 'harmony', { x: W / 2, y: 170, size: 44, t });
    drawChef(ctx, W / 2 + 190, 150, { t, mood: 'happy', face: -1, reduced: true });
    for (let i = 0; i < 6; i++) heart(ctx, W / 2 - 120 + i * 48, 60 + (i % 2) * 14, 7, '#ff8fa3');
  } else if (ending === 'lenda') {
    glow(ctx, W / 2, 110, 140, '#ffd182', 0.4);
    rr(ctx, W / 2 - 90, 30, 180, 30, 8, '#8a5a3c', PAL.ink, 3);
    ctx.font = '900 16px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PAL.gold;
    ctx.fillText('★ LENDA DA DUNGEON ★', W / 2, 46);
    drawChef(ctx, W / 2, 150, { t, mood: 'happy', face: 1, reduced: true });
    star(ctx, W / 2, 84, 12, PAL.gold, PAL.ink);
    ['drogon', 'brutus', 'nira', 'grix'].forEach((id, i) => drawCustomer(ctx, id, i < 2 ? W / 2 - 200 + i * 70 : W / 2 + 130 + (i - 2) * 70, 236, { mood: 'happy', t: t + i, reduced: true }));
    for (let i = 0; i < 10; i++) sparkle(ctx, 30 + i * (W - 60) / 9, 90 + (i % 3) * 20, 4, PAL.gold);
  } else {
    glow(ctx, W / 2, 140, 150, '#a6edd8', 0.55);
    ell(ctx, W / 2, 200, 70, 22, PAL.iron, PAL.ink, 3);
    ell(ctx, W / 2, 190, 56, 12, '#a6edd8');
    for (let i = 0; i < 5; i++) sparkle(ctx, W / 2 - 40 + i * 20, 160 - (i % 2) * 30, 5, '#ffffff');
    drawChef(ctx, W / 2, 120, { t, mood: 'happy', face: 1, reduced: true });
    drawCustomer(ctx, 'mora', W / 2 + 150, 230, { mood: 'happy', t, reduced: true });
    ctx.save();
    ctx.globalAlpha = 0.5;
    line(ctx, W / 2, 40, W / 2, 20, '#fff3c4', 2);
    circle(ctx, W / 2 - 160, 60, 18, '#fff3c4');
    circle(ctx, W / 2 - 152, 54, 16, ending === 'segredo' ? '#14243f' : '#2c2138');
    ctx.restore();
  }
  ctx.restore();
}
