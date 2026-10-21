// Renderer Canvas 2D: desenha o estado do serviço. Não altera a simulação.
import { PAL, rr, ell, circle, poly, line, arcStroke, glow, sparkle, star, text, heart } from './paint.js';
import { drawIngredient, drawDish, drawTagIcon } from './art-items.js';
import { drawChef, drawCustomer, heldItemPositions } from './art-characters.js';
import {
  drawBackground, drawPantry, drawBoard, drawCauldron, drawColdBench, drawOven, drawGrill, drawTrash, drawBell,
} from './art-scene.js';
import { createParticles } from './particles.js';
import { computeView, worldToScreen, eventToWorld } from './camera.js';
import { WORLD, COUNTER, STATION_LAYOUT, STATION_ORDER, SEAT_X, nearestStation, stationCenter } from '../sim/world.js';
import { STATION_STATE, BOARD_STATE, isNearBurn, possibleRecipes, contentIds } from '../sim/kitchen.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { CUSTOMERS } from '../data/customers.js';
import { ORDER_STATUS } from '../sim/orders.js';
import { activeConflicts } from '../sim/chaos.js';
import { missingFrom } from '../core/util.js';

const SHORT_LABEL = {
  horta: 'Horta', rustica: 'Despensa', arcano: 'Arcano', board: 'Tábua', cauldron: 'Caldeirão',
  cold: 'Bancada fria', oven: 'Forno', grill: 'Grelha', trash: 'Lixeira', bell: 'Sino',
};

const CUSTOMER_BASE = COUNTER.y + 14;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const particles = createParticles();
  let view = null;
  let cache = null;
  let cacheKey = '';
  let t = 0;
  let shake = 0;
  let chefMood = { mood: 'neutral', time: 0 };
  let bellRing = 0;
  let dpr = 1;
  const seatFx = [0, 0, 0];

  function ensureSize() {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(cw * dpr));
    const h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { cw, ch };
  }

  function ensureCache(scale, decor, hc) {
    const res = Math.min(2.6, scale * dpr);
    const key = `${res.toFixed(3)}|${decor.join(',')}|${hc}`;
    if (key === cacheKey && cache) return;
    cacheKey = key;
    cache = document.createElement('canvas');
    cache.width = Math.ceil(WORLD.w * res);
    cache.height = Math.ceil(WORLD.h * res);
    const c = cache.getContext('2d');
    c.scale(res, res);
    drawBackground(c, { decor, hc });
  }

  // Ponto de partida dos números flutuantes: na frente do cliente, acima do balcão.
  function seatPos(seat) {
    return { x: SEAT_X[seat], y: COUNTER.y - 24 };
  }

  // Converte eventos de domínio em efeitos visuais.
  function handleEvent(ev, svc, settings = {}) {
    switch (ev.type) {
      case 'delivered': {
        const p = seatPos(ev.seat);
        particles.floatText(`+${ev.result.coins}`, p.x + 46, p.y - 6, PAL.gold, 18);
        particles.floatText('★'.repeat(ev.result.stars) + '☆'.repeat(5 - ev.result.stars), p.x - 40, p.y - 6, '#ffe9a8', 15);
        if (ev.result.stars >= 4) particles.burst('heart', p.x, p.y, 8, '#ff8fa3');
        particles.burst('coin', p.x, p.y, 8);
        chefMood = { mood: ev.result.stars >= 4 ? 'happy' : ev.result.stars <= 2 ? 'oops' : 'neutral', time: 1.6 };
        seatFx[ev.seat] = 1;
        break;
      }
      case 'refused': {
        const p = seatPos(ev.seat);
        particles.floatText('?!', p.x, p.y - 30, '#ffb4c7', 22);
        chefMood = { mood: 'oops', time: 1.4 };
        break;
      }
      case 'expired': {
        const p = seatPos(ev.order.seat);
        particles.burst('smoke', p.x, p.y - 20, 10, '#6b6370');
        chefMood = { mood: 'oops', time: 1.4 };
        break;
      }
      case 'fx': {
        const c = stationCenter(ev.station);
        if (ev.kind === 'ready') particles.burst('sparkle', c.x, c.y - 20, 10, PAL.gold);
        else if (ev.kind === 'smoke') particles.burst('smoke', c.x, c.y - 20, 14, '#3d3540');
        else if (ev.kind === 'chop') particles.burst('dot', c.x - 6, c.y - 6, 6, '#e2b77f');
        else if (ev.kind === 'drop') particles.burst('dot', c.x, c.y - 18, 8, '#9fd8ff');
        else if (ev.kind === 'bell') {
          bellRing = 1;
          particles.burst('sparkle', c.x, c.y - 10, 10, PAL.mint);
        }
        break;
      }
      case 'crisis':
        if (!settings.reducedMotion) shake = 0.6;
        for (let s = 0; s < 3; s++) particles.burst('dot', SEAT_X[s], COUNTER.y - 40, 10, '#c9a27a');
        chefMood = { mood: 'worried', time: 2 };
        break;
      case 'conflictResolved':
      case 'harmony':
        for (const c of svc.customers) {
          const r = CUSTOMERS[c.npc];
          if (r) particles.burst('heart', c.x, COUNTER.y - 70, ev.type === 'harmony' ? 10 : 5, '#a6edd8');
        }
        break;
      case 'order': {
        const p = seatPos(ev.order.seat);
        particles.burst('sparkle', p.x + 34, p.y - 30, 5, '#ffffff');
        break;
      }
      default:
        break;
    }
  }

  function drawSeatDish(c, svc) {
    if (c.state !== 'EATING') return;
    const order = svc.orders.find((o) => o.id === c.orderId);
    if (!order) return;
    const recipeId = order.servedRecipe || order.recipeId;
    if (recipeId) drawDish(ctx, recipeId, { x: c.x, y: COUNTER.y + 6, size: 30, t, quality: order.servedQuality || 'perfect' });
  }

  function drawCustomers(svc, settings) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, 0, WORLD.w + 400, COUNTER.y + 18);
    ctx.clip();
    const list = [...svc.customers].sort((a, b) => (a.state === 'ENTERING' || a.state === 'LEAVING' ? -1 : 0) - (b.state === 'ENTERING' || b.state === 'LEAVING' ? -1 : 0));
    for (const c of list) {
      const walking = c.state === 'ENTERING' || c.state === 'LEAVING';
      let mood = c.mood;
      if (mood === 'confused' && c.bubbleTime <= 0) mood = 'neutral';
      drawCustomer(ctx, c.npc, c.x, CUSTOMER_BASE + (walking ? -8 : 0), { mood, t: t + c.animT, walking, reduced: settings.reducedMotion });
    }
    ctx.restore();
    for (const c of svc.customers) drawSeatDish(c, svc);
  }

  function drawOrderBubbles(svc, settings) {
    for (const c of svc.customers) {
      if (c.state !== 'SEATED' && c.state !== 'EATING' && c.state !== 'ANGRY') continue;
      const order = svc.orders.find((o) => o.id === c.orderId);
      if (!order) continue;
      const bx = c.x + 40;
      const by = COUNTER.y - 104;
      if (c.state === 'EATING') {
        // Avaliação recebida
        for (let i = 0; i < 5; i++) star(ctx, c.x - 24 + i * 12, COUNTER.y - 118, 5.5, i < c.stars ? PAL.gold : '#5a4a66', PAL.ink);
        continue;
      }
      if (c.state === 'ANGRY') {
        ell(ctx, c.x, COUNTER.y - 118, 20, 10, '#5b5560', PAL.ink, 2);
        poly(ctx, [[c.x - 2, COUNTER.y - 112], [c.x + 4, COUNTER.y - 104], [c.x, COUNTER.y - 104], [c.x + 5, COUNTER.y - 96]], PAL.warn);
        continue;
      }
      const ratio = order.noExpire || !svc.rules.timed ? 1 : Math.max(0, order.patience / order.maxPatience);
      const ringColor = ratio > 0.5 ? PAL.ok : ratio > 0.25 ? PAL.warn : PAL.bad;
      const pulse = ratio < 0.25 && !settings.reducedMotion ? 1 + Math.sin(t * 10) * 0.05 : 1;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(pulse, pulse);
      poly(ctx, [[-10, 16], [-18, 26], [-2, 19]], '#fff7e8', PAL.ink, 2);
      circle(ctx, 0, 0, 22, '#fff7e8', PAL.ink, 2.5);
      if (order.kind === 'dish') drawDish(ctx, order.recipeId, { size: 30, t });
      else drawTagIcon(ctx, order.tag, { size: 30 });
      if (!(order.noExpire || !svc.rules.timed)) {
        arcStroke(ctx, 0, 0, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, ringColor, 4.5);
      }
      if (order.priority) {
        star(ctx, -20, -18, 8, PAL.gold, PAL.ink);
      }
      if (order.kind === 'tag') {
        circle(ctx, 18, -18, 8, PAL.pink, PAL.ink, 1.6);
        text(ctx, '?', 18, -17.5, { size: 11, color: PAL.ink, weight: 900 });
      }
      ctx.restore();
    }
    // Raios entre rivais em conflito
    for (const conflict of activeConflicts(svc.chaos)) {
      const a = svc.customers.find((c) => c.npc === conflict.a && c.state === 'SEATED');
      const b = svc.customers.find((c) => c.npc === conflict.b && c.state === 'SEATED');
      if (!a || !b) continue;
      const midX = (a.x + b.x) / 2;
      const y = COUNTER.y - 120;
      const flick = conflict.state === 'ACTIVE' ? 1 : 0.5 + Math.sin(t * 8) * 0.3;
      ctx.save();
      ctx.globalAlpha = flick;
      ctx.setLineDash([6, 6]);
      line(ctx, a.x, y + 20, b.x, y + 20, conflict.state === 'ACTIVE' ? PAL.bad : PAL.warn, 2.5);
      ctx.setLineDash([]);
      circle(ctx, midX, y + 20, 15, conflict.state === 'ACTIVE' ? PAL.bad : PAL.warn, PAL.ink, 2);
      poly(ctx, [[midX - 2, y + 9], [midX + 5, y + 19], [midX, y + 19], [midX + 3, y + 31], [midX - 5, y + 18], [midX, y + 18]], '#fff7e8');
      ctx.restore();
    }
  }

  function stationStatus(svc, id) {
    const layout = STATION_LAYOUT[id];
    if (layout.kind === 'cook') {
      const st = svc.cook[id];
      if (st.state === STATION_STATE.PROCESSING) {
        return { text: `⏳ ${Math.ceil(st.remaining)}s ${RECIPE_BY_ID[st.recipeId].name}`, color: '#2c3e63', fg: '#d6e6ff', progress: 1 - st.remaining / st.total };
      }
      if (st.state === STATION_STATE.READY) {
        if (isNearBurn(st)) return { text: '⚠ QUASE QUEIMANDO', color: '#8a4b12', fg: '#ffe2a6', blink: true, progress: 1 - st.readyElapsed / st.spoilAfter, bar: PAL.warn };
        return { text: '✓ PRONTO', color: '#245c3a', fg: '#c9ffd9' };
      }
      if (st.state === STATION_STATE.SPOILED) return { text: '✖ QUEIMADO', color: '#6b1f1f', fg: '#ffd0c9' };
      if (st.state === STATION_STATE.LOADING) {
        const ids = contentIds(st);
        const opts = possibleRecipes(ids, st.cookType, svc.recipes);
        if (opts.length === 1) {
          const miss = missingFrom(ids, opts[0].ingredients).map((m) => INGREDIENTS[m].short);
          return { text: `+ ${miss.join(' + ')}`, color: '#3a2c48', fg: '#ffe1a6' };
        }
        return { text: '+ falta ingrediente', color: '#3a2c48', fg: '#ffe1a6' };
      }
      if (svc.whisper && svc.whisper.station === id) return { text: '♪ OUVIR', color: '#1f5a50', fg: '#c9fff1', blink: true };
    }
    if (id === 'board') {
      const b = svc.board;
      if (b.state === BOARD_STATE.CHOPPING) return { text: `✂ CORTE ${b.chops}/2`, color: '#3a2c48', fg: '#ffe1a6' };
      if (b.state === BOARD_STATE.DONE) return { text: '✓ PICADO', color: '#245c3a', fg: '#c9ffd9' };
    }
    if (id === 'bell' && svc.stationsAvailable.has('bell') && svc.chaos.bellCooldown > 0) {
      return { text: `↻ ${Math.ceil(svc.chaos.bellCooldown)}s`, color: '#3a2c48', fg: '#c9fff1' };
    }
    return null;
  }

  function pill(str, sx, sy, { bg = '#1e1630e6', fg = PAL.cream, size = 11, border = null, progress = null, bar = PAL.mint } = {}) {
    ctx.font = `800 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    const w = Math.ceil(ctx.measureText(str).width) + 14;
    const h = size + 9;
    rr(ctx, sx - w / 2, sy - h / 2, w, h, h / 2, bg, border, border ? 1.5 : 0);
    if (progress != null) {
      ctx.save();
      rr(ctx, sx - w / 2 + 3, sy + h / 2 - 4, (w - 6) * Math.max(0, Math.min(1, progress)), 2.5, 1, bar);
      ctx.restore();
    }
    text(ctx, str, sx, sy - (progress != null ? 1 : 0), { size, color: fg, weight: 800 });
    return w;
  }

  function drawScreenOverlay(svc, settings, nearest, ctxInfo) {
    const toScreen = (x, y) => worldToScreen(view, x, y);
    // Rótulos menores quando a cozinha aparece bem reduzida (celular deitado).
    const fontBase = settings.largeText ? 13 : view.scale < 0.62 ? 9.5 : 11;
    // Rótulos e estados das estações
    for (const id of STATION_ORDER) {
      const layout = STATION_LAYOUT[id];
      if (layout.kind === 'seat') continue;
      const r = layout.rect;
      const below = toScreen(r.x + r.w / 2, r.y + r.h + 10);
      const avail = svc.stationsAvailable.has(id);
      if (settings.stationLabels !== false && id !== 'bell' && id !== nearest) {
        pill(avail ? SHORT_LABEL[id] : `${SHORT_LABEL[id]} · fechado`, below.x, below.y, { size: fontBase - 1, bg: settings.highContrast ? '#000000ee' : '#1e1630cc', fg: avail ? '#fff1d8' : '#b9a9c3' });
      }
      const status = stationStatus(svc, id);
      if (status && !(status.blink && Math.sin(t * 8) < -0.3 && !settings.reducedMotion)) {
        const top = toScreen(r.x + r.w / 2, r.y - 4);
        pill(status.text, top.x, top.y - 8, { size: fontBase, bg: status.color, fg: status.fg, border: settings.highContrast ? '#ffffff' : null, progress: status.progress ?? null, bar: status.bar });
      }
    }
    // Prompt de interação
    if (nearest && ctxInfo) {
      const r = STATION_LAYOUT[nearest].rect;
      const onCounter = STATION_LAYOUT[nearest].onCounter;
      // Ocupa o lugar do rótulo da estação (que some quando ela está selecionada).
      const anchor = onCounter ? toScreen(r.x + r.w / 2, r.y + r.h + 6) : toScreen(r.x + r.w / 2, r.y + r.h + 11);
      const key = settings.touch ? '' : 'E · ';
      pill(`${key}${ctxInfo.verb}`, anchor.x, anchor.y + (onCounter ? 12 : 0), {
        size: fontBase + 2,
        bg: ctxInfo.enabled ? (ctxInfo.confirm ? '#8a4b12' : '#ffd182') : '#3a2c48',
        fg: ctxInfo.enabled ? (ctxInfo.confirm ? '#fff1d5' : '#3a2333') : '#c9b8d6',
        border: PAL.ink,
      });
    }
    // Falas dos clientes
    if (settings.speech !== false) {
      for (const c of svc.customers) {
        if (!c.bubble || c.bubbleTime <= 0) continue;
        const p = toScreen(c.x - 20, COUNTER.y - 132);
        const a = Math.min(1, c.bubbleTime / 0.4);
        ctx.save();
        ctx.globalAlpha = a;
        speechBubble(c.bubble, p.x, p.y, fontBase + 1);
        ctx.restore();
      }
    }
    particles.drawFloats(ctx, toScreen);
  }

  function speechBubble(str, x, y, size) {
    ctx.font = `700 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    const maxW = Math.min(200, Math.max(120, canvas.clientWidth * 0.38));
    const words = str.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    const shown = lines.slice(0, 3);
    if (lines.length > 3) shown[2] = `${shown[2]}…`;
    const lh = size + 4;
    const w = Math.min(maxW, Math.max(...shown.map((l) => ctx.measureText(l).width))) + 16;
    const h = shown.length * lh + 10;
    const bx = Math.max(4, Math.min(canvas.clientWidth - w - 4, x - w / 2));
    const by = Math.max(4, y - h);
    rr(ctx, bx, by, w, h, 10, '#fff7e8', PAL.ink, 2);
    poly(ctx, [[x - 6, by + h - 1], [x + 6, by + h - 1], [x, by + h + 8]], '#fff7e8');
    shown.forEach((l, i) => text(ctx, l, bx + w / 2, by + 5 + lh / 2 + i * lh, { size, color: '#3a2333', weight: 700 }));
  }

  function drawHighlight(id, enabled) {
    const r = STATION_LAYOUT[id].rect;
    const pulse = 0.55 + 0.35 * Math.sin(t * 5);
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -t * 20;
    rr(ctx, r.x - 6, r.y - 6, r.w + 12, r.h + 12, 12, null, enabled ? `rgba(255,241,184,${pulse})` : `rgba(201,184,214,${pulse * 0.7})`, 3);
    ctx.restore();
  }

  function drawGuideArrow(id) {
    const r = STATION_LAYOUT[id].rect;
    const x = r.x + r.w / 2;
    const onCounter = STATION_LAYOUT[id].onCounter;
    // Acima do selo de estado da estação (ou abaixo do balcão, para os lugares).
    const y = (onCounter ? r.y + r.h + 22 : r.y - 44) + Math.sin(t * 5) * 5;
    glow(ctx, x, y, 22, PAL.mint, 0.35);
    poly(ctx, [[x - 11, y - 10], [x + 11, y - 10], [x + 11, y - 2], [x + 18, y - 2], [x, y + 14], [x - 18, y - 2], [x - 11, y - 2]], PAL.mint, PAL.ink, 2.5);
  }

  function drawStations(svc, drawables) {
    const avail = (id) => svc.stationsAvailable.has(id);
    const push = (id, fn) => {
      const r = STATION_LAYOUT[id].rect;
      drawables.push({ y: r.y + r.h, fn });
    };
    for (const id of ['horta', 'rustica', 'arcano']) push(id, () => drawPantry(ctx, id, svc.ingredients, avail(id), t, svc.pickerHighlight || null));
    push('board', () => drawBoard(ctx, svc.board, t));
    push('cauldron', () => {
      const st = svc.cook.cauldron;
      drawCauldron(ctx, st, t, { whisper: Boolean(svc.whisper && svc.whisper.station === 'cauldron'), recipeIngredients: st.recipeId ? RECIPE_BY_ID[st.recipeId].ingredients : null });
      if (st.dish) drawDish(ctx, st.dish.recipeId, { x: stationCenter('cauldron').x, y: STATION_LAYOUT.cauldron.rect.y - 4 + Math.sin(t * 3) * 2, size: 34, quality: st.dish.quality, t });
    });
    push('cold', () => drawColdBench(ctx, svc.cook.cold, t));
    push('oven', () => drawOven(ctx, svc.cook.oven, t, avail('oven')));
    push('grill', () => drawGrill(ctx, svc.cook.grill, t, avail('grill')));
    push('trash', () => drawTrash(ctx, t, svc.player.hands.length > 0));
    drawables.push({ y: COUNTER.y + 40, fn: () => drawBell(ctx, svc.chaos.bellCooldown, Math.max(1, svc.chaos.bellBaseCooldown * (svc.mods.bellCooldownMult || 1)), avail('bell'), t, bellRing) });
  }

  function drawPlayer(svc, settings) {
    const p = svc.player;
    let mood = chefMood.time > 0 ? chefMood.mood : 'neutral';
    if (mood === 'neutral' && svc.chaos.enabled && svc.chaos.tension >= 70) mood = 'worried';
    if (mood === 'neutral' && svc.whisper) mood = 'surprised';
    drawChef(ctx, p.x, p.y, { face: p.face, t, walking: p.moving, walkCycle: p.walkCycle, anim: p.anim, mood, reduced: settings.reducedMotion });
    const positions = heldItemPositions(p.hands.length);
    p.hands.forEach((item, i) => {
      const pos = positions[i];
      const ix = p.x + pos.dx * (i === 0 ? p.face : 1);
      const iy = p.y + pos.dy + (settings.reducedMotion ? 0 : Math.sin(t * 5 + i) * 2);
      ell(ctx, ix, iy + 16, 12, 3, '#fff9cb44');
      if (item.type === 'dish') drawDish(ctx, item.recipeId, { x: ix, y: iy, size: 32, quality: item.quality, t });
      else drawIngredient(ctx, item.id, { x: ix, y: iy, size: 30, prepared: item.prepared });
    });
    if (p.path && p.path.length) {
      const end = p.path[p.path.length - 1];
      ctx.save();
      ctx.globalAlpha = 0.6;
      ell(ctx, end.x, end.y + 14, 12, 5, null, PAL.mint, 2);
      ctx.restore();
    }
  }

  function continuousFx(svc, dt) {
    if (!dt) return;
    for (const id of ['cauldron', 'oven', 'grill']) {
      const st = svc.cook[id];
      const c = stationCenter(id);
      if (st.state === STATION_STATE.PROCESSING && Math.random() < dt * 6) particles.puff('steam', c.x, c.y - 30);
      if (st.state === STATION_STATE.READY && isNearBurn(st) && Math.random() < dt * 8) particles.puff('smoke', c.x, c.y - 30, '#6b6370');
      if (st.state === STATION_STATE.SPOILED && Math.random() < dt * 6) particles.puff('smoke', c.x, c.y - 30, '#2b2530');
    }
  }

  return {
    particles,
    get view() {
      return view;
    },
    handleEvent,
    // frame: { dt, paused, settings, ctxInfo, guide, focus }
    render(svc, frame = {}) {
      const settings = frame.settings || {};
      const dt = frame.paused ? 0 : frame.dt || 0;
      t += dt;
      if (!frame.paused) {
        chefMood.time = Math.max(0, chefMood.time - dt);
        bellRing = Math.max(0, bellRing - dt * 1.5);
        shake = Math.max(0, shake - dt);
        particles.setReduced(Boolean(settings.reducedMotion));
        particles.update(dt);
        continuousFx(svc, dt);
      }
      const { cw, ch } = ensureSize();
      if (!cw || !ch) return;
      const focus = frame.focus || svc.player;
      const smooth = settings.reducedMotion ? 1 : Math.min(1, (frame.dt || 0.016) * 6);
      view = computeView(cw, ch, focus, view, smooth);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = PAL.plum;
      ctx.fillRect(0, 0, cw, ch);
      ensureCache(view.scale, frame.decor || [], Boolean(settings.highContrast));
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * 8 * shake, (Math.random() - 0.5) * 8 * shake);
      ctx.translate(view.offX, view.offY);
      ctx.scale(view.scale, view.scale);
      ctx.translate(-view.viewX, -view.viewY);
      ctx.drawImage(cache, 0, 0, WORLD.w, WORLD.h);
      drawCustomers(svc, settings);
      const drawables = [];
      drawStations(svc, drawables);
      drawables.push({ y: svc.player.y + 18, fn: () => drawPlayer(svc, settings) });
      drawables.sort((a, b) => a.y - b.y);
      const nearest = frame.hideUi ? null : nearestStation(svc.player.x, svc.player.y);
      for (const d of drawables) d.fn();
      if (nearest) drawHighlight(nearest, frame.ctxInfo ? frame.ctxInfo.enabled : true);
      if (frame.guide && frame.guide.station && settings.hints !== false) drawGuideArrow(frame.guide.station);
      drawOrderBubbles(svc, settings);
      particles.draw(ctx);
      ctx.restore();
      if (!frame.hideUi) drawScreenOverlay(svc, settings, nearest, frame.ctxInfo);
      if (svc.chaos && svc.chaos.crisisFlash > 0 && !settings.reducedMotion) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.35, svc.chaos.crisisFlash * 0.3);
        ctx.fillStyle = '#ff5a4a';
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
      }
    },
    toWorld(clientX, clientY) {
      if (!view) return null;
      return eventToWorld(view, canvas.getBoundingClientRect(), clientX, clientY);
    },
    invalidate() {
      cacheKey = '';
    },
  };
}

