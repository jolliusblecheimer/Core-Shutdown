# CANDLELIGHT — the inside of St Martin's

**Status:** built, second layout. The first one was thrown away.
**Working:** both areas, the shell, the arcade, every fitting, seven people
talking, the chests, and the map table that hands you the ring.
**Not built:** trading (Halden, Bo), Ade healing, the sleeping bay re-anchoring
respawn, the strongbox, Q2. Section 5 items 2, 6, 7.

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

**3. One thing per tile, and the room proves it.** The builder's `put()`
refuses to stack anything and warns if the layout tries. The first pass had a
bench, a shelf and a pier in the same corner of the screen.

And a fourth, learned from the stair: **anything that has to be big to read is
the wrong object.** A stair legible at this scale ate a quarter of the room and
stood taller than the people using it. A hatch in the floor does the same job
in one tile.

---

## 2. The budget

192 tiles. Everything below is counted, not estimated.

| | tiles |
|---|---|
| North and west walls (full height) | 27 |
| South and east kerb | 26 |
| Piers | 4 |
| Furniture and fittings | 29 |
| **Floor left to walk on** | **107** |

Verified in the build, not by eye: **no overlaps, all 107 walkable tiles reachable
from the door, every usable fitting reachable, nobody standing in a wall.**
The crypt is 10 × 8 — it is under the chancel, so it is a fraction of the
church — with 35 free tiles and 12 props.

---

## 3. The room

```
      x0  1  2  3  4  5  6  7  8  9 10 11
 y0    ####################################   north wall
 y1    #  HA .  ca .  MAP TBL .  ca .   |     hatch · candles · map table
 y2    #  .  .  .  .  IVAR .  .  .  ca  |     medbay candles
 y3    #  BENCH .  BO .  .  .  .  TB co |     Bo's bench · medbay
 y4    #  sh .  .  .  .  .  .  .  .  .  |
 y5    #  .  .  PR .  .  .  .  PR ADE co|     piers
 y6    #  ch .  .  .  .  .  .  .  .  sa |
 y7    #  bd cu .  .  BRZ .  .  .  .  . |     sleeping bays begin
 y8    #  .  .  .  .  .  TAM .  .  HAL he|    hearth
 y9    #  bd .  .  .  .  .  .  .  tb .  |
 y10   #  .  .  PR .  .  .  .  PR .  .  |
 y11   #  bd sa .  .  .  BRZ .  .  .  cr|
 y12   #  .  .  .  .  .  .  .  .  st .  |
 y13   #  cr ca .  PEW .  .  PEW .  ch  |
 y14   #  sa OSK .  VESNA .  .  .  .  . |
 y15   ==========  DOOR  ====================  kerb, with the west door
```

North strip is the chancel: the map table on the altar, the crypt hatch in the
corner, candles. West side is Bo's bench then the sleeping bays on straw, then
the store by the door. East side is the medbay then the hearth. The middle is
floor — four piers, two braziers, two pews, and otherwise room to walk.

**The crypt** (10 × 8): the hatch comes down in the same corner it goes down
from. Cistern, two grow beds under lamp strips, preserves, the padlocked
strongbox, one chest.

---

## 4. Chests

Four, and the point is which ones you may open.

| Where | Contents | Rule |
|---|---|---|
| West aisle, by the bays | scrap and a snack | free — junk nobody claimed |
| By the door, east side | scrap | free |
| Crypt | tech and scrap | free, and it should feel like taking |
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
2. **Per-trader stock.** `Trade` is one global panel with a fixed list.
   It needs to take a stock list from whichever NPC opened it.
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
crypt: cistern and tap, jerricans, grow beds with lamp strips, preserve racks,
strongbox and grille, stone coffins.

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
