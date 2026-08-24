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
| 1.1 | **Halden and Bo's stock lists.** Per-trader stock is done and Tam proved it — these two are a list each and zero UI work. Bo already has a repair counter; he has no *shop*. | S | ○ |
| 1.2 | **Ade heals for a price.** The med station is the one camp service in `GAME_PLAN` §6 the ring has never had. Trivial now trade is per-NPC. | S | ○ |
| 1.3 | **The sleeping bay re-anchors respawn.** Respawn still assumes the junkyard. Dying in the Fringe and waking in the yard is the single worst-feeling thing left in the ring. | M | ◆ does sleeping also heal and move time on? |
| 1.4 | **The crypt strongbox.** Locked, "later". Quest lock or a tool you find? | S | ◆ |
| 1.5 | **The tower stair.** Outstanding since Candlelight was built, and the road-north plan wants it for Q2. | M | ○ |
| 1.6 | **The churchyard.** `cathedral.md` phase 2: railings, headstones, trees, a lych gate. The cathedral currently stands on bare street. | M | ○ |
| 1.7 | **Lit windows on St Martin's** now that seven people live in it. The building reads abandoned from outside and warm inside — that is backwards. | S | ○ |
| 1.8 | **The Scout HHD.** Built, deliberately not deployed, pending your call on whether the alarm belongs in this phase. | S | ◆ |
| 1.9 | **Long props as volumes.** Bus stop, dumpster, awning — still flat cards across the road, and their hitboxes have to move onto real footprints when they change. | M | ○ |

## 2. The ring has no economy

This is the gap I did not expect to find. The Fringe has *four* traders now and
almost nothing to want.

- **2.1 ○ M — Scrap has no sink.** Once you own the knife, the rifle and a
  pocket of rounds, scrap accumulates forever. Every camp service that could
  drink it — healing, repairs, sleeping, the strongbox — is unbuilt. Finishing
  §1 largely fixes this by itself, which is an argument for doing §1 first.
- **2.2 ◆ M — There is no armour, at all.** `items.js` says outright that the
  ARMOUR tab was removed rather than stand empty saying *the city will provide*.
  The city has still not provided. The Fringe is where the first armour belongs
  — scavenged plate, a padded coat off a bandit — and it is the obvious second
  thing Bo's vice is for. **Decision: does armour exist as a slot in this game,
  and is it one value or several?** `progression-gear.md` never settled it.
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
