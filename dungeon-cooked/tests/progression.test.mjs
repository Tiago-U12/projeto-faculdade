import test from 'node:test';
import assert from 'node:assert/strict';
import { playCampaignNight } from './bot.mjs';
import {
  newCampaign, buyItem, shopItems, averageTrust, reconciledPairs, endingEligibility, commitNight,
  revisitFinalNight, serviceOptionsFor,
} from '../src/sim/campaign.js';
import { createService, updateService } from '../src/sim/service.js';
import { NIGHT_COUNT } from '../src/data/nights.js';
import { UPGRADES } from '../src/data/upgrades.js';

// Estratégias de escolha nos diálogos.
const curious = { choose: (id, opts) => 0, conflicts: 'talk', ending: (e) => (e.segredo.eligible ? 'segredo' : 'lenda') };
const friendly = {
  // Prefere opções que aproximam as pessoas; ainda escolhe a primeira nas demais.
  choose: (id, opts) => {
    const i = opts.findIndex((o) => /Defender|Aceitar|prefere não saber|Agradecer/.test(o.text));
    return i >= 0 ? i : 0;
  },
  conflicts: 'talk',
  ending: (e) => (e.mesa.eligible ? 'mesa' : 'lenda'),
};
const famous = { choose: () => 1, conflicts: 'bell', ending: () => 'lenda' };

function buyEverything(campaign) {
  let c = campaign;
  for (const item of shopItems(c)) {
    if (item.owned || !item.unlocked || !item.affordable || item.group !== 'upgrade') continue;
    const res = buyItem(c, item.id);
    if (res.ok) c = res.campaign;
  }
  return c;
}

function playCampaign(strategy, seed) {
  let campaign = newCampaign('historia');
  const log = [];
  while (!campaign.completed) {
    let attempt = 0;
    let res;
    do {
      res = playCampaignNight(campaign, strategy, seed + attempt * 101 + campaign.night);
      attempt += 1;
    } while (!res.ok && attempt < 3);
    assert.ok(res.ok, `Noite ${campaign.night} falhou: ${JSON.stringify(res.objective || res.reason)}`);
    log.push({ night: campaign.night, attempts: attempt, served: res.summary.stats.served, coins: res.report.earned, upgrades: campaign.upgrades.length });
    campaign = buyEverything(res.campaign);
  }
  return { campaign, log };
}

test('PR-02: as sete noites são concluíveis e os três finais são alcançáveis', () => {
  const runs = {
    segredo: playCampaign(curious, 11),
    mesa: playCampaign(friendly, 23),
    lenda: playCampaign(famous, 37),
  };
  for (const [ending, { campaign, log }] of Object.entries(runs)) {
    assert.equal(campaign.completed, true);
    assert.equal(campaign.ending, ending, `esperado ${ending}; trust ${averageTrust(campaign)} pares ${reconciledPairs(campaign)} pistas ${campaign.clues}`);
    assert.equal(campaign.nightLog.length, NIGHT_COUNT);
    assert.ok(campaign.upgrades.length >= 3, `comprou só ${campaign.upgrades.length} melhorias`);
    console.log(`[${ending}]`, JSON.stringify(log.map((l) => `${l.night}:${l.served}p/${l.coins}m/${l.attempts}x`)), 'trust', averageTrust(campaign), 'pares', reconciledPairs(campaign).length, 'pistas', campaign.clues.length, 'moedas', campaign.coins);
  }
});

test('PR-01: comprar melhoria debita uma vez e altera o cálculo do serviço', () => {
  let c = newCampaign('historia');
  c = { ...c, night: 3, coins: 1000 };
  const res = buyItem(c, 'boots');
  assert.ok(res.ok);
  assert.equal(res.campaign.coins, 1000 - UPGRADES.find((u) => u.id === 'boots').cost);
  const twice = buyItem(res.campaign, 'boots');
  assert.equal(twice.ok, false);
  assert.equal(twice.reason, 'owned');
  const locked = buyItem(res.campaign, 'tables');
  assert.equal(locked.reason, 'locked');
  const svc = createService({ ...serviceOptionsFor(res.campaign), seed: 1 });
  assert.equal(svc.mods.speedMult, 1.12);
  // Efeito real: o chef anda mais longe no mesmo tempo.
  const base = createService({ ...serviceOptionsFor(c), seed: 1 });
  const walked = (s) => {
    s.player.x = 300; s.player.y = 470;
    for (let i = 0; i < 30; i++) updateService(s, 1 / 60, { moveX: 1, moveY: 0 });
    return s.player.x - 300;
  };
  const fast = walked(svc);
  const slow = walked(base);
  assert.ok(Math.abs(fast / slow - 1.12) < 0.01, `velocidade ${fast} vs ${slow}`);
});

test('commit não duplica recompensa: noite errada ou repetida é recusada', () => {
  const campaign = newCampaign('historia');
  const summary = {
    mode: 'historia', night: 1, objective: { done: true }, bonus: [], stats: { coins: 100, served: 3, starsTotal: 12, good: 2, perfect: 0, expired: 0, burntCreated: 0, conflictsResolved: 0, crises: 0, harmonyPairs: [] },
    trustDelta: {}, bondDelta: {}, prefsKnown: {}, cooked: [], clues: [], flags: [], met: [],
  };
  const first = commitNight(campaign, summary);
  assert.ok(first.ok);
  assert.equal(first.campaign.coins, 100);
  assert.equal(first.campaign.night, 2);
  const again = commitNight(first.campaign, summary);
  assert.equal(again.ok, false, 'mesmo resumo não pode ser aplicado na noite seguinte');
  const failed = commitNight(campaign, { ...summary, objective: { done: false } });
  assert.equal(failed.ok, false);
});

test('final exige elegibilidade; revisitar a Noite 7 restaura o checkpoint', () => {
  let c = newCampaign('historia');
  c = { ...c, night: NIGHT_COUNT };
  const elig = endingEligibility(c);
  assert.equal(elig.lenda.eligible, true);
  assert.equal(elig.mesa.eligible, false);
  assert.equal(elig.segredo.eligible, false);
  const runs = playCampaign(curious, 5);
  const revisit = revisitFinalNight(runs.campaign);
  assert.ok(revisit);
  assert.equal(revisit.completed, false);
  assert.equal(revisit.night, NIGHT_COUNT);
  assert.ok(revisit.finalCheckpoint);
});
