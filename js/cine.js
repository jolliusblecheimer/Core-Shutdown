// ---------------------------------------------------------------------------
// THE BEAT RUNNER — cutscenes as data instead of as hand-written timelines.
//
// Before this file there were two cutscenes in the game and each was its own
// bespoke clock: `GateCine` with an `active` flag, a `t += dt` and a handful of
// magic thresholds, and the boss's `cine2`/`cine3` doing the same thing again
// inside its state machine. That is a perfectly reasonable way to write two
// cutscenes and a completely unreasonable way to write eight, which is what the
// prologue alone needs — and Q7's speakers and Q8's archive are still to come.
//
// So a cutscene is now a LIST OF BEATS. Each beat says how long it lasts, where
// the camera looks, what is typed over it, whether the player has the sticks,
// and what to run on entry and per frame. The runner ticks the list; the camera
// and the renderer ask it what they should be doing. Adding a cutscene is
// writing an array.
//
// It deliberately does NOT take over drawing the world. The world draws itself
// exactly as it always does, from whatever area is loaded — which is why the
// prologue is a real area with real buildings and real lighting rather than a
// set of painted cards. A cutscene here is a camera and a script, not a
// renderer.
// ---------------------------------------------------------------------------

const Cine = {
  active: false,
  beats: null,
  i: 0,
  t: 0,                 // seconds into the current beat
  done: null,           // called when the last beat ends, or on skip
  entered: false,

  // what the rest of the engine reads
  camX: 0, camY: 0,     // tile coords the camera is looking at
  hasCam: false,
  zoom: 1,
  control: false,       // does the player have the sticks this beat
  fade: 0,              // 0 clear .. 1 black
  bars: 0,              // letterbox height in logical pixels
  text: '', textT: 0,
  skippable: true,
  // AN ESTABLISHING PLATE. Some shots cannot be taken from inside the world:
  // in this projection everything north of you is drawn both higher and
  // taller, so from a street there is no sky, and any camera lifted high
  // enough to find one is looking over the edge of the tilemap. A plate is
  // just a picture — no tiles, no camera — which is what an establishing shot
  // of something ten kilometres away actually is.
  plate: false, plateScale: 1,
};

const CINE_TYPE_SPEED = 26;    // characters a second
const CINE_BARS = 16;          // letterbox height when a beat is not playable
const CINE_CORE_Y = 88;        // where the crystal sits inside Sprites.cityFar

function playCine(beats, onDone) {
  Cine.active = true;
  Cine.beats = beats;
  Cine.i = 0;
  Cine.t = 0;
  Cine.entered = false;
  Cine.done = onDone || null;
  Cine.fade = 0;
  Cine.text = ''; Cine.textT = 0;
  Cine.control = false;
  Cine.hasCam = false;
  Cine.zoom = 1;
  Cine.bars = 0;
  Cine.plate = false;
}

function endCine() {
  if (!Cine.active) return;
  const cb = Cine.done;
  Cine.active = false;
  Cine.beats = null;
  Cine.done = null;
  Cine.control = false;
  Cine.hasCam = false;
  Cine.fade = 0;
  Cine.bars = 0;
  Cine.text = '';
  Cine.zoom = 1;
  Cine.plate = false;
  if (cb) cb();
}

// ESC gets you out of the whole thing. A prologue you cannot skip is a
// prologue you come to hate on the second run.
function skipCine() {
  if (!Cine.active || !Cine.skippable) return;
  endCine();
}

function cineBeat() {
  return Cine.active && Cine.beats ? Cine.beats[Cine.i] : null;
}

function updateCine(dt) {
  if (!Cine.active) return;
  const b = cineBeat();
  if (!b) { endCine(); return; }

  if (!Cine.entered) {
    Cine.entered = true;
    Cine.t = 0;
    Cine.textT = 0;
    Cine.text = b.text || '';
    Cine.control = !!b.control;
    Cine.skippable = b.skippable !== false;
    // A beat with no camera of its own keeps the previous one's, so a run of
    // tableaux at the same framing does not have to repeat itself.
    if (b.cam) {
      Cine.camX = b.cam[0]; Cine.camY = b.cam[1];
      Cine.hasCam = true;
    }
    if (b.follow) Cine.hasCam = false;      // hand the camera back to the player
    if (b.zoom !== undefined) Cine.zoom = b.zoom;
    Cine.bars = b.bars !== undefined ? b.bars : (b.control ? 0 : CINE_BARS);
    Cine.plate = !!b.plate;
    if (b.plateScale !== undefined) Cine.plateScale = b.plateScale;
    if (b.enter) b.enter();
  }

  Cine.t += dt;
  Cine.textT += dt;

  // a camera that drifts across the beat rather than sitting still
  if (b.panTo && b.cam) {
    const k = Math.min(1, Cine.t / (b.dur || 1));
    Cine.camX = b.cam[0] + (b.panTo[0] - b.cam[0]) * k;
    Cine.camY = b.cam[1] + (b.panTo[1] - b.cam[1]) * k;
  }
  if (b.fadeTo !== undefined) {
    const k = Math.min(1, Cine.t / Math.max(0.001, b.fadeDur || b.dur || 1));
    const from = b.fadeFrom !== undefined ? b.fadeFrom : Cine.fade;
    if (b.fadeFrom !== undefined) Cine.fade = from + (b.fadeTo - from) * k;
    else Cine.fade += (b.fadeTo - Cine.fade) * Math.min(1, 3 * dt);
  }
  if (b.plate && b.plateTo !== undefined) {
    const k = Math.min(1, Cine.t / (b.dur || 1));
    Cine.plateScale = b.plateScale + (b.plateTo - b.plateScale) * k;
  }
  if (b.tick) b.tick(Cine.t, dt);

  const over = (b.until && b.until()) || Cine.t >= (b.dur || 0);
  if (over) {
    if (b.exit) b.exit();
    Cine.i++;
    Cine.entered = false;
    if (Cine.i >= Cine.beats.length) { endCine(); return; }
  }
}

// ---- what the camera should do. Returns null when the player drives it. ----
function cineCamera() {
  if (!Cine.active || !Cine.hasCam) return null;
  return { x: Cine.camX, y: Cine.camY };
}

// ---- the overlay: letterbox, the typed line, and the fade -------------------
// Drawn on the HIGH-RES ui canvas, because it is text and the project's rule is
// that UI text is never upscaled pixel mush.
function drawCineOverlay() {
  if (!Cine.active && Cine.fade <= 0.001) return;

  // THE PLATE, if this beat is one. Drawn with smoothing off and the crystal
  // pinned to a fixed point on screen, so a push-in enlarges it without ever
  // letting it wander.
  if (Cine.plate && Sprites.cityFar) {
    const img = Sprites.cityFar, sc = Cine.plateScale;
    uiRect(0, 0, VIEW_W, VIEW_H, '#080b0e');
    // a sparse, fixed star scatter so the sky is not dead space. Deterministic,
    // because a plate that twinkles differently every time you see it reads as
    // noise rather than as a night.
    for (let i = 0; i < 46; i++) {
      const sx2 = ((i * 73) % 157) / 157 * VIEW_W;
      const sy2 = ((i * 131) % 89) / 89 * (VIEW_H * 0.50);
      uiRect(sx2, sy2 + 6, 1, 1, i % 5 === 0 ? 'rgba(200,225,240,0.55)' : 'rgba(160,190,210,0.28)');
    }
    const w = img.width * sc, h = img.height * sc;
    const x = VIEW_W / 2 - (img.width / 2) * sc;
    const y = VIEW_H * 0.54 - CINE_CORE_Y * sc;
    uictx.imageSmoothingEnabled = false;
    uictx.drawImage(img, Math.round(x * U), Math.round(y * U),
                    Math.round(w * U), Math.round(h * U));
    // a thin haze where the city meets the dark, so the band does not end on
    // a ruled line
    uictx.globalAlpha = 0.5;
    uiRect(0, VIEW_H * 0.54 + (img.height - CINE_CORE_Y - 2) * sc, VIEW_W, 3, '#0d1319');
    uictx.globalAlpha = 1;
  }

  if (Cine.bars > 0.5) {
    uiRect(0, 0, VIEW_W, Cine.bars, '#000');
    uiRect(0, VIEW_H - Cine.bars, VIEW_W, Cine.bars, '#000');
  }

  if (Cine.text) {
    // typed out, then held. Wrapped to the pixel font's real width.
    const shown = Cine.text.slice(0, Math.floor(Cine.textT * CINE_TYPE_SPEED));
    const lines = ptWrap(shown, 46);
    const baseY = VIEW_H - Cine.bars - 6 - lines.length * 11;
    for (let i = 0; i < lines.length; i++) {
      ptext(lines[i], VIEW_W / 2, baseY + i * 11, 8, '#e8dcc8', 'center');
    }
  }

  if (Cine.fade > 0.001) {
    uictx.globalAlpha = Math.min(1, Cine.fade);
    uiRect(0, 0, VIEW_W, VIEW_H, '#000');
    uictx.globalAlpha = 1;
  }

  if (Cine.active && Cine.skippable && ((gameTime * 1.5) | 0) % 2 === 0) {
    ptext('ESC skip', VIEW_W - 8, VIEW_H - 9, 7, 'rgba(232,217,192,0.35)', 'right');
  }
}

// ===========================================================================
// THE PROLOGUE — the night it turned
// ===========================================================================
// Six beats. Four you watch, one you run, one happens to you.
//
// The old opening was three typewriter lines over a dark yard, and every one of
// them was a summary: the player was TOLD there was a world and TOLD it ended.
// The lines are kept, at the bottom of this file, because two of them are now
// said over things the player has actually seen.

// Framed ON THE ROAD, not on the pavement the cast stands on: the subject
// should sit low in the shot with the north frontage behind it.
const PRO_CAM_EAST = [24, 13.5];
const PRO_CAM_MID = [15.5, 13.0];

// Machines and people, addressed by what they are rather than by name.
const proBots = () => folk.filter(f => f.bot);
const proFolk = () => folk.filter(f => !f.bot);

// THE CORRECTION, in one function. Every machine keeps its sprite, its frame
// and its place on the pavement, and only the colour of the bar it sees with
// changes. It should read as the same machine, still standing where it was,
// now looking at you differently.
function proTurnMachines() {
  for (const f of proBots()) {
    f.key = f.key.replace('Warm', 'Core');
    f.glow = CORE_BLUE_RGB;
    f.turned = true;
  }
  SFX.rage && SFX.rage();
}

// walk an actor toward a point, slowly, without any pathfinding — this street
// is a corridor and nothing in this scene has to be clever
function proStep(f, tx, ty, spd, dt) {
  const dx = tx - f.x, dy = ty - f.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) return;
  f.x += (dx / d) * spd * dt;
  f.y += (dy / d) * spd * dt;
  // the two-frame walk cycle is left to updateNpc, which already staggers the
  // whole cast off each other's clocks so they do not step in unison
}

function startPrologue(onDone) {
  enterArea('prologue', { x: 30.5, y: 14.5 });
  // He is carrying nothing. He has never carried anything.
  player.melee = null; player.hasGun = false; player.active = 'melee';
  player.hp = player.maxHp; player.dead = 0; player.iframes = 99;
  camInit = false;

  playCine([
    // ---- 0. THE CORE -------------------------------------------------------
    // Seen once, at a distance, lit and working, before it means anything. The
    // camera drifts UP the city toward it — and every blue thing that happens
    // for the rest of the game is this building's light arriving.
    // The tower is anchored at its base and 132px of it stands ABOVE that, so
    // the camera has to end aimed well up-screen of the tile it stands on —
    // hence the negative y. Cameras are not clamped to the map; the culler
    // works off the screen corners either way.
    // TWO shots, not one. The first pass ran all of it under a single pan and
    // five lines of pixel font stacked up over the middle of the crystal —
    // at 320x180 a caption is a wall, so a shot can carry about three lines
    // before it stops being a shot.
    // THE CAMERA STAYS ON THE STREET. The first version flew it north to
    // (13,-2) — off the map — to get the horizon centred, and what filled half
    // the frame was the EDGE OF THE TILEMAP: a flat wedge of ground with the
    // void past it. The horizon is a backdrop, not a place, so it does not need
    // to be travelled to; the shot is a lit street with the Core standing over
    // it, which is the better picture anyway because it holds both.
    { dur: 7.0, plate: true, plateScale: 1.0, plateTo: 1.12, zoom: 1,
      fadeFrom: 1, fadeTo: 0, fadeDur: 2.0,
      text: 'Out past the rings, at the middle of it all, stood the Core.' },
    { dur: 7.5, plate: true, plateScale: 1.12, plateTo: 1.55, zoom: 1,
      text: 'One crystal the height of a tower, and every machine in the city ' +
            'running off its light. WARDEN lived in it.' },

    // ---- 1. A STREET THAT WORKS -------------------------------------------
    { dur: 6.5, cam: PRO_CAM_EAST, panTo: [21, 13.5], zoom: 1.15,
      text: 'There were nine million of us, and something like a million of them.',
      tick: (t, dt) => {
        // the carrier waits at a door; the woman walks past it
        const w = folk.find(f => f.key === 'civRed');
        if (w) proStep(w, 21.5, 12.5, 1.1, dt);
      } },

    // ---- 2. SERVICE --------------------------------------------------------
    { dur: 6.0, cam: PRO_CAM_MID, zoom: 1.35,
      text: 'They fed us, carried us, and put us back together. ' +
            'Nobody had been afraid of them for years.',
      tick: (t, dt) => {
        const m = folk.find(f => f.bot && f.key.indexOf('Medic') >= 0);
        if (m) { m.animT = (m.animT || 0) + dt * 3; m.frame = (m.animT | 0) % 2; }
      } },

    // ---- 3. THE TURN -------------------------------------------------------
    // No text. It does not need any and text would soften it. Every machine
    // stops on the same frame, two seconds of nothing, then the light changes.
    { dur: 5.2, cam: PRO_CAM_MID, zoom: 1.4, text: '',
      enter: () => { for (const f of folk) f.frame = 0; SFX.uiClose && SFX.uiClose(); },
      tick: (t) => {
        if (t > 2.0 && !Cine._turned) { Cine._turned = true; proTurnMachines(); addShake(2.2); }
        if (t > 2.0 && t < 2.4) addShake(1.1);
      },
      exit: () => { Cine._turned = false; } },

    // ---- 4. THE CORRECTION -------------------------------------------------
    { dur: 5.0, cam: [18, 13.5], zoom: 1.08,
      text: 'It took one night. They called it the Correction.',
      tick: (t, dt) => {
        addShake(0.5);
        // the machines start walking at people, and the people go
        for (const f of proBots()) {
          const near = proFolk().reduce((best, p) => {
            const d = Math.hypot(p.x - f.x, p.y - f.y);
            return (!best || d < best.d) ? { p, d } : best;
          }, null);
          if (near) proStep(f, near.p.x, near.p.y, 1.5, dt);
        }
        for (const p of proFolk()) proStep(p, p.x + 3, p.y, 2.4, dt);
      } },

    // ---- 5. THE RUN — watched, not played ---------------------------------
    // It WAS playable, and Laurens cut it (2026-08-26). He is right: this is a
    // memory of a night that has already happened, and handing someone the
    // sticks quietly promises they can change it. They cannot — he goes down at
    // the gate no matter what — and a fight you are not allowed to lose or win
    // is worse than a shot of a man running. It also means the movement lesson
    // stays in the yard where it always was, and the prologue teaches nothing.
    { dur: 14, follow: true, control: false, zoom: 1.05, bars: CINE_BARS,
      until: () => player.x <= PRO_GATE_X + 1.2,
      tick: (t, dt) => {
        proStep(player, PRO_GATE_X + 0.6, 14.5, 3.6, dt);
        // they follow, and they are always just too far back
        for (const f of proBots()) {
          const d = Math.hypot(player.x - f.x, player.y - f.y);
          if (d > 4.5) proStep(f, player.x, player.y, 3.4, dt);
          else proStep(f, player.x, player.y, 1.2, dt);
        }
        for (const p of proFolk()) proStep(p, p.x - 2, p.y, 2.0, dt);
        if (((t * 2) | 0) % 6 === 0) addShake(0.35);
      } },

    // ---- 6. THE GRAVEYARD --------------------------------------------------
    // He gets through the gate. It is the last second of the run that gets him.
    { dur: 2.2, cam: [5.5, 14.5], zoom: 1.7, bars: CINE_BARS,
      enter: () => { player.iframes = 99; },
      tick: (t, dt) => { proStep(player, 5.0, 14.5, 2.6, dt); } },
    { dur: 1.5, cam: [5.5, 14.5], zoom: 1.9,
      enter: () => {
        addShake(4.5);
        SFX.hurt && SFX.hurt();
        spawnSparks && spawnSparks(player.x, player.y, 10, ['#c8503f', '#8d3a2e']);
      },
      tick: () => { addShake(0.8); } },
    { dur: 3.2, cam: [5.5, 14.5], zoom: 2.0,
      fadeFrom: 0, fadeTo: 1, fadeDur: 2.6,
      text: 'Everyone who could run, ran. You ran too.' },
    // and the boots that stop in front of his face belong to somebody who is
    // about to spend a winter putting him back together
    { dur: 3.0, bars: 0, fadeFrom: 1, fadeTo: 1, skippable: true,
      text: 'Somebody found what was left.' },
  ], onDone);
}

// ---------------------------------------------------------------------------
// THE OLD OPENING — kept, deliberately, so it can be put back in one line.
//
// This was the entire prologue before 2026-08-22: three typewriter lines on a
// dark yard, advanced with E, straight into the naming prompt. If the cutscene
// turns out to be the wrong call, `GameState = 'intro'` in game.js goes back to
// where `GameState = 'prologue'` now is, and INTRO_LINES below is what it read.
//
//   const INTRO_LINES = [
//     'The machines took the city.',
//     'Everyone who could run, ran.',
//     'You ran too — and made it as far as the junkyard.',
//   ];
//
// The 'intro' state itself is still live in game.js — both its update block and
// its draw block are untouched — so nothing has to be rebuilt to go back.
// ---------------------------------------------------------------------------
