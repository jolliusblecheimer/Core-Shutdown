# Fringe pass 3 — STATUS

**Built:** roofs (superseded — buildings are now whole volumes), hotel + bank,
gas station rebuild, two-way visible junkyard gate, makeshift shelter-only
signs, tiny-character map marker, corner alignment, save-slot isolation for
testing.
**Could not reproduce:** the questline reset (item 7) — most likely Claude's
test saves overwriting the run; testing is now isolated so it cannot recur.
**Still open:** long props (bus stop, dumpster, awning) are flat cards that
don't lie along the road — rebuild them in face space like buildings.

---

## Original plan (kept for reference)

Nine fixes from playtesting the open city. Ordered by what has to happen first.

---

## A. Bugs to fix before anything else

### 1. Returning to the yard restarts the questline  *(item 7 — worst bug)*
**Suspect:** mission/tutorial state is global, but the *world* is rebuilt on every
area entry. Something in that rebuild resets progress — most likely candidates,
in order: `enterArea` re-running `spawnScrapper` and mission checks; the gate
cutscene flag (`GateCine` / `bossDefeated`) not surviving the rebuild; or
`saveGame()` firing mid-transition and writing a half-built state.
**Plan:** write a repro test first (junkyard → fringe → junkyard, asserting
mission state, kills, gate open, NPC dialogue branch, boss defeated). Fix the
cause, then keep the test as a permanent check. **No new content until this passes.**

### 2. Walls and street props don't sit on the iso grid  *(item 4)*
Two separate problems that read as one:
- **Props are flat rectangles.** Bus stops, dumpsters, benches and awnings are
  drawn axis-aligned, so they cut across the road at the wrong angle. **Fix:**
  give every long prop a sheared pair (`a`/`b`) like the walls already have, and
  store the street direction on the prop when it's placed.
- **Facade seams.** Corner columns helped, but the wall strip and the corner
  column are different heights (44+lift 46 vs 48), so tops don't meet.
  **Fix:** derive the column height from the wall's lift so they're locked
  together, and audit one building tile-by-tile in a test before regenerating.

---

## B. The world reads wrong

### 3. Buildings have no roofs  *(item 3)*
Right now a building is four walls around solid ground — from above you look
into an empty box. **Plan:** draw a roof quad over every footprint (same
technique as the shack roof, lifted to the facade height), with **variations
chosen per building type**:
| Type | Roof |
|---|---|
| House | Pitched tile, ridge line, a chimney |
| Shop / shutter | Flat asphalt with a parapet lip, roof vent |
| Office | Flat gravel, AC units, a stair box |
| School | Flat with rooflights and a water tank |
| Church | Steep slate pitch with a ridge cross |
| Hotel / bank | Flat, parapet, plant, and a roof sign |
Roofs stay solid (nothing is enterable yet) and never fade.

### 4. The gas station doesn't read as one  *(item 8)*
Rebuild from a real forecourt layout rather than props on concrete:
- **Canopy**: one large flat roof drawn as a raised quad on **six** pillars —
  the thing that says "petrol station" from a screen away.
- **Pump islands**: two raised kerbed islands, two pumps each, hoses and a
  price display; still chain-detonating.
- **Shop**: a proper glazed box beside the canopy with a door, lit sign band.
- **Forecourt markings**: painted lane arrows in and out, hatched no-parking
  zones, an air/water bay at the edge.
- **Pylon sign**: a tall roadside totem visible before you arrive.

### 5. The junkyard gate is invisible from the road  *(items 1 & 6)*
Today you walk into blank map edge. **Plan:** build the yard's outer face on the
Fringe side — a run of the same corrugated barricade along the east edge with
**the gate structure in it**, framed by posts, plus a hand-painted `JUNKYARD`
board. Mark it on the minimap and the M map as a blue exit. Walking into it
returns you to the yard exactly as before, so the route is a proper two-way door.

### 6. Hotel and bank  *(item 2)*
Two decorative landmarks, not enterable:
- **THE REGENT HOTEL** — tall, balcony bands, canopy over the entrance, vertical
  roof sign.
- **CITY & COUNTY BANK** — stone plinth, tall pilasters, deep-set windows, heavy
  double doors, carved name band.
Both get their own facade kinds and roof treatments.

### 7. Signs: only the shelter, and makeshift  *(item 9)*
Remove every directional sign to a POI we haven't built (Field 12, the Sprawl,
the depot, the school). What's left is a **hand-made trail to the shelter only**,
made of scavenged material — no metal, no machinery:
- planks nailed to a broom handle, arrow daubed in white paint
- a bedsheet banner tied between two poles
- an arrow sprayed straight onto a wall or the road surface
Wording gets rougher too: `SHELTER →`, `ST MARTINS. 1KM. KEEP GOING`,
`FOOD + BEDS →`, `NOT FAR NOW`.

### 8. You, on the map  *(item 5)*
Replace the white square with a tiny version of the player sprite, drawn at the
map scale with a soft ring so it stays findable.

---

## Build order
1. Repro + fix the questline reset (blocking)
2. Prop shearing + facade/column alignment
3. Roofs with per-type variation
4. The yard gate on the Fringe side, two-way and mapped
5. Gas station rebuild
6. Hotel + bank
7. Makeshift shelter signs, other POI signs removed
8. Player marker on the map

Each step verified in the browser before the next; the save must survive all of it.
