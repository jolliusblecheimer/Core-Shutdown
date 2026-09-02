# CORE SHUTDOWN — project state

**Updated:** 2026-08-21 · **Live:** https://jolliusblecheimer.github.io/Core-Shutdown/
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
- **Nothing hostile is ever invisible.** The player has always shown through
  walls as a washed-out silhouette; every living enemy does now too, but only
  when it is genuinely COVERED and within eight tiles. Tall props record the
  screen rectangle they painted (`blocks()`), and the ghost pass asks whether
  this sprite's head *and* middle are behind one of them — a tile test would
  have ghosted enemies standing behind a building's far side, who are drawn
  clear above its roof and perfectly visible. Half-covered is not covered.
  The distance rule is what keeps it from being x-ray vision: an enemy two
  streets away behind a building is still an enemy you have not found.

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

**THE PACK** is a BotW-style grid, not a list: 36px tiles in a 4x3 grid, one
description panel that explains whatever the cursor is on, counts badged on the
tile, and **nothing you have none of** — an item spent to zero disappears, and
a tab with nothing left in it disappears with it. One cursor, driven by the
arrows *or* the mouse. `Q`/`R`, a click or the wheel change tab; `E` equips or
eats. What an item IS lives in `js/items.js`; `js/game.js` only lays it out.
Design and the built-vs-planned diff in `design/inventory-botw.md`.

### RELOADING — six and twelve, and the pause between them
A gun holds **6** (pistol) or **12** (rifle) and then has to be filled. Each
gun has what is in it and what you carry for it — `player.arms[gun] =
{loaded, reserve}` — and `R` moves rounds across over 1.1s / 1.6s. Reloading
early can never waste anything: a part-full gun just takes fewer rounds. It
refuses out loud when the gun is full (`ALREADY LOADED`) or the pocket is empty
(`NO ROUNDS LEFT`).
The weapon panel is **three rows, one question each**: the gun and a big loaded
count with its capacity small beside it; **one pip per round** on its own line,
sized so a drum's twenty-four fit as neatly as twelve; then, under a rule, a
LABELLED `POCKET n` and — with the burst regulator fitted — the `RMB` recharge
bar. Three quantities crammed into one row was three quantities you had to read.
Reloading replaces the pip row with a filling bar; an empty gun with rounds to
put in prints a pulsing `PRESS R` across it. The first dry click teaches it —
and the `R` that dismisses that lesson performs the reload, via
`tutShow(..., onDo)`.
You buy, find and strip loose **rounds**; only a handed-over weapon arrives
loaded (Marek's pistol, Bo's straightened rifle), via `chamber()`. Saves from
all three eras — plain `ammo` numbers, the one-day magazine pouch, and loose
rounds — load without losing a round.
Design and the decisions behind it, including why the magazine version was
cut: `design/reloading.md`.

### THE GUNSMITH — Bo's bench, and four slots on the rifle
The bench in Candlelight opens a full-screen **gunsmith** (`E — work the
bench`), laid out like the reference Laurens sent: the rifle drawn big **with
its fitted parts actually on it**, four slot chips two to a side, and a stepped
leader line from each chip to the point on the gun it changes. Hovering a part
you have not fitted **draws it on the gun** — you see the change before you
commit to it. `MODIFICATIONS n/4` top right.

**What can be changed is a property of the weapon.** The pipe, the knife and
the scrap pistol have no slots and never will; the rifle is the one gun you
earn, so it is the one gun you can argue with.

| Slot | Parts |
|---|---|
| Barrel | **Burst regulator** — left click one round, **right click three**, 2s recharge · **Long barrel** — 22 damage, further and flatter, slower |
| Magazine | **Drum, 24** — reload 1.6 → 2.9s · **Stripped 8** — reload 1.6 → 1.15s |
| Optic | **Laser box** — draws the line the shot will take, and stops where the round would |
| Stock | **Padded** — reload −0.35s, less shake |

**One drawing of the gun, everywhere.** The bench, the pack tile and the weapon
panel all draw `Sprites.rifleBuild` with the fitted parts on it — the slot and
the hands mirror it, because there it is the gun the way you hold it. The pack
tile and the weapon slot were both *sized around the weapon* to make that
possible. Only the hands take a smaller cut: the traveller is sixteen pixels
across, so a thirty-six pixel rifle drawn in their fists buries them; the held
version is the same gun, mass for mass, at two thirds.

**The bench is not a shop** — it fits what is in your kit and sells nothing.
**Two are in chests** — the **drum** in the crypt beside the strongbox, the
**laser box** in the camp's own chest upstairs: this camp keeps what it cannot
use next to what it cannot open, so the two parts that change the rifle most
are found rather than bought. **Two come off machines**: the **burst regulator**
off a stripped Marshal (it fires in threes) and the **long barrel** off a
Magistrate, which finally gives that wall a reward — once each and never twice,
and squads respawn so neither can be missed. **Bo sells the other two**, being
what a man with a vice and an awl can make: the padded stock and the stripped
box. His rows do not appear until you own the rifle, and a chest that was
emptied before its part existed pays out on load (`MILESTONE_GRANTS`). Parts you carry live in the pack under
**PARTS**, with a green bar on whichever is on the gun. Once yours, they swap
free.

The burst regulator is a **second trigger, not a replacement**: left click is
always one round, right click is three, and you pick shot by shot. It costs
three ways — every shot is a little slower with it fitted, **a burst in the air
finishes itself** (you stop choosing how many rounds to spend, and rifle rounds
are the scarcest thing in the ring), and it **recharges for 2s**, so the right
button cannot spray. The weapon panel draws that recharge as the `RMB` bar.
`R` pressed mid-burst is remembered and honoured the moment it ends.

`js/mods.js` holds the registry and **`gunStats(gun)` is the only place the
rifle's numbers come from** — firing, reloading, the HUD and the panel all read
it, and the panel's preview is literally the same sum over a different parts
list. Parts declare deltas, so every effect line in the UI is this build's
arithmetic on this build's numbers. Saves merge onto defaults; an id this build
no longer ships falls back to standard, and a gun holding more than the new
parts allow spills into the pocket rather than losing rounds.
Design and the decisions behind it: `design/gunsmith.md`.

### THE SERVICE RIFLE — the ring's weapon upgrade
The Compactor's drop, and the first thing the milestone-grant rule was written
for. It comes out of the **wreck**, not the machine: the Compactor spent a year
swallowing this yard and one of the things it swallowed was carrying a rifle.
Bent double and no use to anyone — until **Bo** at Candlelight, the camp's
gunsmith, straightens it for **3 tech + 10 scrap**. His counter is the trade
panel with a different verb on it (`REPAIRS`) and a stock that only has a row
while you are carrying something bent. Once it works, his BENCH is where it
gets changed — see the gunsmith above.
Repaired it does **18 damage against the pistol's 10**, flies further and
flatter, and pays for it at 0.78s between shots against 0.5s. `player.gun`
picks which gun is in the slot, exactly the way `player.melee` picks the melee.
**Two pockets, not one:** each gun names the pocket it feeds from, and rifle
rounds are the scarce ones — off the machines still carrying them, or Tam's
counter. A service rifle firing hand-packed pistol rounds read as a bug however
it was justified, and it handed the best gun the most plentiful ammunition.
A run that killed the Compactor before any of this existed is handed the
damaged rifle on load.

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
each a fixed-size 7px icon that never scales, with what is drawn thinning out
as you pull back. It holds **the two camps, the yard gate from both sides and
the sign trail**, and nothing else: the forecourt, school, hotel and bank had
`landmark` pins and lost them on 2026-08-21, because a pin is a promise and
those four are silhouettes you walk past. The `landmark` kind stays wired up
for the day one of them has a door in it; the writing is parked in
`design/map-ui.md`. Click one for a
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

## Where we left off — 2026-08-22

**THE ROAD NORTH is planned and nothing of it is built** — see
`design/the-road-north.md`. Laurens asked what area is next, for it to be
mapped, and for the whole route and the quest camps explained.

The answer: **the empty north band of the Fringe** (above the north cross at
y 36, never built) holding **Field 12** — the dead airfield, the crashed news
drone, **Q3** and *AUTH: E.VANN* — and **the Underpass** under the collapsed
viaduct, which is the door to **Ring 4, THE SPRAWL** and its camp **Station 9**
(Ada, Q4/Q5). It is next because `design/fringe-buildout.md` set that order
five phases ago, because Act 2 has nothing to decode without Q3, and because
north is the only direction the map is open in.

**Q2 has to come first and it is small.** Ivar has the mission slot and no
mission, so nothing sends the player north. The plan proposes *THE LONG AERIAL*
— the school's mast, the church tower, and a loop still broadcasting from the
airfield — which buys the tower stair and the school's map pin on the way.

Four camps on the road, two of them new: Marek's shack ✔ · Candlelight (part) ·
**the Lamp** under the viaduct (a counter, not a camp) · **Station 9** (the
full stack, Ring 4). Build order N1–N7; **N1→N4 is the honest next chunk**,
N5→N7 is a second project the size of the whole Fringe.

**Awaiting approval — no code touched.** Seven open questions at the end of the
doc, the first being whether Q2 is the aerial at all.

## Where we left off — 2026-08-21

**The gunsmith is built** (see its section above and `design/gunsmith.md`): the
Hunter-Killer is off Bo's bench, the bench opens a four-slot gunsmith, and the
rifle can be given a burst regulator, a long barrel, a drum, a stripped box, a
laser and a padded stock. Laurens cut the muzzle slot — *"i like all except
muzzle"* — and with it the suppressor, so **gunfire is still silent to anything
that cannot see you**; detection stays purely visual. Bench-only parts and no
ammunition price change this phase, both by the plan's own lean.

**Parts are found or traded for, never bought at the table** (Laurens, same
day) — the bench fits, it does not sell.

**Wants a real playtest, not a browser check:** whether burst + drum makes rifle
rounds miserable. Everything else about it is verified — every part bought and
fired, the burst counted round by round, the save round-tripped, and a save from
before the bench existed loading with nothing lost.

## Where we left off — 2026-08-20, end of day

Everything is committed and pushed; `main` and
`claude/cathedral-build-status-b63rhb` both sit on **`edcdeda`**, working tree
clean. Nothing is half-built and nothing is waiting on a local file — pick this
up anywhere, including from an iPad.

**Shipped today**, newest first (full detail in `CONVERSATION_LOG.md`):
- `edcdeda` **Reloading** — 6 / 12 rounds a gun, `R` to fill, one pip per round
  in the slot. This *replaced* the magazine system of one commit earlier, at
  Laurens' call; `design/reloading.md` says why and where to find the old one.
  Also: the freeze-frame lesson's key now performs the action it teaches, and
  `arena.html` loads `js/droids.js` again.
- `e49e386` the magazine version (superseded — do not rebuild from it).
- `ca52552` seven fixes: rifle art off the M4 reference, rifle ammunition split
  from pistol, two pews and two braziers out of the church, the boxed-in crypt
  chest reached, droid sight raised, corpses gone at 45s.
- Before that: the damaged rifle + Bo's repair bench, milestone grants, the map
  UI, droid line of sight and facing arcs.

**Three things want your call before they can be built** — none of them blocks
anything else:
1. The Scout HHD's **flare** — built, deliberately not deployed. Does the alarm
   belong in this phase? (`design/hhd-squads.md`)
2. Whether a **stealth kill** on a droid before it flares is a thing, and
   whether cleared squads respawn.
3. **Ammunition balance** now that reloading exists and rifle rounds are
   scarce — the Compactor at the gate with ~18 rounds has never been playtested
   by a person.

**The obvious next build** with no questions attached is item 1 below (long
props as volumes) or item 3 (the rest of Candlelight).

## THE PROLOGUE — built on a branch, awaiting review (2026-08-22)

The opening is no longer three typewriter lines. `js/cine.js` is a **beat
runner** — a cutscene is a list of beats, so every cutscene after this one is
data — and the prologue is six of them: a working street, a machine with its
hands on a patient, **the turn** (every machine stops on the same frame, then
goes blue to amber without moving), the Correction, a **playable 40-second run**
where WASD is taught because you are being chased, and the graveyard at the end
of it. It plays in a real area with the real renderer, ESC skips it, and it
lands in the naming prompt with the yard built.
**On the branch only** — see `design/prologue.md` §11 for the five things not
built yet, the largest being that there is no drawing of him on the ground.

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
3. **Candlelight — the rest of it.** The camp is IN, and **its services went in
   on 2026-08-22**: Halden's dry stores (6 pistol rounds / a snack bar — the
   ring had nowhere selling PISTOL rounds at all), **Sister Ade's medbay**
   (heals to full, priced off the damage — the ring's first repeatable scrap
   sink), and **the sleeping bays**, which re-anchor where you wake up.
   *Bo's counter was never missing — it shipped with the gunsmith; the doc was
   stale.* Still to do from `design/candlelight.md`: the tower stair, the
   strongbox, and Q2 itself. Also the churchyard outside (railings, gravestones,
   trees, a lych gate) and lit windows now that somebody does live there.
4. Interiors (enterable shops/houses, roof fade).
5. Field 12 + the drone crash (Q3) and the Underpass to Ring 4.
   **PLANNED 2026-08-22 — `design/the-road-north.md`.** The whole chain is
   mapped: Q2 at Candlelight → Field 12 and Q3 → the Underpass and the Lamp →
   the Sprawl and Station 9 (Q4/Q5). Build order N1–N7. Waiting on Laurens.
6. Open questions never answered: day/night.
   *(Answered 2026-08-22: **ARMOUR IS RING 4's.** Laurens — the Fringe already
   hands over the knife, the rifle and a four-slot bench, so a fourth
   progression axis competes for the same scrap, and armour is the one that
   would undo the pressure gradient. See `design/progression-gear.md`.)*
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

## Bugcheck, 2026-08-31
Swept all five areas with pixel-accurate occlusion, geometry-conflict,
prop-collision and flood-fill reachability tests, plus a systems pass over the
prologue, area transitions, shops, save migration, death/respawn and twenty
simulated seconds per area. Harnesses live in the session scratchpad
(`audit2.js`, `smoke.js`, `overlap.js`, `probe5.js`) and are worth rebuilding
before the next big map edit.

**Fixed:** the Fringe's third ammo pickup was sealed inside a building (6 of its
18 rounds were unobtainable) and `loadAreaItems` now guards against a repeat; the
gas-station forecourt now sweeps street furniture out of itself, which removed a
lamp post standing through a canopy leg and another a tile from one; a favicon is
declared, so the console no longer carries a 404 on every load.

**Standing:** the objective line still reads "Reach the shelter" while you are
inside the shelter — it is completed by the altar's map table, not by arriving.
That is finding (a) of `design/questline.md` and waits on approval with the rest
of Q2.

**Benign, verified by eye and left:** the east boundary wall passes through the
building at 189,127 (the two share a palette and read as one), and the traffic
light at 35,80 stands beside a signboard without touching it.

## Map and objectives, 2026-08-31
- **`M` opens the ring**, not the area you are standing in: every area walked,
  at true relative scale. Click an area to frame it, click it again (or scroll
  out past three quarters of its fit) to go back. Frames glide, they do not cut.
- **A 112px column down the right of the map** carries the current objective —
  title, area, detail — and `L` swaps it for the ledger of every step the run
  has reached, ticked, each with a short line. The wheel scrolls the column and
  zooms the map. The map region is 208×146 and everything in it measures from
  `MAP_VIEW_W`.
- **`currentObjective()` is a table plus a rank now** (`OBJECTIVES` and
  `questRank()` in `js/entities.js`). Nothing new is saved: done is
  `rank > mine`, so no migration and no way for the log to contradict itself.
  Each step has a forward-looking `detail` and a past-tense `log`. The Compactor
  is a **silent** step — never marked while you are on it, listed once it is
  behind you.
- **The yard gate pin is grey steel**, two posts and a barred leaf. It was a
  blue arch, which read as a doorway and spent WARDEN blue on the least
  important pin on the map. Both gate blurbs rewritten to say where the gate
  goes instead of ending on a riddle.
- Fixed on the way: the world HUD had been drawing underneath the map all along,
  and a click whose press and release landed between two frames was dropped.
- **Still standing:** "Reach the shelter" completes on the altar's map table,
  not on arriving, so it stays up while you stand in the shelter. Finding (a) of
  `design/questline.md`, waiting on approval with the rest of Q2.

## Map thumbnails across a page load, 2026-08-31
The world map only ever had the area you loaded into. A thumbnail is a picture
of an area's tile arrays, only one area's arrays exist at a time, so they were
taken on the way OUT of an area — and `mapThumbs` is memory-only, so a page load
started with none. Broken since the world view was built; invisible until `M`
started opening on the ring.

`loadFogAndThumbs()` in `js/save.js` now builds every area the save has fog for,
unpacks that fog **at the area's own size**, photographs it and moves on; the
save's own area is rebuilt afterwards. 85ms once, at load. The swept thumbnails
are pixel-identical to live ones (the builds are deterministic).

Also fixed: fog used to be decoded with a hardcoded `fringe ? 200x150 : 32x32`
guess, which would have mis-decoded any future area of another size. And
`wipeSave()` did not clear fog or thumbnails, so wiping and starting over in the
same page session gave the new run the old run's explored ground.

## Title backdrop and what a new run is, 2026-09-02
- **The title screen shows the area you logged out in.** `previewSaveArea()` at
  the end of `js/game.js` builds that area, unpacks its fog, restores what it
  remembers and stands the traveller where they left — the camera only. The save
  itself is still not applied until `[E]`, because `[N]` has to be able to start
  clean. Filling the fog there also has the world map's thumbnails ready before
  the player presses anything.
- **`[N] NEW GAME` now actually starts a new run.** `wipeSave()` cleared the
  milestone ledger and the rifle's parts and nothing else, so starting over
  without reloading the page kept the rifle, the scrap, the rounds, the dead
  Compactor, the read map table and every tutorial. `resetRun()` in `js/save.js`
  pours the player back from `PLAYER_DEFAULTS` (captured in `js/entities.js`
  from the literal, so a new field cannot be forgotten) and clears the mission,
  the boss, the map table, the counters, the tutorials, area state, fog and
  thumbnails.
- **`buildMapThumb` refuses an area with nothing explored.** A thumbnail is what
  makes the world map draw, frame and name an area; a blank one is a promise the
  fog contract does not allow.

## Street furniture and the projection, 2026-09-02
Lamp posts were being planted on the pavement along a block's up-screen faces,
where the facade in front swallows them — eleven of the Fringe's 49 were more
than half gone, one showed a single pixel, and two had their heads taken off.
Depth is x + y, so that strip is simply not visible.

`placeProp` now refuses a tile that is behind something tall. Two tests, because
one is not enough: a short wedge over the `heavy` grid for the cathedral, the
boundary wall and fences; and a rectangle test against `buildings[]`, because a
block is a wide diamond on screen and the one taking heads off had its near
corner at (+4, -2). A half-plane tile radius wide enough to catch that took the
Fringe from 36 lamp posts to 14 — the block test keeps 34, worst 99% visible.

Trail signs get the same test but are RELOCATED, never dropped: a waypoint on
the only marked route west matters more than a tidy tile. `signSpot()` searches
across the road first, then along it.

Harnesses in the session scratchpad: `lampfrac.js` (each lamp against its own
unobstructed self), `furnvis.js` (every furniture type), `lamphalf.js` (base vs
head), `trail.js` (the boards, in order).

## THE FRINGE HAS EDGES NOW, 2026-09-02
The map was a box: solid tiles on the outer ring were **0 to the north, 0 to the
south, 0 to the west and 0 to the east**. You were not stopped by anything you
could look at, you were stopped by `x > 1 && x < MAP_W - 1` inside `canStand`.
`design/finish-the-fringe.md` §12 has the full build record; the shape of it:

- **Four edges cut and dressed.** The **Ashfield** burns off the west (`x ≤ 19`),
  the **Grey Run** stands over the south (`y ≥ 140`), the **viaduct** pancaked
  across the north (`y ≤ 29`), and the junkyard's boundary wall now runs the full
  height of the east side with the gate still in it. Walkable **21,437 → 14,423**;
  the outer ring is now solid on all four sides.
- **The viaduct is volumes, not a fence.** New `BUILD_STYLE.V` — blank concrete
  faces with shutter joints, and a real **carriageway** on the roof: lane paint,
  edge lines, a central reservation, ruts, spalling, a crack down the length,
  burnt-out cars and rebar off the broken parapets. Two underpass mouths (x 26–34
  and 88–96) are open, walkable and dead-end at y 21 — the seam the next area
  attaches to.
- **The map has an inward.** Three gantries over the spine carry
  `M7 (N) / CITY CENTRE` with an arrow, and somebody has sprayed **`DON'T`**
  across every one of them. The spine's paint is motorway paint now.
- **Two of the edges are weather, not walls.** `drawEdgeWeather()` in
  `js/game.js` draws the fire and the water **anchored in the world** — the fire
  line is the column `x = ashX1 + 1` and the shore is the row `y = waterY0`, so
  both run down the screen on the iso diagonal and swing across it as you walk.
  It fades in as you approach and is off entirely by x 66 / y 100. The numbers
  live once, in `FRINGE_EDGES` in `js/map.js`, and both the collision and the art
  read them from there.
- **Saves survive it.** `findSafeSpot` reached 8 tiles and gave up — the Ashfield
  is twenty columns deep. It reaches 44 now, and every area names a `safeSpawn`
  instead of falling through to the middle of the map.
- **THE FIRE IS NOT A WALL.** Second pass, after playing it: the Ashfield's front
  **wanders** (x 11–22, three sine waves on `mulberry32(7717)` — its own stream)
  and its outer six tiles are **walkable and lethal**. 100 HP burns away in 7.7 s.
  Only the heart of it is solid, and that is what bounds the map. Three bands so
  it announces itself: road → `scorch` (ground id 15) → coals. `burning[y][x]` is
  the grid; `updateBurning()` in `js/game.js` is the tick.
  **Anything that places something on the map must test `burning`, not just
  `solid`** — the margin is walkable, so `placeBuilding` put two office blocks in
  the coals until it did.

**Frame cost is unchanged within noise** (the plan's claim that the cut would
make the map *cheaper* was wrong — props went 312 → 399), except beside the
Ashfield, where the fire costs about 1.3 ms.

**Do not add a pass to `buildFringe` that draws from `rng` unless it goes at the
end.** The first version of the Grey Run's dressing did, and re-rolled every
building placed after it: 354 walkable tiles moved and St Martin's ended up
inside a block. New dressing runs last on its own `mulberry32(90210)`.

### Outstanding
- Crash barriers along the spine's edges (F4) — not built; ~200 props for what
  the gantries already say.
- `design/expansion-build-spec.md` (Field 12) is written and costed. Its ground
  ids were renumbered to **15/16/17** because 12/13/14 are ash/water/deck now.
