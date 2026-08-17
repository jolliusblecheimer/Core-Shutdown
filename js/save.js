// Save system — browser localStorage, versioned, autosaving.
// The whole run fits in a few KB under one key.
const SAVE_KEY = 'coreshutdown_save_v1';

let playerName = '';

function saveGame() {
  // only ever persist real gameplay — never menu/test/title/arena states
  if (window.ARENA_MODE) return;
  if (typeof GameState !== 'undefined' && GameState !== 'playing') return;
  try {
    const d = {
      v: 1,
      name: playerName,
      player: {
        x: player.x, y: player.y, hp: player.hp, ammo: player.ammo,
        melee: player.melee, hasGun: player.hasGun, active: player.active,
        owned: { ...player.owned }, inv: { ...player.inv },
        respawnX: player.respawnX, respawnY: player.respawnY, homeSet: player.homeSet,
        scrollHintT: Math.max(0, player.scrollHintT),
        combatT: 99,
      },
      mission: mission.state,
      kills: scrapper.kills,
      bossDown: typeof bossDefeated !== 'undefined' ? bossDefeated : false,
      barrels: boomBarrels.map(b => b.alive),
      items: items.map(it => ({ ...it })),
      tut: { ...Tut.done },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
  } catch (e) { /* storage full or blocked — play on without saving */ }
}

function loadSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || !d.name) return null;   // future versions migrate here
    return d;
  } catch (e) { return null; }
}

function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

// pour a loaded save back into the live game state
function applySave(d) {
  playerName = d.name;
  Object.assign(player, d.player);
  player.owned = { ...d.player.owned };
  player.inv = { ...d.player.inv };
  player.dead = 0; player.iframes = 1; player.flash = 0;
  player.swing = 0; player.swingCd = 0; player.fireCd = 0;
  mission.state = d.mission;
  scrapper.kills = d.kills || 0;
  if (d.bossDown) {
    bossDefeated = true;
    openGate();
  }
  (d.barrels || []).forEach((alive, i) => {
    const b = boomBarrels[i];
    if (b && !alive && b.alive) {
      b.alive = false;
      solid[b.gy][b.gx] = false;
      const pi = props.indexOf(b.prop);
      if (pi >= 0) props.splice(pi, 1);
    }
  });
  items.length = 0;
  (d.items || []).forEach(it => items.push(it));
  Object.assign(Tut.done, d.tut || {});
  // robots re-enter the yard fresh (never saved mid-chase)
  if (mission.state !== 'none') spawnScrapper();
}

// three exit hooks — browsers don't reliably fire any single one of these,
// but together they cover close, refresh, tab-switch and mobile kill
window.addEventListener('beforeunload', () => saveGame());
window.addEventListener('pagehide', () => saveGame());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveGame();
});
