> **SUPERSEDED, 2026-09-07.** The field was rebuilt at 64×48 and the recovery
> detail, the Magistrate and two of the five sentries were taken off it.
> See `design/airfield-rebuild.md`. What is below is the plan the *old* 96×72
> field was built to, kept because its reasoning about the perimeter, the
> hardware and the amber rule still holds.

# AIRFIELD 12 — the military plan

Written 2026-09-02 in answer to *"make it a military airstrip, make it difficult
to get past the fence, add military buildings and old planes and tanks, add area
appropriate enemies, explain what questline items and NPCs and information will
be there."*

Field 12 shipped as a civil airfield with nobody on it. This makes it what the
atlas always implied and the runway numbers already say: **a military dispersal
field that was still operating on the Longest Night.**

---

## 1. THE NAME, AND WHAT CHANGES WITH IT

`AIRFIELD 12`. The id stays `field12` so nothing in the save moves.

A military field changes three things about what is already there, before a
single new prop is placed:

| | Was | Is |
|---|---|---|
| The fence | chain-link with two gaps | a **perimeter**: two lines, wire between them, and both ways through are defended |
| The wreck | a news drone that came down | a news drone that came down **on a live military field** — which is why a recovery detail is cutting it apart and not a scrap crew |
| The dead | one fire crewman | a crewman, and **a duty officer** who stayed at his board |

---

## 2. THE FENCE — difficult, and difficult in two different ways

The flood fill already proves there are exactly two ways in. What was missing is
that neither of them **cost** anything.

```
      ░░░░░░░░ OUTER LINE — chain-link + razor coil ░░░░░░░░
      ·········· STERILE STRIP, two tiles, no cover ··········
      ▓▓▓▓▓▓▓▓ INNER LINE — concrete anti-vehicle blocks ▓▓▓▓
```

| Way in | From | Costs you |
|---|---|---|
| **The vehicle gate**, south | the Fringe's mid-street tunnel | **A guard post with a sentry gun on it**, a concrete chicane, and a tank parked across half the opening. The loud way |
| **The west breach** | the Underpass | Nothing but the walk — the fence went down outwards here a long time ago. **The quiet way, and it is Wren's** |

That asymmetry is the whole point and it is the spec's *prepared run vs cold
run* made real: up the mid street you arrive at the guns, up the spine you meet
Wren first and she tells you about the breach. **Neither is the wrong answer**
and the world never comments on which you did.

The sterile strip is walkable and has **no cover in it**, which is what makes it
sterile. It is also where the beacon will sweep when E5 ships.

---

## 3. THE HARDWARE

Every one of these is an **iso volume built in tile space** — never a sheared
rectangle, never assembled panels. The same construction as the wreck drone.

| | Footprint | Where | Notes |
|---|---|---|---|
| **Transport** | 9 × 5 | north apron | High wing, four engines, tail up. The biggest object in the game |
| **Interceptor** | 6 × 3 | blast pen A | Low wing, one engine, canopy open. Never flew again |
| **Interceptor, burnt** | 6 × 3 | south apron | Same volume, charred, one wing gone |
| **Tank ×2** | 4 × 2 | the vehicle park | Tracked hull, turret, barrel. Facing the gate, which tells you which way they expected it to come from |
| **Tank, gun blown off** | 4 × 2 | across the vehicle gate | Half the opening. You walk round it, and it is the first thing you see |

## 4. THE BUILDINGS

On top of the two hangars, the tower and the tender shed already there:

| | Footprint | Enterable | What is in it |
|---|---|---|---|
| **Guard post** | 4 × 4 | yes | The gate sentry stands on its roof. A rack, a log book |
| **Squadron block** | 16 × 8 | yes | The ready room. **The duty officer**, and **the standing order board** |
| **Ordnance bunker** | 10 × 6 | yes, **locked** | Blast doors. **The bunker key is on the duty officer.** The gun-camera optic is in here, and it is the best loot on the field |
| **Radar mast** | 3 × 3 | no | Lattice tower with a dish that no longer turns |

---

## 5. THE ENEMIES

### 5.1 SENTRY GUNS — new, and the reason the fence is hard

A fixed automatic gun on a post. It does not patrol, it does not follow, and it
cannot be avoided by being quiet — it is a **thing in the way**, which is what a
perimeter needs and what this game does not have yet.

| State | What | Exit |
|---|---|---|
| `sleep` | Dull plate, dark, no light. **Cannot be damaged** | you enter its arc within 11 tiles → `spin` |
| `spin` | Housing lights **amber**, audible, traverses onto you. **Now it can be hurt** — 1.1s | 1.1s → `track` |
| `track` | A **red line** onto your feet, tightening. 0.6s | 0.6s → `fire` |
| `fire` | Three-round bursts down that line, 1.6s | 1.6s → `spin` if you are still in the arc, else `cool` → `sleep` |

**What glows amber can be hurt; dull plate cannot.** That is the Compactor's
rule, and this is the second thing in the game to use it — which means a sentry
teaches you nothing new, it *asks you to already know it*. You cannot shoot it
while it sleeps, so you have to wake it and then beat it.

| | |
|---|---|
| HP | 40, and only while the housing is lit |
| Damage | 7 a round, three to a burst |
| Arc | 150°, fixed, facing the ground it was put there to cover |
| Range | 11 tiles to wake, 14 to keep firing |
| Dead | permanently, and saved by position like a raider |

**Five of them**: two at the vehicle gate, one over the ordnance bunker's door,
one on the tower, one at the wreck. The west breach has none.

### 5.2 THE RECOVERY DETAIL — the droids, on the field

`FRINGE_ROUTES` is hardcoded; patrol routes become **per area**, so the airfield
gets its own:

| Squad | Route | Why |
|---|---|---|
| **heavy** (with a **Magistrate**) | the wreck ↔ the north apron | They are cutting it apart. This is the detail Q3 walks into, and killing the Magistrate is **S3** |
| **standard** | the perimeter road, east half | |
| **standard** | the perimeter road, west half | |
| **light** | the vehicle park | |

The spec's rule holds: **this does not have to be a fight.** The pens, the
bowsers, the wing, the blast doors and the crouch are all there, and the slate
can be taken while they work.

---

## 6. WHAT IS THERE — questline, items, NPCs, information

*This section answers "explain what will be there" in full.*

### 6.1 NPCs — nobody, and that is the point

**No living person is on this field.** Wren and Osgood are at the Lamp, on the
other side of a tunnel, and the whole shape of the north is that the Lamp is as
far as anybody sane goes. What the airfield has instead is **two dead men**, and
neither of them says a word:

| | Where | What they are for |
|---|---|---|
| **The fire crewman** | tender shed | Sat against the wheel of his own appliance with a year to leave and did not. Gives **S2** |
| **The duty officer** | squadron block, at his board | Carries the **ordnance bunker key**. Gives you the best loot on the field, and nothing else |

### 6.2 Quest items

| Item | Where | Quest | What it does |
|---|---|---|---|
| **The slate** | the wreck's core | **Q3** | The footage. `AUTH: E.VANN`, and then his head splits |
| **Wren's pack** | Hangar 2 | **S1** | Opens her rifle rounds — the last resupply before Ring 4 |
| **Three tapes** | shed · blast pen · tower cab | **S2** | Tech, scrap, and what the breaker is |
| **The bunker key** | the duty officer | — | Opens the ordnance bunker |
| **The shield plate** | the Magistrate | **S3** | Oz bolts it to the Lamp: the tarp comes down, a steel wall goes up, the fire burns bigger |
| **The gun-camera optic** | ordnance bunker | — | The reward for the key |

### 6.3 Information — what the field tells you, and what it refuses to

| Source | Says |
|---|---|
| **The three tapes** | A night shift that ended. Aircraft still trying to land, a tower crew reading clearances to machines that had stopped listening, a fire crew that stayed for the last one. **Not one of them mentions the Correction, WARDEN, or anything you are chasing** |
| **The standing order board** | The last order posted, and the date on it: *ALL AIRCRAFT GROUNDED PENDING CIVIL AUTHORITY.* Somebody knew enough to ground a squadron. It does not say who, or what they knew |
| **The slate** | A whole city turning in one second, on a command with a name on it |
| **The breaker** | What the beacon is, and that it runs on its own once lit |

The board is the one genuinely new piece of story and it is deliberately **one
sentence and a date**. It moves the question from *what happened* to *who knew*,
and it answers neither. Q8 owns that.

---

## 7. BUILD ORDER

| | Phase | Ends when | Size |
|---|---|---|---|
| **M1** | **The perimeter** — double line, razor, blocks, sterile strip, the chicane and the tank across the gate | The fence reads as a perimeter and the flood fill still says two ways in | **M** |
| **M2** | **The hardware** — transport, two interceptors, three tanks, radar mast | The field reads as military from the gate | **L** |
| **M3** | **The buildings** — guard post, squadron block, ordnance bunker, the board, the duty officer, the key | You can get into the bunker, and only with the key | **M** |
| **M4** | **The sentries** — the new enemy, its four states, the amber rule, saved by position | Getting in the vehicle gate is a fight and getting in the breach is not | **L** |
| **M5** | **The detail** — per-area patrol routes, the heavy squad at the wreck, **S3** | The wreck has somebody at it, and Oz's wall goes up | **M** |

**M1–M3 is a shippable milestone**: a military field with hard edges, real
hardware and a locked bunker, still with no enemies on it. M4 and M5 are what
make it dangerous.

---

## 8. VERIFICATION

| | |
|---|---|
| Still exactly two ways in | flood fill with both sealed → **0**, unchanged |
| Nothing inside geometry, nothing hidden | `audit2`, `qprops` |
| The bunker cannot be entered without the key | new check in `quests.js` |
| A sentry cannot be damaged while asleep, and can while lit | new `sentry.js` |
| A dead sentry stays dead across a save | `sentry.js` |
| Frame cost at the wreck with the detail alive and five sentries up | `cost.js` — measure **there**, not in the quiet |

---

## 9. BUILT — M1 to M5

### M3 — the buildings

| | Footprint | |
|---|---|---|
| **Squadron block** | 28,5 16×8 | The ready room. **The duty officer** and **the standing order board** |
| **Guard post** | 38,64 4×4 | At the vehicle gate |
| **Ordnance bunker** | 26,48 10×6 | **The only shut door on the field.** The gun-camera optic is in it |

The blast door stands **in the bunker's south wall**, not on the tile in front of
it — the first version stood in the approach and walled the door off from the
person holding the key. `Quests.bunker` saves it, so it stays open across a
rebuild. Verified: shut → reachable **false** · no key → stays shut · key off the
officer → opens, key spent → reachable **true** · after a rebuild → still true.

### M4 — the sentries

`js/sentry.js`. Five guns, none of them at the west breach.

| Verified | |
|---|---|
| Asleep, shot | **40 → 40 hp.** Dull plate rings and nothing happens |
| Woken by entering its arc | `sleep → spin` |
| Lit, shot | **40 → 30 hp** |
| Runs its states | `spin → track → fire`, six rounds down the line |
| Killed | saved by position, still dead after a rebuild and a restore |
| Its arc | drawn on the ground while it is awake, so you can see where it cannot reach |

**What glows amber can be hurt; dull plate cannot** — the Compactor's rule, used
a second time, so the sentry asks you to already know it rather than teaching it.
Melee reaches one under the same rule, so a melee-only run has an answer.

### M5 — the recovery detail, and S3

Patrol routes are **per area** now (`Areas[id].routes`); they were hardcoded to
the Fringe, which is why the airfield could not have a patrol on it at all. Four
squads: a **heavy** one — which is what puts a Magistrate on the field — working
the wreck, two on the perimeter road, one in the vehicle park. **12 droids.**

**S3** runs end to end: Oz asks once you have been in and come back → the
Magistrate carries the plate → bring it back and the **tarp comes down, a steel
wall goes up**, and he hands over the recoil-braced stock that was in its
mounting. The stock moved back to S3 where the spec had it; S2's payoff is the
tech, the scrap and what the tapes say.

### Measured

| | |
|---|---|
| Props on the field | 413 → **701** |
| Ways in, both openings sealed | **0**, unchanged |
| Frame cost — wreck / gate / transport / park / corner | 14.79 / 13.68 / 14.46 / 13.59 / 13.59 ms |

`f12`, `qprops`, `quests`, `sentry`, `audit2`, `smoke`, `hunted`, `verifycut`
and `cost` all green, no console errors.

**Still not built:** the rust drones (E4's flyers) and the beacon sweep (E5).
