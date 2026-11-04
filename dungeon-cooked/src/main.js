// Dungeon Cooked — ponto de entrada. Liga simulação, renderer, interface, áudio,
// entrada e salvamento, e controla o fluxo: menu -> noite -> resultados -> loja.
import { $, el, setIcon } from './ui/dom.js';
import { createModalStack } from './ui/modal.js';
import { createScreens, MODE_INFO } from './ui/screens.js';
import { createHud } from './ui/hud.js';
import { createPicker } from './ui/picker.js';
import { playDialogue } from './ui/dialogue.js';
import { createRenderer } from './render/renderer.js';
import { drawEndingArt } from './render/art-ending.js';
import { SHELVES } from './data/ingredients.js';
import { nightDef, CHALLENGE, NIGHT_COUNT } from './data/nights.js';
import { ACHIEVEMENT_BY_ID } from './data/achievements.js';
import { CUSTOMER_IDS } from './data/customers.js';
import { RECIPES } from './data/recipes.js';
import { createAudio } from './systems/audio.js';
import { createInput } from './systems/input.js';
import { sanitizeSettings, applySettings, PACE } from './systems/settings.js';
import {
  createService, updateService, interact, discard, takeIngredient, setMoveTarget, seatNow, applyServiceEffects,
  serviceSummary, objectiveProgress, abortService,
} from './sim/service.js';
import { STATION_LAYOUT, stationAt, nearestStation } from './sim/world.js';
import { STATION_STATE } from './sim/kitchen.js';
import {
  newCampaign, serviceOptionsFor, commitNight, previewCampaign, endingEligibility, recordRetry, revisitFinalNight,
  buyItem, recordChallenge, challengeRank, averageTrust,
} from './sim/campaign.js';
import { createSaveStore, emptySaveFile, exportSave, parseImport, validateSaveFile } from './sim/save.js';
import {
  encodeSaveCode, decodeSaveCode, extractSaveCode, continueLink, LINK_PARAM, PUBLIC_URL,
} from './sim/save-link.js';
import { pointInRect } from './core/util.js';

// ---------- Armazenamento e ajustes ----------
function safeLocalStorage() {
  try {
    const s = window.localStorage;
    const k = '__dungeonCooked_test';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

const env = { prefersReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches };
const store = createSaveStore(safeLocalStorage());
const loaded = store.load();
let saveFile = loaded.value;
let settings = sanitizeSettings(store.readSettings(), env);
if (loaded.corrupt) store.backup();

// ---------- Módulos ----------
const audio = createAudio();
const modal = createModalStack();
const screens = createScreens(modal);
const hud = createHud();
const renderer = createRenderer($('canvas'));
const picker = createPicker({
  onPick: (id) => {
    if (app.svc && app.phase === 'service') takeIngredient(app.svc, id);
    app.svc && (app.svc.pickerHighlight = null);
  },
  onClose: () => {
    if (app.svc) app.svc.pickerHighlight = null;
  },
});

const app = {
  phase: 'boot', // boot | menu | briefing | service | outro | results | shop | ending | challengeEnd
  mode: null,
  campaign: null,
  svc: null,
  menuScene: null,
  paused: false,
  pauseEntry: null,
  chosenEnding: null,
  introSeen: new Set(),
  errorShown: false,
  menuT: 0,
};

// ---------- Utilidades ----------
function persist() {
  const res = store.save(saveFile);
  if (!res.ok) return res.error || 'Este navegador não permite salvar agora.';
  return null;
}

// Pede ao navegador para não apagar o save sozinho quando faltar espaço (ou, no
// Safari, após dias sem visita). Sem garantia: limpar os dados ainda apaga tudo.
let storageProtectionAsked = false;
function protectStorage() {
  if (storageProtectionAsked || !store.available) return;
  storageProtectionAsked = true;
  try {
    const s = navigator.storage;
    if (!s || !s.persist || !s.persisted) return;
    s.persisted().then((already) => (already ? true : s.persist())).catch(() => {});
  } catch {
    // navegador sem a API: segue normalmente
  }
}

function updateSettings(key, value) {
  settings = { ...settings, [key]: value };
  applySettings(settings);
  audio.setVolumes({ music: settings.musicVolume, sfx: settings.sfxVolume, mute: settings.mute });
  hud.setSoundIcon(settings.mute);
  if (key === 'highContrast') renderer.invalidate();
  updateTouchControls();
  store.writeSettings(settings);
}

function updateTouchControls() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const used = $('app').classList.contains('touch-used');
  const show = settings.touchControls === 'sempre' || (settings.touchControls === 'auto' && (coarse || used));
  $('joystick').hidden = !show;
  $('app').classList.toggle('touch', show);
}

function setScreen(name) {
  app.phase = name;
  $('app').dataset.screen = name === 'menu' || name === 'boot' ? name : 'game';
}

function gesture() {
  if (audio.unlock()) audio.setVolumes({ music: settings.musicVolume, sfx: settings.sfxVolume, mute: settings.mute });
}

function storyCtx() {
  const c = app.campaign;
  const svc = app.svc;
  return {
    flags: [...(c ? c.flags : []), ...(svc ? svc.flags : [])],
    clues: [...(c ? c.clues : []), ...(svc ? svc.clues : [])],
    bonds: c ? c.bonds : {},
    stats: svc ? svc.stats : {},
  };
}

function unlockAchievement(id) {
  const a = ACHIEVEMENT_BY_ID[id];
  if (!a || saveFile.meta.achievements.includes(id)) return null;
  saveFile.meta.achievements.push(id);
  persist();
  hud.toast(`Conquista: ${a.name}!`, 'good', 3.2);
  audio.play('achievement');
  return a;
}

function slotSummary() {
  return { historia: saveFile.slots.historia, tranquilo: saveFile.slots.tranquilo };
}

// ---------- Cena do menu (cozinha animada ao fundo) ----------
function createMenuScene() {
  const scene = createService({ mode: 'desafio', def: CHALLENGE, seed: 42 });
  scene.arrivalTimer = 1e12;
  seatNow(scene, 'brutus', { recipe: 'stew', noExpire: true }, 0);
  seatNow(scene, 'liria', { recipe: 'salad', noExpire: true }, 1);
  seatNow(scene, 'drogon', { recipe: 'soup', noExpire: true }, 2);
  for (const c of scene.customers) c.bubbleTime = 0;
  const pot = scene.cook.cauldron;
  pot.state = STATION_STATE.PROCESSING;
  pot.recipeId = 'soup';
  pot.remaining = 1e9;
  pot.total = 1e9;
  scene.events.length = 0;
  return scene;
}

function animateMenuScene(scene, dt) {
  app.menuT += dt;
  const t = app.menuT;
  const p = scene.player;
  const nx = 484 + Math.sin(t * 0.45) * 170;
  const ny = 488 + Math.sin(t * 0.9) * 34;
  p.face = nx >= p.x ? 1 : -1;
  p.moving = Math.abs(nx - p.x) > 0.05;
  p.walkCycle += dt * 9;
  p.x = nx;
  p.y = ny;
}

// ---------- Menu ----------
function goMenu() {
  modal.closeAll();
  picker.close();
  input.releaseAll();
  hud.clearToasts();
  app.paused = false;
  app.campaign = null;
  app.mode = null;
  if (!app.menuScene) app.menuScene = createMenuScene();
  app.svc = app.menuScene;
  setScreen('menu');
  audio.music('menu');
  const slots = slotSummary();
  const candidates = ['historia', 'tranquilo'].map((m) => slots[m]).filter((c) => c && !c.completed);
  candidates.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const last = candidates[0] || null;
  screens.menu({
    slots,
    continueInfo: last ? `${MODE_INFO[last.mode].name} · Noite ${last.night} · ${nightDef(last.night).title}` : null,
    best: saveFile.meta.challengeBest,
    storageOk: store.available,
    onContinue: () => startCampaign(last.mode, false),
    onHistoria: () => openSlot('historia'),
    onTranquilo: () => openSlot('tranquilo'),
    onDesafio: openChallengeIntro,
    onBook: () => openBook(),
    onHowTo: () => screens.howto(),
    onOptions: openOptions,
    onCredits: () => screens.credits(),
  });
}

function openSlot(mode) {
  const campaign = saveFile.slots[mode];
  const entry = screens.slot({
    mode,
    campaign,
    onContinue: () => {
      modal.close(entry);
      startCampaign(mode, false);
    },
    onRevisit: () => {
      screens.confirm({
        title: 'Revisitar a Noite 7?',
        text: 'O save deste modo volta ao início da última noite para você escolher outro final. Os finais já vistos continuam registrados nas conquistas.',
        confirmLabel: 'Revisitar',
        onConfirm: () => {
          const restored = revisitFinalNight(saveFile.slots[mode]);
          if (!restored) return;
          saveFile.slots[mode] = restored;
          persist();
          modal.close(entry);
          startCampaign(mode, false);
        },
      });
    },
    onNew: () => {
      const start = () => {
        if (saveFile.slots[mode]) store.backup();
        saveFile.slots[mode] = newCampaign(mode);
        const err = persist();
        modal.close(entry);
        if (err) hud.toast(err, 'warn', 4);
        startCampaign(mode, true);
      };
      if (campaign) {
        screens.confirm({
          title: 'Começar do zero?',
          text: `Isso apaga o progresso do modo ${MODE_INFO[mode].name} (uma cópia de segurança fica guardada no navegador).`,
          confirmLabel: 'Apagar e começar',
          danger: true,
          onConfirm: start,
        });
      } else start();
    },
    onBack: () => modal.close(entry),
  });
}

// ---------- Campanha ----------
function startCampaign(mode) {
  modal.closeAll();
  app.mode = mode;
  app.campaign = saveFile.slots[mode];
  if (!app.campaign) {
    app.campaign = newCampaign(mode);
    saveFile.slots[mode] = app.campaign;
    persist();
  }
  if (app.campaign.completed) {
    goMenu();
    return;
  }
  beginNight();
}

function beginNight() {
  modal.closeAll();
  picker.close();
  hud.clearToasts();
  hud.reset();
  const c = app.campaign;
  const pace = c.mode === 'historia' ? PACE[settings.pace].mult : 1;
  const opts = serviceOptionsFor(c, pace);
  app.svc = createService({ ...opts, seed: (Date.now() ^ (c.night * 7919)) >>> 0 });
  app.chosenEnding = null;
  app.paused = false;
  const def = opts.def;
  hud.setHeader({ modeLabel: MODE_INFO[c.mode].name.toUpperCase(), title: `Noite ${def.night} · ${def.title}` });
  setScreen('briefing');
  audio.music(c.mode === 'tranquilo' ? 'calm' : 'menu');
  const key = `${c.mode}:${def.night}`;
  const showBriefing = () => {
    const entry = screens.briefing({
      def,
      mode: c.mode,
      paceLabel: PACE[settings.pace].label,
      onStart: () => {
        modal.close(entry);
        startService();
      },
      onBook: () => openBook(),
      onMenu: goMenu,
    });
  };
  if (app.introSeen.has(key)) showBriefing();
  else {
    app.introSeen.add(key);
    playDialogue(modal, def.intro, {
      ctx: storyCtx(),
      settings,
      audio,
      onEffects: (e) => applyServiceEffects(app.svc, e),
      onDone: showBriefing,
    });
  }
}

function startService() {
  setScreen('service');
  app.paused = false;
  audio.music(app.mode === 'tranquilo' ? 'calm' : 'service');
  if (app.svc.tutorial && !app.svc.tutorialDone) hud.toast('Siga a seta verde: ela mostra o próximo passo do pedido.', 'info', 4);
  $('canvas').focus?.();
}

function failReason(svc, objective) {
  if (svc.def.objective.type === 'resolveConflict' && svc.stats.crises > 0) return 'houve uma crise no salão';
  return `progresso ${objective.value}/${objective.target}`;
}

function onServiceEnd() {
  const svc = app.svc;
  app.phase = 'outro';
  input.releaseAll();
  picker.close();
  if (svc.mode === 'desafio') {
    endChallenge();
    return;
  }
  if (svc.endReason === 'abort') return;
  const objective = objectiveProgress(svc);
  if (!objective.done) {
    showResults({ success: false, failReason: failReason(svc, objective) });
    return;
  }
  audio.music(app.mode === 'tranquilo' ? 'calm' : 'menu');
  playDialogue(modal, svc.def.outro, {
    ctx: storyCtx(),
    settings,
    audio,
    onEffects: (e) => applyServiceEffects(svc, e),
    onEnding: (done) => {
      const eligibility = endingEligibility(previewCampaign(app.campaign, serviceSummary(svc)));
      const entry = screens.endingChoice({
        eligibility,
        onChoose: (id) => {
          app.chosenEnding = id;
          modal.close(entry);
          done();
        },
      });
    },
    onDone: finalizeNight,
  });
}

function finalizeNight() {
  const svc = app.svc;
  const summary = serviceSummary(svc);
  const before = app.campaign;
  const result = commitNight(before, summary, { ending: app.chosenEnding });
  if (!result.ok) {
    showResults({ success: false, failReason: 'não foi possível registrar a noite (tente de novo)' });
    return;
  }
  app.campaign = result.campaign;
  saveFile.slots[app.mode] = app.campaign;
  saveFile.meta.conflictsTotal += summary.stats.conflictsResolved;
  if (result.report.isFinal && !saveFile.meta.endingsSeen.includes(app.chosenEnding)) saveFile.meta.endingsSeen.push(app.chosenEnding);
  const saveError = persist();
  if (!saveError) protectStorage();
  const got = [];
  const tryUnlock = (id, cond) => {
    if (!cond) return;
    const a = unlockAchievement(id);
    if (a) got.push(a);
  };
  tryUnlock('no_charcoal', summary.stats.burntCreated === 0 && summary.stats.served > 0);
  tryUnlock('cookbook', app.campaign.cooked.length >= RECIPES.length);
  tryUnlock('friends', CUSTOMER_IDS.every((id) => (app.campaign.trust[id] ?? 0) >= 3));
  tryUnlock('diplomat', saveFile.meta.conflictsTotal >= 3);
  tryUnlock('all_endings', saveFile.meta.endingsSeen.length >= 3);
  showResults({ success: true, summary, earned: result.report.earned, isFinal: result.report.isFinal, achievements: got, saveError });
}

function showResults(o) {
  const svc = app.svc;
  setScreen('results');
  audio.music(o.success ? 'shop' : 'calm');
  const summary = o.summary || serviceSummary(svc);
  const entry = screens.results({
    success: o.success,
    failReason: o.failReason,
    summary,
    def: svc.def,
    earned: o.earned || 0,
    coinsAfter: app.campaign.coins,
    trustAfter: app.campaign.trust,
    isFinal: o.isFinal,
    achievements: o.achievements || [],
    saveError: o.saveError,
    onBackup: openContinueLink,
    onNext: () => {
      modal.close(entry);
      if (o.isFinal) showEnding();
      else openShop();
    },
    onRetry: () => {
      modal.close(entry);
      app.campaign = recordRetry(app.campaign);
      saveFile.slots[app.mode] = app.campaign;
      persist();
      beginNight();
    },
    onMenu: goMenu,
  });
}

function openShop() {
  setScreen('shop');
  audio.music('shop');
  const entry = screens.shop({
    getCampaign: () => app.campaign,
    onBuy: (item, rerender) => {
      screens.confirm({
        title: `Comprar ${item.name}?`,
        text: `${item.effect}. Custa ${item.cost} moedas (você tem ${app.campaign.coins}).`,
        confirmLabel: 'Comprar',
        onConfirm: () => {
          const res = buyItem(app.campaign, item.id);
          if (!res.ok) {
            hud.toast(res.text, 'warn');
            return;
          }
          app.campaign = res.campaign;
          saveFile.slots[app.mode] = app.campaign;
          const err = persist();
          audio.play('buy');
          if (item.group === 'decor') renderer.invalidate();
          if (err) hud.toast(err, 'warn', 4);
          rerender();
        },
      });
    },
    nextLabel: `Ir para a Noite ${app.campaign.night}`,
    onDone: () => {
      modal.close(entry);
      beginNight();
    },
  });
}

function showEnding() {
  setScreen('ending');
  audio.music('ending');
  const c = app.campaign;
  const canvas = el('canvas', { class: 'ending-art', width: 840, height: 472, role: 'img', 'aria-label': `Ilustração do final ${c.ending}` });
  try {
    drawEndingArt(canvas.getContext('2d'), 840, 472, c.ending, 0.5);
  } catch (error) {
    console.error(error);
  }
  screens.ending({
    ending: c.ending,
    campaign: c,
    art: canvas,
    endingsSeen: saveFile.meta.endingsSeen,
    onCredits: () => screens.credits({ onClose: goMenu }),
    onRevisit: () => {
      const restored = revisitFinalNight(c);
      if (!restored) return;
      saveFile.slots[app.mode] = restored;
      persist();
      startCampaign(app.mode, false);
    },
    onMenu: goMenu,
  });
}

// ---------- Desafio ----------
function openChallengeIntro() {
  const entry = screens.challengeIntro({
    best: saveFile.meta.challengeBest,
    bestServed: saveFile.meta.challengeBestServed,
    onStart: () => {
      modal.close(entry);
      startChallenge();
    },
    onBack: () => modal.close(entry),
  });
}

function startChallenge() {
  modal.closeAll();
  hud.reset();
  hud.clearToasts();
  app.mode = 'desafio';
  app.campaign = null;
  app.svc = createService({ mode: 'desafio', def: CHALLENGE, seed: Date.now() >>> 0 });
  hud.setHeader({ modeLabel: 'DESAFIO', title: '3 minutos de caos' });
  setScreen('service');
  app.paused = false;
  audio.music('service');
  hud.toast('Valendo! O cardápio cresce com o tempo.', 'info', 3);
}

function endChallenge() {
  const svc = app.svc;
  const score = svc.stats.coins;
  const { meta, record } = recordChallenge(saveFile.meta, score, svc.stats.served);
  meta.conflictsTotal += svc.stats.conflictsResolved;
  saveFile.meta = meta;
  persist();
  if (score >= 1500) unlockAchievement('challenge_1500');
  if (meta.conflictsTotal >= 3) unlockAchievement('diplomat');
  setScreen('challengeEnd');
  audio.music('shop');
  if (record) audio.play('achievement');
  const entry = screens.challengeEnd({
    score,
    best: saveFile.meta.challengeBest,
    record,
    stats: svc.stats,
    rank: challengeRank(score),
    onRetry: () => {
      modal.close(entry);
      startChallenge();
    },
    onMenu: goMenu,
  });
}

// ---------- Pausa, livro, opções ----------
function pause() {
  if (app.phase !== 'service' || app.paused || !app.svc || app.svc.ended) return;
  app.paused = true;
  input.releaseAll();
  picker.close();
  audio.play('ui');
  app.pauseEntry = screens.pause({
    saveNote: app.mode === 'desafio' ? 'Sair agora encerra o turno sem registrar recorde.' : 'O progresso é salvo ao fim de cada noite. Sair agora recomeça esta noite do início.',
    abandonLabel: app.mode === 'desafio' ? 'Abandonar o turno' : 'Abandonar a noite',
    onResume: resume,
    onBook: () => openBook(),
    onHowTo: () => screens.howto(),
    onOptions: openOptions,
    onAbandon: () => {
      screens.confirm({
        title: 'Abandonar?',
        text: app.mode === 'desafio' ? 'O turno termina sem pontuação registrada.' : 'Nada desta noite será salvo. Você volta ao menu e a noite recomeça depois.',
        confirmLabel: 'Abandonar',
        danger: true,
        onConfirm: () => {
          abortService(app.svc);
          app.svc.events.length = 0;
          goMenu();
        },
      });
    },
  });
}

function resume() {
  if (app.pauseEntry) modal.close(app.pauseEntry);
  app.pauseEntry = null;
  app.paused = false;
  input.releaseAll();
}

function openBook(tab) {
  const svc = app.svc && app.phase !== 'menu' ? app.svc : null;
  const anyCampaign = app.campaign || saveFile.slots.historia || saveFile.slots.tranquilo;
  screens.book({
    tab,
    campaign: anyCampaign,
    prefsKnown: svc ? svc.prefsKnown : null,
    metNow: svc ? svc.orders.map((o) => o.npc) : [],
    meta: saveFile.meta,
  });
}

function openOptions() {
  screens.options({
    settings,
    audioOk: audio.available,
    storageOk: store.available,
    onChange: updateSettings,
    onLink: openContinueLink,
    onExport: () => {
      const json = exportSave(saveFile);
      screens.exportData({
        json,
        canDownload: !window.__DC_ARTIFACT,
        onDownload: () => {
          try {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = el('a', { href: url, download: `dungeon-cooked-save-${new Date().toISOString().slice(0, 10)}.json` });
            document.body.append(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
          } catch {
            screens.notice({ title: 'Não deu para baixar', text: 'O navegador bloqueou o download. Use Copiar texto.' });
          }
        },
      });
    },
    onImport: () => {
      screens.importData({
        onFile: (file) => {
          const reader = new FileReader();
          reader.onload = () => importSaveText(String(reader.result || ''));
          reader.onerror = () => screens.notice({ title: 'Erro de leitura', text: 'Não foi possível ler o arquivo.' });
          reader.readAsText(file);
        },
        onText: importSaveText,
      });
    },
    onReset: () => {
      screens.confirm({
        title: 'Apagar todo o progresso?',
        text: 'Campanhas, recordes e conquistas deste navegador serão apagados. Uma cópia de segurança fica guardada. Ajustes são mantidos.',
        confirmLabel: 'Apagar tudo',
        danger: true,
        onConfirm: () => {
          store.backup();
          saveFile = emptySaveFile();
          persist();
          app.introSeen.clear();
          goMenu();
        },
      });
    },
  });
}

// Texto colado em Importar: aceita o link de continuar ou o JSON exportado.
function importSaveText(text) {
  const code = extractSaveCode(text);
  if (code) openSaveCode(code);
  else offerSave(parseImport(text), 'import');
}

function openSaveCode(code) {
  decodeSaveCode(code).then(
    (res) => offerSave(res, 'link'),
    () => offerSave({ ok: false, error: 'link ilegível' }, 'link'),
  );
}

function hasProgress(file) {
  const m = file.meta;
  return Boolean(file.slots.historia || file.slots.tranquilo || m.challengeRuns > 0 || m.achievements.length || m.endingsSeen.length);
}

function sameProgress(incoming) {
  const current = validateSaveFile(JSON.parse(JSON.stringify(saveFile)));
  const key = (f) => JSON.stringify({ slots: f.slots, meta: f.meta });
  return current.ok && key(current.value) === key(incoming);
}

function offerSave(parsed, source) {
  const fromLink = source === 'link';
  if (!parsed.ok) {
    screens.notice({
      title: fromLink ? 'O link não abriu' : 'Save recusado',
      text: `${fromLink ? 'Esse link de continuar não pôde ser lido' : 'Esse texto não é um save válido'} (${parsed.error}). Seu progresso atual não foi alterado.`,
    });
    return;
  }
  if (sameProgress(parsed.value)) {
    hud.toast('Este navegador já tem exatamente esse progresso.', 'good');
    return;
  }
  const replaces = hasProgress(saveFile);
  screens.loadSave({
    source,
    incoming: parsed.value,
    current: saveFile,
    replaces,
    onConfirm: () => {
      if (replaces) store.backup();
      saveFile = parsed.value;
      const err = persist();
      goMenu();
      if (err) {
        screens.notice({ title: 'Carregado só nesta sessão', text: `${err} Guarde o link de continuar de novo antes de fechar.` });
        return;
      }
      protectStorage();
      hud.toast(fromLink ? 'Progresso do link carregado.' : 'Save importado.', 'good');
    },
  });
}

// Fora de http(s) (arquivo offline) ou dentro de outra página, o link aponta para a versão online.
function linkBase() {
  const { protocol, origin, pathname, search } = window.location;
  if (window.__DC_ARTIFACT || (protocol !== 'http:' && protocol !== 'https:')) return PUBLIC_URL;
  return origin + pathname + search;
}

async function openContinueLink() {
  let code;
  try {
    code = await encodeSaveCode(saveFile);
  } catch {
    screens.notice({ title: 'Não deu para criar o link', text: 'Use Opções → Exportar save para guardar uma cópia do progresso.' });
    return;
  }
  const base = linkBase();
  screens.continueLink({ link: continueLink(code, base), online: base === PUBLIC_URL && !window.location.href.startsWith(PUBLIC_URL) });
}

// Abrir o jogo por um link de continuar (#continuar=...) oferece carregar aquele progresso.
function takeLinkFromUrl() {
  const hash = window.location.hash || '';
  if (!hash.includes(`${LINK_PARAM}=`)) return;
  const code = extractSaveCode(hash);
  // Tira o código da barra de endereço para recarregar a página não perguntar de novo.
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    window.location.hash = '';
  }
  if (!code) {
    offerSave({ ok: false, error: 'link incompleto' }, 'link');
    return;
  }
  openSaveCode(code);
}

// ---------- Ações do jogador ----------
function doInteract() {
  if (app.phase !== 'service' || app.paused || modal.depth || !app.svc || app.svc.ended) return;
  if (picker.open) {
    picker.pickSuggested();
    return;
  }
  interact(app.svc);
}

function doDiscard() {
  if (app.phase !== 'service' || app.paused || modal.depth || !app.svc || app.svc.ended) return;
  if (picker.open) {
    picker.close();
    return;
  }
  discard(app.svc);
}

function pantryIngredientAt(stationId, wx, wy) {
  const r = STATION_LAYOUT[stationId].rect;
  const items = SHELVES[STATION_LAYOUT[stationId].shelf].items;
  for (let i = 0; i < items.length; i++) {
    const cx = r.x + 30 + (i % 2) * 50;
    const cy = r.y + 18 + Math.floor(i / 2) * 26;
    if (pointInRect(wx, wy, { x: cx - 18, y: cy - 13, w: 36, h: 26 })) return items[i];
  }
  return null;
}

function onPointerWorld(clientX, clientY) {
  updateTouchControls();
  if (app.phase !== 'service' || app.paused || modal.depth || !app.svc || app.svc.ended) return;
  const w = renderer.toWorld(clientX, clientY);
  if (!w) return;
  picker.close();
  const station = stationAt(w.x, w.y);
  if (station && STATION_LAYOUT[station].kind === 'pantry') {
    const ing = pantryIngredientAt(station, w.x, w.y);
    const ok = ing && app.svc.ingredients.includes(ing) && app.svc.stationsAvailable.has(station);
    setMoveTarget(app.svc, w.x, w.y, station, ok ? { ingredient: ing } : null);
    return;
  }
  if (station) setMoveTarget(app.svc, w.x, w.y, station);
  else setMoveTarget(app.svc, w.x, w.y);
}

function toggleMute() {
  updateSettings('mute', !settings.mute);
}

const input = createInput({
  onUserGesture: gesture,
  onPointerWorld,
  isGameKeyTarget: (e) => modal.depth === 0 && app.phase === 'service' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement),
  onAction: (action, { event }) => {
    if (modal.depth > 0) {
      if (action === 'escape') return modal.escape();
      if (action === 'mute' && !(event.target instanceof HTMLInputElement)) {
        toggleMute();
        return true;
      }
      return false;
    }
    if (app.phase !== 'service') return false;
    switch (action) {
      case 'interact':
      case 'confirm':
        if (event.repeat) return true;
        doInteract();
        return true;
      case 'discard':
        doDiscard();
        return true;
      case 'pause':
      case 'escape':
        if (picker.open) picker.close();
        else pause();
        return true;
      case 'book':
        if (!app.paused) {
          app.paused = true;
          input.releaseAll();
          screens.book({ campaign: app.campaign, prefsKnown: app.svc.prefsKnown, metNow: app.svc.orders.map((o) => o.npc), meta: saveFile.meta, onClose: () => { app.paused = false; } });
        }
        return true;
      case 'mute':
        toggleMute();
        return true;
      case 'help':
        pause();
        screens.howto();
        return true;
      case 'pick1': case 'pick2': case 'pick3': case 'pick4':
        return picker.pickIndex(Number(action.slice(4)) - 1);
      default:
        return false;
    }
  },
});

// ---------- Botões fixos ----------
function wireButton(id, fn) {
  const b = $(id);
  b.addEventListener('click', (e) => {
    gesture();
    fn(e);
  });
  b.addEventListener('pointerup', () => setTimeout(() => b.blur(), 0));
}
setIcon($('btn-pause'), 'pause');
setIcon($('btn-book'), 'book');
hud.setSoundIcon(settings.mute);
wireButton('btn-act', doInteract);
wireButton('btn-discard', doDiscard);
wireButton('btn-pause', () => (app.paused ? resume() : pause()));
wireButton('btn-sound', toggleMute);
wireButton('btn-book', () => {
  if (app.phase === 'service' && !app.paused) {
    app.paused = true;
    input.releaseAll();
    screens.book({ campaign: app.campaign, prefsKnown: app.svc.prefsKnown, metNow: app.svc.orders.map((o) => o.npc), meta: saveFile.meta, onClose: () => { app.paused = false; } });
  } else openBook();
});

// Pausa automática ao perder foco ou trocar de aba.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    audio.suspend();
  } else audio.resume();
});
window.addEventListener('blur', () => pause());
window.addEventListener('pointerdown', gesture, { capture: true });

// ---------- Loop principal ----------
let last = performance.now();
function processEvents(svc) {
  const events = svc.events.splice(0, svc.events.length);
  for (const ev of events) {
    switch (ev.type) {
      case 'toast': hud.toast(ev.text, ev.tone, ev.seconds); break;
      case 'sfx': audio.play(ev.id); break;
      case 'picker':
        svc.pickerHighlight = ev.suggested;
        picker.show(ev);
        break;
      case 'achievement': unlockAchievement(ev.id); break;
      case 'tutorialDone': hud.toast('Primeiro pedido entregue! Agora a casa enche. Bom serviço, chef.', 'good', 4); break;
      default: renderer.handleEvent(ev, svc, settings);
    }
  }
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  try {
    const svc = app.svc;
    if (svc) {
      const inService = app.phase === 'service';
      const simulating = inService && !app.paused && modal.depth === 0 && !document.hidden;
      if (simulating && !svc.ended) updateService(svc, dt, input.getMove());
      if (app.phase === 'menu') animateMenuScene(svc, dt);
      if (inService || app.phase === 'menu') processEvents(svc);
      if (inService && picker.open && nearestStation(svc.player.x, svc.player.y) !== picker.station) picker.close();
      if (inService && modal.depth === 0 && !app.paused) {
        if (svc.story.length) {
          const id = svc.story.shift();
          input.releaseAll();
          picker.close();
          playDialogue(modal, id, { ctx: storyCtx(), settings, audio, onEffects: (e) => applyServiceEffects(svc, e) });
        } else if (svc.ended) onServiceEnd();
      }
      let ctxInfo = null;
      if (inService || app.phase === 'briefing') {
        const coins = app.campaign ? app.campaign.coins + svc.stats.coins : svc.stats.coins;
        ctxInfo = hud.update(svc, { coins }, settings);
      }
      renderer.render(svc, {
        dt,
        paused: app.phase !== 'menu' && !simulating,
        settings: { ...settings, touch: $('app').classList.contains('touch') },
        ctxInfo,
        guide: inService && (settings.hints || (svc.tutorial && !svc.tutorialDone)) ? svc.guide : null,
        decor: app.campaign ? app.campaign.decor : [],
        hideUi: !inService,
      });
    }
  } catch (error) {
    console.error('[Dungeon Cooked] erro no quadro:', error);
    if (!app.errorShown) {
      app.errorShown = true;
      hud.toast('Algo deu errado num quadro, mas o jogo continua. Se persistir, pause e volte ao menu.', 'bad', 5);
    }
  }
  requestAnimationFrame(frame);
}

// ---------- Início ----------
applySettings(settings);
audio.setVolumes({ music: settings.musicVolume, sfx: settings.sfxVolume, mute: settings.mute });
updateTouchControls();
goMenu();
if (loaded.corrupt) {
  screens.notice({ title: 'Save inválido ignorado', text: `O progresso salvo neste navegador não pôde ser lido (${loaded.error}). Uma cópia foi guardada e o jogo começa limpo.` });
}
takeLinkFromUrl();
window.addEventListener('hashchange', takeLinkFromUrl);
requestAnimationFrame(frame);

// Ganchos para testes automatizados no navegador (não alteram o jogo).
window.__dungeonCooked = {
  get app() { return app; },
  get svc() { return app.svc; },
  get view() { return renderer.view; },
  layout: STATION_LAYOUT,
  nightCount: NIGHT_COUNT,
  averageTrust: () => (app.campaign ? averageTrust(app.campaign) : null),
};
