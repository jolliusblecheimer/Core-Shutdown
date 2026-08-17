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
  atkCd: 3, sprayCd: 6,
  shots: [],                  // boss projectiles {x,y,vx,vy,life}
  phase: 1,                   // 1 → 2 (at 66%) → 3 (at 33%), shield between
  pendingPhase: 0,
  name: 'THE COMPACTOR',
};

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
  const dx = player.x - x, dy = player.y - y;
  const d = Math.hypot(dx, dy) || 1;
  boss.fx = dx / d; boss.fy = dy / d;
}

function bossEyePos() { return { x: boss.x + boss.fx * 0.8, y: boss.y + boss.fy * 0.8 }; }

// the Compactor does not path around junk — it goes THROUGH it.
// Only walls and trash mountains (isHeavy) stop it. Everything else it
// flattens; explosive barrels it rolls over detonate (and hurt it).
function bossMove(dx, dy) {
  if (dx !== 0 && bossCanStand(boss.x + dx, boss.y, 0.7)) boss.x += dx;
  if (dy !== 0 && bossCanStand(boss.x, boss.y + dy, 0.7)) boss.y += dy;
  crushUnder();
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
      const pi = props.indexOf(p);
      if (pi >= 0) props.splice(pi, 1);
      const tx = Math.floor(p.gx), ty = Math.floor(p.gy);
      solid[ty][tx] = false;
      if (p.type === 'car') solid[ty][tx + 1] = false;
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
  // phase-transition shield: nothing gets through
  if (boss.state === 'shield' || boss.state === 'nova') {
    spawnSparks(wx, wy, 4, ['#78d2ff', '#b8e8ff']);
    SFX.dry();
    think('shield', 'A shield?! Wait for it to drop.');
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
    // phase transitions: shield up, then a signature opening move
    if (boss.hp > 0) {
      if (boss.phase === 1 && boss.hp <= boss.maxHp * 0.66) {
        boss.phase = 2; boss.pendingPhase = 2;
        boss.state = 'shield'; boss.t = 1.6;
        SFX.alert();
      } else if (boss.phase === 2 && boss.hp <= boss.maxHp * 0.33) {
        boss.phase = 3; boss.pendingPhase = 3;
        boss.state = 'shield'; boss.t = 1.6;
        SFX.alert();
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
      showMsg('THE COMPACTOR IS DOWN — Hydraulic Piston acquired', 4);
      player.inv.tech += 2;
      player.inv.scrap += 8;
      if (window.ARENA_MODE) showMsg('BOSS DOWN — press R to refight', 4);
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
    case 'shield': {
      b.t -= dt;
      if (((b.t * 12) | 0) % 4 === 0) spawnSparks(b.x, b.y, 1, ['#78d2ff']);
      if (b.t <= 0) {
        if (b.pendingPhase === 2) {
          // phase 2 opens with an instant charge, no hesitation
          b.state = 'charge'; b.t = 0.35; b.didHit = false;
          b.chargeDX = dx / distP; b.chargeDY = dy / distP; b.chargeDist = 0;
          SFX.charge();
        } else {
          b.state = 'nova'; b.t = 0.5;
          SFX.charge();
        }
        b.pendingPhase = 0;
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
      b.walkPhase = (b.walkPhase || 0) + stp * 3.4;
      b.atkCd -= dt; b.sprayCd -= dt;
      if (player.dead > 0) break;
      if (distP < 1.9 && b.atkCd <= 0) {
        b.state = 'slam'; b.t = 0.7; b.didHit = false; SFX.charge();
      } else if (b.atkCd <= 0 && distP < 8) {
        b.state = 'charge'; b.t = b.phase === 3 ? 0.6 : 0.8; b.didHit = false;
        b.chargeDX = dx / distP; b.chargeDY = dy / distP; b.chargeDist = 0;
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
  player.ammo = 60;
  player.dead = 0; player.iframes = 1;
  Thoughts.done = {}; Thoughts.t = 0;
  spawnBoss(16.5, 14.5);
  showMsg('ARENA RESET — fight!', 2);
}
