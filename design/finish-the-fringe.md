# FINISHING THE FRINGE — the build plan

**Status: PLAN. Nothing here is built. Needs approval before any code.**
Written 2026-09-02 in answer to *"ok make a detailed plan to finish the Fringe."*

This is idea **B1** from `design/map-shape.md`, costed and drawn on real
coordinates. It adds **no new walkable ground and no new content**. It gives the
map the four edges it has never had, and brings them inward so the ring stops
being a rectangle with nothing in the corners.

---

## 1. WHAT IS WRONG, IN NUMBERS

Measured against the live map, not estimated.

| | |
|---|---|
| The Fringe | 200 × 150 = 30,000 tiles, **21,437 walkable**, 312 props |
| Within 5 tiles of any prop, item, sign or enemy | 9,922 — **46.3% of walkable** |
| Within 14 tiles of the critical path | 3,882 — **12.9%** |
| Everything the game sends you to | fits in x 35–197, y 60–120 — **32% of the map** |

And the fact that settles what kind of problem this is:

> **Solid tiles on the outer ring: north 0, south 0, west 0, east 0.**
>
> The Fringe has **no edges at all.** Every boundary is the arithmetic check in
> `canStand` (`x > 1 && x < MAP_W - 1`). You do not walk up to anything. You
> walk until the game stops letting you.

That is the whole "box" feeling in one line, and it is why this is worth doing
before another tile of new content is built.

---

## 2. WHAT "FINISHED" MEANS

Four edges you can see, understand and blame — all four already written into the
atlas and none of them built — brought **inward** to where the content actually
stops.

| | after |
|---|---|
| Walkable | 21,437 → **~13,912** (−7,525 tiles of nothing) |
| Within 5 tiles of something | 46.3% → **58.5%** |
| Props removed with the dead ground | 34, and the block-filler stops generating there |
| New content added | **none** |
| Existing content touched | **none** |

---

## 3. THE FOUR EDGES

Every one of these was checked against a list of everything the game needs —
POIs, signs, items, chests, the workbench, the map table, raiders, droids, the
area exits and the player's entry point.

> **All four regions came back: `NOTHING — clear to cut`.**

### 3.1 NORTH — THE VIADUCT · `y 0–21` · 4,400 tiles, 3,157 walkable, 24 props

The atlas: *"A kilometre of elevated M7 pancaked into a rubble ridge bristling
with rebar."* It has been the Fringe's north wall on paper since the atlas was
drawn.

- **Deck at y 22–29**, eight rows, full width. `solid` + `heavy`.
- **Verge y 30**, so the north cross (road y 33–39, pavement y 31–32) is
  untouched and still the northernmost street.
- **One hole: the underpass mouth at x 26–34**, on the spine's alignment. It is
  left *walkable and dark*, and it dead-ends for now — a tunnel with rubble
  forty tiles in. **That is the door the next area attaches to**, and building
  it now means the next expansion is a seam and not a demolition.
- Everything at y 0–21 goes behind it: 22 rows of building fill that nobody has
  ever been sent to and nothing lives in.

**Art.** Buildings are single pre-rendered volumes (the rule) — the deck is the
same: one `makeBuilding`-style volume per 8-tile section, varied, with a rebar
decal row along its top and a shadow band on the verge. The tallest thing on the
map, and it should read as *collapsed*, not as a wall.

### 3.2 SOUTH — THE GREY RUN · `y 140–149` · 2,000 tiles, 1,800 walkable, 0 props

The atlas: *"The river burst its levees when the pumps died — the lowlands are a
black shallow sea of drowned cars and mud."*

- **Shoreline at y 138–139** — broken kerb, silt, reeds, the last dry ground.
- **Water y 140–149.** Not solid, *lethal-adjacent*: you cannot enter it. The
  cheapest honest version is `solid` water tiles with a wading margin drawn over
  them, which needs no new movement rule.
- Zero props and zero content are down there today. This is the cleanest cut on
  the map.

**Art.** A new ground type: dark water with a slow shimmer, half-submerged car
roofs, a drowned bus shelter. **This is the game's first animated ground** and
it is the piece most likely to want a second pass.

### 3.3 WEST — THE ASHFIELD · `x 0–19` · 3,000 tiles, 2,180 walkable, 10 props

The atlas: *"Tank farm that caught fire the night of the Correction and never
went out — a lake of burning fuel under a permanent smoke ceiling."*

- **Fire ground x 0–17**, impassable.
- **The burnt margin x 18–19** — scorched ground, a collapsed chain-link line,
  the heat you do not walk into. The spine's west pavement is x 24–25, so there
  are four tiles of margin between the player and the edge. Nothing is lost.

**Art, and it is the most expensive thing in this plan.** A smoke ceiling over
the western strip, an orange glow from below the horizon line, and ash falling
across the western third as ambience. The particle system already drifts motes;
ash is motes with a different colour, weight and direction. The glow is a light
source with no object under it.

**It is also the best-looking thing in this plan.** Standing on the spine at
dusk with a burning horizon to your left is the single strongest image the
Fringe could have, and it costs no new walkable ground.

### 3.4 EAST — THE CITY LIMIT · `x 190–199, except the gate` · 1,170 tiles, 992 walkable

The junkyard's boundary wall already exists at `x = MAP_W - 2` for y 104–136.
North and south of that the east edge is simply open.

- **Extend the same wall run** the full height, keeping the gate at y 118–122.
- One `wallRun` call with the existing fence kinds. **Nearly free**, and it makes
  the one edge that is already partly real, real everywhere.

---

## 4. THE M7 — GIVING THE MAP AN INWARD

The second half of the box problem: nothing on the map says which way the Core
is. The atlas's answer is the **M7**, the radial motorway every ring crosses. The
Fringe's spine *is* the M7 and has never been told so.

**Do not widen it.** Re-cutting a 106-tile street's frontage is the expensive
half of idea A and it buys less than the cheap version:

| | |
|---|---|
| **Gantries** | Sign gantries spanning the spine at three points, with the boards still on them |
| **The boards** | Motorway blue, and they are the only place in the game that names the destination: **`M7 (N) — CITY CENTRE`** with an arrow, and below it, hand-painted over the top by somebody: **`DON'T`** |
| **Barriers** | Crash barrier instead of kerb along the spine's edges — sheared to the iso grid like every other long thing |
| **Paint** | The spine's lane dashes become motorway dashes: longer, wider spacing |

A blue sign that says CITY CENTRE with an arrow on it is a stronger *inward*
than eight lanes of tarmac, it costs four props and a decal, and the
overpainted **DON'T** is the ring's whole attitude in one word.

---

## 5. WHERE IT GOES IN THE CODE

`buildFringe()` runs its passes in a fixed order, and this matters:

```
resetMap → street network → ★ THE EDGES GO HERE ★ → city blocks →
landmarks → the cordon → building volumes → street dressing → cars →
gas station → signs → yard gate → roadblocks → patrols → ground dressing
```

Putting the edges **after the streets and before the city blocks** means every
later pass avoids them for free and nothing needs a special case:

- `placeBuilding` already refuses any tile where `solid[y][x]` is true, so the
  block filler stops generating the 34 props and their buildings in the dead
  zones — **the map gets cheaper, not more expensive.**
- `placeProp`'s `freeSpot` requires `ground === 5`, so no street furniture
  wanders in.
- The `behindSomethingTall` / `coveredByABlock` tests added for the lamp posts
  read `heavy` and `buildings`, so the new deck is handled with no new code.

One new ground type per edge (`water`, `ash`, `deck`), one new pass function,
and one `wallRun` call.

---

## 6. BUILD ORDER — six phases, each one lookable-at

| | Phase | What | Ends when | Size |
|---|---|---|---|---|
| **F1** | **The cut, undecorated** | All four regions set solid, in placeholder grey. No art at all. | You can walk the whole map and every direction ends in a wall. **The verification in §7 passes.** | **S** |
| **F2** | **The east wall** | Extend the junkyard wall run full height | The east edge is one continuous thing with a gate in it | **XS** |
| **F3** | **The viaduct** | The deck volumes, rebar, the shadow band, the underpass mouth | It reads as a collapsed motorway, not a fence | **M** |
| **F4** | **The M7 dressing** | Gantries, the blue boards, the DON'T, barriers, motorway paint | The spine says which way the Core is | **S** |
| **F5** | **The Grey Run** | Shoreline, animated water, drowned cars | The south edge reads as water you cannot cross | **M** |
| **F6** | **The Ashfield** | Smoke ceiling, the glow, falling ash | The west edge reads as a fire that has been burning for a year | **L** |

**F1 alone is worth shipping.** A map whose edges are honest grey walls is
already better than a map with no edges, and it is the phase that carries all
the risk — everything after it is art on top of a proven cut.

**Big art changes are local-first** (CLAUDE.md): F3, F5 and F6 stay on localhost
until you have seen them.

---

## 7. VERIFICATION — what has to pass before any of it ships

The church corridor was proven with a flood fill and so is this.

1. **Nothing needed is inside a cut.** Already run, all four clear. Re-run after
   the cut is coded, because the coded lines and the measured lines have to be
   the same lines.
2. **Flood fill from the player's entry at (194, 120)** reaches every POI, every
   sign, both roadblocks, the church forecourt, all three ammo pickups, the gas
   station, and the yard gate — and reaches **nothing outside x 18–198,
   y 22–139**.
3. **The church corridor still gates.** Both roadblocks sealed → **0 of 24**
   forecourt tiles reachable. This is the existing test and it must not move.
4. **The underpass mouth dead-ends.** Walkable from the spine, and its far end
   is solid, so it is a hole in the viaduct and not a hole in the map.
5. **Frame cost drops.** 312 props → ~278, and the west/north fill stops being
   generated. Measure at a roadblock and in open street; both should be at or
   under today's 2.8 / 4.3 ms.
6. **The bugcheck suite** (`audit2.js`, `smoke.js`) comes back clean, with no
   unreachable item and nothing sealed in geometry.

---

## 8. SAVE MIGRATION — and a bug this exposes

Rule 6: a save must survive this. A live run can be standing anywhere, including
inside what is about to become fire.

`applySave` already rescues an out-of-bounds player — but **`findSafeSpot`
searches a radius of 8 tiles and then gives up.** A save at x = 5, y = 70 is
fifteen tiles inside the new Ashfield, so the search fails, and the fallback is
`{ x: MAP_W / 2, y: MAP_H / 2 }` = (100, 75). That happens to be on the east
cross and happens to work. **It works by luck, and luck is not a migration.**

Two things, both small:

1. **Give the search a second sweep.** If the 8-tile ring fails, walk outward to
   64 in steps — the map is 200 wide and the search is cheap because it only
   runs on load.
2. **Give each area an explicit `safeSpawn`** and use it instead of the map's
   centre. The Fringe's is the gate road at (194, 120); the junkyard's is
   Marek's yard. A named tile beats an arithmetic guess.

Everything else migrates untouched: fog is per-area and per-tile and simply
covers ground that is now behind a wall; the map thumbnail is rebuilt from live
tile arrays on load, so it redraws with the new edges; area state is keyed by
position and none of the keyed objects are in a cut region.

---

## 9. WHAT THIS PLAN IS NOT

- **It is not new content.** Nothing to do, nowhere new to go, no quest touched.
  It is the map admitting where it ends.
- **It is not Field 12.** That is `design/field-twelve.md` and it waits on the
  open question of whether it becomes its own fenced area.
- **It is not the curved streets or the density falloff.** Those are the
  expensive half of idea A and they belong to Ring 4, which can be drawn that
  way from its first line instead of re-cut afterwards.
- **It does not widen the spine.** See §4.

---

## 10. RISKS

- **The Ashfield's smoke ceiling is a screen-space effect over a world-space
  edge.** The HD-2D pass already draws bands, so the machinery exists — but a
  haze that sits in the wrong place when the camera moves will look like a bug,
  and the west edge is visible from a third of the map. Prototype the haze
  before the fire.
- **Animated water is new.** Nothing in the game has a moving ground type. Keep
  the first pass to a two-frame shimmer and see it in motion before adding
  anything.
- **The viaduct is the tallest volume yet attempted.** Buildings are
  pre-rendered volumes for a reason — three attempts at assembling wall panels
  failed before that rule existed. The deck must be built as volumes from the
  first line, not as panels.
- **THE ANGLE RULE** applies to the crash barriers, the shoreline, the rebar and
  the motorway paint — every one of them is a long thing lying along the ground.
- **The map thumbnail changes shape**, so the world map's framing and the zoom
  floor shift. Harmless, but the map UI should be looked at once after F1.
- **Reachability is the whole risk and it is testable.** §7 is not a formality;
  it is the reason this is safe to do to a live map.

---

## 11. OPEN QUESTIONS

1. **Is losing 7,525 walkable tiles acceptable?** It is all bare ground today and
   nothing is on it, but after this you cannot walk it. *(My lean: yes — the map
   gets smaller and the world gets bigger.)*
2. **The underpass mouth in F3** — build the dead-end hole now as the future
   seam, or close the viaduct completely and cut the hole when the next area is
   actually built? *(My lean: build it now. A tunnel you cannot enter yet is a
   promise; a wall you later knock a hole in is a demolition.)*
3. **`DON'T` on the motorway sign** — right, or too knowing for a world that
   otherwise never winks?
4. **Water: impassable, or shallow and slow?** Wading opens the floodplain as a
   future route to the Sprawl's Dockyards. Impassable is one line; wading is a
   movement rule. *(My lean: impassable now, and it can become wadeable the day
   there is something on the far side.)*
5. **Order.** F1 → F2 → F3 → F4 → F5 → F6 costs least and looks worst for
   longest. Doing F6 (the Ashfield) early would make the map feel finished much
   sooner, at the price of building the riskiest art on an unproven cut.

---

## 12. BUILT — what actually shipped, and what it measured

*Appended after the build. Everything below is measured, not estimated.*

### What is in

| | Phase | State |
|---|---|---|
| **F1** | The cut | **Done.** Ash `x ≤ 19`, water `y ≥ 140`, deck `y ≤ 29`, all solid + heavy, three new ground ids (12 ash, 13 water, 14 deck) |
| **F2** | The east wall | **Done.** The junkyard wall run extended from 32 tiles to the full height, gate still at y 118–122, and `x = MAP_W - 1` sealed |
| **F3** | The viaduct | **Done.** Deck volumes in a new `BUILD_STYLE.V`: blank concrete faces with shutter joints and base grime, and a **carriageway** on top — lane paint, edge lines, a central reservation, ruts, spalling, a crack down the length, burnt-out cars and rebar off the broken parapets. Both underpass mouths open and dead-ending |
| **F4** | The M7 | **Partly.** Three gantries over the spine at y 46, 88, 112, each carrying `M7 (N) / CITY CENTRE` with an arrow and **`DON'T`** sprayed across it in red, dripping. The spine's lane paint is motorway paint now (16px marks at 5-tile spacing instead of 7px at 3). **Crash barriers along the spine were NOT built** — see below |
| **F5** | The Grey Run | **Done.** Silt-and-reed tidemark along the shore, 26 drowned cars sitting window-deep, sliding sheen bands and per-point glints on the water |
| **F6** | The Ashfield | **Done.** Burning ground beyond the west edge, a smoke ceiling over the western strip, real lights spaced along the fire line so the glow falls on the ground you stand on, and ash falling — all of it fading in as you walk west and off again by x 66 |

### What was deliberately left out

**Crash barrier along the spine's edges (F4).** It is 106 tiles of street with two
sides, so it is ~200 props on a map that has just gone 312 → 399, and the gantries
plus the motorway paint already do the job the phase existed to do. Not built,
not forgotten.

**A cast shadow band on the verge under the deck (F3).** The night ambient
already darkens the strip under the viaduct and a separate decal band was not
buying anything on top of it.

### Measured

| | Before | After |
|---|---|---|
| Walkable from the gate | 21,437 | **14,423** |
| Props on the Fringe | 312 | **399** |
| Outer ring solid — N / S / W / E | 0 / 0 / 0 / 0 | **200/200 · 200/200 · 150/150 · 150/150** |
| Reachable outside x 20–197, y 22–139 | 6,852 | **5** — the gate rows at x 198, behind an exit trigger that fires at x 196.4 |
| Church corridor, both roadblocks sealed | 0 / 24 | **0 / 24** |
| Frame cost — street / roadblock / spine mouth / ash / water (ms) | 14.72 / 15.54 / 14.53 / 13.44 / 12.99 | **14.83 / 14.04 / 14.00 / 14.71 / 13.33** |

**§7.5 of this plan was wrong twice and both corrections stand.** Props did not
fall to ~278, they rose to 399 — the east wall alone adds ~105 wall slices, and
the deck, the gantries and the drowned cars add more. And frame cost did not
drop: it is unchanged within noise, except beside the Ashfield where the fire
costs about **1.3 ms**. The cut buys honesty about where the map ends, not speed.

### The bug this build created and caught

The first version of the Grey Run's dressing drew from `rng`, the map builder's
shared stream, in the middle of `buildFringe`. Every pass after it re-rolled:
**walkable fell to 14,075, props jumped to 419, and St Martin's ended up inside a
block.** The Fringe is generated fresh on every load, so that is a *different
city* for a save written against the old one. New dressing now runs **last, on
its own `mulberry32(90210)`**, and the numbers came straight back. Any future
pass added to `buildFringe` has to do the same or go at the end.

### §8, done

- `findSafeSpot` searched a radius of 8 and gave up. The Ashfield is twenty
  columns deep, so a run saved at x 5 was fifteen tiles from anywhere it could
  stand and fell through to a hardcoded map centre. It reaches **44** now, with
  the ring sampled at `max(16, r·6)` rays so a two-tile gap cannot be stepped
  over. Measured rescues: ash 5,70 → 20.5,70.5 (15 tiles) · water 100,145 →
  99.5,139.6 · deck 60,25 → 61,30.5 · behind the east wall 198,60 → 197.6,60.9 ·
  the ash/deck corner 3,3 → 26.5,22.8 (30 tiles). All five returned `null` before.
- Every area now names a **`safeSpawn`** and the last-resort rescue lands there
  instead of `{ MAP_W / 2, MAP_H / 2 }`. All five verified standable in their own
  area — the first guess for the prologue was inside geometry and was moved.

### Suites re-run, all green

`verifycut.js` · `audit2.js` (four areas: nothing hidden, nothing inside
geometry, nothing stacked, nothing unreachable) · `smoke.js` (prologue, round
trips, v1/v2 save migration, thumbs, death/respawn, 20s sim per area) ·
`hunted.js` (all eight cases) · `live.js` (map UI) · `cost.js`. No console errors.

`verifycut.js` still reports `POI stmartins@56,60` as unreachable. **That is the
harness, not the map** — the pin sits in the middle of the cathedral volume and
the test's 5×5 adjacency window does not reach the parvis. It reports the same
thing against the untouched pre-build code.
