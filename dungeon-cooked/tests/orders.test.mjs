import test from 'node:test';
import assert from 'node:assert/strict';
import { makeService, goTo, run, cookAndTake, loadRecipe, seatNow, drainEvents } from './helpers.mjs';
import { interact, discard, updateService, createService, activeOrders, describeContext } from '../src/sim/service.js';
import { ORDER_STATUS, evaluateDelivery, closeOrder, createOrder } from '../src/sim/orders.js';
import { STATION_STATE } from '../src/sim/kitchen.js';
import { nightDef, CHALLENGE } from '../src/data/nights.js';

test('OR-01: prato certo no pedido certo consome pedido e prato e paga uma vez', () => {
  const svc = makeService({ night: 1 });
  const c = seatNow(svc, 'brutus', { recipe: 'soup' }, 0);
  cookAndTake(svc, 'soup');
  goTo(svc, 'seat0');
  const coinsBefore = svc.stats.coins;
  const res = interact(svc);
  assert.ok(res.ok, JSON.stringify(res));
  const order = svc.orders.find((o) => o.id === c.orderId);
  assert.equal(order.status, ORDER_STATUS.FULFILLED);
  assert.equal(order.rewardClaimed, true);
  assert.equal(svc.player.hands.length, 0);
  assert.equal(svc.stats.served, 1);
  const paid = svc.stats.coins - coinsBefore;
  assert.ok(paid > 0);
  // Segunda tentativa não paga de novo.
  const again = interact(svc);
  assert.equal(again.ok, false);
  assert.equal(svc.stats.coins - coinsBefore, paid);
  assert.equal(closeOrder(order, ORDER_STATUS.EXPIRED), false, 'pedido fechado não muda de status');
});

test('OR-02: pedido expira durante a interação sem pagamento nem erro', () => {
  const svc = makeService({ night: 1 });
  const c = seatNow(svc, 'drogon', { recipe: 'soup' }, 2);
  const order = svc.orders.find((o) => o.id === c.orderId);
  cookAndTake(svc, 'soup');
  order.patience = 0.05;
  goTo(svc, 'seat2');
  run(svc, 0.2);
  assert.equal(order.status, ORDER_STATUS.EXPIRED);
  const coins = svc.stats.coins;
  const res = interact(svc);
  assert.equal(res.ok, false);
  assert.equal(svc.stats.coins, coins);
  assert.equal(svc.player.hands.length, 1, 'prato continua com o chef');
  assert.equal(svc.stats.expired, 1);
});

test('OR-02b: confirmação pendente de prato queimado é cancelada se o pedido expira', () => {
  const svc = makeService({ night: 1 });
  const c = seatNow(svc, 'liria', { recipe: 'stew' }, 1);
  const order = svc.orders.find((o) => o.id === c.orderId);
  order.patience = 1e6;
  order.maxPatience = 1e6;
  // Prato queimado.
  const st = svc.cook.cauldron;
  loadRecipe(svc, 'stew');
  run(svc, 60);
  assert.equal(st.state, STATION_STATE.SPOILED);
  goTo(svc, 'cauldron');
  interact(svc);
  goTo(svc, 'seat1');
  let res = interact(svc);
  assert.equal(res.reason, 'confirm');
  order.patience = 0.01;
  run(svc, 0.1);
  assert.equal(order.status, ORDER_STATUS.EXPIRED);
  res = interact(svc);
  assert.equal(res.ok, false);
  assert.equal(svc.stats.served, 0);
});

test('OR-03: cliente novo só ocupa lugar vago', () => {
  const def = nightDef(3);
  const svc = createService({ mode: 'historia', night: 3, def, seed: 7 });
  for (let i = 0; i < 60 * 240; i++) {
    updateService(svc, 1 / 60);
    const seated = svc.customers.filter((c) => c.state !== 'GONE');
    const seats = seated.map((c) => c.seat);
    assert.equal(new Set(seats).size, seats.length, 'dois clientes no mesmo lugar');
    for (const c of seated) assert.equal(svc.seats[c.seat], c);
    const active = activeOrders(svc);
    assert.equal(new Set(active.map((o) => o.seat)).size, active.length);
    if (svc.ended) break;
  }
  assert.ok(svc.stats.customersSeen >= 3);
});

test('entrega errada é explicada, o prato fica com o chef e a próxima tentativa funciona', () => {
  const svc = makeService({ night: 1 });
  seatNow(svc, 'brutus', { recipe: 'stew' }, 0);
  cookAndTake(svc, 'soup');
  goTo(svc, 'seat0');
  drainEvents(svc);
  const res = interact(svc);
  assert.equal(res.reason, 'wrong');
  assert.equal(svc.player.hands.length, 1);
  assert.ok(svc.events.some((e) => e.type === 'toast' && /pediu Ensopado do Dragão/.test(e.text)));
  assert.equal(svc.stats.mistakes, 1);
  // Descarta (com confirmação) e faz o certo.
  discard(svc);
  discard(svc);
  cookAndTake(svc, 'stew');
  goTo(svc, 'seat0');
  assert.ok(interact(svc).ok);
  assert.equal(svc.stats.served, 1);
});

test('pedido aberto aceita qualquer prato com a tag e registra preferências', () => {
  const svc = makeService({ night: 3 });
  const c = seatNow(svc, 'brutus', { tag: 'quente' }, 0);
  cookAndTake(svc, 'roots');
  goTo(svc, 'seat0');
  const res = interact(svc);
  assert.ok(res.ok);
  assert.ok(res.result.stars >= 4);
  assert.ok(svc.prefsKnown.brutus.includes('quente'));
  assert.equal(svc.orders.find((o) => o.id === c.orderId).status, ORDER_STATUS.FULFILLED);
});

test('prato queimado pede confirmação e rende avaliação baixa e tensão', () => {
  const svc = makeService({ night: 3 });
  seatNow(svc, 'drogon', { recipe: 'stew', noExpire: true }, 1);
  loadRecipe(svc, 'stew');
  run(svc, 40);
  goTo(svc, 'cauldron');
  interact(svc);
  goTo(svc, 'seat1');
  const tension = svc.chaos.tension;
  assert.equal(interact(svc).reason, 'confirm');
  assert.equal(describeContext(svc).confirm, true);
  const res = interact(svc);
  assert.ok(res.ok);
  assert.ok(res.result.stars <= 3);
  assert.ok(svc.chaos.tension > tension);
  assert.equal(svc.stats.burntDelivered, 1);
});

test('preferência: Líria detesta picante (avaliação menor) e adora fresco', () => {
  const order = createOrder({ id: 'x', npc: 'liria', seat: 0, tag: 'quente', patience: 100 });
  const spicy = evaluateDelivery(order, { recipeId: 'stew', quality: 'perfect' }, { trust: 0 });
  const soup = evaluateDelivery(order, { recipeId: 'soup', quality: 'perfect' }, { trust: 0 });
  assert.ok(spicy.accepted && soup.accepted);
  assert.ok(spicy.stars < soup.stars);
  assert.ok(spicy.reasons.some((r) => /evita picante/.test(r.text)));
  const fresh = evaluateDelivery(createOrder({ id: 'y', npc: 'liria', seat: 0, recipeId: 'salad', patience: 100 }), { recipeId: 'salad', quality: 'perfect' }, {});
  assert.equal(fresh.stars, 5);
  assert.ok(fresh.reasons.some((r) => /adora/.test(r.text)));
});

test('Tranquilo: pedidos não expiram e pratos não queimam', () => {
  const svc = makeService({ mode: 'tranquilo', night: 3 });
  const c = seatNow(svc, 'brutus', { recipe: 'stew' }, 0);
  loadRecipe(svc, 'soup');
  run(svc, 600);
  assert.equal(svc.orders.find((o) => o.id === c.orderId).status, ORDER_STATUS.ACTIVE);
  assert.equal(svc.cook.cauldron.state, STATION_STATE.READY);
  assert.equal(svc.chaos.tension, 10, 'tensão não sobe por inatividade');
});

test('Desafio: termina em 3 minutos e pontua', () => {
  const svc = createService({ mode: 'desafio', def: CHALLENGE, seed: 3 });
  let served = false;
  let scoreAfterServe = 0;
  for (let i = 0; i < 60 * 200 && !svc.ended; i++) {
    updateService(svc, 1 / 60);
    const order = activeOrders(svc)[0];
    if (order && !served && order.kind === 'dish' && ['soup', 'stew', 'salad'].includes(order.recipeId)) {
      cookAndTake(svc, order.recipeId);
      goTo(svc, `seat${order.seat}`);
      served = interact(svc).ok;
      scoreAfterServe = svc.stats.coins;
    }
  }
  assert.ok(svc.ended);
  assert.equal(svc.endReason, 'time');
  assert.ok(svc.time <= 180.1 && svc.time >= 179.9);
  assert.ok(served);
  assert.ok(scoreAfterServe > 0, 'entrega pontua');
  assert.ok(svc.stats.coins >= 0, 'pontuação nunca fica negativa');
  assert.ok(svc.stats.expired > 0, 'pedidos ignorados expiram');
});

test('IN-01/IN-02: sem update o relógio não anda; salto grande de tempo é limitado', () => {
  const svc = makeService({ night: 1 });
  const c = seatNow(svc, 'brutus', { recipe: 'soup' }, 0);
  const order = svc.orders.find((o) => o.id === c.orderId);
  loadRecipe(svc, 'soup');
  const before = { p: order.patience, cook: svc.cook.cauldron.remaining, t: svc.time };
  // "Pausado": nenhuma chamada a updateService.
  assert.equal(order.patience, before.p);
  // Volta de aba após 5 minutos: dt é limitado a 0,1 s.
  updateService(svc, 300);
  assert.ok(svc.time - before.t <= 0.1 + 1e-9);
  assert.ok(before.cook - svc.cook.cauldron.remaining <= 0.1 + 1e-9);
});

