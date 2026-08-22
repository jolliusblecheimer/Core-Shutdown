# CANDLELIGHT — the inside of St Martin's

**Status:** built, second layout, spaced out. The first one was thrown away.
**Working:** both areas, the shell, the arcade, every fitting, seven people
talking, the chests, the map table that hands you the ring, and **Tam's
counter** — per-trader stock, so a new trader is a list and no UI work.
**Not built:** Halden and Bo trading, Ade healing, the sleeping bay re-anchoring
respawn, the strongbox, Q2. Section 5 items 6, 7.

A cathedral is not the point. **A cathedral that people are living in** is the
point — cold stone somebody has made warm, and it took work. You come out of a
grey dead street into the only lit room in the ring.

---

## 1. The three rules the first layout broke

The first version was 28 × 40 with nine piers a side, full-height walls all
round, and a two-tile-square staircase. Every problem it had came from one of
these, so they are written down first now.

**1. The floor is the footprint.** 12 × 16 on the street, 12 × 16 inside. The
first pass was seven times the area of the building it lives in: you walked in
and the cathedral became a warehouse, and it was empty because there is nowhere
near enough camp to fill seven times a church.

**2. Only the far walls are walls.** North and west get full height. The two
sides the camera looks over get a **ten-pixel kerb**. A full wall there has to
be faded to see past, and a faded wall reads as a sheet of glass lying across
the floor with the people showing through it — which is exactly what it looked
like.

*And the corner where those two kerbs meet belongs to BOTH runs.* Every run
trims about seven pixels off the end that meets a corner, so that two runs
interlock there rather than overlapping. The east run used to stop one tile
short of (W-1, H-1), which left that corner carrying the south run's trimmed
slice alone. Fixed 2026-08-21, in the crypt as well, which had it too.

**But that was only half of it, and the smaller half.** Putting the missing
slice back showed the two halves landing eight pixels apart — because
`_makeWallRun` had the wrong offset for runs built along **y**: it undid the
shear at `8*(n-si)` where the shear puts the block at `8*(n-si-1)`, so *every
wall in the game built along y sat one tile-height above the floor edge it
belongs to.* Along a wall's length that reads as nothing; where two walls MEET
it is a step, and at the one place in the game two knee-high kerbs meet — this
corner — it read as the corner not lining up, with floor showing through the
join. Fixed in `js/sprites.js`, and with it the apex of every wall corner in
the yard, the shack, the crypt and this room, which had all been half a tile
out and were all being read as "that is just how the pixels fall".

**3. One thing per tile, and the room proves it.** The builder's `put()`
refuses to stack anything and warns if the layout tries. The first pass had a
bench, a shelf and a pier in the same corner of the screen.

And a fourth, learned from the stair: **anything that has to be big to read is
the wrong object.** A stair legible at this scale ate a quarter of the room and
stood taller than the people using it. A hatch in the floor does the same job
in one tile.

### 1b. And a fifth: one thing per tile is not one thing per screen

The rule above stops two things standing on the same tile. It says nothing
about one thing standing *in front of* another, and in this projection those
are different questions. A sprite at (a, b) that is `n` pixels tall hides the
whole diagonal **x − y = a − b** above it, for `n/8` tiles of depth. A 54px
pier stands on one tile and paints over three tiles of room.

The first screen-space audit of the second layout found a chest **100% hidden**
behind a curtain, a crate 93% behind Osk, and Tam 77% behind a pier. So:

- **Column.** Nothing worth looking at goes in a pier's column within about
  seven tiles of screen-depth above it. For the four piers that rules out ten
  tiles in the whole room, so it is cheap to keep.
- **Depth.** Two big props in a narrow aisle need **three** tiles of x+y
  between them, not one. Adjacent is what buried the chest.
- **People are props too.** Somebody standing one tile down-screen of a
  brazier hides the brazier.

Checked by `cover.js`, which draws the room, records every `drawImage`, and
reports every pair where the nearer sprite eats the further one. What is left
is one bedroll 21% behind a pier shaft, which is what a church aisle looks
like.

And the one tall thing standing in open floor — the pier — **fades when it
crosses the player**, on a screen-space test (`pierAlpha`), because the
world-distance `occlusionAlpha` cannot reach four tiles.

---

## 2. The budget

192 tiles. Everything below is counted, not estimated.

| | tiles |
|---|---|
| North and west walls (full height) | 27 |
| South and east kerb | 26 |
| Piers | 4 |
| Furniture and fittings | 25 |
| **Floor left to walk on** | **110** |

Verified in the build, not by eye: **no overlaps, all 110 walkable tiles
reachable from the door, every usable fitting reachable, nobody standing in a
wall, and nothing significantly hidden behind anything else.**
The crypt is 10 × 8 — it is under the chancel, so it is a fraction of the
church — with 34 free tiles and 14 props.

---

## 3. The room

```
      x0  1  2  3  4  5  6  7  8  9 10 11
 y0    ####################################   north wall
 y1    #  HA .  ca .  MAP TBL .  ca .   |     hatch · candles · map table
 y2    #  .  .  .  .  .  .  IVAR .  ca  |     medbay candles
 y3    #  .  .  .  .  .  .  .  tb co    |     medbay
 y4    #  .  .  .  .  .  .  .  .  .  .  |
 y5    #  BENCH .  PR .  .  .  PR ADE co|     Bo's bench · piers
 y6    #  .  .  .  BO .  TAM .  .  .  sa|
 y7    #  cu cr .  .  .  .  .  .  .  .  |     sleeping bays begin
 y8    #  .  .  .  BRZ .  .  .  .  HAL he|    hearth
 y9    #  bd .  .  .  .  .  .  .  .  .  |
 y10   #  .  .  PR .  .  .  .  PR tb .  |
 y11   #  bd sa .  PEW .  .  PEW .  .  cr|
 y12   #  .  .  .  .  .  .  .  .  st .  |
 y13   #  bd ch .  OSK .  .  .  VES .  ch|
 y14   #  .  .  .  .  .  .  .  .  .  .  |
 y15   ==========  DOOR  ====================  kerb, with the west door
```

North strip is the chancel: the map table on the altar, the crypt hatch in its
own corner with nothing beside it — it is the biggest sprite in the building
and anything next to it stands on it. West side is Bo's bench, then the
sleeping bays on straw with the walkway at x=2 kept open, then the store. East
side is the medbay then the hearth. The middle is floor — four piers, two
braziers, two pews, and otherwise room to walk.

**The crypt** (10 × 8): the hatch comes down in the same corner it goes down
from — but from *underneath* it is not a hatch at all. Standing below a floor
you do not see a trapdoor lying in the ground, you see **the opening above you
and a ladder up to it**, so that is what is drawn: a lit rectangle at ceiling
height with the church's firelight coming through, and a short ladder leaning
north to reach it. Short on purpose — a crypt is a duck-your-head room, and at
full height the ladder climbed out through the wall and the lit hole floated in
the black above the building.

Nothing grows under a church, so what is down there is a store, not a farm: the
cistern, **two vats of roof-water and two stacks of hay**, preserve racks, the
padlocked strongbox, and two chests — one of tech and scrap, one of beef MREs.

---

## 4. Chests

Four, and the point is which ones you may open.

| Where | Contents | Rule |
|---|---|---|
| West aisle, by the bays | scrap and a snack | free — junk nobody claimed |
| By the door, east side | scrap | free |
| Crypt | tech and scrap | free, and it should feel like taking |
| Crypt, by the preserves | a beef MRE | free |
| Crypt strongbox | the good stuff | locked. Later. |

---

## 5. What has to be built in the engine

Honest list, worst first.

1. **Multiple NPCs.** Today there is exactly one: `const npc = {...}` in
   `js/entities.js`, one position, one dialogue path, one `Trade` panel, and
   the interaction code in `game.js` names it directly. This has to become an
   `npcs[]` array with per-entry sprite variant, home position, idle behaviour,
   dialogue, and optional trade stock. **This is the biggest single piece of
   work in the whole plan** and everything else waits on it.
2. ~~**Per-trader stock.**~~ **Done.** `Trade` carries `{who, stock}` and the
   panel draws whatever list it is handed — the rows, the prices and the
   sold-out state all come off the stock. A trader is an entry in `STOCK` and
   a `stock:` key on the folk record; there is no UI work in adding one.
   Tam has the first one. Halden and Bo just need lists writing.
3. **Interior areas.** Two `Areas` entries, their build functions, exits both
   ways, and a floor/wall tileset that is not the street set: flagstones, worn
   flagstones, timber, straw, crypt brick.
4. **Containers.** New prop type, open state, contents, save.
5. **The map table.** One interaction that fills the Fringe fog and sets a
   one-shot flag. Cheap, and the best value in the list.
6. **Respawn re-anchor.** Sleeping writes respawn position *and area*; the
   respawn code currently assumes the junkyard.
7. **Med station.** Heal to full for a cost. Trivial once trade is per-NPC.
8. **Save migration.** New area state, new flags, new respawn area — all of it
   has to merge onto old saves and never discard (`js/save.js`, rule 6).

---

## 6. Art needed

Braziers · candle banks · hay · bedroll · blanket line · tarpaulin curtain ·
crate and sack stacks · drum stove with flue · cooking pot · cots · surgical
drape · bottle table · vice and bench · **the half-stripped drone** · tool wall
· map table · chalkboard · pews whole and broken · font · altar · rope barrier ·
crypt: cistern and tap, jerricans, **hay bales**, **water vats**, preserve
racks, strongbox and grille, stone coffins.

All of it under the same rules as the outside: built in tile space, integer
fills under about ten pixels, nothing axis-aligned that lies on the floor.

---

## 7. Build order

Each phase ends somewhere it can be looked at.

- **A — the shell.** Both areas, floors, walls, piers, doors both ways,
  lighting. Empty. You can walk in, walk round, walk out. *Verify: no leaks
  through the walls, exits work both directions, save survives a reload.*
- **B — the people.** The `npcs[]` refactor, then six NPCs standing in the
  right places, talking. No trade yet.
- **C — the services.** Per-trader stock, Halden and Bo trading, Ade healing,
  the sleeping bay re-anchoring.
- **D — the payoffs.** The map table, the crypt, the chests.
- **E — the room.** The drone vignette, ambience, washing lines, the tally on
  the pier, all the things that are only there to be looked at.

---

## 8. Open questions for Laurens

1. **Is the camp safe forever?** Or does something come for it later — which
   changes how much you should be allowed to invest in it.
2. **Currency.** Scrap as money, or barter per item like Marek does now?
3. **The strongbox.** Quest lock, or a tool you find later?
4. **Sleeping.** Re-anchor only, or does it heal and move time on?
5. **Q2.** This plan gives Ivar the mission but does not write it. What is it?
