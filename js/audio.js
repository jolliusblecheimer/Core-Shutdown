// Synthesized sound effects — every sound is generated in code, no files.
// The context unlocks on the first user gesture (the boot-screen click).
const SFX = (() => {
  let ctx = null, master = null;

  function ac() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(type, f0, f1, dur, vol, delay = 0) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, type = 'lowpass', freq = 1000, delay = 0) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.max(1, (c.sampleRate * dur) | 0), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(master);
    src.start(t0);
  }

  return {
    // combat
    shot() { noise(0.09, 0.35, 'lowpass', 2800); tone('square', 200, 80, 0.09, 0.25); },
    dry() { tone('square', 320, 320, 0.03, 0.12); },
    ricochet() { noise(0.05, 0.15, 'highpass', 3800); tone('triangle', 1300, 500, 0.07, 0.1); },
    hitMetal() { noise(0.06, 0.2, 'bandpass', 1800); tone('square', 420, 300, 0.08, 0.12); },
    swing() { noise(0.12, 0.12, 'lowpass', 700); },
    clang() { tone('square', 400, 380, 0.12, 0.15); tone('square', 633, 590, 0.1, 0.1); noise(0.04, 0.15, 'highpass', 2500); },
    stab() { noise(0.08, 0.18, 'highpass', 2200); tone('triangle', 900, 500, 0.07, 0.1); },
    boom() { noise(0.5, 0.5, 'lowpass', 420); tone('sine', 120, 34, 0.6, 0.5); noise(0.15, 0.3, 'highpass', 1500); },
    robotDie() { noise(0.25, 0.3, 'lowpass', 900); tone('sawtooth', 300, 50, 0.4, 0.2); tone('square', 700, 100, 0.2, 0.1, 0.05); },
    charge() { tone('sawtooth', 220, 640, 0.4, 0.1); },
    alert() { tone('square', 960, 960, 0.08, 0.2); tone('square', 960, 960, 0.08, 0.2, 0.12); },
    // player
    hurt() { tone('triangle', 160, 70, 0.15, 0.3); noise(0.08, 0.25, 'lowpass', 500); },
    die() { tone('sawtooth', 280, 40, 0.8, 0.3); noise(0.3, 0.2, 'lowpass', 600); },
    eat() { noise(0.05, 0.25, 'lowpass', 900); noise(0.05, 0.22, 'lowpass', 700, 0.13); },
    step(quiet) { noise(0.035, quiet ? 0.025 : 0.06, 'lowpass', 600 + Math.random() * 200); },
    // loot & items
    loot() { tone('triangle', 700, 700, 0.05, 0.15); tone('triangle', 1000, 1000, 0.06, 0.15, 0.07); },
    tech() { tone('triangle', 900, 900, 0.06, 0.15); tone('triangle', 1350, 1350, 0.09, 0.15, 0.08); },
    pickup() { tone('triangle', 520, 520, 0.06, 0.15); tone('triangle', 780, 780, 0.06, 0.15, 0.07); tone('triangle', 1040, 1040, 0.09, 0.15, 0.14); },
    // UI
    uiOpen() { tone('triangle', 500, 700, 0.07, 0.12); },
    uiClose() { tone('triangle', 700, 500, 0.07, 0.12); },
    blip() { tone('square', 820, 820, 0.04, 0.1); },
    buy() { tone('triangle', 900, 900, 0.06, 0.15); tone('triangle', 1200, 1200, 0.1, 0.15, 0.08); },
    deny() { tone('square', 190, 170, 0.09, 0.15); tone('square', 160, 150, 0.11, 0.15, 0.11); },
    switchW() { noise(0.03, 0.15, 'highpass', 1800); noise(0.04, 0.18, 'highpass', 1400, 0.07); },
    chime() { tone('triangle', 660, 660, 0.08, 0.15); tone('triangle', 880, 880, 0.08, 0.15, 0.09); tone('triangle', 1320, 1320, 0.14, 0.15, 0.18); },
  };
})();
