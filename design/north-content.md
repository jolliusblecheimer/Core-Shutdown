# THE NORTH, WITH PEOPLE IN IT — the content plan

Written 2026-09-02 in answer to *"add all questlines, items, NPCs, enterable
buildings and other cool stuff that is needed — plan it all, code it, then ask
for feedback before pushing."*

`design/expansion-build-spec.md` E0–E3 built the ground. Two areas you can walk
and nobody in them. This is what turns them into levels.

---

## 1. WHAT GETS BUILT

| | | Spec phase |
|---|---|---|
| **Wren and Osgood at the Lamp**, and Wren's counter | E6 | §6 |
| **Four enterable buildings** — both hangars, the tower's ground floor, the tender shed | open question 4 | — |
| **Q2 · THE LONG AERIAL** — Ivar, the school mast, the church ladder, the loop | E7 | §7.3 |
| **Q3 · THE RECORDING** — the wreck core, the slate, the headache | E8 | §7.4 |
| **S1 · What Wren Left** — her pack in Hangar 2 | E6 | §7.5 |
| **S2 · The Last Shift** — the dead man and three tapes | E8 | §7.5 |
| **Two rifle parts** — the gun-camera optic and the recoil-braced stock | E8 | §8 |
| Save state, objective rows, milestone grants for all of it | | §7.1, §7.2 |

## 2. WHAT DOES NOT, AND WHY

| | Why |
|---|---|
| **The rust drones** (E4) | Four engine touchpoints — altitude, no ground collision, melee reach, the cover/ghost passes. Its own phase for a reason, and the spec's own note says Bo's rifle repair should be proven before a flyer ships |
| **The beacon sweep** (E5) | A new input to detection, the most carefully tuned system in the game. Wants to be built and looked at on its own |
| **S3 · Nothing Left to Cut** | Its trigger is killing the recovery detail's Magistrate. There is no recovery detail until E4 |
| **S2's beacon breaker** | Same: the third tape is *beside* the breaker, and the breaker turns off a sweep that does not exist yet. The tape still tells you what it is |
| **The tower as its own area** | Open question 5. The cab is one room; it is a roofed volume like the hangars |

Field 12 therefore has **no enemies** when this ships. It has a place, four
buildings, three quests and a dead man. The danger is E4's.

---

## 3. ENTERABLE BUILDINGS — the mechanism

The tunnel roof built two sessions ago is the third use of one idea (the shack,
the underpass, now these), so it stops being a special case:

```js
// per area: rectangles that have a roof on them and fade as you go in
ROOFS = [{ x0, y0, x1, y1, lift, door }]
```

`insideRoof(x, y)` joins `insideShack()` in driving `roofAlpha`. A door tile is
cut in the wall volume and the interior floor is `apron` ground.

| Building | Footprint | What is in it |
|---|---|---|
| **Hangar 1 — the nest** | 6,5 15×9 | Empty, and deliberately so: the vents in its roof are where E4's drones come out. A tug, pallets, a dry oil pit |
| **Hangar 2 — the store** | 50,5 15×9 | **Wren's pack** (S1), a chest, a bedroll and a cold fire ring — somebody camped here once |
| **Control tower** | 80,5 8×9 | The flooded stair, the duty desk, **tape 3** |
| **Crash tender shed** | 8,50 12×7 | The tender, **the dead man** (S2's giver), **tape 1** |

---

## 4. THE QUESTS

### Q2 · THE LONG AERIAL — *a bearing, not a place*

| # | Trigger | State |
|---|---|---|
| 1 | Talk to **IVAR** at Candlelight, after the map table | `q2 = 'given'` |
| 2 | Take the aerial off the **school mast**, Fringe (119, 61) | `q2 = 'mast'` |
| 3 | Mount it on the **ladder at St Martin's west front** | `q2 = 'mounted'` |
| 4 | Automatic — the radio catches **the loop** | `q2 = 'done'`, and the objective points north |

Ivar names a direction, never a place. The player has already seen the control
tower from the north cross. **Those two facts meet in the player's head, not in
a quest log.**

### Q3 · THE RECORDING

| # | Trigger | State |
|---|---|---|
| 1 | Enter Field 12 | `q3 = 'given'` |
| 2 | Interact with **the wreck core** | `q3 = 'slate'` — they were working outside-in and had not reached it |
| 3 | Automatic — the footage, and **AUTH: E.VANN** | `q3 = 'done'` |

The reveal is a thought bubble and nothing else. **No dialogue, no explanation.**
Q8 owns the answer and this must not leak it.

### S1 · What Wren Left
Wren mentions the pack; it is in Hangar 2. Bringing it back **opens her full
counter** (the rifle rounds appear) and she tells you about the fire stair. It
unlocks a *route*, never a reward — find the stair yourself and you lose nothing.

### S2 · The Last Shift
The dead man in the shed. Three tapes: the shed, a blast pen, the tower cab.
They never mention the Correction or WARDEN. A night shift that ended: aircraft
still trying to take off, a tower crew reading clearances to machines that had
stopped listening, a fire crew that stayed for the last one. All three found →
his kit, and what the breaker in the tower is for.

---

## 5. THE PARTS

Alternatives, not additions — both slots already hold something.

| | Slot | Cost | Does |
|---|---|---|---|
| **Gun-camera optic** | optic | 3 tech, 10 scrap | The last thing you hit stays outlined for 4s, through cover. On open ground you lose things to *distance*, not walls |
| **Recoil-braced stock** | stock | 2 tech, 12 scrap | −0.8 shake, spread ×0.55. A burst goes where the first round went |

`flags.mark` is a new draw hook: remember the last entity hit and when, outline
it until it expires. `flags.spreadMul` multiplies the burst spread that already
exists, so the two barrels finally have different best builds.

Both in `MILESTONE_GRANTS` (rule 7), so a live run that has already done the
work is handed them once, through the ledger.

---

## 6. SAVE

```js
const Quests = { q2: 'none', q3: 'none', s1: 'none', s2: 0, s3: 'none' };
```

Merged onto defaults on load, so adding `q4` later cannot break a live run.
Quest props (the mast, the pack, the tapes, the wreck core) are keyed by
position like every other world object, so a map edit cannot shuffle them.

---

## 7. VERIFICATION

| | |
|---|---|
| Every quest prop reachable, and none inside geometry | `audit2`, `f12` |
| The whole chain from a fresh run, no dead objective and no null in the column | new `quests.js` harness |
| Q2 and Q3 both complete, in either order | same |
| A v1 save walks into all of it | `smoke` |
| Both parts grant once and only once through the ledger | `quests.js` |
| Nobody stands on a prop; nothing is hidden behind a building | `audit2`, `westvis` |
