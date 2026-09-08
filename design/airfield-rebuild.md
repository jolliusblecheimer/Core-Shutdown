# AIRFIELD 12, REBUILT — smaller, military, and watched

Written 2026-09-07 in answer to *"rebuild it but make it a bit smaller — an
airfield isn't as big as a village. Put focus on the military aspect. Add a
function where the main character gets to know he can't get spotted by military
robots; any time you get caught there is a cutscene of military droids swarming
and killing you. Make the Field 12 boss fight one of these droids in the
camera/control room. Add cameras with cones that show what they see. There is no
option to fight these patrolling military droids — it just enters the cutscene."*

---

## 1. THE SIZE

| | was | is |
|---|---|---|
| Field 12 | 96 × 72 = **6,912** tiles | 64 × 48 = **3,072** tiles |
| against the Fringe (30,000) | 23% | **10%** |

Less than half. The runway still runs 55 tiles, which is the one thing that has
to stay long or it stops being a runway. Everything else comes in around it.

The id stays `field12`, so no save moves areas. **Every coordinate inside it
changes**, which is the one real cost of this and is handled in §8.

---

## 2. THE RULE THIS AREA IS BUILT ON

The game already has one damage language, established by the Compactor and used
a second time by the sentry guns:

> **What glows amber can be hurt. Dull plate cannot.**

Military police units are **never amber**. That is not a special case bolted on
to make them invincible — it is the rule the player already knows, applied
honestly. Every round fired at one rings off dull plate, exactly as a round
fired at a sleeping sentry does.

So *"there is no option to fight them"* is not a message on the screen. It is
the thing the player already learned in the first hour, arriving somewhere it
has no exception.

And it is why the boss works: **the Provost is the one that is opened up.**

---

## 3. THE WATCH — the new system (`js/watch.js`)

Two kinds of watcher, one detection model, one outcome.

### 3.1 Cameras — fixed, sweeping, and you can see what they see

| | |
|---|---|
| Where | On masts, hangar corners, the gate, the tower |
| Cone | **Drawn on the ground, always visible.** 60°, 11 tiles |
| Behaviour | Sweeps between two bearings on a fixed period, then pauses at each end |
| Broken by | Cover — the same `losClear` every raider and droid in the game uses |
| Can be shot | **Yes.** A housing and a lens, not armour |
| But | The shot is *loud*. Every MP within 22 tiles walks to where the noise was and stays in that area. You trade a camera for a droid parked in your way |

The cone is the whole point of the feature: it turns the field into something
you read and plan against instead of something that surprises you.

### 3.2 MP droids — patrolling, and unkillable

| | |
|---|---|
| Cone | 70°, 9 tiles standing, **4.5 crouched** — crouching is the answer, as everywhere else |
| Behaviour | Walk a route, pause at each waypoint and sweep, then move on |
| Shot at | Sparks, a ricochet, **no damage** — dull plate, and the first time it happens the player is told once in a thought |
| Noise | Gunfire within 22 tiles pulls the nearest one to investigate |

### 3.3 Detection — one meter, and a moment to get out

```
Watch.seen   0 ─────────────────────► 1     full = the swarm
             fills in 0.85 s while any cone holds you
             drains in 1.6 s when none does
```

**Not instant.** Instant detection at 4 tiles a second is a coin toss, not
stealth — you would be killed by a cone you never had a frame to see. 0.85
seconds is long enough to dive back behind a blast pen and short enough that it
never feels survivable. The cone turns **amber while it fills and red when it
is full**, and the eye indicator the scrappers already use carries the meter, so
the feedback is in a language the player has.

Crouched, the cones are half as long. That is the skill.

### 3.4 The swarm — what "caught" means

`triggerSwarm()` → the screen goes to letterbox, the player loses the sticks,
and:

| beat | |
|---|---|
| 1 | The cone that caught you goes red. One tone. Everything stops |
| 2 | **Six MP units come in from off-screen**, from every edge, converging |
| 3 | They close. No shooting animation, no fight — they arrive, and the screen goes to black between one frame and the next |
| 4 | Death, and the ordinary respawn the game already has |

**Unskippable the first time; skippable ever after** (`Watch.swarmSeen` in the
save). A death cutscene you cannot skip is one you come to hate on the second
run — cine.js says exactly that about the prologue and it is right.

---

## 4. HOW HE FINDS OUT

Three layers, and the important one is shown rather than said.

| | | |
|---|---|---|
| **1. Wren warns you** | at the Lamp, before you ever go | *"Don't let them see you. That's the whole of it. There's no fighting them — I've watched people try."* |
| **2. THE FIRST SIGHT** | scripted, on first entering the field | You come up to the gate and the camera holds. Across the wire a scavenger breaks cover and runs. Six units converge from three directions and it is over in four seconds. **No text.** Then you have the sticks back, and there is a body out there you can search |
| **3. The body, and the order board** | when you go and look | A scavenger's note, and one line on the standing order board |

Layer 2 is the one that teaches. It costs the player nothing, it cannot be
missed, and it says the whole rule in four seconds without a word of dialogue.

---

## 5. THE BOSS — THE PROVOST, in the control room

Military police call their commander the provost. He is in the room with the
monitors, because that is where you would put him.

**The control room** is an enterable volume in the tower: monitors round three
walls, each showing a camera feed, and a cradle in the middle.

| Phase | | |
|---|---|---|
| **Docked** | 100% → 50% | It is **in its charging cradle with the back plate open — amber, and therefore mortal.** It fires from the cradle and sweeps its own cone across the room. **Stand in that cone for 1.2 s and the swarm comes for you, in here, and you die.** The room is small. You keep moving |
| **Loose** | 50% → 0 | It tears out. Now it walks — and the open plate is on its **back**. You have to get behind it while it turns, which is the Magistrate's lesson at a higher tempo |
| **Down** | | Every monitor goes dark. **Every camera on the field dies and every MP unit stops.** The field becomes a place you can walk |

| | |
|---|---|
| HP | 220 — about thirteen rifle rounds, all of which have to land on the back |
| Drops | **The shield plate**, which is S3 |
| Saved | `Quests.provost`, so it stays dead |

### Why the boss is where it is
The camera room is the only place on the field where killing something is
allowed, and the reason is visible: it is plugged in. It is the single exception
to the field's rule, standing in the room the rule is administered from.

---

## 6. WHAT LEAVES

| | Why |
|---|---|
| **The HHD recovery detail** (4 squads, 12 droids) | Two kinds of droid — one you fight, one you cannot — muddies the only rule this area has. The field is MP territory now, and nothing on it can be fought except the Provost |
| **S3's Magistrate** | Followed the detail out. **S3's shield plate comes off the Provost instead**, which gives that side quest a climax it never had |
| **Two of the five sentry guns** | The field is half the size. Three left — and they stay, because a sentry lights amber and can be killed, which is the contrast that keeps the MP rule sharp |

---

## 7. WHAT STAYS — the quest layer, re-placed not removed

Every quest survives the shrink; only coordinates move.

| | new home |
|---|---|
| **Q3** · the wreck core → the slate | the drone wreck, south apron |
| **S1** · Wren's pack | Hangar 2 |
| **S2** · three tapes | the tender shed · a blast pen · the control room |
| **S3** · the shield plate | **the Provost** (was the Magistrate) |
| the duty officer + the bunker key | squadron block |
| the ordnance bunker + the gun-camera optic | south-east, still the only shut door |
| the standing order board | squadron block, plus one new line |

---

## 8. THE SAVE — the one real risk

Everything in Field 12 moves. What that touches, and what answers it:

| | |
|---|---|
| A live save standing in the old Field 12 | `findSafeSpot` (radius 44, skips burning) rescues them; `safeSpawn` is the backstop. Both exist and are tested |
| Quest **state** | Held in `Quests` as flags, not positions. Already-done quests stay done |
| Quest **props** | Re-placed. A player mid-quest finds the prop at its new home |
| Dead sentries / droids, keyed by position | Stale keys, harmlessly ignored |
| `MILESTONE_GRANTS` | Unchanged — `f12-guncam` and `f12-braced` still ask `Quests`, not geometry |
| New state | `Quests.provost`, `Watch.swarmSeen`, merged onto `QUEST_DEFAULTS`, so a save without them loads |

---

## 9. BUILD ORDER

| | | |
|---|---|---|
| **W1** | **The field** — 64×48, perimeter, runway, buildings, hardware, the quest layer re-placed | M |
| **W2** | **`js/watch.js`** — cameras, cones on the ground, MP units, the detection meter | L |
| **W3** | **The swarm** — `triggerSwarm`, the cutscene, death, the skip rule | M |
| **W4** | **The teaching** — Wren's lines, the first sight, the body, the board | M |
| **W5** | **THE PROVOST** — the control room, two phases, the cone, the plate, the network going dark | L |
| **W6** | **Verification and docs** | M |

---

## 10. VERIFICATION

| | |
|---|---|
| Two ways in, and no others | flood fill with both sealed → 0 |
| Nothing inside geometry, nothing hidden, nothing stacked | `audit2` |
| A round fired at an MP does **zero** damage; at a docked Provost, damage | new `watch.js` harness |
| The meter fills in a cone, drains out of it, and crouching halves the range | same |
| The swarm fires exactly once per detection and the player respawns | same |
| First swarm unskippable, later ones skippable | same |
| The Provost's phases, the back-plate rule, and the network going dark on its death | same |
| Every quest still completable end to end | `quests` |
| A v1 save walks into all of it | `smoke` |
| Frame cost with every camera and MP live | `cost` — measured on the field, not in the quiet |

---

## 11. BUILT

### The field
64 × 48 = **3,072 tiles** (was 6,912), **2,159 walkable**, 2,132 of them reachable
from the vehicle gate. Both openings sealed → **0 tiles reached from outside**:
still exactly two ways in.

Every quest survived the shrink — the wreck core, Wren's pack, all three tapes,
the duty officer, the order board, the bunker and its key — and `quests` runs the
whole chain end to end on the new coordinates.

**Two placement bugs the harnesses caught, both of the same kind: a solid thing
standing on a tile something else needed.**
- The guard post's west wall stood on **31,44** — the tile the gate entry *and*
  `safeSpawn` both land on. The field was unreachable from its own front door.
- Then the gate **camera post** was put on the same tile and did it again.

Both are now covered by a standing check in `ptest.js`: no spawn tile, exit zone
or entry point in any area may be solid. That check found three more hits and all
three were correct behaviour (the junkyard gate is shut until it is opened; two
zones are one-tile hatches), so the check now understands gated exits and treats
a trigger zone as a rectangle rather than a point.

`openBlastDoor` was still cutting its doorway at **30..31, y53** — the bunker's
address on the *old* field. It threw on a map with no row 53, and would have
unsealed bare apron. It reads the door prop's own footprint now.

### The watch
`js/watch.js`. Five cameras, four MP patrols, one meter.

| Verified | |
|---|---|
| 40 rounds and a melee swing into one MP | **it has no `hp` field at all**, and is still on the field |
| the round is consumed | true — it cannot pass through and hit what is behind |
| and it goes to look | true: being shot is a noise, and investigating it is the answer |
| 0.5 s standing 3 tiles into a cone | meter 0.00 → **0.61** |
| crouched at 7 tiles | drains to **0.00** — crouching halves the range |
| standing again at 7 tiles | rising again |
| held in a cone | **the swarm, at 0.85 s**, six bodies converging |

**The cones are lit at all times.** The first pass faded a cold cone to the
sentries' 0.07 alpha and on wet tarmac at night it was invisible — which took the
whole feature away, because *the cone you plan against is the one that has not
seen you yet*. They carry a drawn edge now so the boundary is a line you can
stand just outside of.

### The swarm, and the first sight
`updateCine` and `drawCineOverlay` were reachable **only from the prologue
branch**. A cutscene fired from the world started and then never advanced a
frame, with no letterbox and no fade. Both run during play now, the world freezes
under them, and the HUD stands down — the prologue's own rule: *a letterbox with
a health bar in the corner of it stops being a letterbox.*

The six start **9 tiles out, not 15**: at zoom 1.45 the view is about seven tiles
wide, so from fifteen they spent the whole beat off-screen and arrived in the last
half second — an empty frame, and then you were dead.

First swarm **unskippable**; every one after it skippable, and the skip prompt is
already gated on the same flag.

### The Provost
| Verified | |
|---|---|
| docked, shot from the front | 220 → 200 |
| docked, shot from behind | → 180 — the plate faces the room |
| crossing half | `dock` → **tear** → **loose** |
| **loose, shot from the FRONT** | **95 → 95. Nothing lands.** |
| **loose, shot from BEHIND** | 95 → 75 |
| killed | network down, every camera blind, `Quests.provost` = dead, **the shield plate for S3** |
| after a rebuild | still dead, network still down |

**S3 runs end to end off the Provost** — Oz asks, the plate comes off the boss,
the tarp comes down and the steel wall goes up.

Two art faults found by looking rather than by measuring: the amber plate was
16×14 on a 32-wide body and **swallowed the machine** (you could see the weak
point and not the thing it was in — 10×8 now), and the cradle stood two arms up
either side so the boss disappeared into his own furniture (a flat floor socket
now, and he stands clear above it).

The boss bar is gated on **being in the room with him**. It used to hang across
the top of the screen from the vehicle gate, 36 tiles away, through the objective
line — and while any boss bar is up the objective row now stands down, because
both are drawn on the same row and there is only one thing to do anyway.

### Measured
| | |
|---|---|
| tiles | 6,912 → **3,072** |
| walkable | 5,724 → **2,159** |
| fightable enemies on the field | 12 droids + 5 sentries → **3 sentries and one boss** |
| frame cost | 13.6–14.8 ms → **9.8–11.0 ms** |

`smoke`, `quests`, `sentry`, `audit2`, `wtest`, `ptest` and `f12cost2` all green,
no console errors, network clean. Screenshots taken at the gate, the runway, a
cone, the control room in both phases, and mid-swarm.

---

## 12. THE FIX PASS — 2026-09-08

Six changes asked for. Five built; the sixth needs the layout picture, which did
not arrive with the message.

### Why nothing worked — four bugs, all found by running the real loop

The earlier harness poked `updateWatch` with forced state and passed. That is
exactly the test that passes while the feature is broken in play. Driving the
actual `update()` loop found all four in twenty minutes:

| | |
|---|---|
| **The boss zeroed the whole field** | `updateProvost` wrote `Watch.seen` directly on every frame, in both branches, and runs *after* `updateWatch`. A Provost standing in a room thirty tiles away reset the field's detection meter to zero sixty times a second. Cameras and patrols saw the player perfectly well and the meter could never rise. It keeps its own counter now and the HUD takes the larger of the two (`seenLevel`) |
| **No camera had ever seen anything** | A camera post was a solid tile, so the line of sight cast from its own centre started *inside the thing it is bolted to* and was blocked by it. All five. The lens sits a tile clear of the mount now (`camEye`) |
| **Two of four patrols never moved** | One waypoint was inside the transport, another inside the ordnance bunker, and a third route ran along the inner block line. A patrol that cannot walk cannot see you, so half the field's threat quietly did not exist |
| **Camera posts blocked the field** | Solid camera tiles sealed the gate approach once and then stood in the **middle of the runway**, blocking a patrol's path *and* its sight down the runway it patrols. **A camera is no longer solid at all** — three bugs, no benefit |

### 1. Cameras do not shoot; being seen calls the swarm
Already true of cameras — but **the three sentry guns were the things firing**,
and being shot at by a gun while being told the rule is *do not be seen* teaches
two rules at once. They are gone. **Nothing on this field fires a shot.** What
used to be a gun at the gate is a camera at the gate, and what a camera does is
call the swarm.

### 2. Cones stop at walls
`rayReach` clips every ray at the first solid tile, and **the drawing and the
detection call the same function** — so the shape on the ground is exactly the
ground that can see you. Drawn through a hangar it was a promise the game broke
in both directions: it looked dangerous where it was safe, and safe nowhere.

Cameras were also re-sited: the old set was mounted on building corners looking
*at* the buildings, with measured reaches of 0.3, 1.3 and 1.8 tiles. Every one is
now aimed down a corridor the player walks, and `camtest` prints all seven
reaches so it cannot silently regress. Still **none at the west breach**.

### 3. The patrols are armed
They carry a **rail lance** — coil stack, long emitter, a charge line down it,
and every light on it Core blue. Nothing warm lives on an MP, because warm would
mean you could hurt it.

### 4. The recording is at the top of the tower
Not in a drone on the runway. **`towercab` is a real area** — glass on three
sides, the racks along the back — reached only by the stair in the control room,
which means getting it means crossing the field. The wreck stays as scenery.
The objective now reads *Get to the top of the tower.*

### 5. THE ARCHIVIST — the mini-boss on the rack
One room, one mechanic, and the mechanic is the field's own rule:

| | |
|---|---|
| **plugged in** | jacked into the rack, port open, **amber and mortal**, cannot move. 3.4 s |
| **off the rack** | pulls the jack, dull plate, nothing touches it, comes straight at you. 6 s |

So it is a clock, not a duel: survive the loose phase, punish the plugged one.
120 hp. Pull the recording while it is still jacked in and you are told why you
cannot. Verified: plugged 120→100, loose 100→100, the cycle runs
`plugged → pull → loose → jack → plugged`, and it stays dead across a rebuild.

### Two more faults, caught by looking rather than measuring
- **The stair bounced you straight back.** The cab's entry sat inside its own
  exit zone, and `checkExits` arms after 2.5 s whether or not you have stepped
  clear — so arriving and standing still to look round sent you back down. Both
  ends land clear now, and `ptest` checks every entry in the game against every
  destination's exit zones.
- **The scatter pass was dressing the interiors.** Crates and barrels landed
  inside the hangars, the bunker and the control room — one on the exact tile
  the stair puts you down on. Interiors are the `ROOFS` rectangles and are now
  excluded.
- The area-name banner draws at y24, straight through every boss bar and its
  status line. It moves down while a boss bar is up.

### Measured
| | |
|---|---|
| things on the field that shoot | 3 sentry guns → **0** |
| cameras that can see | **0 of 5 → 7 of 7** |
| patrols that move | 2 of 4 → **4 of 4** |
| frame cost | 9.8–11.0 → **8.4–9.4 ms** |

### STILL OUTSTANDING
**The whole-map layout.** The picture referred to in the request did not arrive —
there was no image attached and nothing landed in the repo. Everything above is
independent of it; the layout itself is not started.

---

## 13. THE LAYOUT — built to the reference, 2026-09-08

The picture arrived. It changed the **shape**, which turned out to matter more
than the size.

### An airfield is a strip, not a square
| | |
|---|---|
| was | 64 × 48 — right size, wrong shape |
| is | **96 × 36 = 3,456 tiles**, a 3:1 strip |

**The runway runs the whole long axis and everything built stands on ONE side of
it.** The other side is open desert. That is the reference picture's entire
composition and it is a different place to walk: a strip you cross, not a square
you wander round.

### What is on it, west to east, as in the picture
| | where |
|---|---|
| Threshold **23**, piano keys, a light prop parked off it | x5–20 |
| Squadron block (the duty officer, the order board) | x10–21, north |
| **The control tower** — the objective | x30–43, north |
| The transport on the apron | x24–32 |
| **Three hangars** in a row | x46–78, north |
| Fuel bowsers | x64–71 |
| **The helipad and its helicopter** | x79–84 |
| **The vehicle park**, three hulls | x82–92, south-east |
| Threshold **05** | x86–91 |
| Ordnance bunker · tender shed · guard post · blast pen | south side |
| Open sand, cacti and scrub | the whole south half |

New ground: **sand** and **worked grit**, so the asphalt reads as a hard black
line laid across pale desert. New sprites: a light prop, a helicopter, a fuel
bowser, saguaro cacti and scrub, the helipad marking, and the **23 / 05**
thresholds — which needed a `5` glyph the DIGIT table had never had.

### The bus
The "fuel bowsers" had always been drawn with the `bus` sprite — **a yellow
school bus, on a military apron**, the single most out-of-place object on the
field. There is a real bowser now: a tank barrel on a service-drab chassis.

### Two placement faults the harnesses caught again
- **The spawn sat inside its own gate trigger zone** — arrive, stand still for
  2.5 s, and the gate sends you back to the Fringe. Caught by the check written
  for exactly this last session.
- **Cacti and a body were growing in front of lenses.** Two cameras had a reach
  of 0.0 — one had the scavenger's body a stride in front of it, one was mounted
  *inside the transport*. Each camera's mount and the first three tiles of its
  sightline are reserved before anything is scattered, and `camtest` prints all
  seven reaches so it cannot regress quietly.

### One deliberate departure from the picture
The reference tower is tall and slender. Ours is a **14 × 9 block** because the
control room inside it is a boss arena — at the picture's proportions the
Provost fight would be a corridor. The tower reads as a control building with a
cab on top rather than a mast, and the cab is its own area either way.
The curved-roof hangar in the reference is a plain corrugated shed here;
`BUILD_STYLE` has no barrel roof yet.

### Measured
| | |
|---|---|
| walkable | 2,506, of which **2,480 reachable from the gate** |
| ways in, both sealed | **0** — still exactly two |
| cameras that can see | **7 of 7**, reaches 1.8–11 |
| frame cost | **9.7–11.6 ms** |

---

## 14. THE FIX PASS — aircraft, fence, interiors and the route, 2026-09-08

### 1. Every aircraft was drawn wrong, and all in the same way
Screen depth in this projection is **u + v**, and smaller is further away. Every
fixed-wing sprite drew its **whole wing after the fuselage**, so the wing painted
straight over the body and the aircraft read as a plate stuck on the side of a
tube. That is why they all looked lopsided.

A wing that spans the fuselage has to go down in three passes — **far half,
fuselage, near half** — and `plane()` owns that ordering now, so the transport,
the interceptor and the light prop are all built from one symmetric spec and
cannot drift apart again.

**The tank had no gun.** Its barrel is drawn out to u = 4.9 on a rig sized for
L = 4.2, so it was clipped off the edge of its own canvas and every tank on the
field was a featureless green slab.

### 2. A plane in a building
`acJetBurnt` sat at x88–93 with the inner block line at x93 — it was standing in
the fence. The transport overlapped the tower and the pen's interceptor
overlapped the pen's own arms. `check.js` compares every hardware footprint
against every building and against the perimeter, so this class is caught now.

### 3. The thing in the middle
No invisible walls — the checker found zero. What was there to see was **the
tanks with their guns clipped off** and a **yellow school bus** doing duty as a
fuel bowser. Both fixed.

### 4 & 5. The fence had no idea what it was
It ran chain-link, razor coil *and* concrete blocks along every side at once,
including **across both openings**. It has two characters now:

| | |
|---|---|
| **North and east** — the deep sides, backing onto desert | wire, with razor coil |
| **South and west** — the approach sides, where vehicles came | concrete blocks and warning boards |

and **no razor within reach of either opening**. You walk in; you do not climb
in. Razor 65 → 33, concrete 83 → 37.

### 6. Every building opens
The north buildings had been laid across the inner concrete row, which left
blocks standing inside the finished rooms. They start at y3 now, clear of it, and
all eight are enterable and reachable: squadron block, control tower, three
hangars, tender shed, guard post — and the ordnance bunker, which is reachable
the moment its door is unlocked and sealed until then, by design.

### 7. THE ROUTE — and it is a walk now
**The apron fence.** A wire line at y15, the full width of the plot, between the
runway and the apron, with **exactly two gaps** — x19–21 at the west end and
x78–80 at the east. Sealing both leaves **0 tiles reachable north of it**, so
they are the only ways through.

| | steps to the tower door |
|---|---|
| **The vehicle gate** (the loud way) | **72** — north across open runway under two cones, east to the far gap, then the whole length of the apron back west past every hangar |
| **The west breach** (Wren's way) | **45** |

That gap is the asymmetry made concrete: the quiet way is not just safer, it is
shorter, and the player who listened to Wren feels it.

The seven cameras are placed **along that route** rather than scattered: the gate
approach, the runway crossing, both gaps, the long apron run, the last stretch to
the tower door, and the vehicle park. Still **none at the west breach**. Four
patrols walk the runway, the apron, the runway's south edge and the perimeter
road. The questline is unchanged and runs end to end — it was never broken, it
was unreachable because the buildings were.

### Measured
| | |
|---|---|
| walkable | 2,540, **2,511 reachable** |
| apron fence with both gaps sealed | **0** north of it |
| ways onto the field, both sealed | **0** — still exactly two |
| cameras that can see | **7 of 7** |
| patrols that move | **4 of 4** |
| frame cost | **9.1–9.8 ms** |

---

## 15. Four more, from a real run

### 1. No robot inside a building
The patrols walked through the hangars. `mpSees` and the movement step both took
the world at face value, and the world says a hangar floor is standable — which
it is, for the player. Interiors are a different space: they are the cover the
whole stealth layer is built on, and something that can end the run cannot be
allowed to walk into your hiding place.

`inARoom(x, y)` in `js/watch.js` reads the area's own `roofs` list — the same
rectangles that fade the volume when you step inside — and:

- **an MP will not step into one.** Both axes of the movement step now require
  `!inARoom(...)`, so a patrol slides along a wall rather than through it.
- **a shot fired inside one does not call them.** `watchNoise` returns early. The
  noise radius is 22 tiles and a hangar is not 22 tiles of open air; a pistol
  fired in a closed room used to bring three patrols to the door.

Measured over **2,400 frames × 4 patrols**: zero frames with an MP inside an
interior, all four still walking their legs, and a shot fired in the control
room changes no patrol's state.

### 2. The hitboxes are the aeroplanes now
The footprint rectangle is what a sprite is **drawn** from. It was also what it
**collided** with, and an aircraft is mostly air. Measured before the fix:

| | box | solid | actually painted | empty collision |
|---|---|---|---|---|
| transport | 9×4 | 36 | 23 | **13** |
| light prop | 6×5 | 30 | 19 | **11** |
| helicopter | 5×4 | 20 | 9 | **11** |
| burnt jet | 6×4 | 24 | 17 | **7** |

Over half the helicopter's hitbox was empty sky. You bounced off a wing that was
not there.

`hardwareTiles(kind, w, h)` renders the sprite once, projects each tile centre
back into sprite space and asks the sprite's **own alpha** whether anything is
painted there. Only the tiles that are painted become solid. It is cached per
kind and size, and it can never drift from the art, because it *is* the art.

Every piece of hardware now matches its own drawing exactly. **You can walk
under a wing** — which is cover the apron wanted anyway.

### 3. The route, drawn
`design/airfield-route.png` is a plan of the field with the route on it. Nothing
on it is hand-placed: ground, collision, building footprints, the seven camera
cones and the four patrol lines are read out of the running game, and the line
itself is a Dijkstra solved over the same collision the player walks on, with
cones priced at 55 and patrol corridors at 22 against a step of 1. The pins are
snapped onto that solved line, so the picture cannot describe a route the game
does not have.

The shortest possible walk from the gate to the tower door, straight through
everything, is **72 steps**. Kept out of the cones, it is **104**, and it goes:
gate → east behind the vehicle park → across the runway → **the east gap** →
west along the apron → **the alley between Hangar 1 and Hangar 2** → behind the
hangars along the north wire → down Hangar 1's west side → the tower door → the
stair.

The east gap wins over the west one because the west approach crosses more
cone. That was not designed; it fell out of where the cameras stand, and it is
the better answer — the loud way in makes you cross the whole field.

### 4. Dying on the airstrip
Two faults, one symptom.

**`resetProvostFight` claimed every death on the field.** It tested only
`provost.active`, which is true from the moment you step through the vehicle
gate. Swarmed on the runway thirty tiles from the control room, you were dropped
at the tower door and told the thing had settled back onto its cradle. It now
tests `provostInPlay()` — off its cradle, or you in the room with it.

**And everything else went to the bed**, which for this field is two areas away
in the Fringe. An area may now name a `deathSpawn`; dying in that area uses it
instead of the last bed. Airfield 12 names the gate apron, the tower cab names
itself.

| died | wakes |
|---|---|
| mid-runway | the gate apron, inside the wire |
| at the blast pens | the gate apron |
| in the control room, fighting | the tower door — the fight retries |
| in the tower cab | the cab — the fight retries |
| anywhere with no `deathSpawn` | the last bed, unchanged |

### Also found
The quest suite's bunker check was flooding from `[31,44]` — a tile on the old
96×72 field — so `reach()` always answered false and two assertions had been
passing by accident. Pointed at the real bunker it passes honestly: shut, it is
unreachable; unlocked, it is reachable; and it stays open across a rebuild.
`openBlastDoor`'s fallback footprint was the old address too.
