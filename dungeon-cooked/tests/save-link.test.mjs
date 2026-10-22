import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { playCampaignNight } from './bot.mjs';
import { newCampaign } from '../src/sim/campaign.js';
import { emptySaveFile, validateSaveFile } from '../src/sim/save.js';
import {
  encodeSaveCode, decodeSaveCode, extractSaveCode, continueLink, PUBLIC_URL,
} from '../src/sim/save-link.js';

const strategy = { choose: () => 0, conflicts: 'talk', ending: (e) => (e.segredo.eligible ? 'segredo' : 'lenda') };

function finishedCampaignFile() {
  let c = newCampaign('historia');
  while (!c.completed) {
    let res;
    let attempt = 0;
    do {
      res = playCampaignNight(c, strategy, 11 + attempt * 101 + c.night);
      attempt += 1;
    } while (!res.ok && attempt < 3);
    assert.ok(res.ok, `noite ${c.night} falhou`);
    c = res.campaign;
  }
  const file = emptySaveFile();
  file.slots.historia = c;
  file.slots.tranquilo = newCampaign('tranquilo');
  file.meta.achievements = ['first_dish', 'cookbook'];
  file.meta.endingsSeen = [c.ending];
  return validateSaveFile(JSON.parse(JSON.stringify(file))).value;
}

const fullFile = finishedCampaignFile();
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test('LK-01: link de continuar leva a campanha inteira e volta idêntica', async () => {
  const code = await encodeSaveCode(fullFile);
  assert.match(code, /^DC1z[A-Za-z0-9_-]+$/);
  // Uma campanha completa cabe com folga num link (medido: ~1.200 caracteres).
  assert.ok(code.length < 2500, `código com ${code.length} caracteres`);
  const back = await decodeSaveCode(code);
  assert.ok(back.ok, back.error);
  assert.deepEqual(back.value.slots, fullFile.slots);
  assert.deepEqual(back.value.meta, fullFile.meta);
});

test('LK-02: sem compressão no navegador, o código só fica maior e continua válido', async () => {
  const code = await encodeSaveCode(fullFile, { compress: false });
  assert.match(code, /^DC1j/);
  const back = await decodeSaveCode(code);
  assert.ok(back.ok, back.error);
  assert.deepEqual(back.value.slots, fullFile.slots);
});

test('LK-03: o código é achado no link inteiro, no trecho # e com quebras de linha', async () => {
  const code = await encodeSaveCode(fullFile);
  const link = continueLink(code);
  assert.equal(link, `${PUBLIC_URL}#continuar=${code}`);
  assert.equal(continueLink(code, 'http://localhost:5174/#velho'), `http://localhost:5174/#continuar=${code}`);
  assert.equal(extractSaveCode(link), code);
  assert.equal(extractSaveCode(`#continuar=${code}`), code);
  assert.equal(extractSaveCode(`Meu save: ${link.slice(0, 80)}\n${link.slice(80)} `), code);
  assert.equal(extractSaveCode(code), code);
  assert.equal(extractSaveCode('{"saveVersion":1}'), null);
  assert.equal(extractSaveCode('https://tiago-u12.github.io/projeto-faculdade/dungeon-cooked/'), null);
});

test('LK-04: link cortado, alterado ou com save inválido é recusado sem lançar erro', async () => {
  const code = await encodeSaveCode(fullFile);
  const cut = await decodeSaveCode(code.slice(0, Math.floor(code.length / 2)));
  assert.equal(cut.ok, false);
  const flipped = code.slice(0, 40) + (code[40] === 'A' ? 'B' : 'A') + code.slice(41);
  assert.equal((await decodeSaveCode(flipped)).ok, false);
  assert.equal((await decodeSaveCode('DC1z!!!')).ok, false);
  assert.equal((await decodeSaveCode('DC1q' + code.slice(4))).ok, false);
  assert.equal((await decodeSaveCode('XYZ')).ok, false);
  // Bem formado, mas com um save que a validação recusa (moedas negativas).
  const bad = { ...fullFile, slots: { ...fullFile.slots, historia: { ...fullFile.slots.historia, coins: -50 } } };
  const badCode = `DC1z${b64url(deflateSync(JSON.stringify(bad)))}`;
  const res = await decodeSaveCode(badCode);
  assert.equal(res.ok, false);
  assert.match(res.error, /coins/);
});

test('LK-05: link que infla para mais de 2 MB é recusado', async () => {
  const bomb = `DC1z${b64url(deflateSync(' '.repeat(3_000_000)))}`;
  assert.ok(bomb.length < 10_000);
  const res = await decodeSaveCode(bomb);
  assert.equal(res.ok, false);
  assert.match(res.error, /grande demais/);
});
