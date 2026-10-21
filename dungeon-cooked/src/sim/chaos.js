// Motor do Caos: tensão 0–100 com faixas explicadas, conflitos entre rivais com
// aviso prévio e três formas de resolver (sino, conversa, prato da paz).
import { clamp } from '../core/util.js';

export const TENSION_BANDS = [
  { id: 'calm', min: 0, max: 34, name: 'Sossego', icon: '☾', help: 'A dungeon respira em paz.' },
  { id: 'intrigue', min: 35, max: 69, name: 'Intriga', icon: '!', help: 'Converse ou use o sino.' },
  { id: 'trouble', min: 70, max: 99, name: 'Confusão', icon: '!!', help: 'Resolva o conflito antes que exploda!' },
  { id: 'crisis', min: 100, max: 100, name: 'Crise', icon: '✸', help: 'Respire. Dá para recuperar.' },
];

export const CONFLICT_STATE = Object.freeze({ WARNING: 'WARNING', ACTIVE: 'ACTIVE', RESOLVED: 'RESOLVED', ENDED: 'ENDED' });

export const CONFLICT_DELAY = 6; // segundos com os dois rivais sentados antes do aviso
export const WARNING_SECONDS = 5;
export const CRISIS_RESET = 55;

export function tensionBand(value) {
  const v = Math.round(value);
  return TENSION_BANDS.find((b) => v >= b.min && v <= b.max) || TENSION_BANDS[0];
}

// Multiplicador de perda de paciência por faixa de tensão.
export function patienceDrainFactor(value) {
  if (value >= 70) return 1.25;
  if (value >= 35) return 1.1;
  return 1;
}

export function createChaos(rules) {
  return {
    enabled: rules.tension,
    tension: rules.startTension ?? (rules.tension ? 10 : 0),
    maxTension: rules.startTension ?? 10,
    bellCooldown: 0,
    bellBaseCooldown: rules.bellCooldown,
    conflicts: [],
    nextConflictId: 1,
    crisisFlash: 0,
  };
}

export function addTension(chaos, amount) {
  if (!chaos.enabled) return 0;
  const before = chaos.tension;
  chaos.tension = clamp(chaos.tension + amount, 0, 100);
  chaos.maxTension = Math.max(chaos.maxTension, chaos.tension);
  return chaos.tension - before;
}

export function activeConflicts(chaos) {
  return chaos.conflicts.filter((c) => c.state === CONFLICT_STATE.WARNING || c.state === CONFLICT_STATE.ACTIVE);
}

export function conflictFor(chaos, npcId) {
  return activeConflicts(chaos).find((c) => c.a === npcId || c.b === npcId) || null;
}

export function startConflict(chaos, rivalry) {
  const conflict = {
    id: chaos.nextConflictId++,
    pair: rivalry.id,
    a: rivalry.a,
    b: rivalry.b,
    state: CONFLICT_STATE.WARNING,
    timer: WARNING_SECONDS,
    method: null,
    rewarded: false,
  };
  chaos.conflicts.push(conflict);
  return conflict;
}

// Encerra um conflito ativo uma única vez. method: bell | talk | peace | service | left | crisis
export function resolveConflict(conflict, method) {
  if (conflict.state !== CONFLICT_STATE.WARNING && conflict.state !== CONFLICT_STATE.ACTIVE) return false;
  conflict.method = method;
  conflict.state = method === 'left' || method === 'crisis' ? CONFLICT_STATE.ENDED : CONFLICT_STATE.RESOLVED;
  return true;
}

// Avança conflitos e tensão passiva. Retorna eventos.
export function tickChaos(chaos, dt, rules) {
  const events = [];
  chaos.bellCooldown = Math.max(0, chaos.bellCooldown - dt);
  chaos.crisisFlash = Math.max(0, chaos.crisisFlash - dt);
  if (!chaos.enabled) return events;
  for (const c of chaos.conflicts) {
    if (c.state === CONFLICT_STATE.WARNING) {
      c.timer -= dt;
      if (c.timer <= 0) {
        c.state = CONFLICT_STATE.ACTIVE;
        events.push({ type: 'conflictActive', conflict: c });
      }
    }
  }
  const active = chaos.conflicts.filter((c) => c.state === CONFLICT_STATE.ACTIVE).length;
  const passive = (rules.passiveTension || 0) + active * (rules.conflictTension || 0);
  if (passive > 0) addTension(chaos, passive * dt);
  if (chaos.tension >= 100) events.push({ type: 'crisis' });
  return events;
}

export function bellCooldownFor(chaos, mods) {
  return chaos.bellBaseCooldown * (mods.bellCooldownMult ?? 1);
}

// Toque do sino. Fora de contexto: só som/animação, sem moedas nem efeito.
export function ringBell(chaos, mods) {
  if (chaos.bellCooldown > 0) {
    return { ok: false, reason: 'cooldown', text: `Sino recarregando: ${Math.ceil(chaos.bellCooldown)}s.` };
  }
  const conflict = activeConflicts(chaos)[0];
  if (conflict) {
    resolveConflict(conflict, 'bell');
    const coins = conflict.rewarded ? 0 : 10;
    conflict.rewarded = true;
    const delta = addTension(chaos, -25);
    chaos.bellCooldown = bellCooldownFor(chaos, mods);
    return { ok: true, effect: 'resolved', conflict, coins, tensionDelta: delta };
  }
  if (chaos.enabled && chaos.tension >= 35) {
    const delta = addTension(chaos, -20);
    chaos.bellCooldown = bellCooldownFor(chaos, mods);
    return { ok: true, effect: 'calm', coins: 0, tensionDelta: delta };
  }
  chaos.bellCooldown = 2;
  return { ok: true, effect: 'none', coins: 0, tensionDelta: 0 };
}
