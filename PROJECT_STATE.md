# CORE SHUTDOWN — project state

**Updated:** 2026-08-20 · **Live:** https://jolliusblecheimer.github.io/Core-Shutdown/
**Repo:** https://github.com/jolliusblecheimer/Core-Shutdown (public)
**Boss arena:** https://jolliusblecheimer.github.io/Core-Shutdown/arena.html

---

## What exists and works

### Engine
- Vanilla JS + Canvas, no build step. Two canvases: low-res pixel world
  (320×180, scaled) + high-res UI overlay for crisp text.
- **Area system** — a registry of authored areas (`Areas` in `map.js`); the live
  map arrays are swapped on transition. Fade out → rebuild → fade in.
- **Open-world rendering** — visible tile range derived from the camera; props
  and decals in 8-tile spatial buckets. The 200×150 Fringe runs at ~0.7ms/frame.
- **Save v3** with migration from v1/v2, per-area world state, fog of war,
  and a separate scratch key under `window.TEST_MODE`.
- **Milestone back-payments.** A run that passed a stage before we wrote the
  item it gives is handed it on load — declared in `MILESTONE_GRANTS`
  (`js/items.js`), settled by `grantMilestoneItems()`, and written to a ledger
  in the save so each one happens exactly once. Unique keepables only; never
  consumables, or every update would refund ammo.
- Sound: fully synthesized SFX (`js/audio.js`) + procedural ambient drone,
  wind and machine accents. `O` toggles ambience.
- HD-2D post pass: colour grade + tilt-shift bands, god rays, dust, AO.

### Content — Area 1: THE JUNKYARD (32×32, complete)
The tutorial. Wake with nothing → find the metal pipe → fight Scrappers →
loot wrecks → meet Marek in the shack → mission (5 scrap) → he gives the
scrap pistol + the gate key → trade (snacks, ammo, piercing knife for 2 tech)
→ unlock the gate → **THE COMPACTOR** ambush → gate opens to the city.

**Two Scrappers patrol the yard at once** (`SCRAPPER_COUNT`), each on its own
life/respawn timer and spawning at least 5 tiles apart. Wreck loot pays a
low-quality tech component on a 1-in-5 roll with a **pity floor**: the sixth
dry wreck in a row always pays, and any drop resets the counter. Both the kill
tally and the pity counter survive a save.

Systems shown here: **stealth that actually works** — detection meters, crouch
(Shift), a 120° vision cone with a small all-round bubble, and a line-of-sight
test, so a trash mountain is real cover and breaking sight breaks a chase.
Each machine throws a cold patch of light where it is looking, so the cone can
be read. Patrols path heap-to-heap through a hub near the shack, 12s memory,
explosive barrels, melee/gun with scroll-wheel switching, **the pack** (I),
thought bubbles, staged freeze-frame tutorials, passive regen.

**THE PACK** is a BotW-style grid, not a list: 26px tiles in a 5x4 grid, one
description panel that explains whatever the cursor is on, counts badged on the
tile, and **nothing you have none of** — an item spent to zero disappears, and
a tab with nothing left in it disappears with it. One cursor, driven by the
arrows *or* the mouse. `Q`/`R`, a click or the wheel change tab; `E` equips or
eats. What an item IS lives in `js/items.js`; `js/game.js` only lays it out.
Design and the built-vs-planned diff in `design/inventory-botw.md`.

### Content — THE COMPACTOR (first boss, complete)
Hidden in the junk until you unlock the gate; four-legged crawler, one big
glowing eye (2× damage), armoured front plow (bullets/pipe clank, knife
pierces at half), charge-into-wall stagger (1.5×), claw slash, three phases
with cutscenes: rage zoom → instant charge at 66%; trash-absorb **full heal**
→ repeating energy nova at 33%. 200 HP. Drops tech + scrap, opens the gate.

### Content — Area 2: THE FRINGE (200×150, first pass)
One continuous open city, no loading. Hand-drawn street network (gate road,
spine, two cross streets, mid street, south link) with procedural building
fill. Street tileset (road + lane paint, kerbed pavement, verge, forecourt),
streetlights (20 of 60 lit and casting light), traffic lights, bus stops,
dumpsters, hydrants, postboxes, queued traffic, a slewed bus.
**Buildings are single pre-rendered volumes** — 9 styles (house, brick, shop,
shutter, office, school, church, hotel, bank) with faces + roof sharing real
corners. Landmarks: Aldergrove Primary, The Regent Hotel, City & County Bank,
and a proper gas station (canopy on six pillars, kerbed islands, detonating
pumps, pylon totem).

### Content — ST MARTIN'S, the cathedral (exterior, complete)
The landmark the whole sign trail leads to, at (50, 52), 12×16 tiles, building
kind `C`. Not a box with a steeple: a composite volume built in tile space and
projected once (`Sprites.makeCathedral`) — nave with a steep slated roof, aisles
either side under lean-tos, twin west towers, a buttressed east flank, and the
lead-blue fleche over the crossing. The west front faces SOUTH, at the parvis
and the last sign of the trail: portal in four recessed orders with oak doors
and strap hinges, two flanking doors, stained lancets, a traceried rose, saints
in the gable, cross on the apex. Towers carry blind arcades, saints, a stopped
clock on each face, louvred belfries, an openwork parapet and pinnacles.
Paved parvis across the front and a strip down each flank.
The churchyard (railings, graves, trees) is not built.
Handmade sign trail (planks, bedsheet banners, painted road arrows) leading
**only** to the shelter.

### THE MAP (`M`) — one world space, zoom and fast travel
`M` opens framed on the area you are in and **scrolls out continuously to the
whole ring** — every area is placed at a `world` offset in one tile coordinate
space and drawn at true relative size, so the yard is 32×32 against the city's
200×150 and looks it. No view modes: framing an area and framing the world is
the same draw call with a smaller number. Areas render from cached fog
thumbnails taken as you leave them. **Places** come off one `POIS` table —
camps, gates, landmarks and the sign trail, each a fixed-size 7px icon that
never scales, with what is drawn thinning out as you pull back. Click one for a
panel; on a camp you have found, `E` **fast travels** there from anywhere,
free, blocked only while something is hunting you. **One objective source**
(`currentObjective()`) feeds the HUD line, the minimap dot and the map dot, and
green now means exactly one thing — signs and people are not green any more.
The minimap **dims unexplored ground** instead of showing it, so both maps
finally agree about what the traveller knows.

### Content — THE ROADBLOCKS + THE BANDITS (first pass)
The first **people** you fight, and the first gate on a destination.

The Fringe was streets over open lots, so you could reach St Martin's across
waste ground without touching a road — measured: cutting the east cross at both
junctions still left the church reachable by 46/46 forecourt tiles. So the east
cross between the spine and the mid street was made a **proper street**:
continuous frontage at y 69 and y 81 from x 36–88 (terraces where a building
fits, stone yard wall where it does not), with **one** opening — the church
gate, x 50–61, flanked by stone piers. The corridor's two ends are crossroads,
and each now holds a **bandit roadblock**: west at x 38 (spine junction, chicane
y 74–75), east at x 86 (mid-street junction, chicane y 76–77). The signed
shelter trail walks you straight into the east one.

Verified by flood fill from the yard gate: either chicane open → 24/24 forecourt
tiles; **both sealed → 0/24**; nothing else in the city cut off.

Four bandits per block — **two knives, one scrap pistol, one rifle**. One sees
you and *shouts*; the whole block turns at once. The barricade blocks line of
sight both ways, so the gap is the only place they can see you from, and that
makes the gap the fight. The rifle telegraphs with a dashed aim line and a red
blink; break the line and the shot is thrown away. Dead raiders stay dead,
persisted by block + post. Full design in `design/bandits.md`, the exact map in
`design/city-map.md`.

New iso pieces, all built in face space with x/y variants: sheet-steel
barricade, tall firing screen, sandbag stack, concrete barrier, razor coil,
stone wall. Upright: burning oil drum, bandit flag pole.

### Content — CANDLELIGHT (interior, second layout)
Two areas behind the west door, both built to the footprint of the building
outside. **`candlelight`** is **12×16 — the same tiles as the volume on the
street** — with 107 of its 192 tiles left to walk on: flagstone, four piers,
**full-height walls on the north and west only and a ten-pixel kerb on the two
sides the camera looks over**, and the camp in it — braziers and votive stands,
sleeping bays on straw, a drum stove, a medbay of two cots, a bench with a
half-stripped Hunter-Killer whose eye is still lit, pews part broken up for
timber, a store nobody may open, and a one-tile hatch down to the crypt.
**`crypt`** is 10×8 under the chancel: brick vaulting, bricked-up burial
niches, a cistern fed off the roof, two vats of roof-water you can drink from,
two stacks of hay, a ladder up to the lit opening in its ceiling (the same
hole as the hatch above, drawn the way it looks from below), preserves, a
padlocked strongbox, and two chests — one of
tech and scrap, one of beef MREs. Nothing grows under a church: it is the
store, not a farm.
The builder refuses to put two things on one tile, and the layout is checked
three ways: no shared tiles, every tile reachable from the door, and — new —
**no sprite significantly hidden behind another on screen**, which is a
different question in this projection and is what a tile check cannot see.
The pier fades when it crosses the player.
**Seven survivors** — Vesna, Osk, Bo, Sister Ade, Halden, Ivar, Tam — each with
their own sprite and three lines, cycled one per talk. They are a `folk` list
beside Marek rather than a rewrite of him.
**Tam trades.** The counter takes its rows from whoever opened it now instead
of having Marek's three items written into the drawing code, so Tam sells rifle
rounds, a beef MRE, a chicken MRE and a low-quality tech part, and the next
trader is a list with no UI work. MREs are food: `H` eats the worst thing that
still helps, so the good ration survives until it matters.
**The map table** on the old altar: reading it fills in the whole Fringe map
(3350 fog cells), once, and it is saved. Getting close enough to read it used
to be nearly impossible — every interaction reach in the game was silently
clamped to 1.1 tiles and measured to a prop's anchor corner. Fixed.

---

## Outstanding — next session starts here

1. **Long props are still flat rectangles** — bus stop, dumpster, awning don't
   lie along the road. Rebuild them in face space like buildings, not by
   shearing. *(Laurens' item 4, partially done: facade/column heights fixed.)*
   When each one becomes a volume its **hitbox has to move with it** — anchor
   the sprite on its footprint centre, give the prop a `foot`, and let
   `clearPropSolid` free it. See the new section in `design/art-style.md`;
   the cars and the bus have been through this, these have not.
2. **HHDs — BUILT** (`js/droids.js`, 2026-08-20). Eight squads hold the street
   junctions between the two roadblocks: Bailiff (baton, closes and flushes),
   Marshal (burst rifle, holds its distance and telegraphs), and one Magistrate
   deep north whose frontal shield takes zero damage and is meant to read as
   *come back later*. Additive rather than a refactor of `scrapper` — the yard's
   tutorial machine keeps its quirks and a live save cannot regress. They ask
   the same `canSpot`/`losClear` the whole world asks, so hiding means the same
   thing everywhere. **Left:** the SCOUT is designed but deliberately not
   deployed (its flare wakes the squad — held pending your call on whether the
   alarm belongs in this phase), plus a balance pass against pipe/knife/~18
   rounds.
3. **Candlelight — the rest of it.** The camp is IN (see below), and so is
   per-trader stock. Still to do from `design/candlelight.md`: stock lists for
   Halden and Bo, Ade healing for a price, the sleeping bay re-anchoring
   respawn, the tower stair, the strongbox, and Q2 itself. Also the churchyard
   outside (railings, gravestones, trees, a lych gate) and lit windows now that
   somebody does live there.
4. Interiors (enterable shops/houses, roof fade).
5. Field 12 + the drone crash (Q3) and the Underpass to Ring 4.
6. Open questions never answered: day/night.
   *(Answered 2026-08-19: the Compactor drops a **badly damaged rifle**, repaired
   by a droid-dismantler at Candlelight — HHDs do NOT drop rifles. See
   `design/hhd-squads.md`.)*
7. `design/cathedral.md` is built except its phase-2 churchyard (headstones, a
   low wall with railings, trees, a lych gate).
8. **Still open in `design/hhd-squads.md`:** whether the Scout's flare belongs
   in this phase at all (it is built and held back), whether a stealth kill on
   one before it flares is a thing, and whether cleared squads respawn.

## Known risks
- The cathedral is ~250 px tall and the viewport is 180. From the parvis you
  get the doors, the rose and the foot of a tower; the tower tops and the
  fleche sit above the screen edge unless you are up-screen of the building.
  That is inherent to the projection, not a bug — but if it should read whole
  from the front it has to come down about a third.
- Compactor at 200 HP + full heal ≈ 334 damage budget; fine in the arena with
  60 rounds, possibly brutal at the gate with ~18. Tune when playtested.
- Bandit damage is tuned against a bot that never dodges, shoots or breaks
  line of sight. A pipe-only player holding the chicane died at 14s. Wants a
  real playtest — the numbers live in `BANDIT_ROLES` in `js/entities.js`.
- The Fringe's only enemies are the two roadblocks; the streets between them
  are still empty, so the danger gradient exists at the gates and nowhere else.
