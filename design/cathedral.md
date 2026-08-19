# ST MARTIN'S — from box to cathedral (PLAN, awaiting approval)

Laurens, 2026-08-19: *"the church for the main quest looks more like a hotel,
make it look more like a cathedral"* — with two references: a gothic cathedral
west front (twin towers, rose window, great portal, stained lancets, buttresses,
churchyard) and a small pixel church (verdigris copper spire, cross).

St Martin's becomes **Candlelight**, the Fringe camp (Q2). It is the first
landmark the player walks to after leaving the yard, and the story's first warm
place. It has to read as a cathedral from a screen away.

---

## Diagnosis — why it reads as a hotel

The church is `kind: 'R'` and goes through the **same generic path as every
other building**. `BUILD_STYLE.R` only changes six colours, the height (58) and
the ridge (20). Everything else is the shared code:

| What the generic path gives it | What that actually reads as |
|---|---|
| `winRow`: 3 rows × ~8 small dark rectangles per face | a grid of hotel windows — this alone is the whole problem |
| the `isSouth` door: one 14%-wide dark rectangle + lintel | a back door, not a portal |
| a plain rectangular volume, no vertical articulation | an office block |
| ridge 20 on a 58-high wall | a shallow lid, not a steep gothic pitch |
| a 14px cross on the ridge | the only church cue in the entire building |

So: it is a hotel with a cross on it. Nothing in the silhouette says church, and
silhouette is what you read at 320×180.

**Dead code found while checking:** `drawRoof()`'s pitched branch (`game.js:963`,
with its own `k === 'R'` cross) and the `kind === 'R'` facade panel
(`sprites.js:797`, stone courses + arched window) are both leftovers of the
retired wall-panel system. Only `canopy` still calls `drawRoof`. All of the
church's real appearance comes from `Sprites.makeBuilding`. Fixing it means one
place, not three — and these two should be deleted so nobody edits them by
mistake.

---

## The approach — a dedicated branch, still ONE volume

The hardest-won rule in this project stands: **a building is rendered once into
a single sprite from shared corners** (`art-style.md`, three failed panel
attempts). The cathedral does not break that. It gets its own branch inside
`makeBuilding` — `cathedral(w, h, seed)` — that draws the whole thing, towers
included, from the *same* corner points A/B/C/D. Two different heights in one
sprite is fine; it is still one canvas, one prop, one depth anchor, so
misalignment remains structurally impossible.

Not a new special case sprinkled through `winRow` — a separate function, so the
generic path stays readable.

### Massing and orientation

Footprint changes from **12×14 to 10 wide × 22 long**, and this is the key move.

The camera shows the **south** face (C–D, spans `w`) and the **east** face (B–C,
spans `h`). The player approaches Candlelight from the south, off the east
cross. So:

- **South face = the west front.** The short gable end, 10 tiles wide, carrying
  the twin towers, rose window and portal — seen three-quarters on, straight
  ahead as you arrive.
- **East face = the nave flank.** 22 tiles of buttressed bays receding away.

That is the cathedral composition: a tall front with a long body behind it.
Currently the near-square 12×14 gives neither.

Fits the site: the free band is y 42–69 (north cross pavement ends y41, east
cross pavement starts y70). Nave at **x 50–60, y 48–69** leaves the forecourt
paving at y69–70 where it already is.

### The west front (south face)

1. **Twin towers** flanking the front, ~1.7× nave height, rising clear above the
   roofline — the single biggest silhouette change.
   - arcaded belfry stage (pointed openings, dark)
   - a clock face on each (reference 1)
   - crenellated top with a corner pinnacle
2. **Rose window** centred between them: integer-filled disc, tracery spokes,
   coloured glass, warm light behind it.
3. **The great portal** below it — recessed pointed arch, ~⅓ the front's width,
   stepped archivolts, double timber doors. The reference's loudest feature.
4. **Central gable** between the towers, steeper than the nave roof.

### The nave flank (east face)

5. **Buttresses** — a stepped fin at every bay division, with a pinnacle. This
   is what gives a cathedral its vertical rhythm; the current flat wall is why
   it reads as a slab.
6. **Lancet windows** — one tall pointed-arch window per bay, ~55% of wall
   height, with a tracery mullion. Replaces the hotel grid entirely.
7. **Stained glass**: deep blue / violet / red rather than the grey `#2a2036`,
   with a warm glow behind — the camp lives inside and is *lit by scavenged
   neon* (`main-story.md`). Light in those windows is story-true, and it makes
   the building read as the one safe place on the horizon.

### Roof

8. Ridge raised **20 → ~34** for a proper steep gothic pitch, keeping the
   existing shingle routine (it already draws in the slope's own space).
9. A **verdigris copper flèche** at the crossing — reference 2's green spire is
   the strongest single colour cue for "church", and it separates the roofline
   from the Regent Hotel's flat grey.

### Churchyard (phase 2, only if the building lands well)

10. Headstones on the north side, a low stone wall with railings — reference 1
    gets a lot of its cathedral-ness from its setting. New sprites, so this is a
    second pass, not part of the first build.

---

## Rule checks before building

- **THE ANGLE RULE** — all facade detail is laid out through `faceQuad`, which
  works in face space, so it follows the wall diagonal automatically. Towers are
  volumes off the same corners. The churchyard wall (phase 2) must use
  `makeWallRun` with a `dir`; headstones are free-standing upright, so they are
  drawn straight.
- **Integer pixels** — lancets are ~8–12px wide, tracery bars 1–2px, clock faces
  ~9px. All of it goes through `hard()`/`isoFill`, never `poly()`. The rose
  window and clocks need a **scanline disc helper**, because `ctx.arc` would
  antialias and scuff exactly like the walls did (log #70).
- **Buildings are volumes** — one sprite, shared corners, one depth. Unchanged.
- **Local first** — build, screenshot, show Laurens. **Do not push until
  approved.**

## Risks

- The 12×14 → 10×22 footprint change touches the forecourt paving loop and may
  affect the sign trail's last leg. Both need re-checking after the move;
  `placeBuilding` must still return true.
- One depth anchor for a 22-long building means coarse depth sorting against the
  player. Already true at 14 long, and the ghost-silhouette pass covers
  occlusion, so: accepted, but worth watching when walking alongside it.
- Biggest sprite in the game. `makeBuilding` caches per `w×h×kind×seed%4`, so it
  is built once — no per-frame cost.

## Build order

1. `cathedral()` branch + massing (towers, steep roof) — check the silhouette
   first, before any detail
2. West front: portal, rose window, tower stages
3. Nave: buttresses, lancets, stained glass + glow
4. Move the footprint, re-check forecourt paving and the sign trail
5. Delete the two dead `'R'` paths
6. Browser screenshots at the approach angle → Laurens approves → push
