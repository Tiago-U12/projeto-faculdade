// Ajudantes de DOM. Texto dinâmico sempre via textContent (nunca innerHTML com dados).

export const $ = (id) => document.getElementById(id);

// el('div', { class: 'x', onclick }, [filhos | 'texto'])
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function setText(node, value) {
  const str = String(value);
  if (node.textContent !== str) node.textContent = str;
}

// Ícones SVG fixos (strings constantes do próprio código, nunca dados do usuário).
const SVG = {
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5c3-1.5 6-1.5 8 1 2-2.5 5-2.5 8-1v14c-3-1.5-6-1.5-8 1-2-2.5-5-2.5-8-1zM12 6v14"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4zM15.5 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
};

export function svgIcon(name) {
  const tpl = document.createElement('template');
  tpl.innerHTML = SVG[name] || '';
  return tpl.content.firstChild;
}

export function setIcon(button, name) {
  if (button.dataset.icon === name) return;
  button.dataset.icon = name;
  clear(button).append(svgIcon(name));
}

// Foco preso dentro de uma janela modal enquanto ela estiver aberta.
export function trapFocus(container, event) {
  if (event.key !== 'Tab') return;
  const focusables = [...container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((n) => n.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
