# THE PROLOGUE — the night it turned, and the man who put him back together

**BUILT AND LIVE.** Merged to `main` on Laurens' instruction, 2026-08-26, after
he reviewed it from screenshots. What is NOT built is listed in §11, and the
corrections he made on the day are in §12.

Laurens, 2026-08-22: cutscenes at the start of the game and slight tutorial
changes. *"show the world at harmoney robots helping and at one, turning on
humand and attking them. Show our main character flleing but still getting hit
last second at the graveyard. The mecanic, the survivor brining him to a second
small schack at the place the hero spawns now, be heals him and rebuilds some of
his bodyparts with mecanial parts and than when the mecanic leaves one day he
wakes up."*

This is the largest single content addition since the Fringe, and it changes
lore that is currently written down. It also fixes the story's weakest joint, so
it is worth it. Read §1 before anything else.

---

## 1. What this changes, and what it fixes

### It makes the opening *show* instead of *tell*

Today the entire opening is three typewriter lines over a dark yard:

> The machines took the city. · Everyone who could run, ran. · You ran too — and
> made it as far as the junkyard.

Every one of those is a summary. The player is told there was a world and told
it ended. Under this plan they **watch it work, watch it turn, and run from it
themselves** — and the third line stops being narration and becomes something
they did.

### It fixes the twist's biggest problem

`main-story.md` has a tone rule: the original Vann is never softened. But the
reveal in Q8 is a *recording* — the player is told who they are by an archive.
There is no moment where the world makes the case.

A prologue where **the machines are visibly good first** does that work. The
Correction is not "robots go evil"; it is a man deciding people are the problem
and being right about the machines and wrong about himself. The player has to
have seen the city work to feel what he threw away — and on a second playthrough,
the harmony scene is the most damning thing in the game, because **you were the
one who ended it.**

### It adds a body the story did not have

The mechanical parts are new and they are not decoration. They mean:

- **The man who turned machines against people is rebuilt out of machines.** That
  is the whole story in one image and it costs nothing to say.
- Ring 4's progression is solved. Armour was deferred to the Sprawl on 08-22
  (`progression-gear.md`) with the question of what it even is left open.
  **It should be better parts, not scavenged plate** — fitted by a mechanic,
  upgrading limbs he already has. That is thematically native instead of bolted
  on, and this prologue plants it in the first three minutes.
- It gives Q8 an extra turn of the knife: the biometric doors read the living
  tissue of a man who is mostly not.

### What it contradicts, and has to be rewritten

| Written today | Becomes |
|---|---|
| Struck down "at the fence of a scrap yard", left "among the junk" | Struck down **at the graveyard** (§3) |
| Marek: *"Found you half-dead by the fence."* | Marek did not find him. **The mechanic did.** Marek's line changes (§4) |
| The wounds took his memory | Unchanged, and now it has a visible cause: the skull plate |

---

## 2. The prologue, beat by beat

Six beats. Two are playable. **Framing is tight throughout** — no city
panoramas, because the Fringe's art is a ruin and rebuilding it intact for
thirty seconds of screen time is not worth it. Three close tableaux read as a
working city more convincingly than one wide shot that has to be perfect.

### Beat 1 — A STREET THAT WORKS *(tableau, ~6s)*

Slow camera drift along a lit pavement. A **carrier drone** walks a crate to a
door and waits to be let in. A **street unit** kneels at a kerb doing something
dull and useful — sweeping, mending a paving slab. Two people pass it without
looking at it, which is the point: it is furniture. Windows are lit. It is
evening and nothing is wrong.

Machines here are **clean, pale and blue-lit** — the opposite of the junk
language, and `droids.js` already establishes *blue is WARDEN, amber is damage*.

> *There were nine million of us, and something like a million of them.*

### Beat 2 — SERVICE *(tableau, ~5s)*

Closer. A **medical unit** with its hands on someone, working. A child watching
a helper bot with the total lack of fear you only have around things that have
never hurt anyone.

> *They fed us, carried us, and put us back together.*
> *Nobody had been afraid of them for years.*

### Beat 3 — THE TURN *(tableau, ~4s, no text)*

Same framing as Beat 2. Every machine on screen **stops at once** — mid-motion,
mid-step, all of them on the same frame. Two full seconds of nothing. Audio
drops to a single tone.

Then their light goes from **blue to amber**, together.

The medical unit's hands are still on the patient.

*No text over this beat. It does not need any and text would soften it.*

### Beat 4 — THE CORRECTION *(tableau, ~6.5s)*

**One person is caught, and it is the one the medical unit had its hands on two
beats ago** (added 2026-08-26 at Laurens' request). That machine is the whole
argument of the scene: it is not a soldier that turned, it is the thing that was
treating you.

Staged so it is never explicit. There is barely a chase — its hands were
already on them — they pull away, it closes, and it is **standing over them**
when it happens, its sprite nearer the camera so it covers the moment. One amber
flash, because amber is what damage looks like in this game. What is left when
it walks on is a shape on the pavement, and **it does not stay to look at it.**

Around that: the other machines walk at the other people, and the people go.

> *It took one night. They called it the Correction.*

### Beat 5 — THE RUN *(PLAYABLE, ~40s)*

**Control is handed to the player, and this is where WASD is taught.** Diegetic:
the prompt appears because you are being chased, not because a tutorial box says
so. This is the tutorial change — the yard's `PRESS W A S D` lesson moves here
and stops being a freeze-frame in a quiet junkyard.

You are Vann, though the game never says so and the sprite is hooded. Ruined
street, machines behind you, corners to turn. **Unwinnable and unloseable** —
there is nothing to fight with and the machines never quite reach you, because
the outcome is fixed. Two or three streets, ~40 seconds, and it ends when you
reach the churchyard gate.

*Foreshadow, cheap: one of the machines that passes you is a **Scrapper**, the
game's first enemy and its last image.*

### Beat 6 — THE GRAVEYARD *(scripted, ~8s)*

You get through the lych gate. The path between the headstones is open, the
church is ahead — and it is the last second of the run that gets you: something
comes out of the dark to the side, one blow, and the screen goes.

Low angle, face down between two headstones, rain or ash. Vision narrows to a
slot. Boots — **a person's boots** — enter the frame and stop. A hand comes
down.

Cut to black.

> *Everyone who could run, ran.*
> *You ran too.*

Then the naming prompt (§6).

---

## 3. Where the graveyard is — and this is the best idea in the plan

**It is St Martin's churchyard.**

Not a graveyard invented for the cutscene. The one outside the church that the
whole sign trail leads to, the one the camp lives inside, the one already on the
outstanding list as `cathedral.md` phase 2.

It works geographically without bending anything: he fled from the tower beside
the Core **outward** through the rings, made it to the Fringe, and went down at
the edge of it. The junkyard is beyond the Fringe's east gate — a man carrying a
body would go east, away from the city, which is exactly where the mechanic's
shack is.

And it buys an enormous payoff for free:

> **Q2 walks the player back to the exact place they died, and they do not know
> it.** They follow handmade signs across the ring to a church, and the ground
> they cross to reach the only warm room in the world is the ground they bled
> into. The survivors have built their camp on top of it.

On a second playthrough the churchyard is the first place the truth is visible,
long before the archive. It costs one location that is already on the build list.

**Consequence:** the churchyard has to be built to a fixed layout *before* the
prologue ships, because two scenes now have to be the same place — the same
gate, the same headstones, the same angle.

---

## 4. THE MECHANIC

The new character, and the plan's other big decision.

### What he does

He finds a dying man in a churchyard, carries him east out of the city, and
spends months in a shack at the edge of a scrap yard **putting him back together
with what he has** — which is not medicine, it is machine parts. Then one day he
is gone, and the man wakes up alone.

### Who he is — two versions, and I recommend the second

**Version A — he is Marek.** Cheapest. The existing line *"found you half-dead
by the fence"* becomes literally true and earned, and no new character is
needed. But it means Marek has known all along that the traveller is half
machine and has never mentioned it, which quietly makes Marek a liar for the
whole tutorial — and it wastes the disappearance, because he is standing right
there.

**Version B — he is somebody else, and he left. ✅ recommended.**

- The shack is **his**: a workbench, tools, a cot with straps, and diagrams on
  the wall of a body with parts marked. Environmental storytelling, and a
  natural first room.
- **Marek keeps his function exactly** and gains a better line. He is the
  neighbour who knew him: *"Wasn't me that put you back together, traveller.
  That was the other one. He's gone."*
- The amnesia stays intact, because **the one man who could explain anything is
  not there to ask.**
- And the disappearance can be paid off, which A cannot.

### Why he left — the hook worth taking

He is the only person alive who has had this man's skull open.

**He recognised him.** Not from the face — the face was ruined and the records
are purged. From something in the body: an old surgical implant, a serial on a
piece of hardware nobody in the outskirts should be carrying, a jaw that matched
a photo he had seen years ago in a newspaper.

He finished the work anyway. Then he packed his tools and left, without telling
him, and without telling anybody else either.

That single choice is the entire moral question of the game asked once, quietly,
before the player knows there is a question — and it is payable at Q8 or later,
because **he is still out there.** Station 9, the road north, or a name on a
list somewhere.

*(Name: pick one. Halvard, Dusan, Kem, or Nils — the camp roster is Marek,
Vesna, Osk, Bo, Ade, Halden, Ivar, Tam, so it should sit in that family.)*

### What he rebuilt

Readable at sixteen pixels, so: **two things, not five.**

| Part | Why that one |
|---|---|
| **Left forearm and hand** | Visible on the sprite — the arm that holds the pipe. The game already draws an extended arm for the pistol, so there is a place to put it. |
| **A plate over the left temple** | The lore already says his head was split open. It is the physical cause of the amnesia, and it is what the mechanic had to open to find what he found. |

**They must not glow amber at rest.** Amber in this game means *this can be
hurt* and that grammar is load-bearing. Proposed instead: **his parts glow faintly
amber only when he is badly hurt** — which reads instantly in the game's own
language, gives a health cue with no HUD, and is quietly horrible.

---

## 5. The second shack

A small one-room hut **at the player's current spawn point** — `(6.5, 26.5)` in
the junkyard, at the opposite corner from Marek's shack at `(21.5, 7.5)`. That
distance is now story: the mechanic did not live next to anybody.

Inside: the workbench he did it on, tools he did not take, a cot with straps on
it, a stove gone cold, and **the diagrams** — a body drawn on a board with two
parts marked and a lot of crossings-out. The player can read them; they are the
first thing the game shows and the last thing they will understand.

He took his tools and left the drawings. He was not coming back and he did not
want to look at them again.

---

## 6. The tutorial, changed

The current chain is: `move → melee → enemy warning → looting/inventory → gun`,
all as freeze-frames in the yard. Two changes only.

1. **Movement moves into Beat 5.** It is taught while being chased, which is
   both better and one less freeze-frame in a quiet junkyard.
2. **A new first beat inside the shack**: `E` to look at things, taught on the
   diagrams. Interaction is currently learned by accident on a pipe.

Everything after — melee, the enemy warning, looting, the gun — stays exactly as
it is.

**Naming moves too.** It currently sits between the intro lines and the yard.
Under this plan it lands **on waking in the shack**, after Beat 6, which is the
moment the character genuinely has no name — and it makes the final card
(*"He had two. You gave him the one that mattered"*) land on something the
player did at the exact moment he lost the first one.

### The new opening flow

```
TITLE → BEATS 1–4 (tableaux) → BEAT 5 (playable run) → BEAT 6 (graveyard)
      → NAMING → wake in the shack → E on the diagrams → step outside
      → the yard, and the tutorial as it already is
```

**Returning players skip all of it** — straight from CONTINUE into the world, as
now. A prologue you cannot skip is a prologue you come to hate.

---

## 7. The technical problem: there is no cutscene system

`GateCine` and the boss's `cine2`/`cine3` are **bespoke timelines** — an
`active` flag, a `t += dt`, and hand-written thresholds, one per cutscene. That
is fine for two. It is not fine for six beats with camera moves, typed text and
sound cues, and it will be worse when Q7's speakers and Q8's archive arrive.

So this plan's first piece of code is a small **beat runner**: a cutscene is a
list of beats, each with a duration, a camera target and zoom, a draw hook, a
line of text, and a sound. The runner ticks the list, the renderer asks it what
to draw, and skipping is one flag.

It should reuse what already works: camera focus and zoom (`game.js:1005–1020`),
`addShake`, the typewriter from the intro, and the letterbox the boss cutscenes
already use. **Roughly 150 lines, written once, and every cutscene after this
one is data.**

## 8. Art needed

Honest list, and it is the bulk of the work.

**New sprite families:**
- **Civilians** — 3–4 variants, walking, not hostile. Same size and detail tier
  as the player (art-style rule).
- **Helper machines** — 3: a carrier, a street unit, a medical unit. Clean, pale,
  blue-lit. This is a *new design language* for the project: everything built so
  far is junk or hostile.
- **The mechanic** — one sprite, seen only in Beat 6 as boots and a hand, and in
  the shack as an absence.
- **The traveller's parts** — forearm and temple plate on the existing sprite,
  plus the hurt-glow state.

**New places:**
- The pre-Correction street — reuses Fringe buildings with lit windows and no
  rubble, tightly framed.
- **The churchyard** — headstones, railings, a lych gate, trees. On the
  outstanding list already; now story-critical and needed at a fixed layout.
- **The mechanic's shack** — exterior in the yard, plus a one-room interior:
  workbench, cot with straps, cold stove, the diagram board.

**Everything under the standing rules:** built in tile space, integer fills
under about ten pixels, nothing axis-aligned lying on the ground.

## 9. Build order

Each step ends somewhere it can be looked at.

1. **The beat runner** (§7) — proved by re-expressing the existing gate cutscene
   in it and getting the same result. No new art.
2. **The churchyard**, to a fixed layout — needed by two scenes and owed anyway.
3. **The mechanic's shack**, exterior and interior, with the diagrams readable.
4. **Beat 6 + naming + waking up.** The end of the prologue before the start of
   it, because it is the part that touches the live game and the save.
5. **Beat 5, the run.** Movement tutorial moves here.
6. **Beats 1–4**, the tableaux, and the helper-machine art. The biggest art
   block, and last because it is the most self-contained.
7. **Marek's rewritten line, and `main-story.md` updated** to match (§1).

**Local-first applies to steps 2, 3, 5 and 6** — these are large visual
additions, so they get built and screenshotted for approval before anything is
pushed.

## 10. Open questions

1. **Version A or B for the mechanic** — is he Marek, or somebody who left?
   *(My strong lean: B, and the "he recognised him" reason.)*
2. **His name.** Halvard, Dusan, Kem, Nils, or yours.
3. **Is the graveyard St Martin's churchyard?** *(My strong lean: yes — §3 is
   the cheapest big payoff in this plan.)*
4. **Should the mechanical parts become Ring 4's progression** instead of
   armour? *(My lean: yes, and it makes the 08-22 armour decision better rather
   than reopening it.)*
5. **Is the run playable, or a seventh tableau?** Playable is much stronger and
   is where the movement tutorial goes; a tableau is perhaps a third of the work.
6. **How much of the Correction do we show in Beat 4?** Currently written as
   smoke, silhouettes and sound with nothing explicit. It can go further or
   stay suggestive.
7. **Does the player see the traveller's own face at any point?** The story
   depends on the hood and mask hiding it until Q8. Beat 5 is the one place a
   careless frame could give it away.


---

## 11. What is built, and what is not — 2026-08-22

**Built and verified in the browser** (`TEST_MODE`, screenshots taken):

- `js/cine.js` — the beat runner. A cutscene is a list of beats; each says how
  long it lasts, where the camera looks, what is typed, whether the player has
  the sticks, and what to run on entry and per frame. `updateCamera` was pulled
  out of the middle of `update()` to make it possible at all — it was twenty
  lines sitting inline, so a cutscene in any state other than `playing` had no
  camera whatsoever.
- **The prologue area** (`buildPrologue`, 34×26) — a real area, so it gets the
  real renderer: the same tiles, building volumes, AO, god rays, colour grade
  and tilt-shift the game uses. A hand-painted cutscene would have looked like a
  different game, and the point of the scene is that it is the SAME city.
- **The cast** — four civilians, a child, and three helper machines, all riding
  the existing `folk` pipeline, so there is no new drawing code for any of them.
- **The turn** — every machine keeps its sprite, its frame and its place, and
  only the bar it sees with changes, blue to amber. Verified: `botMedicBlue` →
  `botMedicAmber` on one frame.
- **All six beats**, end to end, landing in `naming` with the yard built.
- **ESC skips** from any beat and lands in exactly the same place.
- **The movement lesson moved.** The run marks the yard's `move` lesson as
  taught — and if you SKIP the prologue it does not, so a skipper still gets
  taught to walk. That fell out correctly rather than being designed, but it is
  the right behaviour and should stay.

**Deliberately not built yet:**

1. **No prone sprite.** The hit is a shake, sparks, a hard zoom and a fade. He
   is still standing when it lands, because there is no drawing of him on the
   ground — and the boots-in-frame shot from §2 beat 6 is not built either.
   This is the biggest gap and it is the emotional peak of the scene.
2. **The windows are not lit.** The "before" city is lit by streetlights, not by
   warm windows, because building glass is a fixed dark colour in
   `BUILD_STYLE`. It reads as dusk rather than as a city with people home in it.
   Needs a lit variant of the building volume.
3. **The mechanic's shack, waking up, and the `E` lesson on the diagrams** (§5,
   §6) are not built. The prologue currently hands to the naming prompt and then
   to the yard exactly as it always was.
4. **Beat 4 is machines walking at people.** No shopfront going in, no smoke
   layer — it is staged, not yet dressed.
5. `main-story.md` and Marek's *"found you half-dead by the fence"* line are
   **not yet rewritten** (§1). Nothing contradicts anything while the mechanic
   does not exist yet, but both change the moment §5 is built.


---

## 12. Corrections, 2026-08-26

**The run is watched, not played.** Laurens cut the playable section, and the
reason is worth keeping: this is a memory of a night that has already happened,
and handing somebody the sticks quietly promises they can change it. They
cannot. The movement lesson therefore stays in the yard where it always was, and
the prologue teaches nothing.

**The colour was inverted, and it was my error.** `droids.js` had already written
the rule down — *Blue is WARDEN. Amber is damage.* The first pass had the helper
machines blue while they still served people and amber once they turned, which
is backwards. They are now **warm while they are the city's and Core blue the
moment they are not**, so the Correction is the Core's own colour arriving at
the edge of the city.

**The Scrapper's eye is Core blue.** This overrides a deliberate note in
`droids.js` that called its amber bulb the junk machine's warm exception. The
trade is worth it: **the only amber left on any machine is a weak-point flash
and the Compactor's eye**, so "what glows amber can be hurt" is true with no
footnote. Its attack telegraph stays red/amber — that is a warning, not an eye.

**THE CORE IS A CRYSTAL, and it opens the game.** From Laurens' reference: a
faceted gem the height of a high-rise, lit from inside, with a server hall
drinking off it. So the silhouette is a bipyramid over a rack floor, and the
narration says what it was for. Three things decided how it is drawn:

- **Integer fills only.** Every facet is a scanline run and the heart is a set
  of stepped diamonds. Nothing here needs antialiasing to read, and at this
  distance anything that did would turn to mush.
- **The heart is white-hot, not amber.** The reference has a warm centre and it
  is beautiful, but amber is spoken for. The Core is the one thing in the game
  that cannot be shot, so it runs white into cyan and stays out of that
  vocabulary.
- **It is not outlined.** Contrast is depth in a flat palette; an outlined tower
  sits in the street instead of a mile behind it.

Two framing lessons, both learned the hard way and both worth remembering for
the next cutscene:

1. **A caption is a wall.** At 320×180 a shot carries about three lines of the
   pixel font before the text is the picture. The Core's narration was five
   lines over the middle of the crystal; it is two shots now.
2. **A tall sprite needs the camera aimed above the tile it stands on.** The
   crystal is 168px tall above an anchor at its base, so framing on its own tile
   puts the point off the top of the screen. The camera ends on a negative tile
   y, which is fine — cameras are not clamped to the map.


---

## 13. The Core is on the horizon, 2026-08-26

Laurens: *"Make the cutsceen accurate with core atlas, the core is far away in
the inner part of the city."* Checked against `design/city-blueprint.html`, and
he is right — the first pass was wrong in a way that mattered.

**The prologue street is in the FRINGE, Ring 5, the outermost ring**, and the
atlas runs the whole journey bottom-to-centre along the M7. The Core is **five
rings in**. The crystal was standing twelve tiles up the road filling the frame,
which quietly told the player they could walk to it before breakfast. The entire
game is the distance between those two points, so the opening shot has to be the
one that establishes it.

**So it is a backdrop now, not a prop on a tile.** `drawFarCity` in `game.js`
paints a band behind the world, and the area asks for it with `skyline: true`.
Three depths in it:

| Layer | What | Shade |
|---|---|---|
| Back | The Core District, and the Core itself | palest, `#2b3742` |
| Middle | The Grid's towers | `#212b34` |
| Front | The Belt's stacks and the Sprawl's blocks | darkest, `#161d24` |

Contrast falls away with depth, which in a flat palette is the only thing that
makes distance read at all. Nothing on the band is more than three shades off
the night behind it — except the Core, which is the only saturated thing on the
skyline, and the lit shelf of server floors under it.

**The crystal is about forty pixels tall there**, which is what a high-rise
looks like from the edge of a city. It is the same object as before, drawn at
the size the geography actually gives it.

Two things this taught, both worth keeping:

1. **Parallax at a tenth.** The horizon takes a tenth of the camera's motion —
   enough that it reads as being out there, little enough that it never slides
   out of a shot.
2. **Anchored, never tiled.** The first version tiled the band and let the
   parallax decide where the Core landed, so the one thing the shot is about
   drifted off frame the moment the camera moved. It is drawn once now, lined up
   so the crystal sits near the middle of the screen — which is also what lets
   the push-in reach it, because the cutscene zoom scales about that point.

The beat is two shots: the horizon at rest, then a push to 1.85× that closes on
the Core without ever pretending it is near.


---

## 14. Why the Core is a plate, 2026-08-26

Laurens, from an iPad screenshot: *"There is a problem in the cutsceen this looks
cooked, you know why."* He was right and the cause was mine.

**What was on screen:** half the frame was a flat wedge of ground with speckles
on it and a hard diagonal edge — the prologue map's default fill, which I had
written into the code as *"rubble default, never seen"* and then pointed a
camera straight at. Past that edge was the void where the tilemap stops.

Three attempts to fix it by framing, and what each one taught:

1. **Build on every bare tile.** Traded one problem for a worse one: a solid mass
   of roofs from edge to edge with no sky left to put a horizon in.
2. **Keep the camera on the street.** Fully dressed, and the Core was invisible —
   hidden behind the frontage.
3. **Lift the camera over the roofs.** Back to seeing the map's edge.

The pattern under all three is a property of the projection, and it is worth
writing down because it will come up again:

> **In this isometric view, everything north of the camera is drawn both higher
> up the screen AND taller. There is no sky from street level. Any camera lifted
> far enough to find one is looking over the edge of the tilemap.**

So the Core does not get a view; **it gets a plate.** A beat can set
`plate: true`, and the runner draws a picture instead of a place: the skyline
band, the crystal pinned to a fixed point, a deterministic star scatter, and no
tiles or camera involved at all. `plateScale` animates across the beat, so the
push-in enlarges it without ever letting it wander.

That is what an establishing shot of something ten kilometres away *is* — a
separate image, not a thing you can see from the pavement. It also means the
Core shot can never again be broken by something changing on the map.

The street beats that follow are unchanged and still play in the real world.


---

## 15. The one who is caught, 2026-08-26

Laurens: *"Add one person beeing caugth and killed to the cutsceen."*

**Who:** `civGrey`, the patient the medical unit was treating in beat 2. Nothing
else in the scene says as much in as little time.

**How it is drawn:** a `civDown` sprite in the same 15×20 frame the standing
people use, so it is a **key swap** and no drawing code had to learn about it —
the same trick the Correction uses to change a machine's light. It follows
`Sprites.banditDead`'s idiom, which carries the note *"No glow — this one was a
person."* No blood: the machine is standing over them when it happens.

**Two bugs worth remembering:**

1. **The victim was being moved twice a frame** — once by their own flight and
   again by the generic "everybody scatters" loop — so they ran at 4.6 tiles a
   second against the machine's 3.0 and **the gap grew**. Nobody was ever
   caught. Anything with its own movement has to be excluded from the crowd
   loop.
2. **The moment was not framed.** It happened at the edge of a shot pointed at
   the street. At 320×180 an event you have to hunt for has not happened, so the
   beat now frames the pair at 1.32× and the body lands near the middle of it.


---

## 16. Three bugs, 2026-08-26

Found by hunting rather than by waiting for them, after Laurens asked for a
bug pass. All three were in code added the same day.

**1. Skipping the prologue could break the next one.** The Correction's
blue-to-amber swap was guarded by a one-shot flag that lived on the runner
(`Cine._turned`) and was only cleared in the beat's `exit`. **A skip never runs
`exit`** — so skipping during that beat left the flag set, and on the next New
Game **the machines never turned at all**. The fix is general rather than a
patch: beat-scoped state belongs on the beat, so the runner clears `b.once`
every time a beat is entered and `tick` is handed its own beat. Any future
one-shot inherits the fix.

**2. The prologue appeared on the traveller's world map.** It is a real area
with a `world` offset and it collects fog like any other, so it got a
thumbnail — a street from a year before the game, drawn at (40, 44), which is
exactly where St Martin's stands in the present. Areas can now be marked
`memory: true`, and a memory never gets a thumbnail: it cannot be drawn, framed
by the zoom floor, or counted as somewhere you have been.

**3. Its fog was written into every save.** Same root cause, and it would have
been dead data in every save file forever. `collectFog` now skips memories.

**Old saves are fixed too, not just new ones.** A save written before this
change still carries `fog.prologue`, and it was verified loading cleanly with
the prologue still absent from the map — the guard is at the drawing end, not
only at the writing end.

Also confirmed unaffected: all four areas load with the right cast and prop
counts, a returning player's CONTINUE goes straight into the world with the save
intact, and the full prologue still reaches the naming prompt in 54s. The only
console line anywhere is the pre-existing favicon 404.
