# THE NORTH EXPANSION — the build spec

**Status: E0–E3 BUILT AND SHIPPED. E4–E8 are still spec.**
Written 2026-09-02 in answer to *"make the expansion plan in extreme detail now."*
Built 2026-09-02 in answer to *"start it."* See §15 at the bottom for what
actually landed and where it departed from this document.

Three documents stack here and none of them replaces another:

| | |
|---|---|
| `the-road-north.md` | **which** area is next, and the route to Ring 4 |
| `field-twelve.md` | **what it feels like** — vibe, buildings, people, quests |
| `map-shape.md` | **how the world is put together** — the districts model |
| **this** | **exactly what to type.** Coordinates, tables, flags, phases, tests |

Everything below assumes `design/finish-the-fringe.md` has shipped, because the
seams are holes in the viaduct it builds.

---

## 1. THE SHAPE — three areas, one loop

The brainstorm's best structural idea was *two roads north*. As three
right-sized areas it becomes a **loop**, which is stronger: two ways in, they
meet in the middle, and neither is the wrong answer.

```
                       ┌──────────────────────────┐
                       │  RING 4 — later.         │
                       │  Rubble dead-end for now │
                       └────────────▲─────────────┘
                                    │ north mouth
                 ┌──────────────────┴───────────────┐
                 │        THE UNDERPASS  20 × 36    │
                 │   ┌────────┐                     │
                 │   │THE LAMP│ service bay ────────┼──► west breach
                 │   └────────┘        east door    │        │
                 └──────────────────┬───────────────┘        │
                                    │ south mouth            ▼
                                    │              ┌──────────────────────┐
                                    │              │   FIELD 12  96 × 72  │
                                    │              │                      │
                                    │              └──────────┬───────────┘
                                    │                         │ vehicle gate
   ═══════════ THE VIADUCT ═════════╪═════════════════════════╪═══════════
   Fringe y 22–29                   │                         │
        hole A: x 26–34 (spine)  ───┘      hole B: x 88–96 (mid street) ──┘
   ────────────────────────────────────────────────────────────────────────
                        THE FRINGE — north cross y 33–39
```

**Up the spine** you meet Wren and Oz at the Lamp first, and enter Field 12 by
its quiet west breach — *the prepared run*. **Up the mid street** you come
through the vehicle gate with the wreck dead ahead and nothing told to you —
*the cold run*. Leave by the other end and you find what you missed. The world
never comments on which you did.

### 1.1 Area registry entries — exact

World offsets are chosen so the seams line up on the world map. Check them with
the arithmetic in the comment; if the viaduct moves, these move with it.

```js
underpass: {
  id: 'underpass', name: 'THE UNDERPASS', build: buildUnderpass,
  // south mouth local (8–12, 34) must sit at Fringe (26–34, 22):
  //   world.x = 30 - 10 = 20      world.y = 22 - 36 = -14
  world: { x: 20, y: -14 },
  indoors: true,                       // lit by what comes through the cracks
  hasScrapper: false, hasBoss: false, hasNpc: false, hasBandits: false,
  hasDroids: false, folk: 'lamp',
  tint: '#b9bfc4',                     // wet concrete, no warmth but the fire
  makeItems: () => ([]),
  exits: [
    { x0: 7.4, y0: 34.4, x1: 12.6, y1: 36, to: 'fringe',  entry: { x: 30, y: 24 } },
    { x0: 18.4, y0: 9.4, x1: 20,   y1: 11.6, to: 'field12', entry: { x: 2.5, y: 46.5 } },
    // north mouth is rubble until Ring 4 exists — no exit, just a wall you can see
  ],
},
field12: {
  id: 'field12', name: 'FIELD 12', build: buildField12,
  // vehicle gate local (44–48, 70) must sit at Fringe (88–96, 22):
  //   world.x = 92 - 46 = 46      world.y = 22 - 72 = -50
  world: { x: 46, y: -50 },
  indoors: false, skyline: false,      // NO far-city band. See map-shape.md §5
  hasScrapper: false, hasBoss: false, hasNpc: false, hasBandits: false,
  hasDroids: true,                     // the recovery detail
  hasDrones: true,                     // NEW flag — the rust drones
  folk: null,
  tint: '#e4e2dc',                     // bleached grey. Not blue.
  beacon: { x: 82, y: 9, period: 8.0 },// NEW — see §5
  makeItems: () => ([
    { type: 'ammo', gun: 'rifle', x: 27.5, y: 52.5, amount: 12, bob: 0.4 },
    { type: 'ammo', x: 63.5, y: 39.5, amount: 6,  bob: 1.7 },
    { type: 'snack', x: 12.5, y: 9.5, bob: 2.2 },
  ]),
  exits: [
    { x0: 43.4, y0: 69.4, x1: 48.6, y1: 72, to: 'fringe',    entry: { x: 92, y: 24 } },
    { x0: 0,    y0: 44.4, x1: 2.6,  y1: 48.6, to: 'underpass', entry: { x: 17.5, y: 10.5 } },
  ],
},
tower: {
  id: 'tower', name: 'THE TOWER', build: buildTower,
  world: { x: 118, y: -44 },           // the tower's own footprint in Field 12
  indoors: true, memory: false,
  hasScrapper: false, hasBoss: false, hasNpc: false, hasBandits: false,
  hasDroids: false, folk: null,
  tint: '#cfd4d8',
  makeItems: () => ([]),
  exits: [{ x0: 4.4, y0: 12.4, x1: 7.6, y1: 14, to: 'field12', entry: { x: 76.5, y: 12.5 } }],
},
```

### 1.2 The two holes in the viaduct (a change to `finish-the-fringe.md`)

That plan cut **one** hole, at the spine. This spec needs **two**. Both are cut
in the same pass, both are 9 tiles wide, and both are walkable but dark:

| Hole | Fringe tiles | Leads to | Reads as |
|---|---|---|---|
| **A — the underpass** | x 26–34, y 22–29 | `underpass` | The spine goes under the deck |
| **B — the airfield approach** | x 88–96, y 22–29 | `field12` | A slip road under the deck, chain-link either side |

Neither is a door with a prompt. **You walk into the dark and the screen fades**
— the seam trick from `the-road-north.md` §4, which is the whole reason the
viaduct is where the world ends.

---

## 2. FIELD 12 — the tile spec

**96 wide × 72 tall = 6,912 tiles.** Compare: the Fringe's dead north band was
4,400 tiles of nothing. This is 6,912 tiles of airfield, inside a fence, with
its edges paid for.

```
 x   0    6         20        34   44  50        66        80   88  95
 y0  ███████████████████ NORTH FENCE ████████████████████████████████████
 y2  ······················ perimeter road ·································
 y5      ╔═══════════════╗            ╔═══════════════╗          ┌──────┐
 y8      ║   HANGAR 1    ║            ║   HANGAR 2    ║          │TOWER │
 y11     ║   the nest    ║            ║   the store   ║          │      │
 y13     ╚═══════╤═══════╝            ╚═══════╤═══════╝          └──┬───┘
 y16  ─────────── apron ──────────────────────────────────────────────────
 y23  ══════════════════ threshold  " 12 " ══════════════════════════════
 y26  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ RUNWAY ▓▓▓▓ ✈ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 y30  ══════════════════ threshold  " 30 " ══════════════════════════════
 y34         ◣ blast pen        ◣ blast pen         ⛽⛽ bowsers
 y46 ◄ WEST BREACH
 y52        🚒 crash tender shed
 y62  ······················ south perimeter ······························
 y70                          ▤ VEHICLE GATE ▤
 y71 ███████████████████ SOUTH FENCE ████████████████████████████████████
```

### 2.1 Ground

Three new tile ids. `TILESETS` is built in `buildTilesets()` in `js/game.js`
and currently runs 0–11.

| id | name | where | look |
|---|---|---|---|
| **16** | `runway` | y 24–30, x 4–92 | Dark asphalt, rubber-streaked at both thresholds, centreline dashes as decals |
| **17** | `apron` | y 14–22 and y 32–44 | Paler concrete in slabs, oil stains, expansion joints |
| **6** | `verge` *(existing)* | everywhere else inside the fence | Grass through cracks — the overgrowth motif on concrete |

**THE ANGLE RULE applies to every marking.** Centreline dashes, threshold bars,
the numbers **12** and **30**, the taxiway guide lines — all of them lie flat and
run along world +x, so all of them are `sheared(img, +1)`. **Prototype twenty
tiles of it and look at it before building the other seventy** — flat rectangles
pasted on an iso floor is this project's most repeated visual bug.

### 2.2 The fence — and the proof it holds

`wallRun(tiles, fenceKinds(n), axis, front, trimS, trimE)` — the junkyard's own
chain-link, already proven.

| Run | Tiles | Axis |
|---|---|---|
| North | (0,0) → (95,0) | x |
| South | (0,71) → (43,71) and (48,71) → (95,71) | x |
| West | (0,0) → (0,43) and (0,49) → (0,71) | y |
| East | (95,0) → (95,71) | y |

**Two openings and no others:**
- **Vehicle gate** — x 44–48, y 70–71. Chained; the chain is cut and lying in
  the grass.
- **West breach** — x 0–2, y 44–48. Fence flattened outward, a path worn through.

> **Verification, the same as the church corridor:** flood fill from the vehicle
> gate with **both** openings sealed reaches **0** of Field 12's 6,912 tiles from
> outside, and every interior tile from inside. Run it in `buildField12`'s
> verification note.

### 2.3 The structures

| # | What | Footprint (x, y, w, h) | Notes |
|---|---|---|---|
| 1 | **Hangar 1 — the nest** | 6, 5, 15, 9 | Doors south at x 12–15, y 13. Interior *not* a sub-area: it is a dark roofed volume you walk into, like the shack. Roof vents at (9,6), (14,6), (19,6) — **drone spawn points** |
| 2 | **Hangar 2 — the store** | 50, 5, 15, 9 | Doors south at x 56–58, y 13, **half-open**: only x 57 is passable. Chest at (58,8). Bedroll, cold fire ring, Wren's pack at (60,9) |
| 3 | **Control tower** | 80, 5, 8, 9 | Ground floor enterable; the stair is flooded. **External fire stair** on the north face at (84,4) → area `tower` |
| 4 | **Blast pen A** | 12, 34, 10, 6 | Three-sided, opening north. `heavy` |
| 5 | **Blast pen B** | 34, 34, 10, 6 | Same, mirrored |
| 6 | **Fuel bowsers** | 62–74, 36 | Four tankers, `dir: 'x'`. **3-tile blast each** — `boomBarrels` with a bigger radius |
| 7 | **Crash tender shed** | 8, 50, 12, 7 | Doors east. The crash tender inside at (12,53). The dead man at (10,55) |
| 8 | **The wreck** | 44, 26 | The news drone, 5×3 tiles, one wing folded. Work lamps on stands at (42,25),(48,25),(45,29) |
| 9 | **Windsock mast** | 90, 20 | Torn windsock, still turning. Pure texture, and the only thing that moves in the wind |

### 2.4 Props, by count

| Type | n | Where |
|---|---|---|
| `wallSlice` (fence) | ~330 | the perimeter |
| `hangar` (volume) | 2 | pre-rendered volumes, never assembled panels |
| `towerBlock` (volume) | 1 | |
| `revetment` | 2 | the pens |
| `bowser` | 4 | + 4 `boomBarrels` entries |
| `tender` | 1 | the fire appliance — the only warm colour on the field |
| `wreckDrone` | 1 | + `workLamp` × 3 |
| `apronLamp` | 6 | dead floodlight masts along the apron. **Unlit** — the beacon is the only light |
| `pallet`, `drum`, `tug`, `gantry`, `crate` | ~40 | hangar and shed dressing |
| `windsock` | 1 | |
| **total** | **~390** | budget below |

---

## 3. THE UNDERPASS AND THE LAMP — the tile spec

**20 wide × 36 tall = 720 tiles.** The smallest area in the game after the crypt,
and every tile of it is either tunnel, bay or wall.

```
 x  0    4    8   12   16  19
 y0  ██████ NORTH — RUBBLE ██████   ← Ring 4 goes here. A wall you can see, no exit
 y4  ██                        ██
 y8  ██   ┌──────────────┐     ██
 y10 ██   │  THE LAMP    │  ►  ██   ← east door (19, 9–11) → Field 12 west breach
 y13 ██   └──────────────┘     ██
 y18 ██        ▒ drip ▒        ██
 y24 ██     🚗 dead car        ██
 y30 ██                        ██
 y34 ██████ SOUTH MOUTH ███████ ██   ← (8–12, 34–35) → the Fringe spine
```

| | |
|---|---|
| **Ground** | New id **18** `tunnel` — wet concrete, puddles, tyre-polished centre |
| **Light** | Three shafts through cracks in the deck at y 6, 17, 28 — the only daylight. The Lamp's drum fire is the only other source, and it is the warmest thing in three areas |
| **Sound** | Drips on a timer, and everything else muffled. The wind from Field 12 stops the moment you are inside |
| **The service bay** | x 5–14, y 8–13. Was a maintenance recess. Tarp, drum fire, two crates, a kettle, a hand-cart |
| **The dead car** | (9, 24), doors open, long stripped. The one obstacle in the tunnel, and the only cover if anything ever follows you in |

**The Lamp is not a camp and must not become one.** No beds, no bench, no med
station, no respawn anchor. One counter, one fire, two people. Its whole job is a
shape: *this is as far as anybody sane goes.*

---

## 4. THE RUST DRONE — full spec

The **Flyer** role from `GAME_PLAN.md` §4, listed since day one and never built.
It gets its own build phase because it is not a reskin.

### 4.1 States

| State | What | Exit |
|---|---|---|
| `circle` | Hovers at altitude over its patch, drifting on a slow arc. **Sees over everything** — no line-of-sight test | player within 9 tiles and not `playerSafe` → `mark` |
| `mark` | A red dot appears on the ground under it and tracks toward the player's feet; a thin line runs drone → dot. **1.2s.** This is the entire telegraph | 1.2s elapsed → `swoop` |
| `swoop` | Dives along the line it committed to **before** starting. Fast, straight, no correction | reaches the line's end → `recover` |
| `recover` | Pulls up, low and slow, **1.0s**. Rotor housing glows amber | 1.0s → `circle` |

**You dodge by not being on the line.** Spatial, not timed, and readable from any
distance — which is what an open runway needs.

### 4.2 Numbers

| | |
|---|---|
| HP | **25** — the weakest thing in the game after a Scrapper |
| Damage | **8** on a connected swoop |
| Altitude | **14 px** of draw offset; shadow drawn on the tile below |
| Speed | 1.1 tiles/s circling, **7.0** in the dive |
| Group | **twos**, never alone. Max **4** airborne on the field at once |
| Nests | Hangar 1's roof vents at (9,6), (14,6), (19,6) — **they come out of the roof, never the doors**, so they are never in front of you when they arrive |
| Drops | scrap 1–2, low-quality tech at the usual 20% with the pity floor |
| Respawn | 45s, and only from a vent you cannot see |

### 4.3 What has to change in the engine — named honestly

1. **Altitude.** `d.z = 14`. The sprite draws at `y - z`; the **shadow draws at
   `y`**; the **depth sort keys off the tile**, not the drawn position, or it
   sorts through walls.
2. **No ground collision.** It flies over `solid`. `aiMove`'s obstacle probing is
   skipped entirely — it does not path, it flies.
3. **Melee reach.** The pipe's arc tests tile distance and assumes feet on the
   ground. It must reach a drone **only during `recover`**, or a melee-only
   player has no answer and that is not acceptable.
4. **The cover and ghost passes** (`spriteCovered`, the enemy ghost) assume feet
   on a tile. Both need to know about `z` or the drone will ghost through
   buildings it is flying above.
5. **`beingHunted()`** already reads `alert`/`memory` per entity — drones join
   the same rule, and `killDrone` clears both, like everything else does now.

---

## 5. THE BEACON SWEEP — exact

Vibe that is also a mechanic, and the thing that makes open ground a *place*.

```js
// area def: beacon: { x: 82, y: 9, period: 8.0 }
// the sweep angle at time t
const ang = (gameTime % B.period) / B.period * Math.PI * 2;
// a tile is lit when it is within HALF_ARC of the sweep and inside RANGE
const LIT_ARC   = 0.22;      // radians either side — a narrow blade of light
const LIT_RANGE = 46;        // tiles
```

**Detection contribution**, added in `updatePlayer` where the crouch is already
read:

| Situation | added to the nearest hunter's `alert`, per second |
|---|---|
| Standing in the sweep, in the open | **+0.30** |
| Crouched in the sweep | **+0.15** |
| Under a hangar's shadow, in a blast pen, under the wreck's wing, indoors | **0.00** |
| Not in the sweep | 0.00 |

It **cannot** alert on its own: it is capped so the sweep alone tops out at 0.85,
below the 1.0 that starts a chase. It gets you noticed; it never finds you.

**It must be visible.** The blade of light is drawn on the ground with the same
additive light pass the Scrapper's gaze cone uses. *If a player cannot tell why
their meter moved, it is a bug however it was intended.*

**S2 turns it off permanently** — `field12.beaconOff`, saved.

---

## 6. THE PEOPLE — `FOLK.lamp`

Matching the existing `FOLK` shape exactly (`js/entities.js`). **Nobody learns
the traveller's name.**

```js
lamp: [
  { key: 'wren', name: 'WREN', x: 7.5, y: 10.5, stock: 'wren', verb: 'TRADE', lines: [
      ["You came up the spine. Nobody comes up the spine.",
       "There's a field north of here with a fence round it. I've been in.",
       "Don't stand still where the light goes. That's it, that's the advice."],
      "Two of them. Out the roof, not the doors. I was under the wing before I heard the second one.",
      "Stair's on the north face of the tower. Outside. The inside one's under water.",
      "I'd go back for the pack. I'm not going back for the pack." ] },

  { key: 'oz', name: 'OSGOOD', x: 11.5, y: 11.5, lines: [
      ["Fire's free. Sit if you're sitting.",
       "Wren goes out. I keep the fire. It's a fair split.",
       "Whatever's up that tunnel, it's not for me."],
      "I had a radio. Still have it. Stopped listening about a year ago.",
      "It's a year old, friend. Everything's a year old.",
      "If you come back, come back before dark. If you don't, that's your business." ] },
],
```

### `STOCK.wren`

```js
wren: [
  { label: '6 pistol rounds', icon: () => Sprites.ammo, cost: { scrap: 6 },
    buy: () => { giveRounds('pistol', 6); showMsg('Bought 6 pistol rounds'); } },
  // the last rifle ammunition before Ring 4 — the resupply the Sprawl assumes
  { label: '12 rifle rounds', icon: () => Sprites.ammoRifle, cost: { scrap: 14 },
    sold: () => !player.owned.rifle, soldText: 'Nothing to put them in',
    buy: () => { giveRounds('rifle', 12); showMsg('Bought 12 rifle rounds'); } },
  { label: 'snack bar', icon: () => Sprites.snackIcon, cost: { scrap: 5 },
    buy: () => { player.inv.snack++; showMsg('Bought a snack bar  (H to eat)'); } },
],
```

Oz sells nothing. He keeps the fire. **Field 12 has no living people at all** —
one dead man in a shed, three tapes, and a squad doing a job.

---

## 7. THE QUESTS — state, triggers, and the objective table

### 7.1 New save state

```js
const Quests = { q2: 'none', q3: 'none', s1: 'none', s2: 0, s3: 'none' };
//  q2: none → given → mast → mounted → done
//  q3: none → given → slate → done
//  s1: none → given → done          s2: 0..3 tapes found
//  s3: none → given → done
let f12 = { beaconOff: false };
```

**Merged onto defaults on load** (rule 6), so adding `q4` later cannot break a
live run. Nothing existing changes shape.

### 7.2 `OBJECTIVES` rows — appended to the table in `js/entities.js`

The chain is a table plus a rank already. These extend it:

| # | id | title | area | x, y | rank condition |
|---|---|---|---|---|---|
| 6 | `aerial` | Fetch the long aerial | fringe | 119, 61 | `Quests.q2 === 'given'` |
| 7 | `mount` | Mount the aerial on the tower | candlelight | 6.5, 3.5 | `Quests.q2 === 'mast'` |
| 8 | `northbound` | Follow the signal north | fringe | 92, 30 | `Quests.q2 === 'mounted'` |
| 9 | `theWreck` | Reach the wreck on the runway | field12 | 44, 26 | `Quests.q3 === 'given'` |
| — | *(silent)* | — | — | — | `Quests.q3 === 'slate'` — the headache, then quiet |

`questRank()` gains one clause per row, read top-down, furthest evidence first —
the existing rule, unchanged.

### 7.3 Q2 · THE LONG AERIAL — beat by beat

| # | Trigger | What happens |
|---|---|---|
| 1 | Talk to **Ivar** at Candlelight after `campMapRead` | *"We hear the whole ring and we can't answer it. There's a mast in the school yard."* → `q2 = 'given'` |
| 2 | Enter the school yard (108–130, 56–67) | **An HHD squad is already there**, standing watch over nothing. First hint that the machines are still guarding things that stopped mattering a year ago |
| 3 | Interact with the mast at (119, 61) | Aerial taken → `q2 = 'mast'`. **The school's map pin is restored the day it gets a purpose** |
| 4 | Climb the church tower (needs the stair — `candlelight.md` §5, outstanding) | Mount it → `q2 = 'mounted'` |
| 5 | Automatic | The radio catches **the loop**: a broadcast from the night of the Correction, half-corrupted, repeating on an automatic transmitter. Ivar: *"That's not a person. That's a machine that never got told to stop."* It is coming from the north |

**Ivar names a direction, not a place.** The player has already seen the control
tower on the skyline from the north cross. Those two facts meet in the player's
head, not in a quest log — that is the whole design of this quest.

### 7.4 Q3 · THE RECORDING

| # | Trigger | What happens |
|---|---|---|
| 1 | Enter `field12` | `q3 = 'given'`. **The loop is audible**, faint |
| 2 | — | Cross the runway. The beacon sweeps, two drones are up, and the work lamps at the wreck are visible from the gate |
| 3 | — | **The recovery detail**: a full HHD squad + a Magistrate, cutting the wreck apart. **This does not have to be a fight** — the pens, the bowsers, the wing and the crouch are all there, and the slate can be taken while they work |
| 4 | Interact with the wreck core | `q3 = 'slate'`. They were working outside-in and had not reached it |
| 5 | Automatic | The footage: machines turning in perfect unison, in one second, across a whole city. Not a fault. A command — **AUTH: E.VANN** |
| 6 | Automatic | His head splits. Thought-bubble system, no dialogue, no explanation. **The reveal is locked to Q8 and must not leak** |

### 7.5 The side quests

| | Given by | Do | Reward |
|---|---|---|---|
| **S1 · What Wren Left** | Wren | Her pack in Hangar 2 at (60,9) | Her **full stock opens** (rifle rounds appear) and she tells you about the fire stair. A side quest that unlocks the *route* to a main reward without gating it — find the stair yourself and you lose nothing |
| **S2 · The Last Shift** | The dead man in the shed | Three tapes: the **shed** (10,55), a **blast pen** (16,37), the **tower cab** (5,4 local) | The third tape is beside the **beacon breaker** and tells you what it is. **Throw it and the sweep stops permanently.** An optional collectible whose payoff is that the area plays differently |
| **S3 · Nothing Left to Cut** | Oz | Kill the recovery detail's **Magistrate**, bring back its shield plate | The **recoil-braced stock** (stripped off the same machine), and Oz bolts the plate to the Lamp: **the tarp comes down, a steel wall goes up, the fire burns bigger.** `GAME_PLAN.md` §6's "survivors improve the camp" in its smallest provable form — one kill, one prop swap, one visible change |

The three tapes never mention the Correction, WARDEN, or anything the player is
chasing. They are a night shift that ended: aircraft still trying to take off, a
tower crew reading clearances to machines that had stopped listening, a fire crew
that stayed for the last one.

---

## 8. THE UPGRADES — exact `PARTS` entries

Both slots already hold a part, so these are **alternatives, not additions**.
The bench stays a set of choices.

```js
optGunCam: {
  slot: 'optic', gun: 'rifle', name: 'Gun-camera optic',
  cost: { tech: 3, scrap: 10 },
  flags: { mark: 4.0 },
  note: 'the last thing you hit stays visible',
  desc: 'A recording head off a surveillance mount, clamped where the sights ' +
        'were. It keeps drawing what you last hit for four seconds after it ' +
        'goes behind something — which on open ground, where you lose things ' +
        'to distance rather than walls, is the difference between a second ' +
        'shot and a guess.',
},
stkBraced: {
  slot: 'stock', gun: 'rifle', name: 'Recoil-braced stock',
  cost: { tech: 2, scrap: 12 },
  stats: { shake: -0.8 },
  flags: { spreadMul: 0.55 },
  note: 'a burst goes where the first round went',
  desc: 'A machine that fired in threes needed the third round to land where ' +
        'the first one did, so it was built with a brace instead of a shoulder. ' +
        'Bolted to a rifle it does the same job for the same reason.',
},
```

- `flags.mark` needs a new draw hook: remember the last entity hit and its
  time, and outline it through cover until it expires.
- `flags.spreadMul` multiplies `barBurst`'s existing `spread`, so the two barrels
  finally have genuinely different best builds.

**Both go in `MILESTONE_GRANTS`** (rule 7), so a live run that has already
cleared Field 12 when this ships is handed them on load, once, through the
ledger:

```js
{ id: 'f12-guncam', name: 'GUN-CAMERA OPTIC',
  when: () => Quests.q3 === 'done', has: () => player.owned.optGunCam,
  give: () => { givePart('optGunCam'); } },
{ id: 'f12-braced', name: 'RECOIL-BRACED STOCK',
  when: () => Quests.s3 === 'done', has: () => player.owned.stkBraced,
  give: () => { givePart('stkBraced'); } },
```

Unique keepables only. **Never the ammunition** — you cannot tell "spent it" from
"never got it".

---

## 9. NEW ART — the full list

| | Sprite | Notes |
|---|---|---|
| **Ground** | `runway`, `apron`, `tunnel` | ids 16, 17, 18 in `buildTilesets()` — **12-15 are taken**: the Fringe's edge pass claimed them for `ash`, `water`, `deck` and `scorch` |
| **Decals** | centreline dash, threshold bar, the numerals `12` and `30`, taxi guide line, tyre streaks | **all sheared** — `sheared(img, +1)` |
| **Volumes** | `hangar` ×2 variants, `towerBlock`, `revetment` | Pre-rendered volumes. **Never assembled panels** — three attempts failed before that rule |
| **Props** | `bowser`, `tender`, `wreckDrone`, `workLamp`, `apronLamp`, `windsock`, `tug`, `gantry`, `pallet`, `dictaphone`, `deadCrew` | |
| **Lamp** | `drumFire`, `tarp`, `handCart`, `kettle`, `shieldWall` (S3's swap) | |
| **Enemy** | `rustDrone` — 2 body frames × 4 rotor frames, a shadow, and the amber recover glow | |
| **Effects** | the beacon blade, the drone's mark dot and line, the loop's audio source | |
| **Icons** | `icoField` (map pin for Field 12), `icoTunnel` | 7px, `icon7()`, outlined, in the existing family |

---

## 10. BUILD ORDER — nine phases, each one lookable-at

| | Phase | Ends when | Size |
|---|---|---|---|
| **E0** | **Prototype the runway.** Twenty tiles of centreline and one threshold bar, on the existing Fringe, thrown away afterwards | You have looked at sheared paint at scale and it is right | **XS, and it goes first** |
| **E1** | **The two viaduct holes** + `underpass` and `field12` as empty fenced rectangles with working seams | You can walk Fringe → tunnel → field → Fringe. The loop closes | **S** |
| **E2** | **Field 12's ground and fence** — runway, apron, verge, all paint, both openings | *Flood fill: 0 tiles reachable with both openings sealed* | **M** |
| **E3** | **The structures** — hangars, tower shell, pens, bowsers, shed, wreck, windsock | The airfield reads as an airfield in daylight grey | **L** |
| **E4** | **The rust drone** — altitude, shadow, no ground collision, melee reach, the four states, cover/ghost tests | Two drones over an empty runway are a fight worth having | **M — its own phase** |
| **E5** | **The beacon** — the sweep, the light on the ground, the detection contribution, the cap | You can watch the blade cross you and see the meter move | **S** |
| **E6** | **The Underpass and the Lamp** — tunnel, shafts, the bay, Wren and Oz, `STOCK.wren`, S1 and S3 | You can walk in from the spine, trade, and go on to the field | **M** |
| **E7** | **Q2** — Ivar, the school mast, the church tower stair, the loop, the school's pin | You have a bearing north | **M** |
| **E8** | **Q3 and the tower** — the recovery detail, the slate, the headache, the tower interior, the optic, S2's three tapes and the breaker | Act 1 is playable end to end | **L** |

**E0 first, always.** The runway is the largest sheared surface ever attempted
here and it is the cheapest thing to get wrong.

**Big art stays local-first** (CLAUDE.md): E3, E4 and E5 do not get pushed until
you have seen them.

### Hard dependencies
- **Bo's rifle repair must work before E4 ships.** `enemies-bosses.md` is
  explicit that the pacing assumes reaching the open city with a pistol and a
  broken rifle — and a pistol is not an answer to an open runway with flyers.
- **`finish-the-fringe.md` F1–F3 must ship before E1**, because the seams are
  holes in the viaduct.

---

## 11. VERIFICATION — per phase, not at the end

| Phase | Test |
|---|---|
| E1 | All four seams work both ways; no area's exit lands in geometry; the world map draws three new thumbnails and no area overlaps another |
| E2 | **Flood fill with both openings sealed: 0 of 6,912 tiles.** Every interior tile reachable from inside |
| E3 | `audit2.js`: nothing inside geometry, no unreachable item, no stacked props. The occlusion sweep finds no prop under 70% visible |
| E4 | A drone cannot be hit by melee except in `recover`; it does not ghost through a hangar it flies over; `beingHunted()` clears when the last drone dies |
| E5 | The sweep alone never reaches alert 1.0. Under any of the four cover types it contributes exactly 0 |
| E6 | Both `STOCK.wren` rows resolve; the Lamp has no bed, bench or med station; S3's prop swap survives a save/load |
| E7–E8 | The full chain from a fresh run: name → yard → Fringe → Candlelight → Q2 → north → Q3, with no dead objective and no null in the column |
| all | `smoke.js`, `audit2.js`, `hunted.js` clean; v1/v2 saves still migrate |

---

## 12. FRAME BUDGET

| | props | measured |
|---|---|---|
| The Fringe today | 312 | 2.8 ms at a roadblock, 4.3 ms in open street |
| Field 12 | ~390 | **measure at the wreck with the detail alive and four drones up** — not in the quiet |
| The Underpass | ~60 | trivially cheap; it is a corridor |

Field 12 has more props than the Fringe but far less draw depth — an airfield is
flat and the spatial index only touches what is near. The risk is not the props,
it is **four flying entities with shadows and lights**, which nothing has needed
before. If it costs, the answer is fewer drones, not smaller drones.

---

## 13. RISKS

- **The runway paint.** Ninety tiles of sheared markings. E0 exists for this.
- **Open ground fights the engine.** Occlusion, the player fade and the enemy
  ghosts all key off things standing in the way, and on a runway nothing does.
  Field 12's danger comes from sightlines, which probably wants a per-area sight
  multiplier — a knob that does not exist yet.
- **The flyer is a new role**, with four engine touchpoints named in §4.3.
- **The beacon is a new input to detection**, the most carefully tuned system in
  the game. Additive, small, capped, and *visible*.
- **Three new areas at once** — `underpass`, `field12`, `tower`. Each one is a
  `world` offset the map has to place without overlap, and a fourth and fifth
  and sixth thumbnail on the world map.
- **Save migration**: `Quests`, `f12`, two `MILESTONE_GRANTS`, three areas. All
  merged onto defaults; nothing discarded; an old run walks into all of it.
- **Scope.** E0–E8 is comfortably the largest thing attempted since the Fringe
  itself. **E1–E3 is a shippable milestone on its own** — an empty, walkable,
  fenced airfield with no enemies and no quest is already a place, and it is the
  right thing to look at before committing to E4 onward.

---

## 14. OPEN QUESTIONS

1. **The loop** (§1) — three areas with two ways round, or is that one area too
   many for what it buys? *(My lean: build it. It is the first real choice in
   the game and both halves already had to exist.)*
2. **The rust drone's debut.** Field 12, or a pair over the Fringe's north end
   first so the airfield is one new thing and not two? *(My lean: preview them
   in the Fringe. This is the sharpest question in the document.)*
3. **The Magistrate.** `hhd-squads.md` open question 2 asks whether it belongs in
   the Fringe at all. The recovery detail and S3 both assume yes.
4. **Hangar interiors** — dark roofed volumes you walk into (cheap, and the shack
   already works this way), or their own indoor areas like the crypt (better, and
   two more areas)? *(My lean: volumes. Three new areas is already a lot.)*
5. **The tower as its own area** — worth it for one room, or make the cab a
   roofed volume too and skip the fifth area?
6. **S2's tapes** — three of them, of a night shift that never mentions the plot.
   Texture the game wants, or a distraction from a story already carrying a lot?
7. **EMP or a thrown consumable.** A flyer is the first enemy that really wants
   one. New system — here, or hold for Ring 4?
8. **Names.** Field 12, Wren, Osgood, Aldergrove Primary — all still placeholders.


---

## 15. BUILT — E0 to E3

*Everything below is measured. E4 (the rust drone), E5 (the beacon), E6 (Wren,
Oz and `STOCK.wren`), E7 (Q2) and E8 (Q3 and the tower area) are NOT built.*

### E0 — the runway paint, and the one real departure from this spec

§2.1 said the markings would be `sheared(img, +1)`. **They are not, and they
could not be.** A shear maps the u axis (world +x) correctly and leaves v alone;
that is invisible on a 2px dash and plainly wrong on anything with width, and a
runway number is 4 × 7 tiles. Every mark is built in **tile space** and
projected through a `Q(u, v)` exactly like the cathedral and the viaduct deck —
so it is the angle rule enforced by construction, with no rectangle anywhere to
get wrong. `paint(wT, hT, marks, col)` in `js/sprites.js` is the whole thing;
decals may now carry their own `ox`/`oy` anchor because a seven-tile number has
no meaningful centre.

Two tunings after looking at it: paint opacity 0.55 → **0.34** (it read as
freshly repainted on a field nobody has swept in a year), and the digit box
6/3 → **1** across, because at 6/3 the number spanned 9.5 tiles of a 7-tile
runway and ran off both sides.

### E1 — the loop closes

Both viaduct mouths are seams now instead of dead ends: the rubble moved to the
sides of each tunnel and the collapse face came out. Walked end to end, in both
directions, every hop landing on standable ground:

```
Fringe --up the spine--> Underpass --east door--> Field 12
Field 12 --vehicle gate--> Fringe --up the mid street--> Field 12
Field 12 --west breach--> Underpass --south mouth--> Fringe
```

World offsets differ from §1.1 (`underpass` at 20,−38 and `field12` at 60,−74)
because both had to sit north of the Fringe without overlapping it or each
other on the world map. Checked: no new overlap. Candlelight and the crypt sit
inside the Fringe's box by design and always have.

### E2 — the fence holds

| | |
|---|---|
| Field 12 | 96 × 72 = **6,912 tiles**, **6,024 walkable** from the vehicle gate |
| **Both openings sealed** | **0 tiles reachable in either opening** — the church-corridor test, passed |
| Unreachable | none — both hangar doors, the tower, both pens, the bowsers, the shed, the wreck, the windsock, the breach, both runway ends, all items |
| The Underpass | 20 × 36, **359 walkable**, service bay and east door both reachable |

### E3 — it reads as an airfield

Hangars, tower, two blast pens, four bowsers (each a `boomBarrel` with a 3-tile
blast), the crash tender shed, the wreck with its work lamps, six dead
floodlight masts and the windsock. **392 props** against the ~390 this spec
estimated.

**The style table was wrong the first time.** Hangars and pens went in as `G`
and `S` — the garage and *shopfront* styles — which put rows of glazing and a
fascia board on buildings whose whole point is that they are enormous and blank.
New `BUILD_STYLE.A` (tall blank corrugated) for the hangars, `W` for the pens.
An airfield is not a high street.

### Frame cost

| | ms |
|---|---|
| At the wreck | **16.66** |
| The apron | 14.12 |
| The vehicle gate | 13.91 |

Within the band the Fringe already occupies (13.2–16.6). §12 said to measure at
the wreck *with four drones up* — that measurement waits for E4.

### Suites

`verifycut`, `loop` (every exit landing and zone), `f12` (the fence and
reachability), `walkloop` (the loop in both directions), `audit2`, `smoke`,
`hunted`, `live`, `rescue`, `cost` — all green, no console errors.

### Still open

Both areas are **empty of people and enemies**. Field 12 has no drones and no
beacon; the Underpass has the service bay but nobody in it. That is E4–E6 and it
is the difference between a place and a level.


---

## 16. THE TUNNEL COMES OUT THE OTHER END

*"So the underpass you still leave on the side instead of the other side, which
would make sense."*

Correct, and it was worse than a layout question. §1.1 put the way onward on the
Underpass's **east wall** — and the build made it a bare trigger zone standing in
open floor, with **no door drawn on that wall at all**. You walked at blank
concrete and the screen faded.

You drive into a tunnel and you come out the other side of it. That is the whole
shape of a tunnel and there was no reason to break it.

| | Was | Is |
|---|---|---|
| South mouth | → the Fringe spine | unchanged |
| Onward to Field 12 | a trigger by the east wall, no door | **an opening in the north wall** at x 8–11, the road running out between two pieces of it |
| North end | sealed, "Ring 4 goes here" | the way on |
| Side walls | one invisible door | **nothing but the service bay** |

**This moves Ring 4's seam.** It attaches to Field 12's north fence when it is
built, not to the Underpass's far end. A tunnel with a door in its side is a
corridor with a secret; a tunnel with two ends is a road, and the road is what
this area is.

Walked both ways: Fringe → south mouth → **north end** → Field 12 → vehicle gate
→ Fringe, and the reverse through the west breach. Every hop lands on standable
ground. Underpass walkable 359 → 376. `loop`, `f12`, `walkloop`, `audit2` and
`smoke` all green.
