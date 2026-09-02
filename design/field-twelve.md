# FIELD 12 — the next expansion, in detail

**Status: BRAINSTORM. Nothing here is built, nothing here is approved.**
Written 2026-09-02 in answer to *"start brainstorming the next map expansion,
the next area, the vibe, buildings, quests, NPCs, upgrades, all of that in
detail."*

This does not replace `design/the-road-north.md` — that document already picked
**which** area is next and mapped the route to Ring 4, and it still stands. This
is the layer under it: what the place *feels* like, what is inside each
building, who the people are, what you do there, and what you walk out with.

The expansion is **N1–N4** of the road-north build order: Q2 at Candlelight, the
north frontier, **Field 12**, and the Underpass with **the Lamp**. Ring 4 is a
separate project and is not costed here.

---

## 1. THE ONE-LINE PITCH

> Ring 5 has been a game about corridors. Field 12 is the game's first sky.

Everything built so far — the yard, the church corridor, the streets, the crypt
— is a space with something standing between you and the thing hunting you. The
occlusion system, the crouch, the enemy ghosts and the whole stealth loop assume
walls. **An airfield has none.** That is the reason to build it, and it is also
the reason it is the riskiest thing on the board.

It is not *deeper* than the Fringe — depth is Ring 4's job and the pressure
gradient must not be spent early. It is **wider and colder**: the same ring, seen
from the one place in it with a horizon.

---

## 2. THE VIBE

### The image to build toward
A runway, ninety tiles long, empty. Nothing on it but centreline paint and one
wreck under work lamps a hundred metres away. And a beacon on the tower, still
turning, sweeping a light across the concrete every eight seconds — for
aircraft that have not come in a year.

### Palette and light
| | |
|---|---|
| **Tint** | `#dfe4e6` — cold grey-blue. **The first cold tint in the game.** The Fringe is `#efe0cc`, warm dust; the yard is warmer still. Walking through the vehicle gate should feel like stepping out of a house into a cold morning, and it quietly foreshadows the Core's blue two rings early without saying anything. |
| **Time** | Pre-dawn. The palest sky Ring 5 ever gets. Everywhere else in the game is dusk or night. |
| **Ground** | Concrete, not brick or dirt: `runway` (dark, rubber-streaked at the thresholds), `apron` (paler, oil-stained), and grass verges pushing up through every crack — the overgrowth motif, but through concrete instead of over rubble. |
| **Lights, and there are only three kinds** | **1.** The tower **beacon** — a slow red-white sweep, the airfield's heartbeat. **2.** The recovery detail's **work lamps** — one harsh white pool in the middle of all that dark, which is both your objective and the thing you must not walk into. **3.** The fuel bowsers' **hazard strobes**, amber, on a lazy blink. No streetlights. Nothing warm. |

### Sound
- **The ambient drone drops out.** Every other area in the game has a machine
  hum under it. Field 12 has wind across concrete, and that absence is the whole
  point — the machines here are *visiting*, not resident.
- A loose hangar door banging, on a timer, from somewhere you cannot see.
- **THE LOOP.** The broadcast Q2 finds on the church radio is *audible in the
  world here*, faint, from the wreck's dead transmitter — and it gets louder as
  you approach it. **The loop's volume is the quest marker.** No dot required,
  and a player who turns their sound off still has the map pin. This is the
  cheapest and best idea in this document: it is a WebAudio gain on a positional
  source, the system already exists, and it makes the objective diegetic.

### THE BEACON SWEEP — vibe that is also a mechanic
The beacon turns whether or not you are there. Every ~8 seconds its light
crosses a band of the field.

**When the sweep crosses you in the open, your detection rises.** Not to full
alert — it is a light, not a camera — but it pushes the meter, and the pushes
add up if you stand still on the runway. Crouching halves it. Being in a
hangar's shadow, behind a blast pen, or under the wing of the wreck is nothing
at all.

This gives Field 12 the surveillance pressure that Ring 5 is not allowed to have
in the form of cameras (those are Ring 2's), gives the open ground a rhythm
instead of a flat risk, and gives the player something to *read and time* — the
same skill the game already teaches with patrol cones, in a new shape.

And it can be switched off. See side quest **S2**.

---

## 3. THE BUILDINGS, ONE BY ONE

`the-road-north.md` §3 has the tile map. This is what is inside them and why you
would go in.

### 3.1 The perimeter fence and the two doors
Chain-link, `Sprites.makeWallRun` with corner trims — the proven wall system,
already used for the junkyard fence. Two openings and no others, verified by
flood fill with both shut (0 tiles reachable), exactly as the church corridor
was verified.

- **The vehicle gate** (90–94, y 34) — the front door, at the head of the mid
  street. Chained. The chain is cut and lying in the grass: *somebody has been
  through, and recently.*
- **The west breach** (44, y 24) — the fence flattened outward, a path worn
  through the grass toward the spine. **This is the machines' door.** It is also
  how you leave for the Underpass without walking the runway twice.

### 3.2 HANGAR 1 — the nest
Doors south onto the apron, both open, black inside. A half-stripped airliner
nose on trestles, tool gantries overhead, a floor of aluminium offcuts that
*sound* when you walk on them.

**This is where the rust drones nest** — they come out of the **roof vents**,
not the doors, so they are never in front of you when they arrive (the rule:
enemies never pop into existence in view). Loot: almost nothing. A bench with
its tools already taken.

**Hangar 1 is a deliberate disappointment.** It is the biggest, most inviting
door on the field, it is full of teeth, and it pays nothing. One of those in
every area teaches the player that the world is not a checklist.

### 3.3 HANGAR 2 — the store
Doors jammed half-open; you squeeze through a gap, which means you cannot run
straight back out — a real decision at the threshold.

Inside: pallets, a fuel tug, racking. **A chest** (the expansion's proper one).
And in the corner, out of the wind, someone has been sleeping: a bedroll, a
cold ring of stones, and a pack that is not theirs any more.

That pack is side quest **S1**.

### 3.4 THE CONTROL TOWER — the vantage
Five storeys, the tallest thing north of the church, and **visible on the
skyline from the north cross** — which is how the player learns Field 12 is
there, before any pin, before any quest tells them.

**Its own indoor area**, the same trick as the crypt under the chancel, which is
proven and cheap. Three floors that matter:

| Floor | What |
|---|---|
| **Ground** | The stairwell is flooded and the lift shaft is open. You cannot go up from here — and being *shown* a way up you cannot take is what makes the external fire stair worth finding. |
| **Fire stair** | Outside, on the north face, reached from the perimeter road. Wren knows about it. This is the Lamp's information being worth something. |
| **The cab (top)** | Consoles, a dead radar repeater, the beacon motor turning in the corner with a sound you have been hearing since you arrived. **The gun-camera optic** is here, on a wrecked surveillance mount. **The beacon's breaker** is here. |

**And the window.** The cab is glass on all four sides, and it is the highest the
player has stood since the prologue. Out of the north face, over the viaduct,
across the rings — **the Core.**

`skyline: true` and `Sprites.cityFar` already exist and already draw the Core
crystal; only the prologue uses them. This is the second place in the game that
earns it, and this time the player is standing there in control rather than
watching a cutscene. It should be silent when it happens. No line, no bubble,
nothing. Just the room, the turning beacon, and the thing on the horizon.

*(Why the tower and not the runway: the viaduct is a five-storey ridge across
the whole north edge, so from ground level it eats the horizon. From the cab you
are above it. This also keeps the reveal somewhere I fully control what is drawn
— see Risks.)*

### 3.5 The crash tender shed
Small, at the runway's west end, on the way in from the west breach. A **crash
tender** — a fire appliance, a new prop and a good one: red, heavy, a foam
monitor on the roof, and the only warm colour on the whole field.

Inside: the last shift's crew room. A kettle. A rota on the wall. And a man who
did not get out, sat against the wall where he sat down. He has a hand-wound
dictaphone in his lap.

That is side quest **S2**.

### 3.6 The blast pens
Two three-sided revetments south of the runway. The only proper cover on that
side — and both of them have **one way in**. They look like safety and they are
a corner. The recovery detail knows it.

### 3.7 The fuel bowsers
Tankers, x 108–120. **Barrel rules, scaled up: a 3-tile blast.** The airfield's
best line is baiting the recovery detail past one. The strobes on them are a
courtesy — the game telling you where its explosives are, the same way the yard's
red barrels do.

### 3.8 The wreck
Mid-runway at (92, 23), dead ahead as you come through the vehicle gate. A news
drone the size of a car, one wing folded under it, its transmitter still
running the loop into an empty sky.

Work lamps on stands around it. A **recovery detail** — a full HHD squad plus a
Magistrate — cutting it apart from the outside in. They have not reached the
core yet. That is the only reason the slate is still in there.

---

## 4. THE NEW ENEMY — THE RUST DRONE

`GAME_PLAN.md` lists **Flyer** as one of the six role families and gives Ring 5
its version: *"Rust drone, weak pot-shots."* It has never been built. Field 12
is where it belongs, because a flyer's entire reason to exist is that **cover
does not work on it.**

### Behaviour — four states, and they read at a glance
1. **CIRCLE** — hovers at fixed altitude over its patch, drifting. Ignores line
   of sight rules: it can see over everything.
2. **MARK** — it has you. A red dot appears **on the ground under it and tracks
   toward your feet**, and a thin line runs from the drone to the dot. The
   language is already in the game: the rifle's laser box draws exactly this.
   Marking takes ~1.2s and it is the whole telegraph.
3. **SWOOP** — it dives along the marked line, fast, in a straight line it
   committed to before it started. **You dodge by not being on the line**, which
   is a spatial decision rather than a timing one, and it is legible from any
   distance.
4. **RECOVER** — it pulls up, low and slow, for ~1s at the end of the dive.
   **Its rotor housing glows amber while it recovers.** What glows amber can be
   hurt; dull plate cannot — the game's damage language, unchanged, applied to a
   thing in the air. This is when it can be shot, and it is the *only* time melee
   can reach it.

### Numbers, as a starting point
| | |
|---|---|
| HP | 25 — the weakest thing in the game after a Scrapper |
| Damage | 8 on a connected swoop |
| Speed | slow while circling, very fast in the dive |
| Comes in | **twos**, never alone, never more than four on the field |
| Drops | scrap, and low-quality tech at the usual rate |

**The threat is not the damage, it is that they ignore your habits.** By Field 12
the player has spent a whole ring learning to break line of sight and wait. A
drone does not care about the heap you are behind. That is exactly the pressure
the open ground needs, and it is why the flyer and the runway have to ship
together.

### What has to be built for it
Flagged honestly, because this is a genuinely new role and not a reskin:
- A **draw altitude** — the sprite offset up from its tile, its shadow drawn on
  the tile, and the depth sort still keyed off the tile so it sorts correctly.
- **No ground collision.** It flies over solids. `aiMove`'s obstacle probing does
  not apply.
- The **melee arc and the ghost/cover tests assume feet on a tile.** Both need to
  know about altitude, or the drone is unhittable with the pipe and invisible to
  the occlusion pass.

---

## 5. THE PEOPLE

### THE LAMP — two survivors, under the viaduct
`the-road-north.md` is firm that the Lamp is **not a camp**: a drum fire, a
tarp, one counter, no beds, no bench, no med. Its job is a shape — *this is as
far as anybody sane goes*. It needs two people and here they are.

**WREN** — young, wiry, filthy, fast-talking. The one who climbs. She has been
**inside** Field 12 and got out, which makes her the only person in the game who
can tell you anything about where you are going. She lost her pack doing it and
she will not go back for it.
- Sells: pistol rounds, rifle rounds (the last resupply before Ring 4), one snack.
- Gives: **S1**.
- Knows: the fire stair on the tower's north face, the drones come out of the
  roof vents, and *don't stand still where the light goes.*
- Register: clipped, present tense, no self-pity. *"Two of them. Out the roof.
  I was under the wing before I heard the second one."*

**OSGOOD — "OZ"** — older, heavy, keeps the fire and will not go past the fence.
He is the Lamp's ceiling: the reason it never becomes a camp.
- Sells: nothing. He keeps the fire and the kettle.
- Gives: **S3**.
- Has a radio, and has been hearing the loop for a year, and has stopped hearing
  it. When you tell him what is on the slate he does not care. *"It's a year old.
  Everything's a year old."* — the Lamp's whole philosophy in one line.
- Register: flat, kind, finished.

**Nobody at the Lamp learns the traveller's name.** Standing rule. Wren calls
him *"you"*; Oz calls him *"friend"* and means it about as much as he means
anything.

### FIELD 12 HAS NO LIVING PEOPLE, AND THAT IS THE POINT
Every place the player has been has had somebody in it — Marek, the seven at
Candlelight, the raiders, even the prologue's crowd. Field 12 has one dead man
in a shed, three tapes, and a squad of machines doing a job. **It should be the
loneliest place in the game so far**, because the next thing after it is a
tunnel, and the thing after that is a ring where it gets worse.

### IVAR, at last
`design/candlelight.md` has Ivar holding the mission slot with no mission. Q2 is
his. He is the one who wants to *answer* the ring rather than listen to it — the
only person in Candlelight looking outward — and giving him the aerial makes the
camp's one silent character its engine.

---

## 6. THE QUESTS

### Q2 · "THE LONG AERIAL" — Candlelight (main)
The story doc says Q2 is *reaching* Candlelight, which the player has already
done by the time they can be given anything. So Ivar's mission is the one that
sends them out again, and it has to end with a **bearing, not a marker**.

| Beat | Where | What |
|---|---|---|
| 1 | Candlelight | Ivar: the radio receives and cannot transmit. They hear the ring and cannot answer it. He wants the long aerial off the mast at **Aldergrove Primary**. |
| 2 | The school (108–130, 56–67) | The mast is in the playground — ground type 7, already on the map. **The school gets its pin back the day it gets a purpose.** Something is already in the yard when you arrive: an HHD squad, standing watch over nothing, which is the first hint that the machines are guarding things that stopped mattering a year ago. |
| 3 | Back to Candlelight | Up **the church tower** — the stair is already outstanding in `design/candlelight.md` §5 and this quest pays for building it. |
| 4 | The tower | Mounted, the radio catches **the loop**: a broadcast from the night of the Correction, still repeating, half-corrupted, automatic. It is coming from the north. |

Ivar does not say "go to the airfield". He says which direction it is coming
from. The player has already seen the control tower on the skyline from the
north cross. **Those two facts meet in the player's head, not in a quest log** —
and that is the whole design of this quest.

### Q3 · "THE RECORDING" — Field 12 (main)
| Beat | What |
|---|---|
| 1 | **Get in.** The vehicle gate at the head of the mid street, or the west breach off the spine. Two ways, and the one you find first changes the shape of the visit — see §7. |
| 2 | **Cross.** The runway is ninety tiles of nothing, with a beacon sweeping it and two rust drones over it. The work lamps at the wreck are visible from the gate. |
| 3 | **The detail.** A full HHD squad and a Magistrate, cutting the wreck apart. This is the hardest fight in Ring 5 and it is **not required to be a fight** — the pens, the bowsers, the wing, and the crouch are all there, and the slate can be taken while they work if you are patient and lucky. |
| 4 | **The slate.** They have been working outside-in and have not reached the core. Pull it. |
| 5 | **The footage.** Machines turning in perfect unison, in one second, across a whole city. Not a fault. A command — signed **AUTH: E.VANN**. |
| 6 | **The headache.** His head splits. He does not know why. Thought-bubble system, no explanation, no line of dialogue. **The reveal is locked to Q8** and this must not leak. |

### S1 · "WHAT WREN LEFT" — side
Her pack is in Hangar 2 where she dropped it. Fetch it.
- **Teaches**: the hangars are enterable, and Hangar 2 is the one that pays.
- **Reward**: Wren opens her full stock (rifle rounds appear), and she tells you
  about the fire stair — which is how you get up the tower for the optic. A
  side quest that unlocks the *route* to a main-quest reward, without gating it:
  a player who finds the stair themselves loses nothing.

### S2 · "THE LAST SHIFT" — side, and the best thing in the expansion
The dead man in the crash tender shed has a dictaphone. Three tapes, hand-wound,
scattered: **the shed**, a **blast pen**, and the **tower cab**.

Played in any order they tell you what Field 12 was on the Longest Night: not a
battle, a **traffic problem**. Aircraft still trying to take off. A tower crew
still reading out clearances to machines that had stopped listening. A fire crew
that stayed for the last one. It never mentions the Correction, WARDEN, or
anything the player is chasing. It is just a night shift that ended.

- **Reward**: the third tape is in the cab, next to **the beacon's breaker**, and
  the tape is what tells you what the breaker is. **Throw it and the sweep
  stops — permanently, saved.** An optional collectible whose payoff is that the
  area plays differently afterwards.
- This is the one piece of pure texture in the expansion, and the game needs one.

### S3 · "NOTHING LEFT TO CUT" — side
Oz wants the Magistrate's shield plate off the recovery detail. Not for a
weapon — for a **windbreak**. Kill it, bring it back, and he bolts it to the
Lamp: **the tarp comes down and a steel wall goes up.** The camp visibly
changes.
- **Reward**: the **recoil-braced stock** (stripped off the same Magistrate), and
  Oz's fire burns bigger.
- This is `GAME_PLAN.md` §6's *"rescued survivors improve the camp"* idea in its
  smallest possible form: one kill, one prop swap, one visible change. Worth
  proving here before Station 9 needs the full version.

---

## 7. TWO ROADS NORTH — the structural idea worth arguing about

`the-road-north.md` routes the player up the **mid street (x 92)** to the vehicle
gate, does Field 12, then leaves west along the perimeter road to the Lamp and
the Underpass. Lamp *after* airfield.

**Both roads already exist on the map.** The spine (x 30) runs north to the
underpass mouth; the mid street (x 92) runs north to the vehicle gate. So:

| If you go up the spine first | If you go up the mid street first |
|---|---|
| You meet **the Lamp** before the airfield. Wren briefs you: the vents, the light, the fire stair. You enter Field 12 through the **west breach**, at the quiet end, near the shed and S2. | You arrive at **the vehicle gate**, dead ahead of the wreck and the work lamps, with nothing told to you. You leave by the west breach and find the Lamp on the way out, and Wren's warnings land as *"yes, I know"*. |
| The **prepared** run. | The **cold** run. |

Both are complete; neither is the wrong answer; the world does not comment on
which you did. That is worth more than a linear ordering, it costs nothing to
build — the two entrances are already in the plan — and it is the first time
this game has offered a real choice about *how* to approach something.

**Recommendation: build it this way, and do not signpost the spine.** The sign
trail points down the mid street; the spine is something you find.

---

## 8. WHAT YOU WALK OUT WITH

Parts are **found or looted, never sold at the bench** (Laurens, 2026-08-21).
Both slots already hold a part, so these are **alternatives, not additions** —
the bench stays a set of choices rather than a pile.

| Thing | Slot | Where | What it does | Why here |
|---|---|---|---|---|
| **Gun-camera optic** | optic | Tower cab, off the surveillance mount | The last thing you hit stays **outlined through cover for ~4s** | The runway loses targets to *distance*, and the drones break line of sight by flying. The laser box (the other optic) answers walls; this one answers space. |
| **Recoil-braced stock** | stock | The recovery detail's Magistrate — **S3** | Tighter burst grouping | Pairs with the burst regulator, so the two barrels finally have genuinely different best builds. The padded stock (the other) is about reload speed; this is about accuracy. |

Both are unique keepables, so **both go in `MILESTONE_GRANTS`** (rule 7): a live
run that has already cleared Field 12 when this ships is handed them on load,
once, through the ledger. Neither is a consumable and neither ever will be.

**Not a part, but an upgrade:** the beacon breaker (S2). And **Wren's rifle
rounds** — the last place to buy them before Ring 4, which is the resupply the
Sprawl's difficulty assumes you took.

**No armour.** Armour is Ring 4's, decided, and Field 12 must not quietly break
that (`design/progression-gear.md`).

---

## 9. BUILD ORDER AND SIZE

Folding this into `the-road-north.md`'s N1–N4:

| | Phase | Ends when | Size |
|---|---|---|---|
| **N1** | **Q2** — Ivar's mission, the school mast, the church tower stair, the loop, the school's pin | You have a bearing north | S |
| **N2** | **The north frontier** — viaduct along y 3–9, airfield fence, tower silhouette, mid street and spine extended, both openings | You can walk the whole band. *Verify: flood fill = 0 with both openings shut; the map edge is unreachable* | M |
| **N2.5** | **The rust drone** — altitude, shadow, no ground collision, melee reach, the four states, the ghost/cover tests | Two drones over the empty band are a fight worth having | **M, and it is a new role — do not fold it into N3** |
| **N3** | **Field 12** — runway, hangars, pens, bowsers, shed, the wreck, the recovery detail, the beacon sweep, Q3 | Q3 is completable | **L** |
| **N3.5** | **The tower interior** + the optic + the Core on the skyline + S2's third tape | You can stand in the cab and see the Core | S |
| **N4** | **The Underpass** — new area, the Lamp, Wren and Oz, S1, S3, the dark seam | You can walk into Ring 4 and back | S |

**One hard dependency, from `design/enemies-bosses.md`:** Bo's rifle repair must
be working before N3 ships. The pacing assumes you reach the open city with a
pistol and a broken rifle — and a pistol is not an answer to an open runway with
flyers on it.

**Prototype first, in this order:** twenty tiles of runway paint (the shear), one
rust drone over the existing Fringe, and the beacon sweep against the existing
detection meter. All three are cheap, all three are the things most likely to be
wrong, and all three can be looked at inside a day.

---

## 10. RISKS, named before they bite

- **The runway is the largest sheared surface ever attempted here.** Ninety
  tiles of centreline, threshold bars and two-digit numbers, flat on an iso
  floor. THE ANGLE RULE at scale. **Build twenty tiles and look at it** before
  building the other seventy. Flat rectangles pasted on an iso floor is the
  single most common visual bug this project has ever had.
- **Open ground fights the engine.** Occlusion cover, the player fade and the
  enemy ghosts all key off things standing in the way, and on a runway nothing
  does. Field 12's danger has to come from *sightlines*, which probably means a
  per-area sight-radius multiplier — a knob that does not exist yet.
- **The flyer is a new role, not a reskin.** Altitude, no ground collision,
  melee reach, and the cover tests that assume feet on a tile. It has its own
  phase above for exactly this reason.
- **The beacon sweep is a new input to detection**, which is the most carefully
  tuned system in the game. It must be additive and small, it must be nothing at
  all under cover, and it must be *visible* — if a player cannot tell why their
  meter moved, it is a bug however it was intended.
- **A fourth indoor area** (the tower) after the crypt and Candlelight. The
  pattern is proven, but each one is another `world` offset on the map and
  another thing the map's area labels have to not collide with.
- **The Core on the horizon could be a let-down.** It is the second time the
  player sees it and the first time they choose to. If the cab's window is a
  200-pixel band with a small crystal in it, it will read as wallpaper. It needs
  the treatment the prologue's plate got, or it should not be built at all.
- **Frame cost.** The Fringe is 353 props and ~4.3 ms in open street. Field 12
  adds maybe 150 more, most of them in a band that is mostly empty. Measure at
  the wreck with the detail alive and four drones up, not in the quiet.
- **Save migration** (rule 6): `q2`/`q3` flags, three side-quest flags, two
  `MILESTONE_GRANTS`, the beacon's saved state, and a new indoor area. All of it
  merges onto live saves; nothing is discarded; an old run walks into all of it
  intact.

---

## 11. OPEN QUESTIONS — need Laurens

1. **The beacon sweep.** Is a light that raises detection the right pressure for
   open ground, or is it one system too many on top of cones, crouch and memory?
   *(My lean: build it, it is the idea that makes the runway a place rather than
   a field.)*
2. **Two roads north** (§7) — worth building the spine as an unsignposted
   alternative approach, or does the sign trail's clarity matter more?
   *(My lean: build both. It costs nothing and it is the first real choice.)*
3. **The Core from the tower cab.** Yes, and give it the prologue's production —
   or save the second sighting for somewhere later and deeper?
4. **The rust drone's debut.** Field 12, or should a pair appear over the Fringe
   streets first so the airfield is not two new things at once? *(The old doc
   asked this too and it is still the sharpest question here. My lean: one pair
   over the Fringe's north end first, as a preview, so Field 12 is one new thing
   and not two.)*
5. **The dictaphone (S2).** Three tapes of a night shift that never mentions the
   plot — is that the texture the game wants, or a distraction from a story that
   already has a lot to carry?
6. **The Magistrate.** `design/hhd-squads.md` open question 2 asks whether it
   belongs in the Fringe at all. S3 and the recovery detail both assume it does.
   If it is a Sprawl unit, the detail needs a different heavy and S3 needs a
   different plate.
7. **EMP or a thrown consumable.** A flyer is the first enemy that really wants
   one, and `design/progression-gear.md` has consumables open. New system —
   worth it here, or hold it for Ring 4?
8. **Names.** Field 12, Wren, Osgood, Aldergrove Primary. All placeholders until
   you say otherwise.
