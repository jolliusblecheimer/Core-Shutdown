# THE FRINGE, REDESIGNED — the plan

Written 2026-09-07 in answer to *"redesign the whole map, put much work and
thought in it."*

This is a plan, not a build. Rule 1: the plan first, then approval, then code.

Everything below the diagnosis is proposal. Everything in the diagnosis is
measured — `shape.js`, `empty.js`, `openness.js`, `holes.js`, `bench.js` in the
scratchpad, run against the live build at f7b8cbf.

---

## 1. THE DIAGNOSIS — what is actually wrong

I assumed the Fringe was too open. **It is not**, and the measurement said so
before a line of this was written:

| distance to the nearest wall | junkyard | field12 | prologue | **fringe** |
|---|---|---|---|---|
| mean | 1.67 | 3.48 | 1.75 | **3.05** |
| max | 4 | 12 | 5 | **11** |
| % of ground more than 8 tiles from a wall | 0 | 4.4 | 0 | **0.8** |

The Fringe is *tighter* than Field 12. The streets are the right width, the
blocks are the right size, the geometry is sound. That hypothesis is dead and
this plan does not touch the street network.

The problem is what stands in it.

### 1.1 The Fringe is empty

| | junkyard | field12 | prologue | **fringe** |
|---|---|---|---|---|
| walkable tiles | 699 | 5,724 | 413 | **16,183** |
| objects (props that are not the buildings) | 238 | 688 | 58 | **424** |
| **objects per 100 walkable** | **34** | **12** | **14** | **2.6** |
| ground more than 5 tiles from any object | 0% | 18% | 19% | **42%** |

And the number that matters most, because it is what the player actually
experiences — **objects within 12 tiles, which is about one screenful:**

| | junkyard | field12 | prologue | **fringe** |
|---|---|---|---|---|
| worst spot on the map | 43 | 3 | 4 | **0** |
| 10th percentile | 58 | 8 | 5 | **1** |
| **median** | **79** | **24** | **36** | **7** |
| best spot | 123 | 86 | 53 | 47 |

**The median screenful of the Fringe holds seven things. The Junkyard's holds
seventy-nine.** One tenth of the Fringe is a screen with one object on it. The
emptiest spot — 178,31 — has nothing at all within twelve tiles: a retaining
wall, a strip of road, some weeds, and that is the entire frame.

Same renderer, same tile size, same art. Screenshots `h1-worst-178-31.png` and
`h6-junkyard-16-16.png` are the argument.

### 1.2 It is monotonous

Objects per 10×10 cell, over the whole map: **122 cells hold 45+ walkable tiles
and one object or none. That is 9,708 tiles — 60% of everything you can walk
on.**

And the 25×25 density grid has no peaks. Every cell is 300–570 walkable with
3–33 props. Nothing stands out, so nothing is a landmark, so there is nothing to
navigate by and nowhere you would rather go. A map where every block is the same
is a map with no shape.

### 1.3 There is almost nothing to go to

| | junkyard | field12 | **fringe** |
|---|---|---|---|
| destinations (items, exits, usables, chests) | 6 | 16 | **9** |
| **walkable tiles per destination** | **117** | **358** | **1,798** |
| enterable buildings | — | 4 | **0** |
| POIs on the traveller map | 1 | 2 | **2** |

Eighty-two buildings and **not one of them opens.** Two named places in thirty
thousand tiles.

### 1.4 The east half is the hollow half — and it is the front door

The dead ground is not spread evenly. Everything west of the mid street has the
spine, the church, the west lane and the fire. Everything east of it has almost
nothing. The five emptiest sample points are 178,31 · 150,30 · 140,55 · 110,95 ·
70,130 — four of them east.

The player enters at the yard gate, **196,120 — the far east corner.**

| walk | BFS steps | ≈ seconds at SPEED 4.0 |
|---|---|---|
| yard gate → church door | 191 | ~40 s |
| yard gate → mid street seam | 206 | ~43 s |
| yard gate → west lane top | 264 | ~55 s |
| yard gate → spine north seam | 268 | ~56 s |
| gate → the furthest tile (2,30) | 282 | ~59 s |

**The first minute of the open city is its emptiest ground.** That is the single
worst fact in this document, and fixing it is worth more than everything else
here put together.

---

## 2. WHAT THIS PLAN DOES NOT DO

Stated first, because ruling things out is most of the design.

| | Why not |
|---|---|
| **Shrink the map** | Every coordinate in the game moves: the school mast at 119,61, St Martin's, the roadblocks, the four exits, the quest props, the items. Saves key world objects by position (rule 6) and a live run would wake up inside a wall or lose a chest. And it is the wrong fix — the Fringe *should* feel like a ring you are small in |
| **Move the street network** | It measured sound (§1). Moving it re-rolls every building and moves every fight |
| **Re-lay the 82 existing buildings** | Same reason, and it is not needed: the gaps between them are where the emptiness is |
| **Touch the burnt west, the fire, the edges, the underpass or the airfield** | Built this month, measured, approved and live |
| **Add a new area** | The problem is not that there is too little map |

**This redesign is additive.** Nothing that exists moves. That is what makes it
safe to do at this scale, and it is the difference between a redesign and a
rewrite.

---

## 3. THE LAW — the RNG rule, restated because it has bitten three times

`buildFringe` draws from one `mulberry32(20260817)` in a fixed order. **A new
pass inserted mid-build re-rolls everything after it.** That has gone wrong three
times in this project: the Grey Run dressing sealed St Martin's inside a block;
the fire pass put two office blocks inside itself; opening the tunnel dropped a
block across its mouth.

> **Every pass this plan adds runs at the END of `buildFringe`, on its own named
> seed, and reads the map rather than the shared `rng`.**

That is not a style note. It is the reason the existing 82 buildings, 2
roadblocks, 14 signs, 3 items, 4 exits and every hardcoded quest coordinate stay
exactly where they are — which is what protects live saves.

**Phase 0 is a test that proves it**, and it is written before any content.

---

## 4. THE SHAPE — seven districts

Keep the road skeleton. Give each cell between the roads a **fabric** (what the
ground and the buildings are), a **landmark** (something you can see from far
enough away to steer by), and a **reason** (something you would go there for).

Three levels of space today: arterial, street, lot. This adds the missing
fourth — **the alley** — and that is where most of the new interest lives.

```
   x0      15   30            92           150      165   196
 y14  ┌─────┬────┬─────────────┬────────────┬─────────┐
      │     │    │             │            │    B    │   B  RETAIL PARK
 y36  │  G  │ G  ├─────────────┼────────────┤ (the    │      the deadest ground
      │     │    │      D      │     C      │  fuel   │   C  THE TERRACES
 y75  │ THE │ W  ├─────────────┼────────────┤ canopy) │      houses + BACK ALLEYS
      │ FIRE│ E  │      D      │     E      │         │   D  THE CIVIC BLOCK
      │     │ S  │  (church)   │  (gasholder)│        │      church + churchyard
 y120 │     │ T  ├─────────────┴────────────┴─────────┤   E  THE YARDS
      │     │    │        F  THE SOUTH BANK           │      light industry
 y140 └─────┴────┴───────────────────────────────────┬┘   F  flooded strip
                                          A  THE GATE MILE  ← you come in here
```

### A · THE GATE MILE — x150–196, y104–140
*The road everybody tried to leave by.*

Today: the player's first minute, and near-empty.

| | |
|---|---|
| Fabric | Cars nose-to-tail westbound, three lanes wide, doors open. Suitcases, prams, a mattress on a roof. Not a wreck field — a **traffic jam that never moved** |
| Landmark | **An overturned double-decker coach** lying across two lanes. You walk under it |
| Reason | It is the way in, and it is the way back to the yard. A chest in the coach |
| Why it works | Cars are cover. The two roadblock fights on the gate road get a geometry they have never had |
| Density target | 30+ objects a screen — this is the richest ground on the map, because it is the first |

### B · THE RETAIL PARK — x150–196, y36–104
*Where 178,31 is, the emptiest point measured.*

| | |
|---|---|
| Fabric | Three big-box sheds with car parks. Trolley corrals, bollard lines, painted bays, a recycling bank. Big blank volumes — cheap to draw, and `BUILD_STYLE.A` already exists for exactly this |
| Landmark | **The fuel station canopy** — a roof on legs, walk under it, fight around it |
| Reason | **Two of the sheds open.** The first enterable buildings in the Fringe |
| Why it works | Car parks are honestly open ground, and rows of parked vehicles are dense, cheap and repeating — the one place where filling by rule looks deliberate rather than scattered |

### C · THE TERRACES — x92–150, y36–75
*The structural heart of the redesign.*

| | |
|---|---|
| Fabric | Rows of small terraced houses, front gardens with low walls, and **back alleys running behind each row** |
| Landmark | **A corner pub** where the alley meets the mid street |
| Reason | The alleys are **shortcuts**. The map gets smaller as you learn it, which is the reward this map has never paid |
| Why it works | The alley is the missing scale. It gives the droids' cover system geometry it has never had, it gives the small props somewhere to be, and a shortcut is the only content that makes a 50-second walk shorter |

### D · THE CIVIC BLOCK — x30–92, y36–120
*Already half-built. Strengthen, do not replace.*

| | |
|---|---|
| Fabric | A **churchyard** around St Martin's — railings, stones, a lych path — and a civic building facing it across the east cross |
| Landmark | The church. It already works; give it a setting so it reads as the centre of something |
| Reason | Candlelight is here. Ivar, the map table, Q2 |

### E · THE YARDS — x92–150, y75–120

| | |
|---|---|
| Fabric | Lock-ups, workshops, a small scrapyard that rhymes with the Junkyard, gantries, stacked pallets, a crane |
| Landmark | **A gasholder** — a big cylindrical lattice, visible for a long way |
| Reason | Where the scrap and tech economy plausibly lives. One workshop opens |

### F · THE SOUTH BANK — x30–165, y120–140
*The strip between the gate road and the water.*

| | |
|---|---|
| Fabric | **The water has come up.** Sandbag lines, duckboards over standing water, half-sunk cars, a slipway |
| Landmark | **A beached barge** |
| Reason | A lateral route that skips the gate road's roadblocks — the second shortcut, and the one that rewards looking at the map |

### G · THE BURNT WEST — x2–30
Built, measured, live. **Untouched.**

---

## 5. WHAT GETS BUILT, AND WHAT IT COSTS

| | now | after | delta |
|---|---|---|---|
| objects | 424 | ~1,950 | **+1,500** |
| objects per 100 walkable | 2.6 | ~11.5 | Field 12's proven band |
| median objects per screen | 7 | **~25** | |
| worst screen | 0 | ≥ 8 | |
| ground >5 tiles from an object | 42% | < 20% | |
| enterable buildings | 0 | **~10** | |
| destinations | 9 | ~30 | |
| POIs on the traveller map | 2 | ~9 | one per landmark |
| walkable | 16,183 | ~16,600 | alleys add a little |

**Frame cost is the risk, and it is measurable.** Field 12 runs 13.6–14.8 ms at
12 objects per 100 walkable, and the spatial index means only what is near you
is drawn or sorted — so *local* density is the cost, not the total. Matching
Field 12's local density should land in Field 12's band. **This gets measured in
the densest new district, not in the quiet**, and if the Gate Mile at 30/screen
blows the budget it comes down before anything else ships.

1,500 objects cannot be hand-placed. Every one is generated by a **district
pass**: a rule that reads the ground, the existing buildings and the streets, and
dresses what it finds. Hand-placement is reserved for the landmarks, the
interiors and the destinations.

---

## 6. BUILD ORDER

| | Phase | Ends when | Size |
|---|---|---|---|
| **P0** | **THE FREEZE TEST** — dump every existing building, prop, sign, item, exit, roadblock and quest coordinate to a fixture; assert byte-identical after every later phase | A pass can be added and proven to have moved nothing | **S** |
| **P1** | **THE GATE MILE** — the jam, the coach, the chest. The first minute of the city | The walk in is the densest ground on the map | **M** |
| **P2** | **THE ALLEY LAYER + THE TERRACES** — the missing scale, and the first shortcut | You can cut behind the houses and come out ahead | **L** |
| **P3** | **THE RETAIL PARK** — sheds, car parks, the canopy, two interiors | 178,31 is no longer a blank screen | **M** |
| **P4** | **THE YARDS + THE SOUTH BANK** — industry, the gasholder, the flood, the barge, the second shortcut | Both lateral routes exist | **M** |
| **P5** | **THE CIVIC BLOCK** — the churchyard and what faces it | The church reads as a centre | **S** |
| **P6** | **LANDMARKS ON THE MAP** — the POI table, fast travel, the fog | Nine names on the traveller's map instead of two | **S** |

**P0–P2 is a shippable milestone** and it is where most of the felt improvement
is: the way in stops being empty, and the map acquires a scale it has never had.
P3–P6 finish it.

---

## 7. VERIFICATION

Reused as-is: `smoke`, `audit2`, `quests`, `sentry`, `f12`, `verifycut`,
`westvis`, `cost`.

New, and written in P0:

| | |
|---|---|
| **`freeze.js`** | Every pre-existing building, prop, sign, item, exit, roadblock and quest coordinate identical to the fixture. **The regression test this whole plan rests on** |
| **`density.js`** | `empty.js` per district: median objects/screen ≥ 20, worst ≥ 8, and no 10×10 cell with 45+ walkable and ≤1 object |
| **`cost.js`, extended** | Frame cost measured standing in each new district, at its densest point |
| **`shortcut.js`** | The alley and the south bank genuinely shorten a real journey — BFS with them and without |
| `audit2` | No new prop inside geometry, none hidden behind a building, nothing stacked, nothing unreachable |
| `smoke` | A v1 save walks into all of it and is not rescued anywhere new |

And rule 5: **screenshots of every district before any of it is called done**,
with the Junkyard beside them at the same zoom.

---

## 8. RISKS

| | |
|---|---|
| **Frame cost** | The one that could kill it. Mitigated by matching Field 12's proven local density, and measured per district rather than at the end |
| **The RNG rule** | Mitigated by §3 and proven by P0's freeze test |
| **Filling by rule looks like scatter** | Mitigated by giving each district a small, specific prop vocabulary — a car park is rows, a terrace is repeats, a jam is a queue. Ordered things, not confetti |
| **Alleys break the flood fill** | Every phase re-runs reachability from the gate |
| **Big art change** | Rule: **local only, no push until Laurens has seen it.** Screenshots per district, per phase |

---

## 9. THE ONE-LINE VERSION

The Fringe's geometry is fine and its content is not: **seven objects a
screenful against the Junkyard's seventy-nine, 60% of the walkable ground
holding nothing, and the player's first minute spent in the emptiest part of
it.** Keep every street and every building exactly where it is, add seven
districts with a fabric, a landmark and a reason each, add the alley scale that
is missing, and put the richest ground where the player comes in.
