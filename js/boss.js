// THE COMPACTOR — first boss, and the template for all bosses.
// Armor model (Laurens): most of the body takes normal damage; the FRONT
// crusher plate is armored (bullets/pipe clank, the piercing knife bites at
// half). The EYE is the obvious glowing weak point (2x). Charge-crash stagger
// throws the plates open: everything hits, 1.5x.
const boss = {
  active: false,
  x: 0, y: 0, r: 0.95,
  fx: 0, fy: 1,               // world-space facing (normalized)
  hp: 200, maxHp: 200,
  state: 'hidden',            // reveal | pursue | slam | charge | stagger | spray | dead
  t: 0, anim: 0,
  chargeDX: 0, chargeDY: 0, chargeDist: 0,
  didHit: false,
  atkCd: 3, sprayCd: 6, novaCd: 6,
  shots: [],                  // boss projectiles {x,y,vx,vy,life}
  phase: 1,                   // 1 → 2 (at 66%) → 3 (at 33%), shield between
  pendingPhase: 0,
  name: 'THE COMPACTOR',
};

let bossDefeated = false;

// the gate cutscene: key goes in the lock — and the yard answers
const GateCine = { active: false, t: 0, spawned: false };

function startGateCine() {
  GateCine.active = true;
  GateCine.t = 0;
  GateCine.spawned = false;
  boss.fightPX = player.x; boss.fightPY = player.y;
  showMsg('You slot the key. The lock grinds...', 2.4);
  SFX.uiOpen();
}

function updateGateCine(dt) {
  if (!GateCine.active) return;
  GateCine.t += dt;
  if (GateCine.t > 1.1 && GateCine.t < 1.5) addShake(1.4);
  if (GateCine.t >= 1.5 && !GateCine.spawned) {
    GateCine.spawned = true;
    spawnBoss(26.5, 12.5);            // it was the junk pile behind you all along
    SFX.rage();
    think('gateboss', 'Behind me—!');
  }
  if (GateCine.spawned && boss.state !== 'reveal') {
    GateCine.active = false;
    // two packs of rounds shake loose from the junk for the fight
    items.push({ type: 'ammo', x: 27.5, y: 9.0, amount: 6, bob: 0.4, bossAmmo: true });
    items.push({ type: 'ammo', x: 27.5, y: 16.0, amount: 6, bob: 1.7, bossAmmo: true });
    showMsg('Rounds glint in the junk — grab them!', 3);
  }
}

const Thoughts = { done: {}, text: '', t: 0 };
function think(id, text) {
  if (Thoughts.done[id]) return;
  Thoughts.done[id] = true;
  Thoughts.text = text;
  Thoughts.t = 3.2;
}

let hitPause = 0;

function spawnBoss(x, y) {
  boss.active = true;
  boss.x = x; boss.y = y;
  boss.hp = boss.maxHp;
  boss.state = 'reveal';
  boss.t = 0;
  boss.shots.length = 0;
  boss.atkCd = 2.5; boss.sprayCd = 6;
  boss.phase = 1; boss.pendingPhase = 0;
  boss.stuckT = 0; boss.slideSide = 0;
  boss.lastX = x; boss.lastY = y;
  boss.homeX = x; boss.homeY = y;
  // where you were standing when it rose — where you come back to if it wins
  if (boss.fightPX === undefined) { boss.fightPX = player.x; boss.fightPY = player.y; }
  const dx = player.x - x, dy = player.y - y;
  const d = Math.hypot(dx, dy) || 1;
  boss.fx = dx / d; boss.fy = dy / d;
}

function bossEyePos() { return { x: boss.x + boss.fx * 0.8, y: boss.y + boss.fy * 0.8 }; }

// Dying to the Compactor costs you the attempt, not the evening. The yard
// resets around you: it goes back to its pile, you go back to the gate, the
// rounds are lying in the junk again. Walk in and try it once more.
function resetBossFight() {
  if (!boss.active || boss.state === 'dead') return false;
  boss.shots.length = 0;
  boss.absorbs = []; boss.debris = [];
  GateCine.active = false; GateCine.spawned = true;
  cineZoom = 1;
  const px2 = boss.fightPX ?? 24.5, py2 = boss.fightPY ?? 20.5;
  player.x = px2; player.y = py2;
  player.hp = player.maxHp;
  player.iframes = 2.5;
  // the two packs of rounds shake loose again for the new attempt
  for (let i = items.length - 1; i >= 0; i--) if (items[i].bossAmmo) items.splice(i, 1);
  items.push({ type: 'ammo', x: 27.5, y: 9.0, amount: 6, bob: 0.4, bossAmmo: true });
  items.push({ type: 'ammo', x: 27.5, y: 16.0, amount: 6, bob: 1.7, bossAmmo: true });
  spawnBoss(boss.homeX ?? 26.5, boss.homeY ?? 12.5);
  showMsg('It hauls itself back onto the heap. Again.', 3.5);
  addShake(4);
  SFX.rage();
  return true;
}

// the Compactor does not path around junk — it goes THROUGH it.
// Only walls and trash mountains (isHeavy) stop it. Everything else it
// flattens; explosive barrels it rolls over detonate (and hurt it).
function bossMove(dx, dy) {
  let moved = false;
  if (dx !== 0 && bossCanStand(boss.x + dx, boss.y, 0.7)) { boss.x += dx; moved = true; }
  if (dy !== 0 && bossCanStand(boss.x, boss.y + dy, 0.7)) { boss.y += dy; moved = true; }
  crushUnder();
  return moved;
}

// ---- IT ALWAYS COMES. Three escalating answers to being blocked. ----
// 1. slide along whatever it is pressed against
// 2. still pinned after a moment: smash the obstruction (it is a compactor)
// 3. hopelessly wedged: haul itself out through the junk, somewhere near
function bossUnstick(dt, ux, uy, step) {
  const b = boss;
  const dist = Math.hypot(b.x - (b.lastX ?? b.x), b.y - (b.lastY ?? b.y));
  b.lastX = b.x; b.lastY = b.y;
  if (dist > step * 0.35) { b.stuckT = 0; b.slideSide = 0; return; }

  b.stuckT = (b.stuckT || 0) + dt;

  // 1 — wall slide: run along the obstruction, picking the side that opens up
  if (!b.slideSide) {
    const openness = (sx) => {
      let n = 0;
      for (let k = 1; k <= 4; k++) {
        if (bossCanStand(b.x + (-uy * sx) * k * 0.8, b.y + (ux * sx) * k * 0.8, 0.7)) n++;
      }
      return n;
    };
    b.slideSide = openness(1) >= openness(-1) ? 1 : -1;
  }
  if (bossMove(-uy * b.slideSide * step, ux * b.slideSide * step)) {
    if (b.stuckT < 1.2) return;       // sliding is working, let it work
  }

  // 2 — smash: break the tiles it is pressed against, mountains included
  if (b.stuckT > 1.2) {
    let broke = false;
    for (let k = 1; k <= 2 && !broke; k++) {
      const tx = Math.floor(b.x + ux * (0.9 + k * 0.7));
      const ty = Math.floor(b.y + uy * (0.9 + k * 0.7));
      if (tx < 2 || ty < 2 || tx > MAP_W - 3 || ty > MAP_H - 3) continue;
      if (!solid[ty][tx]) continue;
      solid[ty][tx] = false; heavy[ty][tx] = false;
      const p = crushProps[tx + ',' + ty];
      if (p) {
        for (const k2 of Object.keys(crushProps)) if (crushProps[k2] === p) delete crushProps[k2];
        removeProp(p);
      }
      decals.push({ gx: tx + 0.5, gy: ty + 0.5, type: 'stain' });
      spawnSparks(tx + 0.5, ty + 0.5, 10, ['#8a8a92', '#7d4a2a', '#5c3620'], 4);
      spawnSmoke(tx + 0.5, ty + 0.5, 4);
      addShake(3);
      SFX.clang();
      broke = true;
      b.stuckT = 0.6;
    }
    if (broke) return;
  }

  // 3 — last resort: it was never going to be held by this. It hauls itself
  // out and reappears in the open, close by, trailing smoke.
  if (b.stuckT > 4) {
    for (let r = 2; r <= 7; r++) {
      for (let a = 0; a < 12; a++) {
        const th = (a / 12) * Math.PI * 2;
        const nx = player.x - Math.cos(th) * r, ny = player.y - Math.sin(th) * r;
        if (nx < 2 || ny < 2 || nx > MAP_W - 3 || ny > MAP_H - 3) continue;
        if (!bossCanStand(nx, ny, 0.8)) continue;
        spawnSmoke(b.x, b.y, 8);
        b.x = nx; b.y = ny;
        spawnSmoke(nx, ny, 10);
        spawnSparks(nx, ny, 12, ['#8a8a92', '#7d4a2a'], 3);
        addShake(5);
        SFX.rage();
        b.stuckT = 0; b.slideSide = 0;
        return;
      }
    }
  }
}

function crushUnder() {
  const x0 = Math.floor(boss.x - 1), x1 = Math.ceil(boss.x + 1);
  const y0 = Math.floor(boss.y - 1), y1 = Math.ceil(boss.y + 1);
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      const key = gx + ',' + gy;
      const p = crushProps[key];
      if (!p) continue;
      if (Math.hypot(gx + 0.5 - boss.x, gy + 0.5 - boss.y) > 1.15) continue;
      if (p.type === 'boom') {
        const bb = boomBarrels.find(b => b.prop === p);
        delete crushProps[key];
        if (bb && bb.alive) explodeBarrel(bb);      // rolling over a barrel sets it off
        continue;
      }
      // flatten it
      for (const k of Object.keys(crushProps)) {
        if (crushProps[k] === p) delete crushProps[k];
      }
      removeProp(p);
      clearPropSolid(p);
      decals.push({ gx: p.gx + 0.5, gy: p.gy + 0.5, type: 'stain' });  // flattened smear
      spawnSparks(p.gx + 0.5, p.gy + 0.5, 8, ['#8a8a92', '#7d4a2a', '#5c3620'], 3);
      spawnSmoke(p.gx + 0.5, p.gy + 0.5, 3);
      addShake(2);
      SFX.clang();
    }
  }
}

// zone check at an impact point. kind: 'bullet' | 'pipe' | 'knife' | 'blast'
function bossHit(wx, wy, dmg, kind) {
  if (!boss.active || boss.state === 'hidden' || boss.state === 'dead') return false;
  // phase transitions play out untouchable — this is its moment, not yours
  if (boss.state === 'cine2' || boss.state === 'cine3' || boss.state === 'nova') {
    spawnSparks(wx, wy, 4, ['#9a9aa2', '#6a6a72']);
    SFX.dry();
    return true;
  }
  let applied = 0, tag = 'flesh';
  if (kind === 'blast') {
    applied = Math.round(dmg * 0.5);            // bosses shrug half of barrel blasts
  } else if (boss.state === 'stagger') {
    applied = Math.round(dmg * 1.5);            // plates thrown open
    tag = 'stagger';
  } else {
    const e = bossEyePos();
    if (Math.hypot(wx - e.x, wy - e.y) < 0.45) {
      applied = dmg * 2;                        // the eye: obvious, deadly
      tag = 'eye';
    } else {
      // front crusher-plate arc: ~100 degrees around facing
      const dx = wx - boss.x, dy = wy - boss.y;
      const d = Math.hypot(dx, dy) || 1;
      const facingDot = (dx / d) * boss.fx + (dy / d) * boss.fy;
      if (facingDot > 0.64) {
        if (kind === 'knife') { applied = Math.round(dmg * 0.5); tag = 'pierce'; }
        else { applied = 0; tag = 'armor'; }
      } else {
        applied = dmg;                          // sides and rear: normal damage
      }
    }
  }

  if (applied > 0) {
    boss.hp -= applied;
    spawnSparks(wx, wy, tag === 'eye' ? 10 : 6,
      tag === 'armor' ? ['#9a9aa2', '#6a6a72'] : ['#ffd27a', '#ffb02e', '#8a8a92']);
    if (tag === 'eye') { SFX.hitMetal(); SFX.blip(); hitPause = 0.05; think('eye', 'The eye! That hurt it.'); }
    else if (tag === 'stagger') { SFX.clang(); hitPause = 0.04; }
    else SFX.hitMetal();
    if (tag === 'pierce') think('pierce', 'The knife bites through plate. Barely.');
    // phase transitions: a short cutscene, then the phase's opening move
    if (boss.hp > 0) {
      if (boss.phase === 1 && boss.hp <= boss.maxHp * 0.66) {
        boss.phase = 2;
        boss.state = 'cine2'; boss.t = 0;
        SFX.rage();
      } else if (boss.phase === 2 && boss.hp <= boss.maxHp * 0.33) {
        boss.phase = 3;
        boss.state = 'cine3'; boss.t = 0;
        // mark nearby junk for absorption (never the explosive barrels —
        // those stay on the field as the player's tools)
        boss.absorbs = [];
        const keys = Object.keys(crushProps);
        for (const k of keys) {
          if (boss.absorbs.length >= 5) break;
          const p = crushProps[k];
          if (p.type === 'boom') continue;
          const d = Math.hypot(p.gx + 0.5 - boss.x, p.gy + 0.5 - boss.y);
          if (d < 5) {
            boss.absorbs.push({ x: p.gx + 0.5, y: p.gy + 0.5, t0: 0.4 + boss.absorbs.length * 0.22, done: false });
            // remove the prop from the world immediately; the flying debris is the visual
            for (const k2 of Object.keys(crushProps)) if (crushProps[k2] === p) delete crushProps[k2];
            removeProp(p);
            clearPropSolid(p);
          }
        }
        // a storm of cosmetic debris on top of the real absorbed props —
        // many chunks, several of them big
        boss.debris = [];
        const cols = ['#8a8a92', '#6a6a72', '#7d4a2a', '#5c3620', '#43434b', '#c9c9d2'];
        for (let i = 0; i < 28; i++) {
          boss.debris.push({
            ang: Math.random() * Math.PI * 2,
            dist: 2.5 + Math.random() * 3,
            t0: 0.15 + Math.random() * 1.3,
            dur: 0.45 + Math.random() * 0.35,
            size: i < 8 ? 6 + Math.random() * 4 : 2 + Math.random() * 4,   // 8 big chunks
            col: cols[(Math.random() * cols.length) | 0],
          });
        }
        SFX.absorb();
      }
    }
    if (boss.hp <= 0) {
      boss.hp = 0;
      boss.state = 'dead';
      boss.t = 0;
      addShake(8);
      SFX.boom();
      spawnSparks(boss.x, boss.y, 30, ['#ffd27a', '#ff7a2e', '#8a8a92', '#7d4a2a'], 5);
      spawnSmoke(boss.x, boss.y, 15);
      player.inv.tech += 2;
      player.inv.scrap += 8;
      if (window.ARENA_MODE) {
        showMsg('BOSS DOWN — press R to refight', 4);
      } else {
        bossDefeated = true;
        // THE RIFLE. It comes out of the wreck, not out of the machine: the
        // Compactor spent a year swallowing whatever was left in this yard,
        // and one of the things it swallowed was carrying this. Bent double
        // and no use to anybody — until Candlelight, where somebody takes
        // machines apart for a living.
        if (!player.owned.rifle) {
          player.inv.rifleBroken = (player.inv.rifleBroken || 0) + 1;
          if (typeof granted !== 'undefined') granted['compactor-rifle'] = 1;
        }
        openGate();
        SFX.chime();
        showMsg('THE COMPACTOR IS DOWN — the gate stands open', 4.5);
        // the banner is one slot, so the rifle gets the other channel
        think('rifle', 'A rifle in the wreck. Bent in half — but somebody might straighten it.');
        saveGame();
      }
    }
  } else {
    // clank: the game saying "not here"
    spawnSparks(wx, wy, 3, ['#9a9aa2', '#6a6a72']);
    SFX.dry();
    think('armor', "Armored. My shots won't bite there.");
  }
  return true;
}

function updateBoss(dt) {
  if (!boss.active || boss.state === 'hidden') return;
  const b = boss;
  b.anim += dt;

  // boss projectiles fly regardless of boss state
  for (let i = b.shots.length - 1; i >= 0; i--) {
    const s = b.shots[i];
    s.life -= dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    let gone = s.life <= 0 || isSolid(s.x, s.y);
    if (!gone && player.dead <= 0 && player.iframes <= 0 &&
        Math.hypot(s.x - player.x, s.y - player.y) < 0.4) {
      gone = true;
      player.hp -= 12;
      player.combatT = 0;
      player.iframes = 0.4; player.flash = 0.25;
      addShake(3);
      SFX.hurt();
      if (player.hp <= 0) { player.hp = 0; player.dead = 2; SFX.die(); }
    }
    if (gone) b.shots.splice(i, 1);
  }

  if (b.state === 'dead') { b.t += dt; return; }

  const dx = player.x - b.x, dy = player.y - b.y;
  const distP = Math.hypot(dx, dy) || 1;
  player.combatT = 0;                       // boss fight = no regen

  // push the player out if overlapping the hull
  if (distP < b.r + 0.25 && player.dead <= 0) {
    tryMove(player, (dx / distP) * 0.06, (dy / distP) * 0.06);
  }

  switch (b.state) {
    case 'cine2': {
      // RAGE: camera zooms in while it thrashes — then straight into a charge
      b.t += dt;
      if (b.t > 0.4 && b.t < 1.5) {
        addShake(1.5);
        if (((b.t * 20) | 0) % 5 === 0) spawnSparks(b.x, b.y, 2, ['#ff5040', '#ffb02e']);
      }
      if (b.t >= 1.9) {
        b.state = 'charge'; b.t = 0.3; b.didHit = false;
        b.chargeDX = dx / distP; b.chargeDY = dy / distP; b.chargeDist = 0;
        SFX.charge();
      }
      break;
    }
    case 'cine3': {
      // ABSORB: nearby junk flies into it, each piece healing it a little —
      // then all of it is released as the nova
      b.t += dt;
      for (const a of (b.absorbs || [])) {
        if (!a.done && b.t >= a.t0 + 0.45) {
          a.done = true;
          spawnSparks(b.x, b.y, 6, ['#7ad27a', '#8a8a92']);
          SFX.absorbTick();
        }
      }
      // the feeding restores it COMPLETELY — the health bar climbs back
      // to full over the course of the cutscene
      if (b.t > 0.4) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * dt / 1.6);
      if (b.t >= 2.2) {
        b.hp = b.maxHp;
        b.state = 'nova'; b.t = 0.4;
        SFX.charge();
      }
      break;
    }
    case 'nova': {
      // phase 3 opener: a shockwave of trash energy in every direction
      b.t -= dt;
      if (b.t <= 0) {
        SFX.boom();
        addShake(7);
        explosions.push({ x: b.x, y: b.y, t: 0.35 });
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          b.shots.push({
            x: b.x + Math.cos(a) * 0.8, y: b.y + Math.sin(a) * 0.8,
            vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, life: 1.5,
          });
        }
        b.state = 'pursue';
        b.atkCd = 1.4; b.sprayCd = 4;
        b.novaCd = 6 + Math.random() * 2;     // and it will do it again
      }
      break;
    }
    case 'reveal': {
      b.t += dt;
      if (((b.t * 10) | 0) % 3 === 0) addShake(2);
      if (b.t > 1.6) { b.state = 'pursue'; b.t = 0; SFX.alert(); }
      break;
    }
    case 'pursue': {
      // face and stalk the player — straight through whatever's in the way
      b.fx += ((dx / distP) - b.fx) * Math.min(1, 3 * dt);
      b.fy += ((dy / distP) - b.fy) * Math.min(1, 3 * dt);
      const fl = Math.hypot(b.fx, b.fy) || 1;
      b.fx /= fl; b.fy /= fl;
      const stp = (b.phase === 3 ? 1.5 : 1.15) * dt;
      bossMove((dx / distP) * stp, (dy / distP) * stp);
      bossUnstick(dt, dx / distP, dy / distP, stp);
      b.walkPhase = (b.walkPhase || 0) + stp * 3.4;
      b.atkCd -= dt; b.sprayCd -= dt; b.novaCd -= dt;
      if (player.dead > 0) break;
      if (distP < 1.9 && b.atkCd <= 0) {
        b.state = 'slam'; b.t = 0.7; b.didHit = false; SFX.charge();
      } else if (b.atkCd <= 0 && distP < 8) {
        b.state = 'charge'; b.t = b.phase === 3 ? 0.6 : 0.8; b.didHit = false;
        b.chargeDX = dx / distP; b.chargeDY = dy / distP; b.chargeDist = 0;
        SFX.charge();
      } else if (b.phase === 3 && b.novaCd <= 0) {
        b.state = 'nova'; b.t = 0.5;      // phase 3 keeps unleashing the nova
        SFX.charge();
      } else if (b.phase >= 2 && b.sprayCd <= 0 && distP < 7) {
        b.state = 'spray'; b.t = 0.5; SFX.charge();
      }
      break;
    }
    case 'slam': {
      b.t -= dt;
      if (b.t <= 0.15 && !b.didHit) {
        b.didHit = true;
        addShake(6);
        SFX.clang();
        SFX.swing();
        // claw impact: sparks rake across the strike zone in front
        for (let i = -2; i <= 2; i++) {
          spawnSparks(b.x + b.fx * 1.2 + b.fy * i * 0.3,
                      b.y + b.fy * 1.2 - b.fx * i * 0.3, 4,
                      ['#ffd27a', '#c9c9d2', '#8a8a92']);
        }
        spawnSmoke(b.x + b.fx, b.y + b.fy, 4);
        const d2 = Math.hypot(player.x - b.x, player.y - b.y);
        const pdot = ((player.x - b.x) / (d2 || 1)) * b.fx + ((player.y - b.y) / (d2 || 1)) * b.fy;
        if (d2 < 2.1 && pdot > 0.2 && player.iframes <= 0 && player.dead <= 0) {
          player.hp -= 20;
          player.iframes = 0.6; player.flash = 0.3;
          tryMove(player, ((player.x - b.x) / d2) * 0.9, ((player.y - b.y) / d2) * 0.9);
          SFX.hurt();
          if (player.hp <= 0) { player.hp = 0; player.dead = 2; SFX.die(); }
        }
      }
      if (b.t <= 0) { b.state = 'pursue'; b.atkCd = 2.2 + Math.random(); }
      break;
    }
    case 'charge': {
      if (b.t > 0) {                        // wind-up: vent steam
        b.t -= dt;
        if (((b.t * 20) | 0) % 4 === 0) spawnSmoke(b.x - b.chargeDX, b.y - b.chargeDY, 1);
        if (b.t <= 0) addShake(3);
        break;
      }
      const step = 8.5 * dt;
      const nx = b.x + b.chargeDX * step, ny = b.y + b.chargeDY * step;
      b.chargeDist += step;
      b.walkPhase = (b.walkPhase || 0) + step * 3.4;
      // run over the player
      if (!b.didHit && player.dead <= 0 && player.iframes <= 0 &&
          Math.hypot(player.x - b.x, player.y - b.y) < 1.2) {
        b.didHit = true;
        player.hp -= 25;
        player.iframes = 0.6; player.flash = 0.3;
        tryMove(player, b.chargeDX * 1.2, b.chargeDY * 1.2);
        addShake(5);
        SFX.hurt();
        if (player.hp <= 0) { player.hp = 0; player.dead = 2; SFX.die(); }
      }
      if (!bossCanStand(nx, ny, b.r * 0.7) || b.chargeDist > 7) {
        // CRASH — the whole point of the fight
        b.state = 'stagger'; b.t = 3;
        addShake(7);
        SFX.boom();
        spawnSparks(b.x + b.chargeDX, b.y + b.chargeDY, 14, ['#ffd27a', '#8a8a92'], 4);
        spawnSmoke(b.x, b.y, 8);
        think('stagger', "It's wide open — NOW!");
      } else {
        b.x = nx; b.y = ny;
        crushUnder();            // a charging Compactor flattens everything on the line
      }
      break;
    }
    case 'stagger': {
      b.t -= dt;
      if (b.t <= 0) { b.state = 'pursue'; b.atkCd = 1.6; }
      break;
    }
    case 'spray': {
      b.t -= dt;
      if (b.t <= 0) {
        SFX.shot();
        const base = Math.atan2(player.y - b.y, player.x - b.x);
        for (let i = -3; i <= 3; i++) {
          const a = base + i * 0.16;
          boss.shots.push({
            x: b.x + Math.cos(a), y: b.y + Math.sin(a),
            vx: Math.cos(a) * 6.5, vy: Math.sin(a) * 6.5, life: 1.4,
          });
        }
        b.state = 'pursue';
        b.sprayCd = 6 + Math.random() * 3;
        b.atkCd = Math.max(b.atkCd, 1.2);
      }
      break;
    }
  }
}

// arena helpers
function resetArena() {
  player.x = 16.5; player.y = 21.5;
  player.hp = player.maxHp;
  giveRounds('pistol', 60); giveRounds('rifle', 60);
  chamber('pistol'); chamber('rifle');
  player.dead = 0; player.iframes = 1;
  Thoughts.done = {}; Thoughts.t = 0;
  spawnBoss(16.5, 14.5);
  showMsg('ARENA RESET — fight!', 2);
}
