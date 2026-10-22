// Partículas e textos flutuantes. Só visuais: não alteram a simulação e
// congelam junto com a pausa (o renderer só chama update quando o jogo roda).
import { circle, heart, star, sparkle, text, PAL } from './paint.js';

const MAX = 260;

export function createParticles() {
  const list = [];
  const floats = [];
  let reduced = false;
  function push(p) {
    if (list.length >= MAX) list.shift();
    list.push(p);
  }
  return {
    setReduced(value) {
      reduced = value;
    },
    burst(kind, x, y, count = 12, color = PAL.gold) {
      const n = reduced ? Math.ceil(count / 3) : count;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
        const speed = 30 + Math.random() * 90;
        push({
          kind, x, y, color,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - (kind === 'heart' || kind === 'note' ? 40 : 20),
          life: 0.6 + Math.random() * 0.7,
          max: 1.3,
          r: 2 + Math.random() * 3,
          gravity: kind === 'heart' || kind === 'steam' || kind === 'smoke' ? -20 : 70,
        });
      }
    },
    puff(kind, x, y, color) {
      if (reduced && Math.random() < 0.6) return;
      push({ kind, x: x + (Math.random() - 0.5) * 16, y, color, vx: (Math.random() - 0.5) * 10, vy: -18 - Math.random() * 14, life: 1.4, max: 1.4, r: 4 + Math.random() * 4, gravity: -6 });
    },
    floatText(str, x, y, color = PAL.gold, size = 16) {
      floats.push({ str, x, y, color, size, life: 1.6, max: 1.6 });
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.life -= dt;
        if (p.kind === 'smoke' || p.kind === 'steam') p.r += dt * 6;
        if (p.life <= 0) list.splice(i, 1);
      }
      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].y -= dt * 28;
        floats[i].life -= dt;
        if (floats[i].life <= 0) floats.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const p of list) {
        const a = Math.max(0, Math.min(1, p.life / p.max));
        ctx.save();
        ctx.globalAlpha = a;
        switch (p.kind) {
          case 'heart': heart(ctx, p.x, p.y, 6, p.color); break;
          case 'star': star(ctx, p.x, p.y, p.r + 2, p.color); break;
          case 'sparkle': sparkle(ctx, p.x, p.y, p.r + 1, p.color); break;
          case 'smoke': ctx.globalAlpha = a * 0.5; circle(ctx, p.x, p.y, p.r, p.color || '#5b5560'); break;
          case 'steam': ctx.globalAlpha = a * 0.35; circle(ctx, p.x, p.y, p.r, p.color || '#ffffff'); break;
          case 'coin': circle(ctx, p.x, p.y, 4, PAL.gold, PAL.goldDeep, 1.4); break;
          default: circle(ctx, p.x, p.y, p.r, p.color);
        }
        ctx.restore();
      }
    },
    // Textos em coordenadas de tela (tamanho legível em qualquer zoom).
    drawFloats(ctx, toScreen) {
      for (const f of floats) {
        const a = Math.max(0, Math.min(1, f.life / 0.6));
        const s = toScreen(f.x, f.y);
        ctx.save();
        ctx.globalAlpha = a;
        text(ctx, f.str, s.x, s.y, { size: f.size, color: f.color, weight: 900, stroke: '#1c1328', strokeWidth: 4 });
        ctx.restore();
      }
    },
    clear() {
      list.length = 0;
      floats.length = 0;
    },
    get count() {
      return list.length;
    },
  };
}
