import test from 'node:test';
import assert from 'node:assert/strict';
import { createService, updateService, setMoveTarget } from '../src/sim/service.js';
import { nightDef } from '../src/data/nights.js';
import {
  STATION_ORDER, STATION_LAYOUT, nearestStation, accessPoints, stationAt, collides, createNavGrid, findPath, SOLIDS,
} from '../src/sim/world.js';
import { computeView, screenToWorld, worldToScreen, eventToWorld } from '../src/render/camera.js';
import { joystickVector } from '../src/systems/input.js';
import { distanceToRect } from '../src/core/util.js';

function kitchen() {
  const def = { ...nightDef(7), guests: [{ npc: 'mora', noExpire: true }], events: [] };
  const svc = createService({ mode: 'historia', night: 7, def, seed: 1 });
  svc.arrivalTimer = 1e9;
  return svc;
}

test('navegação: de qualquer estação o chef chega a qualquer outra pelo clique', () => {
  for (const from of STATION_ORDER) {
    for (const to of STATION_ORDER) {
      if (from === to) continue;
      const svc = kitchen();
      const start = accessPoints(from, svc.player)[0];
      svc.player.x = start.x;
      svc.player.y = start.y;
      svc.player.hands = [svc.itemFactory.ingredient('mush')]; // mãos cheias: chegar não dispara coleta
      assert.ok(setMoveTarget(svc, 0, 0, to), `${from} -> ${to}: sem caminho`);
      for (let i = 0; i < 60 * 8 && svc.player.path; i++) updateService(svc, 1 / 60);
      assert.equal(nearestStation(svc.player.x, svc.player.y), to, `${from} -> ${to} parou em ${Math.round(svc.player.x)},${Math.round(svc.player.y)}`);
    }
  }
});

test('colisão: chef nunca atravessa bancadas nem o balcão andando com o teclado', () => {
  const svc = kitchen();
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  for (let k = 0; k < 400; k++) {
    const [mx, my] = dirs[k % dirs.length];
    for (let i = 0; i < 20; i++) {
      updateService(svc, 1 / 60, { moveX: mx, moveY: my });
      for (const rect of SOLIDS) assert.ok(distanceToRect(svc.player.x, svc.player.y, rect) >= 15.99, 'entrou numa bancada');
      assert.equal(collides(svc.player.x, svc.player.y), false);
    }
  }
});

test('A*: destino inalcançável (dentro de bancada) não trava e não gera caminho inválido', () => {
  const grid = createNavGrid();
  const r = STATION_LAYOUT.cauldron.rect;
  const path = findPath(grid, { x: 480, y: 520 }, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
  if (path) for (const pt of path) assert.equal(collides(pt.x, pt.y), false);
});

test('IN-04: toque é convertido para o objeto sob o dedo com escala, câmera e DPR', () => {
  // Retrato estreito: a câmera segue o chef.
  const view = computeView(360, 460, { x: 140, y: 330 });
  assert.equal(view.follow, true);
  for (const id of ['horta', 'board', 'cauldron', 'seat0']) {
    const r = STATION_LAYOUT[id].rect;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const s = worldToScreen(view, cx, cy);
    if (s.x < 0 || s.x > 360) continue; // fora da tela nesta posição da câmera
    const w = screenToWorld(view, s.x, s.y);
    assert.ok(Math.abs(w.x - cx) < 1e-6 && Math.abs(w.y - cy) < 1e-6);
    assert.equal(stationAt(w.x, w.y), id);
  }
  // Desktop com letterbox e canvas deslocado na página.
  const wide = computeView(1200, 600, { x: 0, y: 0 });
  assert.equal(wide.follow, false);
  const rect = { left: 40, top: 120 };
  const target = STATION_LAYOUT.oven.rect;
  const s = worldToScreen(wide, target.x + 10, target.y + 10);
  const w = eventToWorld(wide, rect, s.x + rect.left, s.y + rect.top);
  assert.equal(stationAt(w.x, w.y), 'oven');
});

test('câmera: telas largas mostram a cozinha inteira; retrato aproxima sem sair do mundo', () => {
  const desk = computeView(1044, 588, { x: 480, y: 300 });
  assert.equal(desk.follow, false);
  assert.ok(desk.scale > 0.95);
  const phone = computeView(350, 450, { x: 900, y: 580 });
  assert.equal(phone.follow, true);
  assert.ok(phone.viewX + 350 / phone.scale <= 960 + 1e-6);
  assert.ok(phone.viewY + 450 / phone.scale <= 600 + 1e-6);
  assert.ok(phone.scale > 0.7, 'zoom legível no celular');
});

test('IN-03: joystick com zona morta e soltura zera o vetor', () => {
  assert.deepEqual(joystickVector(2, 1, 50), { x: 0, y: 0, mag: 0 });
  const v = joystickVector(100, 0, 50);
  assert.equal(v.mag, 1);
  assert.ok(Math.abs(v.x - 1) < 1e-9);
  const half = joystickVector(0, -25, 50);
  assert.ok(Math.abs(half.y + 0.5) < 1e-9);
});
