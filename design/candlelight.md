# CANDLELIGHT — the inside of St Martin's

**Status:** phases A and B built and in the game, plus the map table.
Written 2026-08-19, approved the same day, first build the same day.
**Built:** both areas, the shell, the arcade, every fitting, all seven people
talking, the chests, and the map table that hands you the ring.
**Not built yet:** trading (Halden, Bo), Ade healing, the sleeping bay
re-anchoring respawn, the tower stair, the strongbox. Section 5 items 2, 6, 7.

A cathedral is not the point. **A cathedral that people are living in** is the
point. Everything below is chosen so that the first ten seconds inside say:
this place is cold stone that somebody has made warm, and it took work.

The name has to pay off the moment the door shuts. You come out of a grey dead
street into a room with forty flames in it — braziers in the aisle, candles
banked on the old votive stands, a stove glowing through its grate, lamps
strung on wire down the nave. It is the only warm room in the ring.

---

## 1. Shape of it

Two new areas, because interiors are areas in this engine (`Areas` in
`js/map.js`), and one door each way.

| Area id | Size | What |
|---|---|---|
| `candlelight` | 28 × 40 | The church floor: nave, both aisles, crossing, chancel, two tower bases |
| `crypt` | 18 × 14 | Under the chancel. Water, food, the strongbox |

The inside is bigger than the 12 × 16 footprint outside. That is normal and
nobody notices; what they notice is a cathedral that feels like a corridor.

**Entry.** The west door at the south end. `exits` on the fringe side sits on
the parvis tiles in front of the portal; coming back out puts the player at
(56, 69), facing the road. Same pattern as the junkyard gate.

```
                 N  (chancel end)
   +----------------------------------+
   |   [7] MAP TABLE · the old altar  |   chancel, three steps up
   |   [6] MEDBAY      [8] STAIR DOWN |   lady chapel / crypt stair
   +---+                          +---+
   |   |  [5] BENCH · the drone   |   |   transepts
   +---+                          +---+
   |  [4]  HEARTH & TRADE             |   north aisle
   |                                  |
   |         [1] THE NAVE             |   the common floor
   |                                  |
   |  [3]  SLEEPING BAYS              |   south aisle, curtained
   |                                  |
   +---+                          +---+
   |[2]|   WEST DOOR  ↓           |[2]|   tower bases: store · stair up
   +---+--------------------------+---+
                 S  (the parvis)
```

Arcade piers every 3 tiles down both sides — solid, and they are what makes the
inside read as a cathedral rather than a hall. Between them, the camp.

---

## 2. The nine places

**[1] The nave — the common floor.**
Pews broken up and re-used: some still in rows near the door, most cannibalised
into partitions, bed frames and firewood. Washing on lines between the piers.
Two braziers burning. A chalked tally on a pier: days since the gate held.
This is circulation space — nothing to interact with, everything to look at.

**[2] The two tower bases.** South-west is the **store**: crates, sacks, the
camp's own supplies, and a survivor sitting on a stool who will politely tell
you no. South-east is the **stair up**, roped off — the bell chamber and the
lookout. Locked in this pass, and an obvious door for later (a sniper's nest, a
vantage over the Fringe, a place to see the Core from).

**[3] Sleeping bays — south aisle.** Between each pair of piers, a bay:
straw over the flagstones, army blankets, a bedroll, a tarpaulin hung on wire
for a door, someone's boots. Four bays occupied, personal and specific — a
child's drawing pinned to the stone, a dead man's coat still folded. **One bay
is empty**, and once it is yours it is the **respawn re-anchor**: sleeping sets
`player.respawnX/Y` and the respawn area to `candlelight`. That is the single
most valuable thing the camp gives you and it should be earned, not handed over.

**[4] The hearth — north aisle, middle.** A stove built from an oil drum with a
flue punched through a boarded window. A pot on it. Crates as a counter.
**Halden trades here:** food, water, rounds. This is the first trader and the
one you will come back to.

**[5] The bench — south transept.** **Bo has a Hunter-Killer drone on the
bench, half stripped.** Casing off, ribs open, one arm in a vice, its eye still
glowing amber on a wire because she has not cut the last cell out yet. That
glow is the game's damage language showing up somewhere safe for the first
time — the thing you shoot at, sitting on a table with its lid off. Tools, a
tray of pulled parts, a wall of salvaged plate. Bo trades **parts and gear**
for tech, and the bench is where weapon upgrades will live when they exist.

**[6] The medbay — north transept / lady chapel.** Curtained off with surgical
drape. Two cots, one occupied by someone who is not going to get up. A table of
bottles, a basin, a lamp. **Sister Ade heals you to full** for a price and
sells bandages. Keep it grim: this is a chapel with a bucket in it, not a
hospital.

**[7] The map table — the chancel, on the old altar.** The centrepiece. A
street map of the Fringe pinned out over the altar cloth, marked up in three
different hands: routes that work, routes that don't, crossings with a cross
through them, the gas station circled, the junkyard gate marked GATE — HELD.
**Interacting with it fills in your map of the Fringe.** Mechanically this is
`exploredByArea['fringe'].fill(1)` plus a flag so it only happens once, a beat
of animation, and a line: *"Somebody walked all of this so you would not have
to."* It is the biggest single reward in the building and it costs nothing but
finding the place.

**[8] The crypt stair — north-east corner.** Down to the cellar.

**[9] The crypt (`crypt` area).** Cold, low, barrel-vaulted, lit by three
lamps and nothing else.
- **Water:** the roof drains into a cistern in the old font sump. A tap, a
  queue of jerricans, a tally chalked on the wall.
- **Food:** grow beds in the burial niches under scavenged UV strips —
  mushrooms, potatoes, something leggy and desperate. Racks of preserves.
- **Valuables:** a strongbox behind a grille, padlocked. Not openable in this
  pass. It is a promise.
- The stone coffins are still there and nobody talks about them.

---

## 3. The people

Six. Enough to feel like a community, few enough that each can be a person.
**None of them learn the player's name** — traveller, stranger, or nothing.

| Name | Where | Trades | What they are |
|---|---|---|---|
| **Vesna** | at the door | no | Keeps the door. First face you see. Gives you the rules of the house in four lines and does not repeat them. |
| **Halden** | the hearth | food, water, ammo | Old, unhurried, feeds everyone. Talks about the city before. |
| **Bo** | the bench | parts, gear | Mechanic. Covered in it. Will not look up from the drone while she talks to you. |
| **Sister Ade** | the medbay | heals, bandages | Was not a nun. The name stuck because of the building. |
| **Ivar** | the map table | no | Runs the place, or the nearest thing to it. Gives Q2. |
| **Tam** | anywhere | no | A kid. Follows you a few paces. Says things the adults will not. Rumour hooks for later quests. |

Two of the six trade goods, one trades gear, one sells healing. That is enough
economy for the ring without turning the camp into a shop menu.

---

## 4. Chests

Four containers, and **the point is which ones you may open.**

| Where | Contents | Rule |
|---|---|---|
| Nave, under a broken pew | scrap, a few rounds | free — junk nobody claimed |
| Sleeping bay, the dead man's | a keepsake, snack bars | free, and it should feel bad |
| Store room (tower base) | the camp's supplies | **watched.** Opening it in front of the man on the stool costs you |
| Crypt strongbox | the good stuff | locked. Later. |

A `chest` prop with an open/closed state saved per area, contents rolled once
and remembered. Opening is `E`, same prompt system as everything else.

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
