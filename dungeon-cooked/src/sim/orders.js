// Pedidos e avaliação de entregas. Pedido: QUEUED -> ACTIVE -> FULFILLED | EXPIRED | CANCELLED
// (uma única transição terminal, garantida por closeOrder).
import { RECIPE_BY_ID, TAGS, dishName } from '../data/recipes.js';
import { CUSTOMERS } from '../data/customers.js';
import { clamp } from '../core/util.js';

export const ORDER_STATUS = Object.freeze({
  QUEUED: 'QUEUED',
  ACTIVE: 'ACTIVE',
  FULFILLED: 'FULFILLED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
});

const TERMINAL = new Set([ORDER_STATUS.FULFILLED, ORDER_STATUS.EXPIRED, ORDER_STATUS.CANCELLED]);

export function isTerminal(order) {
  return TERMINAL.has(order.status);
}

export function createOrder({ id, npc, seat, recipeId = null, tag = null, patience, priority = false, noExpire = false, tutorial = false, issuedAt = 0 }) {
  return {
    id,
    npc,
    seat,
    kind: recipeId ? 'dish' : 'tag',
    recipeId,
    tag,
    status: ORDER_STATUS.ACTIVE,
    patience,
    maxPatience: patience,
    priority,
    noExpire,
    tutorial,
    issuedAt,
    rewardClaimed: false,
  };
}

// Única porta de saída de um pedido: impede pagamento ou expiração em dobro.
export function closeOrder(order, status) {
  if (isTerminal(order)) return false;
  if (!TERMINAL.has(status)) throw new Error(`Status terminal inválido: ${status}`);
  order.status = status;
  return true;
}

export function orderMatches(order, recipeId) {
  if (order.kind === 'dish') return order.recipeId === recipeId;
  const recipe = RECIPE_BY_ID[recipeId];
  return Boolean(recipe && recipe.tags.includes(order.tag));
}

export function orderLabel(order) {
  if (order.kind === 'dish') return RECIPE_BY_ID[order.recipeId].name;
  return `Algo ${TAGS[order.tag].adjective}`;
}

// Receitas que satisfazem o pedido dentro do cardápio disponível.
export function satisfyingRecipes(order, available) {
  if (order.kind === 'dish') return available.includes(order.recipeId) ? [order.recipeId] : [];
  return available.filter((id) => RECIPE_BY_ID[id].tags.includes(order.tag));
}

export function dislikeHits(npcId, recipeId, quality, patienceRatio) {
  const npc = CUSTOMERS[npcId];
  const recipe = RECIPE_BY_ID[recipeId];
  const hits = [];
  for (const tag of npc.dislikes) {
    if (tag === 'queimado') { if (quality === 'burnt') hits.push(tag); }
    else if (tag === 'espera') { if (patienceRatio < 0.4) hits.push(tag); }
    else if (recipe.tags.includes(tag)) hits.push(tag);
  }
  return hits;
}

export function likeHits(npcId, recipeId) {
  const npc = CUSTOMERS[npcId];
  const recipe = RECIPE_BY_ID[recipeId];
  return npc.likes.filter((tag) => recipe.tags.includes(tag));
}

const DISLIKE_TEXT = {
  queimado: 'detesta prato queimado',
  espera: 'detesta esperar muito',
};

// Avalia uma entrega. ctx: { trust, timed, combo, mode }
// Não altera estado: quem chama aplica o resultado uma única vez.
export function evaluateDelivery(order, dish, ctx = {}) {
  const recipe = RECIPE_BY_ID[dish.recipeId];
  const npc = CUSTOMERS[order.npc];
  if (!orderMatches(order, dish.recipeId)) {
    return {
      accepted: false,
      reason: 'wrong',
      text: `${npc.name} pediu ${orderLabel(order)}. Isso é ${dishName(recipe, dish.quality)}.`,
    };
  }
  const ratio = ctx.timed === false || order.noExpire ? 1 : clamp(order.patience / order.maxPatience, 0, 1);
  const reasons = [];
  let stars = 3;
  if (dish.quality === 'perfect') { stars += 1; reasons.push({ delta: 1, text: 'no ponto' }); }
  if (dish.quality === 'burnt') { stars -= 2; reasons.push({ delta: -2, text: 'queimado' }); }
  if (ratio >= 0.5) { stars += 1; reasons.push({ delta: 1, text: ctx.timed === false ? 'servido com carinho' : 'rapidez' }); }
  const likes = likeHits(order.npc, dish.recipeId);
  if (likes.length) {
    stars += 1;
    reasons.push({ delta: 1, text: `${npc.name} adora ${likes.map((t) => TAGS[t].name.toLowerCase()).join(' e ')}`, pref: likes[0], like: true });
  }
  const dislikes = dislikeHits(order.npc, dish.recipeId, dish.quality, ratio);
  if (dislikes.length) {
    stars -= dislikes.length;
    for (const tag of dislikes) {
      reasons.push({ delta: -1, text: `${npc.name} ${DISLIKE_TEXT[tag] || `evita ${TAGS[tag].name.toLowerCase()}`}`, pref: tag, like: false });
    }
  }
  stars = clamp(stars, 1, 5);
  const trustBonus = Math.floor(ctx.trust ?? 0) * 2;
  let coins = Math.round(recipe.baseValue * (0.5 + 0.1 * stars)) + trustBonus + (order.priority ? 15 : 0);
  let comboBonus = 0;
  if (ctx.mode === 'desafio') {
    comboBonus = Math.min(ctx.combo ?? 0, 5) * 8;
    coins += comboBonus;
  }
  const trustDelta = stars >= 5 ? 0.6 : stars === 4 ? 0.4 : stars === 3 ? 0.15 : stars === 2 ? -0.1 : -0.3;
  let tension = 0;
  if (dish.quality === 'burnt') tension += 6;
  if (dislikes.some((t) => t !== 'queimado' && t !== 'espera')) tension += 4;
  if (recipe.peace) tension -= recipe.peace;
  if (stars >= 4) tension -= 3;
  return {
    accepted: true,
    stars,
    coins,
    tip: trustBonus,
    comboBonus,
    reasons,
    trustDelta,
    tension,
    likes,
    dislikes,
    burnt: dish.quality === 'burnt',
  };
}

// Precisa de confirmação antes de entregar? (prato queimado ou aversão já conhecida)
export function deliveryWarning(order, dish, knownPrefs = []) {
  if (!orderMatches(order, dish.recipeId)) return null;
  const npc = CUSTOMERS[order.npc];
  if (dish.quality === 'burnt') return `Prato queimado! ${npc.name} vai notar.`;
  const recipe = RECIPE_BY_ID[dish.recipeId];
  const known = npc.dislikes.filter((tag) => TAGS[tag] && recipe.tags.includes(tag) && knownPrefs.includes(tag));
  if (known.length) return `${npc.name} evita ${known.map((t) => TAGS[t].name.toLowerCase()).join(' e ')}.`;
  return null;
}

// Monta a fala do cliente com o nome do prato ou a tag.
export function fillLine(template, order) {
  const dish = order.kind === 'dish' ? RECIPE_BY_ID[order.recipeId].name : '';
  const tag = order.kind === 'tag' ? TAGS[order.tag].adjective : '';
  return template.replace('{dish}', dish).replace('{tag}', tag);
}
