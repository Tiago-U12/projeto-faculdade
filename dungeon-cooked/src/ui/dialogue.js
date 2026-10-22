// Caixa de diálogo com retrato, efeito de escrita opcional, pular e escolhas.
import { el, clear } from './dom.js';
import { portraitIcon, chefIcon, voiceIcon } from './icons.js';
import { CUSTOMERS } from '../data/customers.js';
import { SPEAKERS } from '../data/dialogues.js';
import { createDialogueCursor } from '../sim/story.js';

// opts: { ctx, settings, onEffects(effects), onEnding(done), onDone(), audio }
export function playDialogue(modal, id, opts) {
  const cursor = createDialogueCursor(id, opts.ctx || {});
  const box = el('div', { class: 'dialogue' });
  const portrait = el('img', { class: 'dialogue-portrait', alt: '' });
  const name = el('div', { class: 'dialogue-name' });
  const textNode = el('div', { class: 'dialogue-text' });
  const choices = el('div', { class: 'choices' });
  const foot = el('div', { class: 'dialogue-foot' });
  const skipAll = el('button', { type: 'button', class: 'btn btn-small', text: 'Pular cena' });
  const next = el('button', { type: 'button', class: 'btn btn-small btn-primary', text: 'Continuar ▸', 'data-autofocus': true });
  foot.append(el('span', { text: 'Enter, Espaço ou toque para avançar' }), el('span', {}, [skipAll, ' ', next]));
  const content = el('div', {}, [name, textNode, choices, foot]);
  box.append(portrait, content);
  let typing = null;
  let fullText = '';
  let finished = false;
  let waiting = null;
  const entry = modal.open(box, { label: 'Diálogo', className: 'dialogue-screen', name: 'dialogue', onEscape: () => advance(true) });

  function setSpeaker(step) {
    const sp = SPEAKERS[step.who];
    box.classList.toggle('narrator', step.who === 'narrador');
    box.classList.toggle('voice', step.who === 'voz');
    if (step.who === 'narrador') {
      portrait.hidden = true;
      name.textContent = '';
    } else {
      portrait.hidden = false;
      if (step.who === 'chef') portrait.src = chefIcon(step.mood === 'surprised' ? 'surprised' : step.mood || 'neutral', 96);
      else if (step.who === 'voz') portrait.src = voiceIcon(96);
      else portrait.src = portraitIcon(step.who, step.mood || 'neutral', 96);
      name.textContent = sp ? sp.name : CUSTOMERS[step.who]?.name || '';
    }
  }

  function typeText(str) {
    fullText = str;
    if (typing) clearInterval(typing);
    if (!opts.settings?.typewriter || opts.settings?.reducedMotion) {
      textNode.textContent = str;
      typing = null;
      return;
    }
    let i = 0;
    textNode.textContent = '';
    typing = setInterval(() => {
      i += 2;
      textNode.textContent = str.slice(0, i);
      if (i % 6 === 0) opts.audio?.play('blip');
      if (i >= str.length) {
        clearInterval(typing);
        typing = null;
      }
    }, 22);
  }

  function finish() {
    if (finished) return;
    finished = true;
    if (typing) clearInterval(typing);
    modal.close(entry);
    opts.onDone?.();
  }

  function render(step) {
    clear(choices);
    next.hidden = false;
    if (!step) return finish();
    if (step.type === 'line') {
      setSpeaker(step);
      typeText(step.text);
      return;
    }
    if (step.type === 'choice') {
      setSpeaker({ who: 'chef', mood: 'neutral' });
      textNode.textContent = 'O que você responde?';
      next.hidden = true;
      waiting = step;
      step.options.forEach((o, i) => {
        const b = el('button', { type: 'button', class: 'btn', 'data-autofocus': i === 0 || null }, [`${i + 1}. ${o.text}`]);
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          choose(i);
        });
        choices.append(b);
      });
      requestAnimationFrame(() => choices.querySelector('button')?.focus());
      return;
    }
    if (step.type === 'ending') {
      next.hidden = true;
      opts.onEnding?.(() => finish());
    }
  }

  function choose(i) {
    if (!waiting) return;
    waiting = null;
    const effects = cursor.choose(i);
    opts.onEffects?.(effects);
    opts.audio?.play('ui');
    render(cursor.next());
  }

  function advance(skip = false) {
    if (waiting) return;
    if (typing) {
      clearInterval(typing);
      typing = null;
      textNode.textContent = fullText;
      if (!skip) return;
    }
    if (skip) {
      // Pular cena: avança até a próxima escolha (escolhas nunca são puladas).
      let step = cursor.next();
      while (step && step.type === 'line') step = cursor.next();
      render(step);
      return;
    }
    render(cursor.next());
  }

  box.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    advance();
  });
  next.addEventListener('click', (e) => {
    e.stopPropagation();
    advance();
  });
  skipAll.addEventListener('click', (e) => {
    e.stopPropagation();
    advance(true);
  });
  box.addEventListener('keydown', (e) => {
    if (waiting && /^Digit[1-9]$/.test(e.code)) {
      const i = Number(e.code.slice(5)) - 1;
      if (i < waiting.options.length) {
        e.preventDefault();
        choose(i);
      }
    }
  });
  render(cursor.next());
  return {
    entry,
    advance,
    get waiting() {
      return Boolean(waiting);
    },
  };
}
