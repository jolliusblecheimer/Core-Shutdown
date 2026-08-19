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
let cineZoom = 1;      // camera zoom during boss phase cutscenes
let hintTimer = 12;
let roofAlpha = 1;
let gameTime = 0;
let playTime = 0;      // time actually in-game (drives tutorial triggers)
let saveT = 0;         // autosave heartbeat

// BOOT → SPLASH → TITLE → INTRO → NAMING → PLAYING  (plus CONFIRMWIPE)
// Arena builds skip everything and drop straight into the fight.
let GameState = window.ARENA_MODE ? 'playing' : 'boot';
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
let pendingSave = window.ARENA_MODE ? null : loadSaveData();
if (pendingSave) playerName = pendingSave.name;

// arena loadout: fully armed, tutorials off, boss waiting
if (window.ARENA_MODE) {
  playerName = 'ARENA';
  player.owned = { pipe: true, knife: true, pistol: true };
  player.melee = 'knife';
  player.hasGun = true;
  player.active = 'gun';
  player.ammo = 60;
  player.inv.snack = 5;
  player.scrollHintT = 0;
  Tut.done = { move: 1, melee: 1, enemy: 1, loot: 1, gun: 1, stealth: 1 };
  player.x = 16.5; player.y = 21.5;
  player.respawnX = 16.5; player.respawnY = 21.5;
  spawnBoss(16.5, 14.5);
  hintTimer = 8;
}
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

// ground type → tileset
const TILESETS = [];
function buildTilesets() {
  TILESETS[0] = Sprites.asphalt; TILESETS[1] = Sprites.dirt;
  TILESETS[2] = Sprites.rubble;  TILESETS[3] = Sprites.planks;
  TILESETS[4] = Sprites.road;    TILESETS[5] = Sprites.pavement;
  TILESETS[6] = Sprites.verge;   TILESETS[7] = Sprites.forecourt;
}
buildTilesets();

// ---------- minimap: whole map pre-rendered, shown as a window when big ----
const MMS = 1.5;
const MM_VIEW = 46;          // tiles shown around the player on a large map
let minimap = null, mmWindowed = false;
function buildMinimap() {
  minimap = makeCanvas(Math.ceil(MAP_W * MMS), Math.ceil(MAP_H * MMS));
  const g = minimap.getContext('2d');
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = ground[y][x];
    g.fillStyle = solid[y][x] ? (t === 2 || t === 5 ? '#5c5f63' : '#7a6248')
      : t === 4 ? '#2b2d31'
      : t === 5 ? '#4a4c4f'
      : t === 7 ? '#5a5c5e'
      : t === 6 ? '#333828'
      : t === 3 ? '#463a2c'
      : t === 1 ? '#2e2620'
      : t === 2 ? '#282420' : '#1e1c1a';
    g.fillRect(x * MMS, y * MMS, MMS, MMS);
  }
  mmWindowed = MAP_W > 60 || MAP_H > 60;
}
buildMinimap();

// ---------- fog of war: the map remembers only where you have walked ----------
const FOG = 3;                       // tiles per explored cell
const exploredByArea = {};
let explored = null, fogW = 0, fogH = 0;
function initFog(areaId) {
  fogW = Math.ceil(MAP_W / FOG); fogH = Math.ceil(MAP_H / FOG);
  if (!exploredByArea[areaId] || exploredByArea[areaId].length !== fogW * fogH) {
    exploredByArea[areaId] = new Uint8Array(fogW * fogH);
  }
  explored = exploredByArea[areaId];
}
initFog(currentArea);
function markExplored(x, y, r) {
  const cx = Math.floor(x / FOG), cy = Math.floor(y / FOG), cr = Math.ceil(r / FOG);
  for (let j = cy - cr; j <= cy + cr; j++) {
    if (j < 0 || j >= fogH) continue;
    for (let i = cx - cr; i <= cx + cr; i++) {
      if (i < 0 || i >= fogW) continue;
      if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= cr * cr) explored[j * fogW + i] = 1;
    }
  }
}
const isExplored = (tx, ty) => {
  const i = Math.floor(tx / FOG), j = Math.floor(ty / FOG);
  return i >= 0 && j >= 0 && i < fogW && j < fogH && explored[j * fogW + i] === 1;
};
// pack/unpack for the save file
function fogToString(a) {
  let s = '';
  for (let i = 0; i < a.length; i += 6) {
    let v = 0;
    for (let b = 0; b < 6; b++) if (a[i + b]) v |= 1 << b;
    s += String.fromCharCode(48 + v);
  }
  return s;
}
function fogFromString(s, len) {
  const a = new Uint8Array(len);
  for (let i = 0; i < s.length; i++) {
    const v = s.charCodeAt(i) - 48;
    for (let b = 0; b < 6; b++) if (v & (1 << b)) { const k = i * 6 + b; if (k < len) a[k] = 1; }
  }
  return a;
}

const MapUI = { open: false };

// ---------- area transitions ----------
// Fade out, swap the world, fade in. Per-area state (what you took, what you
// blew up) is stashed so an area remembers you were there.
const areaState = {};
const Trans = { active: false, t: 0, to: null, entry: null, swapped: false };

function stashArea() {
  areaState[currentArea] = {
    deadBarrels: boomBarrels.filter(b => !b.alive).map(b => b.gx + ',' + b.gy),
    takenItems: (START_ITEMS_BY_AREA[currentArea] || []).filter(
      k => !items.some(it => itemKey(it) === k)),
    deadBandits: collectDeadBandits(),
  };
}
// A raider you killed stays killed. Respawning them would turn a roadblock
// into a wall you can never actually get past, and dying halfway through a
// fight would cost you the whole fight — so the dead are world state, keyed
// by which block and which post they held rather than by array index.
function collectDeadBandits() {
  return bandits.filter(b => b.dead).map(b => banditKey(b) + (b.looted ? '!' : ''));
}
function restoreBandits(id) {
  const st = areaState[id];
  if (!st || !st.deadBandits) return;
  const down = new Set(st.deadBandits.map(k => k.replace('!', '')));
  const looted = new Set(st.deadBandits.filter(k => k.endsWith('!')).map(k => k.slice(0, -1)));
  for (const b of bandits) {
    const k = banditKey(b);
    if (!down.has(k)) continue;
    b.dead = true; b.state = 'dead'; b.hp = 0; b.fell = 0;
    b.looted = looted.has(k);
  }
  for (const rb of roadblocks) {
    rb.cleared = bandits.every(b => b.block !== rb || b.dead);
  }
}
function restoreArea(id) {
  const st = areaState[id];
  if (!st) return;
  const dead = new Set(st.deadBarrels || []);
  for (const b of boomBarrels) {
    if (b.alive && dead.has(b.gx + ',' + b.gy)) {
      b.alive = false;
      solid[b.gy][b.gx] = false;
      removeProp(b.prop);
    }
  }
  const taken = new Set(st.takenItems || []);
  for (let i = items.length - 1; i >= 0; i--) {
    if (taken.has(itemKey(items[i]))) items.splice(i, 1);
  }
}

function enterArea(id, entry) {
  stashArea();
  currentArea = id;
  Areas[id].build();
  loadAreaItems(id);
  restoreArea(id);
  if (id === 'junkyard' && bossDefeated) openGate();
  buildMinimap();
  initFog(id);
  // entities that don't belong here stand down
  boss.active = false; boss.state = 'hidden'; boss.shots.length = 0;
  bullets.length = 0; Particles.length = 0; foeBullets.length = 0;
  explosions.length = 0; fuses.length = 0;
  if (Areas[id].hasScrapper && mission.state !== 'none') spawnScrappers();
  else scrappersOff();
  spawnBandits();
  restoreBandits(id);
  foeBullets.length = 0;
  if (entry) {
    player.x = entry.x; player.y = entry.y;
    if (!canStand(player.x, player.y, player.r)) {
      const safe = findSafeSpot(player.x, player.y);
      if (safe) { player.x = safe.x; player.y = safe.y; }
    }
  }
  player.iframes = 0.8;
  camInit = false;
  exitArmed = false;          // must step clear of the doorway before it works
  sinceArea = 0;
  showMsg(Areas[id].name, 2.6);
  saveGame();
}

function startTransition(to, entry) {
  if (Trans.active) return;
  Trans.active = true; Trans.t = 0; Trans.to = to; Trans.entry = entry;
  Trans.swapped = false;
  SFX.uiOpen();
}

function updateTransition(dt) {
  if (!Trans.active) return;
  Trans.t += dt;
  if (!Trans.swapped && Trans.t >= 0.45) {
    Trans.swapped = true;
    enterArea(Trans.to, Trans.entry);
  }
  if (Trans.t >= 1.0) Trans.active = false;
}

// walking into an exit zone leaves the area. The exit only arms once the
// player has stepped clear of every zone, so arriving next to a doorway can
// never bounce you straight back where you came from.
let exitArmed = false;
let sinceArea = 0;
function checkExits(dt) {
  if (Trans.active || window.ARENA_MODE) return;
  sinceArea += dt || 0;
  const zones = (currentAreaDef().exits || []).filter(
    ex => !(ex.needsGate && !(gateProp && gateProp.open)));
  const inZone = ex => player.x >= ex.x0 && player.x <= ex.x1 &&
                       player.y >= ex.y0 && player.y <= ex.y1;
  if (!exitArmed) {
    // normally: arm once you've stepped clear. Safety: never stay locked.
    if (!zones.some(inZone) || sinceArea > 2.5) exitArmed = true;
    return;
  }
  for (const ex of zones) {
    if (inZone(ex)) { startTransition(ex.to, ex.entry); return; }
  }
}

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
  // O toggles the ambient soundscape anywhere (M is the map)
  if (Input.pressed['KeyO']) {
    Input.pressed['KeyO'] = false;
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
  // weak-point hit-pause: the world holds its breath for a couple frames
  if (hitPause > 0) { hitPause -= dt; return; }

  playTime += dt;
  saveT += dt;
  if (saveT > 5) { saveT = 0; saveGame(); }

  if (window.ARENA_MODE && Input.pressed['KeyR']) {
    Input.pressed['KeyR'] = false;
    resetArena();
  }
  const w = screenToIso(Input.mouseX + camX, Input.mouseY + camY);
  Input.worldX = w.x; Input.worldY = w.y;

  // first tutorial fires shortly after spawn
  if (playTime > 0.6) {
    tutShow('move',
      ['Use W A S D to move.', 'Head for the glowing pipe in the yard.'],
      ['KeyW', 'KeyA', 'KeyS', 'KeyD'], 'PRESS W A S D');
  }

  // M — the map of everywhere you have been
  if (GameState === 'playing' && (Input.pressed['KeyM'] || (MapUI.open && Input.pressed['Escape']))) {
    Input.pressed['KeyM'] = false;
    MapUI.open = !MapUI.open;
    if (MapUI.open) { InvUI.open = false; SFX.uiOpen(); } else SFX.uiClose();
  }
  if (MapUI.open) {
    Input.pressed['Escape'] = false;
    updateParticles(dt);
    Msg.t -= dt;
    return;
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
    const bossCine = GateCine.active || Trans.active ||
      (boss.active && (boss.state === 'cine2' || boss.state === 'cine3'));
    if (!bossCine) {
      updatePlayer(dt);
      updateScrappers(dt);
      updateBandits(dt);
      updateItems(dt);
      checkExits(dt);
      markExplored(player.x, player.y, 9);
    }
    updateTransition(dt);
    updateGateCine(dt);
    updateBoss(dt);
    updateNpc(dt);
    updateBullets(dt);
    updateFoeBullets(dt);
    updateExplosions(dt);
    updateMission();
    updateParticles(dt);
    hintTimer -= dt;
  }
  Msg.t -= dt;
  Thoughts.t -= dt;
  // arena: death resets the whole fight
  if (window.ARENA_MODE && player.dead > 0 && player.dead < 0.1) resetArena();

  const targetRoof = insideShack(player.x, player.y) ? 0.12 : 1;
  roofAlpha += (targetRoof - roofAlpha) * Math.min(1, 10 * dt);

  // dust drifts down-right through the light shafts
  for (const m of motes) {
    m.x += m.s * 1.6 * dt;
    m.y += m.s * dt;
    if (m.x > VIEW_W) m.x -= VIEW_W;
    if (m.y > VIEW_H) m.y -= VIEW_H;
  }

  // camera: the player normally; the boss during its cutscenes; during the
  // gate cutscene, first the gate lock — then whatever rises behind you
  const cineOn = boss.active && (boss.state === 'cine2' || boss.state === 'cine3');
  let focus;
  if (GateCine.active) {
    focus = GateCine.spawned ? isoToScreen(boss.x, boss.y) : isoToScreen(21.5, 30.0);
  } else if (cineOn) {
    focus = isoToScreen(boss.x, boss.y);
  } else {
    focus = isoToScreen(player.x, player.y);
  }
  const targetX = focus.x - VIEW_W / 2, targetY = focus.y - VIEW_H / 2 - 8;
  if (!camInit) { camX = targetX; camY = targetY; camInit = true; }
  camX += (targetX - camX) * Math.min(1, 8 * dt);
  camY += (targetY - camY) * Math.min(1, 8 * dt);
  const zoomTarget = GateCine.active ? 1.35 : (cineOn ? 1.55 : 1);
  cineZoom += (zoomTarget - cineZoom) * Math.min(1, 5 * dt);
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
    } else { showMsg('Already at full health', 1.5); SFX.deny(); return; }
  }
  saveGame();
}

// ---------- render ----------
function render() {
  Lights.length = 0;
  const sx = (Math.random() - 0.5) * shakeAmt;
  const sy = (Math.random() - 0.5) * shakeAmt;
  const ox = Math.round(camX + sx), oy = Math.round(camY + sy);
  lastOx = ox; lastOy = oy;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#141110';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // cutscene zoom, centered on the screen
  if (cineZoom > 1.005) {
    ctx.setTransform(cineZoom, 0, 0, cineZoom,
      (VIEW_W / 2) * (1 - cineZoom), (VIEW_H / 2) * (1 - cineZoom));
  }

  // ---- only what the camera can see: the map may be 200x150 ----
  const MARG = 3;
  let vx0 = Infinity, vy0 = Infinity, vx1 = -Infinity, vy1 = -Infinity;
  for (const c of [screenToIso(ox - TILE_W, oy - 48), screenToIso(ox + VIEW_W + TILE_W, oy - 48),
                   screenToIso(ox - TILE_W, oy + VIEW_H + 60), screenToIso(ox + VIEW_W + TILE_W, oy + VIEW_H + 60)]) {
    vx0 = Math.min(vx0, c.x); vx1 = Math.max(vx1, c.x);
    vy0 = Math.min(vy0, c.y); vy1 = Math.max(vy1, c.y);
  }
  vx0 = Math.max(0, Math.floor(vx0) - MARG); vy0 = Math.max(0, Math.floor(vy0) - MARG);
  vx1 = Math.min(MAP_W - 1, Math.ceil(vx1) + MARG); vy1 = Math.min(MAP_H - 1, Math.ceil(vy1) + MARG);

  for (let gy = vy0; gy <= vy1; gy++) {
    for (let gx = vx0; gx <= vx1; gx++) {
      const px_ = (gx - gy) * (TILE_W / 2) - TILE_W / 2 - ox;
      const py_ = (gx + gy) * (TILE_H / 2) - oy;
      if (px_ < -TILE_W || px_ > VIEW_W || py_ < -TILE_H || py_ > VIEW_H) continue;
      const set = TILESETS[ground[gy][gx]] || Sprites.asphalt;
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

  for (const d of gatherNear(decalCells, vx0, vy0, vx1, vy1, [])) {
    const img = Sprites.decals[d.type];
    if (!img) continue;
    const s = isoToScreen(d.gx, d.gy);
    ctx.drawImage(img, Math.round(s.x - ox - img.width / 2), Math.round(s.y - oy - img.height / 2));
    if (d.type === 'puddle') {
      addLight(s.x - ox, s.y - oy, 0, 8, '160,185,230',
        0.07 + 0.05 * Math.sin(gameTime * 1.7 + d.gx * 3));
    }
  }

  const draws = [];
  // Tall props reach far up-screen: a church roof is visible long before its
  // ground tiles are. Props are indexed across their whole footprint now, so
  // this band only has to cover height — be generous, it costs one cell row.
  for (const p of gatherNear(propCells, vx0 - 14, vy0 - 14, vx1 + 10, vy1 + 10, [])) {
    const s = isoToScreen(p.gx + 0.5, p.gy + 0.5);
    // volumes sort by their south corner: anything in front of that draws over
    const depth = (p.type === 'building' || p.type === 'canopy')
      ? isoToScreen(p.foot[0] + p.foot[2], p.foot[1] + p.foot[3]).y - 1
      : (p.foot ? s.y + (p.foot[2] + p.foot[3]) * 4 : s.y);
    draws.push({ depth, draw: () => drawProp(p, s.x - ox, s.y - oy) });
  }
  for (const sc of scrappers) {
    if (sc.state === 'off') continue;
    const s = isoToScreen(sc.x, sc.y);
    draws.push({ depth: s.y, draw: () => drawScrapper(sc, s.x - ox, s.y - oy) });
  }
  if (boss.active && boss.state !== 'hidden') {
    const s = isoToScreen(boss.x, boss.y);
    draws.push({ depth: s.y + 2, draw: () => drawBoss(s.x - ox, s.y - oy) });
    for (const sh of boss.shots) {
      const ss = isoToScreen(sh.x, sh.y);
      draws.push({ depth: ss.y + 1, draw: () => {
        ctx.fillStyle = '#ff8b45';
        ctx.fillRect(Math.round(ss.x - ox - 1), Math.round(ss.y - oy - 6), 3, 3);
        addLight(ss.x - ox, ss.y - oy - 5, 0, 9, '255,140,60', 0.3);
      }});
    }
  }
  for (const bd of bandits) {
    const s = isoToScreen(bd.x, bd.y);
    // bodies sort a hair behind the living, so nobody stands inside a corpse
    draws.push({ depth: s.y - (bd.dead ? 0.02 : 0), draw: () => drawBandit(bd, s.x - ox, s.y - oy) });
  }
  for (const b of foeBullets) {
    const s = isoToScreen(b.x, b.y);
    draws.push({ depth: s.y + 1, draw: () => {
      // theirs are red-hot, yours are amber — never confuse the two
      ctx.fillStyle = b.heavy ? '#ff6a4a' : '#ffa88c';
      const w = b.heavy ? 3 : 2;
      ctx.fillRect(Math.round(s.x - ox - 1), Math.round(s.y - oy - 6), w, w);
      addLight(s.x - ox, s.y - oy - 5, 0, b.heavy ? 13 : 9, '255,110,80', 0.32);
    }});
  }
  if (currentAreaDef().hasNpc) {
    const s = isoToScreen(npc.x, npc.y);
    draws.push({ depth: s.y, draw: () => drawNpc(s.x - ox, s.y - oy) });
  }
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
  if (SHACK) {
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
  ctx.fillStyle = currentAreaDef().tint || '#e6c092';
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

  // area transition fade
  if (Trans.active) {
    const a = Trans.t < 0.45 ? Trans.t / 0.45 : Math.max(0, 1 - (Trans.t - 0.45) / 0.55);
    ctx.fillStyle = `rgba(6,5,4,${Math.min(1, a)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);   // zoom never touches the post-process

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

// A tall prop standing between the camera and the player hides them. Fade any
// wall/gate the player is standing directly behind, so they never look like
// they are inside it.
function occlusionAlpha(p) {
  if (player.dead > 0) return 1;
  const dx = player.x - p.gx, dy = player.y - p.gy;
  // the player is "behind" it when they sit further from the camera (lower x+y)
  if (dx + dy > 0.6) return 1;
  const d = Math.hypot(dx, dy);
  if (d > 3.2) return 1;
  return 0.3 + 0.7 * Math.min(1, Math.max(0, (d - 1.2) / 2));
}

// A building's roof: a quad lifted to the facade height, styled by what the
// building is. Nothing is enterable yet, so roofs never fade.
const ROOF_LIFT = 46;
function drawRoof(p) {
  const [x0, y0, w, h] = p.foot;
  const lift = p.type === 'canopy' ? 40 : ROOF_LIFT;
  const c1 = isoToScreen(x0, y0), c2 = isoToScreen(x0 + w, y0);
  const c3 = isoToScreen(x0 + w, y0 + h), c4 = isoToScreen(x0, y0 + h);
  const P = (c, dy) => [c.x - lastOx, c.y - lastOy - lift + (dy || 0)];
  const quad = (a, b, c, d, fill, stroke) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  };
  const k = p.kind || 'B';
  const pitched = k === 'H' || k === 'R';
  if (pitched) {
    // two slopes meeting at a ridge down the long axis
    const along = w >= h;
    const midA = along ? isoToScreen(x0, y0 + h / 2) : isoToScreen(x0 + w / 2, y0);
    const midB = along ? isoToScreen(x0 + w, y0 + h / 2) : isoToScreen(x0 + w / 2, y0 + h);
    const RIDGE = k === 'R' ? 16 : 11;
    const rA = [midA.x - lastOx, midA.y - lastOy - lift - RIDGE];
    const rB = [midB.x - lastOx, midB.y - lastOy - lift - RIDGE];
    const dark = k === 'R' ? '#3e4450' : '#5d3b34';
    const light = k === 'R' ? '#4c5462' : '#71483f';
    if (along) {
      quad(P(c1), P(c2), rB, rA, light, '#2b2f36');
      quad(rA, rB, P(c3), P(c4), dark, '#2b2f36');
    } else {
      quad(P(c1), rA, rB, P(c4), light, '#2b2f36');
      quad(rA, P(c2), P(c3), rB, dark, '#2b2f36');
    }
    // ridge details
    ctx.strokeStyle = '#262a30'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(rA[0], rA[1]); ctx.lineTo(rB[0], rB[1]); ctx.stroke();
    if (k === 'R') {                                   // a cross on the ridge
      const cx2 = (rA[0] + rB[0]) / 2, cy2 = (rA[1] + rB[1]) / 2;
      ctx.fillStyle = '#8d8578';
      ctx.fillRect(Math.round(cx2), Math.round(cy2) - 12, 2, 12);
      ctx.fillRect(Math.round(cx2) - 3, Math.round(cy2) - 9, 8, 2);
    } else if (p.seed % 3 === 0) {                      // chimney
      const cx2 = rA[0] + (rB[0] - rA[0]) * 0.3, cy2 = rA[1] + (rB[1] - rA[1]) * 0.3;
      ctx.fillStyle = '#4a3a35';
      ctx.fillRect(Math.round(cx2), Math.round(cy2) - 9, 5, 10);
      ctx.fillStyle = '#5c4a44';
      ctx.fillRect(Math.round(cx2), Math.round(cy2) - 10, 5, 2);
    }
    return;
  }
  if (p.type === 'canopy') {
    // A CANOPY IS A SLAB, not a rectangle floating in the air. It has real
    // thickness: a deck on top, a fascia hanging off the two camera-facing
    // edges (the far two are behind it), and a shaded soffit underneath.
    const TH = 7;                                  // slab thickness in pixels
    // stand under it and it goes see-through, the same way the shack roof does
    const under = player.x > x0 - 1 && player.x < x0 + w + 1 &&
                  player.y > y0 - 1 && player.y < y0 + h + 1;
    ctx.globalAlpha = under ? 0.3 : 1;
    const D = (c) => P(c, -TH);                    // deck top (up-screen)
    const U = (c) => P(c, 0);                      // underside of the slab
    // soffit first — the lit ceiling over the pumps, seen past the near edges
    quad(U(c1), U(c2), U(c3), U(c4), '#3c4045');
    // deck
    quad(D(c1), D(c2), D(c3), D(c4), '#7e8286', '#2b2f36');
    // deck weathering, so the top isn't one dead grey
    ctx.globalAlpha = 0.35;
    quad(D(c1), D(c2),
         [D(c2)[0] + (D(c3)[0] - D(c2)[0]) * 0.4, D(c2)[1] + (D(c3)[1] - D(c2)[1]) * 0.4],
         [D(c1)[0] + (D(c4)[0] - D(c1)[0]) * 0.4, D(c1)[1] + (D(c4)[1] - D(c1)[1]) * 0.4],
         '#8d9195');
    ctx.globalAlpha = 1;
    // the two fascia faces you can actually see, each its own tone
    const fascia = (a, b2, lit, band) => {
      quad(D(a), D(b2), U(b2), U(a), lit, '#22262b');
      // red band across the fascia — the petrol-station signature
      const t0 = 0.28, t1 = 0.72;
      const mix = (p0, p1, t) => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
      quad(mix(D(a), U(a), t0), mix(D(b2), U(b2), t0),
           mix(D(b2), U(b2), t1), mix(D(a), U(a), t1), band);
    };
    fascia(c2, c3, '#787c80', '#b8433a');          // +x edge, catches the light
    fascia(c3, c4, '#5f6367', '#93362f');          // +y edge, in its own shade
    // strip lights under the deck
    const uc = [(U(c1)[0] + U(c3)[0]) / 2, (U(c1)[1] + U(c3)[1]) / 2];
    ctx.fillStyle = 'rgba(255,236,200,0.5)';
    for (let i = -1; i <= 1; i++) ctx.fillRect(Math.round(uc[0] - 14 + i * 14), Math.round(uc[1] - 1), 12, 2);
    ctx.globalAlpha = 1;
    addLight(uc[0], uc[1], 0, 44, '255,230,180', 0.16);
    return;
  }
  // flat roofs with a parapet lip
  const base = k === 'K' ? '#6f6a5a' : k === 'N' ? '#7c7768' : k === 'T' ? '#4e4642' : '#43474b';
  quad(P(c1), P(c2), P(c3), P(c4), base, '#2b2f36');
  quad(P(c1, -3), P(c2, -3), P(c3, -3), P(c4, -3), '#54585c', '#2b2f36');
  // rooftop clutter
  const cx = (P(c1)[0] + P(c3)[0]) / 2, cy = (P(c1)[1] + P(c3)[1]) / 2;
  if (k === 'O' || k === 'N' || k === 'T') {
    ctx.fillStyle = '#5e6266';
    ctx.fillRect(Math.round(cx - 8), Math.round(cy - 10), 9, 7);
    ctx.fillStyle = '#6e7276';
    ctx.fillRect(Math.round(cx - 8), Math.round(cy - 11), 9, 2);
    ctx.fillStyle = '#4a4e52';
    ctx.fillRect(Math.round(cx + 3), Math.round(cy - 6), 6, 5);
  } else if (k === 'K') {
    ctx.fillStyle = '#8d959b';                          // rooflights
    for (let i = -1; i <= 1; i++) ctx.fillRect(Math.round(cx + i * 9) - 3, Math.round(cy - 4), 6, 4);
    ctx.fillStyle = '#5a5e62';
    ctx.fillRect(Math.round(cx - 14), Math.round(cy - 9), 6, 7);   // water tank
  } else {
    ctx.fillStyle = '#4e5256';
    ctx.fillRect(Math.round(cx - 4), Math.round(cy - 7), 6, 5);     // vent
  }
  if (k === 'T') {                                       // hotel roof sign
    ctx.fillStyle = '#8a4a44';
    ctx.fillRect(Math.round(cx - 12), Math.round(cy - 18), 24, 7);
    ctx.fillStyle = '#c98a80';
    ctx.fillRect(Math.round(cx - 12), Math.round(cy - 18), 24, 1);
    addLight(cx, cy - 15, 0, 22, '220,120,110', 0.18);
  }
}

function drawProp(p, x, y) {
  const T = p.type;
  if (T === 'building') {
    // one pre-rendered volume: faces and roof already share their corners
    const bs = Sprites.makeBuilding(p.foot[2], p.foot[3], p.kind, p.seed);
    const a = isoToScreen(p.foot[0], p.foot[1]);
    ctx.drawImage(bs.img, Math.round(a.x - lastOx - bs.ax), Math.round(a.y - lastOy - bs.ay));
    return;
  }
  if (T === 'canopy') { drawRoof(p); return; }
  if (T === 'pylon') {
    ctx.drawImage(Sprites.pylonSign, Math.round(x - 11), Math.round(y - 54));
    addLight(x, y - 40, 0, 16, '255,225,190', 0.14);
    return;
  }
  if (T === 'pumpIsland') {
    ctx.drawImage(Sprites.pumpIsland, Math.round(x - 16), Math.round(y - 10));
    return;
  }
  if (T === 'wallSlice') {
    const a = occlusionAlpha(p);
    if (p.front) ctx.globalAlpha = (0.15 + roofAlpha * 0.85) * a;
    else if (a < 1) ctx.globalAlpha = a;
    ctx.drawImage(p.img, Math.round(x + p.dx), Math.round(y - p.lift + p.dy));
    ctx.globalAlpha = 1;
    return;
  }
  if (T === 'gate') {
    const set = p.open ? Sprites.gateOpen : Sprites.gateClosed;
    const img = set[p.dir || 'a'];
    const a = occlusionAlpha(p);
    if (a < 1) ctx.globalAlpha = a;
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - 40));
    ctx.globalAlpha = 1;
    if (!p.open) {
      // the lock glints — you need the key
      addLight(x, y - 18, 0, 9, '255,210,120', 0.14 + 0.06 * Math.sin(gameTime * 2));
    }
    return;
  }
  if (T === 'cornerCol') {
    const a = occlusionAlpha(p);
    if (p.front) ctx.globalAlpha = (0.15 + roofAlpha * 0.85) * a;
    else if (a < 1) ctx.globalAlpha = a;
    ctx.drawImage(Sprites.cornerCol, Math.round(x - 4), Math.round(y - 47));
    ctx.globalAlpha = 1;
    return;
  }
  if (T === 'post') {
    const img = p.big ? Sprites.postL : Sprites.postS;
    const a = occlusionAlpha(p);
    if (p.front) ctx.globalAlpha = (0.15 + roofAlpha * 0.85) * a;
    else if (a < 1) ctx.globalAlpha = a;
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
  // ---- city furniture ----
  if (T === 'streetlight') {
    img = Sprites.streetlight; oyOff = -44; drawShadow(x, y, 4);
    if (p.lit) {
      // the handful still burning are the only real light left on the street
      const flick = 0.86 + 0.14 * Math.sin(gameTime * 7 + p.gx);
      ctx.fillStyle = '#ffe9b0';
      ctx.fillRect(Math.round(x + 5), Math.round(y - 37), 2, 2);
      addLight(x + 6, y - 36, 0, 34 * flick, '255,214,140', 0.42 * flick);
      addLight(x + 2, y - 2, 0, 24, '255,214,140', 0.16 * flick);
    }
  }
  else if (T === 'trafficLight') { img = Sprites.trafficLight; oyOff = -40; drawShadow(x, y, 4); }
  else if (T === 'busStop') {
    // a shelter runs along its pavement, so it uses the sheared variant
    const set = Sprites.busStopIso;
    img = p.dir === 'y' ? set.y : set.x;
    oyOff = -26 - Math.round(Sprites.busStop.width * 0.25);
    drawShadow(x, y, 12);
  }
  else if (T === 'dumpster') { img = Sprites.dumpster; oyOff = -15; drawShadow(x, y, 9); }
  else if (T === 'hydrant') { img = Sprites.hydrant; oyOff = -12; drawShadow(x, y, 3); }
  else if (T === 'postbox') { img = Sprites.postbox; oyOff = -16; drawShadow(x, y, 4); }
  else if (T === 'sign') {
    const set = p.kind === 'cloth' ? Sprites.signClothDir : Sprites.signPlankDir;
    img = set[p.dir || 'xm'];
    const base = p.kind === 'cloth' ? 22 : 24;
    oyOff = -base - Math.round((p.kind === 'cloth' ? 32 : 28) * 0.25);
    drawShadow(x, y, 4);
  }
  else if (T === 'bus') {
    img = p.dir === 'y' ? Sprites.busIso.y : Sprites.busIso.x;
    oyOff = img.oy;
    drawShadow(x, y + 2, p.dir === 'y' ? 13 : 26);
  }
  else if (T === 'pump') {
    img = Sprites.fuelPump; oyOff = -22; drawShadow(x, y, 6);
    addLight(x + 1, y - 14, 0, 7, '122,210,122', 0.16);
  }
  // ---- roadblock furniture. Each of these was BUILT along one street
  // axis, so it must be DRAWN on that axis too: pick the variant by p.dir and
  // let the sprite's own oy put its footprint back under it.
  else if (T === 'barricade' || T === 'barricadeTall' || T === 'sandbags' ||
           T === 'conBlock' || T === 'razorWire' || T === 'stoneWall') {
    const set = Sprites[T];
    img = p.dir === 'y' ? set.y : set.x;
    oyOff = img.oy;
    drawShadow(x, y, T === 'razorWire' ? 10 : 13);
  }
  else if (T === 'brazier') {
    img = Sprites.brazier; oyOff = -19; drawShadow(x, y, 5);
    // the fire is the only warm light on this street, and it flickers
    const fl = 0.82 + 0.18 * Math.sin(gameTime * 9 + p.gx * 2.1) * Math.sin(gameTime * 3.7 + p.gy);
    addLight(x, y - 17, 0, 32 * fl, '255,146,66', 0.52 * fl);
    addLight(x, y - 2, 0, 20, '255,146,66', 0.18 * fl);
  }
  else if (T === 'banditFlag') { img = Sprites.banditFlag; oyOff = -34; drawShadow(x, y, 3); }
  else if (T === 'pillar') { img = Sprites.pillar; oyOff = -40; drawShadow(x, y, 5); }
  else if (T === 'boom') { img = Sprites.boomBarrel; oyOff = -15; drawShadow(x, y, 5); }
  else if (T === 'scrap') { img = Sprites.scrapPiles[p.v]; oyOff = -20; drawShadow(x, y, 9); }
  else if (T === 'car') {
    const set = p.dir === 'y' ? Sprites.carsIso.y : Sprites.carsIso.x;
    img = set[p.v % set.length];
    oyOff = img.oy;
    drawShadow(x, y + 1, 14);
  }
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

function drawBoss(x, y) {
  const b = boss;
  const rise = b.state === 'reveal' ? (1 - Math.min(1, b.t / 1.6)) * 22 : 0;
  const slump = b.state === 'stagger' ? 4 : (b.state === 'dead' ? 8 : 0);
  drawShadow(x, y + 2, 24);
  if (b.state === 'dead' && ((gameTime * 2) | 0) % 3 === 0) spawnSmoke(b.x, b.y, 1);

  const bodyY = y - 28 + rise + slump;
  const ph = b.walkPhase || 0;
  const moving = b.state === 'pursue' || (b.state === 'charge' && b.t <= 0);

  // FOUR LEGS — hull-coloured so they read clearly, stepping in diagonal pairs
  ctx.strokeStyle = '#5e5e6a';
  ctx.lineWidth = 3;
  const legs = [[-1, -1, 0], [1, -1, Math.PI], [-1, 1, Math.PI], [1, 1, 0]];
  for (const [sx2, sy2, phOff] of legs) {
    const lift = moving ? Math.max(0, Math.sin(ph + phOff)) * 3 : 0;
    const hipX = x + sx2 * 11, hipY = bodyY + 12 + sy2 * 3;
    const kneeX = x + sx2 * 20, kneeY = hipY - 6 - lift;
    const footX = x + sx2 * 25, footY = y + 2 + sy2 * 3 - lift * 2;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    ctx.fillStyle = '#6a6a76';
    ctx.fillRect(Math.round(footX) - 2, Math.round(footY) - 1, 4, 3);
  }
  ctx.lineWidth = 1;

  // TWO GRABBER CLAWS — the actual weapons. Wind-up: spread wide and raised.
  // Strike: both scythe inward across the front with slash trails.
  const fs = isoToScreen(b.fx, b.fy);
  const faceAngle = Math.atan2(fs.y, fs.x);
  let spread = 0.55, reach = 8, raise = 0, strikeS = 0;
  if (b.state === 'slam') {
    if (b.t > 0.15) {
      const w = Math.min(1, (0.7 - b.t) / 0.4);          // wind-up 0→1
      spread = 0.55 + w * 0.65;
      raise = -9 * w + Math.sin(gameTime * 30) * w;       // trembling with intent
      reach = 7;
    } else {
      strikeS = 1 - b.t / 0.15;                           // strike 0→1
      spread = 1.2 - strikeS * 1.05;                      // claws scythe together
      raise = -9 + strikeS * 13;
      reach = 7 + strikeS * 10;
    }
  } else if (b.state === 'charge' && b.t <= 0) {
    spread = 1.5; reach = 5;                              // tucked back while ramming
  } else if (b.state === 'cine2' && b.t > 0.4 && b.t < 1.5) {
    // RAGE: claws thrash wildly while the camera is on it
    spread = 0.9 + Math.sin(gameTime * 26) * 0.55;
    raise = -5 + Math.sin(gameTime * 31) * 4;
    reach = 9;
  }
  // slash trails while the claws sweep
  if (strikeS > 0.05) {
    ctx.strokeStyle = `rgba(255,242,192,${0.6 - strikeS * 0.4})`;
    ctx.lineWidth = 2;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x, bodyY + 12, 17, faceAngle + dir * 1.25 - dir * strikeS * 1.0, faceAngle + dir * 1.25, dir > 0);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }
  for (const dir of [-1, 1]) {
    const a = faceAngle + dir * spread;
    ctx.save();
    ctx.translate(x + Math.cos(a) * reach, bodyY + 12 + Math.sin(a) * reach * 0.55 + raise);
    ctx.rotate(a);
    if (Math.cos(a) < 0) ctx.scale(1, -1);
    ctx.drawImage(Sprites.bossArm, 6, -6);
    ctx.restore();
  }

  ctx.globalAlpha = b.state === 'dead' ? 0.85 : 1;
  ctx.drawImage(Sprites.bossBody, Math.round(x - 18), Math.round(bodyY));
  ctx.globalAlpha = 1;

  // FRONT ARMOR PLOW — the visibly hard zone. Bolted panels arc across the
  // facing side: this is the game showing "don't shoot here". The panels
  // swing OPEN during a stagger (that's why everything hits then).
  if (b.state !== 'dead' && b.state !== 'stagger' && b.state !== 'reveal') {
    const cy = bodyY + 13;
    ctx.strokeStyle = '#3a3a42';                        // plate mass
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.ellipse(x, cy, 19, 12, 0, faceAngle - 1.0, faceAngle + 1.0);
    ctx.stroke();
    ctx.strokeStyle = '#5a5a66';                        // lit top edge
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, cy - 2, 19, 12, 0, faceAngle - 0.95, faceAngle + 0.95);
    ctx.stroke();
    ctx.strokeStyle = '#22222a';                        // panel seams
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      const a = faceAngle + i * 0.42;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 13, cy + Math.sin(a) * 8);
      ctx.lineTo(x + Math.cos(a) * 24, cy + Math.sin(a) * 15.5);
      ctx.stroke();
    }
    // industrial hazard chevrons along the lower face of the plow
    ctx.lineWidth = 3;
    for (let i = -4; i < 4; i++) {
      ctx.strokeStyle = (i % 2 === 0) ? '#a8873a' : '#26262c';
      ctx.beginPath();
      ctx.ellipse(x, cy + 3, 18, 11, 0, faceAngle + i * 0.22, faceAngle + (i + 1) * 0.22);
      ctx.stroke();
    }
    // battle scuffs raked across the plates
    ctx.strokeStyle = 'rgba(205,210,220,0.3)';
    ctx.lineWidth = 1;
    for (const [ao, len] of [[-0.62, 4], [0.15, 6], [0.71, 3], [-0.2, 5]]) {
      const a = faceAngle + ao;
      const px2 = x + Math.cos(a) * 17, py2 = cy - 3 + Math.sin(a) * 10;
      ctx.beginPath();
      ctx.moveTo(px2 - len / 2, py2 - 1);
      ctx.lineTo(px2 + len / 2, py2 + 1);
      ctx.stroke();
    }
    ctx.fillStyle = '#7d7d8a';                          // upper rivet row
    for (let i = -3; i <= 3; i += 2) {
      const a = faceAngle + i * 0.28;
      ctx.fillRect(Math.round(x + Math.cos(a) * 19) - 1, Math.round(cy - 4 + Math.sin(a) * 12) - 1, 3, 3);
    }
    ctx.fillStyle = '#5c5c68';                          // lower rivet row, shadowed
    for (let i = -2; i <= 2; i += 2) {
      const a = faceAngle + i * 0.28 + 0.14;
      ctx.fillRect(Math.round(x + Math.cos(a) * 20) - 1, Math.round(cy + 5 + Math.sin(a) * 12) - 1, 2, 2);
    }
  } else if (b.state === 'stagger') {
    // plates hanging open at the sides — the whole machine is soft right now
    ctx.strokeStyle = '#3a3a42';
    ctx.lineWidth = 8;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x, bodyY + 13, 22, 14, 0, faceAngle + dir * 1.5, faceAngle + dir * 2.3, dir < 0);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  // REAR PANELS — thinner, battered plating over the back: exhaust grilles,
  // a hinge spine and heat scoring. Visibly weaker than the front plow.
  if (b.state !== 'dead' && b.state !== 'stagger' && b.state !== 'reveal') {
    const back = faceAngle + Math.PI;
    const cy = bodyY + 12;
    ctx.strokeStyle = '#43434c';                        // panel mass (thinner)
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(x, cy, 17, 11, 0, back - 0.85, back + 0.85);
    ctx.stroke();
    ctx.strokeStyle = '#585863';                        // lit edge
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, cy - 2, 17, 11, 0, back - 0.8, back + 0.8);
    ctx.stroke();
    ctx.strokeStyle = '#26262e';                        // two panel seams
    ctx.lineWidth = 1;
    for (const off of [-0.3, 0.3]) {
      const a = back + off;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 12, cy + Math.sin(a) * 7);
      ctx.lineTo(x + Math.cos(a) * 21, cy + Math.sin(a) * 13);
      ctx.stroke();
    }
    // exhaust grille slats
    ctx.strokeStyle = '#1c1c22';
    for (let i = -2; i <= 2; i++) {
      const a = back + i * 0.16;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 14, cy - 3 + Math.sin(a) * 9);
      ctx.lineTo(x + Math.cos(a) * 19, cy - 3 + Math.sin(a) * 12);
      ctx.stroke();
    }
    // heat scoring around the vents
    ctx.strokeStyle = 'rgba(120,70,40,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, cy - 4, 15, 10, 0, back - 0.4, back + 0.4);
    ctx.stroke();
    // hinge spine + bolts
    ctx.fillStyle = '#5c5c68';
    for (let i = -2; i <= 2; i++) {
      const a = back + i * 0.34;
      ctx.fillRect(Math.round(x + Math.cos(a) * 17) - 1, Math.round(cy + 2 + Math.sin(a) * 11) - 1, 2, 2);
    }
    ctx.lineWidth = 1;
  }

  // cutscene extras
  if (b.state === 'cine3') {
    // the real absorbed props, streaming in and healing it
    for (const a of (b.absorbs || [])) {
      if (a.done || b.t < a.t0) continue;
      const p = Math.min(1, (b.t - a.t0) / 0.45);
      const wx2 = a.x + (b.x - a.x) * p, wy2 = a.y + (b.y - a.y) * p;
      const s2 = isoToScreen(wx2, wy2);
      ctx.fillStyle = p > 0.8 ? '#7ad27a' : '#8a8a92';
      ctx.fillRect(Math.round(s2.x - lastOx) - 3, Math.round(s2.y - lastOy - 8 - p * 8), 6, 6);
    }
    // and the debris storm: dozens of chunks spiralling in from all sides
    for (const d of (b.debris || [])) {
      const p = (b.t - d.t0) / d.dur;
      if (p < 0 || p > 1) continue;
      const ang = d.ang + p * 1.8;                       // spiral as it's pulled in
      const dist = d.dist * (1 - p);
      const wx2 = b.x + Math.cos(ang) * dist, wy2 = b.y + Math.sin(ang) * dist;
      const s2 = isoToScreen(wx2, wy2);
      const sz = Math.max(1, Math.round(d.size * (1 - p * 0.5)));
      ctx.fillStyle = p > 0.85 ? '#7ad27a' : d.col;
      ctx.fillRect(Math.round(s2.x - lastOx) - (sz >> 1),
                   Math.round(s2.y - lastOy - 6 - p * 10), sz, sz);
    }
    addLight(x, bodyY + 12, 0, 28 + Math.sin(gameTime * 8) * 7, '122,210,122', 0.4);
  }


  // ONE BIG EYE — unmistakably the weak point: large, bright, pulsing
  if (b.state !== 'dead') {
    const e = bossEyePos();
    const es = isoToScreen(e.x, e.y);
    const ex = es.x - lastOx, ey = es.y - lastOy - 12 + rise + slump;
    const winding = (b.state === 'slam' || (b.state === 'charge' && b.t > 0) || b.state === 'cine2');
    const pulse = 0.5 + 0.5 * Math.sin(gameTime * 6);
    ctx.fillStyle = '#2a2a30';                    // eye housing ring
    ctx.beginPath();
    ctx.arc(Math.round(ex), Math.round(ey), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = winding && ((performance.now() / 90) | 0) % 2 ? '#ff5040' : '#ffb02e';
    ctx.beginPath();
    ctx.arc(Math.round(ex), Math.round(ey), 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff2c0';                    // iris glint
    ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 2, 2, 2);
    addLight(ex, ey, 0, 20 + pulse * 8, winding ? '255,90,60' : '255,176,46', 0.6);
  }
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
      // knife: one-armed forward thrust — blade length matches the hit range
      const reach = Math.sin(prog * Math.PI) * 7;         // out and back
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
      ctx.drawImage(Sprites.knifeHeld, Math.round(6 + reach), -4);
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
    // extended arm holding a properly detailed pistol, flipped so the
    // grip stays down when aiming left
    ctx.save();
    ctx.translate(x, y - 9);
    ctx.rotate(player.angle);
    if (Math.cos(player.angle) < 0) ctx.scale(1, -1);
    ctx.fillStyle = '#26262c';           // coat sleeve
    ctx.fillRect(1, -1, 4, 2);
    ctx.drawImage(Sprites.pistolHeld, 5, -5);
    ctx.fillStyle = '#0e0e12';           // gloved hand wrapping the grip
    ctx.fillRect(7, -1, 3, 2);
    ctx.restore();

    if (player.muzzle > 0) {
      const mx = x + Math.cos(player.angle) * 16;
      const my = y - 9 + Math.sin(player.angle) * 9;
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

// A raider. Deliberately NOT drawn like a machine: no eye glow, no amber
// hurt-light, and the hit flash is a pale wash rather than a shower of sparks.
// The only thing that lights up on this street is the rifle's aim line.
function drawBandit(b, x, y) {
  if (b.dead) {
    const im = Sprites.banditDead;
    ctx.globalAlpha = b.looted ? 0.5 : 1;
    ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height + 4));
    ctx.globalAlpha = 1;
    return;
  }
  drawShadow(x, y, 6);
  const attacking = b.state === 'windup' || b.state === 'swing';
  let img;
  if (b.role === 'knife') {
    const set = Sprites.banditKnife[b.v % Sprites.banditKnife.length];
    img = attacking ? set[2] : set[b.frame];
  } else if (b.role === 'pistol') {
    img = b.state === 'aim' ? Sprites.banditPistol[2] : Sprites.banditPistol[b.frame];
  } else {
    img = b.state === 'aim' ? Sprites.banditRifle[2] : Sprites.banditRifle[b.frame];
  }
  const dx = Math.round(x - img.width / 2), dy = Math.round(y - img.height + 1);
  ctx.drawImage(img, dx, dy);
  if (b.hitFlash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(img, dx, dy);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  // THE TELL. The rifle takes a full second to line you up and it shows you
  // the line while it does. Break it — step behind the barricade, put a wreck
  // between you — and the shot is thrown away. This is the whole counterplay.
  if (b.state === 'aim') {
    const ps = isoToScreen(player.x, player.y);
    const t = Math.min(1, b.aimT / (BANDIT_ROLES[b.role].aim || 1));
    ctx.globalAlpha = (b.role === 'rifle' ? 0.16 + 0.54 * t : 0.1 + 0.24 * t);
    ctx.strokeStyle = b.role === 'rifle' ? '#ff5a3c' : '#ffa07a';
    ctx.beginPath();
    ctx.moveTo(Math.round(x), Math.round(y - 12));
    ctx.lineTo(Math.round(ps.x - lastOx), Math.round(ps.y - lastOy - 10));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (b.muzzle > 0) {
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(Math.round(x + 6), Math.round(y - 13), 3, 2);
    addLight(x + 7, y - 12, 0, 16, '255,210,130', 0.5);
  }
  if (b.state === 'windup') {
    ctx.fillStyle = ((performance.now() / 80) | 0) % 2 ? '#ff5a3c' : '#ffb02e';
    ctx.fillRect(Math.round(x - 1), Math.round(y - 25), 2, 2);
  }
  // suspicion, in the same language the machines use — eye plus bar
  if (b.state === 'guard' && b.alert > 0.03) {
    const ay = Math.round(y - 29);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(Math.round(x - 12), ay - 1, 24, 5);
    ctx.fillStyle = '#e8eef5';
    ctx.fillRect(Math.round(x - 10), ay, 3, 3);
    ctx.fillStyle = '#1a1c22';
    ctx.fillRect(Math.round(x - 9), ay + 1, 1, 1);
    ctx.fillStyle = '#3a3e48';
    ctx.fillRect(Math.round(x - 5), ay + 1, 14, 2);
    ctx.fillStyle = b.alert > 0.7 ? '#ff5a3c' : '#e8eef5';
    ctx.fillRect(Math.round(x - 5), ay + 1, Math.round(14 * Math.min(1, b.alert)), 2);
  }
  if (b.hp < b.maxHp) {
    const frac = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(Math.round(x - 8), Math.round(y - 23), 16, 2);
    ctx.fillStyle = `hsl(${Math.round(112 * frac)}, 62%, 46%)`;
    ctx.fillRect(Math.round(x - 8), Math.round(y - 23), Math.round(16 * frac), 2);
  }
}

function drawScrapper(s, x, y) {
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
  if (player.melee && player.hasGun && player.scrollHintT > 0) {
    ptext('scroll', VIEW_W - 33, VIEW_H - 27, 7, 'rgba(232,217,192,0.35)', 'center');
  }

  // minimap — whole map when small, a scrolling window when the area is big
  const mw = mmWindowed ? MM_VIEW * MMS : minimap.width;
  const mh = mmWindowed ? MM_VIEW * MMS : minimap.height;
  const mx = VIEW_W - mw - 6, my = 6;
  let srcX = 0, srcY = 0;
  if (mmWindowed) {
    srcX = Math.max(0, Math.min(minimap.width - mw, player.x * MMS - mw / 2));
    srcY = Math.max(0, Math.min(minimap.height - mh, player.y * MMS - mh / 2));
  }
  uiRect(mx - 2, my - 2, mw + 4, mh + 4, 'rgba(0,0,0,0.5)');
  g.globalAlpha = 0.9;
  g.imageSmoothingEnabled = false;
  g.drawImage(minimap, srcX, srcY, mw, mh, mx * U, my * U, mw * U, mh * U);
  g.globalAlpha = 1;
  function blip(wx, wy, col) {
    const px2 = mx + wx * MMS - srcX - 1, py2 = my + wy * MMS - srcY - 1;
    if (px2 < mx - 1 || py2 < my - 1 || px2 > mx + mw || py2 > my + mh) return;
    uiRect(px2, py2, 2, 2, col);
  }
  for (const it of items) blip(it.x, it.y, '#ffd27a');
  if (currentAreaDef().hasNpc) blip(npc.x, npc.y, '#7ad27a');
  for (const ex of (currentAreaDef().exits || [])) {
    if (ex.needsGate && !(gateProp && gateProp.open)) continue;
    blip((ex.x0 + ex.x1) / 2, (ex.y0 + ex.y1) / 2, '#4fc3ff');
  }
  for (const sc of scrappers) {
    if (sc.state !== 'dead' && sc.state !== 'off' &&
        Math.hypot(sc.x - player.x, sc.y - player.y) < 8)
      blip(sc.x, sc.y, '#ff5a3c');
  }
  blip(player.x, player.y, '#ffffff');
  g.strokeStyle = '#5a4a38';
  g.lineWidth = U;
  g.strokeRect((mx - 1.5) * U, (my - 1.5) * U, (mw + 3) * U, (mh + 3) * U);

  // boss health bar (top center)
  if (boss.active && boss.state !== 'hidden' && boss.state !== 'dead' && boss.state !== 'reveal') {
    ptext(boss.name, VIEW_W / 2, 6, 8, '#ff5040', 'center');
    uiRect(VIEW_W / 2 - 86, 17, 172, 7, 'rgba(0,0,0,0.6)');
    uiRect(VIEW_W / 2 - 84, 19, 168, 3, '#3a1410');
    uiRect(VIEW_W / 2 - 84, 19, Math.round(168 * Math.max(0, boss.hp) / boss.maxHp), 3, '#ff5040');
  }

  // thought bubble — the traveller's inner voice
  if (Thoughts.t > 0 && player.dead <= 0) {
    const ps = isoToScreen(player.x, player.y);
    const bx = ps.x - lastOx, byy = ps.y - lastOy - 30;
    const lines = ptWrap(Thoughts.text, 26);
    let w = 0;
    for (const l of lines) w = Math.max(w, ptWidth(l, 8));
    const bw = w + 12, bh = lines.length * 10 + 8;
    const alpha = Math.min(1, Thoughts.t);
    uictx.globalAlpha = alpha;
    uiRect(bx - bw / 2, byy - bh, bw, bh, 'rgba(12,10,8,0.92)');
    uictx.strokeStyle = '#5a4a38';
    uictx.lineWidth = U;
    uictx.strokeRect((bx - bw / 2) * U, (byy - bh) * U, bw * U, bh * U);
    // tail: three shrinking dots toward the head (thought, not speech)
    uiRect(bx - 2, byy + 2, 3, 3, 'rgba(12,10,8,0.92)');
    uiRect(bx - 5, byy + 6, 2, 2, 'rgba(12,10,8,0.92)');
    for (let i = 0; i < lines.length; i++) {
      ptext(lines[i], bx, byy - bh + 4 + i * 10, 8, '#e8dcc8', 'center', alpha);
    }
    uictx.globalAlpha = 1;
  }

  // crosshair reticle during boss fights — glows amber over the weak point
  if (boss.active && boss.state !== 'dead' && boss.state !== 'hidden' &&
      player.hasGun && player.active === 'gun' && player.dead <= 0) {
    const e = bossEyePos();
    const onEye = Math.hypot(Input.worldX - e.x, Input.worldY - e.y) < 0.55;
    const rc = onEye ? '#ffb02e' : 'rgba(232,217,192,0.7)';
    const mx2 = Input.mouseX, my2 = Input.mouseY;
    const gap = onEye ? 3 : 2, len = onEye ? 4 : 3;
    uiRect(mx2 - gap - len, my2, len, 1, rc);
    uiRect(mx2 + gap + 1, my2, len, 1, rc);
    uiRect(mx2, my2 - gap - len, 1, len, rc);
    uiRect(mx2, my2 + gap + 1, 1, len, rc);
  }

  // mission objective (top-left)
  if (mission.state === 'active' || mission.state === 'complete') {
    ptext('*', 8, 8, 8, '#ffd27a');
    ptext(mission.state === 'active'
      ? `Destroy Scrappers - loot scrap ${Math.min(player.inv.scrap, 5)}/5`
      : 'Return to the survivor', 16, 8, 8);
  }

  // street signs read themselves when you get close
  if (typeof signs !== 'undefined' && signs.length && !Dialog.active && !Trade.open) {
    let near = null, nd = 3.2;
    for (const s of signs) {
      const d = Math.hypot(player.x - s.gx, player.y - s.gy);
      if (d < nd) { nd = d; near = s; }
    }
    if (near) {
      const ss = isoToScreen(near.gx, near.gy);
      const tx = ss.x - lastOx, ty = ss.y - lastOy - 40;
      const w = ptWidth(near.text, 8);
      const a = Math.min(1, (3.2 - nd) * 1.6);
      uictx.globalAlpha = a;
      uiRect(tx - w / 2 - 4, ty - 3, w + 8, 12, 'rgba(10,14,12,0.85)');
      uictx.strokeStyle = '#3d5a4c';
      uictx.lineWidth = U;
      uictx.strokeRect((tx - w / 2 - 4) * U, (ty - 3) * U, (w + 8) * U, 12 * U);
      uictx.globalAlpha = 1;
      ptext(near.text, tx, ty - 1, 8, '#9fd6b4', 'center', a);
    }
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

  // THE MAP — everywhere you have walked, and nothing you haven't
  if (MapUI.open) {
    uiRect(0, 0, VIEW_W, VIEW_H, 'rgba(6,7,8,0.9)');
    const pad = 16, top = 22;
    const availW = VIEW_W - pad * 2, availH = VIEW_H - top - 20;
    const sc = Math.min(availW / MAP_W, availH / MAP_H);
    const mw2 = MAP_W * sc, mh2 = MAP_H * sc;
    const mx2 = (VIEW_W - mw2) / 2, my2 = top + (availH - mh2) / 2;
    ptext(currentAreaDef().name, VIEW_W / 2, 8, 8, '#ffd27a', 'center');
    uictx.strokeStyle = '#3a4a52';
    uictx.lineWidth = U;
    uictx.strokeRect((mx2 - 2) * U, (my2 - 2) * U, (mw2 + 4) * U, (mh2 + 4) * U);
    // explored cells only
    for (let j = 0; j < fogH; j++) {
      for (let i = 0; i < fogW; i++) {
        if (!explored[j * fogW + i]) continue;
        const tx = i * FOG, ty = j * FOG;
        let road = 0, build = 0, n = 0;
        for (let y = ty; y < Math.min(MAP_H, ty + FOG); y++)
          for (let x = tx; x < Math.min(MAP_W, tx + FOG); x++) {
            n++;
            if (solid[y][x]) build++;
            else if (ground[y][x] === 4 || ground[y][x] === 5 || ground[y][x] === 7) road++;
          }
        if (!n) continue;
        const col = build > n * 0.5 ? '#4c5054' : road > n * 0.3 ? '#8d959b' : '#3a4238';
        uiRect(mx2 + i * FOG * sc, my2 + j * FOG * sc, FOG * sc + 0.6, FOG * sc + 0.6, col);
      }
    }
    // landmarks you have actually seen
    if (typeof signs !== 'undefined') {
      for (const s of signs) {
        if (!isExplored(s.gx, s.gy)) continue;
        uiRect(mx2 + s.gx * sc - 1, my2 + s.gy * sc - 1, 2, 2, '#7ad27a');
      }
    }
    for (const ex of (currentAreaDef().exits || [])) {
      if (ex.needsGate && !(gateProp && gateProp.open)) continue;
      const ex2 = (ex.x0 + ex.x1) / 2, ey2 = (ex.y0 + ex.y1) / 2;
      if (isExplored(ex2, ey2)) uiRect(mx2 + ex2 * sc - 1.5, my2 + ey2 * sc - 1.5, 3, 3, '#4fc3ff');
    }
    // you — a tiny version of the traveller, with a ring so you can find him
    const pxm = mx2 + player.x * sc, pym = my2 + player.y * sc;
    // No ring — the marker IS the traveller. Drawn full size and pixel-snapped
    // so it is the same character you are looking at down in the street.
    const pim = Sprites.player[0];
    uictx.imageSmoothingEnabled = false;
    uictx.drawImage(pim, Math.round(pxm - pim.width / 2) * U, Math.round(pym - pim.height + 3) * U,
                    pim.width * U, pim.height * U);
    ptext('walked ground only  ·  M or ESC to close', VIEW_W / 2, VIEW_H - 12, 7, 'rgba(232,217,192,0.5)', 'center');
    return;
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
