// Câmera: encaixa o mundo 960x600 na área do canvas. Em telas largas mostra
// tudo (letterbox); em telas estreitas aproxima e segue o chef.
// Funções puras para que a conversão tela->mundo possa ser testada.
import { clamp } from '../core/util.js';
import { WORLD } from '../sim/world.js';

export const MIN_VISIBLE_WIDTH = 440;

export function computeView(cssW, cssH, focus, prevView = null, smooth = 1) {
  const fit = Math.min(cssW / WORLD.w, cssH / WORLD.h);
  const followScale = Math.min(cssH / WORLD.h, cssW / MIN_VISIBLE_WIDTH);
  // Mostra o mundo inteiro se isso não deixar tudo menor do que a câmera que segue o chef.
  const wide = cssW / cssH >= 1.3 || fit >= followScale - 1e-6;
  if (wide) {
    return {
      scale: fit,
      viewX: 0,
      viewY: 0,
      offX: (cssW - WORLD.w * fit) / 2,
      offY: (cssH - WORLD.h * fit) / 2,
      follow: false,
    };
  }
  const scale = followScale;
  const vw = cssW / scale;
  const vh = cssH / scale;
  const targetX = clamp(focus.x - vw / 2, 0, Math.max(0, WORLD.w - vw));
  const targetY = clamp(focus.y - vh / 2, 0, Math.max(0, WORLD.h - vh));
  let viewX = targetX;
  let viewY = targetY;
  if (prevView && prevView.follow && Math.abs(prevView.scale - scale) < 1e-6) {
    viewX = prevView.viewX + (targetX - prevView.viewX) * smooth;
    viewY = prevView.viewY + (targetY - prevView.viewY) * smooth;
  }
  return {
    scale,
    viewX,
    viewY,
    offX: vw > WORLD.w ? (cssW - WORLD.w * scale) / 2 : 0,
    offY: vh > WORLD.h ? (cssH - WORLD.h * scale) / 2 : 0,
    follow: true,
  };
}

// Converte um ponto em pixels CSS (relativo ao canvas) para coordenadas do mundo.
export function screenToWorld(view, sx, sy) {
  return {
    x: (sx - view.offX) / view.scale + view.viewX,
    y: (sy - view.offY) / view.scale + view.viewY,
  };
}

export function worldToScreen(view, wx, wy) {
  return {
    x: (wx - view.viewX) * view.scale + view.offX,
    y: (wy - view.viewY) * view.scale + view.offY,
  };
}

// Converte um evento de ponteiro (clientX/Y) usando o retângulo do canvas.
export function eventToWorld(view, rect, clientX, clientY) {
  return screenToWorld(view, clientX - rect.left, clientY - rect.top);
}
