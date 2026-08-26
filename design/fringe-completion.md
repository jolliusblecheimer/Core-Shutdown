# What THE FRINGE still needs to be finished

**Brainstorm, 2026-08-22.** Laurens: *"brainstorm a list of things this area
needs to be completed — i added everything i find necessary, now come the
details."*

So this is not a plan and nothing here is approved. It is the honest list of
everything standing between the Fringe as it is today and a ring a player could
walk into, play through, and leave without ever meeting a construction site.

Each item carries a size — **S** an evening, **M** a session, **L** its own
plan — and a mark: **◆ blocked on a call from you**, **○ just work**.

The road north (Field 12, the Underpass, Ring 4) is deliberately **not** here.
That is the *next* ring, it has its own document, and it is waiting on you
separately.

---

## 1. Debt — things already half-built

Nothing on this list is a new idea. Every one of them is a doc saying
*not built* or a system deliberately held back.

| | What | Size | |
|---|---|---|---|
| 1.1 | ~~Halden and Bo's stock lists.~~ **DONE 2026-08-22.** Halden sells 6 pistol rounds (5 scrap) and a snack bar (3). *Bo's counter already existed* — it shipped with the gunsmith; this row was stale. | S | ✔ |
| 1.2 | ~~Ade heals for a price.~~ **DONE 2026-08-22.** Heals to full, priced off the damage (2 scrap for a scratch, 9 for near-death). The ring's first repeatable scrap sink. | S | ✔ |
| 1.3 | ~~The sleeping bay re-anchors respawn.~~ **DONE 2026-08-22.** `player.respawnArea` beside the coordinates; dying in the ring routes through the same fade a door does. Sleeping **heals to full** and moves no time on, there being no clock — flagged then, taken as the default. | M | ✔ |
| 1.4 | **The crypt strongbox.** Locked, "later". Quest lock or a tool you find? | S | ◆ |
| 1.5 | **The tower stair.** Outstanding since Candlelight was built, and the road-north plan wants it for Q2. | M | ○ |
| 1.6 | **The churchyard.** `cathedral.md` phase 2: railings, headstones, trees, a lych gate. The cathedral currently stands on bare street. | M | ○ |
| 1.7 | **Lit windows on St Martin's** now that seven people live in it. The building reads abandoned from outside and warm inside — that is backwards. | S | ○ |
| 1.8 | **The Scout HHD.** Built, deliberately not deployed, pending your call on whether the alarm belongs in this phase. | S | ◆ |
| 1.9 | **Long props as volumes.** Bus stop, dumpster, awning — still flat cards across the road, and their hitboxes have to move onto real footprints when they change. | M | ○ |

## 2. The ring has no economy

This is the gap I did not expect to find. The Fringe has *four* traders now and
almost nothing to want.

- **2.1 ~~○ M~~ LARGELY FIXED 2026-08-22 — scrap has no sink.** Ade's medbay is
  a recurring cost that scales with how badly the ring is treating you, which
  is exactly the shape this was missing.
  *As originally written:* once you own the knife, the rifle and a pocket of
  rounds, scrap accumulates forever, because every camp service that could
  drink it — healing, repairs, sleeping, the strongbox — was unbuilt. That was
  the argument for doing §1 first, and doing §1 is what closed it.
- **2.2 ✔ DECIDED 2026-08-22 — armour is Ring 4's, not this ring's.** Laurens:
  *"there are already many upgrades in the first part outside of the tutorial,
  maybe save new armour for the next part of the quest."* Leaving the tutorial
  the Fringe already hands over the knife, the service rifle and a four-slot
  bench with six parts for it; a fourth progression axis would compete for the
  same scrap, and armour is the one that would quietly undo the pressure
  gradient. Ring 5's answer to danger stays cover, the crouch, and knowing when
  not to fight. Written up in `progression-gear.md`.
- **2.3 ◆ S — The rifle-as-pickup question.** The bandit rifleman drops rounds,
  not his rifle. `bandits.md` says on purpose that this is a progression call
  nobody has made. It is still not made.
- **2.4 ○ S — Nothing to *find* that is worth crossing the map for.** Every
  reward in the ring is handed over by a person or sits in a chest inside the
  only camp. There is no cache in the open city.

## 3. 200×150 of city you have no reason to enter

The biggest structural gap, and the hardest one. The Fringe is a real city and
the game only uses **three streets of it** — the gate road, the east cross, and
the corridor to the church. Everything else is scenery you skirt.

- **3.1 ◆ L — Interiors.** Outstanding item 4 since the Fringe was built. One
  enterable shop or house would double the ring's play space and make the other
  eight hundred buildings read as *closed* rather than *fake*. The cheap version
  is a handful of small looted rooms, not every building.
- **3.2 ○ M — Reasons to leave the road.** A cache in a back garden, a body with
  a note, a barricaded house with something behind it. Cheap, scattered, and it
  is what turns a street network into a place worth searching.
- **3.3 ◆ M — The gas station is a set piece with no fight.** Six pillars, four
  detonating pumps, and nothing has ever been staged around it. It is the best
  arena in the ring and it is decoration.
- **3.4 ○ S — The map's own promise.** The map table hands you the whole ring's
  fog. Right now that reveals a city with four pins on it. The more of §3 exists,
  the more that moment is worth.

## 4. The street does not feel lived-through

Detail work. None of it is necessary and all of it is what "finished" means.

- **4.1 ○ S — City ambience.** The ring has the yard's drone. It needs its own
  bed: wind down long streets, a loose sheet, a shutter, something far away
  that is not a machine.
- **4.2 ○ S — Life that is not hostile.** Rats, birds off a roof when you get
  close, a cat. The only moving things in the Fringe currently want to kill you.
- **4.3 ○ S — The Correction left no marks.** Abandoned cars are queued neatly
  at lights. Where are the crashed ones, the belongings dropped in the road, the
  spray-painted messages, the doors kicked in? The story says everyone who could
  run, ran — the street should show it.
- **4.4 ○ S — Washing lines, boarded windows, graffiti** on the survivor side;
  the machines' side is already well handled by the cordon and the barricades.
- **4.5 ◆ M — Day/night.** The last never-answered question in
  `PROJECT_STATE.md`. Enormous atmospheric payoff, and it would finally justify
  the forty unlit streetlights. Also the single biggest risk to the HD-2D look,
  which is tuned for dusk.
- **4.6 ◆ M — Weather.** Rain exists as puddles but never falls. Ash from the
  Ashfield was in the original wedge plan and never arrived.

## 5. Combat nobody has actually played

- **5.1 ◆ M — The balance pass.** Three separate things have been flagged and
  none tested by a person: the Compactor at the gate with ~18 rounds, whether
  burst + drum makes rifle rounds miserable, and the whole ring against
  pipe/knife. **This one needs you, not me** — a browser check cannot tell you
  whether a fight is miserable.
- **5.2 ◆ S — Do cleared squads respawn?** Still open in `enemies-bosses.md`.
  An emptied city undoes the pressure gradient; permanent clearing is the
  reward for fighting. Pick one.
- **5.3 ◆ M — Stealth kills.** Crouching up on a Scout before it flares. It
  would make stealth a playstyle rather than avoidance — but it is a new
  mechanic, not a knob.
- **5.4 ○ S — Death in the Fringe.** Tied to 1.3. There is also no death
  penalty anywhere in the game; `combat.md` has had "lose some scrap where you
  died" as a lean since the first design pass and it was never built.
- **5.5 ○ S — The Magistrate is a wall with no door.** It reads *come back
  later* correctly, but nothing in the ring ever makes it beatable, so "later"
  never arrives inside the Fringe.

## 6. Story — one missing sentence

- **6.1 ◆ M — Q2.** Ivar has the mission slot and no mission, so **nothing in
  the game currently tells the player to go anywhere after Candlelight.** The
  road-north plan proposes THE LONG AERIAL. Whatever it is, the ring is not
  finished without it — this is the difference between a place and a level.
- **6.2 ○ S — Marek has nothing to say about any of it.** He warned you about
  the droids and then the game moved on. One line acknowledging you found the
  camp costs nothing and makes the yard feel connected.
- **6.3 ○ S — The sign trail ends at a door and stops.** No sign anywhere
  acknowledges the roadblocks, which are the thing actually between you and the
  shelter. The bandits presumably tore some down — that is a detail with a
  story in it.

## 7. My reading of what matters

If the goal is *finished ring*, the order is not the order above.

1. **§1 first, all of it.** It is debt, it is small, it needs almost no
   decisions, and it fixes the economy (§2.1) as a side effect. The respawn
   re-anchor (1.3) is the highest-value single item in this document.
2. **Q2 (6.1)** — because a ring with nothing telling you what to do next is
   not finished no matter how much is in it.
3. **§4 detail pass** — cheap, and it is the difference between built and
   alive.
4. **§3 interiors** — the big one, its own plan, and the thing that makes the
   other 197 columns of city mean something.
5. **§5 balance** — but this is *yours*, and it wants a real playthrough.

Two decisions block more than they look: **armour (2.2)** because it is a whole
progression axis the game has been silently missing, and **day/night (4.5)**
because it touches every surface in the ring and gets harder the more of §3 and
§4 exist. If either is a yes, they want deciding before the detail work, not
after.
