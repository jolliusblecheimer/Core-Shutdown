# CORE SHUTDOWN — project state

**Updated:** 2026-08-17 · **Live:** https://jolliusblecheimer.github.io/Core-Shutdown/
**Repo:** https://github.com/jolliusblecheimer/Core-Shutdown (public)
**Boss arena:** https://jolliusblecheimer.github.io/Core-Shutdown/arena.html

---

## What exists and works

### Engine
- Vanilla JS + Canvas, no build step. Two canvases: low-res pixel world
  (320×180, scaled) + high-res UI overlay for crisp text.
- **Area system** — a registry of authored areas (`Areas` in `map.js`); the live
  map arrays are swapped on transition. Fade out → rebuild → fade in.
- **Open-world rendering** — visible tile range derived from the camera; props
  and decals in 8-tile spatial buckets. The 200×150 Fringe runs at ~0.7ms/frame.
- **Save v3** with migration from v1/v2, per-area world state, fog of war,
  and a separate scratch key under `window.TEST_MODE`.
- Sound: fully synthesized SFX (`js/audio.js`) + procedural ambient drone,
  wind and machine accents. `O` toggles ambience.
- HD-2D post pass: colour grade + tilt-shift bands, god rays, dust, AO.

### Content — Area 1: THE JUNKYARD (32×32, complete)
The tutorial. Wake with nothing → find the metal pipe → fight Scrappers →
loot wrecks → meet Marek in the shack → mission (5 scrap) → he gives the
scrap pistol + the gate key → trade (snacks, ammo, piercing knife for 2 tech)
→ unlock the gate → **THE COMPACTOR** ambush → gate opens to the city.

Systems shown here: stealth with detection meters and crouch (Shift), patrols
that path heap-to-heap through a hub near the shack, 12s enemy memory,
explosive barrels, melee/gun with scroll-wheel switching, BotW-style inventory
(I), thought bubbles, staged freeze-frame tutorials, passive regen.

### Content — THE COMPACTOR (first boss, complete)
Hidden in the junk until you unlock the gate; four-legged crawler, one big
glowing eye (2× damage), armoured front plow (bullets/pipe clank, knife
pierces at half), charge-into-wall stagger (1.5×), claw slash, three phases
with cutscenes: rage zoom → instant charge at 66%; trash-absorb **full heal**
→ repeating energy nova at 33%. 200 HP. Drops tech + scrap, opens the gate.

### Content — Area 2: THE FRINGE (200×150, first pass)
One continuous open city, no loading. Hand-drawn street network (gate road,
spine, two cross streets, mid street, south link) with procedural building
fill. Street tileset (road + lane paint, kerbed pavement, verge, forecourt),
streetlights (20 of 60 lit and casting light), traffic lights, bus stops,
dumpsters, hydrants, postboxes, queued traffic, a slewed bus.
**Buildings are single pre-rendered volumes** — 9 styles (house, brick, shop,
shutter, office, school, church, hotel, bank) with faces + roof sharing real
corners. Landmarks: Aldergrove Primary, The Regent Hotel, City & County Bank,
and a proper gas station (canopy on six pillars, kerbed islands, detonating
pumps, pylon totem).

### Content — ST MARTIN'S, the cathedral (exterior, complete)
The landmark the whole sign trail leads to, at (50, 52), 12×16 tiles, building
kind `C`. Not a box with a steeple: a composite volume built in tile space and
projected once (`Sprites.makeCathedral`) — nave with a steep slated roof, aisles
either side under lean-tos, twin west towers, a buttressed east flank, and the
lead-blue fleche over the crossing. The west front faces SOUTH, at the parvis
and the last sign of the trail: portal in four recessed orders with oak doors
and strap hinges, two flanking doors, stained lancets, a traceried rose, saints
in the gable, cross on the apex. Towers carry blind arcades, saints, a stopped
clock on each face, louvred belfries, an openwork parapet and pinnacles.
Paved parvis across the front and a strip down each flank.
Interior, Candlelight and the churchyard (railings, graves, trees) are not built.
Handmade sign trail (planks, bedsheet banners, painted road arrows) leading
**only** to the shelter. Fog-of-war map on `M`.

---

## Outstanding — next session starts here

1. **Long props are still flat rectangles** — bus stop, dumpster, awning don't
   lie along the road. Rebuild them in face space like buildings, not by
   shearing. *(Laurens' item 4, partially done: facade/column heights fixed.)*
2. **HHDs — Human-Hunter-Droids.** The streets are beautiful and empty.
   Marshal (rifle, bursts, takes cover), Bailiff (short-range flusher),
   Spotter (calls them in). Scrappers stay in the yard. Design in
   `design/fringe-plan.html`.
3. **Candlelight camp + Q2** inside St Martin's. **Planned in full:
   `design/candlelight.md`** — two interior areas, six survivors, two traders,
   sleeping bays that re-anchor respawn, a medbay, a bench with a half-stripped
   drone on it, a crypt with water and grow beds, and a map table that fills in
   the Fringe map when you read it. Waiting on approval; the biggest piece of
   engine work in it is turning the single global `npc` into a list.
   Still outstanding either way: the churchyard (railings, gravestones, trees,
   a lych gate) and the glow of a camp behind the glass — the windows are
   deliberately unlit because nobody lives there yet.
4. Interiors (enterable shops/houses, roof fade).
5. Field 12 + the drone crash (Q3) and the Underpass to Ring 4.
6. Open questions never answered: HHDs dropping their rifles as the ring's
   weapon upgrade; day/night; the Compactor's loot drop (armour plate vs
   piston maul vs grabber claw vs eye lens).

## Known risks
- The cathedral is ~250 px tall and the viewport is 180. From the parvis you
  get the doors, the rose and the foot of a tower; the tower tops and the
  fleche sit above the screen edge unless you are up-screen of the building.
  That is inherent to the projection, not a bug — but if it should read whole
  from the front it has to come down about a third.
- Compactor at 200 HP + full heal ≈ 334 damage budget; fine in the arena with
  60 rounds, possibly brutal at the gate with ~18. Tune when playtested.
- The Fringe has no enemies yet, so the danger gradient doesn't exist.
