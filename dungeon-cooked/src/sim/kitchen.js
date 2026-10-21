// Estações de preparo como máquinas de estado. Nenhuma função aqui toca DOM.
//
// Estação de cozinha: EMPTY -> LOADING -> PROCESSING -> READY -> (TAKEN | SPOILED) -> EMPTY
// Bancada fria: LOADING -> READY direto (montagem sem cocção, nunca queima).
// Tábua: EMPTY -> CHOPPING -> DONE -> EMPTY.
import { RECIPE_BY_ID, COOK_STATIONS } from '../data/recipes.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { isSubMultiset, sameMultiset, missingFrom } from '../core/util.js';

export const STATION_STATE = Object.freeze({
  EMPTY: 'EMPTY',
  LOADING: 'LOADING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  SPOILED: 'SPOILED',
});

export const BOARD_STATE = Object.freeze({ EMPTY: 'EMPTY', CHOPPING: 'CHOPPING', DONE: 'DONE' });

export const CHOPS_NEEDED = 2;
export const NEAR_BURN_RATIO = 0.35;

// ---------- Itens ----------
export function createItemFactory(prefix = 'it') {
  let n = 0;
  return {
    ingredient(id, prepared = false) {
      return { uid: `${prefix}${++n}`, type: 'ingredient', id, prepared: prepared || INGREDIENTS[id].prep === 'none' };
    },
    dish(recipeId, quality) {
      return { uid: `${prefix}${++n}`, type: 'dish', recipeId, quality };
    },
  };
}

export function ingredientReady(item) {
  return item.type === 'ingredient' && (item.prepared || INGREDIENTS[item.id].prep === 'none');
}

// ---------- Receitas ----------
export function recipesForStation(cookType, available) {
  return available.map((id) => RECIPE_BY_ID[id]).filter((r) => r && r.station === cookType);
}

// Receita exata para o conteúdo, desde que nenhuma outra receita da mesma
// estação ainda possa crescer a partir dele (evita iniciar cedo demais).
export function exactRecipe(contents, cookType, available) {
  const options = recipesForStation(cookType, available);
  const exact = options.find((r) => sameMultiset(contents, r.ingredients));
  if (!exact) return null;
  const canGrow = options.some((r) => r.ingredients.length > contents.length && isSubMultiset(contents, r.ingredients));
  return canGrow ? null : exact;
}

export function possibleRecipes(contents, cookType, available) {
  return recipesForStation(cookType, available).filter((r) => isSubMultiset(contents, r.ingredients));
}

// ---------- Estação de cozinha ----------
export function createCookStation(id, cookType) {
  return {
    id,
    cookType,
    state: STATION_STATE.EMPTY,
    contents: [], // itens (ingredientes) carregados
    recipeId: null,
    remaining: 0, // segundos de cocção restantes
    total: 0,
    readyElapsed: 0,
    spoilAfter: null, // segundos no ponto até queimar (null = não queima)
    nearBurnWarned: false,
    dish: null, // item de prato quando READY/SPOILED
    batch: 0,
  };
}

export function contentIds(station) {
  return station.contents.map((item) => item.id);
}

// Verifica se o ingrediente pode entrar, sem alterar nada.
// timing: { cookTimeMult, spoilMult } (só usado ao iniciar).
export function checkAdd(station, item, available) {
  const name = COOK_STATIONS[station.cookType].name;
  if (station.state === STATION_STATE.PROCESSING) return { ok: false, reason: 'busy', text: `${name} ocupado. Termine ou limpe o lote atual.` };
  if (station.state === STATION_STATE.READY || station.state === STATION_STATE.SPOILED) {
    return { ok: false, reason: 'full', text: `Tem um prato pronto no ${name.toLowerCase()}. Retire antes de cozinhar outro.` };
  }
  if (!item || item.type !== 'ingredient') return { ok: false, reason: 'notIngredient', text: `Só ingredientes entram no ${name.toLowerCase()}.` };
  const info = INGREDIENTS[item.id];
  if (!ingredientReady(item)) {
    return { ok: false, reason: 'raw', text: `${info.name} está cru. Leve à tábua para ${info.prepVerb} antes.` };
  }
  const next = [...contentIds(station), item.id];
  const options = possibleRecipes(next, station.cookType, available);
  if (!options.length) {
    const current = contentIds(station);
    if (!current.length) {
      return { ok: false, reason: 'noRecipe', text: `Nenhuma receita conhecida do ${name.toLowerCase()} usa ${info.name}.` };
    }
    return { ok: false, reason: 'mismatch', text: `${info.name} não combina com o que já está no ${name.toLowerCase()}.` };
  }
  return { ok: true, next, options };
}

// Coloca o ingrediente (que já saiu da mão de forma atômica pelo chamador).
export function addIngredient(station, item, available, timing = {}) {
  const check = checkAdd(station, item, available);
  if (!check.ok) return check;
  station.contents.push(item);
  station.state = STATION_STATE.LOADING;
  const recipe = exactRecipe(contentIds(station), station.cookType, available);
  if (recipe) startProcessing(station, recipe, timing);
  return { ok: true, started: Boolean(recipe), recipe };
}

function startProcessing(station, recipe, timing) {
  station.recipeId = recipe.id;
  station.batch += 1;
  station.readyElapsed = 0;
  station.nearBurnWarned = false;
  const spoil = recipe.spoilSeconds == null || timing.noBurn ? null : recipe.spoilSeconds * (timing.spoilMult ?? 1);
  station.spoilAfter = spoil;
  const cook = recipe.cookSeconds * (timing.cookTimeMult ?? 1);
  if (cook <= 0) {
    // Montagem a frio: pronta na hora, sem cocção.
    station.contents = [];
    station.remaining = 0;
    station.total = 0;
    station.state = STATION_STATE.READY;
    station.dish = timing.makeDish(recipe.id, 'perfect');
  } else {
    station.remaining = cook;
    station.total = cook;
    station.state = STATION_STATE.PROCESSING;
    station.dish = null;
  }
}

// Avança o relógio da estação. Retorna eventos ocorridos neste passo.
export function tickCookStation(station, dt, makeDish) {
  const events = [];
  if (station.state === STATION_STATE.PROCESSING) {
    station.remaining = Math.max(0, station.remaining - dt);
    if (station.remaining === 0) {
      station.state = STATION_STATE.READY;
      station.contents = [];
      station.readyElapsed = 0;
      station.dish = makeDish(station.recipeId, 'perfect');
      events.push({ type: 'ready', station: station.id, recipeId: station.recipeId });
    }
  } else if (station.state === STATION_STATE.READY && station.spoilAfter != null) {
    station.readyElapsed += dt;
    const left = station.spoilAfter - station.readyElapsed;
    if (!station.nearBurnWarned && left <= station.spoilAfter * NEAR_BURN_RATIO) {
      station.nearBurnWarned = true;
      events.push({ type: 'nearBurn', station: station.id, recipeId: station.recipeId });
    }
    if (left <= 0) {
      station.state = STATION_STATE.SPOILED;
      station.dish = makeDish(station.recipeId, 'burnt');
      events.push({ type: 'spoiled', station: station.id, recipeId: station.recipeId });
    }
  }
  return events;
}

export function canTakeDish(station) {
  return (station.state === STATION_STATE.READY || station.state === STATION_STATE.SPOILED) && Boolean(station.dish);
}

// Retira o prato: só em READY ou SPOILED, nunca durante PROCESSING.
export function takeDish(station) {
  if (station.state === STATION_STATE.PROCESSING) {
    const left = Math.ceil(station.remaining);
    return { ok: false, reason: 'processing', text: `Ainda cozinhando... faltam ${left}s. Prato cru não sai daqui.` };
  }
  if (!canTakeDish(station)) {
    return { ok: false, reason: 'empty', text: 'Não há prato pronto aqui.' };
  }
  const dish = station.dish;
  resetCookStation(station);
  return { ok: true, dish };
}

export function resetCookStation(station) {
  station.state = STATION_STATE.EMPTY;
  station.contents = [];
  station.recipeId = null;
  station.remaining = 0;
  station.total = 0;
  station.readyElapsed = 0;
  station.spoilAfter = null;
  station.nearBurnWarned = false;
  station.dish = null;
}

export function stationHasSomething(station) {
  return station.state !== STATION_STATE.EMPTY;
}

// Texto curto do que falta numa estação em LOADING.
export function loadingHint(station, available) {
  const ids = contentIds(station);
  const options = possibleRecipes(ids, station.cookType, available);
  if (!options.length) return '';
  return options
    .map((r) => {
      const missing = missingFrom(ids, r.ingredients).map((id) => INGREDIENTS[id].short);
      return `${r.name}: falta ${missing.join(' + ')}`;
    })
    .join(' · ');
}

export function readyProgress(station) {
  if (station.state === STATION_STATE.PROCESSING) return 1 - station.remaining / (station.total || 1);
  if (station.state === STATION_STATE.READY && station.spoilAfter != null) return station.readyElapsed / station.spoilAfter;
  return 0;
}

export function isNearBurn(station) {
  return station.state === STATION_STATE.READY && station.spoilAfter != null &&
    station.spoilAfter - station.readyElapsed <= station.spoilAfter * NEAR_BURN_RATIO;
}

// ---------- Tábua ----------
export function createBoard() {
  return { id: 'board', state: BOARD_STATE.EMPTY, item: null, chops: 0, chopAnim: 0 };
}

export function checkBoardPlace(board, item) {
  if (board.state !== BOARD_STATE.EMPTY) return { ok: false, reason: 'busy', text: 'A tábua está ocupada. Termine o corte atual primeiro.' };
  if (!item || item.type !== 'ingredient') return { ok: false, reason: 'notIngredient', text: 'A tábua não pica preocupações. Traga um ingrediente.' };
  const info = INGREDIENTS[item.id];
  if (info.prep === 'none') return { ok: false, reason: 'noPrep', text: `${info.name} não precisa de corte. Leve direto à estação.` };
  if (item.prepared) return { ok: false, reason: 'done', text: `${info.name} já está pronto para cozinhar.` };
  return { ok: true };
}

// Coloca e já dá o primeiro corte.
export function placeOnBoard(board, item) {
  const check = checkBoardPlace(board, item);
  if (!check.ok) return check;
  board.item = item;
  board.state = BOARD_STATE.CHOPPING;
  board.chops = 0;
  return chop(board);
}

export function chop(board) {
  if (board.state !== BOARD_STATE.CHOPPING) return { ok: false, reason: 'notChopping', text: 'Nada para cortar.' };
  board.chops += 1;
  board.chopAnim = 1;
  if (board.chops >= CHOPS_NEEDED) {
    board.item.prepared = true;
    board.state = BOARD_STATE.DONE;
    return { ok: true, done: true };
  }
  return { ok: true, done: false };
}

export function takeFromBoard(board) {
  if (board.state !== BOARD_STATE.DONE) return { ok: false, reason: 'notDone', text: 'Ainda falta cortar.' };
  const item = board.item;
  board.item = null;
  board.chops = 0;
  board.state = BOARD_STATE.EMPTY;
  return { ok: true, item };
}

export function clearBoard(board) {
  const item = board.item;
  board.item = null;
  board.chops = 0;
  board.state = BOARD_STATE.EMPTY;
  return item;
}
