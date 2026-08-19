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

### 75. The buttresses were flat against the wall
**Laurens:** with a photo of the west front on the live site — "Look at those
pillars at the outside they look like they are glitched into the building make
it so they stick out and are not forced inside the box"
**Claude:** My own fault, and the previous fix caused it. When the piers were
found starting outside the plinth ("standing on air") I clamped them to the
plinth edge — which left them projecting 0.05 of a tile, about one screen
pixel. They stopped hanging in space by becoming stripes painted on the facade.

The real problem was upstream: **the west front sat on the edge of the
footprint, so there was nowhere for a pier to stand.** A buttress needs a band
of ground in front of the wall it clasps. So the walls come in and the band is
what the piers live in:

- west front back from `h - 0.2` to `h - 0.8`, towers narrowed to suit
  (`0.6–3.0` and `8.9–11.3`), aisles to `1.0` and `11.0`
- plinth out to `0.1` of the footprint edge
- piers run from the wall to `h - 0.2`: **0.6 of a tile of projection**, and
  they stand on the plinth the whole way

Two things learned:
- **Painter order.** The piers stand a tile off the wall, which makes them the
  nearest thing on the building, so they are drawn LAST, after every wall they
  clasp. Drawn inside `tower()` as before, the nave — drawn later — painted
  over the two on the west tower. That is the other half of why they looked
  flattened into it.
- **Restraint.** First attempt gave them a full tile of projection and 0.8 of
  width, and they swallowed the doors and the rose. A pier the width of a
  doorway hides the doorway. They project about two thirds of their own width,
  which is enough to throw a shadow and read as stone.

Hole scan run again after moving all that geometry: clean. The two flags left
are sky between a cross's arm and the roof under it, on the gable and on the
fleche, which is what should be there.

### 76. The piers read as going INTO the building
**Laurens:** "the pillars go into the cathedral not protruding out ... the
shadow isnt the problem"
**Claude:** He was right and I was fixing the wrong thing. The proportions were
backwards.

Each pier was **0.6 of a tile wide and projected a full tile.** So the biggest
thing you saw of it was not its front but its side — and in this projection a
side face is a parallelogram sloping down-LEFT, which is exactly what a wall
receding away from the camera looks like. The eye filed the whole pier as part
of the building going back. No amount of shading fixes that; the silhouette is
saying "recede".

**The rule: a pier must be wider across the wall than it projects out of it.**
Now 0.8 of a tile across the front, 0.5 of projection — the face pointing at
the player is nearly twice the size of the return, and the silhouette says
"standing out" before any shading is involved. Same correction applied to the
aisle piers on the flank.

Two supporting changes, which help but were never the fix on their own: the
pier stone is a step lighter than the wall it stands on, and each pier throws a
hard shadow west across that wall (light comes from +x in this world). The
flanking doors moved in from u=14 to u=16 so the corner piers stop clipping
them.

Four piers on the west front, on the tower lines, straddling the tower/nave
junctions like the reference. Hole scan still clean.

### 77. Piers off the front, and the plank moved out of the way
**Laurens:** ringed all four buttresses on the west front — "Remove those
pillars and the plank in front on the floor"
**Claude:** Done, both.

**The four west-front piers are gone.** Three passes at them — flush with the
wall, then too deep, then wide and shallow — and each time the read was that
they fought the facade instead of framing it. That is the right call: the front
already carries the portal, the rose and two towers, and at 320×180 the piers
were competing with all three. The west front is now plain coursed stone with
its openings, which is what the reference actually shows once you look past the
elevation drawing's flat projection. **The flank keeps its buttresses** — there
they have a long blank wall to break up and nothing to compete with, and they
have read correctly since the proportion fix.

With nothing standing in front of it, the facade comes back forward to
`h - 0.35`, so the plinth is a thin ledge again instead of a wide empty apron.

**The last sign is gone.** "YOU MADE IT. KNOCK." stood on the parvis right in
front of the west door — a plank on poles across the doorway. The trail now
stops at the turn-off board on the road; the cathedral says the rest by being
there. Say the word and it goes back, off to one side.

The rule that made the piers read at all is kept in `art-style.md` in case they
are ever wanted again: wider across the wall than they project out of it.

### 78. No plinth, no piers
**Laurens:** "The front looks better but the wider slate its on needs to go and
the pillars on the side too"
**Claude:** Both gone.

**The plinth.** The church stood on a wide stone base that read as a slab of
pavement stuck under the building. Every other building in the Fringe simply
meets the ground; this one now does the same. `PL` — the foot of every wall and
every opening — is 0 instead of 7, so the doors reach the pavement.

**The flank piers.** That is five passes at buttresses now, four on the west
front and one down the side, and the verdict was the same every time: at
320×180 a pier is six pixels of stone next to a window. It cannot read as
structure, only as clutter. They are all out and the `buttress()` function with
them.

With nothing projecting and nothing to stand on, the walls run out to the
footprint: front at `h - 0.15`, aisles at `0.3` and `11.7`, and the nave runs
from `0.3` so the building fills its ground instead of leaving a dirt margin.

What carries the building now is what carried the reference all along: the
openings. Portal, doors, lancets, rose, clerestory, belfries, and the roof.
The proportion rule is still in `art-style.md` if anything is ever built that
does project.

### 79. Tower caps, and the plan for the inside
**Laurens:** ringed the top of both towers — "The towers have a small problem"
— and then asked for a detailed plan for the interior: not just a cathedral, a
cathedral turned survival camp. Survivor NPCs, some trading, chests, a sleeping
place with hay and blankets, a cellar with water and food and valuables, a
command centre whose map fills in your own map of the city, a makeshift medbay,
and if there is room, someone stripping a small bot for parts.

**The towers.** The spire's base was a tile narrower than the tower each way,
so a flat ledge of cornice showed all round its foot and the cap read as a
pyramid dropped into a tray. The base now fills the tower — the slope starts
where the coping ends. Order had to change with it: far pinnacles, then the
spire, then the near pinnacles, because the spire is a mass standing between
them and the two nearest have to be drawn after it.

**The plan** is `design/candlelight.md`, and it is written against the systems
as they actually are rather than as I would like them to be. Two new areas
(`candlelight`, `crypt`), nine places, six named survivors, four chests with
the interesting question being which ones you may open, and the map table —
`exploredByArea['fringe'].fill(1)` behind one interaction, which is the
cheapest thing in the document and the best value in it.

The honest part of the plan is section 5. **There is exactly one NPC in this
engine** — `const npc = {...}`, one position, one dialogue path, one trade
panel, named directly by the interaction code. A camp needs a list, and
everything else in the plan waits on that refactor. Said so plainly rather than
costing it as an afterthought.

Not built. Five questions at the end need Laurens before phase A starts.

### 80. Building Candlelight — phases A and B
**Laurens:** "Ok start building the interior"
**Claude:** Built and in the game: the shell, the camp, the people, and the map
table. Verified by walking it, not by reasoning about it.

**Two areas.** `candlelight` (28×40) and `crypt` (18×14), with four working
doors between them and the Fringe. The west door needed two tiles cut out of
the cathedral's solid block on the facade's centre line — that threshold is
what makes the portal a door rather than a picture of one.

**The room.** Flagstone, an arcade of piers down both sides (without those it
is a hall, not a church), walls with blind arches and every third bay glazed.
Then the camp: braziers and votive stands, curtained bays on straw, a drum
stove with its flue through a boarded window, two cots behind a surgical drape,
a bench with a Hunter-Killer half stripped and its eye still lit, pews part
broken up for timber. The crypt got its own wall kind after the first render
put **stained glass windows in a cellar**.

**Seven people.** Vesna, Osk, Bo, Sister Ade, Halden, Ivar, Tam — one figure
sprite parameterised by coat, head and the one thing they carry, which at
fifteen pixels wide is as much difference as will read. Three lines each,
cycled one per talk. Nobody learns the player's name.

**The decision worth recording:** the plan called the single-NPC refactor the
biggest piece of work in the document. I did not do that refactor. Marek is a
`const npc` named directly by the interaction code, and the camp is a `folk`
LIST beside him. Same result on screen, none of his mission, trade or dialogue
re-tested. If a second area ever needs Marek-like behaviour, do it properly
then.

**The map table works.** Reading it fills the Fringe fog: 36 explored cells to
3350, once, saved.

Two bugs found by testing, both mine:
- The crypt's entry point sat inside the crypt's own exit zone, so the stair
  never re-armed and would not take you back up. Land the player CLEAR of the
  zone they arrive in.
- The first pass at the tower-top candles came out as a bonfire in a box.
  Tapers are one pixel wide.

Not built, and named so it does not look finished: trading (Halden and Bo have
the lines but no stock), Ade healing, the sleeping bay re-anchoring respawn,
the tower stair, the strongbox, Q2. Section 5 items 2, 6 and 7 of the plan.

### 81. Compacting Candlelight, and stairs that read as stairs
**Laurens:** "Try making it a bit more compact the interior is multiple times as
big as the exterior. Fix the stairs they are barely visible and the wrong angle.
Also there is too much empty space... Make sure the floor of the cathedral is as
big as from the exterior"
**Claude:** All three, and the first one caused the third.

**The floor is the footprint now.** It was 28×40 while the building outside is
12×16 — seven times the area. You walked in and the cathedral became a
warehouse, and half of it was empty because there is nowhere near enough camp
to fill seven times the building. It is 12×16 exactly, and the crypt went from
18×14 to 10×8 (it is under the chancel; it should be a fraction of the church).
Everything the plan asked for is still in there. It is all just within arm's
reach, which is what a camp squeezed into a church should feel like anyway.
Three piers a side instead of nine — at this size any more and there is no
floor left to stand on, and three still say "church".

**The stairs.** Two things were wrong.
1. **The angle.** A stack of horizontal bars in a box: the flat-rectangle-on-an-
   iso-floor mistake in its purest form. They are built in tile space and
   projected now, like everything else that touches the floor.
2. **They could not be seen**, and that was two separate causes. The first
   version descended NORTH — away from the camera — so you looked edge-on
   across the flight and saw no risers at all. It descends TOWARDS the camera
   now, two tiles deep, and every riser faces you. And it sat in the north-EAST
   corner, behind the near wall, which is drawn over everything behind it: it
   was hidden for its whole life. Both stairs are in the north-west corner now,
   against the far walls.

Three more things learned putting it right: coping goes on the FAR sides of a
stairwell only (put it near and it stands in front of the flight it frames);
three treads read where five vanish at three pixels each; and the handrail is
what says "stairs" at a glance, before any tread registers.

All four doors re-tested end to end, and the map table still hands over the
ring.

### 82. The gate cutscene was looking at the wrong end of the yard
**Laurens:** "there is a problem when spawning the first boss, the camera pans
to the spot the gate used to be at the bottom of the map, now that the boss
spawns somewhere else the animation and camera pan has to be adjusted"
**Claude:** Exactly that, and it was one line.

The cutscene's first beat — the lock grinding — focused on the literal pair of
numbers `(21.5, 30.0)`. That is where the gate stood when it was in the SOUTH
wall. It has been in the east wall for a long time. So on unlocking, the camera
flew eighteen tiles to an empty corner of the yard, sat there through the
shake, and then flew all the way back across the map when the Compactor rose.

Measured before and after rather than eyeballed. Before: `30.2,12.5 →
21.5,30.0 → 26.5,12.5`. After: `30.6,12.5` held through the grind, then a
four-tile pan west onto the boss as it rises, then back to the player.

It reads off `gateProp` now instead of carrying a copy of its position, so
moving the gate again cannot break it. That is the actual fix — the numbers
were only the symptom.

### 83. Restarting the interior
**Laurens:** "There are multiple rendering errors in the wall and most
definitely the stairs which are also much too large. Restart the interior. Make
a new interior plan based on the amount of space you have, make it compact and
efficient but also leave space to walk and don't have multiple objects on each
other"
**Claude:** Restarted. Both faults found by looking at a 4× crop first.

**The walls.** The two near sides were full-height walls marked `front`, so
`occlusionAlpha` faded them — and a faded 44-pixel wall does not read as a wall
you can see past. It reads as **a sheet of glass lying across the floor**, with
flagstones, a candle rack and a person showing through it. Fixed by not putting
a wall there at all: north and west get full height, the two sides the camera
looks over get a **ten-pixel kerb** that bounds the room and hides nothing.

**The stairs.** Two tiles by two, taller than the people using it, sitting over
a pier and half the map table. The lesson is more useful than the fix:
**anything that has to be big to read is the wrong object.** A stair legible at
this scale eats a quarter of the room. A **hatch in the floor** does the same
job in one tile — hole, two treads, the lid propped back, light coming up.

**The new layout is a budget, not a sketch.** 192 tiles: 53 to walls and kerb,
4 to piers, 29 to furniture, **107 left to walk on**. Written into
`design/candlelight.md` as a tile grid.

**And the room proves itself.** `put()` refuses to stack anything and warns if
the layout tries. On top of that an audit runs the build and checks: no two
things share a tile, every walkable tile is reachable from the door, every
usable fitting is reachable, nobody is standing in a wall. The first run found
four one-tile pockets boxed in by furniture — a gap between two beds, one
between two cots, two behind the hearth — and three props moved a tile to open
them. 107 free, 107 reachable.
