// Simulação de um turno de serviço (uma noite da campanha ou uma rodada do Desafio).
// Sem DOM e sem relógios próprios: só avança quando updateService(dt) é chamado.
// A interface lê o estado e consome svc.events a cada quadro.
import { createRng } from '../core/rng.js';
import { clamp, distance, deepClone, uniquePush } from '../core/util.js';
import { INGREDIENTS, SHELVES } from '../data/ingredients.js';
import { RECIPE_BY_ID, COOK_STATIONS, TAGS, recipesUnlockedBy, dishName, prefName } from '../data/recipes.js';
import { CUSTOMERS, RIVALRIES, RIVALRY_BY_ID } from '../data/customers.js';
import { ingredientsUnlockedBy } from '../data/ingredients.js';
import { BASE_MODS } from '../data/upgrades.js';
import {
  STATION_LAYOUT, SEAT_X, SEAT_Y, DOOR_LEFT, DOOR_RIGHT, PLAYER_START,
  nearestStation, moveWithCollision, createNavGrid, findPath, accessPoints,
} from './world.js';
import {
  STATION_STATE, BOARD_STATE, createItemFactory, createCookStation, createBoard,
  checkAdd, addIngredient, tickCookStation, takeDish, canTakeDish, resetCookStation,
  placeOnBoard, chop, takeFromBoard, clearBoard, checkBoardPlace, loadingHint, ingredientReady, contentIds,
} from './kitchen.js';
import {
  ORDER_STATUS, createOrder, closeOrder, evaluateDelivery, deliveryWarning, orderMatches,
  orderLabel, fillLine, satisfyingRecipes,
} from './orders.js';
import {
  createChaos, tickChaos, addTension, ringBell, startConflict, resolveConflict, conflictFor,
  activeConflicts, patienceDrainFactor, CONFLICT_DELAY, CRISIS_RESET,
} from './chaos.js';

export const BASE_SPEED = 230;
export const CUSTOMER_SPEED = 150;
export const CONFIRM_SECONDS = 3.5;
export const EAT_SECONDS = 2.2;

const COOK_IDS = ['cauldron', 'cold', 'oven', 'grill'];

export const MODE_RULES = {
  historia: {
    timed: true, burn: true, tensionCap: 100, passiveTension: 0, conflictTension: 0.9,
    expiryTension: 15, bellCooldown: 15, spoilMult: 1, timeLimit: null, label: 'História',
  },
  tranquilo: {
    timed: false, burn: false, tensionCap: 90, passiveTension: 0, conflictTension: 0,
    expiryTension: 0, bellCooldown: 8, spoilMult: 1, timeLimit: null, label: 'Tranquilo',
  },
  desafio: {
    timed: true, burn: true, tensionCap: 100, passiveTension: 0.15, conflictTension: 1.1,
    expiryTension: 18, bellCooldown: 12, spoilMult: 0.75, timeLimit: 180, label: 'Desafio',
  },
};

// options: { mode, night, def, mods, campaign: { trust, prefsKnown }, seed, pace }
export function createService(options) {
  const mode = options.mode;
  const base = MODE_RULES[mode];
  const def = options.def;
  const rules = {
    ...base,
    tension: mode === 'desafio' ? true : Boolean(def.tension),
    conflicts: mode === 'desafio' ? true : Boolean(def.conflicts),
    maxActive: def.maxActive ?? 3,
    patience: def.patience,
    arrivalGap: def.arrivalGap,
    pace: options.pace ?? 1,
  };
  const rng = options.rng || createRng(options.seed ?? Date.now());
  const night = mode === 'desafio' ? 99 : options.night;
  const mods = { ...BASE_MODS, ...(options.mods || {}) };
  const itemFactory = createItemFactory();
  const campaign = options.campaign || {};
  const svc = {
    mode,
    night,
    def,
    rules,
    mods,
    rng,
    time: 0,
    ended: false,
    endReason: null,
    player: {
      x: PLAYER_START.x, y: PLAYER_START.y, face: 1, moving: false, walkCycle: 0,
      hands: [], path: null, target: null, anim: null, animTime: 0,
    },
    board: createBoard(),
    cook: Object.fromEntries(COOK_IDS.map((id) => [id, createCookStation(id, STATION_LAYOUT[id].cook)])),
    stationsAvailable: new Set(def.stations),
    recipes: mode === 'desafio' ? def.menuStages[0].recipes.slice() : recipesUnlockedBy(night),
    ingredients: mode === 'desafio' ? Object.keys(INGREDIENTS) : ingredientsUnlockedBy(night),
    seats: [null, null, null],
    customers: [],
    orders: [],
    guests: expandGuests(def.guests || []),
    guestTotal: 0,
    arrivalTimer: 1.2,
    chaos: createChaos({ tension: rules.tension, bellCooldown: rules.bellCooldown, startTension: rules.tension ? 10 : 0 }),
    pairWatch: {},
    stats: {
      served: 0, good: 0, perfect: 0, expired: 0, burntCreated: 0, burntDelivered: 0, mistakes: 0,
      conflictsResolved: 0, conflicts: 0, crises: 0, coins: 0, tips: 0, starsTotal: 0,
      streak: 0, bestStreak: 0, combo: 0, maxCombo: 0, recipesServed: {}, harmonyPairs: [],
      customersSeen: 0, peaceBonus: 0,
    },
    trust: { ...(campaign.trust || {}) },
    trustDelta: {},
    bondDelta: {},
    prefsKnown: deepClone(campaign.prefsKnown || {}),
    newPrefs: [],
    cooked: [],
    flags: [],
    clues: [],
    triggered: [],
    story: [],
    whisper: null,
    pending: null,
    events: [],
    guide: null,
    tutorial: Boolean(def.tutorial) && mode !== 'desafio',
    tutorialDone: !(def.tutorial && mode !== 'desafio'),
    itemFactory,
    orderSeq: 0,
    customerSeq: 0,
    nav: null,
  };
  svc.guestTotal = mode === 'desafio' ? Infinity : svc.guests.reduce((n, g) => n + g.npcs.length, 0);
  return svc;
}

function expandGuests(list) {
  return list.map((g, index) => {
    const flags = { priority: Boolean(g.priority), noExpire: Boolean(g.noExpire), tutorial: Boolean(g.tutorial), waitTutorial: Boolean(g.waitTutorial) };
    if (g.pair) {
      const rivalry = RIVALRY_BY_ID[g.pair];
      return { index, pair: g.pair, npcs: [rivalry.a, rivalry.b], orders: g.orders.map((o) => ({ ...o })), ...flags };
    }
    if (g.random) return { index, random: true, npcs: [null], orders: [{}], ...flags };
    return { index, npcs: [g.npc], orders: [{ recipe: g.recipe, tag: g.tag }], ...flags };
  });
}

// ---------- Utilidades de estado ----------
export function emit(svc, type, data = {}) {
  svc.events.push({ type, ...data });
}

function toast(svc, text, tone = 'info', seconds = 2.6) {
  emit(svc, 'toast', { text, tone, seconds });
}

function capacity(svc) {
  return svc.mods.capacity || 1;
}

function hasFreeSlot(svc) {
  return svc.player.hands.length < capacity(svc);
}

function canHoldDish(svc) {
  return hasFreeSlot(svc) && !svc.player.hands.some((i) => i.type === 'dish');
}

export function heldDish(svc) {
  return svc.player.hands.find((i) => i.type === 'dish') || null;
}

function removeFromHands(svc, uid) {
  const i = svc.player.hands.findIndex((item) => item.uid === uid);
  if (i < 0) return null;
  return svc.player.hands.splice(i, 1)[0];
}

export function isStationAvailable(svc, id) {
  const kind = STATION_LAYOUT[id].kind;
  if (kind === 'seat') return true;
  return svc.stationsAvailable.has(id);
}

export function unavailableText(svc, id) {
  switch (id) {
    case 'arcano': return 'Armário Arcano trancado. Ele abre na Noite 2.';
    case 'oven': return 'Forno frio e rachado. Alguém vai consertá-lo na Noite 2.';
    case 'grill': return 'Só caixotes por aqui. A grelha chega na Noite 4.';
    case 'bell': return 'O sino está mudo. Um inventor vai consertá-lo na Noite 3.';
    default: return 'Indisponível nesta noite.';
  }
}

function cookTiming(svc, cookType) {
  return {
    cookTimeMult: cookType === 'cauldron' ? svc.mods.cauldronTimeMult : 1,
    spoilMult: svc.rules.spoilMult * (cookType === 'oven' || cookType === 'grill' ? svc.mods.heatWindowMult : 1),
    noBurn: !svc.rules.burn,
    makeDish: (recipeId, quality) => svc.itemFactory.dish(recipeId, quality),
  };
}

export function customerAt(svc, seat) {
  return svc.seats[seat];
}

export function orderOf(svc, customer) {
  return customer ? svc.orders.find((o) => o.id === customer.orderId) || null : null;
}

export function activeOrders(svc) {
  return svc.orders.filter((o) => o.status === ORDER_STATUS.ACTIVE);
}

export function knownPrefs(svc, npc) {
  return svc.prefsKnown[npc] || [];
}

function learnPref(svc, npc, tag) {
  const list = svc.prefsKnown[npc] || (svc.prefsKnown[npc] = []);
  if (!list.includes(tag)) {
    list.push(tag);
    svc.newPrefs.push({ npc, tag });
    return true;
  }
  return false;
}

function changeTrust(svc, npc, delta) {
  svc.trustDelta[npc] = (svc.trustDelta[npc] || 0) + delta;
  svc.trust[npc] = clamp((svc.trust[npc] ?? CUSTOMERS[npc].baseTrust) + delta, 0, 5);
}

function changeBond(svc, pair, delta) {
  svc.bondDelta[pair] = (svc.bondDelta[pair] || 0) + delta;
}

// ---------- Loop ----------
// input: { moveX, moveY } com valores entre -1 e 1.
export function updateService(svc, dt, input = {}) {
  if (svc.ended) return;
  dt = clamp(dt, 0, 0.1);
  svc.time += dt;
  updateDesafioMenu(svc);
  updatePlayer(svc, dt, input);
  updateStations(svc, dt);
  updateCustomers(svc, dt);
  updateArrivals(svc, dt);
  updateChaos(svc, dt);
  updateTriggers(svc);
  if (svc.pending && (svc.time > svc.pending.expires || nearestStation(svc.player.x, svc.player.y) !== svc.pending.station)) {
    svc.pending = null;
  }
  svc.guide = computeGuide(svc);
  checkEnd(svc);
}

function updateDesafioMenu(svc) {
  if (svc.mode !== 'desafio') return;
  const stage = [...svc.def.menuStages].reverse().find((s) => svc.time >= s.from);
  if (stage && stage.recipes.length !== svc.recipes.length) {
    svc.recipes = stage.recipes.slice();
    toast(svc, 'O cardápio cresceu! Novas receitas nos pedidos.', 'info', 3);
    emit(svc, 'sfx', { id: 'unlock' });
  }
}

function updatePlayer(svc, dt, input) {
  const p = svc.player;
  p.animTime = Math.max(0, p.animTime - dt);
  if (p.animTime === 0) p.anim = null;
  let mx = input.moveX || 0;
  let my = input.moveY || 0;
  const manual = Math.hypot(mx, my) > 0.12;
  if (manual) {
    p.path = null;
    p.target = null;
  } else if (p.path && p.path.length) {
    const next = p.path[0];
    const d = distance(p.x, p.y, next.x, next.y);
    if (d < 4) {
      p.path.shift();
      if (!p.path.length) arriveAtTarget(svc);
    } else {
      mx = (next.x - p.x) / d;
      my = (next.y - p.y) / d;
    }
  }
  const mag = Math.hypot(mx, my);
  p.moving = false;
  if (mag > 0.12) {
    const n = Math.min(1, mag);
    const speed = BASE_SPEED * svc.mods.speedMult * n;
    const step = speed * dt;
    const before = { x: p.x, y: p.y };
    moveWithCollision(p, (mx / mag) * step, (my / mag) * step);
    p.moving = p.x !== before.x || p.y !== before.y;
    if (Math.abs(mx) > 0.2) p.face = mx > 0 ? 1 : -1;
    if (p.moving) {
      p.walkCycle += dt * 9;
      p.stuck = 0;
    } else if (p.path) {
      // Preso numa quina: replaneja uma vez a partir daqui; se continuar preso, desiste.
      p.stuck = (p.stuck || 0) + 1;
      const goal = p.path[p.path.length - 1];
      const target = p.target;
      if (p.stuck <= 2 && goal) {
        const path = findPath(svc.nav || (svc.nav = createNavGrid()), p, goal);
        p.path = path;
        p.target = path ? target : null;
      } else {
        p.path = null;
        p.target = null;
        p.stuck = 0;
      }
    }
  }
}

// Clique/toque: caminha até um ponto ou até uma estação (e interage ao chegar).
export function setMoveTarget(svc, wx, wy, stationId = null, extra = null) {
  const p = svc.player;
  if (!svc.nav) svc.nav = createNavGrid();
  let goal = { x: wx, y: wy };
  if (stationId) {
    const points = accessPoints(stationId, p);
    if (!points.length) return false;
    if (nearestStation(p.x, p.y) === stationId) {
      p.path = null;
      p.target = { station: stationId, extra };
      arriveAtTarget(svc);
      return true;
    }
    for (const pt of points) {
      const path = findPath(svc.nav, p, pt);
      if (path) {
        p.path = path;
        p.target = { station: stationId, extra };
        return true;
      }
    }
    toast(svc, 'Não encontrei caminho até lá.', 'warn');
    return false;
  }
  const path = findPath(svc.nav, p, goal);
  if (!path) {
    p.path = null;
    p.target = null;
    return false;
  }
  p.path = path;
  p.target = null;
  return true;
}

function arriveAtTarget(svc) {
  const p = svc.player;
  const target = p.target;
  p.path = null;
  p.target = null;
  if (!target) return;
  // Revalida: só interage se a estação ainda é a mais próxima e está ao alcance.
  if (nearestStation(p.x, p.y) !== target.station) return;
  if (target.extra && target.extra.ingredient) takeIngredient(svc, target.extra.ingredient);
  else interact(svc);
}

function updateStations(svc, dt) {
  svc.board.chopAnim = Math.max(0, svc.board.chopAnim - dt * 4);
  for (const id of COOK_IDS) {
    const st = svc.cook[id];
    const events = tickCookStation(st, dt, (recipeId, quality) => svc.itemFactory.dish(recipeId, quality));
    for (const ev of events) {
      const recipe = RECIPE_BY_ID[ev.recipeId];
      if (ev.type === 'ready') {
        toast(svc, `No ponto! ${recipe.name} pronto no ${COOK_STATIONS[st.cookType].name.toLowerCase()}. Pegue antes que vire lembrança carbonizada.`, 'good', 3);
        emit(svc, 'sfx', { id: 'ready' });
        emit(svc, 'fx', { kind: 'ready', station: id });
      } else if (ev.type === 'nearBurn') {
        toast(svc, `Quase queimando: ${recipe.name}!`, 'warn', 2.6);
        emit(svc, 'sfx', { id: 'nearBurn' });
      } else if (ev.type === 'spoiled') {
        svc.stats.burntCreated += 1;
        toast(svc, `Queimou! ${dishName(recipe, 'burnt')}. Descarte (Q) ou entregue com consequência.`, 'bad', 3.2);
        emit(svc, 'sfx', { id: 'burnt' });
        emit(svc, 'fx', { kind: 'smoke', station: id });
      }
    }
  }
}

// ---------- Clientes ----------
function updateCustomers(svc, dt) {
  const speed = CUSTOMER_SPEED * (svc.mode === 'desafio' ? 1.3 : 1);
  for (const c of svc.customers) {
    c.bubbleTime = Math.max(0, (c.bubbleTime || 0) - dt);
    c.animT += dt;
    if (c.state === 'ENTERING') {
      const target = SEAT_X[c.seat];
      c.x += Math.sign(target - c.x) * Math.min(Math.abs(target - c.x), speed * dt);
      if (Math.abs(c.x - target) < 0.5) {
        c.x = target;
        seatCustomer(svc, c);
      }
    } else if (c.state === 'SEATED') {
      const order = orderOf(svc, c);
      if (order && order.status === ORDER_STATUS.ACTIVE && svc.rules.timed && !order.noExpire) {
        order.patience -= dt * patienceDrainFactor(svc.chaos.tension);
        const ratio = order.patience / order.maxPatience;
        if (ratio < 0.35 && c.mood === 'neutral') {
          c.mood = 'impatient';
          say(svc, c, pickLine(svc, c.npc, 'impatient'));
        }
        if (order.patience <= 0) expireOrder(svc, c, order);
      }
    } else if (c.state === 'EATING') {
      c.wait -= dt;
      const companion = c.companion ? svc.customers.find((o) => o.uid === c.companion) : null;
      const waitCompanion = companion && (companion.state === 'SEATED' || companion.state === 'ENTERING');
      if (c.wait <= 0 && !waitCompanion) startLeaving(svc, c);
    } else if (c.state === 'ANGRY') {
      c.wait -= dt;
      if (c.wait <= 0) startLeaving(svc, c);
    } else if (c.state === 'LEAVING') {
      const door = c.fromLeft ? DOOR_LEFT : DOOR_RIGHT;
      c.x += Math.sign(door - c.x) * Math.min(Math.abs(door - c.x), speed * dt);
      if (Math.abs(c.x - door) < 0.5) {
        c.state = 'GONE';
        if (svc.seats[c.seat] === c) svc.seats[c.seat] = null;
        svc.arrivalTimer = Math.max(svc.arrivalTimer, 1.5);
      }
    }
  }
  svc.customers = svc.customers.filter((c) => c.state !== 'GONE');
}

function say(svc, c, text, seconds = 3.2) {
  if (!text) return;
  c.bubble = text;
  c.bubbleTime = seconds;
  emit(svc, 'say', { npc: c.npc, seat: c.seat, text });
}

function pickLine(svc, npc, key) {
  const lines = CUSTOMERS[npc].lines[key] || CUSTOMERS[npc].lines.ok;
  return lines ? svc.rng.pick(lines) : '';
}

function seatCustomer(svc, c) {
  c.state = 'SEATED';
  const spec = c.spec;
  const recipeId = spec.recipe || null;
  const tag = spec.tag || null;
  const base = svc.rules.patience * CUSTOMERS[c.npc].patienceMultiplier * svc.mods.patienceMult * svc.rules.pace;
  const size = recipeId ? RECIPE_BY_ID[recipeId].ingredients.length : 2;
  const patience = Math.round((base + (size - 2) * 12 + (tag ? 6 : 0)) * (spec.priority ? 1.1 : 1));
  const order = createOrder({
    id: `o${svc.night}-${++svc.orderSeq}`,
    npc: c.npc,
    seat: c.seat,
    recipeId,
    tag,
    patience,
    priority: spec.priority,
    noExpire: spec.noExpire || !svc.rules.timed,
    tutorial: spec.tutorial,
    issuedAt: svc.time,
  });
  svc.orders.push(order);
  c.orderId = order.id;
  svc.stats.customersSeen += 1;
  const line = fillLine(pickLine(svc, c.npc, order.kind === 'tag' ? 'open' : 'order'), order);
  say(svc, c, line, 4);
  emit(svc, 'order', { order });
  emit(svc, 'sfx', { id: 'order' });
}

function startLeaving(svc, c) {
  c.state = 'LEAVING';
  c.bubbleTime = Math.min(c.bubbleTime, 1.2);
}

function expireOrder(svc, c, order) {
  if (!closeOrder(order, ORDER_STATUS.EXPIRED)) return;
  svc.stats.expired += 1;
  svc.stats.streak = 0;
  svc.stats.combo = 0;
  c.mood = 'angry';
  c.state = 'ANGRY';
  c.wait = 0.9;
  say(svc, c, pickLine(svc, c.npc, 'leave'));
  changeTrust(svc, c.npc, order.priority ? -0.7 : -0.5);
  const delta = applyTension(svc, svc.rules.expiryTension);
  toast(svc, `${CUSTOMERS[c.npc].name} foi embora com fome.${delta > 0 ? ` Tensão +${Math.round(delta)}.` : ''}`, 'bad', 3);
  emit(svc, 'sfx', { id: 'expired' });
  emit(svc, 'expired', { order });
  if (svc.mode === 'desafio') svc.stats.coins = Math.max(0, svc.stats.coins - 20);
  endConflictsFor(svc, c.npc, 'left');
}

function applyTension(svc, amount) {
  if (!svc.chaos.enabled || !amount) return 0;
  const cap = svc.rules.tensionCap;
  const before = svc.chaos.tension;
  addTension(svc.chaos, amount);
  if (svc.chaos.tension > cap) svc.chaos.tension = cap;
  return svc.chaos.tension - before;
}

// ---------- Chegadas ----------
function presentNpcs(svc) {
  return new Set(svc.customers.filter((c) => c.state !== 'GONE').map((c) => c.npc));
}

function freeSeats(svc) {
  return [0, 1, 2].filter((i) => !svc.seats[i]);
}

function occupied(svc) {
  return svc.seats.filter(Boolean).length;
}

function updateArrivals(svc, dt) {
  svc.arrivalTimer = Math.max(0, svc.arrivalTimer - dt);
  if (svc.arrivalTimer > 0) return;
  const seats = freeSeats(svc);
  if (!seats.length || occupied(svc) >= svc.rules.maxActive) return;
  if (svc.mode === 'desafio') {
    if (svc.rules.timeLimit && svc.time > svc.rules.timeLimit - 12) return;
    spawnGuest(svc, { npcs: [null], orders: [{}] }, seats);
    return;
  }
  // Ordem de chegada respeitada: quem espera lugar (ou o tutorial) segura a fila;
  // só se pula um convidado cujo personagem já está no salão.
  const present = presentNpcs(svc);
  const room = Math.min(seats.length, svc.rules.maxActive - occupied(svc));
  let idx = -1;
  for (let i = 0; i < svc.guests.length; i++) {
    const g = svc.guests[i];
    if (g.npcs.some((npc) => npc && present.has(npc))) continue;
    if ((g.waitTutorial && !svc.tutorialDone) || g.npcs.length > room) break;
    idx = i;
    break;
  }
  if (idx < 0) return;
  const guest = svc.guests.splice(idx, 1)[0];
  spawnGuest(svc, guest, seats);
}

function spawnGuest(svc, guest, seats) {
  const present = presentNpcs(svc);
  const group = [];
  guest.npcs.forEach((npcId, i) => {
    const npc = npcId || chooseRandomNpc(svc, present);
    if (!npc) return;
    present.add(npc);
    const spec = resolveOrderSpec(svc, npc, guest.orders[i] || {});
    Object.assign(spec, { priority: guest.priority, noExpire: guest.noExpire, tutorial: guest.tutorial });
    const seat = guest.npcs.length > 1 ? seats[0] : chooseSeat(svc, seats);
    if (seat == null) return;
    seats = seats.filter((s) => s !== seat);
    group.push(makeCustomer(svc, npc, spec, seat));
  });
  if (group.length === 2) {
    group[0].companion = group[1].uid;
    group[1].companion = group[0].uid;
  }
  const [gMin, gMax] = svc.rules.arrivalGap;
  svc.arrivalTimer = svc.rng.range(gMin, gMax) * (svc.mode === 'tranquilo' ? 1.2 : 1);
  if (group.length) emit(svc, 'sfx', { id: 'door' });
}

function makeCustomer(svc, npc, spec, seat) {
  const fromLeft = seat < 2 ? seat === 0 || svc.rng.chance(0.5) : false;
  const c = {
    uid: `c${++svc.customerSeq}`,
    npc,
    seat,
    spec,
    state: 'ENTERING',
    x: fromLeft ? DOOR_LEFT : DOOR_RIGHT,
    y: SEAT_Y,
    fromLeft,
    orderId: null,
    mood: 'neutral',
    bubble: '',
    bubbleTime: 0,
    wait: 0,
    animT: svc.rng.next() * 10,
    stars: 0,
    companion: null,
  };
  svc.seats[seat] = c;
  svc.customers.push(c);
  return c;
}

// Senta um cliente imediatamente com o pedido indicado (testes e depuração).
export function seatNow(svc, npc, spec, seat) {
  if (svc.seats[seat]) throw new Error(`Lugar ${seat} ocupado`);
  const full = { recipe: spec.recipe || null, tag: spec.tag || null, priority: Boolean(spec.priority), noExpire: Boolean(spec.noExpire), tutorial: Boolean(spec.tutorial) };
  const c = makeCustomer(svc, npc, full, seat);
  c.x = SEAT_X[seat];
  seatCustomer(svc, c);
  return c;
}

function chooseSeat(svc, seats) {
  if (!seats.length) return null;
  // Prefere o meio no tutorial; depois sorteia.
  if (svc.tutorial && !svc.tutorialDone && seats.includes(1)) return 1;
  return svc.rng.pick(seats);
}

function chooseRandomNpc(svc, present) {
  const cast = svc.def.cast.filter((id) => !present.has(id));
  if (!cast.length) return null;
  return svc.rng.pick(cast);
}

// Sorteia pedido respeitando gostos; pedidos abertos só quando há 2+ pratos possíveis.
function resolveOrderSpec(svc, npc, spec) {
  if (spec.recipe || spec.tag) return { recipe: spec.recipe || null, tag: spec.tag || null };
  const info = CUSTOMERS[npc];
  const menu = svc.recipes.filter((id) => !RECIPE_BY_ID[id].special);
  const openChance = svc.mode === 'desafio' ? 0.18 : svc.night >= 3 ? 0.25 : 0.12;
  if (svc.rng.chance(openChance)) {
    const tags = info.likes.filter((tag) => TAGS[tag] && menu.filter((id) => RECIPE_BY_ID[id].tags.includes(tag)).length >= 2);
    if (tags.length) return { recipe: null, tag: svc.rng.pick(tags) };
  }
  const weighted = menu.map((id) => {
    const r = RECIPE_BY_ID[id];
    let w = 1 + 2 * r.tags.filter((t) => info.likes.includes(t)).length;
    if (r.tags.some((t) => info.dislikes.includes(t))) w *= 0.15;
    return { value: id, weight: w };
  });
  return { recipe: svc.rng.weighted(weighted), tag: null };
}

// ---------- Caos ----------
function updateChaos(svc, dt) {
  const chaos = svc.chaos;
  if (svc.rules.conflicts && chaos.enabled) watchRivals(svc, dt);
  const events = tickChaos(chaos, dt, svc.rules);
  if (chaos.tension > svc.rules.tensionCap) chaos.tension = svc.rules.tensionCap;
  for (const ev of events) {
    if (ev.type === 'conflictActive') {
      toast(svc, `Atrito! ${RIVALRY_BY_ID[ev.conflict.pair].name}: a tensão sobe. Toque o sino, converse ou sirva um prato da paz.`, 'warn', 3.6);
      emit(svc, 'sfx', { id: 'conflict' });
    } else if (ev.type === 'crisis') {
      triggerCrisis(svc);
    }
  }
}

function watchRivals(svc, dt) {
  const seated = svc.customers.filter((c) => c.state === 'SEATED' || c.state === 'EATING');
  for (const rivalry of RIVALRIES) {
    const a = seated.find((c) => c.npc === rivalry.a);
    const b = seated.find((c) => c.npc === rivalry.b);
    const watch = svc.pairWatch[rivalry.id] || (svc.pairWatch[rivalry.id] = { key: '', t: 0, done: false });
    if (!a || !b || a.state !== 'SEATED' || b.state !== 'SEATED') {
      if (!a || !b) { watch.key = ''; watch.t = 0; watch.done = false; }
      continue;
    }
    const key = `${a.uid}:${b.uid}`;
    if (watch.key !== key) { watch.key = key; watch.t = 0; watch.done = false; }
    if (watch.done) continue;
    watch.t += dt;
    if (watch.t >= CONFLICT_DELAY) {
      watch.done = true;
      const conflict = startConflict(svc.chaos, rivalry);
      conflict.uids = [a.uid, b.uid];
      svc.stats.conflicts += 1;
      a.mood = 'angry';
      b.mood = 'angry';
      toast(svc, rivalry.warning, 'warn', 4.2);
      emit(svc, 'conflictWarning', { pair: rivalry.id });
      emit(svc, 'sfx', { id: 'warning' });
    }
  }
}

function triggerCrisis(svc) {
  const chaos = svc.chaos;
  svc.stats.crises += 1;
  svc.stats.combo = 0;
  svc.stats.streak = 0;
  chaos.tension = CRISIS_RESET;
  chaos.crisisFlash = 1.4;
  for (const conflict of activeConflicts(chaos)) {
    resolveConflict(conflict, 'crisis');
    changeBond(svc, conflict.pair, -0.5);
  }
  for (const c of svc.customers) {
    if (c.state !== 'SEATED') continue;
    const order = orderOf(svc, c);
    if (order && order.status === ORDER_STATUS.ACTIVE && !order.noExpire) {
      order.patience = Math.max(Math.min(order.patience, 6), order.patience - order.maxPatience * 0.25);
    }
    c.mood = 'impatient';
  }
  if (svc.mode === 'desafio') svc.stats.coins = Math.max(0, svc.stats.coins - 30);
  toast(svc, 'CONFUSÃO NO SALÃO! Canecas voando, paciência caindo. Respire: dá para recuperar.', 'bad', 4);
  emit(svc, 'crisis', {});
  emit(svc, 'sfx', { id: 'crisis' });
}

function endConflictsFor(svc, npc, method) {
  const conflict = conflictFor(svc.chaos, npc);
  if (conflict) resolveConflict(conflict, method);
}

function resolveWith(svc, conflict, method) {
  if (!resolveConflict(conflict, method)) return false;
  svc.stats.conflictsResolved += 1;
  const rivalry = RIVALRY_BY_ID[conflict.pair];
  const bond = method === 'peace' ? 1 : method === 'bell' ? 0 : 0.5;
  if (bond) changeBond(svc, conflict.pair, bond);
  for (const c of svc.customers) {
    if ((c.npc === conflict.a || c.npc === conflict.b) && c.mood === 'angry' && c.state === 'SEATED') c.mood = 'neutral';
  }
  toast(svc, method === 'peace' ? rivalry.reconciled : rivalry.resolved, 'good', 3.4);
  emit(svc, 'conflictResolved', { pair: conflict.pair, method });
  emit(svc, 'sfx', { id: 'peace' });
  return true;
}

// ---------- Ações do jogador ----------
export function interact(svc) {
  if (svc.ended) return { ok: false };
  const p = svc.player;
  const id = nearestStation(p.x, p.y);
  if (!id) {
    toast(svc, 'Chegue mais perto de uma bancada.', 'info', 1.8);
    return { ok: false, reason: 'far' };
  }
  // E só confirma entregas; confirmações iniciadas com Q (descartar/limpar) exigem Q.
  if (svc.pending && svc.pending.type === 'deliver' && svc.pending.station === id && svc.time <= svc.pending.expires) {
    return confirmPending(svc);
  }
  svc.pending = null;
  if (!isStationAvailable(svc, id)) {
    toast(svc, unavailableText(svc, id), 'info');
    emit(svc, 'sfx', { id: 'deny' });
    return { ok: false, reason: 'unavailable' };
  }
  const layout = STATION_LAYOUT[id];
  switch (layout.kind) {
    case 'pantry': return interactPantry(svc, id);
    case 'board': return interactBoard(svc);
    case 'cook': return interactCook(svc, id);
    case 'seat': return interactSeat(svc, layout.seat);
    case 'trash': return interactTrash(svc);
    case 'bell': return interactBell(svc);
    default: return { ok: false };
  }
}

export function shelfOptions(svc, shelfId) {
  return SHELVES[shelfId].items.map((id) => ({ id, unlocked: svc.ingredients.includes(id) }));
}

function interactPantry(svc, id) {
  if (!hasFreeSlot(svc)) {
    toast(svc, capacity(svc) > 1 ? 'Mãos e bandeja cheias. Use ou descarte algo (Q).' : 'Você só tem duas mãozinhas. E nem isso, você é fantasma. Use ou descarte o item (Q).', 'warn');
    emit(svc, 'sfx', { id: 'deny' });
    return { ok: false, reason: 'full' };
  }
  const options = shelfOptions(svc, STATION_LAYOUT[id].shelf).filter((o) => o.unlocked);
  if (options.length === 1) return takeIngredient(svc, options[0].id);
  emit(svc, 'picker', { station: id, shelf: STATION_LAYOUT[id].shelf, options: options.map((o) => o.id), suggested: suggestIngredient(svc, options.map((o) => o.id)) });
  return { ok: true, picker: true };
}

// Sugere o ingrediente mais útil para os pedidos ativos (ajuda de acessibilidade).
export function suggestIngredient(svc, ids) {
  for (const order of activeOrders(svc).sort((a, b) => a.patience - b.patience)) {
    for (const rid of satisfyingRecipes(order, svc.recipes)) {
      const need = RECIPE_BY_ID[rid].ingredients.find((ing) => ids.includes(ing));
      if (need) return need;
    }
  }
  return ids[0] || null;
}

export function takeIngredient(svc, ingredientId) {
  const p = svc.player;
  const id = nearestStation(p.x, p.y);
  const info = INGREDIENTS[ingredientId];
  if (!info || !id || STATION_LAYOUT[id].kind !== 'pantry' || STATION_LAYOUT[id].shelf !== info.shelf) {
    toast(svc, 'Chegue perto da prateleira certa para pegar esse ingrediente.', 'info');
    return { ok: false, reason: 'far' };
  }
  if (!isStationAvailable(svc, id) || !svc.ingredients.includes(ingredientId)) {
    toast(svc, `${info.name} ainda não está disponível.`, 'info');
    return { ok: false, reason: 'locked' };
  }
  if (!hasFreeSlot(svc)) {
    toast(svc, 'Mãos cheias. Use ou descarte algo (Q).', 'warn');
    return { ok: false, reason: 'full' };
  }
  const item = svc.itemFactory.ingredient(ingredientId);
  p.hands.push(item);
  p.anim = 'pick';
  p.animTime = 0.3;
  toast(svc, info.prep === 'chop' ? `Pegou ${info.name}. Agora à tábua para ${info.prepVerb}!` : `Pegou ${info.name}. Vai direto para a estação.`, 'info', 2);
  emit(svc, 'sfx', { id: 'pick' });
  return { ok: true, item };
}

function interactBoard(svc) {
  const p = svc.player;
  const board = svc.board;
  if (board.state === BOARD_STATE.CHOPPING) {
    const result = chop(board);
    afterChop(svc, result);
    return result;
  }
  if (board.state === BOARD_STATE.DONE) {
    if (!hasFreeSlot(svc)) {
      toast(svc, 'Mãos cheias. O ingrediente picado espera na tábua.', 'warn');
      return { ok: false, reason: 'full' };
    }
    const res = takeFromBoard(board);
    p.hands.push(res.item);
    emit(svc, 'sfx', { id: 'pick' });
    toast(svc, `${INGREDIENTS[res.item.id].name} picado na mão. Agora à estação!`, 'info', 2);
    return res;
  }
  const raw = p.hands.find((i) => i.type === 'ingredient' && !ingredientReady(i));
  const candidate = raw || p.hands[p.hands.length - 1];
  const check = checkBoardPlace(board, candidate);
  if (!check.ok) {
    toast(svc, p.hands.length ? check.text : 'A tábua não pica preocupações. Pegue um ingrediente na despensa.', 'info');
    emit(svc, 'sfx', { id: 'deny' });
    return check;
  }
  removeFromHands(svc, candidate.uid);
  const result = placeOnBoard(board, candidate);
  afterChop(svc, result);
  return result;
}

function afterChop(svc, result) {
  const p = svc.player;
  const board = svc.board;
  p.anim = 'chop';
  p.animTime = 0.25;
  emit(svc, 'sfx', { id: 'chop' });
  emit(svc, 'fx', { kind: 'chop', station: 'board' });
  const info = INGREDIENTS[board.item.id];
  if (!result.done) {
    toast(svc, `TAC! Mais um corte e esse ${info.short.toLowerCase()} vira culinária, não arqueologia.`, 'info', 1.6);
    return;
  }
  if (hasFreeSlot(svc)) {
    const res = takeFromBoard(board);
    p.hands.push(res.item);
    toast(svc, `${info.name} pronto! Leve à estação.`, 'good', 2);
  } else {
    toast(svc, `${info.name} pronto na tábua. Libere as mãos para pegar.`, 'info', 2.2);
  }
}

function interactCook(svc, id) {
  const p = svc.player;
  const st = svc.cook[id];
  const name = COOK_STATIONS[st.cookType].name;
  if (canTakeDish(st)) {
    if (!canHoldDish(svc)) {
      toast(svc, heldDish(svc) ? 'Você já carrega um prato. Entregue-o primeiro.' : 'Mãos cheias. Libere espaço para pegar o prato.', 'warn');
      emit(svc, 'sfx', { id: 'deny' });
      return { ok: false, reason: 'full' };
    }
    const res = takeDish(st);
    p.hands.push(res.dish);
    p.anim = 'pick';
    p.animTime = 0.3;
    const recipe = RECIPE_BY_ID[res.dish.recipeId];
    if (!svc.cooked.includes(recipe.id)) svc.cooked.push(recipe.id);
    if (res.dish.quality === 'burnt') toast(svc, `${dishName(recipe, 'burnt')} na mão. Descarte (Q) ou entregue com consequência.`, 'bad', 2.8);
    else toast(svc, `${recipe.name} na mão! Corra para o balcão.`, 'good', 2.2);
    emit(svc, 'sfx', { id: 'plate' });
    return res;
  }
  if (st.state === STATION_STATE.PROCESSING) {
    // Com ingrediente na mão: "ocupado" (o item fica com o chef). Sem nada: tempo restante.
    const holding = p.hands.find((i) => i.type === 'ingredient');
    const res = holding ? checkAdd(st, holding, svc.recipes) : takeDish(st);
    toast(svc, res.text, 'info', 2);
    emit(svc, 'sfx', { id: 'deny' });
    return res;
  }
  // Sussurro da panela (evento de história): ouvir com as mãos vazias.
  if (svc.whisper && svc.whisper.station === id && !p.hands.length) return listenWhisper(svc);
  const usable = p.hands.filter((i) => i.type === 'ingredient');
  if (!usable.length) {
    if (heldDish(svc)) toast(svc, `Prato não volta para o ${name.toLowerCase()}. Leve ao balcão ou descarte (Q).`, 'info');
    else if (st.state === STATION_STATE.LOADING) toast(svc, `${name}: ${loadingHint(st, svc.recipes) || 'aguardando ingredientes.'}`, 'info', 3);
    else toast(svc, `${name} vazio. Traga ingredientes preparados.`, 'info');
    return { ok: false, reason: 'nothing' };
  }
  const refusals = [];
  // Tenta cada ingrediente da mão (preparados primeiro).
  const ordered = [...usable].sort((a, b) => Number(ingredientReady(b)) - Number(ingredientReady(a)));
  for (const item of ordered) {
    const check = checkAdd(st, item, svc.recipes);
    if (!check.ok) { refusals.push(check); continue; }
    removeFromHands(svc, item.uid);
    const res = addIngredient(st, item, svc.recipes, cookTiming(svc, st.cookType));
    p.anim = 'drop';
    p.animTime = 0.25;
    emit(svc, 'sfx', { id: st.cookType === 'cold' ? 'assemble' : 'drop' });
    emit(svc, 'fx', { kind: 'drop', station: id });
    if (res.started) {
      if (st.state === STATION_STATE.READY) {
        if (!svc.cooked.includes(res.recipe.id)) svc.cooked.push(res.recipe.id);
        toast(svc, `${res.recipe.name} montado! Pronto para servir.`, 'good', 2.4);
        emit(svc, 'sfx', { id: 'ready' });
      } else {
        toast(svc, `${name}: preparando ${res.recipe.name}...`, 'info', 2.2);
      }
    } else {
      toast(svc, `${INGREDIENTS[item.id].name} no ${name.toLowerCase()}. ${loadingHint(st, svc.recipes)}`, 'info', 3);
    }
    return res;
  }
  // "Cru" é o motivo mais útil de mostrar: diz exatamente o que fazer.
  const refusal = refusals.find((r) => r.reason === 'raw') || refusals[0];
  toast(svc, refusal.text, refusal.reason === 'raw' ? 'warn' : 'info', 2.8);
  emit(svc, 'sfx', { id: 'deny' });
  return refusal;
}

function listenWhisper(svc) {
  const w = svc.whisper;
  svc.whisper = null;
  if (w.clue) uniquePush(svc.clues, w.clue);
  uniquePush(svc.flags, 'heard_voice');
  svc.story.push(w.dialogue);
  emit(svc, 'sfx', { id: 'voice' });
  return { ok: true, whisper: true };
}

function interactSeat(svc, seat) {
  const p = svc.player;
  const c = svc.seats[seat];
  if (!c || c.state === 'ENTERING') {
    toast(svc, c ? `${CUSTOMERS[c.npc].name} ainda está chegando.` : 'Ninguém sentado aqui ainda.', 'info', 1.8);
    return { ok: false, reason: 'empty' };
  }
  const order = orderOf(svc, c);
  if (!order || order.status !== ORDER_STATUS.ACTIVE || c.state !== 'SEATED') {
    toast(svc, order && order.status === ORDER_STATUS.FULFILLED ? `${CUSTOMERS[c.npc].name} já foi servido(a). Deixe comer em paz!` : `${CUSTOMERS[c.npc].name} já está de saída.`, 'info', 2);
    return { ok: false, reason: 'closed' };
  }
  const dish = heldDish(svc);
  if (!dish) {
    if (!p.hands.length) return talkTo(svc, c, order);
    toast(svc, 'O balcão só aceita PRATOS prontos, não boas intenções.', 'info');
    emit(svc, 'sfx', { id: 'deny' });
    return { ok: false, reason: 'noDish' };
  }
  const warning = deliveryWarning(order, dish, knownPrefs(svc, c.npc).filter((t) => CUSTOMERS[c.npc].dislikes.includes(t)));
  if (warning) {
    svc.pending = { type: 'deliver', station: `seat${seat}`, seat, dishUid: dish.uid, expires: svc.time + CONFIRM_SECONDS };
    toast(svc, `${warning} Aperte de novo para entregar assim mesmo, ou Q para descartar.`, 'warn', CONFIRM_SECONDS);
    emit(svc, 'sfx', { id: 'warning' });
    return { ok: false, reason: 'confirm' };
  }
  return deliver(svc, c, order, dish);
}

function talkTo(svc, c, order) {
  const conflict = conflictFor(svc.chaos, c.npc);
  if (conflict) {
    say(svc, c, pickLine(svc, c.npc, 'talk'));
    changeTrust(svc, c.npc, 0.1);
    applyTension(svc, -15);
    resolveWith(svc, conflict, 'talk');
    return { ok: true, talk: true, resolved: true };
  }
  // Conversar revela gostos e aversões: nada de aversão "fatal" escondida.
  const info = CUSTOMERS[c.npc];
  [...info.likes, ...info.dislikes].forEach((t) => learnPref(svc, c.npc, t));
  const likeText = info.likes.length ? ` Gosta de: ${info.likes.map(prefName).join(', ')}.` : '';
  const dislikeText = info.dislikes.length ? ` Evita: ${info.dislikes.map(prefName).join(', ')}.` : '';
  say(svc, c, order.kind === 'tag' ? fillLine(pickLine(svc, c.npc, 'open'), order) : fillLine(pickLine(svc, c.npc, 'order'), order));
  toast(svc, `${info.name} quer: ${orderLabel(order)}.${likeText}${dislikeText}`, 'info', 3.6);
  emit(svc, 'sfx', { id: 'talk' });
  return { ok: true, talk: true };
}

function confirmPending(svc) {
  const pending = svc.pending;
  svc.pending = null;
  if (pending.type === 'deliver') {
    const c = svc.seats[pending.seat];
    const order = orderOf(svc, c);
    const dish = svc.player.hands.find((i) => i.uid === pending.dishUid);
    if (!c || !order || order.status !== ORDER_STATUS.ACTIVE || !dish) {
      toast(svc, 'A situação mudou: entrega cancelada.', 'info');
      return { ok: false, reason: 'stale' };
    }
    return deliver(svc, c, order, dish);
  }
  if (pending.type === 'discardDish') {
    const item = removeFromHands(svc, pending.uid);
    if (item) {
      toast(svc, 'Prato descartado. O chef fingiu que não aconteceu.', 'info');
      emit(svc, 'sfx', { id: 'trash' });
    }
    return { ok: Boolean(item) };
  }
  if (pending.type === 'clear') return clearStation(svc, pending.station);
  return { ok: false };
}

function deliver(svc, c, order, dish) {
  const result = evaluateDelivery(order, dish, {
    trust: svc.trust[c.npc] ?? CUSTOMERS[c.npc].baseTrust,
    timed: svc.rules.timed,
    combo: svc.stats.combo,
    mode: svc.mode,
  });
  if (!result.accepted) {
    svc.stats.mistakes += 1;
    svc.stats.streak = 0;
    svc.stats.combo = 0;
    c.mood = 'confused';
    say(svc, c, pickLine(svc, c.npc, 'wrong'));
    toast(svc, `${result.text} O prato continua com você.`, 'bad', 3.2);
    emit(svc, 'sfx', { id: 'wrong' });
    emit(svc, 'refused', { seat: c.seat });
    return { ok: false, reason: 'wrong', text: result.text };
  }
  // Transição terminal única: se já foi fechado, nada é pago.
  if (!closeOrder(order, ORDER_STATUS.FULFILLED)) return { ok: false, reason: 'closed' };
  order.rewardClaimed = true;
  order.servedRecipe = dish.recipeId;
  order.servedQuality = dish.quality;
  removeFromHands(svc, dish.uid);
  const s = svc.stats;
  s.served += 1;
  s.starsTotal += result.stars;
  if (result.stars >= 4) s.good += 1;
  if (result.stars === 5) s.perfect += 1;
  if (result.burnt) s.burntDelivered += 1;
  s.coins += result.coins;
  s.tips += result.tip;
  s.streak += 1;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  s.combo += 1;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  s.recipesServed[dish.recipeId] = (s.recipesServed[dish.recipeId] || 0) + 1;
  if (RECIPE_BY_ID[dish.recipeId].special && dish.quality === 'perfect') uniquePush(svc.flags, 'banquet_perfect');
  changeTrust(svc, c.npc, result.trustDelta);
  const tensionDelta = applyTension(svc, result.tension);
  for (const r of result.reasons) if (r.pref) learnPref(svc, c.npc, r.pref);
  c.stars = result.stars;
  c.mood = result.stars >= 4 ? 'happy' : result.stars === 3 ? 'neutral' : 'sad';
  c.state = 'EATING';
  c.wait = EAT_SECONDS;
  const lineKey = result.burnt ? 'burnt' : result.dislikes.some((t) => t !== 'queimado') ? 'dislike' : result.stars >= 4 ? 'happy' : result.stars === 3 ? 'ok' : 'unhappy';
  say(svc, c, pickLine(svc, c.npc, lineKey), 3);
  emit(svc, 'delivered', { order, seat: c.seat, npc: c.npc, result, tensionDelta, recipeId: dish.recipeId });
  emit(svc, 'sfx', { id: result.stars >= 4 ? 'success' : 'serve' });
  if (s.streak === 5) emit(svc, 'achievement', { id: 'five_streak' });
  if (result.stars === 5) emit(svc, 'achievement', { id: 'five_stars' });
  emit(svc, 'achievement', { id: 'first_dish' });
  const recipe = RECIPE_BY_ID[dish.recipeId];
  const conflict = conflictFor(svc.chaos, c.npc);
  if (conflict) {
    if (recipe.peace > 0) resolveWith(svc, conflict, 'peace');
    else if (result.stars >= 4) resolveWith(svc, conflict, 'service');
  }
  checkHarmony(svc, c);
  if (order.tutorial) {
    svc.tutorialDone = true;
    emit(svc, 'tutorialDone', {});
  }
  return { ok: true, result };
}

function checkHarmony(svc, c) {
  if (c.stars < 4) return;
  for (const rivalry of RIVALRIES) {
    if (rivalry.a !== c.npc && rivalry.b !== c.npc) continue;
    const otherId = rivalry.a === c.npc ? rivalry.b : rivalry.a;
    const other = svc.customers.find((o) => o.npc === otherId && (o.state === 'EATING' || o.state === 'SEATED'));
    if (!other || other.stars < 4 || other.state !== 'EATING') continue;
    if (svc.stats.harmonyPairs.includes(rivalry.id)) continue;
    svc.stats.harmonyPairs.push(rivalry.id);
    uniquePush(svc.flags, `harmony_${rivalry.id}`);
    changeBond(svc, rivalry.id, 1);
    toast(svc, `Harmonia! ${CUSTOMERS[rivalry.a].name} e ${CUSTOMERS[rivalry.b].name} comeram juntos e em paz.`, 'good', 3.6);
    emit(svc, 'harmony', { pair: rivalry.id });
    emit(svc, 'sfx', { id: 'peace' });
  }
}

function interactTrash(svc) {
  const p = svc.player;
  if (!p.hands.length) {
    toast(svc, 'Mãos vazias. Para limpar uma estação, chegue perto dela e aperte Q.', 'info', 2.4);
    return { ok: false, reason: 'empty' };
  }
  return discard(svc, { fromTrash: true });
}

function interactBell(svc) {
  const res = ringBell(svc.chaos, svc.mods);
  if (!res.ok) {
    toast(svc, res.text, 'info', 1.6);
    return res;
  }
  emit(svc, 'sfx', { id: 'bell' });
  emit(svc, 'fx', { kind: 'bell', station: 'bell' });
  if (res.effect === 'resolved') {
    svc.stats.conflictsResolved += 1;
    if (res.coins) {
      svc.stats.coins += res.coins;
      svc.stats.peaceBonus += res.coins;
    }
    for (const c of svc.customers) {
      if ((c.npc === res.conflict.a || c.npc === res.conflict.b) && c.mood === 'angry' && c.state === 'SEATED') c.mood = 'neutral';
    }
    toast(svc, `${RIVALRY_BY_ID[res.conflict.pair].resolved}${res.coins ? ` Bônus de paz: +${res.coins} moedas.` : ''}`, 'good', 3.2);
    emit(svc, 'conflictResolved', { pair: res.conflict.pair, method: 'bell' });
  } else if (res.effect === 'calm') {
    toast(svc, `Dlim-dlom! O salão respira fundo. Tensão ${Math.round(res.tensionDelta)}.`, 'good', 2.4);
  } else {
    toast(svc, 'O sino toca bonito, mas ninguém estava brigando. Sem bônus.', 'info', 2.2);
  }
  return res;
}

export function discard(svc, opts = {}) {
  if (svc.ended) return { ok: false };
  const p = svc.player;
  if (svc.pending && svc.pending.type === 'deliver') {
    // Q durante confirmação de entrega: descarta o prato em questão.
    const uid = svc.pending.dishUid;
    svc.pending = null;
    const item = removeFromHands(svc, uid);
    if (item) {
      toast(svc, 'Prato descartado. Melhor assim.', 'info');
      emit(svc, 'sfx', { id: 'trash' });
      return { ok: true, item };
    }
  }
  if (svc.pending && (svc.pending.type === 'discardDish' || svc.pending.type === 'clear') && svc.time <= svc.pending.expires) {
    return confirmPending(svc);
  }
  if (p.hands.length) {
    const item = p.hands[p.hands.length - 1];
    if (item.type === 'dish') {
      const station = nearestStation(p.x, p.y);
      svc.pending = { type: 'discardDish', uid: item.uid, station, expires: svc.time + CONFIRM_SECONDS };
      toast(svc, `Jogar fora ${dishName(RECIPE_BY_ID[item.recipeId], item.quality)}? Aperte Q de novo para confirmar.`, 'warn', CONFIRM_SECONDS);
      return { ok: false, reason: 'confirm' };
    }
    p.hands.pop();
    toast(svc, opts.fromTrash ? `A lixeira recebeu ${INGREDIENTS[item.id].name.toLowerCase()} com desconfiança.` : `${INGREDIENTS[item.id].name} descartado.`, 'info', 1.8);
    emit(svc, 'sfx', { id: 'trash' });
    return { ok: true, item };
  }
  const id = nearestStation(p.x, p.y);
  if (id === 'board' && svc.board.item) {
    svc.pending = { type: 'clear', station: 'board', expires: svc.time + CONFIRM_SECONDS };
    toast(svc, 'Limpar a tábua? Aperte Q de novo para confirmar.', 'warn', CONFIRM_SECONDS);
    return { ok: false, reason: 'confirm' };
  }
  if (id && svc.cook[id] && svc.cook[id].state !== STATION_STATE.EMPTY) {
    svc.pending = { type: 'clear', station: id, expires: svc.time + CONFIRM_SECONDS };
    toast(svc, `Limpar ${COOK_STATIONS[svc.cook[id].cookType].name.toLowerCase()}? Tudo dentro será perdido. Aperte Q de novo para confirmar.`, 'warn', CONFIRM_SECONDS);
    return { ok: false, reason: 'confirm' };
  }
  toast(svc, 'Mãos vazias, ser sobrenatural. Nada para descartar.', 'info', 1.8);
  return { ok: false, reason: 'empty' };
}

function clearStation(svc, id) {
  if (id === 'board') {
    clearBoard(svc.board);
    toast(svc, 'Tábua limpa.', 'info');
  } else if (svc.cook[id]) {
    resetCookStation(svc.cook[id]);
    toast(svc, `${COOK_STATIONS[svc.cook[id].cookType].name} limpo. Evidências apagadas.`, 'info');
  } else return { ok: false };
  emit(svc, 'sfx', { id: 'trash' });
  return { ok: true, cleared: id };
}

// ---------- Eventos de história durante o serviço ----------
function updateTriggers(svc) {
  if (svc.mode === 'desafio') return;
  for (const ev of svc.def.events || []) {
    if (svc.triggered.includes(ev.id)) continue;
    const w = ev.when;
    let fire = false;
    if (w.type === 'served') fire = svc.orders.some((o) => o.npc === w.npc && o.status === ORDER_STATUS.FULFILLED);
    else if (w.type === 'servedCount') {
      fire = svc.stats.served >= w.count || (w.orTime != null && svc.time >= w.orTime) || (!svc.guests.length && !svc.customers.length);
    }
    if (!fire) continue;
    svc.triggered.push(ev.id);
    if (ev.dialogue) svc.story.push(ev.dialogue);
    if (ev.whisper) {
      svc.whisper = { ...ev.whisper };
      toast(svc, 'O caldeirão está sussurrando... Chegue perto com as mãos vazias e escute.', 'warn', 4);
      emit(svc, 'sfx', { id: 'voice' });
    }
  }
}

// Efeitos de escolhas de diálogo aplicados durante o serviço.
export function applyServiceEffects(svc, effects = {}) {
  for (const [npc, delta] of Object.entries(effects.trust || {})) changeTrust(svc, npc, delta);
  for (const [pair, delta] of Object.entries(effects.bond || {})) changeBond(svc, pair, delta);
  if (effects.clue) uniquePush(svc.clues, effects.clue);
  if (effects.flag) uniquePush(svc.flags, effects.flag);
  if (effects.journal) uniquePush(svc.flags, `journal:${effects.journal}`);
}

// ---------- Fim ----------
function checkEnd(svc) {
  if (svc.mode === 'desafio') {
    if (svc.time >= svc.rules.timeLimit) endService(svc, 'time');
    return;
  }
  if (svc.guests.length || svc.customers.length || svc.whisper || svc.story.length) {
    if (!svc.guests.length && !svc.customers.length && svc.whisper && !svc.whisperReminded) {
      svc.whisperReminded = true;
      toast(svc, 'O salão esvaziou, mas o caldeirão ainda sussurra. Escute antes de fechar.', 'warn', 4);
    }
    return;
  }
  endService(svc, 'done');
}

function endService(svc, reason) {
  if (svc.ended) return;
  svc.ended = true;
  svc.endReason = reason;
  for (const order of svc.orders) if (order.status === ORDER_STATUS.ACTIVE) closeOrder(order, ORDER_STATUS.CANCELLED);
  emit(svc, 'serviceEnd', { reason });
}

// Encerra à força (abandonar turno). Nada é pago.
export function abortService(svc) {
  endService(svc, 'abort');
}

// ---------- Objetivos ----------
export function objectiveProgress(svc, objective = svc.def.objective) {
  if (!objective) return { done: false, value: 0, target: 0, text: '' };
  const s = svc.stats;
  let value = 0;
  let done = false;
  switch (objective.type) {
    case 'serveCorrect': value = s.served; done = value >= objective.target; break;
    case 'goodRatings': value = s.good; done = value >= objective.target; break;
    case 'resolveConflict': value = s.conflictsResolved; done = value >= objective.target && s.crises === 0; break;
    case 'serveRecipe':
    case 'banquet': value = s.recipesServed[objective.recipe] || 0; done = value >= objective.target; break;
    case 'clueAndServe': value = s.served; done = svc.clues.includes(objective.clue) && value >= objective.target; break;
    case 'harmony': value = s.harmonyPairs.includes(objective.pair) ? 1 : 0; done = value >= 1; break;
    default: break;
  }
  return { done, value: Math.min(value, objective.target ?? value), target: objective.target ?? 1, text: objective.text, failed: objective.type === 'resolveConflict' && s.crises > 0 };
}

export function bonusResults(svc) {
  return (svc.def.bonus || []).map((b) => {
    const s = svc.stats;
    let done = false;
    if (b.type === 'noExpired') done = s.expired === 0;
    else if (b.type === 'noBurnt') done = s.burntCreated === 0 && s.burntDelivered === 0;
    else if (b.type === 'tensionBelow') done = !svc.chaos.enabled || svc.chaos.maxTension < b.value;
    else if (b.type === 'goodRatings') done = s.good >= b.value;
    return { ...b, done };
  });
}

// ---------- Guia (tutorial e dica opcional) ----------
export function computeGuide(svc) {
  const orders = activeOrders(svc);
  if (!orders.length) return null;
  const order = svc.tutorial && !svc.tutorialDone ? orders.find((o) => o.tutorial) || orders[0] : orders.slice().sort((a, b) => (a.patience / a.maxPatience) - (b.patience / b.maxPatience))[0];
  if (!order) return null;
  return guideForOrder(svc, order);
}

export function guideForOrder(svc, order) {
  const p = svc.player;
  const seatId = `seat${order.seat}`;
  const npc = CUSTOMERS[order.npc].name;
  const dish = heldDish(svc);
  if (dish && orderMatches(order, dish.recipeId)) return { station: seatId, text: `Entregue a ${npc} no balcão.` };
  const options = satisfyingRecipes(order, svc.recipes).map((id) => RECIPE_BY_ID[id]);
  if (!options.length) return null;
  // Algum prato pronto ou em preparo serve?
  for (const r of options) {
    const st = Object.values(svc.cook).find((s) => s.recipeId === r.id && (s.state === STATION_STATE.READY || s.state === STATION_STATE.PROCESSING));
    if (st) {
      if (st.state === STATION_STATE.PROCESSING) return { station: st.id, text: `${r.name} cozinhando. Espere ficar no ponto.`, waiting: true };
      return { station: st.id, text: dish ? `Entregue o prato que está na mão e volte para pegar ${r.name}.` : `Pegue ${r.name} no ${COOK_STATIONS[st.cookType].name.toLowerCase()}.` };
    }
  }
  // Escolhe a receita cujo preparo já começou, senão a primeira.
  const recipe = options.find((r) => contentIds(svc.cook[r.station]).length && checkPrefix(svc, r)) || options[0];
  const st = svc.cook[recipe.station];
  const stationName = COOK_STATIONS[recipe.station].name;
  if (st.state !== STATION_STATE.EMPTY && st.state !== STATION_STATE.LOADING) {
    return { station: st.id, text: `${stationName} ocupado: retire o prato ou limpe (Q) para fazer ${recipe.name}.` };
  }
  const inStation = st.state === STATION_STATE.LOADING && checkPrefix(svc, recipe) ? contentIds(st) : [];
  if (st.state === STATION_STATE.LOADING && !inStation.length) {
    return { station: st.id, text: `${stationName} com outra mistura. Termine-a ou limpe com Q.` };
  }
  const missing = [...recipe.ingredients];
  for (const id of inStation) missing.splice(missing.indexOf(id), 1);
  for (const ingId of missing) {
    const info = INGREDIENTS[ingId];
    const held = p.hands.find((i) => i.type === 'ingredient' && i.id === ingId);
    if (held && ingredientReady(held)) return { station: recipe.station, text: `Coloque ${info.name} no ${stationName.toLowerCase()} (${recipe.name}).` };
    if (held) return { station: 'board', text: `Na tábua: aperte duas vezes para ${info.prepVerb} ${info.name}.` };
    if (svc.board.item && svc.board.item.id === ingId) return { station: 'board', text: svc.board.state === BOARD_STATE.DONE ? `Pegue ${info.name} na tábua.` : `Continue cortando ${info.name} na tábua.` };
  }
  const next = missing[0];
  if (!next) return null;
  const info = INGREDIENTS[next];
  if (!hasFreeSlot(svc)) return { station: 'trash', text: 'Mãos cheias. Use o que carrega ou descarte com Q.' };
  return { station: info.shelf, text: `Pegue ${info.name} na ${SHELVES[info.shelf].name} (${recipe.name}).` };
}

function checkPrefix(svc, recipe) {
  const st = svc.cook[recipe.station];
  const ids = contentIds(st);
  const pool = [...recipe.ingredients];
  for (const id of ids) {
    const i = pool.indexOf(id);
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return true;
}

// ---------- Contexto para a interface ----------
export function describeContext(svc) {
  const p = svc.player;
  const id = nearestStation(p.x, p.y);
  if (!id) return { station: null, verb: 'Fazer', label: 'Ande até uma bancada', enabled: false };
  const layout = STATION_LAYOUT[id];
  const label = layout.kind === 'seat' ? seatLabel(svc, layout.seat) : layout.label;
  if (svc.pending && svc.pending.station === id) {
    return { station: id, verb: svc.pending.type === 'deliver' ? 'Confirmar' : 'Confirmar', label, enabled: true, confirm: true };
  }
  if (!isStationAvailable(svc, id)) return { station: id, verb: 'Indisponível', label, enabled: false };
  switch (layout.kind) {
    case 'pantry': return { station: id, verb: hasFreeSlot(svc) ? 'Pegar' : 'Mãos cheias', label, enabled: hasFreeSlot(svc) };
    case 'board': {
      const b = svc.board;
      if (b.state === BOARD_STATE.CHOPPING) return { station: id, verb: `Cortar ${b.chops}/2`, label, enabled: true };
      if (b.state === BOARD_STATE.DONE) return { station: id, verb: 'Pegar', label, enabled: hasFreeSlot(svc) };
      const raw = p.hands.find((i) => i.type === 'ingredient' && !ingredientReady(i));
      return { station: id, verb: raw ? 'Cortar' : 'Cortar', label, enabled: Boolean(raw) };
    }
    case 'cook': {
      const st = svc.cook[id];
      if (canTakeDish(st)) return { station: id, verb: st.state === STATION_STATE.SPOILED ? 'Pegar carvão' : 'Pegar prato', label, enabled: canHoldDish(svc) };
      if (st.state === STATION_STATE.PROCESSING) return { station: id, verb: `Cozinhando ${Math.ceil(st.remaining)}s`, label, enabled: false };
      if (svc.whisper && svc.whisper.station === id && !p.hands.length) return { station: id, verb: 'Ouvir', label, enabled: true };
      const usable = p.hands.some((i) => i.type === 'ingredient');
      return { station: id, verb: st.cookType === 'cold' ? 'Montar' : 'Colocar', label, enabled: usable };
    }
    case 'seat': {
      const c = svc.seats[layout.seat];
      if (!c || c.state !== 'SEATED') return { station: id, verb: 'Entregar', label, enabled: false };
      if (heldDish(svc)) return { station: id, verb: 'Entregar', label, enabled: true };
      if (conflictFor(svc.chaos, c.npc)) return { station: id, verb: 'Acalmar', label, enabled: !p.hands.length };
      return { station: id, verb: 'Conversar', label, enabled: !p.hands.length };
    }
    case 'trash': return { station: id, verb: 'Jogar fora', label, enabled: p.hands.length > 0 };
    case 'bell': {
      const cd = svc.chaos.bellCooldown;
      return { station: id, verb: cd > 0 ? `Sino ${Math.ceil(cd)}s` : 'Tocar sino', label, enabled: cd <= 0 };
    }
    default: return { station: id, verb: 'Fazer', label, enabled: false };
  }
}

function seatLabel(svc, seat) {
  const c = svc.seats[seat];
  return c ? `Balcão · ${CUSTOMERS[c.npc].name}` : 'Balcão vazio';
}

// Itens existentes em todos os lugares (para checar invariantes nos testes).
export function allItems(svc) {
  const items = [...svc.player.hands];
  if (svc.board.item) items.push(svc.board.item);
  for (const st of Object.values(svc.cook)) {
    items.push(...st.contents);
    if (st.dish) items.push(st.dish);
  }
  return items;
}

export function serviceSummary(svc) {
  const objective = objectiveProgress(svc);
  return {
    mode: svc.mode,
    night: svc.night,
    stats: deepClone(svc.stats),
    objective,
    bonus: bonusResults(svc),
    trustDelta: { ...svc.trustDelta },
    bondDelta: { ...svc.bondDelta },
    prefsKnown: deepClone(svc.prefsKnown),
    newPrefs: svc.newPrefs.slice(),
    cooked: svc.cooked.slice(),
    clues: svc.clues.slice(),
    flags: svc.flags.slice(),
    maxTension: Math.round(svc.chaos.maxTension),
    endReason: svc.endReason,
    met: [...new Set(svc.orders.map((o) => o.npc))],
  };
}
