# HHD SQUADS — the machines that hold the Fringe (PLAN, awaiting approval)

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
- **One CORE-BLUE sensor bar**, not a glowing bulb — a horizontal slit that
  sweeps when scanning. See the colour rule below.
- **Seamless joints** — no exposed cabling, no bolts, no asymmetry.
- **A stencilled WARDEN chevron** on the shoulder, identical on every unit.
  Uniformity is the horror: the Scrapper is a scavenger, these are *issued*.
- Silhouette reads at 320×180 from the head shape alone.

### THE MACHINES GLOW CORE BLUE, NOT AMBER (Laurens, 2026-08-19)

Every light on an HHD — sensor bar, baton tip, rifle muzzle, the Magistrate's
cannon, its projectiles, and the sparks those bolts throw off a wall — is the
cold neon blue of the Core (`#6fd3ff` / `#2b7fb5`), never amber.

Two reasons it is the right call:

1. **It is the palette journey, arriving early.** `art-style.md` runs
   rust/amber at the outskirts to cold neon blue/white at the Core. An HHD is
   *issued equipment* carrying WARDEN's own light out to the edge, where it does
   not belong. The Scrapper's amber bulb is junk the city threw together; this
   is the machine that built it. Against the Fringe's warm dusk the blue is the
   only cold thing on screen, so a patrol reads as foreign before you have
   parsed its shape.
2. **It makes the amber law stricter, not weaker.** *What glows amber can be
   hurt; dull plate cannot* now has no competition: no warm light exists
   anywhere on the machine, so the only amber you ever see on a droid is the
   flash and sparks of a **weak-point hit**. Blue is WARDEN. Amber is damage.

The laser sight stays **red** — it is a warning, not machinery, and it has to be
the loudest thing on screen during a wind-up. The lootable-wreck glow stays warm
too, because that cue belongs to the player, not the machine.

---

## The roster — four units, varying size and weapon

Player is 14×18px; the Scrapper about 18px tall. All four are bigger, per the
ask. `PROJECT_STATE.md` already names the first three.

**NAMES ARE CODE-ONLY** (Laurens, 2026-08-19). Nothing in the game ever shows a
unit name — no labels, no bestiary, no dialogue naming them. These names exist
so we can talk about them.

| Unit | Size | Weapon | Role | HP | In this phase? |
|---|---|---|---|---|---|
| **SCOUT** | 1.25× player, small body on tall thin legs | none — its weapon is the **flare** | support / alarm | 35 | **no — held back** |
| **BAILIFF** | 1.15×, squat and wide | shock baton, short reach | flusher — drives you out of cover | 45 | yes |
| **MARSHAL** | 1.35×, upright | rifle, 3-round bursts | the core threat, keeps distance | 55 | yes |
| **MAGISTRATE** | 1.9×, 2×1 footprint | riot shield + arm cannon | heavy — rare, a "not yet" wall | 140 | yes, one |

- **SCOUT** *(was "Spotter" — renamed, and **left out of this phase**; Laurens is
  not yet sure the alarm belongs here)*. Fragile and unarmed, but on detection
  it fires a flare that wakes the whole squad *and* pulls the nearest one. Kill
  it first: that is the lesson. It stays defined in `DROID_TYPES` and has a
  sprite, so nothing is lost — it is simply spawned by nobody.
- **BAILIFF** — fastest. Will not stand and trade at range; it closes and
  flushes. This is what punishes hiding in one spot forever.
- **MARSHAL** — holds ~5 tiles, takes cover behind props, telegraphs each burst
  with a laser sight line (the fair-telegraph rule). It does **not** drop its
  rifle — see the weapon-upgrade route below.
- **MAGISTRATE** — the size variety. Slow, frontal shield takes **zero** damage
  (boss-grade), so it must be flanked or avoided. Rare and deep-north only: it
  should read as *come back later*, which is how the pressure gradient is
  supposed to work without walls.

## THE RIFLE COMES OFF THE COMPACTOR, NOT THE MARSHAL

Laurens, 2026-08-19. The ring's weapon upgrade does **not** drop from HHDs:

1. **The Compactor drops a badly damaged rifle** that cannot fire at all —
   carried, not usable. (This also answers the long-open question in
   `PROJECT_STATE.md` about what the Compactor drops.)
2. **A survivor at Candlelight — the one dismantling a droid in the church —
   repairs it** for the traveller. A new NPC, and a reason for the camp to
   matter beyond trade.

The consequence for pacing is the point: when you first reach the Fringe you
have a pistol and a broken rifle, so **HHDs are to be avoided**. You come back
for them later, once the rifle works, and only then are they worth fighting for
drops. Avoidance first, combat second — which is exactly what the stealth
system is for.

They still drop scrap and higher-grade tech than yard machines, so a fight is
never worthless — just not the way you get your gun.

### Packs, not blobs

A squad is **2–4 units with a role mix**, never N copies of one thing — per the
`GAME_PLAN.md` rule that encounters mix melee pressure, ranged fire and
something else.

| Patrol | Composition |
|---|---|
| Light | Bailiff + Marshal |
| Standard | 2 Bailiff + Marshal |
| Heavy (deep north, one only) | 2 Bailiff + Marshal + Magistrate |

*(Each of these gains a Scout at the front if the Scout is ever switched on.)*

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

## Respawn

A wiped squad comes back on its route after **60 seconds** (Laurens) — long
enough to cross the ground it was patrolling, so clearing a street buys you real
passage, but the city never stays empty. It will not respawn while the player is
standing within 22 tiles of its start: machines are never seen popping into
existence.

## Save — NOT NEEDED

`save.js` already declares *"robots re-enter fresh (never saved mid-chase)"* —
enemies are not persisted at all, only the kill count. Squads rebuild on area
entry, so this needs **no save version bump and no migration**. The one wrinkle:
`applySave` can switch area without going through `enterArea`, so it has to
rebuild squads itself.

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

## Decided (Laurens, 2026-08-19)

- Spotter is renamed **Scout**, and is **left out of this phase**.
- **Magistrate stays.** One, deep north.
- **Names are code-only** — nothing in the game is ever labelled.
- Cleared squads **respawn after ~60s**.
- The rifle comes off **the Compactor**, damaged, and is repaired at the church.

## Still open

1. **Stealth kills.** Should a kill from crouch, before the squad alerts, be an
   instant kill? It would make stealth a playstyle rather than just avoidance —
   but it is a new mechanic, not a tuning knob.
2. **Does the Scout come in later**, and does the flare pull a *neighbouring*
   squad or only its own?
3. **Balance.** Untested against a real run: a standard pack is 2 Bailiffs and a
   Marshal, and the player arrives with a pistol, a knife and no working rifle.
   The intent is that this fight is one you decline.
