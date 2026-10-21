// HUD em DOM: estatísticas, objetivo, pedidos, itens na mão, contexto e avisos.
// Só reescreve o DOM quando algo muda, para não forçar reflow a cada quadro.
import { $, el, clear, setText, setIcon } from './dom.js';
import { ingredientIcon, dishIcon, tagIcon, portraitIcon } from './icons.js';
import { RECIPE_BY_ID, COOK_STATIONS, prefName, dishName } from '../data/recipes.js';
import { INGREDIENTS } from '../data/ingredients.js';
import { CUSTOMERS } from '../data/customers.js';
import { ORDER_STATUS, orderLabel, satisfyingRecipes } from '../sim/orders.js';
import { tensionBand, conflictFor } from '../sim/chaos.js';
import { objectiveProgress, describeContext, knownPrefs } from '../sim/service.js';
import { ingredientReady } from '../sim/kitchen.js';
import { formatClock } from '../core/util.js';

const SEAT_NAMES = ['◀ esquerda', '● centro', 'direita ▶'];

export function createHud() {
  const nodes = {
    mode: $('hud-mode'),
    night: $('hud-night'),
    clockLabel: $('clock-label'),
    clock: $('hud-clock'),
    coins: $('hud-coins'),
    coinsLabel: $('coins-label'),
    tension: $('stat-tension'),
    tensionName: $('tension-name'),
    tensionText: $('hud-tension'),
    tensionBar: $('tension-bar'),
    tensionIcon: $('tension-icon'),
    objective: $('objective'),
    objText: $('objective-text'),
    objProgress: $('objective-progress'),
    objCheck: $('objective-check'),
    tickets: $('tickets'),
    carry: $('carry'),
    ctxMain: $('context-main'),
    ctxSub: $('context-sub'),
    act: $('btn-act'),
    discard: $('btn-discard'),
    toasts: $('toasts'),
    hint: $('hint'),
    announcer: $('announcer'),
  };
  const ticketSig = ['', '', ''];
  const ticketParts = [null, null, null];
  let carrySig = '';
  let actSig = '';
  let lastAnnounce = '';

  for (let i = 0; i < 3; i++) nodes.tickets.append(el('article', { class: 'ticket empty' }));

  function setHeader({ modeLabel, title }) {
    setText(nodes.mode, modeLabel);
    setText(nodes.night, title);
  }

  function updateStats(svc, info) {
    if (svc.mode === 'desafio') {
      setText(nodes.clockLabel, 'Tempo');
      setText(nodes.clock, formatClock(svc.rules.timeLimit - svc.time));
    } else {
      setText(nodes.clockLabel, 'Clientes');
      const done = svc.orders.filter((o) => o.status === ORDER_STATUS.FULFILLED || o.status === ORDER_STATUS.EXPIRED).length;
      setText(nodes.clock, `${done}/${svc.guestTotal}`);
    }
    setText(nodes.coinsLabel, svc.mode === 'desafio' ? 'Pontos' : 'Moedas');
    setText(nodes.coins, String(info.coins));
    const chaos = svc.chaos;
    if (!chaos.enabled) {
      nodes.tension.classList.add('off');
      setText(nodes.tensionName, 'Tensão');
      setText(nodes.tensionText, '—');
      nodes.tensionBar.style.width = '0%';
      nodes.tension.dataset.band = 'calm';
      nodes.tension.setAttribute('aria-valuenow', '0');
      nodes.tension.setAttribute('aria-valuetext', 'Desligada nesta noite');
    } else {
      nodes.tension.classList.remove('off');
      const v = Math.round(chaos.tension);
      const band = tensionBand(v);
      setText(nodes.tensionName, band.name);
      setText(nodes.tensionText, `${v}%`);
      setText(nodes.tensionIcon, band.icon);
      const width = `${v}%`;
      if (nodes.tensionBar.style.width !== width) nodes.tensionBar.style.width = width;
      nodes.tensionBar.style.background = v >= 70 ? 'var(--bad)' : v >= 35 ? 'var(--warn)' : 'var(--mint)';
      nodes.tension.dataset.band = band.id;
      nodes.tension.setAttribute('aria-valuenow', String(v));
      nodes.tension.setAttribute('aria-valuetext', `${v}% — ${band.name}. ${band.help}`);
      nodes.tension.title = band.help;
    }
  }

  function updateObjective(svc) {
    const obj = svc.mode === 'desafio' ? null : objectiveProgress(svc);
    if (!obj) {
      setText(nodes.objText, `Pontuação: ${svc.stats.coins} · combo ${svc.stats.combo}x · recorde mantido no navegador`);
      setText(nodes.objProgress, '');
      setText(nodes.objCheck, '◎');
      nodes.objective.classList.remove('done');
      return;
    }
    setText(nodes.objText, obj.failed ? `${obj.text} (houve uma crise: tente na próxima)` : obj.text);
    setText(nodes.objProgress, obj.done ? 'Concluído' : `${obj.value}/${obj.target}`);
    setText(nodes.objCheck, obj.done ? '✓' : '◎');
    nodes.objective.classList.toggle('done', obj.done);
  }

  function prefsLine(svc, npc) {
    const known = knownPrefs(svc, npc);
    const info = CUSTOMERS[npc];
    const likes = info.likes.filter((t) => known.includes(t)).map((t) => `♥ ${prefName(t)}`);
    const dislikes = info.dislikes.filter((t) => known.includes(t)).map((t) => `✖ ${prefName(t)}`);
    const parts = [...likes, ...dislikes];
    return parts.length ? parts.join(' · ') : 'Gostos: converse (mãos vazias)';
  }

  function buildTicket(i, svc, c) {
    const node = nodes.tickets.children[i];
    node.className = 'ticket';
    clear(node);
    ticketParts[i] = null;
    const seatTag = el('span', { class: 'ticket-seat', text: SEAT_NAMES[i] });
    if (!c) {
      node.classList.add('empty');
      node.append(seatTag, el('span', { text: svc.guests.length || svc.mode === 'desafio' ? 'Lugar vago · alguém deve chegar' : 'Lugar vago' }));
      return;
    }
    const npc = CUSTOMERS[c.npc];
    const order = svc.orders.find((o) => o.id === c.orderId);
    const head = el('div', { class: 'ticket-head' }, [
      el('img', { src: portraitIcon(c.npc, c.mood === 'impatient' || c.mood === 'angry' ? c.mood : 'neutral', 64), alt: '' }),
      el('span', { class: 'ticket-who', text: npc.title }),
      seatTag,
    ]);
    node.append(head);
    if (c.state === 'ENTERING' || !order) {
      node.classList.add('empty');
      node.append(el('span', { text: `${npc.name} está chegando…` }));
      return;
    }
    const quote = el('div', { class: 'ticket-quote' });
    if (order.status === ORDER_STATUS.FULFILLED) {
      node.classList.add('served');
      node.append(el('div', { class: 'ticket-dish', text: `Servido ${'★'.repeat(c.stars)}${'☆'.repeat(5 - c.stars)}` }));
      node.append(el('div', { class: 'ticket-prefs', text: c.stars >= 4 ? 'Satisfeito(a)!' : c.stars === 3 ? 'Ok.' : 'Não gostou muito.' }), quote);
      ticketParts[i] = { quote, c };
      return;
    }
    if (order.status !== ORDER_STATUS.ACTIVE) {
      node.classList.add('empty');
      node.append(el('span', { text: `${npc.name} foi embora` }));
      return;
    }
    if (order.priority) node.classList.add('priority');
    const dishLine = order.kind === 'dish'
      ? el('div', { class: 'ticket-dish' }, [el('img', { src: dishIcon(order.recipeId), alt: '' }), RECIPE_BY_ID[order.recipeId].name])
      : el('div', { class: 'ticket-dish' }, [el('img', { src: tagIcon(order.tag), alt: '' }), orderLabel(order)]);
    node.append(dishLine);
    const need = el('div', { class: 'ticket-need' });
    if (order.kind === 'dish') {
      const recipe = RECIPE_BY_ID[order.recipeId];
      recipe.ingredients.forEach((id, k) => {
        if (k) need.append(el('span', { class: 'arrow', text: '+' }));
        need.append(el('img', { src: ingredientIcon(id), alt: INGREDIENTS[id].name, title: INGREDIENTS[id].name }));
      });
      need.append(el('span', { class: 'arrow', text: '→' }));
      need.append(el('span', { class: 'station', text: COOK_STATIONS[recipe.station].name }));
    } else {
      const options = satisfyingRecipes(order, svc.recipes);
      options.slice(0, 4).forEach((rid, k) => {
        if (k) need.append(el('span', { class: 'arrow', text: 'ou' }));
        need.append(el('img', { src: dishIcon(rid), alt: RECIPE_BY_ID[rid].name, title: RECIPE_BY_ID[rid].name }));
      });
    }
    node.append(need);
    node.append(el('div', { class: 'ticket-prefs', text: prefsLine(svc, c.npc) }), quote);
    const bar = el('b');
    const label = el('span');
    const patience = el('div', { class: 'patience' }, [el('div', { class: 'bar' }, [bar]), label]);
    node.append(patience);
    ticketParts[i] = { bar, label, patience, order, quote, c };
  }

  function updateTickets(svc) {
    for (let i = 0; i < 3; i++) {
      const c = svc.seats[i];
      const order = c ? svc.orders.find((o) => o.id === c.orderId) : null;
      const sig = c ? `${c.uid}|${c.state}|${order ? order.status : ''}|${c.mood === 'impatient' || c.mood === 'angry' ? c.mood : 'n'}|${knownPrefs(svc, c.npc).length}` : `empty|${svc.guests.length > 0}`;
      if (sig !== ticketSig[i]) {
        ticketSig[i] = sig;
        buildTicket(i, svc, c);
      }
      const parts = ticketParts[i];
      const node = nodes.tickets.children[i];
      if (!parts) {
        node.classList.remove('late', 'conflict');
        continue;
      }
      setText(parts.quote, parts.c.bubble ? `“${parts.c.bubble}”` : '');
      if (!parts.order) continue;
      const o = parts.order;
      const untimed = o.noExpire || !svc.rules.timed;
      const ratio = untimed ? 1 : Math.max(0, o.patience / o.maxPatience);
      const width = `${Math.round(ratio * 100)}%`;
      if (parts.bar.style.width !== width) parts.bar.style.width = width;
      const level = ratio > 0.5 ? 'high' : ratio > 0.25 ? 'mid' : 'low';
      parts.patience.className = `patience ${level}`;
      setText(parts.label, untimed ? 'sem pressa' : level === 'high' ? 'calmo' : level === 'mid' ? 'impaciente' : 'quase indo!');
      node.classList.toggle('late', !untimed && level === 'low');
      node.classList.toggle('conflict', Boolean(conflictFor(svc.chaos, c.npc)));
    }
  }

  function itemBadge(item) {
    if (item.type === 'dish') return item.quality === 'burnt' ? { text: '✖ queimado', cls: 'bad' } : { text: '✓ no ponto', cls: 'ok' };
    if (ingredientReady(item)) return { text: INGREDIENTS[item.id].prep === 'none' ? '✓ pronto' : '✓ picado', cls: 'ok' };
    return { text: '✂ cru', cls: 'raw' };
  }

  function itemSentence(item) {
    if (item.type === 'dish') {
      const name = dishName(RECIPE_BY_ID[item.recipeId], item.quality);
      return item.quality === 'burnt' ? `${name} (queimado: descarte ou entregue com consequência)` : `${name} → leve ao balcão`;
    }
    const info = INGREDIENTS[item.id];
    if (!ingredientReady(item)) return `${info.name} cru → tábua para ${info.prepVerb}`;
    return `${info.name} ${info.prep === 'none' ? 'pronto' : 'picado'} → estação`;
  }

  function updateCarry(svc) {
    const hands = svc.player.hands;
    const cap = svc.mods.capacity || 1;
    const sig = `${cap}|${hands.map((i) => `${i.uid}:${i.prepared}:${i.quality || ''}`).join(',')}`;
    if (sig === carrySig) return;
    carrySig = sig;
    clear(nodes.carry);
    for (let k = 0; k < cap; k++) {
      const item = hands[k];
      const slot = el('div', { class: `slot${item ? ' filled' : ''}`, title: item ? itemSentence(item) : 'Mão livre' });
      if (item) {
        const src = item.type === 'dish' ? dishIcon(item.recipeId, item.quality) : ingredientIcon(item.id, item.prepared);
        const badge = itemBadge(item);
        slot.append(el('img', { src, alt: item.type === 'dish' ? RECIPE_BY_ID[item.recipeId].name : INGREDIENTS[item.id].name }));
        slot.append(el('span', { class: `badge ${badge.cls}`, text: badge.text }));
      }
      nodes.carry.append(slot);
    }
  }

  function updateContext(svc, ctxInfo) {
    const label = ctxInfo.station ? `${ctxInfo.label} — ${ctxInfo.verb}` : ctxInfo.label;
    setText(nodes.ctxMain, label);
    const hands = svc.player.hands;
    setText(nodes.ctxSub, hands.length ? hands.map(itemSentence).join(' · ') : 'Mãos vazias');
    const sig = `${ctxInfo.verb}|${ctxInfo.enabled}|${Boolean(ctxInfo.confirm)}`;
    if (sig !== actSig) {
      actSig = sig;
      nodes.act.firstElementChild.textContent = ctxInfo.station ? ctxInfo.verb : 'Fazer';
      nodes.act.classList.toggle('confirm', Boolean(ctxInfo.confirm));
      nodes.act.classList.toggle('dim', !ctxInfo.enabled);
      nodes.act.setAttribute('aria-label', `${ctxInfo.verb}${ctxInfo.station ? ` em ${ctxInfo.label}` : ''} (E ou Espaço)`);
    }
  }

  function toast(textValue, tone = 'info', seconds = 2.6) {
    const node = el('div', { class: `toast ${tone}` });
    const icon = tone === 'good' ? '✓' : tone === 'warn' ? '⚠' : tone === 'bad' ? '✖' : '•';
    node.append(el('span', { class: 'tone', 'aria-hidden': 'true', text: icon }), textValue);
    nodes.toasts.append(node);
    while (nodes.toasts.children.length > 2) nodes.toasts.firstChild.remove();
    setTimeout(() => node.remove(), seconds * 1000);
    if ((tone === 'warn' || tone === 'bad') && textValue !== lastAnnounce) {
      lastAnnounce = textValue;
      announce(textValue);
    }
  }

  function announce(textValue) {
    nodes.announcer.textContent = '';
    setTimeout(() => { nodes.announcer.textContent = textValue; }, 30);
  }

  function clearToasts() {
    clear(nodes.toasts);
  }

  function updateHint(svc, settings) {
    const show = svc.guide && (settings.hints || (svc.tutorial && !svc.tutorialDone));
    if (!show) {
      if (!nodes.hint.hidden) nodes.hint.hidden = true;
      return;
    }
    nodes.hint.hidden = false;
    setText(nodes.hint, svc.guide.text);
  }

  return {
    setHeader,
    toast,
    announce,
    clearToasts,
    reset() {
      ticketSig.fill('');
      carrySig = '';
      actSig = '';
    },
    update(svc, info, settings) {
      const ctxInfo = describeContext(svc);
      updateStats(svc, info);
      updateObjective(svc);
      updateTickets(svc);
      updateCarry(svc);
      updateContext(svc, ctxInfo);
      updateHint(svc, settings);
      return ctxInfo;
    },
    setSoundIcon(muted) {
      setIcon($('btn-sound'), muted ? 'mute' : 'sound');
      $('btn-sound').setAttribute('aria-label', muted ? 'Ativar som (M)' : 'Silenciar (M)');
    },
  };
}
