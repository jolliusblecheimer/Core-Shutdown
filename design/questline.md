# The questline, and the man who points you north

**PLAN — awaiting approval, nothing built.**

Laurens, 2026-08-22: *"first we have to make the questline clear, so after you
reach the shelter change it to talk to the survivors in the camp (formulate it
better). One of the npcs needs to somehow say something that gives you the quest
to go to the next ring or quest area."*

---

## 1. What actually happens today

The objective chain is one function, `currentObjective()` in `js/entities.js`,
and it ends like this:

```js
if (!campMapRead) return { title: 'Reach the shelter', ... };
return null;                      // ← and that is the end of the game's voice
```

So the guidance is not *thin* after the shelter. **It stops.** Permanently, for
the rest of the run. The HUD line clears, the green dot comes off both maps, and
the player is standing in a lit church with seven people in it and nothing
anywhere telling them that anything else exists.

Three more things are wrong underneath it, and they matter for the fix:

| | Problem |
|---|---|
| **a** | **"Reach the shelter" is completed by reading the map table**, not by reaching the shelter. You can walk in the west door, meet everyone, sleep, buy a rifle part, and the HUD will still be telling you to reach the shelter — because you never touched the altar. |
| **b** | **There is no quest system.** `mission = { state }` is one object with one state, and it belongs to the junkyard's five-scrap errand. Q2 has nowhere to live. |
| **c** | **Who you have spoken to is not saved.** `buildFolk()` rebuilds the camp with `said: 0` every single time you enter the area, so "I have talked to Tam" is forgotten the moment you step outside. Any "talk to the survivors" objective needs its own memory. |

## 2. The chain we want

Arrival is one beat, meeting the camp is a second, and being sent north is a
third. Today all three are one silence.

| # | Objective line | Completed by | Points at |
|---|---|---|---|
| 1 | **Reach the shelter** | *walking through the west door* — not the map table | the church, fringe 56,68 |
| 2 | **Ask around Candlelight** `n/3` | talking to any three survivors | the camp floor |
| 3 | **Hear Ivar out** | talking to Ivar once step 2 is done | Ivar, candlelight 7.5,2.5 |
| 4 | *(Q2, whatever it turns out to be — §4)* | its own steps | its own places |
| 5 | **Reach Field 12** | Q3, when the north band exists | the airfield |

**Step 2's wording.** Laurens asked for it to be formulated better than "talk to
the survivors in the camp". My pick is **"Ask around Candlelight"** — it is an
instruction rather than a description, it names the place so it still reads
sensibly from the yard, and it matches the traveller's register. The detail line
under it, shown when you click the dot:

> *Seven of them, a fire, and the first door that has shut behind me in a year.
> Somebody here knows what is north.*

**Why three and not seven.** Three is enough to make you walk the room and meet
the people who matter — you cannot do it without tripping over at least one of
Bo's bench, Tam's counter or Ade's cots, which is the camp teaching you its own
services. Seven turns it into a hunt for whoever you missed, and the room is
small enough that a hunt is just tedium. **Any** three, so nobody can get stuck.

Ivar is excluded from the count, so he is always still there to be the fourth
conversation and the one that changes something.

## 3. The mechanism — the smallest thing that is not a hack

Not a quest engine. Two pieces of state and one rule.

```js
const Quests = { q2: 'none' };  // none → asking → offered → <q2's own steps> → done
let campMet = {};               // { tam: true, bo: true } — who you have heard out
```

- Both are **saved and merged onto defaults**, so adding `q3` later cannot break
  a live run (rule 6).
- `talkToFolk()` sets `campMet[f.key] = true` and, when the count reaches three,
  moves `Quests.q2` to `offered`.
- `currentObjective()` reads them, and **never returns `null` again while there
  is a next thing** — the null case should mean "the game is finished", not
  "the author stopped writing".
- **A live run that has already arrived is credited on load**, the same way
  `MILESTONE_GRANTS` credits items (rule 7): if `campMapRead` is true and `q2`
  is still `none`, that run has plainly reached the shelter, so it starts at
  `asking` rather than being told to walk somewhere it is already standing.

**Who gives it: IVAR.** He is the right one and he was built for it — the docs
say outright that "Ivar has the mission slot and no mission". His existing lines
already point at knowledge rather than goods: *"Read the table. Everything this
camp knows about the ring is on it."* He is the camp's memory. Nobody else fits:
Tam and Bo and Ade have counters and jobs, Osk guards the stores, Vesna keeps
the door, Halden runs the stove.

His dialogue gets the same conditional treatment Ade's just got — `lines` may be
a function, so he says one thing before you have earned the mission and another
after.

## 4. What the quest actually IS

This is the part that needs your call. `design/the-road-north.md` proposed one
answer and asked whether it was right; here it is against the alternatives.

### Option A — THE LONG AERIAL *(my recommendation)*

Candlelight has a radio that **receives and cannot transmit**. It catches
something repeating that nobody can place. Ivar wants two things brought
together: a proper aerial, and height.

1. **The aerial** is on the mast on **Aldergrove Primary's** roof, east across
   the ring — reached by the ladder up the outside of the gable, so **this needs
   no interiors**. The walk there crosses the streets the HHD squads hold, which
   is the first time the ring's machines are something you go *through* rather
   than past.
2. **The height** is the **church tower** — which means this quest pays for the
   tower stair we have owed since Candlelight was built (item 1.5).
3. **The payoff** is the loop itself: a news broadcast cut off mid-sentence, still
   repeating a year later, and it is coming from **Field 12**, the dead airfield
   north of the ring.

Why it is the right one: it does not *assert* that you should go north, it
**produces the reason** — and the thing it finds is the same broadcast Q3 exists
to recover, so Act 1 and Act 2 join up instead of being two errands. It also
uses two buildings that already stand, gives the school back the map pin we took
off it on 08-21 (now it has a purpose, which was the exact test), and builds an
outstanding item as a side effect.

### Option B — the runner who did not come back

Tam already says *"the last three runners in said that road couldn't be
walked."* A fourth went north and did not come back; find him. Cheap, human, no
new props — but it asserts the north instead of revealing it, and it cannot
finish until Field 12 and the underpass exist. Better as a **side** quest later.

### Option C — a supply run north

Rejected. It is filler, and the first mission out of the first camp should not
be a shopping list.

## 5. The trap this plan must not walk into

**Do not point the player at ground that does not exist.**

Q2 ends by telling you something is transmitting from the airfield. The airfield
is in the north band of the Fringe, and **the north band is not built** — north
of the north cross at y 36 there is nothing, and the map edge there is an
invisible wall with nothing drawn on it.

An objective reading "Reach Field 12" that walks you into an invisible boundary
is *worse* than the silence we are fixing, because silence does not promise
anything.

So Q2 is only worth shipping with one of these true:

- **the honest minimum:** N1 from the road-north plan — the **viaduct as the
  Fringe's north wall**, five storeys of pancaked deck with one hole in it. That
  turns "invisible edge" into "a way north that is visibly not open yet", and
  the final objective can legitimately read as *the end of what is built*; or
- **the full version:** the north band and Field 12, which is N1→N4 and a
  project of its own.

**My recommendation: build Q2 with N1.** It is a wall, it is one of the cheapest
things in the road-north plan, and it converts the ring's worst edge into the
door for the next chapter.

## 6. Build order

1. **Fix the chain's existing bugs** — arrival completes step 1, not the map
   table; `currentObjective()` stops returning `null` at the end. *(Small, and
   worth doing on its own even if everything below waits.)*
2. `Quests` + `campMet`, saved, merged, with the credit-on-load rule.
3. **Ask around Candlelight** `n/3`, and Ivar's conditional lines.
4. The tower stair (item 1.5 — owed anyway).
5. The radio in the camp, and Ivar offering the aerial.
6. The school mast, the fetch, and the tower scene.
7. **N1, the viaduct wall**, and the Q3 hook pointing at it.

Steps 1–3 are the whole of what Laurens asked for and stand alone. 4–7 are Q2
proper and depend on §4 being decided.

## 7. Open questions

1. **Is Q2 the aerial?** (§4 — this is question 1 of the road-north plan too,
   still unanswered, and everything from step 5 down waits on it.)
2. **Three survivors, or the three with counters** (Bo, Tam, Ade)? *My lean: any
   three — robust, and you meet a counter either way.*
3. **Does step 1 complete on entering the camp, or on entering the church
   building from the street?** *My lean: walking through the west door into
   `candlelight`, because that is the moment it feels like arriving.*
4. **Should the map table still do anything for the quest**, or is it purely
   the fog reward it is now? *My lean: purely the reward — it is a good enough
   prize on its own and it should not be a gate.*
