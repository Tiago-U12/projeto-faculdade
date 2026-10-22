// Pilha de janelas/telas sobre o jogo, com foco preso e Esc para fechar.
import { $, el, trapFocus } from './dom.js';

export function createModalStack() {
  const layer = $('layer');
  const stack = [];

  document.addEventListener('keydown', (e) => {
    const top = stack[stack.length - 1];
    if (!top) return;
    if (e.key === 'Tab') trapFocus(top.node, e);
  });

  function focusFirst(node) {
    const target = node.querySelector('[data-autofocus]') || node.querySelector('button:not([disabled]), [href], input, select');
    if (target) target.focus({ preventScroll: true });
  }

  return {
    // content: Node; opts: { label, dismissible, onClose, className }
    open(content, opts = {}) {
      const node = el('div', {
        class: `screen ${opts.className || ''}`,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': opts.label || 'Janela',
      }, [content]);
      const entry = { node, opts, returnFocus: document.activeElement };
      if (opts.dismissible) {
        node.addEventListener('pointerdown', (e) => {
          if (e.target === node) this.close(entry);
        });
      }
      stack.push(entry);
      layer.append(node);
      if (opts.focus !== false) requestAnimationFrame(() => focusFirst(node));
      return entry;
    },
    close(entry = stack[stack.length - 1]) {
      const i = stack.indexOf(entry);
      if (i < 0) return;
      stack.splice(i, 1);
      entry.node.remove();
      entry.opts.onClose?.();
      const back = entry.returnFocus;
      if (back && document.contains(back) && typeof back.focus === 'function') back.focus({ preventScroll: true });
    },
    closeAll() {
      while (stack.length) {
        const entry = stack.pop();
        entry.node.remove();
      }
    },
    // Esc: fecha a janela do topo se permitido. Retorna true se tratou.
    escape() {
      const top = stack[stack.length - 1];
      if (!top) return false;
      if (top.opts.onEscape) {
        top.opts.onEscape();
        return true;
      }
      if (top.opts.dismissible) {
        this.close(top);
        return true;
      }
      return true;
    },
    get depth() {
      return stack.length;
    },
    top() {
      return stack[stack.length - 1] || null;
    },
    has(name) {
      return stack.some((s) => s.opts.name === name);
    },
  };
}
