// Main loop, camera, world rendering (low-res pixel canvas) and HUD
// (high-resolution canvas with thresholded "pixel font" text — chunky but crisp).
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W; canvas.height = VIEW_H;
ctx.imageSmoothingEnabled = false;

const ui = document.getElementById('ui');
const uictx = ui.getContext('2d');
let U = 1;

let camX = 0, camY = 0, camInit = false;
let lastOx = 0, lastOy = 0;
let hintTimer = 12;
let roofAlpha = 1;
let gameTime = 0;
let playTime = 0;      // time actually in-game (drives tutorial triggers)
let saveT = 0;         // autosave heartbeat

// BOOT → SPLASH → TITLE → INTRO → NAMING → PLAYING  (plus CONFIRMWIPE)
let GameState = 'boot';
let splashT = 0;

// neon power-on sound — synthesized live, no audio files.
// (Browsers only allow sound after a user gesture — hence the BOOT click.)
let AC = null;
function playSplashSound() {
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t0 = AC.currentTime;
    // rising electric hum
    const hum = AC.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.setValueAtTime(40, t0);
    hum.frequency.exponentialRampToValueAtTime(120, t0 + 2.2);
    const hg = AC.createGain();
    hg.gain.setValueAtTime(0.0001, t0);
    hg.gain.exponentialRampToValueAtTime(0.07, t0 + 1.2);
    hg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.4);
    hum.connect(hg).connect(AC.destination);
    hum.start(t0); hum.stop(t0 + 3.5);
    // crackle bursts as the letters flicker on
    for (const bt of [0.3, 0.75, 1.2, 1.65]) {
      const len = 0.08;
      const buf = AC.createBuffer(1, (AC.sampleRate * len) | 0, AC.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-(i / data.length) * 6);
      }
      const src = AC.createBufferSource();
      src.buffer = buf;
      const f = AC.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1500;
      const g = AC.createGain(); g.gain.value = 0.12;
      src.connect(f).connect(g).connect(AC.destination);
      src.start(t0 + bt);
    }
    // deep power-on surge when the full logo lands
    const wh = AC.createOscillator();
    wh.type = 'sine';
    wh.frequency.setValueAtTime(160, t0 + 2.0);
    wh.frequency.exponentialRampToValueAtTime(45, t0 + 3.2);
    const wg = AC.createGain();
    wg.gain.setValueAtTime(0.0001, t0 + 2.0);
    wg.gain.exponentialRampToValueAtTime(0.22, t0 + 2.15);
    wg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.4);
    wh.connect(wg).connect(AC.destination);
    wh.start(t0 + 2.0); wh.stop(t0 + 3.5);
  } catch (e) { /* no audio — carry on silently */ }
}
let pendingSave = loadSaveData();
if (pendingSave) playerName = pendingSave.name;
const INTRO_LINES = [
  'The machines took the city.',
  'Everyone who could run, ran.',
  'You ran too — and made it as far as the junkyard.',
];
let introIdx = 0, introT = 0;
let nameBuf = '';

// post-process buffer (HD-2D color grade + tilt-shift) and ambient dust
const post = makeCanvas(VIEW_W, VIEW_H);
const postCtx = post.getContext('2d');
const motes = Array.from({ length: 42 }, () => ({
  x: Math.random() * VIEW_W,
  y: Math.random() * VIEW_H,
  s: 1.5 + Math.random() * 3,
  ph: Math.random() * 6.28,
}));

function fitCanvas() {
  const s = Math.max(1, Math.floor(Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H)));
  U = s;
  canvas.style.width = VIEW_W * s + 'px';
  canvas.style.height = VIEW_H * s + 'px';
  ui.width = VIEW_W * s; ui.height = VIEW_H * s;
  ui.style.width = canvas.style.width;
  ui.style.height = canvas.style.height;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  Input.mouseX = (e.clientX - r.left) / r.width * VIEW_W;
  Input.mouseY = (e.clientY - r.top) / r.height * VIEW_H;
});
canvas.addEventListener('mousedown', e => {
  if (e.button === 0) { Input.mouseDown = true; Input.pressed['LMB'] = true; }
  if (e.button === 2) Input.rPressed = true;
});
// scroll wheel switches the active weapon
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (player.melee && player.hasGun) {
    player.active = player.active === 'gun' ? 'melee' : 'gun';
    SFX.switchW();
    showMsg(player.active === 'gun'
      ? 'SCRAP PISTOL selected'
      : MELEE[player.melee].label.toUpperCase() + ' selected', 1);
  }
}, { passive: false });
window.addEventListener('mouseup', e => { if (e.button === 0) Input.mouseDown = false; });

// ---------- real 5x7 bitmap pixel font: chunky, crisp, always readable ----------
const FONT = {
  A: [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11], B: [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
  C: [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E], D: [0x1C,0x12,0x11,0x11,0x11,0x12,0x1C],
  E: [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F], F: [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  G: [0x0E,0x11,0x10,0x17,0x11,0x11,0x0F], H: [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
  I: [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E], J: [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
  K: [0x11,0x12,0x14,0x18,0x14,0x12,0x11], L: [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
  M: [0x11,0x1B,0x15,0x15,0x11,0x11,0x11], N: [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
  O: [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E], P: [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
  Q: [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D], R: [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
  S: [0x0F,0x10,0x10,0x0E,0x01,0x01,0x1E], T: [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  U: [0x11,0x11,0x11,0x11,0x11,0x11,0x0E], V: [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
  W: [0x11,0x11,0x11,0x15,0x15,0x1B,0x11], X: [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
  Y: [0x11,0x11,0x0A,0x04,0x04,0x04,0x04], Z: [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
  '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E], '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2': [0x0E,0x11,0x01,0x06,0x08,0x10,0x1F], '3': [0x1E,0x01,0x01,0x0E,0x01,0x01,0x1E],
  '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02], '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E], '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E], '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  ' ': [0,0,0,0,0,0,0],
  '.': [0,0,0,0,0,0,0x04], ',': [0,0,0,0,0,0x04,0x08],
  ':': [0,0x04,0,0,0x04,0,0], ';': [0,0x04,0,0,0x04,0x08,0],
  '-': [0,0,0,0x0E,0,0,0], '+': [0,0x04,0x04,0x1F,0x04,0x04,0],
  '/': [0x01,0x02,0x02,0x04,0x08,0x08,0x10], "'": [0x04,0x04,0,0,0,0,0],
  '(': [0x02,0x04,0x08,0x08,0x08,0x04,0x02], ')': [0x08,0x04,0x02,0x02,0x02,0x04,0x08],
  '[': [0x0E,0x08,0x08,0x08,0x08,0x08,0x0E], ']': [0x0E,0x02,0x02,0x02,0x02,0x02,0x0E],
  '!': [0x04,0x04,0x04,0x04,0x04,0,0x04], '?': [0x0E,0x11,0x01,0x06,0x04,0,0x04],
  '>': [0x10,0x08,0x04,0x02,0x04,0x08,0x10], '<': [0x01,0x02,0x04,0x08,0x04,0x02,0x01],
  '*': [0,0x15,0x0E,0x1F,0x0E,0x15,0], '·': [0,0,0,0x04,0,0,0],
  '×': [0,0x11,0x0A,0x04,0x0A,0x11,0], '"': [0x0A,0x0A,0,0,0,0,0],
  '=': [0,0,0x0E,0,0x0E,0,0], '%': [0x19,0x1A,0x02,0x04,0x08,0x0B,0x13],
};
const _pt = new Map();
function ptGet(str, size, color) {
  const scale = size >= 12 ? 2 : 1;
  const key = scale + '|' + color + '|' + str;
  let e = _pt.get(key);
  if (!e) {
    const s = str.toUpperCase().replace(/—/g, '-');
    const cw = 6 * scale;
    const img = makeCanvas(Math.max(1, s.length * cw), 8 * scale);
    const g = img.getContext('2d');
    g.fillStyle = color;
    for (let i = 0; i < s.length; i++) {
      const glyph = FONT[s[i]] || FONT['?'];
      for (let r = 0; r < 7; r++) {
        const row = glyph[r];
        for (let c = 0; c < 5; c++) {
          if (row & (1 << (4 - c))) g.fillRect(i * cw + c * scale, r * scale, scale, scale);
        }
      }
    }
    e = { img, w: s.length * 6 * scale };
    if (_pt.size > 500) _pt.clear();
    _pt.set(key, e);
  }
  return e;
}
// split into word-wrapped lines of at most maxChars characters
function ptWrap(str, maxChars) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) { lines.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

// text renders at ~70% of the game-pixel scale (still integer = still crisp)
function textScale() { return Math.max(1, Math.round(U * 0.7)); }
// width of a string in game pixels at the current text scale
function ptWidth(str, size = 8) {
  return ptGet(str, size, '#ffffff').img.width * textScale() / U;
}
// gx/gy are in game pixels; gy is the TOP of the text
function ptext(str, gx, gy, size = 8, color = '#e8d9c0', align = 'left', alpha = 1) {
  const e = ptGet(str, size, color);
  const ts = textScale();
  let x = gx * U;
  if (align === 'center') x -= e.img.width * ts / 2;
  else if (align === 'right') x -= e.img.width * ts;
  uictx.imageSmoothingEnabled = false;
  uictx.globalAlpha = alpha;
  uictx.drawImage(e.img, Math.round(x), Math.round(gy * U), e.img.width * ts, e.img.height * ts);
  uictx.globalAlpha = 1;
  return e.img.width * ts / U;
}

// ---------- minimap base ----------
const MMS = 1.5;
const minimap = makeCanvas(Math.ceil(MAP_W * MMS), Math.ceil(MAP_H * MMS));
(function () {
  const g = minimap.getContext('2d');
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = ground[y][x];
    g.fillStyle = solid[y][x] ? '#7a6248'
      : t === 3 ? '#463a2c'
      : t === 1 ? '#2e2620'
      : t === 2 ? '#282420' : '#1e1c1a';
    g.fillRect(x * MMS, y * MMS, MMS, MMS);
  }
})();

// ---------- title / intro / naming ----------
function updateMeta(dt) {
  const anyKey = Object.keys(Input.pressed).length > 0;
  if (GameState === 'boot') {
    if (anyKey) {
      playSplashSound();
      GameState = 'splash';
      splashT = 0;
    }
  } else if (GameState === 'splash') {
    splashT += dt;
    if (splashT > 3.7 || (splashT > 0.6 && anyKey)) {
      GameState = 'title';
      SFX.startAmbience();      // the world starts breathing under the title
    }
  } else if (GameState === 'title') {
    if (pendingSave) {
      if (Input.pressed['KeyE']) {
        applySave(pendingSave);
        camInit = false;
        GameState = 'playing';
      } else if (Input.pressed['KeyN']) {
        GameState = 'confirmwipe';
      }
    } else if (anyKey) {
      GameState = 'intro';
      introIdx = 0; introT = 0;
    }
  } else if (GameState === 'confirmwipe') {
    if (Input.pressed['KeyE']) {
      wipeSave();
      pendingSave = null;
      playerName = '';
      GameState = 'intro';
      introIdx = 0; introT = 0;
    } else if (Input.pressed['KeyQ'] || Input.pressed['Escape']) {
      GameState = 'title';
    }
  } else if (GameState === 'intro') {
    introT += dt;
    if (Input.pressed['KeyE'] || Input.pressed['LMB']) {
      const fullyTyped = introT * 24 > INTRO_LINES[introIdx].length;
      if (!fullyTyped) {
        introT = 99;                    // reveal the whole line first
      } else {
        introIdx++;
        introT = 0;
        if (introIdx >= INTRO_LINES.length) GameState = 'naming';
      }
    }
  } else if (GameState === 'naming') {
    for (const code of Object.keys(Input.pressed)) {
      if (!Input.pressed[code]) continue;
      if (code.startsWith('Key') && nameBuf.length < 12) { nameBuf += code.slice(3); SFX.blip(); }
      else if (code.startsWith('Digit') && nameBuf.length < 12) { nameBuf += code.slice(5); SFX.blip(); }
      else if (code === 'Backspace') { nameBuf = nameBuf.slice(0, -1); SFX.blip(); }
      else if (code === 'Enter' && nameBuf.length > 0) {
        playerName = nameBuf;
        GameState = 'playing';
        saveGame();
        SFX.chime();
      }
    }
  }
  Input.pressed = {};
}

// ---------- update ----------
function update(dt) {
  gameTime += dt;
  // M toggles the ambient soundscape anywhere
  if (Input.pressed['KeyM']) {
    Input.pressed['KeyM'] = false;
    showMsg(SFX.toggleMusic() ? 'Ambience ON' : 'Ambience OFF', 1.2);
  }
  if (GameState !== 'playing') {
    updateMeta(dt);
    updateParticles(dt);
    for (const m of motes) {
      m.x += m.s * 1.6 * dt;
      m.y += m.s * dt;
      if (m.x > VIEW_W) m.x -= VIEW_W;
      if (m.y > VIEW_H) m.y -= VIEW_H;
    }
    if (!camInit) {
      const ps = isoToScreen(player.x, player.y);
      camX = ps.x - VIEW_W / 2; camY = ps.y - VIEW_H / 2 - 8;
      camInit = true;
    }
    return;
  }
  playTime += dt;
  saveT += dt;
  if (saveT > 10) { saveT = 0; saveGame(); }
  const w = screenToIso(Input.mouseX + camX, Input.mouseY + camY);
  Input.worldX = w.x; Input.worldY = w.y;

  // first tutorial fires shortly after spawn
  if (playTime > 0.6) {
    tutShow('move',
      ['Use W A S D to move.', 'Head for the glowing pipe in the yard.'],
      ['KeyW', 'KeyA', 'KeyS', 'KeyD'], 'PRESS W A S D');
  }

  if (Input.pressed['KeyI'] || Input.pressed['Tab'] || (InvUI.open && Input.pressed['Escape'])) {
    Input.pressed['KeyI'] = Input.pressed['Tab'] = false;
    InvUI.open = !InvUI.open;
    if (InvUI.open) SFX.uiOpen(); else SFX.uiClose();
    InvUI.tab = InvUI.tab || 0;
    InvUI.cur = 0;
    // opening the pack IS the action the inventory tutorial teaches —
    // dismiss it here, or it would hang waiting behind the pack screen
    if (Tut.active && (Tut.active.keys === 'any' || Tut.active.keys.includes('KeyI') || Tut.active.keys.includes('Tab'))) {
      Tut.active = null;
    }
  }

  if (InvUI.open) {
    // BotW-style: the world is frozen while the pack is open
    if (Input.pressed['KeyA'] || Input.pressed['ArrowLeft']) { InvUI.tab = (InvUI.tab + 3) % 4; InvUI.cur = 0; }
    if (Input.pressed['KeyD'] || Input.pressed['ArrowRight']) { InvUI.tab = (InvUI.tab + 1) % 4; InvUI.cur = 0; }
    const rows = invEntries();
    if (Input.pressed['KeyW'] || Input.pressed['ArrowUp']) InvUI.cur = Math.max(0, InvUI.cur - 1);
    if (Input.pressed['KeyS'] || Input.pressed['ArrowDown']) InvUI.cur = Math.min(Math.max(0, rows.length - 1), InvUI.cur + 1);
    if (Input.pressed['KeyE'] && rows[InvUI.cur]) invAction(rows[InvUI.cur]);
    for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyE'])
      Input.pressed[k] = false;   // consumed — never double-fire on multi-step frames
    updateParticles(dt);
    Msg.t -= dt;
    return;
  }

  if (Dialog.active) {
    if (Input.pressed['KeyE']) {
      Input.pressed['KeyE'] = false;
      Dialog.idx++;
      SFX.blip();
      if (Dialog.idx >= Dialog.lines.length) Dialog.active = false;
    }
    updateParticles(dt);
  } else if (Tut.active) {
    // tutorial freeze: world pauses until the player performs the taught action
    Tut.active.grace -= dt;
    if (Tut.active.grace <= 0) {
      const k = Tut.active.keys;
      const hit = k === 'any'
        ? (Object.keys(Input.pressed).length > 0 || Input.rPressed)
        : k.some(key => Input.pressed[key]);
      if (hit) Tut.active = null;
    }
    updateParticles(dt);
  } else if (Trade.open) {
    if (Input.pressed['Digit1']) tradeBuy(1);
    if (Input.pressed['Digit2']) tradeBuy(2);
    if (Input.pressed['Digit3']) tradeBuy(3);
    if (Input.pressed['KeyE'] || Input.pressed['Escape']) { Trade.open = false; SFX.uiClose(); }
    for (const k of ['Digit1', 'Digit2', 'Digit3', 'KeyE', 'Escape'])
      Input.pressed[k] = false;
    updateParticles(dt);
  } else {
    updatePlayer(dt);
    updateScrapper(dt);
    updateNpc(dt);
    updateBullets(dt);
    updateExplosions(dt);
    updateItems(dt);
    updateMission();
    updateParticles(dt);
    hintTimer -= dt;
  }
  Msg.t -= dt;

  const targetRoof = insideShack(player.x, player.y) ? 0.12 : 1;
  roofAlpha += (targetRoof - roofAlpha) * Math.min(1, 10 * dt);

  // dust drifts down-right through the light shafts
  for (const m of motes) {
    m.x += m.s * 1.6 * dt;
    m.y += m.s * dt;
    if (m.x > VIEW_W) m.x -= VIEW_W;
    if (m.y > VIEW_H) m.y -= VIEW_H;
  }

  const ps = isoToScreen(player.x, player.y);
  const targetX = ps.x - VIEW_W / 2, targetY = ps.y - VIEW_H / 2 - 8;
  if (!camInit) { camX = targetX; camY = targetY; camInit = true; }
  camX += (targetX - camX) * Math.min(1, 8 * dt);
  camY += (targetY - camY) * Math.min(1, 8 * dt);
}

// ---------- inventory data & actions (BotW-style pack) ----------
const INV_TABS = ['WEAPONS', 'ARMOUR', 'FOOD', 'ITEMS'];
function invEntries() {
  const t = InvUI.tab;
  if (t === 0) {
    const rows = [];
    if (player.owned.pipe) rows.push({ id: 'pipe', icon: Sprites.pipeIcon, label: 'Metal pipe', eq: player.melee === 'pipe' });
    if (player.owned.knife) rows.push({ id: 'knife', icon: Sprites.knifeIcon, label: 'Piercing knife', eq: player.melee === 'knife' });
    if (player.owned.pistol) rows.push({ id: 'pistol', icon: Sprites.pistolIcon, label: `Scrap pistol (${player.ammo})`, eq: player.hasGun });
    return rows;
  }
  if (t === 1) return [];
  if (t === 2) {
    return player.inv.snack > 0
      ? [{ id: 'snack', icon: Sprites.snackIcon, label: `Snack bar × ${player.inv.snack}`, use: 'EAT' }]
      : [];
  }
  const rows = [
    { id: 'scrap', icon: Sprites.scrapBit, label: `Scrap × ${player.inv.scrap}` },
    { id: 'tech', icon: Sprites.techIcon, label: `Low-q tech comp × ${player.inv.tech}` },
  ];
  if (player.inv.gateKey) rows.push({ id: 'key', icon: null, label: 'Yard gate key' });
  return rows;
}
function invAction(row) {
  if (row.id === 'pipe' || row.id === 'knife') {
    player.melee = player.melee === row.id ? null : row.id;
    SFX.switchW();
  } else if (row.id === 'pistol') {
    player.hasGun = !player.hasGun;
    SFX.switchW();
  } else if (row.id === 'snack') {
    if (player.hp < player.maxHp) {
      player.inv.snack--;
      player.hp = Math.min(player.maxHp, player.hp + 40);
      showMsg('Ate a snack bar  (+40 HP)');
      SFX.eat();
    } else { showMsg('Already at full health', 1.5); SFX.deny(); }
  }
}

// ---------- render ----------
function render() {
  Lights.length = 0;
  const sx = (Math.random() - 0.5) * shakeAmt;
  const sy = (Math.random() - 0.5) * shakeAmt;
  const ox = Math.round(camX + sx), oy = Math.round(camY + sy);
  lastOx = ox; lastOy = oy;

  ctx.fillStyle = '#141110';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  for (let gy = 0; gy < MAP_H; gy++) {
    for (let gx = 0; gx < MAP_W; gx++) {
      const px_ = (gx - gy) * (TILE_W / 2) - TILE_W / 2 - ox;
      const py_ = (gx + gy) * (TILE_H / 2) - oy;
      if (px_ < -TILE_W || px_ > VIEW_W || py_ < -TILE_H || py_ > VIEW_H) continue;
      const t = ground[gy][gx];
      const set = t === 0 ? Sprites.asphalt : t === 1 ? Sprites.dirt : t === 2 ? Sprites.rubble : Sprites.planks;
      ctx.drawImage(set[groundVar[gy][gx] % set.length], px_, py_);
      // ambient occlusion: ground darkens where it meets objects
      const ao = aoGrid[gy][gx];
      if (ao > 0) {
        ctx.globalAlpha = ao * 0.09;
        ctx.drawImage(Sprites.aoTile, px_, py_);
        ctx.globalAlpha = 1;
      }
    }
  }

  for (const d of decals) {
    const s = isoToScreen(d.gx, d.gy);
    const img = Sprites.decals[d.type];
    ctx.drawImage(img, Math.round(s.x - ox - img.width / 2), Math.round(s.y - oy - img.height / 2));
    if (d.type === 'puddle') {
      addLight(s.x - ox, s.y - oy, 0, 8, '160,185,230',
        0.07 + 0.05 * Math.sin(gameTime * 1.7 + d.gx * 3));
    }
  }

  const draws = [];
  for (const p of props) {
    const s = isoToScreen(p.gx + 0.5, p.gy + 0.5);
    const depth = p.foot ? s.y + (p.foot[2] + p.foot[3]) * 4 : s.y;
    draws.push({ depth, draw: () => drawProp(p, s.x - ox, s.y - oy) });
  }
  { const s = isoToScreen(scrapper.x, scrapper.y);
    draws.push({ depth: s.y, draw: () => drawScrapper(s.x - ox, s.y - oy) }); }
  { const s = isoToScreen(npc.x, npc.y);
    draws.push({ depth: s.y, draw: () => drawNpc(s.x - ox, s.y - oy) }); }
  { const s = isoToScreen(player.x, player.y);
    draws.push({ depth: s.y + 0.01, draw: () => drawPlayer(s.x - ox, s.y - oy) }); }
  for (const it of items) {
    const s = isoToScreen(it.x, it.y);
    draws.push({ depth: s.y, draw: () => drawItem(it, s.x - ox, s.y - oy) });
  }
  for (const b of bullets) {
    const s = isoToScreen(b.x, b.y);
    draws.push({ depth: s.y + 1, draw: () => {
      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(Math.round(s.x - ox - 1), Math.round(s.y - oy - 6), 2, 2);
      addLight(s.x - ox, s.y - oy - 5, 0, 10, '255,190,90', 0.25);
    }});
  }
  {
    const c1 = isoToScreen(SHACK.x0, SHACK.y0);
    const c2 = isoToScreen(SHACK.x1 + 1, SHACK.y0);
    const c3 = isoToScreen(SHACK.x1 + 1, SHACK.y1 + 1);
    const c4 = isoToScreen(SHACK.x0, SHACK.y1 + 1);
    const LIFT = 22;
    draws.push({ depth: c3.y + 2, draw: () => {
      ctx.globalAlpha = roofAlpha;
      ctx.fillStyle = '#4c453e';
      ctx.beginPath();
      ctx.moveTo(c1.x - ox, c1.y - oy - LIFT);
      ctx.lineTo(c2.x - ox, c2.y - oy - LIFT);
      ctx.lineTo(c3.x - ox, c3.y - oy - LIFT);
      ctx.lineTo(c4.x - ox, c4.y - oy - LIFT);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2e2a25';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(30,26,22,0.5)';
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        ctx.beginPath();
        ctx.moveTo(c1.x + (c2.x - c1.x) * t - ox, c1.y + (c2.y - c1.y) * t - oy - LIFT);
        ctx.lineTo(c4.x + (c3.x - c4.x) * t - ox, c4.y + (c3.y - c4.y) * t - oy - LIFT);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }});
  }
  draws.sort((a, b) => a.depth - b.depth);
  for (const d of draws) d.draw();

  // ghost silhouette — player stays visible behind walls, roofs, mounds
  if (player.dead <= 0) {
    const s = isoToScreen(player.x, player.y);
    ctx.globalAlpha = 0.35;
    ctx.drawImage(Sprites.player[player.frame], Math.round(s.x - ox - 8), Math.round(s.y - oy - 21));
    ctx.globalAlpha = 1;
  }

  for (const p of Particles) {
    const s = isoToScreen(p.x, p.y);
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.col;
    ctx.fillRect(Math.round(s.x - ox), Math.round(s.y - oy - p.z), p.size, p.size);
    ctx.globalAlpha = 1;
  }

  // explosion shockwave rings + fireball light
  for (const ex of explosions) {
    const p = 1 - ex.t / 0.35;
    const s = isoToScreen(ex.x, ex.y);
    const rx = s.x - ox, ry = s.y - oy - 4;
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = '#ffd27a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(rx, ry, p * 26, p * 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
    addLight(rx, ry, 0, 34 * (1 - p * 0.4), '255,150,70', 0.7 * (1 - p));
  }

  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#e6c092';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.globalCompositeOperation = 'lighter';
  for (const L of Lights) {
    const g = ctx.createRadialGradient(L.x, L.y - L.z, 0, L.x, L.y - L.z, L.radius);
    g.addColorStop(0, `rgba(${L.color},${L.alpha})`);
    g.addColorStop(1, `rgba(${L.color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(L.x - L.radius, L.y - L.z - L.radius, L.radius * 2, L.radius * 2);
  }
  // god rays: warm shafts of evening light slanting across the yard
  for (let i = 0; i < 3; i++) {
    const bx = 40 + i * 120;
    const a = 0.045 + 0.02 * Math.sin(gameTime * 0.6 + i * 2.1);
    const g = ctx.createLinearGradient(bx, 0, bx - 30, VIEW_H);
    g.addColorStop(0, `rgba(255,205,130,${a})`);
    g.addColorStop(1, 'rgba(255,205,130,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + 34, 0);
    ctx.lineTo(bx - 36, VIEW_H);
    ctx.lineTo(bx - 70, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }
  // dust motes drifting through the light
  for (const m of motes) {
    const tw = 0.5 + 0.5 * Math.sin(gameTime * 1.4 + m.ph);
    ctx.fillStyle = `rgba(255,220,160,${0.10 + 0.16 * tw})`;
    ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
  }
  ctx.globalCompositeOperation = 'source-over';

  const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (player.flash > 0) {
    ctx.fillStyle = `rgba(255,40,20,${Math.min(0.35, player.flash)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // ---- HD-2D post-process: color grade, then tilt-shift blur bands ----
  postCtx.clearRect(0, 0, VIEW_W, VIEW_H);
  postCtx.drawImage(canvas, 0, 0);
  ctx.filter = 'saturate(1.22) contrast(1.08)';
  ctx.drawImage(post, 0, 0);
  // miniature depth-of-field: soft blur at the top and bottom of the frame
  ctx.filter = 'saturate(1.22) contrast(1.08) blur(1.3px)';
  for (const [by, bh, ba] of [[0, 16, 0.85], [16, 10, 0.5], [26, 8, 0.22]]) {
    ctx.globalAlpha = ba;
    ctx.drawImage(post, 0, by, VIEW_W, bh, 0, by, VIEW_W, bh);
    const yb = VIEW_H - by - bh;
    ctx.drawImage(post, 0, yb, VIEW_W, bh, 0, yb, VIEW_W, bh);
  }
  ctx.globalAlpha = 1;
  ctx.filter = 'none';

  drawHUD();
}

function drawProp(p, x, y) {
  const T = p.type;
  if (T === 'wallSlice') {
    if (p.front) ctx.globalAlpha = 0.15 + roofAlpha * 0.85;
    ctx.drawImage(p.img, Math.round(x + p.dx), Math.round(y - p.lift + p.dy));
    ctx.globalAlpha = 1;
    return;
  }
  if (T === 'post') {
    const img = p.big ? Sprites.postL : Sprites.postS;
    if (p.front) ctx.globalAlpha = 0.15 + roofAlpha * 0.85;
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + 2));
    ctx.globalAlpha = 1;
    return;
  }
  if (T === 'mound2' || T === 'mound3') {
    const [, , fw, fh] = p.foot;
    const frontY = y + (fw + fh) * 4;
    const img = (T === 'mound2' ? Sprites.mound2 : Sprites.mound3)[p.v];
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(x, frontY - fh * 3, fw * 9, fh * 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(frontY - img.height + 2));
    return;
  }
  let img = null, oyOff = 0;
  if (T === 'boom') { img = Sprites.boomBarrel; oyOff = -15; drawShadow(x, y, 5); }
  else if (T === 'scrap') { img = Sprites.scrapPiles[p.v]; oyOff = -20; drawShadow(x, y, 9); }
  else if (T === 'car') { img = Sprites.cars[p.v]; oyOff = -18; drawShadow(x, y + 1, 15); }
  else if (T === 'barrel') { img = Sprites.barrel; oyOff = -14; drawShadow(x, y, 5); }
  else if (T === 'barrelTipped') { img = Sprites.barrelTipped; oyOff = -8; drawShadow(x, y, 7); }
  else if (T === 'tires') { img = Sprites.tires; oyOff = -12; drawShadow(x, y, 6); }
  else if (T === 'pipe') { img = Sprites.pipe; oyOff = -8; drawShadow(x, y, 11); }
  else if (T === 'girder') { img = Sprites.girder; oyOff = -11; drawShadow(x, y, 13); }
  else if (T === 'crate') { img = Sprites.crate; oyOff = -12; drawShadow(x, y, 6); }
  else if (T === 'cot') { img = Sprites.cot; oyOff = -12; drawShadow(x, y, 10); }
  else if (T === 'table') { img = Sprites.table; oyOff = -13; drawShadow(x, y, 9); }
  else if (T === 'stool') { img = Sprites.stool; oyOff = -9; drawShadow(x, y, 4); }
  else if (T === 'shelf') { img = Sprites.shelf; oyOff = -24; drawShadow(x, y, 8); }
  else if (T === 'stove') {
    img = Sprites.stove; oyOff = -14; drawShadow(x, y, 6);
    addLight(x, y - 7, 0, 18 + Math.sin(gameTime * 9) * 3, '255,140,60', 0.35);
  }
  if (img) ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y + oyOff));
}

function drawShadow(x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, w, w * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawItem(it, x, y) {
  const bobY = Math.sin(gameTime * 3 + it.bob) * 1.5;
  const grad = ctx.createLinearGradient(0, y - 30, 0, y);
  grad.addColorStop(0, 'rgba(255,210,120,0)');
  grad.addColorStop(1, 'rgba(255,210,120,0.22)');
  ctx.fillStyle = grad;
  ctx.fillRect(Math.round(x - 5), Math.round(y - 30), 10, 30);
  drawShadow(x, y, 4);
  const img = it.type === 'pipe' ? Sprites.pipeIcon : Sprites.ammo;
  ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - 10 + bobY));
  addLight(x, y - 6, 0, 14, '255,210,120', 0.22 + Math.sin(gameTime * 3 + it.bob) * 0.06);
}

function drawPlayer(x, y) {
  if (player.dead > 0) return;
  drawShadow(x, y, player.crouch ? 4 : 5);
  const blink = player.iframes > 0 && ((performance.now() / 70) | 0) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.5;
  const duck = player.crouch ? 3 : 0;   // hunkered down while sneaking
  ctx.drawImage(Sprites.player[player.frame], Math.round(x - 8), Math.round(y - 21 + duck));
  ctx.globalAlpha = 1;

  // melee attack animation — pipe SWEEPS an arc, knife STABS forward
  if (player.swing > 0 && player.melee) {
    const prog = 1 - player.swing / 0.22;                 // 0 → 1
    if (MELEE[player.melee].stab) {
      // knife: one-armed forward thrust using the SAME knife sprite as the UI
      const reach = Math.sin(prog * Math.PI) * 9;         // out and back
      ctx.save();
      ctx.translate(x, y - 9);
      ctx.rotate(player.angle);
      if (Math.cos(player.angle) < 0) ctx.scale(1, -1);
      ctx.fillStyle = `rgba(255,242,192,${0.45 - prog * 0.3})`;  // single motion streak
      ctx.fillRect(3, 0, 4 + reach, 1);
      ctx.fillStyle = '#26262c';                          // one arm: sleeve
      ctx.fillRect(1 + reach * 0.4, -1, 4, 2);
      ctx.fillStyle = '#0e0e12';                          // glove
      ctx.fillRect(5 + reach * 0.4, -1, 2, 2);
      ctx.drawImage(Sprites.knifeHeld, Math.round(5 + reach), -5);
      ctx.restore();
    } else {
      // pipe: wide sweep with a fading arc trail
      const start = player.angle - 1.3;
      const a = start + prog * 2.6;
      ctx.strokeStyle = `rgba(255,242,192,${0.55 - prog * 0.35})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 9, 14, start, a);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.save();
      ctx.translate(x, y - 9);
      ctx.rotate(a);
      ctx.fillStyle = '#8a8a92';
      ctx.fillRect(4, -1, 11, 2);
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(4, -1, 4, 2);
      ctx.restore();
    }
  }

  // gun shows only when it's the selected weapon (and not mid-swing)
  if (player.hasGun && player.active === 'gun' && player.swing <= 0) {
    // small extended arm holding the pistol, flipped so the grip stays down
    ctx.save();
    ctx.translate(x, y - 9);
    ctx.rotate(player.angle);
    if (Math.cos(player.angle) < 0) ctx.scale(1, -1);
    ctx.fillStyle = '#26262c';           // coat sleeve
    ctx.fillRect(1, -1, 4, 2);
    ctx.fillStyle = '#0e0e12';           // glove
    ctx.fillRect(5, -1, 2, 2);
    ctx.fillStyle = '#8a8d96';           // slide
    ctx.fillRect(6, -2, 6, 2);
    ctx.fillStyle = '#3c3e46';           // grip
    ctx.fillRect(7, 0, 2, 2);
    ctx.restore();

    if (player.muzzle > 0) {
      const mx = x + Math.cos(player.angle) * 13;
      const my = y - 9 + Math.sin(player.angle) * 7;
      ctx.fillStyle = '#fff2c0';
      ctx.fillRect(Math.round(mx - 2), Math.round(my - 2), 4, 4);
      addLight(mx, my, 0, 22, '255,210,120', 0.5);
    }
  }
}

function drawNpc(x, y) {
  drawShadow(x, y, 5);
  ctx.drawImage(Sprites.npc[npc.frame], Math.round(x - 8), Math.round(y - 21));
  if (mission.state === 'none') {
    const bobY = Math.sin(gameTime * 4) * 1.5;
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(Math.round(x - 1), Math.round(y - 28 + bobY), 2, 4);
    ctx.fillRect(Math.round(x - 1), Math.round(y - 23 + bobY), 2, 1);
    addLight(x, y - 25, 0, 10, '255,210,120', 0.25);
  }
}

function drawScrapper(x, y) {
  const s = scrapper;
  if (s.state === 'off') return;
  if (s.state === 'dead') {
    ctx.globalAlpha = s.looted ? 0.45 : 1;
    ctx.drawImage(Sprites.scrapperDead, Math.round(x - 9), Math.round(y - 9));
    ctx.globalAlpha = 1;
    if (!s.looted) addLight(x, y - 4, 0, 10, '255,210,140', 0.15);
    return;
  }
  drawShadow(x, y, 6);
  const fr = (s.state === 'windup' || s.state === 'swing') ? 2 : s.frame;
  const img = Sprites.scrapper[fr];
  if (s.hitFlash > 0) {
    ctx.drawImage(img, Math.round(x - 9), Math.round(y - 16));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7;
    ctx.drawImage(img, Math.round(x - 9), Math.round(y - 16));
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.drawImage(img, Math.round(x - 9), Math.round(y - 16));
  }
  const hunting = s.state === 'chase' || s.state === 'windup' || s.state === 'swing';
  addLight(x + 0.5, y - 11, 0, hunting ? 14 : 9, '255,176,46', hunting ? 0.5 : 0.3);
  if (s.state === 'windup') {
    ctx.fillStyle = ((performance.now() / 80) | 0) % 2 ? '#ff5a3c' : '#ffb02e';
    ctx.fillRect(Math.round(x - 1), Math.round(y - 23), 2, 2);
  }
  // SUSPICION: eye icon + white bar (turns red when nearly locked on) —
  // deliberately different colour language from the health bar below it
  if (s.state === 'patrol' && s.alert > 0.03) {
    const ay = Math.round(y - 27);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(Math.round(x - 12), ay - 1, 24, 5);
    // tiny eye glyph
    ctx.fillStyle = '#e8eef5';
    ctx.fillRect(Math.round(x - 10), ay, 3, 3);
    ctx.fillStyle = '#1a1c22';
    ctx.fillRect(Math.round(x - 9), ay + 1, 1, 1);
    // fill bar
    ctx.fillStyle = '#3a3e48';
    ctx.fillRect(Math.round(x - 5), ay + 1, 14, 2);
    ctx.fillStyle = s.alert > 0.7 ? '#ff5a3c' : '#e8eef5';
    ctx.fillRect(Math.round(x - 5), ay + 1, Math.round(14 * Math.min(1, s.alert)), 2);
  }
  // HEALTH: green→red gradient, same colour language as the player's bar
  if (s.hp < s.maxHp) {
    const frac = Math.max(0, s.hp / s.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(Math.round(x - 8), Math.round(y - 21), 16, 2);
    ctx.fillStyle = `hsl(${Math.round(112 * frac)}, 62%, 46%)`;
    ctx.fillRect(Math.round(x - 8), Math.round(y - 21), Math.round(16 * frac), 2);
  }
}

// ---------- HUD ----------
function uiIcon(img, gx, gy, scale = 1) {
  uictx.imageSmoothingEnabled = false;
  uictx.drawImage(img, gx * U, gy * U, img.width * scale * U, img.height * scale * U);
}
function uiRect(gx, gy, gw, gh, col) {
  uictx.fillStyle = col;
  uictx.fillRect(gx * U, gy * U, gw * U, gh * U);
}
function uiFrame(gx, gy, gw, gh) {
  uiRect(gx, gy, gw, gh, 'rgba(10,8,6,0.97)');
  uictx.strokeStyle = '#5a4a38';
  uictx.lineWidth = U;
  uictx.strokeRect(gx * U, gy * U, gw * U, gh * U);
}

function drawHUD() {
  const g = uictx;
  g.clearRect(0, 0, ui.width, ui.height);

  // ---- title / intro / naming screens (world frozen & dimmed behind) ----
  if (GameState !== 'playing') {
    const blink = ((gameTime * 1.6) | 0) % 2 === 0;

    // BOOT: dead screen waiting for power
    if (GameState === 'boot') {
      uiRect(0, 0, VIEW_W, VIEW_H, '#050607');
      if (blink) ptext('[ CLICK TO POWER ON ]', VIEW_W / 2, VIEW_H / 2 - 4, 8, 'rgba(90,170,220,0.6)', 'center');
      return;
    }

    // SPLASH: neon-blue logo flickers to life, letter by letter
    if (GameState === 'splash') {
      uiRect(0, 0, VIEW_W, VIEW_H, '#050607');
      const word = 'CORE SHUTDOWN';
      const ts = textScale();
      const cw = 12 * ts;                        // char advance (size-16 glyphs)
      const totalW = word.length * cw;
      const x0 = ui.width / 2 - totalW / 2;
      const yy = ui.height / 2 - 8 * ts;
      const fadeOut = splashT > 3.3 ? Math.max(0, 1 - (splashT - 3.3) / 0.4) : 1;
      const pulse = splashT > 2.1 ? 1 + 0.35 * Math.sin((splashT - 2.1) * 5) : 1;
      g.save();
      for (let i = 0; i < word.length; i++) {
        if (word[i] === ' ') continue;
        const start = 0.25 + i * 0.11;
        let a = 0;
        if (splashT >= start) {
          const dt2 = splashT - start;
          a = dt2 < 0.28 ? (Math.sin(dt2 * 62 + i * 7) > -0.25 ? 0.85 : 0.12) : 1;
        }
        if (a <= 0) continue;
        const e = ptGet(word[i], 16, '#9fe8ff');
        g.globalAlpha = a * fadeOut;
        g.shadowColor = '#2fb6ff';
        g.shadowBlur = 14 * pulse * a;
        const lx = Math.round(x0 + i * cw);
        g.drawImage(e.img, lx, yy, e.img.width * ts, e.img.height * ts);
        g.drawImage(e.img, lx, yy, e.img.width * ts, e.img.height * ts);  // double for glow
      }
      g.restore();
      g.globalAlpha = 1;
      return;
    }

    uiRect(0, 0, VIEW_W, VIEW_H, 'rgba(8,6,5,0.72)');
    if (GameState === 'title' || GameState === 'confirmwipe') {
      ptext('CORE SHUTDOWN', VIEW_W / 2, 48, 16, '#ffd27a', 'center');
      ptext('a scavenger against the machines', VIEW_W / 2, 72, 7, 'rgba(232,217,192,0.55)', 'center');
      if (GameState === 'confirmwipe') {
        ptext('Wipe your run and start over?', VIEW_W / 2, 104, 8, '#ff5a3c', 'center');
        ptext('[E] yes, wipe it    [Q] back', VIEW_W / 2, 118, 8, '#e8d9c0', 'center');
      } else if (pendingSave) {
        ptext(`Welcome back, ${playerName}`, VIEW_W / 2, 100, 8, '#7ad27a', 'center');
        ptext('[E] continue', VIEW_W / 2, 116, 8, '#e8d9c0', 'center');
        ptext('[N] new game', VIEW_W / 2, 128, 8, 'rgba(232,217,192,0.6)', 'center');
      } else if (blink) {
        ptext('press any key', VIEW_W / 2, 110, 8, '#e8d9c0', 'center');
      }
    } else if (GameState === 'intro') {
      const line = INTRO_LINES[introIdx] || '';
      const shown = line.slice(0, Math.floor(introT * 24));
      ptext(shown, VIEW_W / 2, VIEW_H / 2 - 8, 8, '#e8d9c0', 'center');
      if (introT * 24 > line.length && blink) {
        ptext('E >', VIEW_W / 2, VIEW_H / 2 + 14, 7, 'rgba(232,217,192,0.5)', 'center');
      }
    } else if (GameState === 'naming') {
      ptext('What is your name?', VIEW_W / 2, VIEW_H / 2 - 24, 8, '#ffd27a', 'center');
      ptext(nameBuf + (blink ? '_' : ' '), VIEW_W / 2, VIEW_H / 2 - 4, 12, '#e8d9c0', 'center');
      if (nameBuf.length > 0) {
        ptext('ENTER to begin', VIEW_W / 2, VIEW_H / 2 + 20, 7, 'rgba(232,217,192,0.5)', 'center');
      }
    }
    return;
  }

  // health bar — colour slides green → yellow → orange → red with amount
  const hpFrac = Math.max(0, player.hp / player.maxHp);
  uiRect(6, VIEW_H - 12, 46, 7, 'rgba(0,0,0,0.55)');
  uiRect(8, VIEW_H - 10, 42, 3, '#2a1410');
  uiRect(8, VIEW_H - 10, Math.round(42 * hpFrac), 3, `hsl(${Math.round(112 * hpFrac)}, 62%, 46%)`);

  // weapon slot (bottom-right): shows only the ACTIVE weapon (scroll to switch)
  uiRect(VIEW_W - 60, VIEW_H - 21, 54, 16, 'rgba(0,0,0,0.55)');
  const showGun = player.active === 'gun' && player.hasGun;
  if (showGun) {
    uiIcon(Sprites.pistolIconS, VIEW_W - 56, VIEW_H - 17);
    ptext('' + player.ammo, VIEW_W - 12, VIEW_H - 15, 8, player.ammo > 0 ? '#e8d9c0' : '#ff5a3c', 'right');
  } else if (player.melee) {
    const mi = player.melee === 'pipe' ? Sprites.pipeIcon : Sprites.knifeIcon;
    uiIcon(mi, VIEW_W - 52, VIEW_H - 16);
  } else {
    ptext('UNARMED', VIEW_W - 54, VIEW_H - 15, 7, 'rgba(232,217,192,0.45)');
  }
  if (player.melee && player.hasGun) {
    ptext('scroll', VIEW_W - 33, VIEW_H - 27, 7, 'rgba(232,217,192,0.35)', 'center');
  }

  // minimap
  const mw = minimap.width, mh = minimap.height;
  const mx = VIEW_W - mw - 6, my = 6;
  uiRect(mx - 2, my - 2, mw + 4, mh + 4, 'rgba(0,0,0,0.5)');
  g.globalAlpha = 0.9;
  uiIcon(minimap, mx, my);
  g.globalAlpha = 1;
  function blip(wx, wy, col) {
    uiRect(mx + wx * MMS - 1, my + wy * MMS - 1, 2, 2, col);
  }
  for (const it of items) blip(it.x, it.y, '#ffd27a');
  blip(npc.x, npc.y, '#7ad27a');
  if (scrapper.state !== 'dead' && scrapper.state !== 'off' &&
      Math.hypot(scrapper.x - player.x, scrapper.y - player.y) < 8)
    blip(scrapper.x, scrapper.y, '#ff5a3c');
  blip(player.x, player.y, '#ffffff');
  g.strokeStyle = '#5a4a38';
  g.lineWidth = U;
  g.strokeRect((mx - 1.5) * U, (my - 1.5) * U, (mw + 3) * U, (mh + 3) * U);

  // mission objective (top-left)
  if (mission.state === 'active' || mission.state === 'complete') {
    ptext('*', 8, 8, 8, '#ffd27a');
    ptext(mission.state === 'active'
      ? `Destroy Scrappers - loot scrap ${Math.min(player.inv.scrap, 5)}/5`
      : 'Return to the survivor', 16, 8, 8);
  }

  // interaction prompt
  if (Prompt && !Dialog.active && !Trade.open) {
    const wpx = ptWidth(Prompt.text, 8);
    const tx = Prompt.sx - lastOx, ty = Prompt.sy - lastOy;
    uiRect(tx - wpx / 2 - 3, ty - 3, wpx + 6, 11, 'rgba(0,0,0,0.65)');
    ptext(Prompt.text, tx, ty - 1, 8, '#ffd27a', 'center');
  }

  // tutorial panel (world is frozen while visible)
  if (Tut.active && !Dialog.active) {
    uiRect(0, 0, VIEW_W, VIEW_H, 'rgba(0,0,0,0.4)');
    const lines = Tut.active.lines;
    const pw = 232, ph = 26 + lines.length * 11;
    const px0 = (VIEW_W - pw) / 2, py0 = 34;
    uiFrame(px0, py0, pw, ph);
    ptext('TUTORIAL', px0 + pw / 2, py0 + 5, 8, '#ffd27a', 'center');
    for (let i = 0; i < lines.length; i++) {
      ptext(lines[i], px0 + pw / 2, py0 + 17 + i * 11, 8, '#e8d9c0', 'center');
    }
    if (((gameTime * 2) | 0) % 2 === 0) {
      ptext(Tut.active.footer, px0 + pw / 2, py0 + ph - 10, 7, 'rgba(255,210,122,0.8)', 'center');
    }
  }

  // floating message
  if (Msg.t > 0) {
    ptext(Msg.text, VIEW_W / 2, 24, 8, '#ffd27a', 'center', Math.min(1, Msg.t));
  }

  // BotW-style full-screen pack (world frozen while open)
  if (InvUI.open) {
    uiRect(0, 0, VIEW_W, VIEW_H, 'rgba(0,0,0,0.55)');
    const pw = 250, ph = 130, px0 = (VIEW_W - pw) / 2, py0 = (VIEW_H - ph) / 2;
    uiFrame(px0, py0, pw, ph);
    // section tabs
    let tx = px0 + 10;
    for (let t = 0; t < 4; t++) {
      const sel = t === InvUI.tab;
      const tw = ptWidth(INV_TABS[t], 8);
      if (sel) uiRect(tx - 3, py0 + 4, tw + 6, 11, 'rgba(255,210,122,0.15)');
      ptext(INV_TABS[t], tx, py0 + 6, 8, sel ? '#ffd27a' : 'rgba(232,217,192,0.45)');
      tx += tw + 14;
    }
    uiRect(px0 + 6, py0 + 18, pw - 12, 1, '#5a4a38');
    // rows
    const rows = invEntries();
    if (rows.length === 0) {
      const emptyText = InvUI.tab === 1 ? 'No armour yet — the city will provide.'
        : InvUI.tab === 2 ? 'No food. The survivor trades snack bars.'
        : 'Nothing here yet.';
      ptext(emptyText, px0 + pw / 2, py0 + 52, 8, 'rgba(232,217,192,0.5)', 'center');
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], ry = py0 + 26 + i * 16;
      const sel = i === InvUI.cur;
      if (sel) uiRect(px0 + 8, ry - 2, pw - 16, 14, 'rgba(255,210,122,0.12)');
      ptext(sel ? '>' : ' ', px0 + 12, ry, 8, '#ffd27a');
      if (r.icon) uiIcon(r.icon, px0 + 20, ry - 2);
      ptext(r.label, px0 + 48, ry, 8, sel ? '#ffd27a' : '#e8d9c0');
      if (r.eq !== undefined && r.eq) ptext('[EQUIPPED]', px0 + pw - 12, ry, 8, '#7ad27a', 'right');
      else if (r.eq !== undefined) ptext('[E] equip', px0 + pw - 12, ry, 8, 'rgba(232,217,192,0.4)', 'right');
      if (r.use) ptext('[E] ' + r.use.toLowerCase(), px0 + pw - 12, ry, 8, sel ? '#7ad27a' : 'rgba(232,217,192,0.4)', 'right');
    }
    ptext('A/D section · W/S select · E use · I close', px0 + pw / 2, py0 + ph - 12, 7, 'rgba(232,217,192,0.5)', 'center');
  }

  // trade panel + your items alongside it
  if (Trade.open) {
    const pw = 168, sw = 78, gap = 6, ph = 76;
    const total = pw + gap + sw;
    const px0 = (VIEW_W - total) / 2, py0 = (VIEW_H - ph) / 2 - 8;
    uiFrame(px0, py0, pw, ph);
    ptext('TRADE — SURVIVOR', px0 + pw / 2, py0 + 5, 8, '#7ad27a', 'center');
    const can = c => player.inv.scrap >= c ? '#e8d9c0' : 'rgba(232,217,192,0.4)';
    uiIcon(Sprites.snackIcon, px0 + 8, py0 + 19);
    ptext('[1] snack bar', px0 + 26, py0 + 18, 8, can(4));
    ptext('4 scrap', px0 + pw - 8, py0 + 18, 8, can(4), 'right');
    uiIcon(Sprites.ammo, px0 + 8, py0 + 31);
    ptext('[2] 6 rounds', px0 + 26, py0 + 30, 8, can(6));
    ptext('6 scrap', px0 + pw - 8, py0 + 30, 8, can(6), 'right');
    uiIcon(Sprites.knifeIcon, px0 + 6, py0 + 43);
    const canK = player.inv.tech >= 2 ? '#e8d9c0' : 'rgba(232,217,192,0.4)';
    if (player.owned.knife) {
      ptext('[3] piercing knife', px0 + 26, py0 + 42, 8, 'rgba(232,217,192,0.4)');
      ptext('SOLD', px0 + pw - 8, py0 + 42, 8, 'rgba(232,217,192,0.4)', 'right');
    } else {
      ptext('[3] piercing knife', px0 + 26, py0 + 42, 8, canK);
      ptext('2 low-q tech', px0 + pw - 8, py0 + 42, 8, canK, 'right');
    }
    ptext('E close', px0 + pw / 2, py0 + 63, 7, 'rgba(232,217,192,0.6)', 'center');

    // what you're carrying, right next to the offer
    const sx0 = px0 + pw + gap;
    uiFrame(sx0, py0, sw, ph);
    ptext('YOURS', sx0 + sw / 2, py0 + 5, 8, '#ffd27a', 'center');
    uiIcon(Sprites.scrapBit, sx0 + 6, py0 + 19);
    ptext('× ' + player.inv.scrap, sx0 + sw - 6, py0 + 18, 8, '#e8d9c0', 'right');
    uiIcon(Sprites.techIcon, sx0 + 5, py0 + 31);
    ptext('× ' + player.inv.tech, sx0 + sw - 6, py0 + 31, 8, '#e8d9c0', 'right');
    uiIcon(Sprites.snackIcon, sx0 + 5, py0 + 44);
    ptext('× ' + player.inv.snack, sx0 + sw - 6, py0 + 44, 8, '#e8d9c0', 'right');
    uiIcon(Sprites.ammo, sx0 + 5, py0 + 56);
    ptext('× ' + player.ammo, sx0 + sw - 6, py0 + 56, 8, '#e8d9c0', 'right');
  }

  // dialogue box (word-wrapped)
  if (Dialog.active) {
    const bh = 40;
    uiFrame(28, VIEW_H - bh - 8, VIEW_W - 56, bh);
    ptext('SURVIVOR', 36, VIEW_H - bh - 3, 7, '#7ad27a');
    const lines = ptWrap(Dialog.lines[Dialog.idx], 38);
    for (let i = 0; i < Math.min(2, lines.length); i++) {
      ptext(lines[i], 36, VIEW_H - bh + 7 + i * 10, 8);
    }
    ptext('E >', VIEW_W - 36, VIEW_H - 17, 7, 'rgba(232,217,192,0.5)', 'right');
  }

  // death screen
  if (player.dead > 0) {
    uiRect(0, 0, VIEW_W, VIEW_H, 'rgba(0,0,0,0.5)');
    ptext('SYSTEM FAILURE', VIEW_W / 2, VIEW_H / 2 - 12, 14, '#ff5a3c', 'center');
    ptext('rebooting...', VIEW_W / 2, VIEW_H / 2 + 6, 8, '#e8d9c0', 'center');
  }
}

// ---------- fixed-timestep loop ----------
let last = performance.now(), acc = 0;
const STEP = 1 / 60;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  let stepped = false;
  while (acc >= STEP) { update(STEP); acc -= STEP; stepped = true; }
  // only clear edge-presses if the simulation actually consumed them this
  // frame — otherwise a press landing on a zero-step frame would be lost
  if (stepped) {
    Input.pressed = {};
    Input.rPressed = false;
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
