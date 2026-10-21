// Ajustes persistidos (dungeonCooked.settings.v1). Valores inválidos voltam ao padrão.

export const PACE = {
  lento: { label: 'Lento (+30% de paciência)', mult: 1.3 },
  normal: { label: 'Normal', mult: 1 },
  rapido: { label: 'Rápido (−15% de paciência)', mult: 0.85 },
};

export function defaultSettings(env = {}) {
  return {
    musicVolume: 0.45,
    sfxVolume: 0.75,
    mute: false,
    highContrast: false,
    reducedMotion: Boolean(env.prefersReducedMotion),
    largeText: false,
    hints: true,
    stationLabels: true,
    speech: true,
    typewriter: true,
    pace: 'normal',
    touchControls: 'auto',
  };
}

const VALIDATORS = {
  musicVolume: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  sfxVolume: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  mute: (v) => typeof v === 'boolean',
  highContrast: (v) => typeof v === 'boolean',
  reducedMotion: (v) => typeof v === 'boolean',
  largeText: (v) => typeof v === 'boolean',
  hints: (v) => typeof v === 'boolean',
  stationLabels: (v) => typeof v === 'boolean',
  speech: (v) => typeof v === 'boolean',
  typewriter: (v) => typeof v === 'boolean',
  pace: (v) => typeof v === 'string' && Object.prototype.hasOwnProperty.call(PACE, v),
  touchControls: (v) => ['auto', 'sempre', 'nunca'].includes(v),
};

export function sanitizeSettings(raw, env = {}) {
  const base = defaultSettings(env);
  if (!raw || typeof raw !== 'object') return base;
  for (const key of Object.keys(base)) {
    if (key in raw && VALIDATORS[key](raw[key])) base[key] = raw[key];
  }
  return base;
}

// Aplica classes de acessibilidade no documento.
export function applySettings(settings, root = document.documentElement, app = document.getElementById('app')) {
  root.classList.toggle('hc', settings.highContrast);
  root.classList.toggle('large-text', settings.largeText);
  root.classList.toggle('reduced-motion', settings.reducedMotion);
  if (app) app.dataset.touch = settings.touchControls;
}
