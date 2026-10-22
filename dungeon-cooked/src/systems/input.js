// Entrada: teclado, joystick virtual e toque/clique no canvas.
// Movimento é estado contínuo (getMove); ações são enviadas por callback.
// Qualquer perda de foco, pointercancel ou aba oculta solta os controles.

const KEY_DIRS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};

const KEY_ACTIONS = {
  KeyE: 'interact', Space: 'interact', Enter: 'confirm', NumpadEnter: 'confirm',
  KeyQ: 'discard', KeyP: 'pause', Escape: 'escape', KeyR: 'book', KeyM: 'mute',
  Digit1: 'pick1', Digit2: 'pick2', Digit3: 'pick3', Digit4: 'pick4',
  Numpad1: 'pick1', Numpad2: 'pick2', Numpad3: 'pick3', Numpad4: 'pick4',
  KeyH: 'help',
};

// Vetor do joystick a partir do deslocamento do dedo (com zona morta).
export function joystickVector(dx, dy, radius, dead = 0.18) {
  const len = Math.hypot(dx, dy);
  if (len < radius * dead) return { x: 0, y: 0, mag: 0 };
  const mag = Math.min(1, len / radius);
  return { x: (dx / len) * mag, y: (dy / len) * mag, mag };
}

export function createInput({ onAction, onPointerWorld, onUserGesture, isGameKeyTarget }) {
  const dirs = new Set();
  let stick = { x: 0, y: 0 };
  let stickPointer = null;

  function releaseAll() {
    dirs.clear();
    stick = { x: 0, y: 0 };
    stickPointer = null;
    const el = document.getElementById('joystick');
    if (el) el.classList.remove('active');
    const thumb = document.getElementById('joystick-thumb');
    if (thumb) thumb.style.transform = '';
  }

  window.addEventListener('keydown', (e) => {
    onUserGesture?.();
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const gameTarget = isGameKeyTarget ? isGameKeyTarget(e) : true;
    const dir = KEY_DIRS[e.code];
    if (dir && gameTarget) {
      e.preventDefault();
      dirs.add(dir);
      return;
    }
    const action = KEY_ACTIONS[e.code];
    if (!action) return;
    if (e.repeat && action !== 'interact') return;
    const handled = onAction(action, { event: e, repeat: e.repeat, gameTarget });
    if (handled) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const dir = KEY_DIRS[e.code];
    if (dir) dirs.delete(dir);
  });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAll();
  });

  // Joystick virtual
  const joy = document.getElementById('joystick');
  const thumb = document.getElementById('joystick-thumb');
  if (joy) {
    const update = (e) => {
      const r = joy.getBoundingClientRect();
      const radius = r.width / 2;
      const dx = e.clientX - (r.left + radius);
      const dy = e.clientY - (r.top + radius);
      const v = joystickVector(dx, dy, radius * 0.75);
      stick = { x: v.x, y: v.y };
      const clampLen = Math.min(Math.hypot(dx, dy), radius * 0.62);
      const ang = Math.atan2(dy, dx);
      thumb.style.transform = `translate(${Math.cos(ang) * clampLen}px, ${Math.sin(ang) * clampLen}px)`;
    };
    joy.addEventListener('pointerdown', (e) => {
      onUserGesture?.();
      e.preventDefault();
      stickPointer = e.pointerId;
      try { joy.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
      joy.classList.add('active');
      update(e);
    });
    joy.addEventListener('pointermove', (e) => {
      if (e.pointerId === stickPointer) update(e);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      joy.addEventListener(name, (e) => {
        if (e.pointerId !== stickPointer && name !== 'lostpointercapture') return;
        releaseAll();
      });
    }
  }

  // Toque/clique no canvas: andar até o ponto ou estação.
  const canvas = document.getElementById('canvas');
  if (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      onUserGesture?.();
      if (e.button !== 0) return;
      if (e.pointerType === 'touch') document.getElementById('app')?.classList.add('touch-used');
      onPointerWorld?.(e.clientX, e.clientY, e);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  return {
    getMove() {
      let x = 0;
      let y = 0;
      if (dirs.has('left')) x -= 1;
      if (dirs.has('right')) x += 1;
      if (dirs.has('up')) y -= 1;
      if (dirs.has('down')) y += 1;
      if (x || y) {
        const n = Math.hypot(x, y);
        return { moveX: x / n, moveY: y / n };
      }
      return { moveX: stick.x, moveY: stick.y };
    },
    releaseAll,
    isMoving() {
      return dirs.size > 0 || Math.hypot(stick.x, stick.y) > 0.12;
    },
  };
}
