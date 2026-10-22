import test from 'node:test';
import assert from 'node:assert/strict';
import { makeService, goTo, run, grab, prepare, loadRecipe, cookAndTake, drainEvents, uniqueUids } from './helpers.mjs';
import { interact, discard, allItems, takeIngredient } from '../src/sim/service.js';
import { STATION_STATE, exactRecipe, recipesForStation } from '../src/sim/kitchen.js';
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes.js';
import { INGREDIENTS } from '../src/data/ingredients.js';
import { NIGHTS } from '../src/data/nights.js';
import { isSubMultiset } from '../src/core/util.js';

test('dados: 12 receitas, 12 ingredientes, todos referenciados existem', () => {
  assert.equal(RECIPES.length, 12);
  assert.equal(Object.keys(INGREDIENTS).length, 12);
  for (const r of RECIPES) for (const ing of r.ingredients) assert.ok(INGREDIENTS[ing], `${r.id} usa ${ing}`);
  const used = new Set(RECIPES.flatMap((r) => r.ingredients));
  assert.equal(used.size, 12, 'todos os ingredientes são usados de verdade');
});

test('dados: nenhuma receita da mesma estação é sub-multiconjunto de outra (início automático sem ambiguidade)', () => {
  for (const a of RECIPES) {
    for (const b of RECIPES) {
      if (a === b || a.station !== b.station) continue;
      assert.ok(!isSubMultiset(a.ingredients, b.ingredients), `${a.id} ⊂ ${b.id}`);
    }
  }
});

test('dados: cada noite tem ingredientes e estação para todas as receitas desbloqueadas', () => {
  for (const n of NIGHTS) {
    for (const r of RECIPES.filter((x) => x.unlockNight <= n.night)) {
      assert.ok(n.stations.includes(r.station), `noite ${n.night}: ${r.station} indisponível para ${r.id}`);
      for (const ing of r.ingredients) {
        assert.ok(INGREDIENTS[ing].unlockNight <= n.night, `noite ${n.night}: ${ing} bloqueado para ${r.id}`);
        assert.ok(n.stations.includes(INGREDIENTS[ing].shelf), `noite ${n.night}: prateleira ${INGREDIENTS[ing].shelf}`);
      }
    }
    for (const g of n.guests) if (g.recipe) assert.ok(RECIPE_BY_ID[g.recipe].unlockNight <= n.night, `noite ${n.night} pede ${g.recipe}`);
  }
});

test('CK-01: dois ingredientes corretos no caldeirão reconhecem a receita e entram em PROCESSING', () => {
  const svc = makeService({ night: 1 });
  const st = loadRecipe(svc, 'soup');
  assert.equal(st.state, STATION_STATE.PROCESSING);
  assert.equal(st.recipeId, 'soup');
  assert.equal(st.contents.length, 2);
});

test('CK-02: pegar prato durante PROCESSING é recusado e nada muda', () => {
  const svc = makeService({ night: 1 });
  const st = loadRecipe(svc, 'soup');
  run(svc, 1);
  const before = JSON.stringify(st);
  goTo(svc, 'cauldron');
  const res = interact(svc);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'processing');
  assert.equal(svc.player.hands.length, 0);
  assert.equal(JSON.stringify(st), before);
});

test('CK-03: ao terminar o tempo o prato aparece exatamente uma vez', () => {
  const svc = makeService({ night: 1 });
  const st = loadRecipe(svc, 'soup');
  drainEvents(svc);
  run(svc, RECIPE_BY_ID.soup.cookSeconds + 0.5);
  assert.equal(st.state, STATION_STATE.READY);
  assert.ok(st.dish && st.dish.recipeId === 'soup' && st.dish.quality === 'perfect');
  const ready = svc.events.filter((e) => e.type === 'toast' && /No ponto/.test(e.text));
  assert.equal(ready.length, 1);
  assert.equal(allItems(svc).filter((i) => i.type === 'dish').length, 1);
});

test('CK-04: caldeirão ocupado recusa ingrediente sem consumi-lo', () => {
  const svc = makeService({ night: 1 });
  loadRecipe(svc, 'soup');
  const item = prepare(svc, 'meat');
  goTo(svc, 'cauldron');
  const res = interact(svc);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'busy');
  assert.ok(svc.player.hands.some((i) => i.uid === item.uid), 'ingrediente continua na mão');
});

test('CK-05: retirar o prato e rodar 60s não cria timers órfãos nem novas transformações', () => {
  const svc = makeService({ night: 1 });
  const dish = cookAndTake(svc, 'soup');
  const st = svc.cook.cauldron;
  assert.equal(st.state, STATION_STATE.EMPTY);
  run(svc, 60);
  assert.equal(st.state, STATION_STATE.EMPTY);
  assert.equal(st.dish, null);
  const held = svc.player.hands[0];
  assert.equal(held.uid, dish.uid);
  assert.equal(held.quality, 'perfect');
  assert.ok(uniqueUids(svc, allItems));
});

test('CK-06: esperar a janela leva de READY a SPOILED uma única vez', () => {
  const svc = makeService({ night: 1 });
  const st = loadRecipe(svc, 'stew');
  drainEvents(svc);
  run(svc, RECIPE_BY_ID.stew.cookSeconds + RECIPE_BY_ID.stew.spoilSeconds + 5);
  assert.equal(st.state, STATION_STATE.SPOILED);
  assert.equal(st.dish.quality, 'burnt');
  const burnt = svc.events.filter((e) => e.type === 'sfx' && e.id === 'burnt');
  assert.equal(burnt.length, 1);
  const near = svc.events.filter((e) => e.type === 'sfx' && e.id === 'nearBurn');
  assert.equal(near.length, 1, 'aviso de quase queimando aparece uma vez');
  run(svc, 30);
  assert.equal(svc.stats.burntCreated, 1);
  goTo(svc, 'cauldron');
  const res = interact(svc);
  assert.ok(res.ok);
  assert.equal(res.dish.quality, 'burnt');
});

test('CK-07: Salada da Paz é montada na bancada fria, sem fervura e sem queimar', () => {
  const svc = makeService({ night: 1 });
  const st = loadRecipe(svc, 'salad');
  assert.equal(st.state, STATION_STATE.READY);
  assert.equal(st.spoilAfter, null);
  run(svc, 120);
  assert.equal(st.state, STATION_STATE.READY);
  // Salada não entra no caldeirão.
  prepare(svc, 'leaf');
  goTo(svc, 'cauldron');
  const res = interact(svc);
  assert.equal(res.ok, false);
});

test('CK-08: ingredientes inválidos recebem explicação e não geram receita', () => {
  const svc = makeService({ night: 1 });
  // Cru no caldeirão.
  grab(svc, 'mush');
  goTo(svc, 'cauldron');
  let res = interact(svc);
  assert.equal(res.reason, 'raw');
  assert.ok(svc.events.some((e) => e.type === 'toast' && /cru/.test(e.text)), 'mensagem explica que está cru');
  // Combinação que não existe: cogumelo + javali no caldeirão.
  goTo(svc, 'board');
  interact(svc); interact(svc);
  goTo(svc, 'cauldron');
  assert.ok(interact(svc).ok);
  prepare(svc, 'meat');
  goTo(svc, 'cauldron');
  res = interact(svc);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'mismatch');
  assert.equal(svc.cook.cauldron.state, STATION_STATE.LOADING);
  assert.equal(svc.cook.cauldron.recipeId, null);
  // Multiconjunto: [mush, mush] não é Sopa.
  assert.equal(exactRecipe(['mush', 'mush'], 'cauldron', ['soup']), null);
});

test('tábua: dois cortes, devolve à mão; ingrediente sem preparo é recusado', () => {
  const svc = makeService({ night: 3 });
  const item = grab(svc, 'root');
  goTo(svc, 'board');
  let res = interact(svc);
  assert.equal(res.done, false);
  assert.equal(svc.player.hands.length, 0, 'ingrediente está na tábua, não na mão');
  res = interact(svc);
  assert.equal(res.done, true);
  assert.equal(svc.player.hands[0].uid, item.uid);
  assert.ok(svc.player.hands[0].prepared);
  goTo(svc, 'arcano');
  svc.player.hands.length = 0;
  takeIngredient(svc, 'ember');
  goTo(svc, 'board');
  res = interact(svc);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'noPrep');
});

test('as 12 receitas podem ser preparadas de ponta a ponta', () => {
  for (const r of RECIPES) {
    const svc = makeService({ night: 7 });
    const dish = cookAndTake(svc, r.id);
    assert.equal(dish.recipeId, r.id);
    assert.equal(dish.quality, 'perfect');
    assert.ok(uniqueUids(svc, allItems));
  }
});

test('lixeira e Q: ingrediente sai na hora, prato pede confirmação, limpar estação pede confirmação', () => {
  const svc = makeService({ night: 1 });
  grab(svc, 'mush');
  goTo(svc, 'trash');
  assert.ok(interact(svc).ok);
  assert.equal(svc.player.hands.length, 0);
  cookAndTake(svc, 'soup');
  let res = discard(svc);
  assert.equal(res.reason, 'confirm');
  assert.equal(svc.player.hands.length, 1);
  res = discard(svc);
  assert.ok(res.ok);
  assert.equal(svc.player.hands.length, 0);
  loadRecipe(svc, 'stew');
  goTo(svc, 'cauldron');
  res = discard(svc);
  assert.equal(res.reason, 'confirm');
  assert.equal(svc.cook.cauldron.state, STATION_STATE.PROCESSING);
  // E não confirma limpeza (só Q confirma).
  interact(svc);
  assert.equal(svc.cook.cauldron.state, STATION_STATE.PROCESSING);
  discard(svc);
  res = discard(svc);
  assert.ok(res.ok);
  assert.equal(svc.cook.cauldron.state, STATION_STATE.EMPTY);
});

test('estação de cozinha: nenhum item fica em dois lugares ao longo de uma sessão longa', () => {
  const svc = makeService({ night: 7, upgrades: ['shelf'] });
  for (const r of ['soup', 'roots', 'cavefish', 'salad', 'glimmer', 'spectral']) {
    cookAndTake(svc, r);
    assert.ok(uniqueUids(svc, allItems));
    svc.player.hands.length = 0;
  }
  assert.ok(recipesForStation('cauldron', svc.recipes).length >= 5);
});
