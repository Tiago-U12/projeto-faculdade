// Primitivas de desenho e paleta compartilhada pela arte procedural.

export const PAL = {
  ink: '#2b1d2e',
  inkSoft: '#3d2a40',
  cream: '#fff1d5',
  gold: '#ffd182',
  goldDeep: '#e0a447',
  mint: '#a6edd8',
  pink: '#ffb4c7',
  plum: '#161320',
  pane: '#252036',
  woodLight: '#c99a6b',
  wood: '#a77450',
  woodDark: '#6e4636',
  woodDeep: '#4a2d27',
  stone: '#4a3b52',
  stoneLight: '#5d4b66',
  iron: '#2f2c3d',
  ironLight: '#4b4760',
  fire: '#ff9b3d',
  fireHot: '#ffd36b',
  ok: '#7fd18b',
  warn: '#ffc857',
  bad: '#ff6b5e',
};

export function rrPath(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function rr(ctx, x, y, w, h, r, fill, stroke = null, lw = 2) {
  rrPath(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function ell(ctx, x, y, rx, ry, fill, stroke = null, lw = 2, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function circle(ctx, x, y, r, fill, stroke = null, lw = 2) {
  ell(ctx, x, y, r, r, fill, stroke, lw);
}

export function poly(ctx, points, fill, stroke = null, lw = 2) {
  ctx.beginPath();
  points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function line(ctx, x1, y1, x2, y2, color, lw = 2, cap = 'round') {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = cap;
  ctx.stroke();
}

export function arcStroke(ctx, x, y, r, a0, a1, color, lw = 2) {
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function glow(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function shadow(ctx, x, y, rx, ry, alpha = 0.28) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ell(ctx, x, y, rx, ry, '#120a18');
  ctx.restore();
}

export function text(ctx, str, x, y, { size = 12, color = PAL.cream, align = 'center', weight = 800, baseline = 'middle', font = 'system-ui, -apple-system, "Segoe UI", sans-serif', stroke = null, strokeWidth = 3 } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Estrela de N pontas (avaliação, brilhos).
export function star(ctx, x, y, r, fill, stroke = null, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rad = i % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function heart(ctx, x, y, s, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s, y - s * 0.4, x, y + s * 0.35);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function sparkle(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = color;
  ctx.fill();
}

// Mistura simples de cor hex com outra (t de 0 a 1).
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

export function shade(hex, amount) {
  return amount >= 0 ? mix(hex, '#ffffff', amount) : mix(hex, '#000000', -amount);
}

// Ruído determinístico para texturas (mesma semente = mesmo desenho).
export function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}
