# Building Ring 5 — the Fringe (PLAN, approved shape TBD)

## The question: whole ring, or part of it?

**Build a WEDGE, not the ring.** A full Ring 5 annulus is roughly 15–20× the
junkyard in walkable area. Authored at the junkyard's quality (hand-placed
props, lighting, patrol routes, camps, quests) that is months of work — and
most of it would be circumference the player never walks, because the whole
game pushes *inward*, not sideways.

So: build the **southern arc** of the Fringe — the slice that actually contains
the main quest (Candlelight Q2, the drone crash Q3) and the road inward to the
Sprawl. Roughly **20% of the ring's area, 100% of its content**. The remaining
circumference stays visible on the horizon but is closed off by terrain that
makes physical sense.

This also protects the design rule from [[world-map]]: **no invisible walls, no
"you can't go that way" popups.** Every edge is a thing you can see and
understand at a glance.

## The blockers (all diegetic, all visible from a distance)

| Blocker | Where | What it is | Why it stops you |
|---|---|---|---|
| **The Ashfield** | west edge of the wedge | A tank farm that caught during the Longest Night and never stopped burning — a lake of fuel fire under a permanent smoke ceiling | Heat haze you can see from a screen away; walking in cooks you. Ash rains across the western yard as ambience |
| **Grey Run floodplain** | east edge | The river burst its levees when the pumps stopped; the eastern lowlands are a shallow sea of black water, drowned cars, mud | Too deep to wade, current too strong. (A boat/bridge could open this later for optional content) |
| **The Cordon** | north-west arc | The AI's own containment fence: 6m electrified mesh, razor spools, drone pylons every 200m — built the night of the Correction to pen survivors out of the city | Lethal by design and *narratively loud*: proof the machines herded people, not just killed them |
| **Viaduct Collapse** | north-east arc | A kilometre of elevated M7 that pancaked, forming a rubble ridge with rebar spikes | Simply a wall of broken concrete — climbable in places, but the far side is Ring-4 depth content we haven't built |
| **The Sink** *(already on the map)* | mid-west | Subsidence crater where the old metro roof gave way | Sheer, unstable drop. Later becomes an optional shortcut into Ring 3 |

The **only** open direction is inward along M7 — which is exactly where the
story goes. Nothing needs a sign.

## The wedge, area by area (4 authored areas)

Each is a hand-built scene about junkyard-sized, connected by chokepoints
(a road, an underpass, a hole in a fence) rather than one giant map.

1. **The Approach** — outside the yard gate. A service road, a wrecked convoy,
   the first fight in open ground. Small, tutorial-of-the-outside: no walls to
   hide behind, patrols that see further.
2. **Aldergrove** — the overgrown suburb. Streets, houses to enter and loot,
   dense cover for stealth. Holds **Candlelight** (Q2) in its burned-out church.
3. **Field 12 & the crash site** — the dead airstrip. Wide open sightlines make
   it genuinely dangerous; the drone wreck (Q3) sits mid-runway.
4. **The Underpass** — M7 running north under the viaduct, ending at the Ring-4
   boundary where the Sprawl (Station 9, Q4) will attach later.

## What has to be built underneath it (the real work)

The junkyard is a single hard-coded 32×32 map. The wedge needs:

- **Area system** — multiple maps with transitions at edges, each with its own
  tiles, props, spawn tables, ambience and minimap. (Not one streamed
  mega-map: separate authored areas keep quality high and memory flat.)
- **Block library** — the reusable pieces from [[world-map]]: street corner,
  house shell, fence run, wrecked car, ruined shopfront. Author once, place
  many.
- **Save v3** — per-area state (items taken, barrels blown, doors opened,
  enemies cleared) instead of the single-map fields we have now. Migrating
  v2 → v3 must keep every existing run intact.
- **Enemy variety** — the Fringe needs the Ring-5 squad roles from
  [[enemies-bosses]]: rust drones (flyer) and a junk-slinger (archer) alongside
  Scrappers, so open ground plays differently from the yard.
- **Camp systems** — Candlelight needs the trader/crafting/mission-giver stack
  the shack only sketches.

## Suggested order

1. Area system + transitions (prove it by walking out of the yard gate into a
   small Approach and back)
2. Block library + Aldergrove
3. Candlelight camp + Q2
4. Field 12 + drone crash + Q3
5. Underpass + Ring-4 boundary (leaves the hook for the Sprawl)

Each step ends playable, same as the junkyard did.
