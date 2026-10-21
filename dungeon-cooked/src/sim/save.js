// Salvamento local versionado, validação estrita e exportação/importação JSON.
// O armazenamento é injetado (localStorage no navegador, objeto em memória nos testes).
import { CUSTOMER_IDS, RIVALRIES } from '../data/customers.js';
import { RECIPE_BY_ID, TAGS, SPECIAL_PREFS } from '../data/recipes.js';
import { UPGRADES, DECOR } from '../data/upgrades.js';
import { ENDING_IDS, JOURNAL, CLUES } from '../data/dialogues.js';
import { ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import { NIGHT_COUNT } from '../data/nights.js';
import { CAMPAIGN_MODES, STAT_KEYS, newMeta } from './campaign.js';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'dungeonCooked.save.v1';
export const BACKUP_KEY = 'dungeonCooked.save.v1.backup';
export const META_KEY = 'dungeonCooked.meta.v1';
export const SETTINGS_KEY = 'dungeonCooked.settings.v1';

const UPGRADE_IDS = UPGRADES.map((u) => u.id);
const DECOR_IDS = DECOR.map((d) => d.id);
const PAIR_IDS = RIVALRIES.map((r) => r.id);
const PREF_IDS = [...Object.keys(TAGS), ...Object.keys(SPECIAL_PREFS)];
const FLAG_RE = /^[a-z0-9_:]{1,40}$/;

class SaveError extends Error {}

function fail(path, msg) {
  throw new SaveError(`${path}: ${msg}`);
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
}

function checkKeys(obj, allowed, path) {
  if (!isPlainObject(obj)) fail(path, 'precisa ser um objeto');
  for (const key of Object.keys(obj)) if (!allowed.includes(key)) fail(path, `campo desconhecido "${key}"`);
}

function num(v, path, min, max, integer = false) {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'precisa ser número');
  if (integer && !Number.isInteger(v)) fail(path, 'precisa ser inteiro');
  if (v < min || v > max) fail(path, `fora do limite (${min}–${max})`);
  return v;
}

function bool(v, path) {
  if (typeof v !== 'boolean') fail(path, 'precisa ser verdadeiro/falso');
  return v;
}

function str(v, path, max = 40) {
  if (typeof v !== 'string' || v.length > max) fail(path, 'texto inválido');
  return v;
}

function idList(v, path, allowed, max = 200) {
  if (!Array.isArray(v) || v.length > max) fail(path, 'precisa ser uma lista');
  const seen = new Set();
  for (const id of v) {
    if (typeof id !== 'string' || !allowed.includes(id)) fail(path, `id desconhecido "${String(id).slice(0, 30)}"`);
    if (seen.has(id)) fail(path, `id repetido "${id}"`);
    seen.add(id);
  }
  return v.slice();
}

function numberMap(v, path, keys, min, max) {
  checkKeys(v, keys, path);
  const out = {};
  for (const [k, value] of Object.entries(v)) out[k] = num(value, `${path}.${k}`, min, max);
  return out;
}

const CAMPAIGN_KEYS = ['mode', 'night', 'completed', 'ending', 'coins', 'upgrades', 'decor', 'trust', 'bonds', 'clues', 'flags', 'cooked', 'prefsKnown', 'journal', 'met', 'stats', 'nightLog', 'finalCheckpoint', 'createdAt', 'updatedAt'];

export function validateCampaign(obj, path = 'campanha', allowCheckpoint = true) {
  checkKeys(obj, CAMPAIGN_KEYS, path);
  for (const key of CAMPAIGN_KEYS) if (!(key in obj)) fail(path, `campo obrigatório ausente "${key}"`);
  if (!CAMPAIGN_MODES.includes(obj.mode)) fail(`${path}.mode`, 'modo inválido');
  const out = { mode: obj.mode };
  out.night = num(obj.night, `${path}.night`, 1, NIGHT_COUNT, true);
  out.completed = bool(obj.completed, `${path}.completed`);
  if (obj.ending !== null && !ENDING_IDS.includes(obj.ending)) fail(`${path}.ending`, 'final inválido');
  if (out.completed && obj.ending === null) fail(`${path}.ending`, 'campanha concluída sem final');
  out.ending = obj.ending;
  out.coins = num(obj.coins, `${path}.coins`, 0, 999999, true);
  out.upgrades = idList(obj.upgrades, `${path}.upgrades`, UPGRADE_IDS);
  out.decor = idList(obj.decor, `${path}.decor`, DECOR_IDS);
  out.trust = numberMap(obj.trust, `${path}.trust`, CUSTOMER_IDS, 0, 5);
  out.bonds = numberMap(obj.bonds, `${path}.bonds`, PAIR_IDS, 0, 3);
  out.clues = idList(obj.clues, `${path}.clues`, Object.keys(CLUES));
  if (!Array.isArray(obj.flags) || obj.flags.length > 100) fail(`${path}.flags`, 'lista inválida');
  out.flags = obj.flags.map((f, i) => {
    if (typeof f !== 'string' || !FLAG_RE.test(f)) fail(`${path}.flags[${i}]`, 'marcador inválido');
    return f;
  });
  out.cooked = idList(obj.cooked, `${path}.cooked`, Object.keys(RECIPE_BY_ID));
  checkKeys(obj.prefsKnown, CUSTOMER_IDS, `${path}.prefsKnown`);
  out.prefsKnown = {};
  for (const [npc, list] of Object.entries(obj.prefsKnown)) out.prefsKnown[npc] = idList(list, `${path}.prefsKnown.${npc}`, PREF_IDS);
  out.journal = idList(obj.journal, `${path}.journal`, Object.keys(JOURNAL));
  out.met = idList(obj.met, `${path}.met`, CUSTOMER_IDS);
  checkKeys(obj.stats, STAT_KEYS, `${path}.stats`);
  out.stats = {};
  for (const key of STAT_KEYS) out.stats[key] = num(obj.stats[key] ?? 0, `${path}.stats.${key}`, 0, 1e7);
  if (!Array.isArray(obj.nightLog) || obj.nightLog.length > 100) fail(`${path}.nightLog`, 'lista inválida');
  out.nightLog = obj.nightLog.map((entry, i) => {
    const p = `${path}.nightLog[${i}]`;
    checkKeys(entry, ['night', 'served', 'stars', 'coins', 'success'], p);
    return {
      night: num(entry.night, `${p}.night`, 1, NIGHT_COUNT, true),
      served: num(entry.served, `${p}.served`, 0, 1000, true),
      stars: num(entry.stars, `${p}.stars`, 0, 5),
      coins: num(entry.coins, `${p}.coins`, 0, 999999, true),
      success: bool(entry.success, `${p}.success`),
    };
  });
  if (obj.finalCheckpoint === null) out.finalCheckpoint = null;
  else if (allowCheckpoint) {
    out.finalCheckpoint = validateCampaign(obj.finalCheckpoint, `${path}.finalCheckpoint`, false);
    if (out.finalCheckpoint.finalCheckpoint !== null) fail(`${path}.finalCheckpoint`, 'checkpoint aninhado');
  } else fail(`${path}.finalCheckpoint`, 'checkpoint aninhado');
  out.createdAt = str(obj.createdAt, `${path}.createdAt`);
  out.updatedAt = str(obj.updatedAt, `${path}.updatedAt`);
  return out;
}

export function validateMeta(obj, path = 'meta') {
  const keys = Object.keys(newMeta());
  checkKeys(obj, keys, path);
  const base = newMeta();
  return {
    challengeBest: num(obj.challengeBest ?? base.challengeBest, `${path}.challengeBest`, 0, 1e7, true),
    challengeBestServed: num(obj.challengeBestServed ?? 0, `${path}.challengeBestServed`, 0, 1e5, true),
    challengeRuns: num(obj.challengeRuns ?? 0, `${path}.challengeRuns`, 0, 1e7, true),
    achievements: idList(obj.achievements ?? [], `${path}.achievements`, Object.keys(ACHIEVEMENT_BY_ID)),
    endingsSeen: idList(obj.endingsSeen ?? [], `${path}.endingsSeen`, ENDING_IDS),
    conflictsTotal: num(obj.conflictsTotal ?? 0, `${path}.conflictsTotal`, 0, 1e7, true),
  };
}

// Arquivo completo de save: { saveVersion, game, slots: { historia, tranquilo }, meta }
export function validateSaveFile(obj) {
  try {
    if (!isPlainObject(obj)) fail('arquivo', 'não é um objeto JSON');
    if (typeof obj.saveVersion !== 'number') fail('saveVersion', 'ausente');
    if (obj.saveVersion > SAVE_VERSION) fail('saveVersion', `versão ${obj.saveVersion} é mais nova que este jogo (${SAVE_VERSION})`);
    const migrated = migrate(obj);
    checkKeys(migrated, ['saveVersion', 'game', 'exportedAt', 'slots', 'meta'], 'arquivo');
    if (migrated.game !== 'dungeon-cooked') fail('game', 'não é um save do Dungeon Cooked');
    checkKeys(migrated.slots, CAMPAIGN_MODES, 'slots');
    const slots = {};
    for (const mode of CAMPAIGN_MODES) {
      const slot = migrated.slots[mode] ?? null;
      slots[mode] = slot === null ? null : validateCampaign(slot, `slots.${mode}`);
      if (slots[mode] && slots[mode].mode !== mode) fail(`slots.${mode}.mode`, 'não corresponde ao slot');
    }
    const meta = migrated.meta == null ? newMeta() : validateMeta(migrated.meta);
    return { ok: true, value: { saveVersion: SAVE_VERSION, game: 'dungeon-cooked', slots, meta } };
  } catch (error) {
    if (error instanceof SaveError) return { ok: false, error: error.message };
    return { ok: false, error: 'arquivo ilegível' };
  }
}

// Migração explícita. Hoje só existe a versão 1; versões antigas/desconhecidas são recusadas.
export function migrate(obj) {
  if (obj.saveVersion === SAVE_VERSION) return obj;
  fail('saveVersion', `versão ${obj.saveVersion} não suportada`);
  return null;
}

export function emptySaveFile() {
  return { saveVersion: SAVE_VERSION, game: 'dungeon-cooked', slots: { historia: null, tranquilo: null }, meta: newMeta() };
}

export function exportSave(file, now = new Date().toISOString()) {
  return JSON.stringify({ ...file, exportedAt: now }, null, 2);
}

export function parseImport(text) {
  if (typeof text !== 'string' || text.length > 2_000_000) return { ok: false, error: 'arquivo grande demais ou vazio' };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'não é um JSON válido' };
  }
  return validateSaveFile(data);
}

// ---------- Armazenamento ----------
// storage: objeto com getItem/setItem/removeItem (localStorage ou equivalente).
export function createSaveStore(storage) {
  let available = Boolean(storage);
  function read(key) {
    if (!available) return null;
    try {
      return storage.getItem(key);
    } catch {
      available = false;
      return null;
    }
  }
  function write(key, value) {
    if (!available) return false;
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
  return {
    get available() {
      return available;
    },
    // Carrega o save; dados inválidos não apagam nada, só são ignorados.
    load() {
      const raw = read(SAVE_KEY);
      if (!raw) return { ok: true, value: emptySaveFile(), fresh: true };
      const parsed = parseImport(raw);
      if (!parsed.ok) return { ok: false, error: parsed.error, value: emptySaveFile(), corrupt: true };
      const metaRaw = read(META_KEY);
      if (metaRaw) {
        try {
          parsed.value.meta = validateMeta(JSON.parse(metaRaw));
        } catch {
          // meta inválido: mantém o do arquivo principal
        }
      }
      return parsed;
    },
    save(file) {
      const check = validateSaveFile(JSON.parse(JSON.stringify(file)));
      if (!check.ok) return { ok: false, error: check.error };
      const okMain = write(SAVE_KEY, JSON.stringify({ ...check.value }));
      const okMeta = write(META_KEY, JSON.stringify(check.value.meta));
      return okMain && okMeta ? { ok: true } : { ok: false, error: 'Este navegador não permite salvar agora.' };
    },
    backup() {
      const raw = read(SAVE_KEY);
      if (raw) write(BACKUP_KEY, raw);
      return Boolean(raw);
    },
    readSettings() {
      const raw = read(SETTINGS_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    writeSettings(settings) {
      return write(SETTINGS_KEY, JSON.stringify(settings));
    },
  };
}

export function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}
