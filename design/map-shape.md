# THE SHAPE OF THE MAP — the box, and two ways out of it

**Status: BRAINSTORM. Nothing here is built, nothing here is approved.**
Written 2026-09-02 in answer to *"the Fringe is currently a box and not a ring,
maybe we need to reimagine the way the map is built... we can make the Fringe
larger, make a second map, that doesn't have huge parts where we will never go
/ build."*

Atlas: **https://claude.ai/code/artifact/e5127405-9a8f-4c59-a807-0dd9c58b2927**

Also settles a note from the same message: **the Core tease is cut.** See §5.

---

## 1. THE MEASUREMENT

Not a feeling. Run against the live Fringe:

| | tiles | of the rectangle |
|---|---|---|
| The map | 200 × 150 = **30,000** | — |
| Walkable | 21,437 | 71.5% |
| Within 5 tiles of any prop | 9,922 | **33.1%** |
| Within 14 tiles of the critical path | 3,882 | **12.9%** |

And the one that ends the argument:

> **Everything the game ever sends you to fits in x 35–197, y 60–120.**
> That is 9,720 tiles — **32% of the map.** The whole northern half and the far
> west contain nothing anyone is ever sent to, has a reason to enter, or would
> miss.

**The Fringe is 30,000 tiles carrying 3,900 tiles of game.** Two thirds of it is
bare ground more than five tiles from anything at all. That is exactly the
"huge parts where we will never go" in the brief, and it is measurable.

---

## 2. WHY IT READS AS A BOX AND NOT A RING

Four causes, in order of how cheap they are to fix.

**1. Three of its four edges are invisible.** East is the junkyard wall and it is
real — you can see it, it has a gate in it, it explains itself. North, south and
west are hard limits with **nothing drawn on them at all**. You walk until you
stop. That is the single loudest reason it feels like a rectangle, and the atlas
*already specifies what belongs there* and none of it is built:

| Edge | The atlas already says | Built |
|---|---|---|
| West | **The Ashfield** — tank farm still burning, permanent smoke ceiling, ash falling | ✘ |
| East / south-east | **Grey Run floodplain** — black shallow sea, drowned cars | ✘ |
| North-west arc | **The Cordon** — 6 m electrified mesh, razor spools, drone pylons | ✘ |
| North-east arc | **Viaduct collapse** — a kilometre of pancaked M7, rebar ridge | ✘ |
| North | **M7 inward — OPEN.** "Nothing stops you." | ✘ |

**2. Uniform density.** The same block size, the same street width, the same
building height everywhere. A ring segment should get denser and taller inward;
this one is flat, so no part of it feels closer to anything.

**3. The street grid has no *inward*.** Six straight segments meeting at right
angles. Nothing on the map points at the Core. In the atlas the M7 is **the
radial road** and the rings are circumferential — the Fringe has neither idea in
it. The spine is just another street.

**4. Scale.** 30,000 tiles for 3,900 tiles of game. **The emptiness *is* the
box**: you feel the rectangle because most of your walk is across undressed
ground, and undressed ground has no shape to feel instead.

---

## 3. IDEA A — GROW THE FRINGE INTO AN ARC

*"We can make the Fringe larger."* Keep one big Ring-5 map, and change its
shape and its grammar rather than only its size.

- **Finish the four edges** with the atlas's blockers above.
- **Curve the circumferential streets.** The north and east crosses stop being
  straight lines and bend — one tile of offset every ~12–15 tiles is enough to
  read as an arc, and it stays a staircase of straight runs, so the tile grammar
  and THE ANGLE RULE are untouched. Frontages key off the street, so they curve
  with it for free.
- **Make the spine the M7,** eight lanes, the widest thing on the map, running
  inward. Everything else defers to it. That gives the map a direction.
- **Density falloff** — blocks smaller and buildings taller toward the inward
  edge, so the pressure gradient is visible in the architecture.
- Grow north into the band and put Field 12 in it.

**What it costs:** surgery on the one map the entire game happens in. The street
table in `design/city-map.md` is rewritten, every frontage is re-cut, and the
church corridor's flood-fill verification has to be re-proven. The map grows to
roughly 200 × 190 = 38,000 tiles.

**Honest verdict: this fixes "box" and makes "dead space" worse.** After all
that work the ratio is 3,900 tiles of game in 38,000. It is a nicer-shaped
rectangle with more nothing in it.

---

## 4. IDEA B — RIGHT-SIZED DISTRICTS, JOINED AT SEAMS

*"Make a second map that doesn't have huge parts where we will never go."*
This is the one I would build, and it is three separate decisions.

### B1. Stop growing the Fringe. FINISH it — and shrink it with fire.

The blockers are not decoration for the edges. **They can be brought inward.**
You do not delete map — you put a wall of fire in front of it.

- The **Ashfield's** smoke ceiling and burning ground eat the western strip
  (x < 30) — which today is nothing but the spine and empty lots.
- The **Grey Run** floods the south-west corner.
- The **Cordon** cuts the north-west arc — and it is the loudest piece of
  storytelling in the ring: *the machines herded people, they did not just kill
  them.* It has been written for weeks and never built.
- The **viaduct** closes the north-east.

Nothing is destroyed, nothing already built is touched, no save breaks. The
walkable Fringe drops from 21,437 tiles to somewhere near **12,000, nearly all
of it within sight of something**, and every direction you can walk now ends in
a thing you can look at and understand.

**This is the cheapest work in this document and the biggest single change to
how the map feels.** It could ship on its own, before any new area.

### B2. A district is a shape with real edges, sized to its content.

The new rule for everything after the Fringe:

> **Do not build a rectangle and then look for things to put in it. Pick a real
> place with a real boundary, and build all of it.**

The boundary has to be something that explains itself — a fence, a river, a
tunnel, a wall of fire. The engine already loads areas and the seam trick is
proven three times (the yard gate, the church door, the crypt hatch). Areas are
cheap. **Big areas are not.**

### B3. Field 12 is the proof, and it is better as its own map.

An airfield **is a fence around exactly the content you build.** Every side is
diegetic for free. That is the ideal shape for this model, and it turns the
weakest part of the Field 12 plan into its strongest.

| | Field 12 as a band of the Fringe | Field 12 as its own area |
|---|---|---|
| Size | ~3,000 tiles bolted onto a map that already has 26,000 tiles of nothing | **90 × 70 ≈ 6,300 tiles, inside a fence, all of it dressed** |
| Edges | The Fringe's invisible north limit, plus a viaduct | A perimeter fence with two gates. Done. |
| Dead space added | The whole band you cross once to reach it | ~none |
| Risk to the live map | Rewrites the Fringe's north | Additive. Nothing existing is touched. |
| The walk there | Up an empty mid street through 40 tiles of nothing | A seam at the north cross, the way the church door works |

And it composes: the **Underpass** is a tunnel (bounded by definition), **the
Lamp** is a service bay off it, and **the Sprawl** should be a wedge between the
Cordon and the floodplain rather than another rectangle.

---

## 5. THE CORE TEASE IS CUT

Laurens: *"It's too early to tease the Core with ambiance."* Agreed, and on
reflection it was two mistakes at once:

- **The tower cab's window onto the Core** — cut entirely from
  `design/field-twelve.md`. The Core has been seen once, in the prologue, as a
  thing from a year ago. The next time should be *earned*, and Ring 5 has not
  earned it. Seeing it from a Ring-5 airfield also flattens the distance the
  atlas is built on: the Core is five rings away, and a place you can see from
  the outskirts on a clear morning is not five rings away.
- **The cold blue-grey tint as foreshadowing** — the reasoning was "quietly
  foreshadow the Core two rings early", which is the same mistake with the
  volume down. Field 12 can still be *colder than the Fringe* because concrete
  at dawn is colder than brick at dusk, and for no other reason. Not blue.
  Something bleached and grey.

The tower keeps its climb, its beacon, its breaker and the gun-camera optic. It
loses the view.

---

## 6. RECOMMENDATION

**Build B, and take the cheap half of A with it.**

| | | Size |
|---|---|---|
| **1** | **Finish the Fringe's edges**, and bring them inward: Ashfield, Grey Run, Cordon, viaduct. Nothing new to walk on — the map keeps its content and loses its nothing. | **M, and it is the best value on this list** |
| **2** | **The M7.** Make the spine eight lanes and the widest thing on the map, so the world has an inward. No new tiles, one street re-cut. | S |
| **3** | **Field 12 as its own fenced area**, reached by a seam at the north cross. All of `design/field-twelve.md` still applies except the Core view. | L |
| **4** | The Underpass and the Lamp, unchanged | S |

Curved circumferential streets and density falloff (the expensive half of A)
stay on the shelf. They are the right idea for **Ring 4**, which is not built
yet and can be drawn that way from the first line — which is much cheaper than
re-cutting a live map to prove it.

---

## 7. OPEN QUESTIONS

1. **Is the shrink acceptable?** B1 takes roughly 9,000 walkable tiles out of the
   Fringe behind fire, water and fence. It is all bare ground today — but it is
   bare ground you *can* walk, and after this you cannot. *(My lean: do it. The
   map gets smaller and the world gets bigger.)*
2. **How hard does the Ashfield read?** A permanent smoke ceiling over the
   western third means a screen-wide haze effect and falling ash. It is the most
   expensive of the four blockers to draw and the most striking. Build it first
   or last?
3. **The Cordon is the atlas's loudest story beat** — *the machines herded
   people out.* Is a fence you cannot pass and cannot fight the right way for
   the player to learn that, or does it want an NPC to say it?
4. **Field 12 as its own area** — agreed? It changes the whole approach section
   of `design/field-twelve.md` (§7, "two roads north") because the roads now end
   at a seam rather than a gate.
5. **Ring 4 drawn as an arc from the first line** — worth the extra care, or
   does the wedge stay a rectangle until it proves it needs otherwise?
