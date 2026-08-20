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
corners. Landmarks: Aldergrove Primary, St Martin's church (future
Candlelight), The Regent Hotel, City & County Bank, and a proper gas station
(canopy on six pillars, kerbed islands, detonating pumps, pylon totem).
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
3. **Candlelight camp + Q2** inside St Martin's: trader, workbench, med
   station, respawn re-anchor, mission board.
4. Interiors (enterable shops/houses, roof fade).
5. Field 12 + the drone crash (Q3) and the Underpass to Ring 4.
6. Open questions never answered: day/night.
   *(Answered 2026-08-19: the Compactor drops a **badly damaged rifle**, repaired
   by a droid-dismantler at Candlelight — HHDs do NOT drop rifles. See
   `design/hhd-squads.md`.)*

## Known risks
- Compactor at 200 HP + full heal ≈ 334 damage budget; fine in the arena with
  60 rounds, possibly brutal at the gate with ~18. Tune when playtested.
- The Fringe has no enemies yet, so the danger gradient doesn't exist.
