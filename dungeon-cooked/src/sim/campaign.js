// Progresso da campanha (História ou Tranquilo). Funções puras: recebem um estado
// e devolvem um novo, para que salvar/commitar seja atômico e sem duplicar prêmio.
import { clamp, deepClone, round1 } from '../core/util.js';
import { CUSTOMERS, CUSTOMER_IDS, RIVALRIES } from '../data/customers.js';
import { NIGHTS, NIGHT_COUNT, nightDef } from '../data/nights.js';
import { UPGRADES, DECOR, UPGRADE_BY_ID, modsFor } from '../data/upgrades.js';
import { RECIPES } from '../data/recipes.js';
import { ENDINGS, JOURNAL, CLUES } from '../data/dialogues.js';

export const CAMPAIGN_MODES = ['historia', 'tranquilo'];
export const MESA_TRUST = 3;
export const MESA_RECONCILIATIONS = 2;
export const RECONCILED_BOND = 2;
export const SEGREDO_CLUES = 3;

export const STAT_KEYS = ['served', 'starsTotal', 'good', 'perfect', 'expired', 'burnt', 'conflictsResolved', 'crises', 'coinsEarned', 'nightsPlayed', 'retries', 'harmonies'];

export function newCampaign(mode, now = new Date().toISOString()) {
  if (!CAMPAIGN_MODES.includes(mode)) throw new Error(`Modo de campanha inválido: ${mode}`);
  return {
    mode,
    night: 1,
    completed: false,
    ending: null,
    coins: 0,
    upgrades: [],
    decor: [],
    trust: Object.fromEntries(CUSTOMER_IDS.map((id) => [id, CUSTOMERS[id].baseTrust])),
    bonds: Object.fromEntries(RIVALRIES.map((r) => [r.id, 0])),
    clues: [],
    flags: [],
    cooked: [],
    prefsKnown: {},
    journal: [],
    met: [],
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
    nightLog: [],
    finalCheckpoint: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function serviceOptionsFor(campaign, pace = 1) {
  const def = nightDef(campaign.night);
  return {
    mode: campaign.mode,
    night: campaign.night,
    def,
    mods: modsFor(campaign.upgrades),
    campaign: { trust: campaign.trust, prefsKnown: campaign.prefsKnown },
    pace,
  };
}

export function reputation(campaign) {
  const decor = campaign.decor.reduce((sum, id) => sum + (UPGRADE_BY_ID[id]?.reputation || 0), 0);
  const ratings = campaign.stats.served ? campaign.stats.starsTotal / campaign.stats.served : 0;
  return { stars: round1(ratings), decor, total: round1(ratings + decor) };
}

export function averageTrust(campaign) {
  const values = CUSTOMER_IDS.map((id) => campaign.trust[id] ?? CUSTOMERS[id].baseTrust);
  return round1(values.reduce((a, b) => a + b, 0) / values.length);
}

export function reconciledPairs(campaign) {
  return RIVALRIES.filter((r) => (campaign.bonds[r.id] || 0) >= RECONCILED_BOND).map((r) => r.id);
}

// Mescla o resultado de um serviço no estado (sem verificar sucesso).
function merge(campaign, summary) {
  const next = deepClone(campaign);
  for (const [npc, delta] of Object.entries(summary.trustDelta || {})) {
    if (!CUSTOMERS[npc]) continue;
    next.trust[npc] = round1(clamp((next.trust[npc] ?? CUSTOMERS[npc].baseTrust) + delta, 0, 5));
  }
  for (const [pair, delta] of Object.entries(summary.bondDelta || {})) {
    if (!(pair in next.bonds)) continue;
    next.bonds[pair] = round1(clamp(next.bonds[pair] + delta, 0, 3));
  }
  for (const clue of summary.clues || []) if (CLUES[clue] && !next.clues.includes(clue)) next.clues.push(clue);
  for (const flag of summary.flags || []) {
    if (flag.startsWith('journal:')) {
      const id = flag.slice(8);
      if (JOURNAL[id] && !next.journal.includes(id)) next.journal.push(id);
    } else if (!next.flags.includes(flag)) next.flags.push(flag);
  }
  for (const id of summary.cooked || []) if (!next.cooked.includes(id)) next.cooked.push(id);
  next.prefsKnown = deepClone(summary.prefsKnown || next.prefsKnown);
  return next;
}

// Prévia usada para checar finais antes do commit da Noite 7.
export function previewCampaign(campaign, summary) {
  return merge(campaign, summary);
}

export function endingEligibility(state) {
  const avg = averageTrust(state);
  const pairs = reconciledPairs(state);
  const clues = state.clues.length;
  const banquet = state.flags.includes('banquet_perfect');
  return {
    mesa: {
      eligible: avg >= MESA_TRUST && pairs.length >= MESA_RECONCILIATIONS,
      progress: [`Confiança média ${avg.toFixed(1)} de ${MESA_TRUST}`, `Reconciliações ${pairs.length} de ${MESA_RECONCILIATIONS}`],
    },
    lenda: { eligible: true, progress: ['Sempre disponível ao concluir o banquete'] },
    segredo: {
      eligible: clues >= SEGREDO_CLUES && banquet,
      progress: [`Pistas ${clues} de ${SEGREDO_CLUES}`, banquet ? 'Banquete servido no ponto' : 'Banquete no ponto (Noite 7)'],
    },
  };
}

// Commit de uma noite concluída. Retorna { ok, campaign, report } ou { ok: false }.
// A recompensa só é aplicada aqui, junto com o avanço da noite (salvos juntos).
export function commitNight(campaign, summary, options = {}) {
  if (summary.mode !== campaign.mode || summary.night !== campaign.night) {
    return { ok: false, reason: 'mismatch' };
  }
  if (campaign.completed) return { ok: false, reason: 'completed' };
  if (!summary.objective.done) return { ok: false, reason: 'objective' };
  const def = nightDef(campaign.night);
  const isFinal = campaign.night === NIGHT_COUNT;
  if (isFinal && !ENDINGS[options.ending]) return { ok: false, reason: 'ending' };
  const next = merge(campaign, summary);
  if (isFinal) {
    const eligible = endingEligibility(next)[options.ending];
    if (!eligible.eligible) return { ok: false, reason: 'ineligible' };
  }
  const bonusCoins = summary.bonus.filter((b) => b.done).reduce((sum, b) => sum + b.reward, 0);
  const earned = summary.stats.coins + bonusCoins;
  next.coins = clamp(next.coins + earned, 0, 999999);
  const s = summary.stats;
  next.stats.served += s.served;
  next.stats.starsTotal += s.starsTotal;
  next.stats.good += s.good;
  next.stats.perfect += s.perfect;
  next.stats.expired += s.expired;
  next.stats.burnt += s.burntCreated;
  next.stats.conflictsResolved += s.conflictsResolved;
  next.stats.crises += s.crises;
  next.stats.coinsEarned += earned;
  next.stats.nightsPlayed += 1;
  next.stats.harmonies += s.harmonyPairs.length;
  for (const npc of summary.met || []) if (CUSTOMERS[npc] && !next.met.includes(npc)) next.met.push(npc);
  if (def.journal && JOURNAL[def.journal] && !next.journal.includes(def.journal)) next.journal.push(def.journal);
  next.nightLog.push({
    night: campaign.night,
    served: s.served,
    stars: s.served ? round1(s.starsTotal / s.served) : 0,
    coins: earned,
    success: true,
  });
  if (isFinal) {
    next.completed = true;
    next.ending = options.ending;
  } else {
    next.night += 1;
    if (next.night === NIGHT_COUNT) {
      // Checkpoint do início da última noite, para revisitar outros finais.
      const snapshot = deepClone(next);
      snapshot.finalCheckpoint = null;
      next.finalCheckpoint = snapshot;
    }
  }
  next.updatedAt = options.now || new Date().toISOString();
  return { ok: true, campaign: next, report: { earned, bonusCoins, isFinal } };
}

// Registro de tentativa falha (não concede nada, só conta para estatística).
export function recordRetry(campaign, now = new Date().toISOString()) {
  const next = deepClone(campaign);
  next.stats.retries += 1;
  next.updatedAt = now;
  return next;
}

// Volta ao início da Noite 7 para escolher outro final (mantém a campanha concluída anterior no meta).
export function revisitFinalNight(campaign, now = new Date().toISOString()) {
  if (!campaign.finalCheckpoint) return null;
  const restored = deepClone(campaign.finalCheckpoint);
  restored.finalCheckpoint = deepClone(campaign.finalCheckpoint);
  restored.updatedAt = now;
  return restored;
}

// ---------- Loja ----------
export function shopItems(campaign) {
  const completedNights = campaign.completed ? NIGHT_COUNT : campaign.night - 1;
  return [...UPGRADES.map((u) => ({ ...u, group: 'upgrade' })), ...DECOR.map((d) => ({ ...d, group: 'decor' }))].map((item) => {
    const owned = item.group === 'upgrade' ? campaign.upgrades.includes(item.id) : campaign.decor.includes(item.id);
    const unlocked = completedNights >= item.availableAfter;
    return { ...item, owned, unlocked, affordable: campaign.coins >= item.cost };
  });
}

export function buyItem(campaign, id, now = new Date().toISOString()) {
  const item = shopItems(campaign).find((i) => i.id === id);
  if (!item) return { ok: false, reason: 'unknown', text: 'Item desconhecido.' };
  if (item.owned) return { ok: false, reason: 'owned', text: 'Você já tem isso.' };
  if (!item.unlocked) return { ok: false, reason: 'locked', text: `Disponível após a Noite ${item.availableAfter}.` };
  if (campaign.coins < item.cost) return { ok: false, reason: 'coins', text: `Faltam ${item.cost - campaign.coins} moedas.` };
  const next = deepClone(campaign);
  next.coins -= item.cost;
  if (item.group === 'upgrade') next.upgrades.push(id);
  else next.decor.push(id);
  next.updatedAt = now;
  return { ok: true, campaign: next, item };
}

// ---------- Diário ----------
export function journalLines(campaign) {
  const lines = campaign.journal.map((id) => JOURNAL[id]).filter(Boolean);
  for (const r of RIVALRIES) if ((campaign.bonds[r.id] || 0) >= RECONCILED_BOND) lines.push(r.journal);
  return lines;
}

export function cookbookProgress(campaign) {
  return { cooked: campaign.cooked.length, total: RECIPES.length };
}

export function nightTitle(n) {
  const def = NIGHTS.find((x) => x.night === n);
  return def ? `Noite ${n} · ${def.title}` : `Noite ${n}`;
}

// ---------- Meta global (recordes, conquistas, finais vistos) ----------
export function newMeta() {
  return { challengeBest: 0, challengeBestServed: 0, challengeRuns: 0, achievements: [], endingsSeen: [], conflictsTotal: 0 };
}

export function recordChallenge(meta, score, served) {
  const next = deepClone(meta);
  next.challengeRuns += 1;
  const record = score > next.challengeBest;
  if (record) {
    next.challengeBest = score;
    next.challengeBestServed = served;
  }
  return { meta: next, record };
}

export function challengeRank(score) {
  if (score >= 1500) return { title: 'Lenda da Panela Assombrada', text: 'Até o dragão pediu o seu contato.' };
  if (score >= 900) return { title: 'Chef Aprovado pela Dungeon', text: 'Os fregueses sobreviveram. Já é currículo.' };
  if (score >= 400) return { title: 'Cozinheiro de Respeito', text: 'O caldeirão está orgulhoso. Discretamente.' };
  return { title: 'Aprendiz de Miojo Arcano', text: 'O orc quer falar com o gerente. Você é o gerente.' };
}
