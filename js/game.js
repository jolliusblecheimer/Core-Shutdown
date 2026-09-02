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
  giveRounds('pistol', 60); giveRounds('rifle', 60);
  chamber('pistol'); chamber('rifle');
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
// ash off the burning tank farm on the west edge — a second, heavier fall,
// only drawn where the fire can actually reach you
const ashFall = Array.from({ length: 90 }, () => ({
  x: Math.random() * VIEW_W,
  y: Math.random() * VIEW_H,
  s: Math.random(),
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
  if (e.button === 2) { Input.rDown = true; Input.rPressed = true; }
});
// scroll wheel switches the active weapon
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  // The pack swallows the wheel. It must not switch weapons behind an open
  // pack (this listener writes player.active directly, bypassing updatePlayer)
  // and it must not change page either — pages are chosen by clicking them.
  if (InvUI.open) return;
  // The map swallows it too, and spends it as zoom on the next frame.
  if (MapUI.open) { MapUI.wheel += e.deltaY; return; }
  if (player.melee && player.hasGun) {
    player.active = player.active === 'gun' ? 'melee' : 'gun';
    SFX.switchW();
    showMsg(player.active === 'gun'
      ? 'SCRAP PISTOL selected'
      : MELEE[player.melee].label.toUpperCase() + ' selected', 1);
  }
}, { passive: false });
window.addEventListener('mouseup', e => {
  if (e.button === 0) Input.mouseDown = false;
  if (e.button === 2) Input.rDown = false;
});

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
  TILESETS[8] = Sprites.flag;    TILESETS[9] = Sprites.flagWorn;
  TILESETS[10] = Sprites.straw;  TILESETS[11] = Sprites.crypt;
  // the Fringe's three edges — see design/finish-the-fringe.md
  TILESETS[12] = Sprites.ash;    TILESETS[13] = Sprites.water;
  TILESETS[14] = Sprites.deck;  TILESETS[15] = Sprites.scorch;
  TILESETS[16] = Sprites.tunnel; TILESETS[17] = Sprites.runway;
  TILESETS[18] = Sprites.apron;
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

// ---------- THE MAP ----------
// One continuous view. `zoom` is pixels per tile and `cx,cy` is the centre in
// WORLD tile coordinates, so framing one area and framing the whole city are
// the same draw call with a different number — there is no second "world view"
// to keep in sync with the area view.
const MapUI = {
  open: false,
  zoom: 1, cx: 0, cy: 0,
  sel: null, hits: [], questHit: null, areaHits: [],
  focus: null,              // the area you have clicked into, or null for the ring
  log: false,               // is the right column showing the ledger?
  logScroll: 0, logH: 0,    // the ledger outgrows the column, so it scrolls
  wheel: 0,                 // accumulated by the wheel listener, spent per frame
  drag: null,               // {x, y, cx, cy, moved} while the button is down
  tw: null,                 // {z0,z1,cx0,cx1,cy0,cy1,t,dur} while it is gliding
};
// The map no longer owns the whole screen: a fixed column down the right side
// carries the objective and the ledger, and the map draws into what is left.
// Every projection below measures from MAP_VIEW_W, never from VIEW_W — get that
// wrong in one place and the dots sit next to the ground they belong on.
const MAP_PANEL_W = 112;
const MAP_VIEW_W = VIEW_W - MAP_PANEL_W;
// the column's body, top and bottom. Shared, because the scroll clamp and the
// clip rectangle disagreeing by 24px is how a ledger ends in blank panel.
const MAP_COL_TOP = 18, MAP_COL_BOT = VIEW_H - 6;
const MAP_TOP = 18, MAP_VIEW_H = VIEW_H - 18 - 16;
const ZOOM_MAX = 4;

// Each area you have walked keeps a thumbnail of what you know of it: one
// pixel per fog cell, the same building/road/ground colours the map has always
// used. Rebuilt when the map opens — the world is frozen while it is up, so
// fog cannot change underneath it — and only for the area you are standing in,
// because that is the only one whose tile arrays are live.
const mapThumbs = {};
function buildMapThumb(areaId) {
  const c = makeCanvas(fogW, fogH), g2 = c.getContext('2d');
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
      g2.fillStyle = build > n * 0.5 ? '#4c5054' : road > n * 0.3 ? '#8d959b' : '#3a4238';
      g2.fillRect(i, j, 1, 1);
    }
  }
  // A memory is not a district. It never gets a thumbnail, so it can never be
  // drawn, framed by the zoom floor, or counted as somewhere you have been.
  if (Areas[areaId] && Areas[areaId].memory) return;
  // NEITHER IS GROUND YOU HAVE NOT WALKED. A thumbnail existing is what makes
  // the world map draw an area's rectangle, frame it and label it — so an
  // all-fog area would be an empty box with a name on it, on a map whose one
  // promise is that it shows nowhere you have not been. Starting a new run in
  // the same page session used to do exactly that: the wipe cleared the
  // thumbnails, then walking into the prologue photographed the area being
  // left on the way out, blank fog and all.
  let seen = false;
  for (let i = 0; i < explored.length; i++) if (explored[i]) { seen = true; break; }
  if (!seen) { delete mapThumbs[areaId]; return; }
  mapThumbs[areaId] = c;
}

const POI_ICON = {};   // filled once Sprites exists (sprites.js loads first)
function initPoiIcons() {
  POI_ICON.camp = Sprites.icoCamp;
  POI_ICON.site = Sprites.icoSite;
  POI_ICON.gate = Sprites.icoGate;
  POI_ICON.landmark = Sprites.icoLandmark;
  POI_ICON.sign = Sprites.icoSign;
}
initPoiIcons();

const poiWorldX = (p) => Areas[p.area].world.x + p.x;
const poiWorldY = (p) => Areas[p.area].world.y + p.y;

// A place is KNOWN when its tile is explored — nothing else is stored, and
// nothing new is saved. Its own area's fog answers it; for areas you are not
// standing in, that fog is still in exploredByArea.
function poiKnown(p) {
  const fog = exploredByArea[p.area];
  if (!fog) return false;
  // an area's thumbnail is exactly fogW x fogH for that area, so it carries the
  // row stride for areas whose tile arrays are not the live ones
  const fw = p.area === currentArea ? fogW : (mapThumbs[p.area] || {}).width;
  if (!fw) return false;
  const i = Math.floor(p.x / FOG), j = Math.floor(p.y / FOG);
  const k = j * fw + i;
  return i >= 0 && j >= 0 && i < fw && k < fog.length && fog[k] === 1;
}

// DECLUTTER BY ZOOM. Pull back far enough and only the things you would
// actually navigate by survive — otherwise the city becomes a pile of icons.
function visiblePois() {
  const z = MapUI.zoom;
  // Calibrated to what the areas actually FIT at, not to round numbers: the
  // city is 200x150 on a 320x180 screen, so "framed on the Fringe" is about
  // 0.9 px/tile and "the whole ring" is 0.81. A threshold at 1 would have hidden
  // the landmarks at every zoom you ever actually look at the city from.
  const keep = z >= 1.8 ? ['camp', 'site', 'gate', 'landmark', 'sign']
             : z >= 0.85 ? ['camp', 'site', 'gate', 'landmark']
             : ['camp', 'site', 'gate'];
  const out = [];
  for (const id of Object.keys(Areas)) {
    if (Areas[id].indoors) continue;              // rooms are not places on the map
    for (const p of poisFor(id)) {
      if (!keep.includes(p.kind)) continue;
      if (!poiKnown(p)) continue;
      out.push(p);
    }
  }
  return out;
}

// Somewhere you can go, and whether you may go there right now.
// Camps only, discovered only, and never with something on your heels.
function travelState(p) {
  if (!p.travel) return null;
  if (p.area === currentArea && Math.hypot(player.x - p.travel.x, player.y - p.travel.y) < 6)
    return { ok: false, text: "YOU'RE HERE" };
  if (beingHunted()) return { ok: false, text: 'NOT WHILE HUNTED' };
  return { ok: true, text: '[E] TRAVEL' };
}
// The bounding box, in world tiles, of everywhere you have walked. One source
// for the zoom floor, the opening frame and the "back out to the ring" click.
function mapWorldBox() {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const id of Object.keys(Areas)) {
    const th = mapThumbs[id];
    if (!th || (Areas[id].indoors && id !== currentArea)) continue;
    const w = Areas[id].world;
    x0 = Math.min(x0, w.x); y0 = Math.min(y0, w.y);
    x1 = Math.max(x1, w.x + th.width * FOG); y1 = Math.max(y1, w.y + th.height * FOG);
  }
  if (!isFinite(x0)) return null;
  return { x0, y0, x1, y1 };
}

// A frame is a zoom and a centre. `mapFit` turns any world box into the one
// that shows all of it with a margin, so framing the ring and framing one area
// are the same arithmetic — which is why they can never disagree about scale.
function mapFit(box, pad) {
  const w = Math.max(1, box.x1 - box.x0), h = Math.max(1, box.y1 - box.y0);
  return {
    zoom: Math.max(0.05, Math.min(ZOOM_MAX, Math.min((MAP_VIEW_W - pad) / w, (MAP_VIEW_H - pad) / h))),
    cx: (box.x0 + box.x1) / 2,
    cy: (box.y0 + box.y1) / 2,
  };
}
function mapFrameWorld() {
  const box = mapWorldBox();
  return box ? mapFit(box, 26) : { zoom: 1, cx: 0, cy: 0 };
}
function mapFrameArea(id) {
  const th = mapThumbs[id], w = Areas[id].world;
  if (!th) return mapFrameWorld();
  return mapFit({ x0: w.x, y0: w.y, x1: w.x + th.width * FOG, y1: w.y + th.height * FOG }, 12);
}
// Glide to a frame rather than snapping to it. A cut between two scales of the
// same picture reads as a different picture; a quarter-second of travel is what
// tells you the ring you were looking at and the area you are now in are the
// same map.
function mapGoto(f) {
  MapUI.tw = { z0: MapUI.zoom, z1: f.zoom, cx0: MapUI.cx, cx1: f.cx,
               cy0: MapUI.cy, cy1: f.cy, t: 0, dur: 0.22 };
}

// M OPENS THE WHOLE RING. Laurens, 2026-08-31: the map used to open framed on
// the area you were standing in, so everywhere else you had ever been was a
// scroll away and most players never found it. It opens on everything you know
// now — in true relative scale, the areas where they actually are — and you
// click an area to drop into it. The old behaviour is one click away instead of
// one discovery away, which is the right way round.
function openMap() {
  buildMapThumb(currentArea);
  const f = mapFrameWorld();
  MapUI.zoom = f.zoom; MapUI.cx = f.cx; MapUI.cy = f.cy;
  MapUI.focus = null;
  MapUI.sel = null;
  MapUI.drag = null;
  MapUI.tw = null;
  MapUI.wheel = 0;
  MapUI.logScroll = 0;
}

// The floor of the zoom is whatever frames every area you know at once, so you
// can never pull back into empty black. Recomputed as the world grows.
function mapZoomMin() {
  const box = mapWorldBox();
  if (!box) return 1;
  return Math.max(0.05, Math.min((MAP_VIEW_W - 24) / (box.x1 - box.x0),
                                 (MAP_VIEW_H - 24) / (box.y1 - box.y0)));
}

function updateMap(dt) {
  const zMin = Math.min(mapZoomMin(), ZOOM_MAX);
  const overPanel = Input.mouseX >= MAP_VIEW_W;

  // ---- a frame in flight owns the camera until it lands
  if (MapUI.tw) {
    const t = MapUI.tw;
    t.t += dt;
    const k = Math.min(1, t.t / t.dur), e = k * k * (3 - 2 * k);   // smoothstep
    MapUI.zoom = t.z0 + (t.z1 - t.z0) * e;
    MapUI.cx = t.cx0 + (t.cx1 - t.cx0) * e;
    MapUI.cy = t.cy0 + (t.cy1 - t.cy0) * e;
    if (k >= 1) MapUI.tw = null;
    // the wheel and the mouse are ignored while it glides — a grab mid-flight
    // used to leave the tween fighting the drag for the same two numbers
    MapUI.wheel = 0;
    MapUI.drag = null;
  } else if (MapUI.wheel) {
    // ---- wheel scrolls the ledger over the column, and zooms over the map
    const before = MapUI.wheel;
    MapUI.wheel = 0;
    if (overPanel && MapUI.log) {
      MapUI.logScroll = Math.max(0, Math.min(Math.max(0, MapUI.logH - (MAP_COL_BOT - MAP_COL_TOP)),
                                             MapUI.logScroll + before * 0.35));
    } else {
      // zoom ABOUT THE CURSOR, so you push toward what you are looking at
      const mxw = MapUI.cx + (Input.mouseX - MAP_VIEW_W / 2) / MapUI.zoom;
      const myw = MapUI.cy + (Input.mouseY - (MAP_TOP + MAP_VIEW_H / 2)) / MapUI.zoom;
      const next = Math.max(zMin, Math.min(ZOOM_MAX, MapUI.zoom * Math.pow(0.9, before / 100)));
      if (next !== MapUI.zoom) {
        MapUI.zoom = next;
        MapUI.cx = mxw - (Input.mouseX - MAP_VIEW_W / 2) / next;
        MapUI.cy = myw - (Input.mouseY - (MAP_TOP + MAP_VIEW_H / 2)) / next;
        // pulling back out past the area you clicked into leaves it, so the
        // header stops claiming you are in a district you can no longer see
        if (MapUI.focus && next < mapFrameArea(MapUI.focus).zoom * 0.75) MapUI.focus = null;
      }
    }
  }
  if (MapUI.zoom < zMin) MapUI.zoom = zMin;

  // ---- drag to pan. A press that travels less than three pixels is a click.
  if (Input.mouseDown && !MapUI.tw) {
    if (!MapUI.drag) MapUI.drag = { x: Input.mouseX, y: Input.mouseY, cx: MapUI.cx, cy: MapUI.cy,
                                    moved: 0, panel: overPanel };
    const d = MapUI.drag;
    d.moved = Math.max(d.moved, Math.hypot(Input.mouseX - d.x, Input.mouseY - d.y));
    if (d.moved >= 3 && !d.panel) {
      MapUI.cx = d.cx - (Input.mouseX - d.x) / MapUI.zoom;
      MapUI.cy = d.cy - (Input.mouseY - d.y) / MapUI.zoom;
    }
  } else if (MapUI.drag) {
    const wasClick = MapUI.drag.moved < 3;
    MapUI.drag = null;
    if (wasClick) mapClick(Input.mouseX, Input.mouseY);
  } else if (Input.pressed['LMB']) {
    // A press AND its release can both land between two frames — a trackpad tap,
    // or a slow frame. Then `mouseDown` was never true when the map looked, no
    // drag ever opened, and the release branch above had nothing to close: the
    // click simply vanished. The latch from the mousedown event did see it.
    mapClick(Input.mouseX, Input.mouseY);
  }

  // ---- L opens and closes the ledger
  if (Input.pressed['KeyL']) {
    Input.pressed['KeyL'] = false;
    MapUI.log = !MapUI.log;
    MapUI.logScroll = 0;
    SFX.blip();
  }
  // arrow keys pan too, for anyone not using a mouse
  const pan = 90 * dt / MapUI.zoom;
  if (Input.keys['ArrowLeft']) MapUI.cx -= pan;
  if (Input.keys['ArrowRight']) MapUI.cx += pan;
  if (Input.keys['ArrowUp']) MapUI.cy -= pan;
  if (Input.keys['ArrowDown']) MapUI.cy += pan;

  // ---- E travels, when the selected place will have you
  if (Input.pressed['KeyE']) {
    Input.pressed['KeyE'] = false;
    if (MapUI.sel) {
      const t = travelState(MapUI.sel);
      if (t && t.ok) fastTravel(MapUI.sel);
      else if (t) { SFX.deny(); showMsg(t.text === 'NOT WHILE HUNTED'
        ? "Not with something on your heels." : 'You are already there.', 2); }
    }
  }
  Input.pressed['LMB'] = false;
}

// Click a place to select it, an area to drop into it, empty black to back out.
function mapClick(mx, my) {
  // the column has its own click: the header toggles the ledger
  if (mx >= MAP_VIEW_W) {
    if (my < MAP_TOP) { MapUI.log = !MapUI.log; MapUI.logScroll = 0; SFX.blip(); }
    return;
  }
  let best = null, bd = 7;
  for (const h of (MapUI.hits || [])) {
    const d = Math.hypot(mx - h.x, my - h.y);
    if (d < bd) { bd = d; best = h.poi; }
  }
  // The objective answers too — clicking it says what you are meant to be doing.
  // It COMPETES on distance rather than winning outright: the shelter objective
  // sits eight tiles from Candlelight's own pin, which is inside the click
  // radius once you are pulled back, so an unconditional override meant you
  // could not select the camp to travel to it for as long as it was the thing
  // you were being sent to.
  const obj = currentObjective();
  if (obj && MapUI.questHit) {
    const qd = Math.hypot(mx - MapUI.questHit.x, my - MapUI.questHit.y);
    if (qd < bd) {
      bd = qd;
      best = { id: '__obj', name: obj.title.toUpperCase(), blurb: obj.detail, kind: 'quest' };
    }
  }
  if (best) { if (best !== MapUI.sel) SFX.blip(); MapUI.sel = best; return; }

  // NOTHING PINNED UNDER THE CURSOR — so the click is about the ground itself.
  // Landing on an area frames that area; landing on black backs out to the ring.
  // A pin always wins, because a pin is smaller and harder to hit on purpose.
  const hitArea = (MapUI.areaHits || []).find(a =>
    mx >= a.x && my >= a.y && mx < a.x + a.w && my < a.y + a.h);
  MapUI.sel = null;
  if (hitArea && hitArea.id !== MapUI.focus) {
    MapUI.focus = hitArea.id;
    mapGoto(mapFrameArea(hitArea.id));
    SFX.uiOpen();
  } else if (MapUI.focus || !hitArea) {
    MapUI.focus = null;
    mapGoto(mapFrameWorld());
    SFX.blip();
  }
}

// ---------- THE COLUMN: what you are doing, and what you have already done ----
// The map could always answer "where", and the green dot could answer "where
// next" — but only if the thing you were doing happened to be in the area you
// were looking at, and only if you thought to click it. Neither of those is a
// place to keep the one sentence that says what the run is about. It lives in a
// column of its own now, beside the map, where it is on screen the whole time
// the map is open. `L` swaps that column for the ledger of everything the run
// has been asked to do, so a player coming back after a week can read what they
// were in the middle of instead of guessing from a dot.
function drawMapColumn() {
  const x0 = MAP_VIEW_W, ix = x0 + 6, iw = MAP_PANEL_W - 12;
  uiRect(x0, 0, MAP_PANEL_W, VIEW_H, 'rgba(10,12,14,0.94)');
  uiRect(x0, 0, 1, VIEW_H, '#3a4a52');
  ptext(MapUI.log ? 'THE LOG' : 'OBJECTIVE', ix, 5, 8, '#ffd27a');
  ptext(MapUI.log ? '[L] BACK' : '[L] LOG', x0 + MAP_PANEL_W - 6, 6, 7,
        'rgba(232,217,192,0.5)', 'right');
  uiRect(ix, 15, iw, 1, '#3a4a52');

  const top = MAP_COL_TOP, bottom = MAP_COL_BOT;
  uictx.save();
  uictx.beginPath();
  uictx.rect(x0 * U, top * U, MAP_PANEL_W * U, (bottom - top) * U);
  uictx.clip();

  let y = top - (MapUI.log ? MapUI.logScroll : 0);
  const para = (text, size, col, gap) => {
    for (const line of ptFit(text, iw, size)) { ptext(line, ix, y, size, col); y += size + 1; }
    y += gap || 0;
  };

  if (!MapUI.log) {
    const obj = currentObjective();
    if (obj) {
      para(obj.title, 8, '#7ad27a', 3);
      ptext('IN ' + Areas[obj.area].name, ix, y, 7, 'rgba(232,217,192,0.45)'); y += 12;
      para(obj.detail, 7, '#e8d9c0', 0);
    } else {
      // The chain runs out after the map table and there is nothing dishonest
      // to put here, so it says so in the traveller's own voice rather than
      // leaving the column blank and looking broken.
      para('NOTHING PRESSING', 8, 'rgba(232,217,192,0.6)', 3);
      para('Nobody has asked anything of me. Whatever is north of the ring, no one here has said.',
           7, 'rgba(232,217,192,0.65)', 0);
    }
  } else {
    const rows = objectiveLog();
    for (const r of rows) {
      // a tick box: filled green for done, a slow pulse for the one you are on
      const a = r.done ? 1 : 0.55 + 0.45 * Math.sin(gameTime * 3);
      uictx.globalAlpha = a;
      uiRect(ix, y + 1, 4, 4, r.done ? '#7ad27a' : '#ffd27a');
      uictx.globalAlpha = 1;
      const tx = ix + 8, tw = iw - 8;
      for (const line of ptFit(r.title, tw, 7)) {
        ptext(line, tx, y, 7, r.done ? 'rgba(232,217,192,0.75)' : '#ffd27a'); y += 8;
      }
      y += 1;
      for (const line of ptFit(r.text, tw, 7)) {
        ptext(line, tx, y, 7, r.done ? 'rgba(232,217,192,0.42)' : 'rgba(232,217,192,0.8)'); y += 8;
      }
      y += 6;
    }
    // measured from the same pass that drew it, so the scroll clamp can never
    // be stale by a frame
    MapUI.logH = y + MapUI.logScroll - top;
  }
  uictx.restore();

  // a nub on the edge while there is more ledger below the fold
  if (MapUI.log && MapUI.logH > bottom - top) {
    const span = bottom - top, k = MapUI.logScroll / Math.max(1, MapUI.logH - span);
    uiRect(x0 + MAP_PANEL_W - 3, top + k * (span - 14), 2, 14, 'rgba(255,210,122,0.45)');
  }
}

function fastTravel(p) {
  MapUI.open = false;
  MapUI.sel = null;
  SFX.uiClose();
  // The same fade either way — a hop inside the area you are already in just
  // has nothing to rebuild on the far side of it.
  startTransition(p.area, { x: p.travel.x, y: p.travel.y });
  showMsg(p.name, 2.2);
}

// Anything that has seen you, plus the fight you cannot walk out of.
// IS SOMETHING ACTUALLY COMING FOR YOU? This is what stops you fast-travelling,
// so it has to mean "there is a fight here you would be walking out of" and
// nothing else. `alert` is how close something is to spotting you; `memory` is
// the seconds it keeps hunting after losing sight.
//
// It used to answer yes for machines that had never seen you. Memory is only
// ever counted down inside the chase, so anything left holding a number outside
// one held it forever — and a Scrapper killed mid-chase was rebuilt with
// `alert` cleared and `memory` still at 12, put back on patrol where nothing
// decrements it. Kill the thing hunting you, wait for the respawn, and the map
// refused to travel for the rest of the run. Both counters are cleared on death
// and on respawn now, and this asks the living only.
function beingHunted() {
  if (boss.active && boss.state !== 'hidden' && boss.state !== 'dead') return true;
  const onYou = (e) => e.alert > 0.6 || e.memory > 0;
  for (const sc of scrappers)
    if (sc.state !== 'off' && sc.state !== 'dead' && onYou(sc)) return true;
  for (const bd of bandits)
    if (!bd.dead && onYou(bd)) return true;
  // The droid squads were not in here at all — a squad chasing you down the ring
  // road was no reason you could not vanish off the map. They hunt as one and
  // share a single memory, so a squad counts for as long as any of it stands.
  for (const sq of squads)
    if (onYou(sq) && sq.members.some(m => m.state !== 'dead')) return true;
  return false;
}

// SUSPICION — one meter, drawn the same way by everything in the ring that can
// notice you: an eye, and a bar that fills white and turns red as it locks on,
// on its own plate, in a colour language deliberately unlike the health bar
// underneath it.
//
// This was three copies. The Scrapper and the raider drew the same one; the
// droids drew a comment saying "same language as the Scrapper's" over a bar
// with NO EYE on it, two pixels narrower, in a different white, with no track
// behind the fill — so the machines that hunt you in packs were the ones whose
// meter you had to learn separately. Three copies of a rule is how the third
// one drifts. `cx` is the middle of the badge and `ay` the top of the eye.
function drawSuspicion(cx, ay, alert) {
  const a = Math.min(1, alert);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(Math.round(cx - 12), ay - 1, 24, 5);
  ctx.fillStyle = '#e8eef5';                        // the eye
  ctx.fillRect(Math.round(cx - 10), ay, 3, 3);
  ctx.fillStyle = '#1a1c22';                        // and its pupil
  ctx.fillRect(Math.round(cx - 9), ay + 1, 1, 1);
  ctx.fillStyle = '#3a3e48';                        // the track it fills along
  ctx.fillRect(Math.round(cx - 5), ay + 1, 14, 2);
  ctx.fillStyle = a > 0.7 ? '#ff5a3c' : '#e8eef5';  // and how far it has got
  ctx.fillRect(Math.round(cx - 5), ay + 1, Math.round(14 * a), 2);
}

// ---------- area transitions ----------
// Fade out, swap the world, fade in. Per-area state (what you took, what you
// blew up) is stashed so an area remembers you were there.
const areaState = {};
const Trans = { active: false, t: 0, to: null, entry: null, swapped: false };

function stashArea() {
  // What you know of this area, kept as a picture before its tile arrays are
  // thrown away — it is the only moment they are still live, and without it an
  // area you have walked would be missing from the world map until you went
  // back and opened M inside it.
  if (explored) buildMapThumb(currentArea);
  areaState[currentArea] = snapshotArea();
}

// WHAT THE LIVE AREA LOOKS LIKE RIGHT NOW, in one place. It was written twice
// — once here for walking out of a door, once in js/save.js for writing a save
// — and the two had drifted: the save's copy had never learned about chests,
// so opening a chest and then reloading a save made in the same area handed
// the chest straight back, unopened. It matters more now that one of them has
// a weapon part in it.
function snapshotArea() {
  return {
    deadBarrels: boomBarrels.filter(b => !b.alive).map(b => b.gx + ',' + b.gy),
    takenItems: (START_ITEMS_BY_AREA[currentArea] || []).filter(
      k => !items.some(it => itemKey(it) === k)),
    deadBandits: collectDeadBandits(),
    // a chest you emptied stays empty when you come back through the door
    openChests: props.filter(p => p.type === 'chest' && p.open).map(p => p.gx + ',' + p.gy),
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
  const opened = new Set(st.openChests || []);
  for (const p of props) if (p.type === 'chest' && opened.has(p.gx + ',' + p.gy)) p.open = true;
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
  // squads rebuild on entry — enemies are never persisted (see save.js)
  if (Areas[id].hasDroids) spawnFringeSquads();
  else clearDroids();
  buildFolk(Areas[id].folk);
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
    if (Trans.to === currentArea) {
      // fast travel across an area you are already standing in: the same fade,
      // but there is nothing to rebuild — only you move
      player.x = Trans.entry.x; player.y = Trans.entry.y;
      player.iframes = 0.8;
      camInit = false;
      exitArmed = false;
      saveGame();
    } else {
      enterArea(Trans.to, Trans.entry);
    }
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
        // commit at once: applySave may have settled milestone back-payments,
        // and saveGame() refuses to write while the state is still 'title', so
        // without this the ledger would not reach disk until the next save
        saveGame();
      } else if (Input.pressed['KeyN']) {
        GameState = 'confirmwipe';
      }
    } else if (anyKey) {
      // WAS: GameState = 'intro'; introIdx = 0; introT = 0;
      // — the three typewriter lines. Kept live below and in js/cine.js; put
      // those two lines back here to return to it.
      startPrologueState();
    }
  } else if (GameState === 'confirmwipe') {
    if (Input.pressed['KeyE']) {
      wipeSave();
      pendingSave = null;
      playerName = '';
      // WAS: GameState = 'intro'; introIdx = 0; introT = 0;
      startPrologueState();
    } else if (Input.pressed['KeyQ'] || Input.pressed['Escape']) {
      GameState = 'title';
    }
  } else if (GameState === 'prologue') {
    // ESC leaves the memory early. Whether it runs to the end or is skipped,
    // it lands in exactly the same place: the naming prompt, with the yard
    // built and waiting behind it.
    if (Input.pressed['Escape']) { Input.pressed['Escape'] = false; skipCine(); }
    updateCine(dt);
    if (Cine.control) {
      updatePlayer(dt);
      markExplored(player.x, player.y, 9);
    }
    updateNpc(dt);          // the cast's walk cycles, already staggered
    updateCamera(dt);       // and the cutscene drives the camera itself
  } else if (GameState === 'intro') {
    // THE OLD OPENING, still wired and still working — nothing was deleted.
    // It is simply no longer entered from the title. See js/cine.js.
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

// ---------- the prologue, and the way back out of it ----------
// Whether it plays to the end or is skipped on the first key, it lands in the
// same place: the yard built, the player standing where the game has always
// started them, and the naming prompt over the top. The memory is a detour
// through another area and nothing downstream of it knows that happened.
function startPrologueState() {
  GameState = 'prologue';
  startPrologue(() => {
    enterArea('junkyard', { x: 6.5, y: 26.5 });
    player.iframes = 1.2;
    player.hp = player.maxHp;
    camInit = false;
    // He has no name until the moment he has no memory either.
    GameState = 'naming';
    nameBuf = '';
  });
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
    if (MapUI.open) { InvUI.open = false; SFX.uiOpen(); openMap(); } else SFX.uiClose();
  }
  if (MapUI.open) {
    Input.pressed['Escape'] = false;
    updateMap(dt);
    updateParticles(dt);
    Msg.t -= dt;
    return;
  }

  // the bench. It opens from the world and closes on itself, and while it is
  // open the room outside it is not running — you are standing at a table
  if (GunUI.open) {
    updateGunsmith(dt);
    updateParticles(dt);
    Msg.t -= dt;
    return;
  }

  if (Input.pressed['KeyI'] || Input.pressed['Tab'] || (InvUI.open && !InvUI.ask && Input.pressed['Escape'])) {
    Input.pressed['KeyI'] = Input.pressed['Tab'] = false;
    InvUI.open = !InvUI.open;
    if (InvUI.open) SFX.uiOpen(); else SFX.uiClose();
    InvUI.tab = InvUI.tab || 0;
    InvUI.cur = 0;
    InvUI.ask = null;
    // opening the pack IS the action the inventory tutorial teaches —
    // dismiss it here, or it would hang waiting behind the pack screen
    if (Tut.active && (Tut.active.keys === 'any' || Tut.active.keys.includes('KeyI') || Tut.active.keys.includes('Tab'))) {
      Tut.active = null;
    }
  }

  if (InvUI.open) {
    // The pack is POINTED AT, not driven with keys: you click a page to go to
    // it and you click a thing to be asked what to do with it. The only key
    // left is the one that closes it, and that is all the footer has to say.
    const tabs = visibleTabs();
    InvUI.tab = Math.max(0, Math.min(InvUI.tab, tabs.length - 1));
    const items = tabs.length ? itemsOnTab(tabs[InvUI.tab].id) : [];

    // the ask: clicking an item raises it, and nothing else can be touched
    // until it is answered
    if (InvUI.ask) {
      const still = items.find(i => i.id === InvUI.ask.id);
      if (!still) InvUI.ask = null;        // spent the last one — nothing to ask about
    }
    if (InvUI.ask) {
      const btns = packAskButtons(InvUI.ask);
      InvUI.askHover = -1;
      for (const b of btns) {
        if (packHit(b, Input.mouseX, Input.mouseY)) InvUI.askHover = b.i;
      }
      if (Input.pressed['LMB'] && InvUI.askHover === 0) {
        invAction(items.find(i => i.id === InvUI.ask.id));
        InvUI.ask = null;
      } else if (Input.pressed['LMB'] && InvUI.askHover === 1) {
        InvUI.ask = null; SFX.uiClose();
      } else if (Input.pressed['Escape']) {
        InvUI.ask = null; SFX.uiClose();
      }
      for (const k of ['LMB', 'Escape', 'KeyE']) Input.pressed[k] = false;
      updateParticles(dt);
      Msg.t -= dt;
      return;
    }

    InvUI.cur = Math.max(0, Math.min(InvUI.cur, items.length - 1));
    // hover is what selects — the description panel follows the pointer
    for (let i = 0; i < items.length; i++) {
      if (packHit(packCell(i), Input.mouseX, Input.mouseY)) { InvUI.cur = i; break; }
    }
    const tabRects = packTabRects(tabs);
    if (Input.pressed['LMB']) {
      let onTab = false;
      for (const r of tabRects) {
        if (!packHit(r, Input.mouseX, Input.mouseY)) continue;
        if (r.i !== InvUI.tab) { InvUI.tab = r.i; InvUI.cur = 0; SFX.blip(); }
        onTab = true; break;
      }
      if (!onTab) {
        for (let i = 0; i < items.length; i++) {
          if (!packHit(packCell(i), Input.mouseX, Input.mouseY)) continue;
          InvUI.cur = i;
          // only things you can DO something with raise the ask. Scrap has no
          // answer to "equip or cancel"; clicking it just reads it.
          if (items[i].action) { InvUI.ask = { id: items[i].id }; SFX.uiOpen(); }
          break;
        }
      }
    }
    for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyQ', 'KeyR', 'LMB',
                     'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyE'])
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
      if (Dialog.idx >= Dialog.lines.length) {
        Dialog.active = false;
        // a trader's pitch ends at his counter
        if (Trade.pending) openTrade(Trade.pending.who, Trade.pending.stock, Trade.pending.verb);
      }
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
      if (hit) {
        const done = Tut.active.onDo;
        Tut.active = null;
        if (done) done();          // the key that closes the lesson also does it
      }
    }
    updateParticles(dt);
  } else if (Trade.open) {
    for (let n = 1; n <= Trade.stock.length; n++)
      if (Input.pressed['Digit' + n]) tradeBuy(n);
    if (Input.pressed['KeyE'] || Input.pressed['Escape']) { Trade.open = false; SFX.uiClose(); }
    for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyE', 'Escape'])
      Input.pressed[k] = false;
    updateParticles(dt);
  } else {
    const bossCine = GateCine.active || Trans.active ||
      (boss.active && (boss.state === 'cine2' || boss.state === 'cine3'));
    if (!bossCine) {
      updatePlayer(dt);
      updateScrappers(dt);
      updateBandits(dt);
      updateDroids(dt);
      updateItems(dt);
      updateBurning(dt);
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
  // ash comes off the Ashfield, so it drifts EAST as it falls — the opposite
  // way to the dust, which is what stops the two reading as the same effect
  for (const a of ashFall) {
    a.x += (7 + a.s * 5) * dt;
    a.y += (5 + a.s * 9) * dt + Math.sin(gameTime * 1.1 + a.ph) * 2 * dt;
    if (a.x > VIEW_W + 4) { a.x -= VIEW_W + 8; }
    if (a.y > VIEW_H + 4) { a.y -= VIEW_H + 8; a.x = Math.random() * VIEW_W; }
  }

  updateCamera(dt);
}

// The camera, pulled out of update() so that the prologue can drive it too —
// it used to be twenty lines sitting inline in the middle of the main loop,
// which meant a cutscene running in any state other than 'playing' had no
// camera at all.
function updateCamera(dt) {
  // camera: the player normally; the boss during its cutscenes; during the
  // gate cutscene, first the gate lock — then whatever rises behind you.
  //
  // The lock used to be the literal pair of numbers (21.5, 30.0), which is
  // where the gate stood when it was in the south wall. It has been in the
  // EAST wall for a long time, so the first beat of the cutscene panned
  // eighteen tiles to an empty corner of the yard, sat there while the lock
  // ground, and then flew all the way back when the Compactor rose. It reads
  // off the gate itself now, so moving the gate again cannot break it.
  const cineOn = boss.active && (boss.state === 'cine2' || boss.state === 'cine3');
  let focus;
  // A scripted beat takes the camera off the player entirely — and hands it
  // back the moment a beat says `follow`, which is how the playable run inside
  // the prologue works without being a special case.
  const cc = typeof cineCamera === 'function' ? cineCamera() : null;
  if (cc) {
    focus = isoToScreen(cc.x, cc.y);
  } else if (GateCine.active) {
    const lockX = gateProp ? gateProp.gx - 0.4 : player.x;
    const lockY = gateProp ? gateProp.gy + 0.5 : player.y;
    focus = GateCine.spawned ? isoToScreen(boss.x, boss.y) : isoToScreen(lockX, lockY);
  } else if (cineOn) {
    focus = isoToScreen(boss.x, boss.y);
  } else {
    focus = isoToScreen(player.x, player.y);
  }
  const targetX = focus.x - VIEW_W / 2, targetY = focus.y - VIEW_H / 2 - 8;
  if (!camInit) { camX = targetX; camY = targetY; camInit = true; }
  camX += (targetX - camX) * Math.min(1, 8 * dt);
  camY += (targetY - camY) * Math.min(1, 8 * dt);
  const zoomTarget = Cine.active ? Cine.zoom
    : GateCine.active ? 1.35 : (cineOn ? 1.55 : 1);
  cineZoom += (zoomTarget - cineZoom) * Math.min(1, 5 * dt);
}

// ---------- THE PACK: a grid of what you carry ----------
// It was a list of text rows. It is squares now, the way BotW does it: you
// scan tiles, one description panel explains the tile under the cursor, and
// a thing you have none of is simply not there. What an item IS lives in
// js/items.js — this file only lays it out.
//
// The screen is 320x180 logical pixels, about the size of one BotW item tile,
// so this is the grammar of that screen and not a copy of it.
// THE TILE IS SIZED TO THE WEAPON. It was 26px in a 5x4 grid, which meant the
// rifle — 36px of drawn gun — could not go in it, and the pack showed a
// shrunken redraw instead: a different gun from the one on Bo's bench, and a
// worse one. A weapon is the thing you most want to look at in a pack, so the
// grid gives way to it: 36px tiles, four across and three down. Twelve slots a
// tab is still more than any tab holds.
const PACK = {
  CELL: 36, GAP: 3, COLS: 4, ROWS: 3,
  GX0: 10, GY0: 44,                     // grid origin
  PX0: 172, PW: 138,                    // description panel
  PY0: 44, PH: 113,
};
function packCell(i) {
  const c = i % PACK.COLS, r = (i / PACK.COLS) | 0;
  return {
    x: PACK.GX0 + c * (PACK.CELL + PACK.GAP),
    y: PACK.GY0 + r * (PACK.CELL + PACK.GAP),
    w: PACK.CELL, h: PACK.CELL,
  };
}
// tab hit rects — built the same way for input and for drawing, so what you
// click is always exactly what you see
function packTabRects(tabs) {
  const out = [];
  let tx = PACK.GX0;
  for (let i = 0; i < tabs.length; i++) {
    const w = ptWidth(tabs[i].label, 8) + 8;
    out.push({ x: tx - 3, y: 22, w: w, h: 12, i });
    tx += w + 8;
  }
  return out;
}
const packHit = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

// The ask: click a thing, be asked what to do with it. Two buttons, and the
// geometry is shared between the hit test and the drawing so what you click is
// always what you see.
const ASK = { W: 104, H: 46, BW: 44, BH: 13 };
function packAskRect() {
  return { x: Math.round((VIEW_W - ASK.W) / 2), y: Math.round((VIEW_H - ASK.H) / 2) - 6,
           w: ASK.W, h: ASK.H };
}
function packAskButtons() {
  const r = packAskRect(), gap = 8;
  const y = r.y + r.h - ASK.BH - 6;
  const x0 = r.x + (r.w - (ASK.BW * 2 + gap)) / 2;
  return [
    { x: x0, y, w: ASK.BW, h: ASK.BH, i: 0 },
    { x: x0 + ASK.BW + gap, y, w: ASK.BW, h: ASK.BH, i: 1 },
  ];
}
// what the confirming button says for this item
function packAskVerb(it) {
  if (!it) return 'DO IT';
  if (it.action === 'eat') return 'EAT';
  return (it.equipped && it.equipped()) ? 'PUT AWAY' : 'EQUIP';
}

// largest INTEGER scale that still fits the cell — pixel art never blurs
function packIconScale(img, it) {
  if (it.scale) return it.scale;
  const room = PACK.CELL - 2;
  return Math.max(1, Math.min(3, Math.floor(room / Math.max(img.width, img.height))));
}

// ptWrap already wraps by character count, and the 5x7 font is fixed-advance,
// so all a pixel width needs is converting into a character count first.
function ptFit(str, pxWidth, size) {
  const adv = ptWidth('MMMMMMMMMM', size) / 10;
  return ptWrap(str, Math.max(4, Math.floor(pxWidth / adv)));
}
// Hard-trim one line to a pixel width — same fixed advance, so it is arithmetic.
// Used where there is no second line to wrap onto and something else is already
// occupying the space to the right.
function ptClip(str, pxWidth, size) {
  if (ptWidth(str, size) <= pxWidth) return str;
  const adv = ptWidth('MMMMMMMMMM', size) / 10;
  const n = Math.max(1, Math.floor(pxWidth / adv) - 2);
  return str.slice(0, n) + '..';
}

function invAction(it) {
  if (!it) return;
  if (it.id === 'pipe' || it.id === 'knife') {
    player.melee = player.melee === it.id ? null : it.id;
    SFX.switchW();
  } else if (it.id === 'pistol' || it.id === 'rifle') {
    // one gun slot, two guns that can go in it — putting the other one away is
    // the same gesture as swapping pipe for knife
    if (player.hasGun && player.gun === it.id) player.hasGun = false;
    else { player.gun = it.id; player.hasGun = true; }
    SFX.switchW();
  } else if (FOOD.some(f => f.id === it.id)) {
    // in the pack you pick what to eat; H picks for you
    if (player.hp >= player.maxHp) { showMsg('Already at full health', 1.5); SFX.deny(); return; }
    eatFood(FOOD.find(f => f.id === it.id));
  } else return;            // materials and key items are carried, not used
  saveGame();
}

// ---------- THE GUNSMITH: Bo's bench, laid out like a gun on a bench ----------
// The gun is drawn big in the middle WITH ITS FITTED PARTS ON IT, and the four
// slots stand around it on leader lines to the point each one changes. That
// line is the whole reason a gunsmith screen reads at a glance — without it
// this is a list, and a list would not tell you that the drum is the fat thing
// hanging under the receiver.
//
// Hovering a part you have not fitted DRAWS IT ON THE GUN. You see the change
// before you pay for it, which is the one thing a shop of numbers cannot do.
const GunUI = { open: false, gun: 'rifle', slot: 0, hoverSlot: -1, hoverRow: -1 };
const GS = {
  GUNY: 44,                       // centre of the drawn weapon
  CHIP_W: 58, CHIP_H: 11,
  LIST_Y: 92, ROW_H: 14, LIST_X: 10, LIST_W: 300,
  SCALE: 4,
};
function openGunsmith(gun) {
  GunUI.open = true;
  GunUI.gun = gun || 'rifle';
  GunUI.slot = 0;
  GunUI.hoverSlot = GunUI.hoverRow = -1;
  SFX.uiOpen();
}
// Two chips down each side, so no leader line has to cross another: the barrel
// and the laser are on the left of the gun, the stock and the magazine on the
// right of it.
const GS_CHIP = {
  barrel: { x: 10,  y: 26 },
  optic:  { x: 10,  y: 62 },
  stock:  { x: 252, y: 26 },
  mag:    { x: 252, y: 62 },
};
function gsChipRect(slot) {
  const c = GS_CHIP[slot.id] || { x: 10, y: 26 };
  return { x: c.x, y: c.y, w: GS.CHIP_W, h: GS.CHIP_H };
}
// where the drawn gun sits, and where a slot's leader line touches it
function gsGunOrigin(img) {
  return { x: Math.round(VIEW_W / 2 - (img.width * GS.SCALE) / 2),
           y: Math.round(GS.GUNY - (img.height * GS.SCALE) / 2) };
}
function gsRowRect(i) {
  return { x: GS.LIST_X, y: GS.LIST_Y + i * GS.ROW_H, w: GS.LIST_W, h: GS.ROW_H - 1 };
}
// what the right-hand end of a row says, and in what colour. THE BENCH SELLS
// NOTHING: a part you do not have is not a price, it is a thing you have not
// found yet, and the row says so.
function gsRowStatus(gun, id) {
  const p = PARTS[id];
  if (fittedId(gun, p.slot) === id) return { text: 'FITTED', col: '#7ad27a' };
  if (ownsPart(id)) return { text: 'FIT', col: '#ffd27a' };
  return { text: 'NOT FOUND', col: '#6c6a66' };
}

// The one thing a row of numbers cannot say. A freeze-frame lesson would be
// wrong here — the world is already standing still at a bench, and the parts
// that change HOW YOU FIRE deserve a sentence in the player's own head the
// first time they go on, once, and never again.
function gsTaught(id) {
  if (id === 'barBurst')
    think('burst', 'Left for one. Right for three, and three is what it takes.');
  else if (id === 'magDrum')
    think('drum', 'Twice as long between reloads. Twice as long reloading.');
  else if (id === 'optLaser')
    think('laser', 'It draws the shot before I take it.');
}

function updateGunsmith(dt) {
  const gun = GunUI.gun, slots = slotsOf(gun);
  GunUI.slot = Math.max(0, Math.min(GunUI.slot, slots.length - 1));
  const rows = partsForSlot(gun, slots[GunUI.slot].id);

  GunUI.hoverSlot = -1;
  for (let i = 0; i < slots.length; i++)
    if (packHit(gsChipRect(slots[i]), Input.mouseX, Input.mouseY)) GunUI.hoverSlot = i;
  GunUI.hoverRow = -1;
  for (let i = 0; i < rows.length; i++)
    if (packHit(gsRowRect(i), Input.mouseX, Input.mouseY)) GunUI.hoverRow = i;

  if (Input.pressed['LMB']) {
    if (GunUI.hoverSlot >= 0 && GunUI.hoverSlot !== GunUI.slot) {
      GunUI.slot = GunUI.hoverSlot; GunUI.hoverRow = -1; SFX.blip();
    } else if (GunUI.hoverRow >= 0) {
      const id = rows[GunUI.hoverRow], p = PARTS[id];
      if (fittedId(gun, p.slot) === id) {
        SFX.blip();                                     // already on the gun
      } else if (ownsPart(id)) {
        fitPart(gun, id); SFX.switchW();
        showMsg(p.name.toUpperCase() + (id === 'barBurst'
          ? ' — RIGHT CLICK FOR THREE' : ' FITTED'), id === 'barBurst' ? 3 : 1.6);
        gsTaught(id);
      } else {
        SFX.deny(); showMsg('You do not have that part', 1.6);
      }
    }
  }
  if (Input.pressed['KeyE'] || Input.pressed['Escape'] || Input.pressed['KeyI']) {
    GunUI.open = false; SFX.uiClose();
  }
  for (const k of ['LMB', 'KeyE', 'Escape', 'KeyI', 'KeyR', 'Tab'])
    Input.pressed[k] = false;
}

function drawGunsmith() {
  const gun = GunUI.gun, slots = slotsOf(gun);
  const rows = partsForSlot(gun, slots[GunUI.slot].id);
  const hoverId = GunUI.hoverRow >= 0 ? rows[GunUI.hoverRow] : null;

  uiRect(0, 0, VIEW_W, VIEW_H, 'rgba(0,0,0,0.93)');

  // ---- header: what this is, what it is, and how much of it is yours
  ptext('GUNSMITH', 10, 6, 8, '#ffd27a');
  ptext((gunStats(gun).label || '').toUpperCase(), 10 + ptWidth('GUNSMITH', 8) + 8, 6, 8,
        'rgba(232,217,192,0.55)');
  ptext('MODIFICATIONS ' + modCount(gun) + '/' + slots.length, VIEW_W - 10, 6, 7,
        'rgba(232,217,192,0.55)', 'right');
  uiRect(8, 17, VIEW_W - 16, 1, '#5a4a38');

  // ---- the gun, as it is now — or as it WOULD be with the part under the
  // pointer, which is the only honest way to sell a part
  const trial = Object.assign({}, rifleFit());
  if (hoverId) trial[PARTS[hoverId].slot] = hoverId;
  const img = Sprites.rifleBuild(trial);
  const o = gsGunOrigin(img);
  uiIcon(img, o.x, o.y, GS.SCALE);

  // ---- the slots, each on a line to the part of the gun it changes
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i], r = gsChipRect(s);
    const on = i === GunUI.slot, hov = i === GunUI.hoverSlot;
    const ax = o.x + (s.ax + 1) * GS.SCALE, ay = o.y + (s.ay + 1) * GS.SCALE;
    const fromX = r.x < VIEW_W / 2 ? r.x + r.w : r.x;
    const fromY = r.y + r.h / 2;
    // an elbow, not a diagonal: a stepped line is what a callout looks like
    // when it is drawn in a grid of pixels
    const midX = Math.round((fromX + ax) / 2);
    const lineCol = on ? 'rgba(255,210,122,0.75)' : 'rgba(232,217,192,0.22)';
    uiRect(Math.min(fromX, midX), fromY, Math.abs(midX - fromX), 1, lineCol);
    uiRect(midX, Math.min(fromY, ay), 1, Math.abs(ay - fromY), lineCol);
    uiRect(Math.min(midX, ax), ay, Math.abs(ax - midX), 1, lineCol);

    uiRect(r.x, r.y, r.w, r.h, on ? 'rgba(255,210,122,0.20)'
                                  : hov ? 'rgba(255,255,255,0.10)' : 'rgba(20,17,14,0.85)');
    uictx.strokeStyle = on ? '#ffd27a' : '#5a4a38';
    uictx.lineWidth = U;
    uictx.strokeRect(r.x * U, r.y * U, r.w * U, r.h * U);
    // a filled pip means something other than the issued part is on the gun
    const p = PARTS[fittedId(gun, s.id)];
    uiRect(r.x + 4, r.y + 4, 3, 3, p && !p.std ? '#ffd27a' : 'rgba(232,217,192,0.25)');
    ptext(s.label, r.x + 11, r.y + 2, 7, on ? '#ffd27a' : 'rgba(232,217,192,0.7)');
  }

  // ---- the parts for the chosen slot, and what each one does in seconds,
  // rounds and damage — never in adjectives
  uiRect(8, GS.LIST_Y - 9, VIEW_W - 16, 1, '#5a4a38');
  for (let i = 0; i < rows.length; i++) {
    const id = rows[i], p = PARTS[id], r = gsRowRect(i);
    const hov = i === GunUI.hoverRow;
    if (hov) uiRect(r.x, r.y, r.w, r.h, 'rgba(255,210,122,0.13)');
    const st = gsRowStatus(gun, id);
    const nameCol = st.text === 'FITTED' ? '#7ad27a' : (hov ? '#ffd27a' : '#e8d9c0');
    ptext(ptClip(p.name, 100, 8), r.x + 6, r.y + 3, 8, nameCol);
    // the middle column takes whatever the price leaves it, measured rather
    // than guessed — the first attempt hard-coded 108px and the prices ran
    // straight through the effects
    const EFF_X = 112;
    const room = r.w - 12 - EFF_X + r.x - (r.x + ptWidth(st.text, 8));
    ptext(ptClip(effectLines(gun, id)[0] || '', Math.max(20, room), 7),
          r.x + EFF_X, r.y + 4, 7, 'rgba(232,217,192,0.55)');
    ptext(st.text, r.x + r.w - 6, r.y + 3, 8, st.col, 'right');
  }

  // ---- and under them, what the part under the pointer actually is: every
  // effect it has, then the sentence that says what the thing IS
  const tell = hoverId || fittedId(gun, slots[GunUI.slot].id);
  if (PARTS[tell]) {
    // What it does, then — if it is not yours — where a thing like that comes
    // from, never a price, because this table does not sell anything. Then as
    // much of what it IS as still fits above the footer: the lines are counted
    // against the room left rather than assumed, because a fourth line used to
    // print straight through 'E — close'.
    const lines = [];
    const eff = effectLines(gun, tell).join('  ·  ');
    if (eff) lines.push([ptClip(eff, VIEW_W - 28, 7), '#ffd27a']);
    if (!ownsPart(tell))
      lines.push(['NOT IN YOUR KIT — off a machine, or traded for at a counter.', '#8d959b']);
    for (const line of ptFit(PARTS[tell].desc, VIEW_W - 28, 7))
      lines.push([line, 'rgba(232,217,192,0.45)']);
    let y = GS.LIST_Y + rows.length * GS.ROW_H + 5;
    for (const [text, col] of lines) {
      if (y + 8 > VIEW_H - 14) break;
      ptext(text, 14, y, 7, col);
      y += 9;
    }
  }
  ptext('E — close', VIEW_W / 2, VIEW_H - 10, 7, 'rgba(232,217,192,0.38)', 'center');
}

// ---------- render ----------
function render() {
  Lights.length = 0;
  const sx = (Math.random() - 0.5) * shakeAmt;
  const sy = (Math.random() - 0.5) * shakeAmt;
  const ox = Math.round(camX + sx), oy = Math.round(camY + sy);
  lastOx = ox; lastOy = oy;

  // the ghost pass needs to know what painted over what, but only while
  // something hostile is close enough to be worth drawing through a wall
  blockers.length = 0;
  wantBlockers = player.dead <= 0 && GHOSTED.some(([list, , alive]) =>
    list.some(e => alive(e) && Math.hypot(e.x - player.x, e.y - player.y) <= GHOST_NEAR));

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#141110';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // cutscene zoom, centered on the screen
  if (cineZoom > 1.005) {
    ctx.setTransform(cineZoom, 0, 0, cineZoom,
      (VIEW_W / 2) * (1 - cineZoom), (VIEW_H / 2) * (1 - cineZoom));
  }

  // THE HORIZON. Drawn inside the zoom transform so a push-in reaches it, and
  // BEFORE the tiles so the whole world stands in front of it.
  if (currentAreaDef().skyline) drawFarCity(ox, oy);

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
    // Most decals are small and centred on their tile. The runway paint is
    // built in tile space and carries its own anchor — the point in the image
    // that IS (gx, gy) — because a four-by-seven-tile number has no meaningful
    // centre to hang off.
    if (img.ox !== undefined) {
      ctx.drawImage(img, Math.round(s.x - ox - img.ox), Math.round(s.y - oy - img.oy));
    } else {
      ctx.drawImage(img, Math.round(s.x - ox - img.width / 2), Math.round(s.y - oy - img.height / 2));
    }
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
    const depth = (p.type === 'building' || p.type === 'canopy' || p.type === 'gantry' ||
                   p.type === 'wreckDrone')
      ? isoToScreen(p.foot[0] + p.foot[2], p.foot[1] + p.foot[3]).y - 1
      : (p.foot ? s.y + (p.foot[2] + p.foot[3]) * 4 : s.y);
    draws.push({ depth, draw: () => drawProp(p, s.x - ox, s.y - oy) });
  }
  if (currentAreaDef().hasDroids) {
    for (const d of droids) {
      // cull off-screen units before sorting — 23 of them on a 200x150 map
      const s = isoToScreen(d.x, d.y);
      if (s.x - ox < -40 || s.x - ox > VIEW_W + 40 ||
          s.y - oy < -60 || s.y - oy > VIEW_H + 40) continue;
      draws.push({ depth: s.y, draw: () => drawDroid(d, s.x - ox, s.y - oy) });
    }
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
  for (const f of folk) {
    const s = isoToScreen(f.x, f.y);
    draws.push({ depth: s.y, draw: () => drawFolk(f, s.x - ox, s.y - oy) });
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

  // ---- AND THE SAME COURTESY FOR THE OTHER SIDE ----
  // Laurens: *"you still show the character transparently [...] do the same
  // with any opponent otherwise they just become invisible and unkillable"*.
  // A machine standing behind a pier used to be a machine that hit you from
  // nowhere. Now anything hostile that is HIDDEN and CLOSE shows through, in
  // the same washed-out silhouette the player gets.
  //
  // Two conditions, and both matter. HIDDEN, because an enemy in the open
  // needs no help. CLOSE, because drawing every occluded enemy on the map
  // through its wall would hand the player x-ray vision and take the stealth
  // game apart — a droid two streets away behind a building is supposed to be
  // a droid you have not found yet.
  if (wantBlockers) {
    for (const [list, frameOf, alive] of GHOSTED) {
      for (const e of list) {
        if (!alive(e)) continue;
        if (Math.hypot(e.x - player.x, e.y - player.y) > GHOST_NEAR) continue;
        const fr = frameOf(e);
        if (!fr || !fr.img) continue;
        const s = isoToScreen(e.x, e.y);
        const dx = Math.round(s.x - ox - fr.ox), dy = Math.round(s.y - oy - fr.oy);
        if (!spriteCovered(dx, dy, dx + fr.img.width, dy + fr.img.height)) continue;
        ctx.globalAlpha = 0.4;
        ctx.drawImage(fr.img, dx, dy);
        ctx.globalAlpha = 1;
      }
    }
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

  drawEdgeWeather(ox, oy);

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
// WHAT ACTUALLY PAINTED OVER WHAT. A tile test is not good enough here: a
// building's footprint is `heavy` for every tile it stands on, so an enemy
// standing behind its FAR side — drawn clear above the roof, plainly visible —
// would count as hidden and get a ghost drawn over a sprite you can already
// see. So the tall props record the RECTANGLE they painted, in screen pixels,
// and the ghost pass asks the only question that matters: was this sprite
// covered? Rebuilt every frame, a couple of dozen rects, only while something
// hostile is near enough to be worth the arithmetic.
let blockers = [], wantBlockers = false;
function blocks(x0, y0, w, h) {
  if (wantBlockers && h >= 14) blockers.push({ x0, y0, x1: x0 + w, y1: y0 + h, bottom: y0 + h });
}
// covered = both the head and the middle of this sprite are behind something
// nearer the camera. Half-covered is not covered: you can still see them.
function spriteCovered(x0, y0, x1, y1) {
  const hx = Math.round((x0 + x1) / 2);
  const head = y0 + 3, mid = Math.round((y0 + y1) / 2);
  let gotHead = false, gotMid = false;
  for (const b of blockers) {
    if (b.bottom <= y1 - 1) continue;             // behind this sprite, not in front
    if (hx < b.x0 || hx >= b.x1) continue;
    if (head >= b.y0 && head < b.y1) gotHead = true;
    if (mid >= b.y0 && mid < b.y1) gotMid = true;
    if (gotHead && gotMid) return true;
  }
  return false;
}
// close enough to be in the fight, in tiles. The view is about ten tiles wide.
const GHOST_NEAR = 8;
// every hostile list, how to ask it for its current frame, and what counts as
// worth drawing. Resolved late (as an array of triples) because these lists
// live in three different files.
// Every one of these is a `const` array the world mutates in place, so holding
// the reference here is safe across area changes.
const GHOSTED = [
  [scrappers, (e) => ({ img: scrapperFrame(e), ox: 9, oy: 16 }),
              (e) => e.state !== 'off' && e.state !== 'dead'],
  [bandits,   (e) => { const img = banditFrame(e); return { img, ox: img.width / 2, oy: img.height - 1 }; },
              (e) => !e.dead],
  [droids,    (e) => droidFrame(e),
              (e) => e.state !== 'dead'],
];

function occlusionAlpha(p) {
  if (player.dead > 0) return 1;
  const dx = player.x - p.gx, dy = player.y - p.gy;
  // the player is "behind" it when they sit further from the camera (lower x+y)
  if (dx + dy > 0.6) return 1;
  const d = Math.hypot(dx, dy);
  if (d > 3.2) return 1;
  return 0.3 + 0.7 * Math.min(1, Math.max(0, (d - 1.2) / 2));
}

// A pier is 54px of stone standing in open floor: it crosses the player from
// four tiles away, which is outside occlusionAlpha's world-distance reach, and
// only ever when it is in the same SCREEN column. So this one measures where
// the sprites actually land instead of how far apart the tiles are.
function pierAlpha(p) {
  if (player.dead > 0) return 1;
  const s = isoToScreen(p.gx + 0.5, p.gy + 0.5), q = isoToScreen(player.x, player.y);
  const dx = Math.abs(s.x - q.x), dy = s.y - q.y;
  if (dy < 0 || dx > 16 || dy > 50) return 1;      // behind, or nowhere near
  return 0.35 + 0.65 * Math.max(dx / 16, dy / 50);
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

// How much of the camera's motion the horizon takes. A tenth: enough to feel
// like it is out there, little enough that it never slides out of a shot.
const PARALLAX = 0.10;
const CORE_BAND_Y = 88;      // where the crystal sits inside Sprites.cityFar

// The city between here and the middle of it, and the Core at the back.
// A BACKDROP, not props on tiles: the Fringe is Ring 5 and the Core is Ring 0,
// so the honest distance is not something a 34-tile map can hold. It moves at a
// fraction of the camera, which is the only cue the eye actually needs — a
// thing that barely shifts when you move is a thing that is a long way off.
function drawFarCity(ox, oy) {
  const img = Sprites.cityFar;
  if (!img) return;
  // ANCHORED, NOT TILED. The first version tiled the band and let the parallax
  // decide where the Core landed, which meant the one thing the shot is about
  // drifted off frame the moment the camera moved. It is drawn once now, lined
  // up so the crystal sits near the middle of the screen — which also means a
  // cutscene push-in reaches it, because the zoom scales about that point.
  const a = isoToScreen(MAP_W / 2, 0);
  const nx = a.x - ox, ny = a.y - oy;          // the map's far edge, on screen
  const cx = VIEW_W / 2 + (nx - VIEW_W / 2) * PARALLAX;
  const cy = VIEW_H * 0.42 + (ny - VIEW_H * 0.42) * PARALLAX;
  ctx.drawImage(img, Math.round(cx - img.width / 2), Math.round(cy - CORE_BAND_Y));
}

// THE FIRE HURTS.
//
// The Ashfield used to be solid, which meant it was a wall painted orange:
// you were stopped by it and learned nothing. It is walkable now, and this is
// what makes that a decision rather than a free stroll — about eight seconds
// of standing in it will kill you from full health, which is long enough to
// dart in for something and back out, and far too short to cross.
//
// Damage is CONTINUOUS, so it deliberately does not go through hurtPlayer():
// that knocks you back and grants 0.45s of invulnerability, and being shoved
// around by the ground you are standing on would fight the player for control
// at the exact moment they are trying to get out.
const Burn = { t: 0, warned: 0 };
function updateBurning(dt) {
  const tx = Math.floor(player.x), ty = Math.floor(player.y);
  const onFire = player.dead <= 0 && burning[ty] && burning[ty][tx];
  if (!onFire) { Burn.t = Math.max(0, Burn.t - dt * 2); return; }

  Burn.t += dt;
  player.hp -= 13 * dt;
  player.combatT = 0;                       // burning counts as being in trouble
  player.flash = Math.max(player.flash, 0.10 + 0.06 * Math.sin(gameTime * 22));
  if (Burn.t > 0.6) addShake(dt * 2.2);
  // embers coming off you, and the smoke of your own coat
  if (Math.random() < dt * 26) spawnSparks(player.x, player.y, 1, ['#ffb02e', '#ff5a3c'], 1.6);
  if (Math.random() < dt * 7) spawnSmoke(player.x, player.y, 1);
  if (gameTime - Burn.warned > 6) {
    Burn.warned = gameTime;
    showMsg('THE GROUND IS BURNING', 1.6);
    SFX.hurt();
  }
  if (player.hp <= 0 && player.dead <= 0) {
    player.hp = 0; player.dead = 2; SFX.die();
  }
}

// =====================================================================
// THE EDGES, AS WEATHER
// Two of the Fringe's four boundaries are not walls, they are conditions:
// a tank farm that has been burning for a year off the west edge, and the
// river standing over the lowlands to the south. Solid ground says "you
// cannot go there"; this says WHY, from anywhere on the map that can see it.
//
// Everything here is ANCHORED IN THE WORLD, not pinned to the screen. The
// fire line is the world column x = ashX1 + 1 and the shore is the world row
// y = waterY0, so both of them run down the screen on the iso diagonal and
// swing across it as you walk — which is the whole difference between a place
// off to your left and a gradient stuck to the left of the monitor. The only
// screen-space thing is the falling ash, because ash in the air between you
// and the camera genuinely is.
// =====================================================================
function drawEdgeWeather(ox, oy) {
  const E = currentAreaDef().edges;
  if (!E || Trans.active) return;
  const S = (wx, wy) => { const s = isoToScreen(wx, wy); return [s.x - ox, s.y - oy]; };
  // a world-space quad, which in this projection is a parallelogram
  const quad = (x0, y0, x1, y1, fill) => {
    const a = S(x0, y0), b = S(x1, y0), c = S(x1, y1), d = S(x0, y1);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  };

  // ---- THE ASHFIELD: fire beyond the west edge ----
  // THE FRONT WANDERS, so everything here follows it row by row rather than
  // sitting on one column. `frontAt` is the same array the collision uses, so
  // the glow cannot drift away from the ground that actually burns.
  const F = E.front;
  const frontAt = wy => {
    if (!F) return E.ashX1;
    return F[Math.max(0, Math.min(F.length - 1, Math.round(wy)))];
  };
  // a band that follows the front: one quad per slab of rows
  const SLAB = 10;
  const followQuad = (inset, fill) => {
    ctx.beginPath();
    let started = false;
    for (let wy = -6; wy <= MAP_H + 6; wy += SLAB) {          // down the fire's edge
      const a = S(frontAt(wy) + inset, wy);
      if (!started) { ctx.moveTo(a[0], a[1]); started = true; } else ctx.lineTo(a[0], a[1]);
    }
    for (let wy = MAP_H + 6; wy >= -6; wy -= SLAB) {          // and back up the rim
      const a = S(-8, wy);
      ctx.lineTo(a[0], a[1]);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  };
  // Distance from the player to the fire's edge, in tiles — 0 standing on it,
  // positive out on the street, negative once you are in the coals. The glow
  // PEAKS AT THE EDGE and backs off on both sides: approaching, because a fire
  // a hundred tiles away should not light your face; and inside, because the
  // ground under you is already orange and piling the same colour on top of it
  // in screen space washed the whole frame out — the traveller disappeared into
  // it, which is the one thing that must never happen while something is
  // killing you.
  const d = player.x - (frontAt(player.y) + 1);
  const near = d >= 0 ? Math.max(0, 1 - d / 46) : Math.max(0.22, 1 + d / 9);
  if (near > 0.01) {
    // the burning ground itself, seen over the top of the margin
    ctx.globalCompositeOperation = 'lighter';
    const flick = 0.86 + 0.14 * Math.sin(gameTime * 1.9) * Math.sin(gameTime * 0.7 + 1.3);
    followQuad(1, `rgba(150,58,16,${0.16 * near * flick})`);
    followQuad(-7, `rgba(196,86,20,${0.15 * near * flick})`);
    // and the glow it throws onto the ground you are standing on. Real lights
    // spaced along the fire line, so it falls off with distance for free and
    // wraps whatever is between you and it.
    ctx.globalCompositeOperation = 'source-over';
    for (let wy = 0; wy <= MAP_H; wy += 22) {
      const s = isoToScreen(frontAt(wy) + 1, wy);
      const lx = s.x - ox, ly = s.y - oy;
      if (lx < -180 || lx > VIEW_W + 180 || ly < -180 || ly > VIEW_H + 180) continue;
      addLight(lx, ly, 0, 150, '236,116,34', 0.17 * near * flick);
    }
    // the smoke ceiling: it does not burn, it sits on top of everything and
    // takes the colour out of the sky over the western third
    ctx.globalCompositeOperation = 'source-over';
    followQuad(5, `rgba(38,30,28,${0.30 * near})`);
    // falling ash, thinning out the further east you get
    const shown = Math.round(ashFall.length * near);
    for (let i = 0; i < shown; i++) {
      const a = ashFall[i];
      const tw = 0.55 + 0.45 * Math.sin(gameTime * 2.2 + a.ph);
      ctx.fillStyle = a.s > 0.86
        ? `rgba(255,150,60,${(0.30 + 0.3 * tw) * near})`      // one still alight
        : `rgba(196,188,178,${(0.13 + 0.16 * tw) * near})`;
      ctx.fillRect(Math.round(a.x), Math.round(a.y), 1, a.s > 0.6 ? 2 : 1);
    }
  }

  // ---- THE GREY RUN: standing water off the south edge ----
  const wnear = Math.max(0, 1 - Math.max(0, E.waterY0 - player.y) / 40);
  if (wnear > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    // sheen: two slow bands sliding along the water, on the water's own
    // diagonal, so it reads as a surface and not as a painted floor
    for (let i = 0; i < 3; i++) {
      const t = (gameTime * 0.06 + i * 0.37) % 1;
      const y0 = E.waterY0 + 0.5 + t * (MAP_H - E.waterY0 - 2);
      quad(-6, y0, MAP_W + 6, y0 + 0.9,
           `rgba(150,178,206,${0.05 * wnear * (0.5 + 0.5 * Math.sin(t * Math.PI))})`);
    }
    // glints: fixed points on the water catching the light, each on its own
    // clock, which is what stops the surface reading as a moving texture
    for (let i = 0; i < 46; i++) {
      const gx = 6 + ((i * 37) % (MAP_W - 12));
      const gy = E.waterY0 + 1 + ((i * 13) % 8);
      const tw = Math.sin(gameTime * 1.3 + i * 1.7);
      if (tw < 0.55) continue;
      const s = isoToScreen(gx + 0.5, gy + 0.5);
      const px2 = s.x - ox, py2 = s.y - oy;
      if (px2 < -8 || px2 > VIEW_W + 8 || py2 < -8 || py2 > VIEW_H + 8) continue;
      ctx.fillStyle = `rgba(178,204,226,${(tw - 0.55) * 0.9 * wnear})`;
      ctx.fillRect(Math.round(px2) - 1, Math.round(py2), 3, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
    // and the cold sitting over it, which is what makes the water read as far
    quad(-6, E.waterY0, MAP_W + 6, MAP_H + 6, `rgba(24,34,44,${0.26 * wnear})`);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawProp(p, x, y) {
  const T = p.type;
  if (T === 'building') {
    // one pre-rendered volume: faces and roof already share their corners
    const bs = Sprites.makeBuilding(p.foot[2], p.foot[3], p.kind, p.seed);
    const a = isoToScreen(p.foot[0], p.foot[1]);
    const bx = Math.round(a.x - lastOx - bs.ax), by = Math.round(a.y - lastOy - bs.ay);
    ctx.drawImage(bs.img, bx, by);
    blocks(bx, by, bs.img.width, bs.img.height);
    return;
  }
  if (T === 'canopy') { drawRoof(p); return; }
  if (T === 'gantry') {
    // anchored by its WEST leg's base: the sprite carries its own iso shear,
    // so the east leg lands ten tiles down-right of it on its own
    const gs = Sprites.makeGantry(p.seed || 0);
    ctx.drawImage(gs.img, Math.round(x - gs.ax), Math.round(y - gs.ay));
    drawShadow(x, y, 4);
    drawShadow(x + 160, y + 80, 4);
    return;
  }
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
    // the strip image is mostly empty (the shear lives in it), so record the
    // band the wall actually stands in rather than the image's bounding box
    if (!p.front) blocks(Math.round(x + p.dx), Math.round(y - p.lift), p.img.width, p.lift + 5);
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
  // THE CORE, on the skyline. Drawn from its own anchor with no shadow and no
  // occlusion fade: it is kilometres away and nothing in this street is in
  // front of it.
  // ---- THE CHURCHYARD ----
  if (T === 'railing') {
    const img = p.dir === 'y' ? Sprites.railing.y : Sprites.railing.x;
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + 8));
    return;
  }
  if (T === 'headstone') {
    const img = Sprites.headstones[p.v % Sprites.headstones.length];
    drawShadow(x, y, 5);
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + 3));
    return;
  }
  if (T === 'lychGate') {
    drawShadow(x, y, 11);
    ctx.drawImage(Sprites.lychGate, Math.round(x - Sprites.lychGate.width / 2),
                  Math.round(y - Sprites.lychGate.height + 6));
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
    blocks(Math.round(x - img.width / 2), Math.round(frontY - img.height + 2),
           img.width, img.height);
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
  else if (T === 'drowned') {
    // A CAR IN THE GREY RUN, with the water at its window line. It is the same
    // car sprite as the ones in the street — the flood did not go and find
    // different cars — clipped off below the waterline and given a bloom of
    // pale silt where it breaks the surface. Drawing the whole car and sinking
    // it would have put wheels on top of the water.
    const set = p.dir === 'y' ? Sprites.carsIso.y : Sprites.carsIso.x;
    const im = set[p.v % set.length];
    // THE WATERLINE IS NOT A HORIZONTAL BAR. Where a flat sheet of water cuts
    // a car, the mark it leaves is the car's own FOOTPRINT — a diamond on the
    // iso grid — so the disturbed water is drawn from the footprint's four
    // corners, and the hull goes on top of it. A rectangle here would have
    // been the same bug as a rectangle of road paint: a flat card pasted over
    // an isometric floor.
    const L = 2.25, Wd = 1.05;
    const lx = (p.dir === 'y' ? Wd : L) / 2, ly = (p.dir === 'y' ? L : Wd) / 2;
    ctx.beginPath();
    let first = true;
    for (const [tx, ty] of [[-lx, -ly], [lx, -ly], [lx, ly], [-lx, ly]]) {
      const sx2 = x + (tx - ty) * 16, sy2 = y + (tx + ty) * 8;
      if (first) { ctx.moveTo(sx2, sy2); first = false; } else ctx.lineTo(sx2, sy2);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(26,36,44,0.45)';                  // the hull, under
    ctx.fill();
    ctx.strokeStyle = 'rgba(158,178,192,0.28)';             // silt on the surface
    ctx.lineWidth = 1;
    ctx.stroke();
    // and the part still in the air, cut off at the window line
    const keep = Math.max(4, im.height - (p.sink || 14));
    const dx = Math.round(x - im.width / 2), dy = Math.round(y + im.oy);
    ctx.save();
    ctx.beginPath(); ctx.rect(dx, dy, im.width, keep); ctx.clip();
    ctx.drawImage(im, dx, dy);
    ctx.restore();
    return;
  }
  else if (T === 'burntCar') {
    const set = p.dir === 'y' ? Sprites.carsBurnt.y : Sprites.carsBurnt.x;
    img = set[p.v % set.length];
    oyOff = img.oy;
    drawShadow(x, y + 1, 14);
  }
  else if (T === 'apronLamp') { img = Sprites.apronLamp; oyOff = -46; drawShadow(x, y, 4); }
  else if (T === 'workLamp')  { img = Sprites.workLamp;  oyOff = -24; drawShadow(x, y, 4); }
  else if (T === 'windsock') {
    img = Sprites.windsock; oyOff = -44; drawShadow(x, y, 4);
  }
  else if (T === 'wreckDrone') {
    // five tiles by three, anchored on its own north corner like a building
    const im = Sprites.wreckDrone;
    const a = isoToScreen(p.foot[0], p.foot[1]);
    const bx2 = Math.round(a.x - lastOx - im.ox), by2 = Math.round(a.y - lastOy - im.oy);
    ctx.drawImage(im, bx2, by2);
    blocks(bx2, by2, im.width, im.height);
    return;
  }
  else if (T === 'stump')  { img = Sprites.stump;  oyOff = -19; drawShadow(x, y, 5); }
  else if (T === 'debris') { img = Sprites.debris; oyOff = -13; drawShadow(x, y, 8); }
  else if (T === 'leaner') {
    img = p.dir === 'y' ? Sprites.leanerL : Sprites.leanerR;
    oyOff = -34; drawShadow(x, y, 4);
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
  // ---- CANDLELIGHT. Everything that burns puts light on the floor: the
  // camp is the only warm room in the ring and it has to be lit that way,
  // not tinted that way.
  // A pier is the one tall thing standing in the open floor, so it is the one
  // thing the player can walk behind and disappear into. It fades like the
  // yard's posts and corner columns do.
  else if (T === 'pier') {
    drawShadow(x, y, 8);
    const a = pierAlpha(p);
    if (a < 1) ctx.globalAlpha = a;
    ctx.drawImage(Sprites.pier, Math.round(x - Sprites.pier.width / 2), Math.round(y - 52));
    ctx.globalAlpha = 1;
    if (a > 0.8) blocks(Math.round(x - Sprites.pier.width / 2), Math.round(y - 52),
                        Sprites.pier.width, 56);
    return;
  }
  else if (T === 'brazier') {
    img = Sprites.brazier; oyOff = -19; drawShadow(x, y, 6);
    addLight(x, y - 12, 0, 34 + Math.sin(gameTime * 7 + p.gx) * 4, '255,150,60', 0.44);
  }
  else if (T === 'candles') {
    img = Sprites.candles; oyOff = -17; drawShadow(x, y, 6);
    addLight(x, y - 10, 0, 20 + Math.sin(gameTime * 5 + p.gy) * 2, '255,210,140', 0.34);
  }
  else if (T === 'hearth') {
    img = Sprites.hearth; oyOff = -28; drawShadow(x, y, 7);
    addLight(x, y - 9, 0, 30 + Math.sin(gameTime * 8) * 3, '255,140,60', 0.40);
  }
  else if (T === 'bedding') { img = Sprites.bedding; oyOff = -11; drawShadow(x, y, 10); }
  else if (T === 'sacks') { img = Sprites.sacks; oyOff = -12; drawShadow(x, y, 8); }
  else if (T === 'curtain') { img = Sprites.curtain[p.dir === 'y' ? 'y' : 'x']; oyOff = -30; }
  else if (T === 'pew') { img = Sprites.pew[p.dir === 'y' ? 'y' : 'x']; oyOff = -12; drawShadow(x, y, 13); }
  else if (T === 'pewBroken') { img = Sprites.pewBroken[p.dir === 'y' ? 'y' : 'x']; oyOff = -12; drawShadow(x, y, 10); }
  else if (T === 'workbench') {
    img = Sprites.workbench; oyOff = -24; drawShadow(x, y, 15);
    // the hooded lamp over the work. It replaces the drone eye that used to lie
    // here — steady where that pulsed, because a work light is not a machine
    // with charge left in it, and amber that pulses means something else in
    // this game.
    addLight(x + 6, y - 17, 0, 17, '255,210,140', 0.32);
  }
  else if (T === 'mapTable') {
    img = Sprites.mapTable; oyOff = -18; drawShadow(x, y, 14);
    addLight(x + 10, y - 16, 0, 16, '255,210,140', 0.30);
  }
  else if (T === 'chest') { img = Sprites.chest[p.open ? 1 : 0]; oyOff = -13; drawShadow(x, y, 8); }
  else if (T === 'stairDown') {
    img = Sprites.stairDown; oyOff = -11;
    addLight(x, y - 4, 0, 13, '120,140,170', 0.22);      // cold air off the crypt
  }
  else if (T === 'stairUp') {
    // the same hole seen from under it: a ladder, and the room above spilling
    // down the shaft. The light hangs at the OPENING, not on the floor.
    img = Sprites.ladderUp; oyOff = -45;
    addLight(x, y - 31, 0, 24, '255,206,138', 0.34);
    addLight(x, y - 2, 0, 16, '255,206,138', 0.20);
  }
  else if (T === 'rope') { img = Sprites.rope; oyOff = -7; }
  else if (T === 'cistern') { img = Sprites.cistern; oyOff = -22; drawShadow(x, y, 9); }
  // hay and water: built in tile space, so their anchor is the tile centre
  // inside the sprite and the offset is arithmetic, not taste
  else if (T === 'hayStack') { img = Sprites.hayStack; oyOff = -36; drawShadow(x, y, 13); }
  else if (T === 'waterVat') { img = Sprites.waterVat; oyOff = -28; drawShadow(x, y, 9); }
  else if (T === 'preserves') { img = Sprites.preserves; oyOff = -14; drawShadow(x, y, 8); }
  else if (T === 'strongbox') { img = Sprites.strongbox; oyOff = -14; drawShadow(x, y, 8); }
  if (img) {
    ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y + oyOff));
    blocks(Math.round(x - img.width / 2), Math.round(y + oyOff), img.width, img.height);
  }
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
  const img = it.type === 'pipe' ? Sprites.pipeIcon
            : (it.gun === 'rifle' ? Sprites.ammoRifle : Sprites.ammo);
  ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - 10 + bobY));
  addLight(x, y - 6, 0, 14, '255,210,120', 0.22 + Math.sin(gameTime * 3 + it.bob) * 0.06);
}

// THE LASER, and only if one is clamped to the gun. The bandits' aim lines are
// DASHED because nobody on that road has a laser sight — this is solid and thin
// for exactly that reason: it is the one beam in the game that comes off a
// machine's own optic, and it should not be mistaken for somebody aiming at you.
// It stops where the round would stop, which is what makes it worth the scrap:
// in a 2:1 iso view the mouse angle and the world direction are not the same
// thing, and at distance you are otherwise guessing.
function drawAimLaser(px2, py2) {
  if (player.dead > 0 || !player.hasGun || player.active !== 'gun') return;
  const G = gunStats(player.gun);
  if (!G.laser) return;
  const dirW = screenToIso(Math.cos(player.angle), Math.sin(player.angle));
  const dl = Math.hypot(dirW.x, dirW.y) || 1;
  const ux = dirW.x / dl, uy = dirW.y / dl;
  const max = G.speed * G.life;
  let d = 0.35;
  while (d < max && !isSolid(player.x + ux * (d + 0.25), player.y + uy * (d + 0.25))) d += 0.25;
  const from = isoToScreen(player.x + ux * 0.35, player.y + uy * 0.35);
  const to = isoToScreen(player.x + ux * d, player.y + uy * d);
  const fx = Math.round(from.x - lastOx), fy = Math.round(from.y - lastOy - 9);
  const tx = Math.round(to.x - lastOx), ty = Math.round(to.y - lastOy - 9);
  ctx.strokeStyle = 'rgba(255,74,60,0.34)';
  ctx.beginPath();
  ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,90,0.85)';   // the dot on whatever it lands on
  ctx.fillRect(tx - 1, ty - 1, 2, 2);
  addLight(tx, ty, 0, 6, '255,74,60', 0.22);
  // and the diode itself, lit on the gun
  ctx.fillStyle = '#ff4a3c';
  ctx.fillRect(Math.round(px2 + Math.cos(player.angle) * 5), Math.round(py2 - 9), 1, 1);
}

function drawPlayer(x, y) {
  if (player.dead > 0) return;
  drawAimLaser(x, y);
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
    // The gun in the hands is the same drawing as the bench's, at the size a
    // person carries: stock behind the fist, receiver along the arm, and a
    // barrel that reaches far enough in front to read as a long gun.
    const heldRifle = player.gun === 'rifle';
    ctx.drawImage(heldRifle ? Sprites.rifleHeldBuild(rifleFit()) : Sprites.pistolHeld,
                  heldRifle ? 1 : 5, heldRifle ? -6 : -5);
    ctx.fillStyle = '#0e0e12';           // gloved hand wrapping the grip
    ctx.fillRect(7, -1, 3, 2);
    ctx.restore();

    if (player.muzzle > 0) {
      // and the flash comes off the end of THIS barrel, not a fixed distance
      const reach = player.gun !== 'rifle' ? 16
        : (fittedId('rifle', 'barrel') === 'barLong' ? 25 : 22);
      const mx = x + Math.cos(player.angle) * reach;
      const my = y - 9 + Math.sin(player.angle) * (reach * 0.56);
      ctx.fillStyle = '#fff2c0';
      ctx.fillRect(Math.round(mx - 2), Math.round(my - 2), 4, 4);
      addLight(mx, my, 0, 22, '255,210,120', 0.5);
    }
  }
}

function drawFolk(f, x, y) {
  drawShadow(x, y, 5);
  const set = Sprites.folk[f.key] || Sprites.folk.vesna;
  ctx.drawImage(set[f.frame], Math.round(x - 8), Math.round(y - 21));
  // A machine puts its own light on the street. Blue while it is still the
  // city's, amber once it is not — and that swap is the Correction.
  if (f.glow) addLight(x, y - 13, 0, 15, f.glow, 0.30);
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
// WHICH PICTURE OF THIS ONE IS ON SCREEN RIGHT NOW. Pulled out of the draw so
// the ghost pass can ask the same question and get the same answer — two copies
// of a frame table drift, and a ghost in the wrong pose is worse than none.
function banditFrame(b) {
  const attacking = b.state === 'windup' || b.state === 'swing';
  if (b.role === 'knife') {
    const set = Sprites.banditKnife[b.v % Sprites.banditKnife.length];
    return attacking ? set[2] : set[b.frame];
  }
  if (b.role === 'pistol')
    return b.state === 'aim' ? Sprites.banditPistol[2] : Sprites.banditPistol[b.frame];
  return b.state === 'aim' ? Sprites.banditRifle[2] : Sprites.banditRifle[b.frame];
}
function scrapperFrame(s) {
  return Sprites.scrapper[(s.state === 'windup' || s.state === 'swing') ? 2 : s.frame];
}

function drawBandit(b, x, y) {
  if (b.dead) {
    // they lie there the same forty-five seconds a machine does, then go
    const fade = Math.max(0, 1 - Math.max(0, b.deadT - CORPSE_LINGER) / CORPSE_FADE);
    if (fade <= 0) return;
    const im = Sprites.banditDead;
    ctx.globalAlpha = (b.looted ? 0.5 : 1) * fade;
    ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height + 4));
    ctx.globalAlpha = 1;
    return;
  }
  drawShadow(x, y, 6);
  const img = banditFrame(b);
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
    // DASHED, not a solid beam. Nobody on this road has a laser sight; this is
    // the game telling you where a barrel is pointed, in the same grammar as
    // the Scrapper's red blink before it swings.
    ctx.setLineDash(b.role === 'rifle' ? [2, 3] : [1, 4]);
    ctx.lineDashOffset = -gameTime * 22;
    ctx.globalAlpha = (b.role === 'rifle' ? 0.14 + 0.42 * t : 0.08 + 0.2 * t);
    ctx.strokeStyle = b.role === 'rifle' ? '#ff5a3c' : '#ffa07a';
    ctx.beginPath();
    ctx.moveTo(Math.round(x), Math.round(y - 12));
    ctx.lineTo(Math.round(ps.x - lastOx), Math.round(ps.y - lastOy - 10));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (b.role === 'rifle') {                 // and the same blink overhead
      ctx.fillStyle = ((performance.now() / 90) | 0) % 2 ? '#ff5a3c' : '#ffb02e';
      ctx.fillRect(Math.round(x - 1), Math.round(y - 25), 2, 2);
    }
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
  if (b.state === 'guard' && b.alert > 0.03) drawSuspicion(x, Math.round(y - 29), b.alert);
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
  const img = scrapperFrame(s);
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
  addLight(x + 0.5, y - 11, 0, hunting ? 14 : 9, CORE_BLUE_RGB, hunting ? 0.5 : 0.3);
  // WHICH WAY IT IS LOOKING. It has a vision cone now, and a cone the player
  // cannot read is not a stealth mechanic, it is bad luck — so its sensor
  // throws a patch of light on the ground in front of it. Amber is the "this
  // can be hurt" colour, so the beam is a cold white-blue instead.
  if (!hunting && s.state !== 'dead') {
    const gaze = isoToScreen(s.x + s.fx * 1.6, s.y + s.fy * 1.6);
    const here = isoToScreen(s.x, s.y);
    addLight(x + (gaze.x - here.x), y + (gaze.y - here.y), 0, 13, '150,190,220', 0.16);
  }
  if (s.state === 'windup') {
    ctx.fillStyle = ((performance.now() / 80) | 0) % 2 ? '#ff5a3c' : '#ffb02e';
    ctx.fillRect(Math.round(x - 1), Math.round(y - 23), 2, 2);
  }
  if (s.state === 'patrol' && s.alert > 0.03) drawSuspicion(x, Math.round(y - 27), s.alert);
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
  // THE PROLOGUE draws the world and nothing else. No health bar, no minimap,
  // no weapon slots — there is no run yet to have a HUD about, and a letterbox
  // with a health bar in the corner of it stops being a letterbox.
  if (GameState === 'prologue') { drawCineOverlay(); return; }

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

  if (GunUI.open) drawGunsmith();

  // The pack covers the whole screen, so the world HUD would print straight
  // through it — health bar under the footer hint, minimap over the tiles.
  // Everything from here to the floating message belongs to the world.
  //
  // The map covers it too. It used to be left running underneath, which was
  // invisible for as long as the map's title sat at the middle of the screen —
  // the moment the map moved over to make room for the objective column, the
  // HUD's own objective line was printing straight through the map's title.
  if (!InvUI.open && !GunUI.open && !MapUI.open) {

  // health bar — colour slides green → yellow → orange → red with amount
  const hpFrac = Math.max(0, player.hp / player.maxHp);
  uiRect(6, VIEW_H - 12, 46, 7, 'rgba(0,0,0,0.55)');
  uiRect(8, VIEW_H - 10, 42, 3, '#2a1410');
  uiRect(8, VIEW_H - 10, Math.round(42 * hpFrac), 3, `hsl(${Math.round(112 * hpFrac)}, 62%, 46%)`);

  // ---------- THE WEAPON PANEL (bottom-right) ----------
  // Laurens, 2026-08-21: *"having the number and the visualisation of the
  // bullets and the amount left all together makes it confusion"*. It was one
  // huddle: `17/24`, a strip of pips and a bare `×30` all inside 84 pixels,
  // three different quantities in one glance with nothing telling them apart.
  //
  // So they are three ROWS now, each answering one question, top to bottom in
  // the order you need them:
  //   1. WHAT AM I HOLDING, and how many rounds are in it — the gun, and one
  //      big number with the capacity small beside it.
  //   2. HOW MANY IS THAT — the strip, one pip a round, its own line.
  //   3. WHAT IS LEFT, and can I burst — a labelled pocket total, and the
  //      recharge bar for the right-hand trigger.
  // A rule between 2 and 3 keeps the gun's rounds and your pocket's apart.
  const showGun = player.active === 'gun' && player.hasGun;
  const SLOT_W = 88, SLOT_H = showGun ? 42 : 22;
  const slotX = VIEW_W - SLOT_W - 6, slotY = VIEW_H - SLOT_H - 5;
  uiRect(slotX, slotY, SLOT_W, SLOT_H, 'rgba(0,0,0,0.62)');
  if (showGun) {
    const G = gunStats(player.gun);       // as MODIFIED — see js/mods.js
    const A = player.arms[player.gun] || player.arms.pistol;
    const isRifle = player.gun === 'rifle';
    const low = A.loaded <= G.cap / 3;
    const col = A.loaded === 0 ? '#ff5a3c' : low ? '#ffd27a' : '#e8d9c0';

    // ---- 1. the gun, and what is in it
    uiIcon(isRifle ? Sprites.rifleIconSBuild(rifleFit()) : Sprites.pistolIcon,
           slotX + 4, slotY + (isRifle ? 4 : 1));
    const capTxt = '/' + G.cap;
    ptext(capTxt, slotX + SLOT_W - 4, slotY + 10, 7, 'rgba(232,217,192,0.45)', 'right');
    ptext(String(A.loaded), slotX + SLOT_W - 5 - ptWidth(capTxt, 7), slotY + 3, 14, col, 'right');

    // ---- 2. the same number as a magazine you can read without counting
    const sy = slotY + 21, sw = SLOT_W - 8;
    if (player.reloadT > 0) {
      // the pause made visible: the strip gives way to a filling bar
      const f = 1 - Math.max(0, player.reloadT) / G.reload;
      uiRect(slotX + 4, sy, sw, 6, 'rgba(255,255,255,0.12)');
      uiRect(slotX + 4, sy, Math.round(sw * f), 6, '#7ad27a');
    } else {
      // ONE PIP PER ROUND, sized to the magazine: twelve fit easily, a drum's
      // twenty-four fit thinner, and below a 2px pitch it becomes the bar it
      // was turning into anyway, ticked every six rounds so it can be counted.
      const pitch = Math.max(1, Math.min(5, Math.floor(sw / G.cap)));
      const pipCol = low ? '#ffd27a' : '#c9c9d2';
      if (pitch >= 2) {
        for (let i = 0; i < G.cap; i++)
          uiRect(slotX + 4 + i * pitch, sy, pitch - 1, 6, i < A.loaded ? pipCol : '#2a2c31');
      } else {
        const w = Math.min(sw, G.cap);
        uiRect(slotX + 4, sy, w, 6, '#2a2c31');
        uiRect(slotX + 4, sy, Math.round(w * A.loaded / G.cap), 6, pipCol);
        for (let r = 6; r < G.cap; r += 6)
          uiRect(slotX + 4 + Math.round(w * r / G.cap), sy, 1, 6, 'rgba(10,8,6,0.85)');
      }
      // an empty gun with rounds to put in says so over the empty strip
      if (A.loaded === 0 && A.reserve > 0) {
        const pulse = 0.55 + 0.45 * Math.sin(gameTime * 6);
        ptext('PRESS R', slotX + SLOT_W - 5, sy, 7, `rgba(255,210,122,${pulse})`, 'right');
      }
    }

    // ---- 3. what is left, and the right-hand trigger
    uiRect(slotX + 4, slotY + 30, sw, 1, 'rgba(232,217,192,0.14)');
    const by = slotY + 33;
    ptext('POCKET', slotX + 4, by, 7, 'rgba(232,217,192,0.35)');
    ptext(A.reserve > 999 ? '999' : String(A.reserve), slotX + 4 + ptWidth('POCKET ', 7), by, 7,
          A.reserve === 0 ? '#ff5a3c' : '#e8d9c0');
    if (G.burst > 1) {
      // THE BURST IS AN ABILITY, so it gets an ability's bar: full and amber
      // when the right button will do something, filling back up when it will
      // not. Nothing else in this panel is amber while it is recharging, so
      // the eye can find it without reading it.
      // labelled RMB, not BURST: the bar's job is to say WHICH BUTTON is ready,
      // and the word has to fit beside the pocket total without touching it
      const bw = 20, bx = slotX + SLOT_W - 4 - bw;
      const cool = G.burstCool || 2;
      const f = Math.max(0, Math.min(1, 1 - player.burstCd / cool));
      const ready = player.burstCd <= 0;
      ptext('RMB', bx - 3, by, 7, ready ? '#ffd27a' : 'rgba(232,217,192,0.35)', 'right');
      uiRect(bx, by, bw, 6, '#2a2c31');
      uiRect(bx, by, Math.round(bw * f), 6, ready ? '#ffd27a' : '#6a6a72');
    }
  } else if (player.melee) {
    const mi = player.melee === 'pipe' ? Sprites.pipeIcon : Sprites.knifeIcon;
    uiIcon(mi, slotX + 6, slotY + 6);
  } else {
    ptext('UNARMED', slotX + 6, slotY + 8, 7, 'rgba(232,217,192,0.45)');
  }
  if (player.melee && player.hasGun && player.scrollHintT > 0) {
    ptext('scroll', VIEW_W - 40, VIEW_H - 52, 7, 'rgba(232,217,192,0.35)', 'center');
  }

  // What now, and where. Read ONCE per frame and shared by the HUD line below
  // and the dot on the minimap, so the two can never disagree.
  const obj = currentObjective();

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
  // FOG, SOFTLY. The two maps used to disagree about what the traveller knows:
  // M showed walked ground only, the minimap showed the whole area including
  // streets you have never seen. Unexplored ground is dimmed rather than
  // blacked out, so a new area reads as UNLIT instead of MISSING — you can
  // still make out the shape of the street you are about to walk down.
  for (let j = 0; j < fogH; j++) {
    for (let i = 0; i < fogW; i++) {
      if (explored[j * fogW + i]) continue;
      const fx = mx + i * FOG * MMS - srcX, fy = my + j * FOG * MMS - srcY;
      const x0 = Math.max(mx, fx), y0 = Math.max(my, fy);
      const x1 = Math.min(mx + mw, fx + FOG * MMS), y1 = Math.min(my + mh, fy + FOG * MMS);
      if (x1 <= x0 || y1 <= y0) continue;
      uiRect(x0, y0, x1 - x0, y1 - y0, 'rgba(10,12,14,0.65)');
    }
  }
  function blip(wx, wy, col) {
    const px2 = mx + wx * MMS - srcX - 1, py2 = my + wy * MMS - srcY - 1;
    if (px2 < mx - 1 || py2 < my - 1 || px2 > mx + mw || py2 > my + mh) return;
    uiRect(px2, py2, 2, 2, col);
  }
  for (const it of items) blip(it.x, it.y, '#ffd27a');
  // NO NPC BLIPS. Green is the objective and nothing else now — a green dot on
  // every person made the yard's marker work by accident, and the camp turned
  // it into seven dots that mean nothing.
  for (const ex of (currentAreaDef().exits || [])) {
    if (ex.needsGate && !(gateProp && gateProp.open)) continue;
    blip((ex.x0 + ex.x1) / 2, (ex.y0 + ex.y1) / 2, '#4fc3ff');
  }
  for (const sc of scrappers) {
    if (sc.state !== 'dead' && sc.state !== 'off' &&
        Math.hypot(sc.x - player.x, sc.y - player.y) < 8)
      blip(sc.x, sc.y, '#ff5a3c');
  }
  if (currentAreaDef().hasDroids) {
    for (const d of droids) {
      if (d.state === 'dead') continue;
      if (Math.hypot(d.x - player.x, d.y - player.y) < 8) blip(d.x, d.y, '#ff5a3c');
    }
  }
  // the objective, if it is in the area you are standing in. Same source as
  // the HUD line and the map — it pulses so it reads as a marker, not a prop.
  if (obj && obj.area === currentArea) {
    const qx = mx + obj.x * MMS - srcX, qy = my + obj.y * MMS - srcY;
    if (qx > mx - 2 && qy > my - 2 && qx < mx + mw + 2 && qy < my + mh + 2) {
      const qi = Sprites.icoQuest;
      g.globalAlpha = 0.72 + 0.28 * Math.sin(gameTime * 3);
      g.imageSmoothingEnabled = false;
      g.drawImage(qi, Math.round(qx - qi.width / 2) * U, Math.round(qy - qi.height / 2) * U,
                  qi.width * U, qi.height * U);
      g.globalAlpha = 1;
    }
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

  // mission objective (top-left) — from the same `obj` the minimap dot uses
  if (obj) {
    ptext('*', 8, 8, 8, '#ffd27a');
    ptext(obj.title, 16, 8, 8);
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

  }   // ---- end of the world HUD ----

  // THE MAP — everywhere you have walked, and nothing you haven't.
  // One world space at MapUI.zoom pixels per tile: framing an area and framing
  // the whole city are the same draw call with a different number in it.
  if (MapUI.open) {
    uiRect(0, 0, VIEW_W, VIEW_H, 'rgba(6,7,8,0.9)');
    const z = MapUI.zoom;
    // the HUD's `obj` lives inside the world-HUD block, which is skipped while
    // the map is up — same function, same answer, read again here
    const mobj = currentObjective();
    // world tile -> screen pixel
    const sx2 = (wx) => MAP_VIEW_W / 2 + (wx - MapUI.cx) * z;
    const sy2 = (wy) => MAP_TOP + MAP_VIEW_H / 2 + (wy - MapUI.cy) * z;

    // ---- the ground: one cached thumbnail per area you have been in.
    // Two passes, because the areas overlap on screen and the second area's
    // ground would otherwise paint over the first area's name.
    const drawn = [];
    for (const id of Object.keys(Areas)) {
      const th = mapThumbs[id];
      if (!th) continue;
      const def = Areas[id];
      if (def.indoors && id !== currentArea) continue;         // rooms, not places
      const ox2 = sx2(def.world.x), oy2 = sy2(def.world.y);
      const w2 = th.width * FOG * z, h2 = th.height * FOG * z;
      if (ox2 > MAP_VIEW_W || oy2 > VIEW_H || ox2 + w2 < 0 || oy2 + h2 < 0) continue;
      uictx.imageSmoothingEnabled = false;
      uictx.globalAlpha = id === currentArea ? 1 : 0.82;
      uictx.drawImage(th, Math.round(ox2 * U), Math.round(oy2 * U),
                      Math.round(w2 * U), Math.round(h2 * U));
      uictx.globalAlpha = 1;
      drawn.push({ id, def, ox2, oy2, w2, h2 });
    }
    // AN AREA IS A THING YOU CAN CLICK. Its rectangle is exactly the ground
    // just drawn, so the target and the picture can never drift apart.
    MapUI.areaHits = drawn.map(d => ({ id: d.id, x: d.ox2, y: d.oy2, w: d.w2, h: d.h2 }));
    // the one you have clicked into gets a hairline around it, so "I am looking
    // at the Fringe" is something the map says rather than something you infer
    if (MapUI.focus) {
      const d = drawn.find(q => q.id === MapUI.focus);
      if (d) {
        uictx.strokeStyle = 'rgba(255,210,122,0.55)'; uictx.lineWidth = U;
        uictx.strokeRect(Math.round(d.ox2 * U) - U, Math.round(d.oy2 * U) - U,
                         Math.round(d.w2 * U) + 2 * U, Math.round(d.h2 * U) + 2 * U);
      }
    }
    // Names, once an area is small enough to need telling apart — and the one
    // you are standing in is named in WHITE, which is how the map says "you"
    // now that no text follows the marker around. It is skipped only while you
    // have clicked into an area, where the header above already names it and a
    // second copy would sit directly under the first.
    if (z < 1) for (const d of drawn) {
      const you = d.id === currentArea;
      if (you && MapUI.focus) continue;
      // A NAME BELONGS OVER ITS OWN GROUND. The label used to be clamped to the
      // edge of the view, so an area mostly off-frame slid its name sideways
      // across whatever district WAS on screen — "THE JUNKYARD" written over
      // the middle of the Fringe. It is centred on the part of the area you can
      // actually see now, and an area with almost none of it in frame does not
      // get to write on top of one that is.
      const vx0 = Math.max(0, d.ox2), vx1 = Math.min(MAP_VIEW_W, d.ox2 + d.w2);
      if (vx1 - vx0 < Math.min(d.w2, 40) * 0.5) continue;
      const lw = ptWidth(d.def.name, 7);
      const lx = Math.max(lw / 2 + 4, Math.min(MAP_VIEW_W - lw / 2 - 4, (vx0 + vx1) / 2));
      const ly = Math.max(MAP_TOP, d.oy2 - 9);
      // A name wider than its own district has nowhere to go but over its
      // neighbour — THE JUNKYARD is fifty pixels of text on a twenty-six pixel
      // square. A plate under it keeps it reading as a label on the map rather
      // than as marks in the ground it is lying across.
      uiRect(lx - lw / 2 - 2, ly - 1, lw + 4, 9, 'rgba(8,10,12,0.72)');
      ptext(d.def.name, lx, ly, 7,
            you ? 'rgba(255,255,255,0.85)' : 'rgba(232,217,192,0.55)', 'center');
    }

    // ---- the places, at a FIXED pixel size whatever the zoom. What changes
    // with zoom is how many are drawn, not how big they are.
    const hits = [];
    for (const p of visiblePois()) {
      const px3 = sx2(poiWorldX(p)), py3 = sy2(poiWorldY(p));
      if (px3 < -8 || py3 < -8 || px3 > MAP_VIEW_W + 4 || py3 > VIEW_H + 8) continue;
      const img = POI_ICON[p.kind];
      if (!img) continue;
      uictx.imageSmoothingEnabled = false;
      const sel = MapUI.sel && MapUI.sel.id === p.id;
      if (sel) uiRect(px3 - img.width / 2 - 1, py3 - img.height / 2 - 1,
                      img.width + 2, img.height + 2, 'rgba(255,210,122,0.30)');
      uictx.drawImage(img, Math.round(px3 - img.width / 2) * U,
                      Math.round(py3 - img.height / 2) * U, img.width * U, img.height * U);
      hits.push({ poi: p, x: px3, y: py3 });
    }
    MapUI.hits = hits;

    // Anything drawn over the ground has to stay inside the map's own region.
    // The pins were already culled; the objective dot and the "you" marker were
    // not, so panning your own district off the edge painted them over the
    // objective column beside it.
    const inMapView = (x, y) => x >= -8 && x <= MAP_VIEW_W + 4 && y >= -8 && y <= VIEW_H + 8;

    // ---- the objective, over everything, and the only green on the map
    if (mobj && Areas[mobj.area] && mapThumbs[mobj.area]) {
      const qw = Areas[mobj.area].world;
      const qx2 = sx2(qw.x + mobj.x), qy2 = sy2(qw.y + mobj.y);
      const qi = Sprites.icoQuest;
      if (!inMapView(qx2, qy2)) { MapUI.questHit = null; }
      else {
      uictx.globalAlpha = 0.7 + 0.3 * Math.sin(gameTime * 3);
      uictx.imageSmoothingEnabled = false;
      uictx.drawImage(qi, Math.round(qx2 - qi.width / 2) * U, Math.round(qy2 - qi.height / 2) * U,
                      qi.width * U, qi.height * U);
      uictx.globalAlpha = 1;
      MapUI.questHit = { x: qx2, y: qy2 };
      }
    } else MapUI.questHit = null;

    // ---- YOU. One symbol at every zoom.
    // This used to draw the traveller's actual sprite once the map was close
    // enough — a seventeen-pixel person standing on a flat plan of roads and
    // rooftops, at a scale nothing else on the map was drawn at, and morphing
    // into a 3px dot the moment you pulled back. A marker that changes what it
    // IS with the zoom is two markers. It is the tile symbol now, the same size
    // as every pin, with a slow ping going out from it so you can find yourself
    // on the ring without hunting.
    const cw = currentAreaDef().world;
    const pxm = sx2(cw.x + player.x), pym = sy2(cw.y + player.y);
    if (inMapView(pxm, pym)) {
      // the ping: an iso diamond, drawn a pixel at a time because the whole
      // game is pixels and ctx.arc would put grey fringes on it
      const t = (gameTime * 0.8) % 1;
      const rr = 4 + t * 8;
      uictx.globalAlpha = (1 - t) * 0.5;
      for (let i = 0; i <= rr; i++) {
        const dy = (rr - i) / 2;
        uiRect(pxm + i, pym + dy, 1, 1, '#ffffff');
        uiRect(pxm + i, pym - dy, 1, 1, '#ffffff');
        uiRect(pxm - i, pym + dy, 1, 1, '#ffffff');
        uiRect(pxm - i, pym - dy, 1, 1, '#ffffff');
      }
      uictx.globalAlpha = 1;
      const yi = Sprites.icoYou;
      uictx.imageSmoothingEnabled = false;
      uictx.drawImage(yi, Math.round(pxm - yi.width / 2) * U, Math.round(pym - yi.height / 2) * U,
                      yi.width * U, yi.height * U);
    }
    // NO FLOATING LABEL. "YOU ARE HERE" was printed under the marker wherever
    // the marker happened to be, so it laid itself across roads, over an area's
    // own name, and through whatever else was on that spot. Text pinned to a
    // moving point has nowhere safe to go. The district labels below say it
    // instead, by drawing the one you are standing in in white — the colour
    // that has always meant you — which names every area AND answers "where am
    // I" in one thing rather than two.

    // What you are looking at: a place if you picked one, the area you have
    // clicked into, and otherwise the ring — the areas label themselves down on
    // the map, so this must not repeat one.
    // "THE RING" is a lie on the first day, when the junkyard is the only ground
    // you have walked and the ring is a rumour — so one area names itself.
    ptext(MapUI.sel ? MapUI.sel.name
        : MapUI.focus ? Areas[MapUI.focus].name
        : drawn.length === 1 ? drawn[0].def.name
        : 'THE RING',
          MAP_VIEW_W / 2, 8, 8, '#ffd27a', 'center');

    // ---- the strip: what this place is, and whether you can go there
    if (MapUI.sel) {
      // sized to what it has to say — a fixed 42px box left a hand's width of
      // empty panel under every two-line blurb
      const p = MapUI.sel;
      const blurb = ptFit(p.blurb, MAP_VIEW_W - 24, 7).slice(0, 3);
      const ph2 = 19 + blurb.length * 9, py4 = VIEW_H - ph2 - 12;
      uiRect(6, py4, MAP_VIEW_W - 12, ph2, 'rgba(10,12,14,0.92)');
      uictx.strokeStyle = '#3a4a52'; uictx.lineWidth = U;
      uictx.strokeRect(6 * U, py4 * U, (MAP_VIEW_W - 12) * U, ph2 * U);
      ptext(p.name, 11, py4 + 4, 8, '#ffd27a');
      let ly = py4 + 15;
      for (const line of blurb) {
        ptext(line, 11, ly, 7, '#e8d9c0'); ly += 9;
      }
      const t = travelState(p);
      if (t) ptext(t.text, MAP_VIEW_W - 11, py4 + 4, 8, t.ok ? '#7ad27a' : 'rgba(232,217,192,0.4)', 'right');
    }

    ptext(MapUI.focus ? 'click it again to back out  ·  M closes'
                      : 'click an area to look at it  ·  M closes',
          MAP_VIEW_W / 2, VIEW_H - 8, 7, 'rgba(232,217,192,0.5)', 'center');

    drawMapColumn();
    return;
  }

  // THE PACK — full screen, world frozen while it is open
  if (InvUI.open) {
    uiRect(0, 0, VIEW_W, VIEW_H, 'rgba(0,0,0,0.72)');
    ptext('THE PACK', VIEW_W / 2, 7, 8, '#ffd27a', 'center');

    const tabs = visibleTabs();
    const items = tabs.length ? itemsOnTab(tabs[InvUI.tab].id) : [];
    const sel = items[InvUI.cur] || null;

    // ---- tabs. A tab with nothing in it is not drawn at all ----
    const tabRects = packTabRects(tabs);
    for (let i = 0; i < tabs.length; i++) {
      const r = tabRects[i], on = i === InvUI.tab;
      if (on) uiRect(r.x, r.y, r.w, r.h, 'rgba(255,210,122,0.16)');
      ptext(tabs[i].label, r.x + 4, r.y + 3, 8, on ? '#ffd27a' : 'rgba(232,217,192,0.45)');
    }
    uiRect(PACK.GX0, 37, VIEW_W - PACK.GX0 * 2, 1, '#5a4a38');

    if (tabs.length === 0) {
      ptext('You are carrying nothing at all.', VIEW_W / 2, 90, 8, 'rgba(232,217,192,0.5)', 'center');
    }

    // ---- the grid ----
    for (let i = 0; i < PACK.COLS * PACK.ROWS; i++) {
      const c = packCell(i), it = items[i];
      // every slot draws its well, so the grid reads as a grid and not as a
      // ragged row of whatever you happen to be carrying
      uiRect(c.x, c.y, c.w, c.h, it ? 'rgba(28,24,20,0.92)' : 'rgba(18,16,14,0.55)');
      if (!it) continue;
      const cur = i === InvUI.cur;
      if (cur) uiRect(c.x, c.y, c.w, c.h, 'rgba(255,210,122,0.18)');
      const img = it.icon();
      if (img) {
        const sc = packIconScale(img, it);
        uiIcon(img, c.x + (c.w - img.width * sc) / 2, c.y + (c.h - img.height * sc) / 2, sc);
      }
      // count badge, and only where a count means anything — never "x1" on
      // the one pipe you own
      const n = it.count ? it.count() : null;
      if (n !== null && n !== undefined) {
        const label = 'x' + n, lw = ptWidth(label, 7);
        uiRect(c.x + c.w - lw - 3, c.y + c.h - 9, lw + 3, 9, 'rgba(10,8,6,0.8)');
        ptext(label, c.x + c.w - 2, c.y + c.h - 8, 7, '#e8d9c0', 'right');
      }
      if (it.equipped && it.equipped()) uiRect(c.x, c.y, c.w, 2, '#7ad27a');
      // the cursor's border goes on last so nothing paints over it
      if (cur) {
        uictx.strokeStyle = '#ffd27a';
        uictx.lineWidth = U;
        uictx.strokeRect(c.x * U, c.y * U, c.w * U, c.h * U);
      }
    }

    // ---- the description panel: what it is, and what it is for ----
    if (sel) {
      uiRect(PACK.PX0, PACK.PY0, PACK.PW, PACK.PH, 'rgba(18,16,14,0.72)');
      let y = PACK.PY0 + 6;
      for (const line of ptFit(sel.name, PACK.PW - 12, 8)) {
        ptext(line, PACK.PX0 + 6, y, 8, '#ffd27a');
        y += 10;
      }
      const n = sel.count ? sel.count() : null;
      if (n !== null && n !== undefined) {
        ptext('carrying ' + n + (sel.countLabel ? ' ' + sel.countLabel : ''),
              PACK.PX0 + 6, y, 7, 'rgba(232,217,192,0.6)');
        y += 9;
      }
      y += 3;
      uiRect(PACK.PX0 + 6, y, PACK.PW - 12, 1, '#5a4a38');
      y += 6;
      for (const line of ptFit(sel.desc, PACK.PW - 12, 7)) {
        ptext(line, PACK.PX0 + 6, y, 7, '#e8d9c0');
        y += 9;
      }
    }

    // the only key worth naming is the one that gets you out
    ptext('I — close inventory', VIEW_W / 2, VIEW_H - 11, 7,
          'rgba(232,217,192,0.38)', 'center');

    // ---- the ask, over everything ----
    if (InvUI.ask) {
      const it = items.find(i => i.id === InvUI.ask.id);
      const r = packAskRect();
      uiRect(0, 0, VIEW_W, VIEW_H, 'rgba(0,0,0,0.45)');
      uiFrame(r.x, r.y, r.w, r.h);
      for (const line of ptFit(it ? it.name : '', r.w - 10, 8)) {
        ptext(line, r.x + r.w / 2, r.y + 7, 8, '#ffd27a', 'center');
      }
      const btns = packAskButtons();
      const labels = [packAskVerb(it), 'CANCEL'];
      for (let i = 0; i < 2; i++) {
        const b = btns[i], on = InvUI.askHover === i;
        uiRect(b.x, b.y, b.w, b.h, on ? 'rgba(255,210,122,0.22)' : 'rgba(255,255,255,0.06)');
        uictx.strokeStyle = on ? '#ffd27a' : '#5a4a38';
        uictx.lineWidth = U;
        uictx.strokeRect(b.x * U, b.y * U, b.w * U, b.h * U);
        ptext(labels[i], b.x + b.w / 2, b.y + 3, 8,
              on ? '#ffd27a' : 'rgba(232,217,192,0.7)', 'center');
      }
    }
  }

  // trade panel + your items alongside it
  // Nothing about any particular trader is written here any more: the rows,
  // the prices and the sold-out state all come off Trade.stock.
  if (Trade.open) {
    const rows = Trade.stock;
    const sw = 78, gap = 6;
    // THE PANEL FITS WHAT IS IN IT. It was 168px wide whatever the rows said,
    // which held up exactly as long as every row was one of Marek's three
    // short ones — Bo's "straighten it" printed straight through its own
    // "3 tech + 10 scrap" and both became mush. Measure first, then size.
    const LAB_X = 26, PAD_R = 8, MID = 10;
    const rowLabel = (r, i) => '[' + (i + 1) + '] ' + r.label;
    const rowCost = (r) => ((r.sold && r.sold()) ? 'SOLD' : costText(r));
    let need = 150;
    rows.forEach((r, i) => {
      need = Math.max(need,
        LAB_X + ptWidth(rowLabel(r, i), 8) + MID + ptWidth(rowCost(r), 8) + PAD_R);
    });
    // ...clamped to what is actually left beside the YOURS column
    const pw = Math.min(VIEW_W - sw - gap - 8, Math.ceil(need));
    const ph = 18 + rows.length * 12 + 20;
    const total = pw + gap + sw;
    const px0 = (VIEW_W - total) / 2, py0 = (VIEW_H - ph) / 2 - 8;
    const DIM = 'rgba(232,217,192,0.4)';
    uiFrame(px0, py0, pw, ph);
    ptext(Trade.verb + ' — ' + Trade.who, px0 + pw / 2, py0 + 5, 8, '#7ad27a', 'center');
    rows.forEach((r, i) => {
      const ry = py0 + 18 + i * 12;
      const gone = r.sold && r.sold();
      const col = (gone || !canAfford(r)) ? DIM : '#e8d9c0';
      const cost = rowCost(r);
      uiIcon(r.icon(), px0 + 7, ry + 1);
      // and the backstop: a row too long even for the widest panel is cut,
      // never overprinted. A price you cannot read is worse than a short name.
      const room = pw - PAD_R - MID - ptWidth(cost, 8) - LAB_X;
      ptext(ptClip(rowLabel(r, i), room, 8), px0 + LAB_X, ry, 8, col);
      ptext(cost, px0 + pw - PAD_R, ry, 8, col, 'right');
    });
    ptext('E close', px0 + pw / 2, py0 + ph - 13, 7, 'rgba(232,217,192,0.6)', 'center');

    // what you're carrying, right next to the offer
    const sx0 = px0 + pw + gap;
    uiFrame(sx0, py0, sw, ph);
    ptext('YOURS', sx0 + sw / 2, py0 + 5, 8, '#ffd27a', 'center');
    const mine = [
      [Sprites.scrapBit, player.inv.scrap],
      [Sprites.techIcon, player.inv.tech],
      [Sprites.ammo, reserveOf('pistol')],
      [Sprites.ammoRifle, reserveOf('rifle')],
      [Sprites.snackIcon, player.inv.snack],
      [Sprites.mreBeef, player.inv.mreBeef],
      [Sprites.mreChicken, player.inv.mreChicken],
    ];
    // scrap, tech and ammo always; rations only if you have any — and never
    // more lines than the frame is tall, whoever's counter this is
    const shown = mine.filter((m, i) => i < 3 || m[1] > 0)
      .slice(0, Math.floor((ph - 26) / 12));
    shown.forEach((m, i) => {
      const ry = py0 + 18 + i * 12;
      uiIcon(m[0], sx0 + 6, ry + 1);
      ptext('× ' + m[1], sx0 + sw - 6, ry, 8, '#e8d9c0', 'right');
    });
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

// ---------- THE TITLE'S BACKDROP: where you actually left off ----------
// The title screen renders the live world behind its wash, and the live world
// at boot is whatever `buildJunkyard()` left standing there. So a run twelve
// hours deep into the Fringe was welcomed back by a picture of the tutorial
// yard — the one place the traveller had most certainly moved on from.
//
// The save is NOT applied here, and must not be: pressing [N] instead has to
// start a run that owes the old one nothing. This stands the camera where the
// save left off and no more. It builds that area, unpacks its fog — which
// fills in the world map's thumbnails as a side effect, ready before the player
// has pressed anything — restores what that area remembers, and puts the
// traveller where they logged out. No inventory, no mission, no machines: every
// one of those is either loaded properly by [E] or cleared by [N].
//
// It runs down here rather than beside `loadSaveData()` at the top of the file
// because `exploredByArea` and `mapThumbs` are `const` declarations halfway
// down it, and reaching them earlier is a temporal dead zone, not a value.
function previewSaveArea(d) {
  const id = Areas[d.area] && !Areas[d.area].memory ? d.area : 'junkyard';
  loadFogAndThumbs(d.fog);
  for (const k of Object.keys(d.areas || {})) areaState[k] = d.areas[k];
  currentArea = id;
  Areas[id].build();
  initFog(id);
  buildMinimap();
  loadAreaItems(id);
  restoreArea(id);
  buildFolk(Areas[id].folk);
  const p = d.player || {};
  const ok = typeof p.x === 'number' && typeof p.y === 'number' &&
             p.x > 1 && p.y > 1 && p.x < MAP_W - 1 && p.y < MAP_H - 1;
  player.x = ok ? p.x : MAP_W / 2;
  player.y = ok ? p.y : MAP_H / 2;
  camInit = false;               // the camera snaps to them on the first frame
}
if (pendingSave && !window.ARENA_MODE) previewSaveArea(pendingSave);

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
