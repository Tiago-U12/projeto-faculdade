import test from 'node:test';
import assert from 'node:assert/strict';
import { playCampaignNight } from './bot.mjs';
import { newCampaign, buyItem } from '../src/sim/campaign.js';
import {
  createSaveStore, memoryStorage, emptySaveFile, exportSave, parseImport, validateSaveFile, SAVE_KEY,
} from '../src/sim/save.js';

const strategy = { choose: () => 0, conflicts: 'talk', ending: () => 'lenda' };

function campaignAfterTwoNights() {
  let c = newCampaign('historia');
  for (let i = 0; i < 2; i++) {
    const res = playCampaignNight(c, strategy, 3 + i);
    assert.ok(res.ok);
    c = res.campaign;
  }
  const bought = buyItem(c, 'boots');
  assert.ok(bought.ok);
  return bought.campaign;
}

test('SV-01: salvar, "fechar" e reabrir reconstitui noite, melhorias, afinidade e ajustes', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  const campaign = campaignAfterTwoNights();
  const file = emptySaveFile();
  file.slots.historia = campaign;
  file.meta.achievements = ['first_dish'];
  assert.ok(store.save(file).ok);
  assert.ok(store.writeSettings({ musicVolume: 0.3, sfxVolume: 0.8, mute: true }));
  // Novo "processo": outra instância lendo o mesmo armazenamento.
  const reopened = createSaveStore(storage);
  const loaded = reopened.load();
  assert.ok(loaded.ok, loaded.error);
  const slot = loaded.value.slots.historia;
  assert.equal(slot.night, 3);
  assert.deepEqual(slot.upgrades, ['boots']);
  assert.equal(slot.coins, campaign.coins);
  assert.deepEqual(slot.trust, campaign.trust);
  assert.deepEqual(loaded.value.meta.achievements, ['first_dish']);
  assert.deepEqual(reopened.readSettings(), { musicVolume: 0.3, sfxVolume: 0.8, mute: true });
});

test('SV-02: importar JSON corrompido é recusado e o save anterior fica intacto', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage);
  const file = emptySaveFile();
  file.slots.historia = newCampaign('historia');
  store.save(file);
  const before = storage.getItem(SAVE_KEY);
  const cases = [
    '{ isso não é json',
    JSON.stringify({ saveVersion: 1, game: 'dungeon-cooked', slots: { historia: { ...newCampaign('historia'), coins: -50 }, tranquilo: null } }),
    JSON.stringify({ saveVersion: 1, game: 'dungeon-cooked', slots: { historia: { ...newCampaign('historia'), night: 99 }, tranquilo: null } }),
    JSON.stringify({ saveVersion: 1, game: 'dungeon-cooked', slots: { historia: { ...newCampaign('historia'), upgrades: ['foguete'] }, tranquilo: null } }),
    JSON.stringify({ saveVersion: 1, game: 'dungeon-cooked', slots: { historia: { ...newCampaign('historia'), hack: '<img onerror=alert(1)>' }, tranquilo: null } }),
    JSON.stringify({ saveVersion: 1, game: 'outro-jogo', slots: { historia: null, tranquilo: null } }),
    JSON.stringify({ saveVersion: 1, game: 'dungeon-cooked', slots: { historia: newCampaign('tranquilo'), tranquilo: null } }),
    JSON.stringify([1, 2, 3]),
  ];
  for (const text of cases) {
    const res = parseImport(text);
    assert.equal(res.ok, false, `deveria recusar: ${text.slice(0, 80)}`);
    assert.ok(typeof res.error === 'string' && res.error.length > 0);
  }
  assert.equal(storage.getItem(SAVE_KEY), before);
});

test('SV-03: versão desconhecida/mais nova é recusada com erro seguro', () => {
  const newer = parseImport(JSON.stringify({ ...emptySaveFile(), saveVersion: 7 }));
  assert.equal(newer.ok, false);
  assert.match(newer.error, /mais nova/);
  const older = parseImport(JSON.stringify({ ...emptySaveFile(), saveVersion: 0 }));
  assert.equal(older.ok, false);
  assert.match(older.error, /não suportada/);
  const missing = validateSaveFile({ game: 'dungeon-cooked', slots: {} });
  assert.equal(missing.ok, false);
});

test('exportar e importar ida e volta preserva a campanha', () => {
  const file = emptySaveFile();
  file.slots.historia = campaignAfterTwoNights();
  file.slots.tranquilo = newCampaign('tranquilo');
  const text = exportSave(file);
  const back = parseImport(text);
  assert.ok(back.ok, back.error);
  assert.deepEqual(back.value.slots, file.slots);
});

test('armazenamento bloqueado: o jogo continua e o erro é amigável', () => {
  const throwing = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceeded'); },
    removeItem() {},
  };
  const store = createSaveStore(throwing);
  const loaded = store.load();
  assert.ok(loaded.ok);
  assert.equal(loaded.value.slots.historia, null);
  const saved = store.save(emptySaveFile());
  assert.equal(saved.ok, false);
  assert.match(saved.error, /não permite salvar/);
  const none = createSaveStore(null);
  assert.equal(none.available, false);
  assert.equal(none.save(emptySaveFile()).ok, false);
});

test('save corrompido no armazenamento não quebra o carregamento', () => {
  const storage = memoryStorage();
  storage.setItem(SAVE_KEY, '{"saveVersion":1,"game":"dungeon-cooked","slots":{"historia":{"mode":"historia"}}}');
  const loaded = createSaveStore(storage).load();
  assert.equal(loaded.ok, false);
  assert.equal(loaded.corrupt, true);
  assert.equal(loaded.value.slots.historia, null);
});
