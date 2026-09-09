# AIRFIELD 12 — pass two
### A reason to go, a map that points, five ways through, and a boss worth the room

*Status: **APPROVED** 2026-09-09 — all six, in the order below.*
*Written 2026-09-09, against `bdf42cd`.*

Six asks from Laurens. Everything below that states a fault was **measured**, not
guessed — the harness is `scratchpad/audit3.js`, which reads sprite alpha and
tells you which tiles a sprite actually paints, rather than which tiles its
footprint claims.

---

## 1. A reason to go to the military field

### What the game says today
Ivar sends you to fix the camp's aerial. The aerial picks up a loop. The loop
comes from the north. You follow it because it is there.

> *"Something is still transmitting, from the night it happened, on a machine
> nobody told to stop. It is north of here."*

That is atmosphere, not a reason. Nothing of the player's is at stake, nothing of
the camp's, and there is nothing at the far end the player wants before they set
out. A player who does not care about a noise has no reason to walk 40 tiles into
a place that kills them on sight.

### What it should be
**The loop is a recall order, and it is why the machines keep coming.**

Ivar has the aerial up and can finally hear the whole ring. What he works out is
not a mystery — it is a cause. Airfield 12 has been transmitting a standing
muster since the night it happened, and every wandering unit in the ring is
walking toward it. Candlelight sits on the path. That is why the camp has been
bleeding people in ones and twos for a year, and why Wren stopped going out.

So the reason to go north is: **shut it up, or the camp keeps getting hit.**

It is the camp's problem, it is now the player's problem because they live there,
it explains the drip of machines the player has already been fighting since the
junkyard, and it is the game's own title.

**AND IT ONLY FIXES THE FRINGE.** (Laurens, on approval.) Airfield 12 is *a*
base of operations, not *the* one. Cutting its beacon stops what walks into the
ring — it does not stop anything anywhere else, and nobody in the game is
allowed to say otherwise. Ivar must say so out loud: this buys the camp its own
district back and nothing more. That keeps the ending honest, keeps the rest of
the map worth building, and stops the player believing they have won a war by
switching off one rack in one tower.

**And a selfish reason for the same trip.** Wren tells you, before you go, that
Field 12's ordnance bunker was never opened — it is the only armoury inside the
ring that nobody has been into. The bunker and its chest already exist and hold
the best loot on the field. Say so *before* the walk, so the player leaves
wanting something, not just curious.

### Built as
- **Ivar** gets the deduction, at the map table, once the aerial is mounted.
- **Wren** gets two lines: the bunker (the want) and the warning (the fear). Her
  warning already exists; the want does not.
- `northbound` and `theWreck` objective `detail` / `log` rewritten to carry the
  cause instead of the curiosity.
- **A visible consequence.** With `Quests.q3 === 'done'` and the beacon cut, the
  Fringe's roaming machines thin out, and Ivar and Wren both have a new line
  about it. The reason has to pay off or it was never a reason.

---

## 2. Pressing M has to show where the next quest is

### The fault, exactly
`js/game.js:4273` —

```js
if (mobj && Areas[mobj.area] && mapThumbs[mobj.area]) {
```

The objective marker is drawn **only if a thumbnail exists for its area**, and a
thumbnail only exists for ground you have actually walked (`js/game.js:396–406`,
deliberately — the map's one promise is that it shows nowhere you have not been).

So at the exact moment you need directions — *"follow the signal north"*, *"get
to the top of the tower"*, both pointing at ground you have never stood on — the
map draws **nothing at all**. Verified: with the objective at `field12` and no
thumbnail, `MapUI.questHit` is null and no dot is painted.

### The fix, without breaking the map's promise
The map still must not draw unexplored ground. But it can point at it.

1. **An edge chevron.** When the objective's area has no thumbnail, clamp the
   quest marker to the boundary of the known world in the objective's direction
   and draw it as a chevron with a distance and a bearing — *"NORTH · 240m"* —
   over fog, not over a revealed map.
2. **A lead line.** A dotted line from the YOU marker to the objective marker
   whenever both are placed. Unmissable, costs nothing.
3. **The objective column names the place even when it is unknown**: "SOMEWHERE
   NORTH OF THE RING" rather than a blank.
4. **A HUD chevron during play**, at the screen edge, pointing at the objective —
   so the player does not have to open the map to know which way to walk.

---

## 3. More ways through, and harder the nearer the gate

### What is there today
The apron fence runs the full width at y15 with **exactly two** gaps: x19–21 at
the west end and x78–80 at the east. The vehicle gate is at x58. Measured, each
gap is swept by exactly one camera:

| gap | distance from the gate | cameras that can see it |
|---|---|---|
| west, x19–21 | 37 tiles | the one at 20,13 |
| east, x78–80 | 20 tiles | the one at 79,13 |

So the complaint is right twice over: there are only two ways through, and both
are watched.

### Five ways through, graded by distance from the gate
The rule Laurens asked for — *the closer to the entrance, the harder* — is a good
one, because it makes the loud way in cost you and rewards a player who walks.

| | crossing | x | from the gate | how you get through | difficulty |
|---|---|---|---|---|---|
| **A** | **the drain culvert** | 56–57 | **2** | crouch-only, under the fence — surfaces inside the tower camera's arc, and a patrol leg crosses the mouth | hardest |
| **B** | **between the bowsers** | 46–48 | 11 | squeeze between two fuel bowsers where two cones cross | hard |
| **C** | **the flattened section** | 33–36 | 23 | a hulk went through the wire; wide opening, one camera on a slow sweep | medium |
| **D** | the east service gap | 78–80 | 20 | as now | medium |
| **E** | the west gap | 19–21 | 37 | as now, the quiet end | easiest |

A is a new mechanic — a **crouch-only passage** — which the game already has half
of (crouch narrows what sees you, `WATCH.mpRangeCrouch`). It becomes a real
choice: go straight in on your belly under two cones, or walk twenty minutes.

### What that costs
- a culvert prop (mouth + a crouch-gated tile band) and a flattened-wire section
- **two or three more cameras**, and two re-sited, so the near crossings genuinely
  are the hard ones — otherwise the grading is a label, not a fact
- re-measure: sealing **all five** must still leave 0 tiles reachable north
- the route picture regenerated

### BUILT — and measured, 2026-09-09
Nine cameras, five crossings, and the grading is a fact rather than a label:

| crossing | from the gate | watched |
|---|---|---|
| culvert *(crawl)* | 1 | **78%** |
| bowser squeeze | 11 | **66%** |
| east service gap | 20 | **24%** |
| flattened wire | 22 | **21%** |
| west gap | 37 | **3%** |

"Watched" is the fraction of a full sweep in which **no lane exists** — no x in
the opening with every exposed row unlit at the same instant. That is what a
player times a run against.

**Three of my own measurements were wrong before this held up**, and each one
would have graded the field backwards:
1. The first metric asked "is any tile of the gap lit". A wide sweep across a
   three-tile opening always has one tile lit, so it scored wide openings as
   *harder*. A player needs a clear lane, not a clear tile.
2. The second modelled the sweep as one shared sine. The real sweep eases,
   **holds at each end** (`camSweep*2 + camHold*2` = 6s) and every camera starts
   on its own random offset. The harness drives `updateWatch` now and reads the
   live `aim` — it measures the game rather than a model of it.
3. The monotonic check was **vacuous**: the destructured `rows` shadowed the
   results array, so it ran over an empty list and reported "grading holds:
   true" no matter what the numbers were.

And moving the bowsers to flank the squeeze **put one camera inside a fuel tank
and another inside the helicopter** — both went blind, which in play reads as a
cone that simply is not there. Camera sites are checked against `solid` at build
time now, and `camtest` asks whether a camera sees anything *over its whole
sweep* rather than at one sampled instant.

**The culvert** is a new kind of tile: `crawlable`. It stays solid in `isSolid`,
so no patrol paths through it, no cone sees down it and `findSafeSpot` will not
put you in it — and `playerCanStand` lets a crouching player through. `tryMove`
dispatches on whether the mover is the player, so knockback and shoves obey the
same rule as walking. It says what it is, once, the first time you pass it.

**The route is 44 steps now**, down from 72, because the near crossings exist —
and the solver takes the flattened wire at 22 tiles rather than either near one.
That is the trade working: the short way in is there, and it is the watched one.

---

## 4. There is still a plane in a house — and here it is

Measured by sprite alpha, not by footprint:

| sprite | at | paints into |
|---|---|---|
| `acJet` | 8,24 | **2 tiles** inside the pen wall at (6,24 2×4) and **3 tiles** inside (12,24 2×4) |
| `acTransport` | 21,10 | **1 tile** inside the squadron block (10,3 12×6) |

The interceptor's wings are drawn into **both arms of its own blast pen**. The
footprint checker never saw it because footprints do not overlap — the *sprites*
do. That is the whole class of bug, and it is why "there is still a plane in a
house" survived a check that reported clean.

**Fix:** re-site both, widen the pen's mouth, and **add the painted-tile test to
`check.js`** so the class cannot come back.

---

## 5. Everything else that looks wrong

Found by eye, on screenshots, and each one is real:

| | what | why it looks wrong |
|---|---|---|
| a | **the blast pens** | three windowless sheds *with roofs*. A blast pen is an open-topped U of thick wall — it must not be a `makeBuilding` volume |
| b | **the tanks** | green loaves. Turret too small, barrel invisible end-on, no tonal separation between track, hull and turret |
| c | **the helicopter's mast** | drawn as a detached pole floating above and left of the body |
| d | **the apron fence** | runs straight across the helipad and its markings |
| e | **the grit patch round the tower** | a flat tan polygon with a hard amber outline lying on the tarmac — reads as a stain or a hole |
| f | **cacti and scrub on tarmac** | the scatter pass puts desert plants on the apron and in the vehicle park. They belong on sand |
| g | **camera posts inside vehicles** | a post shares a tile with a tank hull and draws in front of it |
| h | **the radar dish** | a flat grey ellipse on a stick — a lollipop, not a dish |

**And a sweep, not a list:** run the painted-tile audit over *every* prop pair on
the field, not only the hardware, and fix what it returns. The list above is what
six screenshots caught; the audit will catch the rest.

---

## 6. The boss fight — why it is easy, and what to do instead

### Why it is easy
Read honestly out of `js/provost.js`:

- **Docked, it is bolted to a cradle and hittable from any angle**
  (`provostVulnerableFrom` returns true for the whole of `dock`). It sweeps a
  fixed sine and fires only when you are inside a 0.42 rad cone. So you stand
  outside the cone and empty a magazine into it. There is no phase-one fight.
- **Loose, its one rule is "only from behind"** — and it walks at 1.55 t/s and
  turns at 2.2 rad/s against a player who moves about 4 t/s. Circling behind it
  is free. **The rule that is meant to be the challenge is the easiest thing in
  the fight.**
- It stops at 2.2 tiles, so it never reaches you.
- 220 hp against a rifle at 20 a round is **eleven hits**.
- **Nothing in the room takes part.** The monitors, the consoles, the breaker and
  the rack are scenery.

### What it should be
The area's rule is *do not be seen*. The boss should be that rule made into a
fight — not a health bar with a facing condition.

**THE PROVOST — three tells, one room, and the swarm always at the door.**

1. **It is the network.** While it lives, it sees through the field's cameras:
   it knows where you are even when you are out of its own cone, and it comes.
   To blind it you break the **four monitor banks** — props that already stand in
   that room. Each bank you smash narrows its cone, slows its turn and drops its
   walk. That gives the player something to do that is not shooting the boss, and
   it makes the room the fight.
2. **The amber opens on the recoil.** Instead of "shoot it in the back", the
   plate cracks for ~0.8 s after each burst. *What glows amber can be hurt* — the
   game's own rule, turned into a window you can see and time. You have to be
   close enough to punish and far enough not to be in the burst.
3. **Its cone is the loss condition, not its health bar.** Held 1.2 s and the
   swarm comes through the door. That already exists and it is the right idea —
   but today you are never in the cone, because it never hunts. With the cameras
   feeding it, you will be.
4. **Three phases, each with a tell:**
   - **Docked** — cannot move, cannot be hurt *(it is armoured to the room; this
     is what replaces the free magazine)*. It sweeps and fires bursts. You break
     monitors and stay out of the light.
   - **Torn loose** at the last monitor — the 0.75 s stand-up, then it hunts.
   - **Blind** at half — it loses the cameras, plants itself, sweeps the whole
     room fast on a wide continuous beam. The amber stays open, but reaching it
     means crossing the sweep.
5. **The room can help you.** The `breaker` prop already exists: throwing it
   blacks the room for four seconds. It loses you completely — and so do you, in
   the dark, with its eye the only light.
6. **Numbers:** hp 220 → 260, of which only about 55% comes off with bullets — the
   rest comes off with the monitors. Walk 1.55 → 2.35 when it has you. Turn 2.2 →
   3.4 with four banks up, 1.4 with none. Burst 3 → 5 rounds at 9 → 7 damage:
   more shots, less each, so a mistake costs a step rather than the run.

That gives a fight that is about staying out of a light in a room whose furniture
is the puzzle — the area's whole lesson — and nothing like the Compactor.

---

## Order of work

1. **5 + 4** — the audit sweep and the plane in the house. Nothing else can be
   judged while the field looks wrong.
2. **3** — the five crossings, then re-measure and redraw the route.
3. **6** — the boss.
4. **1 + 2** — the reason, and the map that points at it. Last, because the
   objective lines depend on what 3 and 6 turn out to be.

Every stage ends the way they all do: the suites green, screenshots taken, the
docs updated, committed.
