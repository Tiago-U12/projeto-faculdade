// Utilitários dos testes: posicionam o chef, preparam receitas e rodam o relógio.
import assert from 'node:assert/strict';
import { createService, updateService, interact, takeIngredient, seatNow } from '../src/sim/service.js';
import { accessPoints, nearestStation } from '../src/sim/world.js';
import { nightDef, CHALLENGE } from '../src/data/nights.js';
import { RECIPE_BY_ID } from '../src/data/recipes.js';
import { INGREDIENTS } from '../src/data/ingredients.js';
import { modsFor } from '../src/data/upgrades.js';

// Serviço sem convidados automáticos (os testes sentam clientes à mão).
export function makeService({ mode = 'historia', night = 7, upgrades = [], seed = 1, def = null, keepGuests = false } = {}) {
  const base = def || (mode === 'desafio' ? CHALLENGE : nightDef(night));
  const custom = keepGuests ? base : { ...base, guests: [{ npc: 'mora', noExpire: true }], events: [] };
  const svc = createService({ mode, night, def: custom, mods: modsFor(upgrades), seed });
  if (!keepGuests) keepOpen(svc); // convidado "fantasma" que nunca chega: evita fim automático
  return svc;
}

// Mantém o serviço "aberto" mesmo sem clientes (para testes de cozinha).
export function keepOpen(svc) {
  svc.guests = [{ index: 99, npcs: ['mora'], orders: [{}], noExpire: true }];
  svc.arrivalTimer = 1e9;
}

export function goTo(svc, stationId) {
  const pts = accessPoints(stationId, svc.player);
  assert.ok(pts.length, `sem ponto de acesso para ${stationId}`);
  svc.player.x = pts[0].x;
  svc.player.y = pts[0].y;
  svc.player.path = null;
  assert.equal(nearestStation(svc.player.x, svc.player.y), stationId, `chef não ficou perto de ${stationId}`);
}

export function run(svc, seconds, step = 1 / 60) {
  let t = 0;
  while (t < seconds - 1e-9) {
    const dt = Math.min(step, seconds - t);
    updateService(svc, dt);
    t += dt;
  }
}

export function grab(svc, ingredientId) {
  goTo(svc, INGREDIENTS[ingredientId].shelf);
  const res = takeIngredient(svc, ingredientId);
  assert.ok(res.ok, `não pegou ${ingredientId}: ${JSON.stringify(res)}`);
  return res.item;
}

export function prepare(svc, ingredientId) {
  const item = grab(svc, ingredientId);
  if (INGREDIENTS[ingredientId].prep === 'chop') {
    goTo(svc, 'board');
    interact(svc);
    interact(svc);
    assert.ok(svc.player.hands.some((i) => i.uid === item.uid && i.prepared), `${ingredientId} não foi cortado`);
  }
  return item;
}

// Prepara todos os ingredientes e coloca na estação certa.
export function loadRecipe(svc, recipeId) {
  const recipe = RECIPE_BY_ID[recipeId];
  for (const ing of recipe.ingredients) {
    prepare(svc, ing);
    goTo(svc, recipe.station);
    const res = interact(svc);
    assert.ok(res.ok, `não colocou ${ing} em ${recipe.station}: ${JSON.stringify(res)}`);
  }
  return svc.cook[recipe.station];
}

export function cookAndTake(svc, recipeId) {
  const st = loadRecipe(svc, recipeId);
  run(svc, (RECIPE_BY_ID[recipeId].cookSeconds || 0) + 0.2);
  goTo(svc, RECIPE_BY_ID[recipeId].station);
  const res = interact(svc);
  assert.ok(res.ok && res.dish, `não pegou o prato ${recipeId}: ${JSON.stringify(res)}`);
  return res.dish;
}

export { seatNow };

export function drainEvents(svc) {
  const list = svc.events.slice();
  svc.events.length = 0;
  return list;
}

export function uniqueUids(svc, allItems) {
  const uids = allItems(svc).map((i) => i.uid);
  return new Set(uids).size === uids.length;
}
