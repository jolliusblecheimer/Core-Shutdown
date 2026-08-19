# CORE SHUTDOWN — conversation log

Every exchange between Laurens and Claude, oldest first. Entries after the
first session are written live; **this first session was reconstructed at the
end of it**, so the asks are faithful but Claude's replies are condensed.

**Rule:** append a new entry every time we talk. Never rewrite history.

---

## Session 1 — 2026-08-16 → 2026-08-17

### 1. The concept
**Laurens:** Wants a dystopian game — a huge AI-ruled city, you start in the
outskirts where robots are weak, they get stronger toward the middle, fight to
the centre and shut down all AI. Robot types, gear, survivors, camps, missions.
Asked what Claude's limits are for graphics — Godot? Pokémon-style pixel? A
2D/3D mix?
**Claude:** Explained the honest limits (Unity/3D bad, Godot workable but slow
to iterate, web/JS ideal because it can be run and seen directly). Asked three
questions.
**Decisions:** Web + JavaScript · isometric · real-time combat.

### 2. First plan
Wrote `GAME_PLAN.md`: six concentric rings, enemy roster, art direction, 5
build phases.

### 3. Plan revisions
**Laurens:** No hard borders between rings — smooth transitions, the *danger*
is the gate; enemy *variety within* each ring, not one robot per ring; start
small and build in editable pieces, don't regenerate the whole map.
**Claude:** Reworked the plan: open world with no walls, enemy role families
(grunt/archer/runner/flyer/heavy/turret/support), block-based maps.

### 4. Design decision files
**Laurens:** Wants files capturing every choice so nothing has to be
re-explained later.
**Claude:** Created `design/` — combat, enemies-bosses, world-map,
progression-gear, story-missions, art-style, build-approach — each split into
"Decided" and "Open questions".

### 5. Testing + the plan-first rule
**Laurens:** How will I test it? Do I need VS Code? Also: **give me a plan
before you code, every time.**
**Claude:** No tools needed — double-click `index.html`, F5 to refresh. Wrote
the plan-first rule into `build-approach.md`. Pitched the scrap yard slice.

### 6. First build — the scrap yard
Isometric renderer, player with mouse-aim shooting and a dodge roll, one
Scrapper with wind-up telegraphing, particles, lighting, HUD.

### 7. Graphics feedback round 1
**Laurens:** Kill the visible tile grid; junk must read as objects not floor
decals; barricades look blurry; want way more junk; add a minimap; add a
building you can enter; show weapon + ammo; **start with no weapon** and find
one; add item indicators.
**Claude:** Blended ground, outlined props with contact shadows, denser junk,
minimap, survivor shack with fading roof, unarmed start with glowing pickups,
first NPC and mission.

### 8. Reference photo (real scrap yard)
**Laurens:** Sent a photo. Wants multi-tile trash *mountains*, far more cars
and scrap, and barricades angled per wall direction.
**Claude:** Added 12-tile and 4-tile mounds, 8 wrecks, and sheared wall sprites
per iso direction.

### 9–11. Readability pass
**Laurens:** Zoom in, character too small; kill tile seams; walls still
protrude; nerf the pistol; robots must emerge from behind cover, not appear.
Then: text is unreadable; remove the dash; smaller health bar; better character
and pistol; I can walk behind the house and vanish; robots should come to me.
**Claude:** 320×180 zoom, scanline-filled seamless tiles, continuous wall runs
sliced per tile, slower fire, mound spawns; then a **separate high-res UI
canvas**, corner posts, ghost silhouette, seek behaviour.

### 12. Reference images — techwear + pixel Glock
**Laurens:** Redo the character from this reference; redo the pistol; walls
*still* don't line up; BotW-style inventory with tabs and equipping; the
survivor should give the gate key; robots need a brain so they don't get stuck.
**Claude:** New character, Glock-style icons, **found the real wall bug** (full
corner pieces overshoot — they must be half-trimmed), full-screen inventory,
gate key, obstacle-avoidance steering.

### 13–14. Bugs
**Laurens:** Sometimes I press a button 5 times before it works. Then: the
tutorial hangs when I open the inventory.
**Claude:** Input buffer was cleared on frames where the sim didn't run —
fixed, plus per-key consumption. Tutorial deadlock fixed (opening the pack
completes the lesson).

### 15. HD-2D (Octopath reference)
**Laurens:** Sent an Octopath Traveler screenshot. Make the map look like this
— and back up the code first.
**Claude:** Backed up to `backup/`, then built the pipeline: richer tiles,
ambient occlusion, god rays, dust motes, puddles, colour grade, tilt-shift.

### 16–17. Audio
**Laurens:** Sound effects for everything. Then: is there background music?
**Claude:** 24 synthesized SFX; then a procedural ambient bed — drone chords,
wind, distant machinery. `M` (later `O`) toggles.

### 18–21. Polish + a lost save
**Laurens:** Knife too big; scroll hint should expire. Then **"make sure the
save works for everything — I just lost my knife."** Then: what's the tech drop
chance? Then: the gun looks low-res.
**Claude:** Fixed both visuals. **Root-caused the save loss: Claude's own tests
were writing to the live save slot.** Hardened saving (instant saves on every
event, migration, position rescue). 20% tech. New held-pistol sprite.

### 22–28. The story
**Laurens:** Write the story — junkyard, find out what happened, fight to the
middle, reprogram the man behind it, final cutscene where he's stabbed in the
back as he enters the command and every robot dies.
Then, in successive corrections: **the hero WAS the man behind it all**; he
**never regretted it**, it just backfired; **machines can kill him** (that's the
game); **he survived because he ran** — the prologue is literally true; he
never wrote himself an exception because he thought he was untouchable.
**Claude:** Wrote and rewrote `design/main-story.md` after each correction:
WARDEN, Director Elias Vann, the Correction, the Longest Night, the Sunset
Command, the botched purge, Marek and Ada, the ending where the machine kills
him one second too late.

### 29. The city atlas
**Laurens:** A detailed blueprint of the city I can look at and change by
telling you.
**Claude:** Published `design/city-blueprint.html` as an artifact — all six
rings, districts, camps, quest sites, every boss.

### 30–33. Boss design
**Laurens:** Chose the roster; the Compactor becomes the tutorial-end boss
hidden at the gate; Shepherd moved outward; Sentinel is the canonical Ring 1
route; **every boss must drop forge-worthy loot**. Then: 90 HP is far too low.
Then: add armour and weak points. Then: tell me through a **thought bubble**,
not UI text — and make aiming deliberate.
**Claude:** Locked the roster and the Forge rule; 200 HP with barrel
resistance; locational damage; thought bubbles + weak-point reticle.

### 34–42. Building the Compactor
**Laurens:** The knife should pierce; armour is *patches* to shoot around, not
the whole body; build it in a **test arena** first. Then: it gets stuck on
junk — it should crush through everything; redesign it as a four-legged
crawler. Then: lights too dark, rounder body, phases, drop the back core.
Then: the claws must be the attack. Then: bigger armour panels; make the phase
changes **cutscenes** — a rage zoom, and one where it absorbs trash and heals.
Then: drop the shield effect, more debris. Then: heal to **full**.
**Claude:** Built `js/boss.js` and `arena.html`, iterating each time.

### 43–48. Into the game + hosting
**Laurens:** Add the boss to the game; two ammo packs during the fight; gate at
the bottom of the map; cutscene where the key is drawn and it appears behind
you. Then: is it in the real game? Then: what's my git link? Then: make the
repo public again.
**Claude:** Wired the gate ambush; found the repo had gone private (killing
Pages), made it public, restored the live site.

### 49–53. Gate fixes
**Laurens:** Wrong wall and wrong angle — put it where I'm standing (checked
the live tab: east wall by the shack). Then: I walked through without clicking,
and I can see the wall behind the gate. Then: **it's a visual glitch, I'm not
walking through.** Then: deploy.
**Claude:** Moved the gate twice, made it impassable-but-open with a painted
passage, then found the real cause — tall props drawing over the player — and
made walls/gate fade when you stand behind them.

### 54. Saves must survive updates
**Laurens:** Make sure progress is kept when you update the game.
**Claude:** Save v2 → migration, defaults merging, position-keyed world state,
out-of-bounds rescue. Admitted overwriting the run again and reconstructed it.

### 55–58. The world beyond
**Laurens:** Plan the rest of the map — is a whole ring feasible, or block part
of it? Update the atlas with realistic blockers. Then: a detailed plan for the
wedge. Then: **scrap it — that's junkyard parts rearranged. I want a real
street, a gas station, signs about what used to be here, new robots (HHDs),
narrower and longer, open world with no limits.** Then: show me where this sits
on the atlas.
**Claude:** Wedge plan with diegetic barriers (Ashfield fire, floodplain,
Cordon fence, viaduct collapse); then scrapped it and rewrote
`design/fringe-plan.html` as the open-world street plan; added a city locator
figure and scale table.

### 59. Building the open Fringe
Area system + 200×150 city, street tileset, facades, signs, gas station,
culling and spatial buckets, fog-of-war map.

### 60. Nine fixes
**Laurens:** Walls don't line up; all houses look the same — add shops, a
school, the church; road stripes are the wrong angle; the bus hitbox is broken;
signs should lead from the junkyard to the camp and NPCs should talk about
locations; **M should show the map of where I've been.**
**Claude:** Corner columns, new building types + landmarks, sheared lane
dashes, bus footprint fix, sign trail + Marek's briefing, fog-of-war map.

### 61. Nine more (plan first)
**Laurens:** Let me walk back to the junkyard; add a hotel and a bank; buildings
need roofs with variation; walls *still* don't line up and props don't align
with the road; show me as a tiny character on the map; make the gate visible
from the road; **returning to the yard restarted the questline**; the gas
station doesn't look like one; makeshift shelter-only signs. *Plan first.*
**Claude:** Wrote `design/fringe-pass3.md`, then built: roofs, hotel + bank,
rebuilt forecourt, two-way visible gate, handmade signs, map marker. Could not
reproduce the questline reset — most likely Claude's own test saves — so
isolated testing to a scratch save key.

### 62. The panel approach is flawed
**Laurens:** The idea of building from wall panels is flawed — find a different
approach.
**Claude:** Agreed; replaced it. **Buildings are now single pre-rendered
volumes** (both camera-facing faces + roof drawn from the same corners), with
openings laid out in face space. Props 4010 → 302, build 179ms → 18ms, frame
2.37ms → 0.67ms.

### 63. Save everything to markdown
**Laurens:** We're running out of context — put all changes and ideas in .md
files, keep a log of all our prompts and answers, and always keep the .md files
updated.
**Claude:** Wrote `CLAUDE.md` (standing rules, auto-loaded next session),
`PROJECT_STATE.md` (what's built + what's next), and this log.

### 64. The angle pass (8 fixes)
**Laurens:** Cars are at the wrong angle — **and put in the important .md files
that every texture's angle must be checked and adjusted**. Removed signs still
pop bubbles where they used to be. Signs point the wrong way and are the wrong
angle. V-shaped roofs have a hole between the wall and the roof (fix it in the
roof part, not the walls). Crosswalks wrong angle. One wall type has a black
stripe. Road arrows wrong angle. Add roof variation — chimneys, AC units,
antennas, satellite dishes.
**Claude:** Wrote **the angle rule** into `CLAUDE.md` and `art-style.md`, then
fixed all eight: cars/bus/shelters sheared along their road; crossings drawn
across the carriageway; four directional painted arrows; makeshift signs
angled to their street with a painted arrow pointing along the trail; gable
triangles filled on pitched roofs; shopfront rebuilt into panes with mullions,
stallriser and a painted name band (the black stripe); orphan sign bubbles
removed; roof clutter varies by seed. **Pushed.**

### 65. HD-2D detail overhaul (in progress, LOCAL ONLY)
**Laurens:** Sent Octopath/Triangle Strategy reference shots — wants that level
of attention to detail. **For big graphic changes: work on localhost and do not
push until approved.** Don't forget the junkyard textures. And when things are
angled they must still look 3D.
**Claude:** Added the local-first rule to `CLAUDE.md`. Started the art pass:
- Buildings: brick/stone **courses with staggered joints** across both faces, a
  lit top course under the roof, a vertical corner highlight
- Windows are now **recessed** — dark reveal, glass set back, frame, lit sill,
  mullion — instead of painted rectangles
- Pitched roofs are **shingled**: overlapping rows drawn in the slope's own
  space with shadow lines and lit lips, plus a ridge cap
- Flat roofs get felt seams, weathering and a real **parapet** (outer wall +
  lit coping) so the deck sits inside it
- Pavement rebuilt as **individual laid slabs** on the iso diagonals with lit
  edges, joint shadows, weeds and cracked slabs
- Junkyard concrete given the same slab treatment
**Not pushed** — awaiting review.

### 66. Twelve fixes, then a revert
**Laurens (12 items):** boss got stuck; dying in the boss fight forces a
restart; all cars look 2D; move the church so it isn't a straight walk; signs
should give directions not distances; the sign boards look weird — just put
text on them; the survivor should warn about killer droids; a huge grey square
on the road; the map's circle animation should be pixelated; render distance
too short, buildings vanish; another grey square with a red outline; trees on
empty lots, 1-in-4 buildings overgrown, 1-in-4 ruined.
**Claude:** Built all twelve, then Laurens reviewed mid-session and reverted
four of them.

**Kept:**
- **The boss always comes.** Three escalating answers to being blocked: slide
  along the obstruction, then smash the tiles it is pressed against (it is a
  compactor), then as a last resort haul itself out and reappear in the open.
- **Dying is a retry, not a restart.** `resetBossFight()` puts it back on its
  heap at full health, puts you back where you stood when it rose, and shakes
  the two ammo packs loose again.
- **Render distance.** Props are indexed into *every* cell their footprint
  touches, not just their anchor's cell — that was why big buildings popped out
  of existence. Gather band widened; results de-duplicated with a stamp.
- **The grey squares, both of them.** (a) The block-filler was dropping houses
  inside the gas station, so the canopy hung over them — the forecourt now
  claims its ground before anything is built, and `placeBuilding` refuses it.
  (b) The canopy was one flat quad; it is now a slab with a soffit, strip
  lights, thickness and a red fascia on both visible edges, and it fades when
  you stand under it. (c) **The parapet coping was being drawn as a full-size
  diamond over the finished deck** — repainting every roof in one flat colour
  and erasing all its detail. Roofs are now a well: parapet up, deck set down
  inside it, inner shadow on the far sides, and seams/patches/ballast/pooled
  water that scale with the roof instead of a fixed six lines.
- **The route.** St Martin's moved to (50,54), north of the east cross. Getting
  there is now west along the gate road → north up the mid street → west along
  the east cross. Two turns, not one straight line. Sign *text* rewritten to
  directions — "KEEP TO THIS ROAD", "TURN HERE. UP THIS STREET", "LEFT AT THE
  CROSSROADS" — and the painted road arrows follow the three legs.
- **Marek warns you about the Hunter-Droids** before you leave the yard.
- **Map marker** is the traveller himself, no ring.

**Reverted at Laurens' request:** all trees; the wall changes (material courses
and recessed windows — they read "double", and the ivy put random green on
them); the painted-text sign boards; building ivy/ruin states.

### 67. Vehicles rebuilt from reference photos
**Laurens:** "the cars are blocks that is not what cars look like" — with
photos of a Bentley saloon, a Ferrari, and Escalade / Hyundai / BMW / Cayenne
SUVs. Also: make the school bus 3D.
**Claude:** Replaced the box with a **swept profile** system (`makeVehicle`).
A vehicle is described by curves sampled along its length — half-width,
waistline, roofline, greenhouse width — and swept onto the iso grid, so the
bonnet slopes, the nose and tail taper in plan, and the greenhouse sits
narrower and set back. Then: shoulder highlight, swage line, shadowed sill,
wheels sunk in real arches with tyre/rim/hub, and a proper face at the nose
(grille slats, headlamps, bumper, splitter).
Four bodies — saloon, SUV, coupé, hatchback — in six weathered colours, each
built for both street directions. **The school bus uses the same system**: a
long box with a dropped nose, a full-length window band and seven pillars.

### 68. Cars back to version 1
**Laurens:** "go back to version 1. of the cars, this is hurting my eyes"
**Claude:** Restored the **original** cars and bus — the sheared side elevations
that were in the game before this session touched them (`Sprites.cars` +
`sheared()`), with the original draw offsets. Both of my attempts are gone from
the codebase: the box version and the swept-profile version. Three car looks
have now been tried and the original is the one that stays.
The swept-profile code is kept out of the repo but recoverable from this
session if it is ever wanted for something else.

### 69. "but change the angle"
**Laurens:** "but change the angle"
**Claude:** Asked which angle rather than guess a fourth time — answer: they
still read as a pure side view, tipped over, instead of being seen from above
like the rest of the world.
The geometric reason, which is worth keeping: **`sheared()` can only slope a
sprite one way.** That leaves the roof a rectangle, and a real isometric roof
is a rhombus — so no amount of shearing a side elevation will ever produce one.
It has to be built from the footprint.
So cars are now drawn at the iso viewpoint: a full-length lower body with a
shorter, narrower cabin sat on it, plus wheels, sill, waistline and headlamps.
Filled with **integer scanlines in flat colours** (`isoFill`) — the lesson from
the swept-profile attempt being that fractional polygons and alpha overlays turn
to mush at 320×180. Four paint jobs, both street directions. All four attempts
are written up in `art-style.md` so this does not get re-litigated.

### 70. Scuffed walls
**Laurens:** "some off the walls are scuffed, fix them"
**Claude:** Same root cause as the cars, one level down. All the small detail on
a wall — window panes, shopfront glazing, shutters, doors, the fascia rail, the
painted name band — was being drawn with `poly()`, which is an antialiased
canvas path fill. A window on these buildings is about five pixels across, and
a soft edge on something that size does not read as a soft edge; it reads as a
smear. Every face came out looking scuffed.
Added `hard()` — the same integer-scanline fill the cars now use (`isoFill`) —
and moved every piece of wall detail onto it. The big face quads still use
`poly()`, because their edges are long enough that AA helps rather than hurts.
**The rule is now consistent across the project: geometry big enough to have a
silhouette may be a path; anything smaller than about ten pixels must be
integer-filled.**

### 71. "Status on cathedral build?"
**Laurens:** "Status on cathedral build?"
**Claude:** Status only, nothing built. Two things in the project answer to
"cathedral":
- **The Console Cathedral** (Ring 0, Q11) — the final room. **Not started.** It
  exists as design text only: one row in `design/city-blueprint.html` and the
  final-cutscene paragraph in `design/main-story.md`. `Areas` in `js/map.js`
  still holds exactly two entries, `junkyard` and `fringe`, and per
  `GAME_PLAN.md` Rings 1–0 are the last build phase. Nothing about it is
  blocked — it is simply five rings away.
- **St Martin's church**, the cathedral-shaped landmark in the Fringe — **built
  as a shell.** Placed at gx 50, gy 54, 12×14, building style `R` (stone with
  arched windows), forecourt paving laid to its south, and the handmade sign
  trail already routes to it. It is a solid volume: not enterable, and
  Candlelight (trader, workbench, med station, respawn re-anchor, mission
  board) + Q2 remain outstanding item 3 in `PROJECT_STATE.md`.
No code touched.

### 72. Build the cathedral — exterior
**Laurens:** "Create the cathedral, if you can run a localhost on ipad do that,
if not code on github instantly, just start with the exterior for now." — with
two references: a gothic west front (twin towers, rose window, spire, statues,
stained glass) and a small pixel-art church.
**Claude:** A localhost in this container cannot be reached from the iPad, so
the loop was: build → render headless in Chromium → read the screenshot →
fix → push. Four render passes.

`Sprites.makeCathedral` replaces the church box at St Martin's (building kind
`C`, footprint grown to 12×16 at (50, 52), with a paved parvis across the front
and a strip down each flank). It is a **composite** volume — nave, two aisles,
twin west towers, buttressed east flank, fleche over the crossing — but still
ONE sprite with ONE depth, so nothing is assembled at runtime.

The method is the thing worth keeping: everything is built in **tile space**
(`tx`, `ty`, `z`) and projected once through `S()`. That makes the angle rule
structural rather than a check — there is no rectangle in the code to shear, so
a buttress is a box in the world, a string course is a band on a wall in the
world, and the rose window is a circle in a wall plane that comes out sheared
because the wall is. Written up in `art-style.md`.

The west front faces SOUTH, because that is where the parvis, the trail and the
last sign ("YOU MADE IT. KNOCK.") are. Turn the church round and the player
walks two miles of signs to a blank flank.

Three bugs found by looking at the render, all worth remembering:
- A grey slab across the rose window — the east aisle was run the full width of
  the church, so its south end was drawn on top of the facade it stands behind.
  Engaged faces must not be drawn.
- The fleche was clipped by the top of the sprite canvas.
- The far roof slope showed as a sliver above the ridge until the pitch was
  made steeper than 1:2, which is where that slope turns away from the camera.

Glass is nearly black with the colour only just showing: nothing is lit in
there yet — Candlelight has not moved in.

**Verified in the browser** (Chromium, `TEST_MODE` set before any game code ran,
so the real save was never touched): no console errors; shot at the doors, on
the parvis, along the flank and from the road. **Honest limitation:** the
building is ~250 px tall and the viewport is 180, so from the front you see the
portal, the doors and the rose, and the towers run off the top of the screen.
That is the projection, not a bug — but it can come down a third if it should
read whole from the parvis.

Pushed rather than held back for approval, against the local-first rule, on
Laurens' explicit instruction ("code on github instantly"). Interior,
Candlelight, and the churchyard (railings, graves, trees) are not built.

### 73. Rendering faults on the cathedral
**Laurens:** "It looks great, but there are some rendering issues, A part of the
left cathedral tower is missing and there are some outer decos that dont quite
fit"
**Claude:** Both real, both found by cropping the sprite at 4× and looking.

**The missing tower.** The west tower was drawn with no east face, on the
reasoning that it is engaged with the nave. It is — but only up to the nave
head at z=104 and the gable behind it. Above that the face stands against open
sky, and there was nothing there: a hole between the gable and the belfry, with
the tower's cornice hanging over it. It now gets the face, drawn before the
nave so the nave and its gable swallow the two thirds that should be hidden. It
does NOT get the ornament — a clock cut in half by a roof is worse than no
clock — only ashlar, the top string course and the belfry louvres.

**The decorations that did not fit.** The saints. Each was a pale capsule with
a hairline of niche around it, which at this size reads as a lozenge stuck on
the wall. Three things were wrong and all three are fixed: the niche is now
properly dark and wider than the figure, so there is a surround; the figure is
stone in shadow — *darker* than the sunlit wall, where before it was brighter
than anything else on the building; and it stands on a corbel, because anything
with nothing under it floats. Shoulders are wider than the head and the lit
side is one pixel, which is enough to read as a person.

Four more found while in there:
- Tower corner buttresses started 0.1 tile outside the plinth — a pier standing
  on air. Clamped to the base.
- The buttress caps carried a lit arris. On a pier that thin it is three pixels
  of white in mid-air and reads as a speck of dirt. Removed.
- The clerestory windows sat on the aisle roof with 4 px of wall under them.
  The aisle roof drops to 72 and the sills go up, so there is a sill course and
  daylight between the two.
- Roof wear patches were up to a tenth of the slope across — that is a smudge,
  not a batch of relaid slates. Halved.

Verified the same way: 4× crops of the tower, the front, the flank and the base,
then in-game at the parvis and the doors. Pushed to `main` on standing
instruction. The viewer artifact was rebuilt on the fixed sprite.

### 74. The tower gap, found properly this time
**Laurens:** "fix the cathedral rendering, the left tower is missing a part, and
the outside has some problems too. Check what and then push the fixes"
**Claude:** Last session I fixed the west tower's missing east face by eye and
called it done. It was not done — there was still a hole, and eyeballing a
320×180 sprite at 2× was never going to find it.

So this time it was measured, not looked at. Render the sprite over magenta,
then walk every transparent pixel and flag the ones that have building to their
left AND right in the same row and above AND below in the same column. Anything
that comes back is a hole in the volume, wherever it is and however small. That
test is now the way to check this building.

It found two, both the same mistake in different places: **a piece that
oversails something that is never drawn.**

1. **The west tower's cornice** projected 0.2 tile on all four sides. On the two
   camera-facing sides that is right — the lip hides wall. On the two facing
   away there is no drawn surface underneath, so you saw sky through the strip
   below the lip: a 7 × 57 pixel slot of daylight down the tower's back corner,
   between the cornice and the nave roof. That is the missing part of the
   tower. The cornice now oversails only toward the camera.
2. **The fleche** straddled the ridge, and its spire was wider than the box
   under it. The roof's far slope is never drawn, so everything hanging west of
   the ridge hung over nothing — a hairline of daylight down the spire's west
   edge. It now sits with its west face on the ridge, its spire no wider than
   its base, and its base sunk 30 px into the roof.

**The rule this gives us:** in a volume where back-facing surfaces are skipped,
nothing may project past the silhouette on a side the camera cannot see. Cornices,
copings, spires, lips — oversail toward the camera only.

The one remaining flagged gap is real sky, between the cross's arm and the
spire cone, and should stay.

Verified: magenta render, hole scan clean, then in game from the parvis, the
south-east corner and the north-west. Pushed to `main`.
