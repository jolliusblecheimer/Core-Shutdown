# HHD SQUADS — the machines that hold the Fringe

**Status: steps 1 and 2 of the build order are DONE (2026-08-20); 3–9 are not,
and four of them need the open questions at the bottom answered first.**

- **Step 1, the singleton→array refactor this plan calls its blocker, is done** —
  cleared in passing by the two-Scrapper work and the cordon. `scrappers[]` and
  `bandits[]` both exist; nothing is a singleton any more.
- **Step 2, line of sight and facing arcs, is done.** See §"what actually
  changed" at the bottom — half of it (cover) had already arrived with the
  bandits, and the Scrappers had been left behind seeing through walls.

Laurens, 2026-08-19: *"make a plan for the robot squadrons in the city, make the
robots vary in size and weaponry. they should be a bit bigger and travel in
packs. they are patrolling so you can hide with shift behind an object or fight
them. they should also look modern not like the old scrappers"*

This is outstanding item 2 in `PROJECT_STATE.md` — the streets are beautiful and
empty. It is the biggest system since the Compactor.

---

## THE BLOCKER — the game can only hold one enemy

`scrapper` is a **single global object** (`entities.js:63`), not a list. There is
exactly one enemy in the entire game, referenced in ~62 places:

| File | References | What they do |
|---|---|---|
| `entities.js` | 45 | `updateScrapper`, `spawnScrapper`, `killScrapper`, bullet collision |
| `game.js` | 8 | drawing, depth sort, minimap blip, area entry |
| `sprites.js` | 6 | the sprite frames |
| `save.js` | 3 | kills, state |

Everything assumes one: `updateBullets` tests `Math.hypot(b.x - scrapper.x, ...)`
against that one object; the draw call is a single `drawImage`; the minimap plots
one blip.

**Packs are impossible until this becomes an array.** No amount of HHD design
gets around it. So phase 0 of this plan is a refactor of the oldest code in the
game, done and verified *on its own*, before a single HHD is drawn.

**Good news:** the Fringe already has the patrol infrastructure built and unused
— 12 patrol waypoints at street junctions and the forecourt, and 6 hidden
`moundSpawns` (`map.js:657-665`). It only lacks enemies because the area is
flagged `hasScrapper: false`.

---

## The design language — modern, manufactured, not junk

The Scrapper is improvised: rust, mismatched plate, a bulb eye. `art-style.md`
says the robot look evolves inward — *"rust/junk/improvised (outskirts) →
clean/lethal/uniform (Core). The AI's handwriting gets neater as you approach
it."*

HHDs are the first **factory-made** enemy the player meets, and that is the
point: the Scrapper is something the city threw together, an HHD is something
the city was *issued*. Story-wise these are the units built for the Correction —
the machines that herded people to the edges. They are in the city because that
is what they were made to hold.

- **Matte composite panels** — off-white and graphite, not rust. Flat colours,
  clean seams, no weathering except grime at the feet.
- **One amber sensor bar**, not a glowing bulb — a horizontal slit that sweeps
  when scanning. Keeps the law (*what glows amber can be hurt*) while looking
  manufactured.
- **Seamless joints** — no exposed cabling, no bolts, no asymmetry.
- **A stencilled WARDEN chevron** on the shoulder, identical on every unit.
  Uniformity is the horror: the Scrapper is a scavenger, these are *issued*.
- Silhouette reads at 320×180 from the head shape alone.

---

## The roster — four units, varying size and weapon

Player is 14×18px; the Scrapper about 18px tall. All four are bigger, per the
ask. `PROJECT_STATE.md` already names the first three.

| Unit | Size | Weapon | Role | HP |
|---|---|---|---|---|
| **SPOTTER** | 1.25× player, small body on tall thin legs | none — its weapon is the **flare** | support / alarm | 35 |
| **BAILIFF** | 1.15×, squat and wide | shock baton, short reach | flusher — drives you out of cover | 45 |
| **MARSHAL** | 1.35×, upright | rifle, 3-round bursts | the core threat, keeps distance | 55 |
| **MAGISTRATE** | 1.9×, 2×1 footprint | riot shield + arm cannon | heavy — rare, a "not yet" wall | 140 |

- **SPOTTER** — fragile and unarmed, but on detection it fires a flare that
  wakes the whole squad *and* pulls the nearest one. Kill it first: that is the
  lesson, and it answers the open question in `enemies-bosses.md` about an alarm
  system.
- **BAILIFF** — fastest. Will not stand and trade at range; it closes and
  flushes. This is what punishes hiding in one spot forever.
- **MARSHAL** — holds ~5 tiles, takes cover behind props, telegraphs each burst
  with a laser sight line (the fair-telegraph rule). **Drops its rifle** — the
  ring's weapon upgrade, and the answer to that open question in
  `PROJECT_STATE.md`.
- **MAGISTRATE** — the size variety. Slow, frontal shield takes **zero** damage
  (boss-grade), so it must be flanked or avoided. Rare and deep-north only: it
  should read as *come back later*, which is how the pressure gradient is
  supposed to work without walls.

### Packs, not blobs

A squad is **2–4 units with a role mix**, never N copies of one thing — per the
`GAME_PLAN.md` rule that encounters mix melee pressure, ranged fire and
something else.

| Patrol | Composition |
|---|---|
| Light | Bailiff + Marshal |
| Standard | Spotter + Bailiff + Marshal |
| Heavy | Spotter + 2 Bailiff + Marshal |
| Rare (deep north) | + Magistrate |

They walk a route in **loose formation** — leader on the waypoint line, others
offset laterally ±0.8 tiles and staggered back — each still running `aiMove`, so
they sidestep junk individually instead of moving as a rigid block.

---

## STEALTH — what "hide behind an object" actually requires

This is the part of the ask that needs a real system change, and it is the most
important thing in this plan after the refactor.

**Today, robots see through walls.** Detection is radius-only
(`entities.js:577`): sight 4.5, crouch 2.2, always-seen under 1.6. There is no
line-of-sight test at all — a Scrapper "sees" you through a building. In the
junkyard the mounds are sparse enough that this never showed. In a city of solid
buildings it would be nonsense, and Laurens' ask — *hide with shift behind an
object* — would simply not work.

Three additions:

1. **Line of sight.** Bresenham walk over the `solid` grid between unit and
   player; any solid tile breaks it. Only run when the player is inside sight
   range, so the cost is near zero. Buildings, dumpsters, cars, walls and the
   junkyard fence all become real cover. *This is the feature Laurens is asking
   for.*
2. **Facing and a vision arc.** Units face their direction of travel and see in
   a ~120° forward cone, plus a small all-round peripheral radius (~1.5) so you
   cannot stand on their heel. Sneaking behind a patrol becomes viable and
   patrol routes become readable — a real upgrade on the current omniscient
   360° circle.
3. **Squad-shared alert.** Detection is per-unit, but alert **propagates**: one
   member hitting 1.0 puts the whole squad on alert and they converge on the
   last known position. The Spotter's flare makes it instant and pulls a
   neighbouring squad. Stealth then means evading a squad's *combined* vision,
   which is what makes packs interesting rather than just harder.

Crouch (SHIFT) keeps its current role — halves speed, shrinks their range —
and now genuinely pays off, because breaking line of sight is finally possible.

## Fighting them

They must be winnable with pipe, knife and ~18 rounds, or the Fringe becomes a
wall. The boss's zero-damage armour is too harsh for a 3-pack, so HHDs get a
softer version of the same language:

- **Frontal armour: 0.5× damage** (not zero — zero is boss-grade)
- **Rear sensor spine: 2× damage**, and it glows amber — the established law
  *what glows amber can be hurt* reads instantly, no tooltip
- Net effect: flanking is the skill, exactly as the Compactor taught staggering

Only the Magistrate's shield is true zero, marking it as boss-adjacent.

## Where they patrol

Squads own the **street junctions** — using the 12 waypoints already built. That
inverts the city: streets become dangerous, buildings and props become cover.

- **Density gradient**: sparse near the junkyard gate in the east where the
  player arrives; denser north and along the mid street. The pressure gradient
  from `GAME_PLAN.md`, expressed in patrol density instead of walls.
- **Safe radius around St Martin's / Candlelight** — no spawns, no routes. The
  camp has to be the warm spot.
- **Spawn rule holds**: squads appear at `moundSpawns` (already placed behind
  cover) and only while off-screen. *Enemies never pop into existence in view.*

## Performance

5–8 squads ≈ 15–25 entities on a 200×150 map that currently runs ~0.7ms/frame.
Only squads within ~25 tiles of the player update fully; the rest advance a
cheap route position with no steering, no LOS, no animation. Measure before and
after — the budget is the thing that keeps this map open-world.

## Save

v3 → **v4**: per-area squad state (which are dead, respawn timers) alongside the
existing per-area world state. Migration must keep every existing run intact —
`save.js` merges onto live defaults, so a v3 save loads with zero squads cleared
and repopulates normally.

---

## Build order

Each step verified in the browser before the next, and `window.TEST_MODE = true`
for every test that saves.

1. **Phase 0 — singleton → `enemies[]`.** The Scrapper becomes one entry with
   `kind: 'scrapper'`. Junkyard behaviour must be **byte-identical**: same
   stats, same respawn, same save fields, same tutorials. That is the regression
   test, and nothing else starts until it passes.
2. **Line of sight + facing arcs**, still with only the Scrapper — testable in
   the yard, where hiding behind a trash mountain should now work.
3. **Squad object**: shared alert, formation, routes.
4. **HHD behaviour** per role, placeholder boxes, no art yet.
5. **Sprites** — the four units in the modern language.
6. **Fringe placement**: density gradient, camp safe radius.
7. **Loot**: the Marshal's rifle, higher-tier tech.
8. **Save v4 + migration.**
9. **Balance pass** — playtest a standard 3-pack with pipe + 18 rounds.

Steps 1–2 are the risky ones and touch existing behaviour; 3–9 are additive.
This is multi-session work.

---

## Open questions — need Laurens

1. **Names.** Marshal / Bailiff / Spotter are already in `PROJECT_STATE.md`.
   **Magistrate** for the heavy keeps the judicial theme (these are the machines
   that "processed" people). Spotter is the odd one out — **Clerk** would fit
   the theme better. Keep Spotter, or rename?
2. **Does the Magistrate belong in the Fringe at all**, or is it a Sprawl unit
   that occasionally strays south? *(my lean: rare, deep-north Fringe only — a
   visible "not yet")*
3. **Stealth kills.** Should killing a Spotter from crouch, before it flares, be
   an instant kill? It would make stealth a real playstyle rather than just
   avoidance — but it is a new mechanic, not a tuning knob.
4. **Do cleared squads respawn?** Still open in `enemies-bosses.md`. *(my lean:
   yes, slowly and off-screen — an empty city undoes the pressure gradient)*

---

## What actually changed, when step 2 was built

This plan said "today, robots see through walls. Detection is radius-only.
There is no line-of-sight test at all." **That was already half wrong by the
time anyone read it back** — the cordon shipped `losClear()` and the bandits
have been using it since. What had been left behind was the older code: the
**Scrappers** were still radius-only, in the yard the plan describes as the
place where it never showed.

So step 2 was two things, not three:

1. **The Scrappers joined the cover rule.** Patrol detection and — the one that
   changes how the game plays — the CHASE. `seesYou` was `distP < 7.5` with no
   cover test, so a chase could not be broken by hiding; it only ended by
   outrunning the radius. Now breaking line of sight starts the memory clock,
   the machine pushes to where you were last, and gives up. That is the crouch
   key finally paying for itself.
2. **Facing arcs, for everything.** A 120° forward cone with a 1.5-tile
   all-round bubble so you cannot stand on a heel, widening to 280° once
   something is already hunting you — a machine actively looking for you is not
   walking a route. Units face their direction of travel (set in `aiMove`, the
   one function every walker goes through), a stopped Scrapper sweeps its
   sensor rather than staring down one line forever, and a bandit at his post
   sweeps either side of the road he was put on to watch.

And one thing the plan did not ask for but the game needed: **a cone the player
cannot read is not a stealth mechanic, it is bad luck.** Each machine throws a
patch of cold blue-white light on the ground where it is looking. Cold, because
amber in this game means *this can be hurt* and the beam is not a target.

All three cases verified in the browser: behind cover with the machine staring
straight at you, alert stays at zero; in the open, it climbs; in the open with
the machine turned away, it decays. The yard still plays — Scrappers engage
within about a second of you standing next to them in the open, and a roadblock
still turns in about two.
