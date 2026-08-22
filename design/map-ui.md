# Map UI overhaul

**Status: BUILT, 2026-08-20.** All six steps of §5. Verified in the browser
under `TEST_MODE` — see the notes at the bottom for the two places the plan met
the actual numbers and lost.

Laurens, 2026-08-19: the minimap always shows the area you're in, and so does
`M` — but from `M` you can **zoom out with the scroll wheel** to the whole
world, every area you have knowledge of, with icons for what is where. Camps get
their own icon; click one and it tells you what the camp is and offers to **fast
travel** there. NPCs come off the minimap. The green quest hint stays — but as a
proper **dot**, not a single pixel — and clicking it on `M` explains your
current objective.

Three follow-up decisions are recorded in §4.

---

## 1. What exists today

| Piece | Where | What it does |
|---|---|---|
| Minimap | `game.js` ~1725 | Pre-rendered whole-area canvas at 1.5px/tile, top-right. Scrolls as a window when the area is >60 tiles (`mmWindowed`). Blips: items (amber), **NPC (green)**, exits (blue), Scrapper within 8 tiles (red), player (white) — all 2×2 rects. |
| The `M` map | `game.js` ~1862 | Full-screen, current area only. Fog cells (3×3 tiles) coloured building / road / ground. Green 2×2 for signs, blue for exits, the player sprite at map scale. |
| Fog of war | `game.js` ~270 | `exploredByArea[id]`, one `Uint8Array` per area, 3-tile cells. **Already saved and migrated.** |
| Areas | `map.js` ~687 | Registry of two: `junkyard` (32×32), `fringe` (200×150). Each has `name`, `build()`, `exits`. No world position. |
| Mission | `entities.js:100` | `mission = {state}` — one junkyard errand. The HUD objective string is hard-coded at `game.js:1804`. There is no quest registry. |

Three things that make this cheaper than it looks:

- **The world already freezes while the map is open** (`game.js:533` returns
  early), so map clicks cannot fire the weapon and nothing can hurt you while a
  panel is up.
- **`#ui` is `pointer-events:none`** and `Input.mouseX/mouseY` are already in
  320×180 view space, so click hit-testing needs no new plumbing.
- **Discovery is already persisted.** A place is "known" if its tile is
  explored, and fog is already in the save. So the POI list, the world map and
  the fast-travel unlocks all derive from data we already store —
  **no save version bump, no migration.**

## 2. What's wrong with it

1. The minimap shows the **whole area including ground you have never walked**,
   while `M` shows walked ground only. The two disagree about what you know.
2. **The NPC is a green dot on the minimap** — which is why the junkyard's green
   marker reads as "the quest is there". It works by accident, and it breaks the
   moment there are two NPCs.
3. Signs are *also* green on the `M` map, so green means two things.
4. Markers are single 2×2 rects — at 320×180 that is a speck, not a dot.
5. Nothing is clickable, nothing is labelled, and there is no way to see the
   world beyond the room you are standing in.

---

## 3. The design

### 3.1 One key, continuous zoom

*(Decided by Laurens, 2026-08-19: scroll-wheel zoom, not two fixed levels.)*

`M` opens the map framed on the area you are standing in, centred on you. From
there the **scroll wheel zooms continuously** — no view modes, no toggle. Zoom
out far enough and the walls of the area stop being the edge of the map:
neighbouring areas you know slide into frame around it.

```
MapUI = { open, zoom, cx, cy, sel }     // zoom = pixels per tile
```

- **Wheel** zooms **about the cursor**, so you push toward what you're looking at.
- `ZOOM_MAX` ≈ 4 px/tile — close enough to pick out a single building.
- `ZOOM_MIN` = whatever fits **every known area** on screen at once, recomputed as
  the world grows. You can never zoom out into empty black.
- Opening sets zoom to fit the current area — so `M` behaves exactly as it does
  today until you touch the wheel.
- **Drag with the left button to pan** when zoomed in; a click that moves less
  than 3px is a click, anything more is a drag. Arrow keys pan too.
- `M` or `ESC` closes, at any zoom.

The wheel currently switches weapons unconditionally (`game.js:133`) — it gets a
`MapUI.open` guard.

**Icons and labels never scale.** They stay a fixed pixel size at every zoom, so
they are readable when an area is a thumb-sized patch. What changes with zoom is
*how many* are drawn — see §3.5.

The **minimap never zooms.** It stays what it is: where you are, right now.

### 3.2 The POI registry

One table, in `map.js` beside `Areas`:

```js
{ id, area, x, y, kind, name, blurb, travel }
```

`kind` drives the icon: `camp` · `site` (a camp that isn't established yet) ·
`gate` (area exit) · `landmark` · `sign`.

**A POI is known when its tile is explored** — `isExplored(x, y)` in its own
area's fog. Nothing else to store. An unknown POI is drawn nowhere and is not
listed.

At launch the table holds: Marek's shack (`camp`, junkyard), the yard gate
(`gate`, both sides), St Martin's church (`site`, fringe — becomes a `camp` when
Q2 builds Candlelight), the gas station, the school, the hotel, the bank
(`landmark`), and the existing sign trail (`sign`, replacing the green pixels).

### 3.2a The four landmark pins came back off, 2026-08-21

Laurens: *"remove the pins for those other buildings on the map they dont jet
have a purpose"*. **A pin is a promise.** Four of them spread across the ring,
each saying *there is something here*, and there is not — they are silhouettes
you walk past. A map that marks things you cannot use teaches the player to
stop reading the map, which costs more than four icons are worth.

The `landmark` kind stays wired up — icon, declutter rule, panel — so putting
one back is one line the day that place has a door, a trader or a fight in it.
The writing is parked here so it is not lost with the code:

| id | where | name | blurb |
|---|---|---|---|
| `gas` | fringe 143,131 | THE FORECOURT | Six pillars, a canopy and four pumps still holding whatever was in them. Nothing here is safe to shoot. |
| `school` | fringe 119,61 | ALDERGROVE PRIMARY | A long pale block with a playground behind it. Somebody painted over the name and then gave up. |
| `hotel` | fringe 121,102 | THE REGENT HOTEL | Nine floors of grey. The lobby doors are still revolving in the wind if you stand close enough to hear it. |
| `bank` | fringe 68,102 | CITY & COUNTY BANK | Stone, columns, and a vault nobody has got into. The Correction did not care about money and neither does anyone left. |

What the map shows now: **the two camps, the yard gate from both sides, and the
sign trail.** Every one of those is somewhere you can go and do something —
trade, travel, or read the way on.

### 3.3 Icons

Six 7×7 pixel glyphs in `sprites.js`, integer-filled per the rule from log
entry 70 — nothing this small may be antialiased:

| Icon | Look | Colour |
|---|---|---|
| Camp | Tent with a flame dot | `#ffb02e` warm |
| Site (unestablished) | Same tent, hollow, dashed | `#8d959b` grey |
| Gate | Arch with a gap | `#4fc3ff` blue |
| Landmark | Small spire/chevron | `#8d959b` |
| Sign | Post with a board | `#7a6248` |
| **Quest** | **5px round dot, 1px dark outline, slow pulse** | `#7ad27a` green |

The quest dot is deliberately the only green thing on either map. Signs stop
being green.

### 3.4 The quest dot and what it knows

There is no quest system to hang this on, so add the smallest honest thing: a
single function `currentObjective()` that reads live game state and returns
`{title, detail, area, x, y}`. It feeds the HUD line, the minimap dot and the
`M`-map dot from **one** source, replacing the hard-coded string at `game.js:1804`.

| State | Title | Marker |
|---|---|---|
| `mission.state === 'none'` | Talk to the survivor | The shack |
| `active` | Destroy Scrappers — loot 5 scrap `n/5` | The patrol hub |
| `complete` | Return to the survivor | The shack |
| `turned`, gate shut | Unlock the yard gate | The gate |
| gate open, boss alive | *(no title, no marker)* | — |
| In the fringe | Reach the shelter | St Martin's |

**The Compactor is never marked.** It is hidden in the junk until you walk to the
gate; a dot pointing at it would give away the ambush.

Clicking the dot on `M` opens the panel: title, then `detail` — a sentence in the
traveller's register, e.g. *"The old man in the shack fed me. He'll want
something for the pipe."*

### 3.5 One world space, true scale

*(Decided by Laurens, 2026-08-19: true relative scale.)*

Every area gets a `world: {x, y}` field — its offset in city tile coordinates —
so **there is only one coordinate space**. A tile at `(tx, ty)` in area A lives
at `(A.world.x + tx, A.world.y + ty)`, and the whole map renderer works in that
space at `zoom` pixels per tile. There is no separate "world view" to keep in
sync with the area view; zooming out is the same draw call with a smaller
number.

Areas are drawn at **true relative size**: the junkyard is 32×32 against the
fringe's 200×150, and it looks it. That is honest about how far you have walked
and it is what lets all six rings drop into the same view later without a
rewrite. Its gate exit already lands at fringe `194,120`, which fixes the yard
on the fringe's eastern edge and gives us the first two offsets for free.

Each known area renders from a **cached fog thumbnail** — the same
building/road/ground cell colours as today's `M` map, drawn once into an
offscreen canvas at 1px per fog cell and blitted at whatever scale the zoom
asks for. It is rebuilt only when new ground is explored, so zooming and panning
cost one `drawImage` per visible area. Unexplored ground is dim, not black;
unknown areas are not drawn at all. The map is what the traveller knows.

**Decluttering by zoom** — the one thing that changes as you pull back:

| Zoom | What's drawn |
|---|---|
| ≥ 2 px/tile | Everything: camps, gates, landmarks, signs, quest, player sprite |
| 1–2 px/tile | Camps, gates, quest. Landmarks and signs drop out |
| < 1 px/tile | Camps and quest only, plus each area's name and a `YOU ARE HERE` |

Labels appear under an area's name when it gets small enough to need one, and
the player marker falls back from the full sprite to a white dot below 1px/tile.

### 3.6 The panel and fast travel

Clicking any icon opens a panel along the bottom: name, two or three lines of
blurb, and for an unlocked camp a `[E] TRAVEL HERE` action.

Fast travel reuses the existing fade (`Trans`) and `enterArea(id, entry)`, which
already handles stashing area state, rebuilding, and re-seating the player.
Travelling **within** the current area is the one new path: fade, move the
player, fade back — no rebuild.

Rules *(decided by Laurens, 2026-08-19)*:

- **From anywhere**, not only from another camp.
- **Camps only** as a destination. Never to a gate, a landmark or a quest dot.
- **Only to a camp you have discovered.** St Martin's is greyed and unusable
  until you have physically stood there.
- **Not while hunted.** Blocked if any robot is alert or in memory, or you are
  in the boss fight: *"Not with something on your heels."*
- Free — no scrap, no cooldown. The city's pressure gradient comes from
  lethality, not from taxing the map.

This closes an open question in `world-map.md` ("Fast travel between discovered
camps: yes/no?") in favour of the lean already recorded there.

### 3.7 The minimap

- **NPC blip removed** (`game.js:1745`).
- **Fog, softly dimmed** *(decided 2026-08-19)*. Unexplored ground draws at
  roughly 35% brightness rather than black, so a new area reads as *unlit*
  instead of *missing* — you can still make out the shape of the street you are
  about to walk down, but only walked ground is drawn at full strength. The
  pre-rendered `minimap` canvas stays as it is; the dim is a second pass over it
  using the same fog array the `M` map already uses.
- Quest dot added, from the same `currentObjective()`.
- Camp and gate icons drawn at 3×3 when they fall inside the window.
- Items, exits, the near-Scrapper warning and the player marker all stay.

---

## 4. Decisions (Laurens, 2026-08-19)

1. **True relative scale**, with **continuous scroll-wheel zoom** rather than
   fixed view levels. §3.1 and §3.5.
2. **Fast travel from anywhere, when nothing is hunting you.** §3.6.
3. **The minimap gets fog**, softly dimmed rather than black. §3.7. This makes
   the two maps finally agree about what the traveller knows.

## 5. Build order

Each step ends verified in the browser at `localhost:8123`, with
`window.TEST_MODE = true` so no real save is touched.

1. `currentObjective()` + the green dot on both maps; the HUD objective line
   reads from it instead of its hard-coded string. Remove the NPC blip.
   *(Smallest slice that shows on screen.)*
2. POI registry + the six icons; signs and exits move onto it; green stops
   meaning two things.
3. Click hit-testing + the info panel. Wheel guard so the map doesn't switch
   weapons.
4. One world space: `world` offsets, cached fog thumbnails, continuous zoom
   about the cursor, drag-pan, and the declutter thresholds.
5. Fast travel from the panel — the same-area path and the hunted check.
6. Minimap fog.

Steps 1–3 stand on their own if the rest is deferred.

---

## 7. What changed on contact with the real numbers

Two things in this plan were written before anybody measured, and both were
wrong in the same way — they assumed the areas were smaller than they are.

**The declutter thresholds.** §3.5 gives 2 px/tile for everything, 1–2 for
camps and gates, under 1 for camps only. But the Fringe is 200×150 on a 320×180
screen, so **"framed on the Fringe" is 0.91 px/tile** and the whole ring is
0.81. Every threshold in the table sat above every zoom you would ever actually
look at the city from: opening `M` in the street showed two icons on an empty
map. Rebuilt against what the areas fit at — 1.8 / 0.85 / below — so the default
view of the city carries its camps, gates and landmarks, and the sign trail
comes in when you zoom to a street.

**The world map is not a second view, and that is what made it cheap.** Areas
carry a `world` offset and everything draws at `zoom` pixels per tile, so
framing one area and framing the ring is the same code with a different number
in it. The plan predicted this and it held: the whole renderer is one loop over
areas and one over places.

Three things the plan did not anticipate:

- **Areas overlap on screen**, so the ground has to be drawn in one pass and
  the names in a second — the Fringe's thumbnail was painting over the
  Junkyard's label.
- **Interiors are places too.** Candlelight and the crypt were built after this
  plan. They get `world` offsets on the church's own footprint — the inside of
  the church IS at the church — but are only drawn while you are in one, or the
  city would have lit rooms floating on it.
- **A thumbnail can only be built from live tile arrays**, so it is taken in
  `stashArea()` at the one moment an area is still loaded and you are leaving
  it. Without that, an area you had walked was missing from the world map until
  you went back and opened `M` inside it.

## 6. Risks

- **The world map has almost nothing to show.** Two areas, one real camp. The
  structure is right and it is what makes Candlelight land properly, but the
  payoff is thin until Q2 exists. Worth building now anyway — retrofitting a
  world view after four more areas exist is worse.
- **Fast travel with one camp is close to pointless.** Its real use starts at
  Candlelight. The shack↔St Martin's hop does save a long walk back to Marek's
  trading, so it isn't nothing.
- **UI text budget.** Panels at 320×180 with a 5×7 font fit about 34 characters
  a line. Blurbs must be written to that, not trimmed to it afterwards.
- **Continuous zoom is the fiddliest part.** Zoom-about-cursor, the click/drag
  threshold and the declutter thresholds all need to be felt rather than
  reasoned about, so step 4 should expect a round of tuning after the first
  browser check. The fog thumbnail cache also has to be invalidated when new
  ground is explored, or the map quietly stops updating — the exact bug class
  that made buildings pop out of existence in log entry 66.
- This is a **UI overhaul touching the HUD**, so it is not a "big art change"
  under the local-first rule — but it is large enough that it stays on the
  branch until reviewed.
