import test from 'node:test';
import assert from 'node:assert/strict';
import { makeService, goTo, run, cookAndTake, seatNow, drainEvents } from './helpers.mjs';
import { interact } from '../src/sim/service.js';
import { CONFLICT_STATE, CONFLICT_DELAY, WARNING_SECONDS, tensionBand } from '../src/sim/chaos.js';
import { ORDER_STATUS } from '../src/sim/orders.js';

function seatRivals(svc) {
  const a = seatNow(svc, 'brutus', { recipe: 'stew', noExpire: true }, 0);
  const b = seatNow(svc, 'liria', { recipe: 'salad', noExpire: true }, 2);
  return { a, b };
}

test('CH-01: sino sem conflito não rende moedas, nem repetido', () => {
  const svc = makeService({ night: 3 });
  goTo(svc, 'bell');
  for (let i = 0; i < 10; i++) {
    interact(svc);
    run(svc, 2.1);
  }
  assert.equal(svc.stats.coins, 0);
  assert.equal(svc.stats.peaceBonus, 0);
  assert.equal(svc.stats.conflictsResolved, 0);
});

test('conflito: aviso, depois ativo e a tensão sobe só durante o atrito', () => {
  const svc = makeService({ night: 3 });
  const t0 = svc.chaos.tension;
  run(svc, 2);
  assert.equal(svc.chaos.tension, t0, 'sem rivais, sem tensão passiva na História');
  seatRivals(svc);
  run(svc, CONFLICT_DELAY + 0.1);
  const conflict = svc.chaos.conflicts[0];
  assert.ok(conflict, 'conflito começou');
  assert.equal(conflict.state, CONFLICT_STATE.WARNING);
  const tWarn = svc.chaos.tension;
  run(svc, WARNING_SECONDS + 0.1);
  assert.equal(conflict.state, CONFLICT_STATE.ACTIVE);
  run(svc, 5);
  assert.ok(svc.chaos.tension > tWarn + 3, 'tensão sobe com o conflito ativo');
});

test('sino resolve conflito ativo, paga bônus de paz uma única vez e entra em recarga', () => {
  const svc = makeService({ night: 3 });
  seatRivals(svc);
  run(svc, CONFLICT_DELAY + WARNING_SECONDS + 1);
  goTo(svc, 'bell');
  const tension = svc.chaos.tension;
  const res = interact(svc);
  assert.equal(res.effect, 'resolved');
  assert.equal(svc.stats.coins, 10);
  assert.ok(svc.chaos.tension < tension);
  assert.equal(svc.stats.conflictsResolved, 1);
  const again = interact(svc);
  assert.equal(again.ok, false, 'sino em recarga');
  run(svc, 20);
  interact(svc);
  assert.equal(svc.stats.coins, 10, 'sem bônus fora de conflito');
});

test('conversar com um dos rivais (mãos vazias) acalma e aproxima o par', () => {
  const svc = makeService({ night: 3 });
  seatRivals(svc);
  run(svc, CONFLICT_DELAY + WARNING_SECONDS + 1);
  goTo(svc, 'seat2');
  const res = interact(svc);
  assert.ok(res.resolved);
  assert.equal(svc.bondDelta.batata, 0.5);
});

test('prato da paz para um dos rivais reconcilia (vínculo +1)', () => {
  const svc = makeService({ night: 3 });
  seatRivals(svc);
  run(svc, CONFLICT_DELAY + 1);
  cookAndTake(svc, 'salad');
  goTo(svc, 'seat2');
  const res = interact(svc);
  assert.ok(res.ok);
  assert.equal(svc.chaos.conflicts[0].method, 'peace');
  assert.equal(svc.bondDelta.batata, 1);
});

test('harmonia: rivais que chegam juntos esperam um pelo outro e contam harmonia com 4★+', () => {
  const svc = makeService({ night: 6 });
  const { a, b } = seatRivals(svc);
  a.companion = b.uid;
  b.companion = a.uid;
  cookAndTake(svc, 'stew');
  goTo(svc, 'seat0');
  assert.ok(interact(svc).ok);
  run(svc, 10);
  assert.equal(a.state, 'EATING', 'Brutus espera Líria terminar');
  cookAndTake(svc, 'salad');
  goTo(svc, 'seat2');
  assert.ok(interact(svc).ok);
  assert.ok(svc.stats.harmonyPairs.includes('batata'));
  assert.ok(svc.flags.includes('harmony_batata'));
});

test('CH-02: crise é visível, limitada e recuperável (sem travar o serviço)', () => {
  const svc = makeService({ night: 3 });
  const c = seatNow(svc, 'drogon', { recipe: 'soup' }, 1);
  const order = svc.orders.find((o) => o.id === c.orderId);
  svc.chaos.tension = 99;
  drainEvents(svc);
  const before = order.patience;
  // Pedido de outro cliente expira: +15 tensão -> crise.
  const other = seatNow(svc, 'nira', { recipe: 'stew' }, 0);
  svc.orders.find((o) => o.id === other.orderId).patience = 0.01;
  run(svc, 0.2);
  assert.equal(svc.stats.crises, 1);
  assert.ok(svc.events.some((e) => e.type === 'crisis'));
  assert.ok(svc.chaos.tension < 100 && svc.chaos.tension >= 50);
  assert.ok(order.patience < before && order.patience > 0, 'paciência cai mas não zera');
  assert.equal(order.status, ORDER_STATUS.ACTIVE);
  // Ainda é possível entregar normalmente.
  cookAndTake(svc, 'soup');
  goTo(svc, 'seat1');
  assert.ok(interact(svc).ok);
  assert.equal(tensionBand(svc.chaos.tension).id === 'crisis', false);
});

test('Tranquilo: conflito não aumenta tensão e nunca há crise', () => {
  const svc = makeService({ mode: 'tranquilo', night: 3 });
  seatRivals(svc);
  run(svc, 120);
  assert.ok(svc.chaos.tension <= 10 + 1e-9);
  assert.equal(svc.stats.crises, 0);
});

test('faixas de tensão têm nome e ícone (não só cor)', () => {
  for (const v of [0, 40, 80, 100]) {
    const band = tensionBand(v);
    assert.ok(band.name && band.icon && band.help);
  }
});
