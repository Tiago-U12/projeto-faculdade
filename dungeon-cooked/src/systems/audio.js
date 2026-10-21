// Áudio procedural com Web Audio: trilha em loop por tema e efeitos sintetizados.
// Só liga após um gesto do usuário (política de autoplay). Se falhar, fica em silêncio.
// O agendador da música usa o relógio do AudioContext e nunca toca no relógio do jogo.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

const THEMES = {
  menu: { bpm: 76, root: 57, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], pattern: [0, 2, 1, 2, 3, 2, 1, 2], density: 0.75, perc: false, lead: 0.5 },
  service: { bpm: 112, root: 62, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]], pattern: [0, 1, 2, 1, 3, 1, 2, 1], density: 0.95, perc: true, lead: 0.62 },
  calm: { bpm: 88, root: 60, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]], pattern: [0, 2, 1, 2, 3, 2, 1, 2], density: 0.8, perc: false, lead: 0.5 },
  shop: { bpm: 100, root: 65, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0]], pattern: [0, 1, 2, 3, 2, 1, 2, 1], density: 0.85, perc: true, lead: 0.55 },
  ending: { bpm: 68, root: 57, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]], pattern: [0, 2, 1, 3, 2, 1, 3, 2], density: 0.7, perc: false, lead: 0.45 },
};

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let noiseBuffer = null;
  let failed = false;
  let theme = null;
  let step = 0;
  let nextTime = 0;
  let timer = null;
  let rng = 1;
  const state = { music: 0.45, sfx: 0.75, mute: false };

  function rand() {
    rng = (rng * 16807) % 2147483647;
    return rng / 2147483647;
  }

  function ensure() {
    if (ctx || failed) return Boolean(ctx);
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('sem Web Audio');
      ctx = new AC();
      master = ctx.createGain();
      musicGain = ctx.createGain();
      sfxGain = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      musicGain.connect(master);
      sfxGain.connect(master);
      master.connect(comp);
      comp.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      applyVolumes();
      return true;
    } catch (error) {
      failed = true;
      ctx = null;
      return false;
    }
  }

  function applyVolumes() {
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.setTargetAtTime(state.mute ? 0 : 0.9, now, 0.05);
    musicGain.gain.setTargetAtTime(state.music * 0.32, now, 0.1);
    sfxGain.gain.setTargetAtTime(state.sfx * 0.55, now, 0.05);
  }

  function env(gainNode, t, attack, peak, decay, sustainLevel = 0.0001) {
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustainLevel), t + attack + decay);
  }

  function tone(freq, t, { type = 'sine', dur = 0.15, vol = 0.3, attack = 0.005, out = sfxGain, slide = 0, filter = null, detune = 0 } = {}) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (detune) osc.detune.setValueAtTime(detune, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    env(g, t, attack, vol, dur);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(filter, t);
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + attack + dur + 0.05);
  }

  function noise(t, { dur = 0.08, vol = 0.2, freq = 2000, type = 'bandpass', q = 1, out = sfxGain } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = q;
    const g = ctx.createGain();
    env(g, t, 0.003, vol, dur);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t, rand() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // Sino com parciais inarmônicos (suave, sem agudos estridentes).
  function bell(freq, t, vol = 0.25, dur = 1.2, out = sfxGain) {
    for (const [ratio, v] of [[1, 1], [2.01, 0.45], [2.76, 0.3], [5.4, 0.12]]) tone(freq * ratio, t, { type: 'sine', dur: dur / Math.sqrt(ratio), vol: vol * v, attack: 0.004, out });
  }

  const SFX = {
    ui: (t) => tone(660, t, { type: 'triangle', dur: 0.06, vol: 0.16 }),
    pick: (t) => { tone(520, t, { type: 'triangle', dur: 0.08, vol: 0.22, slide: 1.4 }); },
    chop: (t) => { noise(t, { dur: 0.05, vol: 0.35, freq: 3200, q: 2 }); tone(180, t, { type: 'square', dur: 0.04, vol: 0.08, filter: 900 }); },
    drop: (t) => { tone(300, t, { type: 'sine', dur: 0.18, vol: 0.28, slide: 0.55 }); noise(t + 0.03, { dur: 0.12, vol: 0.12, freq: 900 }); },
    assemble: (t) => { tone(784, t, { type: 'triangle', dur: 0.1, vol: 0.18 }); tone(988, t + 0.07, { type: 'triangle', dur: 0.12, vol: 0.16 }); },
    ready: (t) => { bell(784, t, 0.2, 0.8); bell(1175, t + 0.12, 0.16, 0.9); },
    nearBurn: (t) => { for (let i = 0; i < 3; i++) tone(620, t + i * 0.16, { type: 'triangle', dur: 0.08, vol: 0.14 }); },
    burnt: (t) => { tone(330, t, { type: 'sawtooth', dur: 0.35, vol: 0.12, slide: 0.5, filter: 1200 }); noise(t, { dur: 0.4, vol: 0.1, freq: 600, type: 'lowpass' }); },
    plate: (t) => { bell(1320, t, 0.12, 0.4); tone(660, t, { type: 'triangle', dur: 0.08, vol: 0.14 }); },
    success: (t) => { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, { type: 'triangle', dur: 0.16, vol: 0.2 })); },
    serve: (t) => { [523, 659].forEach((f, i) => tone(f, t + i * 0.08, { type: 'triangle', dur: 0.14, vol: 0.18 })); },
    wrong: (t) => { tone(220, t, { type: 'square', dur: 0.14, vol: 0.1, filter: 700 }); tone(196, t + 0.14, { type: 'square', dur: 0.2, vol: 0.1, filter: 700 }); },
    deny: (t) => tone(200, t, { type: 'triangle', dur: 0.09, vol: 0.18, slide: 0.8 }),
    bell: (t) => { bell(880, t, 0.3, 1.6); bell(1318, t + 0.18, 0.18, 1.4); },
    conflict: (t) => { tone(150, t, { type: 'sawtooth', dur: 0.25, vol: 0.1, filter: 500 }); tone(160, t + 0.05, { type: 'sawtooth', dur: 0.25, vol: 0.08, filter: 500 }); },
    warning: (t) => { tone(440, t, { type: 'triangle', dur: 0.1, vol: 0.16 }); tone(370, t + 0.12, { type: 'triangle', dur: 0.14, vol: 0.16 }); },
    crisis: (t) => { noise(t, { dur: 0.5, vol: 0.25, freq: 1800 }); tone(120, t, { type: 'sawtooth', dur: 0.5, vol: 0.12, slide: 0.6, filter: 600 }); },
    peace: (t) => { [659, 784, 988, 1319].forEach((f, i) => bell(f, t + i * 0.09, 0.1, 0.8)); },
    order: (t) => tone(880, t, { type: 'sine', dur: 0.07, vol: 0.14, slide: 1.2 }),
    door: (t) => { noise(t, { dur: 0.05, vol: 0.2, freq: 300, type: 'lowpass' }); noise(t + 0.13, { dur: 0.05, vol: 0.2, freq: 300, type: 'lowpass' }); },
    expired: (t) => { [392, 370, 349, 330].forEach((f, i) => tone(f, t + i * 0.12, { type: 'triangle', dur: 0.14, vol: 0.14 })); },
    trash: (t) => { noise(t, { dur: 0.16, vol: 0.2, freq: 700, type: 'lowpass' }); tone(140, t, { type: 'sine', dur: 0.12, vol: 0.12 }); },
    talk: (t) => { for (let i = 0; i < 3; i++) tone(300 + rand() * 220, t + i * 0.06, { type: 'square', dur: 0.04, vol: 0.05, filter: 1400 }); },
    voice: (t) => { [220, 277, 330].forEach((f) => tone(f, t, { type: 'sine', dur: 1.6, vol: 0.09, attack: 0.4, detune: 6 })); },
    unlock: (t) => { [659, 880, 1175].forEach((f, i) => bell(f, t + i * 0.08, 0.12, 0.6)); },
    buy: (t) => { [988, 1319].forEach((f, i) => bell(f, t + i * 0.07, 0.14, 0.5)); noise(t, { dur: 0.06, vol: 0.12, freq: 5000 }); },
    achievement: (t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.06, { type: 'triangle', dur: 0.2, vol: 0.16 })); },
    blip: (t) => tone(500 + rand() * 300, t, { type: 'triangle', dur: 0.03, vol: 0.05 }),
  };

  // ---------- Música ----------
  function scheduleStep(th, t) {
    const beat = 60 / th.bpm / 2; // colcheias
    const bar = Math.floor(step / 8) % th.chords.length;
    const pos = step % 8;
    const chord = th.chords[bar];
    const rootNote = th.root;
    // Baixo no tempo 1 e 5
    if (pos === 0 || pos === 4) tone(NOTE(rootNote - 24 + chord[0]), t, { type: 'triangle', dur: beat * 3.2, vol: 0.32, out: musicGain, attack: 0.01, filter: 600 });
    // Arpejo de alaúde
    if (rand() < th.density) {
      const idx = th.pattern[pos] % chord.length;
      const octave = th.pattern[pos] >= 3 ? 12 : 0;
      tone(NOTE(rootNote + chord[idx] + octave), t, { type: 'triangle', dur: beat * 1.8, vol: 0.2, out: musicGain, attack: 0.004, filter: 2600 });
    }
    // Melodia esparsa na escala
    if ((pos === 2 || pos === 6) && rand() < th.lead) {
      const deg = th.scale[Math.floor(rand() * th.scale.length)];
      tone(NOTE(rootNote + 12 + deg), t, { type: 'sine', dur: beat * 2.6, vol: 0.12, out: musicGain, attack: 0.02, detune: 4 });
    }
    if (th.perc) {
      if (pos % 2 === 1) noise(t, { dur: 0.03, vol: 0.05, freq: 7000, type: 'highpass', out: musicGain });
      if (pos === 0 || pos === 4) tone(90, t, { type: 'sine', dur: 0.12, vol: 0.18, slide: 0.5, out: musicGain });
    }
    return beat;
  }

  function tick() {
    if (!ctx || !theme) return;
    const th = THEMES[theme];
    while (nextTime < ctx.currentTime + 0.25) {
      const beat = scheduleStep(th, nextTime);
      nextTime += beat;
      step += 1;
    }
  }

  return {
    get available() {
      return !failed;
    },
    // Chamar dentro de um gesto do usuário (clique/tecla/toque).
    unlock() {
      if (!ensure()) return false;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    },
    setVolumes({ music, sfx, mute }) {
      if (music != null) state.music = music;
      if (sfx != null) state.sfx = sfx;
      if (mute != null) state.mute = mute;
      applyVolumes();
    },
    play(id) {
      if (!ctx || state.mute || !SFX[id]) return;
      try {
        SFX[id](ctx.currentTime + 0.01);
      } catch {
        // efeito sonoro é opcional
      }
    },
    music(name) {
      if (name === theme) return;
      theme = name && THEMES[name] ? name : null;
      step = 0;
      if (!ctx) return;
      nextTime = ctx.currentTime + 0.1;
      if (!timer && theme) timer = setInterval(tick, 60);
      if (!theme && timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    suspend() {
      if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
    },
    resume() {
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (ctx) nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
    },
  };
}
