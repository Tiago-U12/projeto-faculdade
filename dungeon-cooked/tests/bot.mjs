// Robô de teste: joga noites inteiras pela API da simulação (teletransporta o
// chef e soma tempo de caminhada). Serve para provar que as noites e finais são
// alcançáveis com decisões plausíveis, não para medir diversão.
import { goTo, run, cookAndTake } from './helpers.mjs';
import {
  createService, interact, discard, activeOrders, applyServiceEffects, serviceSummary,
  objectiveProgress, heldDish,
} from '../src/sim/service.js';
import { satisfyingRecipes } from '../src/sim/orders.js';
import { activeConflicts } from '../src/sim/chaos.js';
import { STATION_STATE } from '../src/sim/kitchen.js';
import { playThrough } from '../src/sim/story.js';
import { RECIPE_BY_ID } from '../src/data/recipes.js';
import { CUSTOMERS } from '../src/data/customers.js';
import { nightDef } from '../src/data/nights.js';
import {
  serviceOptionsFor, commitNight, previewCampaign, endingEligibility,
} from '../src/sim/campaign.js';

const WALK = 1.2; // segundos simulados por deslocamento

function storyCtx(campaign, svc) {
  return {
    flags: [...campaign.flags, ...svc.flags],
    clues: [...campaign.clues, ...svc.clues],
    bonds: campaign.bonds,
    stats: svc.stats,
  };
}

function pickRecipe(svc, order) {
  const options = satisfyingRecipes(order, svc.recipes);
  const npc = CUSTOMERS[order.npc];
  const score = (id) => {
    const r = RECIPE_BY_ID[id];
    return r.tags.filter((t) => npc.likes.includes(t)).length * 2 - r.tags.filter((t) => npc.dislikes.includes(t)).length * 3 + (r.peace ? 1 : 0);
  };
  return options.sort((a, b) => score(b) - score(a))[0];
}

function clearStation(svc, id) {
  if (svc.cook[id].state === STATION_STATE.EMPTY) return;
  goTo(svc, id);
  discard(svc);
  discard(svc);
}

function emptyHands(svc) {
  while (svc.player.hands.length) {
    discard(svc);
    if (svc.pending) discard(svc);
  }
}

export function playNight(svc, campaign, strategy) {
  let guard = 0;
  while (!svc.ended && guard++ < 3000) {
    while (svc.story.length) {
      const id = svc.story.shift();
      const { effects } = playThrough(id, storyCtx(campaign, svc), (opts) => strategy.choose(id, opts));
      effects.forEach((e) => applyServiceEffects(svc, e));
    }
    if (svc.whisper) {
      emptyHands(svc);
      clearStation(svc, svc.whisper.station);
      goTo(svc, svc.whisper.station);
      interact(svc);
      continue;
    }
    const conflict = activeConflicts(svc.chaos)[0];
    if (conflict && strategy.conflicts !== 'ignore') {
      emptyHands(svc);
      if (strategy.conflicts === 'bell' && svc.stationsAvailable.has('bell') && svc.chaos.bellCooldown <= 0) {
        goTo(svc, 'bell');
        interact(svc);
      } else {
        const party = svc.customers.find((c) => (c.npc === conflict.a || c.npc === conflict.b) && c.state === 'SEATED');
        if (party) {
          goTo(svc, `seat${party.seat}`);
          interact(svc);
        } else run(svc, 0.5);
      }
      run(svc, WALK);
      continue;
    }
    const orders = activeOrders(svc).sort((a, b) => a.patience / a.maxPatience - b.patience / b.maxPatience);
    const order = orders[0];
    if (!order) {
      run(svc, 0.5);
      continue;
    }
    const recipeId = pickRecipe(svc, order);
    if (!recipeId) {
      run(svc, 0.5);
      continue;
    }
    emptyHands(svc);
    clearStation(svc, RECIPE_BY_ID[recipeId].station);
    run(svc, WALK * RECIPE_BY_ID[recipeId].ingredients.length);
    if (svc.ended) break;
    cookAndTake(svc, recipeId);
    run(svc, WALK);
    if (order.status !== 'ACTIVE') continue;
    goTo(svc, `seat${order.seat}`);
    let res = interact(svc);
    if (res.reason === 'confirm') res = interact(svc);
    if (heldDish(svc)) emptyHands(svc);
  }
  if (!svc.ended) throw new Error(`Noite ${svc.night} não terminou (guarda)`);
  return svc;
}

// Joga uma noite completa da campanha (abertura, serviço, encerramento) e faz o commit.
export function playCampaignNight(campaign, strategy, seed = 1) {
  const opts = serviceOptionsFor(campaign);
  const svc = createService({ ...opts, seed });
  const def = nightDef(campaign.night);
  const intro = playThrough(def.intro, storyCtx(campaign, svc), (o) => strategy.choose(def.intro, o));
  intro.effects.forEach((e) => applyServiceEffects(svc, e));
  playNight(svc, campaign, strategy);
  const objective = objectiveProgress(svc);
  if (!objective.done) return { ok: false, svc, objective };
  const outro = playThrough(def.outro, storyCtx(campaign, svc), (o) => strategy.choose(def.outro, o));
  outro.effects.forEach((e) => applyServiceEffects(svc, e));
  const summary = serviceSummary(svc);
  let ending;
  if (outro.ending) {
    const eligibility = endingEligibility(previewCampaign(campaign, summary));
    ending = strategy.ending(eligibility);
  }
  const result = commitNight(campaign, summary, { ending });
  return { ...result, svc, summary, ending };
}
