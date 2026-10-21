// Seletor de ingrediente da despensa. Não pausa o jogo: é uma escolha rápida.
import { $, el, clear } from './dom.js';
import { ingredientIcon } from './icons.js';
import { INGREDIENTS, SHELVES } from '../data/ingredients.js';

export function createPicker({ onPick, onClose }) {
  const node = $('picker');
  let current = null;

  function close() {
    if (!current) return;
    current = null;
    node.hidden = true;
    clear(node);
    onClose?.();
  }

  return {
    get open() {
      return Boolean(current);
    },
    get station() {
      return current ? current.station : null;
    },
    show({ station, shelf, options, suggested }) {
      current = { station, shelf, options };
      clear(node);
      node.append(el('h3', { text: SHELVES[shelf].name }));
      const grid = el('div', { class: 'picker-grid' });
      SHELVES[shelf].items.forEach((id, i) => {
        const info = INGREDIENTS[id];
        const available = options.includes(id);
        const b = el('button', {
          type: 'button',
          class: `picker-item${id === suggested ? ' suggested' : ''}`,
          disabled: !available,
          'aria-label': `${info.name}${available ? '' : ' (bloqueado)'}${id === suggested ? ' — sugerido para um pedido' : ''}`,
        }, [
          el('img', { src: ingredientIcon(id, false, 64), alt: '' }),
          info.short,
          el('small', { text: available ? (info.prep === 'chop' ? 'cortar' : 'direto') : `Noite ${info.unlockNight}` }),
          el('kbd', { text: String(i + 1) }),
        ]);
        b.addEventListener('click', () => {
          const pick = id;
          close();
          onPick(pick);
        });
        grid.append(b);
      });
      const closeBtn = el('button', { type: 'button', class: 'picker-close', 'aria-label': 'Fechar seletor', text: '✕' });
      closeBtn.addEventListener('click', close);
      node.append(closeBtn, grid);
      node.hidden = false;
    },
    // Teclas 1–4 escolhem pela posição na prateleira.
    pickIndex(i) {
      if (!current) return false;
      const id = SHELVES[current.shelf].items[i];
      if (!id || !current.options.includes(id)) return false;
      close();
      onPick(id);
      return true;
    },
    pickSuggested() {
      if (!current) return false;
      const btn = node.querySelector('.picker-item.suggested:not(:disabled)') || node.querySelector('.picker-item:not(:disabled)');
      if (btn) btn.click();
      return Boolean(btn);
    },
    close,
  };
}
