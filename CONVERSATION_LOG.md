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
### 84. Floating bits on the scrap mountains
**Laurens:** "for some of the trash/scrap mountains there are some flying parts
of it not connected, get rid of them it looks bad"
**Claude:** Two causes, both fixed.
The direct one: the pipes and girder ends poking out of a mound's crest were
drawn at a *fixed* height near the top of the sprite (`y = 1 + rng()*5`),
regardless of where the heap's surface actually was at that x. Toward the
flanks the slope falls away fast, so a pipe placed there ended several pixels
clear of the junk with nothing under it. They are now planted: the code solves
the mound's own profile for the surface height at that x and buries the bottom
of the pipe three pixels into it.
The general one: `dropStrays()` — a connected-component pass (8-connected) run
over every scatter-built sprite before it is outlined. It keeps the largest
mass and erases everything else, so a stray speck thrown clear by the random
scatter can never survive, in mounds or in the small scrap piles.
Verified by re-running the component count on the built sprites: mound2, mound3
and all three scrap piles now come back as exactly **1** island each (they were
not all 1 before). Not screenshotted — the browser pane would not composite.

### 85. The school bus
**Laurens:** "We made the cars 3d but the schoolbusses still look like cardboard,
fix"
**Claude:** The bus had been left on the old path — `sheared(Sprites.bus)`, a
side elevation with no roof at all, which is exactly why it read as cardboard.
Rebuilt with the same iso construction the cars use (`isoFill`, integer
scanlines, flat colours): a long passenger box with a real roof surface, a low
bonnet set in from the sides at the front, a window band down the near flank
with a pillar between each pair, the black stripe and skirt every school bus
has, a windscreen standing above the bonnet, lamps and a bumper on the nose,
and wheels behind the skirt. Both street directions.
Verified structurally, not visually — the browser pane would not composite for
a screenshot, so the sprite was read back as a character map to confirm the
roof rhombus, flank and bonnet are all present and correctly placed, plus a
connected-component check (1 island each) and a frame-time check (2.6ms).

### 86. Car hitboxes, a second Scrapper, and a pity floor on tech
**Laurens:** "small changes: 1. since the cars are now longer cardbord slates
and acctually 3d their hitbox needs to be ajusted a bit 2. make it so there are
alwys 2 scrappers at a time 3. make it is f you get unlucky with the chance
that every 6th scrapper you kill you get a low quality tech piece, this is only
for these early game robots and not for the later ones. The counter resets to 0
if the player drops one"

**Claude — 1. the car hitbox.** Two faults, not one. The car is 2.25 × 1.0
tiles of ground but was still blocking the 2 × 1 tiles of the old flat sprite,
*and* `carIso` anchored the sprite on `P(0,0)` instead of on the centre of its
own footprint — `oy = -(OY + 1)`. The drawn car therefore sat three quarters of
a tile down-screen of the tiles it blocked: you bumped into empty road on one
side and walked through the nose on the other. Fixed by anchoring on the
footprint centre (`oy = -(OY + (L + W) * 4)`, half the footprint diagonal at
8px per tile), giving every car a `foot: [x0, y0, 3, 1]` so it is spatially
indexed and depth-sorted across all three tiles, and moving `gx, gy` to the
middle tile. Junkyard spots slide along their own axis (offsets 0, -1, +1, -2)
when the third tile is already occupied, so no wreck is lost to the longer
footprint — 6 cars in the yard, 41 in the fringe traffic jam, same as before.
Crushing now calls the new `clearPropSolid(p)` in map.js instead of the
hand-written `solid[ty][tx + 1] = false`, which was already wrong for anything
bigger than two tiles. The school bus rebuilt last session had the identical
anchor bug (`oy = -(OY + 1)` on a 3.3-tile volume) and got the same one-line
fix — it was sitting most of a tile off its own three road tiles.

**2. two Scrappers.** `scrapper` was a single object referenced from four
files; it is now `scrappers[]` (`SCRAPPER_COUNT = 2`) built by `makeScrapper()`,
with the tallies that outlive any one machine moved to `ScrapperStats`
(`kills`, `techPity`). Each machine lives, dies and respawns on its own timer,
so the yard is only briefly down to one wreck + one hunter. `pickSpawn(avoid)`
keeps them at least 5 tiles apart so a pair never emerges from behind the same
heap. A melee swing now damages **every** machine in its arc, a barrel blast
can take both, and a bullet still only ever hits one.

**3. the pity floor.** A wreck pays a low-quality tech component on a 1-in-5
roll, but that roll can be lost six times running. `ScrapperStats.techPity`
counts wrecks looted since the last component: the sixth dry wreck always pays
out, and any drop — lucky or owed — resets it to 0. Deliberately only on the
yard's starter robots; deeper-city drops stay pure chance. Both counters are in
the save and default to 0 for saves written before they existed.

**Verified in the browser** (`window.TEST_MODE = true` throughout; the real
save was confirmed untouched afterwards). The preview pane would not composite,
so frames were driven by hand and the canvas was posted to a throwaway capture
server to get real screenshots — see below. Checked: no console errors; the
car sprite's opaque bounding box sits symmetrically inside its footprint
diamond with 4-6px of margin on every side (before the fix it overhung the
south vertex by 8px); a collision probe along the car blocks exactly tiles
16-18 of row 25 and nothing else; both Scrappers spawn, chase, die
independently and respawn ~20s later 10 tiles apart; the loot roll forced to
its unlucky value six times gives `1 2 3 4 5 → tech, counter 0`; a
save/load round-trip returns `kills 2, pity 4`; crushing a fringe car frees all
three of its tiles; the fringe still builds and renders with 41 cars.

### 87. The roadblocks and the bandits
**Laurens:** "Ok so we have the first part of the city. now its emty, draw up
the exacr map of the city and on some crossroads add banit roadblocks, make it
so you need to pass at least one of the 2 to get to the chrch. Choose where they
go and start designing the roadblock and than the banit enemys, Make a roadblock
have 2 banits armed with kifes and one with a srap pistol and one with a rifle,
design it too. Make sure all is rendred right and at the right angle is is a
large add so be thorrow"

**Claude:** Mapped the city first, and the map is what decided the design.

*The measurement that changed the plan.* Before writing anything I ran the real
generator headlessly and flood-filled it from the yard gate using the player's
own collision test. The Fringe was streets laid over open lots — the blocks
between them were never closed — so cutting the east cross at **both** junctions
still left St Martin's reachable by **46 of its 46** forecourt tiles. Two
roadblocks on two crossroads would have gated nothing at all. The whole request
depended on a fact that was not true yet.

*So the fix is not a fence, it is city.* The east cross between the spine and
the mid street became a proper street: continuous frontage on the lot rows at
y 69 and y 81 from x 36–88 — terraces where a building fits, stone yard wall
where it does not, which is what a real terrace does where it runs out of house
— with exactly one opening in it, the church gate at x 50–61, flanked by stone
piers on x 48–49 and x 62–63. The corridor then has two ends and both are
crossroads. (First pass put the cordon after the block-interior filler and got
36 tiles of wall to 5 of building on the north side; moving it *ahead* of the
street terracing so it gets first claim on the ground turned that into 25
building to 16 wall.)

*The two blocks.* West at x 38 on the spine junction, chicane y 74–75; east at
x 86 on the mid-street junction, chicane y 76–77. The siting is the point: the
signed shelter trail — the planks somebody nailed up to guide people to
Candlelight — says *left at the crossroads*, and that left turn is the east
block. They set up where somebody else's arrows funnel the desperate. Take the
long way down the spine instead and it only brings you to the other one.

Verified on the generated map: either chicane open → 24/24 forecourt tiles;
**both sealed → 0/24**; 509 tiles removed and nothing else in the city cut off.

*The angle.* Every barricade piece lies along the carriageway, so none of it
could be a sheared rectangle. Added an `isoPiece` helper — a canvas sized to a
footprint of L×W tiles standing H pixels tall, plus the projector into it — and
built sheet-steel panel, tall firing screen, sandbag stack, concrete barrier,
razor coil and stone wall in face space with real x and y variants, the same
construction the cars and buildings use. Only the burning oil drum and the flag
pole are drawn straight, being free-standing and upright. Checked as a contact
sheet at 8×: the x/y variants mirror correctly.

*Two things that sheet caught.* The sandbags and the stone wall both came back
as flat single-tone boxes — it is the tone-to-tone step between neighbours, not
the seam line, that makes bags read as bags, so every bag and every stone now
carries its own value. And the bandits ended in a dark blob: the legs were drawn
almost the colour of the outline, so the stride vanished. Lifted the pant and
boot values and split the legs a row earlier.

*The four.* Two knives, a scrap pistol, a rifle. The important line in the file
is that one of them seeing you *shouts* and the whole block turns at once — the
machines in the yard hunt you as individuals, and that difference is what makes
a checkpoint feel like a checkpoint. Everything they wear is cloth, skin and
scavenged plate, nothing glows, and all four wear the same dirty red rag.

*Two real bugs found by simulating the fight rather than assuming it worked.*
The bandits were calling `tutStealth()` — which says "a machine noticed
movement", and which freezes the world the moment the suspicion bar twitches. It
left the entire block standing at ease while the player walked up and stood on
their boots. And the pursuit waypoint was the gap *itself*, so they walked to
the chicane, technically arrived, and stood in the hole forever; it now aims
through it. Both fixed and re-verified.

*Cover is real and it is the fight.* The barricade blocks line of sight both
ways — standing behind the panels off the gap line, with the whole block awake,
the player takes 0 damage over 12 seconds. The gap is the only place any of them
can see you from. The rifle telegraphs with a dashed line and the same red blink
the Scrapper uses; break the line and the shot is thrown away.

*Tuning.* Four of them took a passive 100 HP down in six seconds — a wall, not a
fight. Softened to about nine. A bot that fights back but never dodges, shoots
or breaks line of sight clears 3 of 4 with the piercing knife before the rifle
gets it. Wants a real playtest.

Dead raiders stay dead, keyed by block and post rather than array index; a save
predating the roadblocks loads with every post manned. Verified the round trip,
a full clear latching, the junkyard untouched (no bandits, 2 scrappers, 3.1ms),
and frame cost at 2.8ms at a roadblock against 4.3ms in the open street.

Deliberately **not** decided: whether the rifleman drops his rifle as the ring's
weapon upgrade. That is on the open-questions list in `PROJECT_STATE.md` and it
is a progression call, not a side effect of this pass. He drops rounds.

New docs: `design/city-map.md` (the exact map, with the street table and the
verification) and `design/bandits.md`. **Not committed** — per the LOCAL FIRST
rule this is a large visual addition and wants your eyes before it goes live.

### 88. The pack becomes a grid
**Laurens:** "make a plan. I want to overhaul the inventory, make it like BotW,
not a list but just squares with items you have and if you hover over them it
explains what it is and what is used for. IF you have 0 of a item dont show it."

**Claude — the plan first**, per the standing rule, in chat and in
`design/inventory-botw.md`. The thing worth saying before building: BotW's grid
reads well because it is *full*, and this game has **seven items in total** —
two or three squares per tab. The grid would be correct and look bare, which is
a content problem and not a UI one. Offered three ways round it; Laurens chose
**build the pack now, fill it later**, pack screen only.

**What was built.** The screen is 320x180 logical pixels — about the size of
one BotW item tile — so this is the grammar of that screen, not a copy of it:
tiles you scan, one description panel, counts badged on the tile, nothing you
do not own. 26px cells in a 5x4 grid on the left, description panel on the
right. One cursor, moved by the arrows *or* the mouse — the mouse only takes it
when the mouse has actually moved, or a pointer left lying on a tile would
fight every arrow press. `Q`/`R`, a click, or the wheel change tab. `E` equips
or eats, and so does a click.

The real structural change is **`js/items.js`**: an item's name used to be a
string literal inside `invEntries()`, its icon chosen in the same breath, and
its **description did not exist anywhere**. Every item now declares itself once
— name, tab, icon, description, `have()`, `count()`. Laurens' "if you have 0 of
an item don't show it" is then one filter rather than a rule scattered through
the drawing code, and the same rule one level up means **a tab with nothing in
it hides itself** — which is what finally killed the ARMOUR tab that had been
standing empty saying "the city will provide" since it was written.

**Three things the plan did not foresee.** The world HUD printed straight
through the pack — fine when the panel was 250x130, not when it is full screen
— so it is now wrapped in `if (!InvUI.open)`. The scroll wheel silently
switched weapons behind the open pack, a bug older than this work, because the
wheel listener mutates `player.active` directly instead of going through
`updatePlayer`; the pack owns the wheel now. And `ptWrap` already existed — a
second word-wrapper was written before that was noticed, and deleted.

**One key binding changed for the player:** `A`/`D` and the arrows used to
change section, and now move the cursor inside the grid, because in a grid that
is what they have to mean. Sections moved to `Q`/`R`; the footer says so.

Also drew the **yard gate key icon**, which never had one — a missing icon was
a blank row in a list, but it is an empty square in a grid, which reads as a bug.

Verified on localhost with `window.TEST_MODE = true`: all four tabs; FOOD
present at 2 snacks and gone at 0; eating from the grid 3 -> 2 and 40 -> 80 HP;
equip and unequip; the arrows and the mouse driving the *same* cursor and the
cursor clamping to the last item actually carried; `I` opening and closing; the
wheel changing tabs without touching the equipped weapon; the world HUD back
intact on close; a fresh tab reporting no console errors. Screenshots of all
four tabs taken.

**Not pushed** — big visual change, localhost until Laurens has seen it.

### 89. The ammo is in the other pocket
**Laurens:** "ok one thing just show the gun, the ammo is in the other poket"

**Claude:** The pistol tile was badged `x14` and its description panel read
"carrying 14 rounds" — but rounds are their own entry under MATERIALS and
already carry a count there, so the same fourteen were being counted in two
places and the weapons tab read like a magazine. Dropped `count` and
`countLabel` from the pistol entry in `js/items.js`: the tile is the gun, and
the rounds are where the rest of what you carry is.

Verified: the pistol tile now has no badge and no "carrying" line, and
`Pistol rounds x14` is untouched under MATERIALS. Still local, still unpushed.

### 90. Pointed at, not driven
**Laurens:** "instead of the text saying what does what, only have i close
inventory but smaller. for the rest you just click on all on the items and it
will give to options almost like a dialogue to equip or cancel, Also the top
bar you click on what page you want to be no arrows"

**Claude:** The pack is a pointing UI now. Pages are clicked — `Q`/`R` gone,
and the wheel no longer changes page either, though it is still swallowed while
the pack is open because that listener writes `player.active` directly and
would otherwise switch weapons behind it. Items are clicked and they **ask**: a
small centred dialogue with the item's name and two buttons, EQUIP / PUT AWAY /
EAT and CANCEL, and nothing else responds until it is answered. Grid arrow keys
removed; hover selects and the description follows the pointer. The footer is
one dim line, `I — close inventory`.

Two judgement calls worth recording. **Things with no action do not ask** —
scrap has no answer to "equip or cancel", so clicking a material just reads it,
which was always the point of clicking those. And **`Escape` had to be taken
off the pack's close toggle** when an ask is up: that check runs before the
pack's own input, so cancelling a dialogue with Escape was slamming the whole
pack shut behind it.

**"Smaller" was only half possible, and honestly so.** `ptGet` has exactly two
sizes — scale 1 under 12, scale 2 at 12 and up — so `size: 7` and `size: 8`
render the identical 5x7 bitmap, and 5x7 at scale 1 is the atom of this UI.
Genuinely smaller glyphs would mean a second font, which the standing rule
forbids. So it is smaller the ways available: one short line instead of four
hints, at 0.38 alpha.

Verified click-by-click: the ask raising, confirming, cancelling, Escape
leaving the pack open, tab clicks, materials raising nothing, eating 3 -> 2 and
30 -> 70 HP, PUT AWAY unequipping. Including the nasty one — eating the LAST
snack, where the item and its whole tab vanish out from under the open
dialogue: the ask clears itself, the tab index reclamps, and it renders. Fresh
tab reports no console errors. Still local, still unpushed.


### 91. One thing per tile is not one thing per screen
**Laurens:** "So there are still some things covering up others — make sure all
is nicely visible. Also remove the growing station in the cellar and add stacks
of hay and vats of water instead, maybe a chest with a beef MRE. Make sure I can
interact with the map to fill it in. One NPC's voice line about soup makes no
sense. Also Tam's voice line asking if I'm from the yard makes no sense — how
would he know. Make him say something like: thank you for taking care of the
bandits out there, anyway I've got some goods up for trade, are you interested,
opens menu, sells rifle ammo, beef and chicken MREs and a low quality tech part."

**Claude:**

**The covering-up, and why last session's audit missed it.** That audit proved
no two props share a *tile*. It said nothing about the *screen*, and in this
projection those are different questions: a 54-pixel pier stands on one tile and
paints over three tiles of room behind it, because a tall sprite at (a,b) hides
the whole diagonal `x-y = a-b` above it. So a second audit now draws each room
for real, records every `drawImage` a prop makes, and reports the pairs where the
nearer sprite eats the further one. First run, worst first:

    100% of chest@1,6    behind curtain@2,7
     93% of crate@1,13   behind OSK
     77% of TAM          behind pier@8,10
     64% of brazier@5,7  behind TAM
     46% of workbench@1,3 behind pier@3,5

The chest was *entirely invisible*. Two rules came out of it, written into
`map.js`: nothing worth looking at goes in a pier's column within about seven
tiles of screen-depth above it, and two big props in a narrow aisle need three
tiles of `x+y` between them, not one. Re-laid both rooms against those and the
list is down to one entry — 21% of a bedroll clipped by a pier shaft, which is
what an aisle in a church actually looks like.

**And the reachability audit, run again, found five one-tile pockets** — three
bays walled in by their own furniture, and in the crypt a corner tile that
belonged to *neither* wall run and so could never be reached at all.

**The pier fades now.** It is the one tall thing standing in open floor, so it
is the one thing you can walk behind and vanish into. `occlusionAlpha` could not
do it: that measures world distance and a pier crosses you from four tiles away.
`pierAlpha` measures where the two sprites actually land on screen instead.

**The map table could barely be used, and that is a real bug.** The interaction
picker seeded one shared `bestD` at 1.1 and then wrote `d < 1.5 && d < bestD`
for fittings, `d < 1.4` for people, `d < 1.3` for Marek — every one of those
larger reaches was dead code, silently clamped back to 1.1. On top of that the
distance was measured to a prop's anchor **corner**, so the two-tile map table
needed you inside it. Each kind of thing now has its own reach and the closest
*relative to its own reach* wins; props measure to the nearest tile of their
footprint, centre to centre. Verified by walking up and pressing E, not by
calling the function: prompt appears, fog goes 29 → 3350 cells.

**The cellar.** Nothing grows under a church. The grow beds are gone; in their
place two vats of roof-water and two stacks of hay, both built in tile space and
projected — a bale is longer than it is wide, so drawn flat it would lie across
the iso grid instead of along it. First pass came out as beige blobs: three
boxes with no seam read as one lump, so each bale got a cut end with stubble,
twine down its long side, and a dark lip along its top-back edge. There is a
chest of beef MREs down there too, and the vats can be drunk from.

**The counter is per-trader now.** It was one panel with Marek's three items
written into the *drawing* code, which is why a second trader could not exist.
The panel is empty furniture now and whoever opened it supplies the stock, so
Tam is a list and no UI work. He sells rifle rounds, a beef MRE, a chicken MRE
and a low-quality tech part; Marek's three are unchanged and re-tested.

**The two lines.** Halden's soup is gone. Tam no longer asks where you came
from — he only knows what came up the road, which is that it can be walked
now — and his pitch runs into the counter when he has finished saying it.

**MREs are food.** `H` eats the *worst* thing that still helps, so the good
ration is still in the pack when it matters. Old saves merge them in at zero.

Verified in the browser under `TEST_MODE`: both audits clean, save migration
from a pre-update save, round-trip of the new fields, and the real save slot
never touched.

### 92. The empty camp, and a trapdoor seen from the wrong side
**Laurens:** "Some slight problems — sometimes NPCs don't spawn. And the
trapdoor down is good, but in the crypt it needs to be a ladder up, not a
trapdoor down either."

**Claude:**

**"Sometimes" was exactly reproducible once I looked for the pattern: it is
every time you quit inside the church and come back.** `folk` was only ever
built inside `enterArea()`, and loading a save does not go through
`enterArea` — `applySave` builds the area itself. So you got the room, the
fires, the chests and the map table, and nobody standing in any of it.
Reproduced first (walk in → 7 people; reload → 0), then fixed by building the
camp where every other "who is standing in this area" decision is already
made, next to the Scrappers and the raiders at the bottom of `applySave`.
That is the actual lesson: there were two places that populate an area and
only one of them knew about people.

**And the ladder.** The crypt was drawing `Sprites.stairUp`, which was the
trapdoor sprite again with one tread lit — the one thing it cannot be. From
underneath a floor there is no hatch lying in the ground; there is an opening
over your head and a way up to it. So it is built the other way round now: a
lit rectangle at ceiling height with the room above spilling through it, the
cut floor joists round the lip, and a ladder leaning **north** to reach it —
which in this projection means leaning to the *right* as it rises. Drawn
straight up it would read as two posts.

First version was 70px tall and climbed out through the top of the wall, so
the lit hole floated in the black above the building. It is short now, which
is also more honest: a crypt is a duck-your-head room and its ceiling is the
church floor. The light hangs at the opening, not on the floor, with a
weaker pool below it.

Verified: down the hatch, up the ladder, save in the crypt, reload, climb out
again — seven people every time, both audits still clean.

### 93. Building a plan that never got pushed
**Laurens:** "Search for any plan that was made yesterday and not yet built or
pushed." — then: "Pick the first plan and start building."

**Claude:** Three plans written yesterday never reached `main`; all three were
stranded on two draft PRs whose branches carry docs and nothing else.
`design/cathedral.md` was built anyway (only its phase-2 churchyard is
outstanding). `design/hhd-squads.md` is unbuilt apart from the singleton→array
refactor it called its blocker, which the two-Scrapper and cordon work cleared
by accident — the robots still see through walls, so "hide behind an object"
does not work yet. **`design/map-ui.md` had not been touched at all**, and it
was the one to build: fully specified, with three decisions already recorded
from Laurens.

Built all six steps.

**One source for the objective.** `currentObjective()` reads live state and
answers what and where. The HUD line used to carry its own hard-coded string
and the "quest marker" was the NPC blip on the minimap — which meant *the quest
is there* only by accident, and had already stopped meaning it: the camp put
**seven green dots** on the minimap. Green is the objective and nothing else
now. Signs are not green either.

**Reach was a real bug hiding behind a UI plan.** Nothing to do with the map:
the interaction picker seeded one shared `bestD` at 1.1 and every larger reach
written after it was dead code. Fixed in the same pass as the camp work.

**One coordinate space, and it is what made this cheap.** Every area carries a
`world` offset, everything draws at `zoom` pixels per tile, and there is no
separate world view to keep in sync — zooming out is the same draw call with a
smaller number. Areas sit at TRUE RELATIVE SIZE, so the yard is a small square
off the city's eastern edge and it is honest about how far you have walked.

**Where the plan met the numbers and lost.** Its declutter thresholds (2 / 1–2 /
under 1 px per tile) were written before anybody measured: the Fringe is 200×150
on a 320-wide screen, so *framed on the Fringe* is **0.91** px/tile and the
whole ring is 0.81. Every threshold sat above every zoom you would ever look at
the city from — opening `M` in the street showed two icons on an empty map.
Recalibrated to 1.8 / 0.85 / below.

Three things the plan did not see coming: areas OVERLAP on screen, so ground
and names need separate passes (the city was painting over the yard's name);
interiors did not exist when it was written, so Candlelight and the crypt now
sit on the church's own footprint and are drawn only while you are in one; and
a thumbnail can only be built from live tile arrays, so it is taken in
`stashArea()` — the one moment an area is still loaded and you are leaving it.

Fast travel is free, from anywhere, camps only, discovered only, and refused
while anything has you in its memory. The minimap dims unexplored ground rather
than blacking it out, so a street you have not walked reads as *unlit* instead
of *missing*, and the two maps finally agree about what you know.

Verified in the browser under `TEST_MODE`: opening with no fog at all, the
hunted refusal, travel within an area and across one, the map from inside the
church, and the whole camp/save/audit suite re-run with no regressions.

### 94. The next plan: cover you can actually hide behind
**Laurens:** "Push this one and start the next on the list."

**Claude:** Map UI was already pushed. Next was `design/hhd-squads.md`.

**First, a correction to what I told you yesterday about it.** I said there was
no line of sight anywhere and robots see through walls. Half wrong: the cordon
work shipped `losClear()` and the **bandits have had cover since**. My grep used
`\|` under `grep -E`, where that is a literal pipe, so it matched nothing and I
reported nothing. What was actually true is narrower and more interesting — the
**Scrappers** had been left behind on the old radius-only code, in the yard the
plan itself describes as the one place it never showed.

**So step 2 was two things.**

*The Scrappers joined the cover rule* — and the one that changes how the game
plays is the CHASE, not the patrol. `seesYou` was `distP < 7.5` with no cover
test at all, so a chase could not be broken by hiding; it ended only by
outrunning a radius. Now breaking line of sight starts the memory clock, the
machine pushes to where it last saw you, and gives up. That is the crouch key
finally paying for itself.

*Facing arcs, for everything.* 120° forward, with a 1.5-tile all-round bubble so
you cannot stand on a heel, widening to 280° once something is already hunting
you — a machine looking for you is not walking a route. Everything that walks
goes through `aiMove`, so that is the one place a facing is kept. A stopped
Scrapper sweeps its sensor instead of staring down one line forever, and a
guard sweeps either side of the road he was posted to watch.

One thing the plan did not ask for and the game needed: **a cone the player
cannot read is not a stealth mechanic, it is bad luck.** Each machine throws a
patch of cold blue-white light on the ground where it is looking. Cold on
purpose — amber in this game means *this can be hurt*, and a sensor beam is not
a target.

Three cases measured rather than eyeballed: behind cover with the machine
staring straight at you, alert stays at 0; in the open it climbs to 0.79 in a
second; in the open with the machine turned away it decays. And the game still
plays — Scrappers engage about a second after you stand next to them in the
open, and walking up to a roadblock still turns exactly that block's four in
about two seconds.

Steps 3–9 are the squads and the four units themselves, and four open questions
in that doc genuinely gate them.
## Session 2 — 2026-08-19

### 71. Read the docs, then: the church looks like a hotel
**Laurens:** Read all the .md files. Then: do you have everything you need to
build a custom building for the city? — and the building is **St Martin's**:
*"the church for the main quest looks more like a hotel, make it look more like
a cathedral"*, with two references (a gothic west front — twin towers, rose
window, great portal, stained lancets, buttresses, churchyard — and a small
pixel church with a verdigris copper spire).
**Claude:** Read all sixteen docs, then traced the church through the code
before proposing anything.

**The diagnosis:** the church is `kind: 'R'` running through the *same generic
path as every other building*. `BUILD_STYLE.R` changes six colours, the height
and the ridge; everything else is shared code — including `winRow`'s grid of
small dark rectangles, which is precisely what makes a building read as a hotel.
Plus the generic `isSouth` door (one 14%-wide rectangle) instead of a portal, no
vertical articulation, and a 14px ridge cross as the only church cue in the
whole building. It is a hotel with a cross on it.

**Found dead code while checking:** `drawRoof()`'s pitched branch
(`game.js:963`) and the `kind === 'R'` facade panel (`sprites.js:797`) both
still carry their own church drawing from the retired wall-panel system — only
`canopy` calls `drawRoof` now. Inert, but a trap for whoever edits the church
next. To be deleted with this work.

**Plan written to `design/cathedral.md`, awaiting approval.** The key move is
orientation, not detail: the camera shows the south and east faces, and the
player arrives from the south off the east cross — so the footprint goes
**12×14 → 10 wide × 22 long**, making the south face the **west front** (towers,
rose, portal, seen three-quarters on) and the east face the **nave flank**
(buttressed bays receding). The near-square box cannot produce that composition
at any level of detail. Then: twin towers at ~1.7× nave height, recessed pointed
portal, buttress fins with pinnacles, tall stained lancets with a warm glow
(Candlelight is lit from inside — story-true), ridge 20 → 34, and a verdigris
copper flèche. Still **one pre-rendered volume from shared corners**, towers
included, so the panel rule is untouched; all detail integer-filled, with a new
scanline disc helper for the rose window because `ctx.arc` would scuff exactly
like the walls did in #70. Churchyard held back as a second pass.
No code written yet — plan first, and this is a big art change, so it gets built
locally and screenshotted before any push.

### 72. Plan the robot squads for the city
**Laurens:** Plan the robot squadrons in the city. They should vary in size and
weaponry, be a bit bigger, travel in packs, patrol so you can hide with SHIFT
behind an object or fight them, and look **modern** — not like the old
Scrappers.
**Claude:** Read the enemy, stealth and patrol code before planning. Two
findings shaped the whole thing.

**The blocker: the game can only hold one enemy.** `scrapper` is a single global
object (`entities.js:63`), not a list — ~62 references across four files all
assume one. `updateBullets` tests one hypot; the draw is one `drawImage`; the
minimap plots one blip. **Packs are impossible until it becomes an array**, so
phase 0 is a refactor of the oldest code in the game, verified on its own with
junkyard behaviour byte-identical, before any HHD exists.

**The second finding: robots currently see through walls.** Detection is
radius-only (`entities.js:577`) with no line-of-sight test at all. In the yard
the sparse mounds hid it; in a city of solid buildings it is nonsense, and
Laurens' actual ask — *hide behind an object* — simply would not work. So the
plan adds LOS (Bresenham over the `solid` grid), **facing with a ~120° vision
arc** plus a small peripheral radius, and **squad-shared alert**. Crouch finally
pays off because breaking sight becomes possible.

**Good news:** the Fringe already has 12 patrol waypoints and 6 hidden
`moundSpawns` built and unused (`map.js:657-665`) — it only lacks enemies
because the area is flagged `hasScrapper: false`.

**Roster** (four units, all bigger than the Scrapper): SPOTTER (1.25×, unarmed,
its weapon is a flare that wakes the squad — kill it first), BAILIFF (1.15×,
shock baton, flusher), MARSHAL (1.35×, burst rifle, takes cover, **drops the
rifle** — the ring's weapon upgrade), MAGISTRATE (1.9×, riot shield + cannon,
rare, zero-damage frontal shield as a "not yet" wall). Packs are 2–4 with a role
mix, never copies. Armour is a softer version of the boss language — frontal
0.5×, amber rear sensor spine 2×, so flanking is the skill.

**Modern look:** matte composite panels, one amber sensor *bar* not a bulb,
seamless joints, a stencilled WARDEN chevron identical on every unit. The
Scrapper is something the city threw together; an HHD is something it was
issued — uniformity is the horror.

Written to `design/hhd-squads.md` with four open questions (heavy's name and
whether it belongs in the Fringe; stealth kills; squad respawn). No code — plan
first.

### 73. Building the patrol droids (LOCAL ONLY, NOT PUSHED)
**Laurens:** Call the Spotter **Scout** in the files but leave it out for now.
The Magistrate stays, but **no naming in the game** — code only. Cleared squads
respawn after about **a minute**, enough to traverse the area they patrolled.
**Start designing the patrol droids, don't push anything**, then explain how it
works. Also: **the Marshal will not drop its rifle** — the Compactor drops a
badly damaged rifle that cannot shoot, and the man dismantling the droid in the
church repairs it, so the player should **avoid the droids first** and only
later fight them for drops.
**Claude:** Built the whole system in `js/droids.js`. Nothing committed, nothing
pushed.

**Changed the plan's phase 0 on purpose.** The plan said to refactor the
`scrapper` singleton into an array first. Instead the droids are an **additive
`droids[]` system and the Scrapper is untouched** — the Scrapper is a bespoke
tutorial enemy (mission-gated, respawn-on-loot, wired into the freeze-frame
lessons and the save), and folding it into a general squad system would force
its quirks onto every droid. This way the junkyard cannot regress and a live
save cannot break. Verified: the yard still reports 0 droids and a patrolling
Scrapper.

**No save bump needed** — `save.js` already says robots re-enter fresh, so
squads just rebuild on area entry. (`applySave` can change area without going
through `enterArea`, so it rebuilds them too.)

**Built:** 4 unit types (Scout defined + sprited but spawned by nobody; Bailiff,
Marshal, Magistrate live), 8 squads / 23 droids on the street junctions with the
density gradient, formation patrol, **line of sight** (Bresenham over `solid`),
**120° vision cones with a standing-watch head sweep**, squad-shared alert with
12s memory, locational armour (front ×0.5, spine ×2, Magistrate shield ×0),
laser-sight telegraphs, 60s squad respawn that refuses to fire within 22 tiles
of the player.

**Two real bugs found and fixed while testing:**
- **Half the squads silently vanished.** Routes were dropped whole if a waypoint
  was not standable — and street dressing sits exactly on some junctions.
  `map.js` loses three junctions from its own `patrolPoints` the same way. Now
  waypoints **snap** to the nearest standable tile, and a route that truly
  cannot be placed says so. 4 squads → 8.
- **Idle droids were blind statues.** A stopped patrol never turned, so waiting
  behind cover was free. They now sweep their cone while standing watch, out of
  phase with each other.

**Also learned (worth keeping):** headless browser testing of this game needs
`Tut.active = null` every step — the world PAUSES while a tutorial is up and
only a real keypress clears it, so an unattended test freezes after a second and
looks like a physics bug. Driving `update(1/60)` by hand also beats
`requestAnimationFrame`, which headless Chromium throttles.

Verified in the browser with screenshots: junkyard unregressed, stealth
(open/crouched/behind cover), alert propagation, the full combat state machine,
damage zones, the respawn clock, and 0.012ms/frame for 23 droids.

### 74. The droids glow Core blue, not amber
**Laurens:** "instead of yellow go for the core kind of blue"
**Claude:** Swapped every light on an HHD to cold Core blue (`#6fd3ff` /
`#2b7fb5`) — sensor bars, baton tips, rifle muzzles, the Magistrate's cannon,
their projectiles, and the sparks those bolts throw off a wall.

It turned out to be a better call than a recolour. It **is the palette journey
arriving early**: amber/rust is the outskirts, cold blue is the Core, and an HHD
is issued equipment carrying WARDEN's own light out to the edge where it does
not belong. The Scrapper's amber bulb is junk the city threw together; a droid
is the machine that built it. On the Fringe's warm dusk the blue is the only
cold thing on screen, so a patrol reads as foreign before the shape resolves.

**And it tightens the damage law instead of breaking it.** *What glows amber can
be hurt; dull plate cannot* now has no competition — no warm light exists on the
machine at all, so the only amber on a droid is the flash and sparks of a
weak-point hit. **Blue is WARDEN, amber is damage.** Red stays reserved for the
laser-sight warning, and warm glows for player cues (a lootable wreck).

Written into `art-style.md` as a general rule — colour tells you *whose* machine
it is, not just where you are. One bug caught on the way: removing the amber
constants left `AMBER_D` referenced by the wreck sprite, which would have thrown
at load. All ten checks re-run and still green; cost is now 0.009ms/frame.
Still local — nothing committed, nothing pushed.

### 95. Two sessions on the same plan at once
**Claude:** Pushing the stealth work turned up something worth recording: while
this session built step 2 of `hhd-squads.md`, **another session built steps 3–9
of the same plan** and merged it as PR #2. Both landed. Nothing was lost and
nothing was duplicated, for one specific reason.

That session's merge commit says it: *"put the droid squads on its systems, not
beside them"*. The droids ask `canSpot` / `canSpotWide` / `losClear` /
`faceToward` — the functions this session had just written — instead of
answering "can it see me" their own way. Their file says why, and it is the
right reason: *a droid asking that question its own way would make hiding
guesswork instead of a skill*.

They also made the opposite call to the plan on purpose and said so: the squads
are ADDITIVE rather than the singleton refactor step 1 asked for, because
`scrapper` is a bespoke tutorial enemy — mission-gated, respawn-on-loot, wired
into the freeze-frame lessons — and folding it in would force its quirks onto
every droid, or the squad's shape onto the tutorial.

Verified the merged tree rather than assuming: the three vision cases still
behave (cover holds alert at zero, open ground climbs, turned away decays),
Scrappers still engage in about a second, a roadblock still turns in under two,
eight squads and twenty-three droids spawn in the Fringe and attack, and the
whole camp/map/save/audit suite is clean.

**What the merge did cost was the docs.** `PROJECT_STATE.md` came out with two
item 6s, an item 2 that still called the HHDs outstanding, and an item 7 from
this session claiming steps 3–9 were unbuilt — all true when written, all false
by the time they merged. Reconciled. That is the real tax of parallel sessions:
not the code, which merged clean, but the prose about the code.

### 96. What a milestone owes you
**Laurens:** "Anytime we add items and the player has passed the stage or killed
the boss, they get it in the inventory."

**Claude:** Made it a standing rule (CLAUDE.md #7) and built the mechanism, so
it is not something a future session has to remember by hand.

Every item a milestone hands over is declared in `MILESTONE_GRANTS`
(`js/items.js`) with the milestone that earns it. `grantMilestoneItems()` runs
on load and settles the account: past the gate, not holding it, here it is.

Two things make that safe to run on every single load:

- **A ledger, not a check.** Each entry is granted at most once ever, and the
  fact is written into the save. Something you were given and then sold or
  spent is never handed back. Proved it: grant, drop the pistol, reload — it
  stays gone.
- **`has` covers the ordinary case.** A player who earned it the normal way is
  marked settled without being handed a second one.

**And the line it does not cross: unique keepables only, never consumables.**
For scrap or rounds there is no way to tell "spent it" from "never got it", so
backfilling those would refund ammo on every update. The Compactor's 2 tech and
8 scrap stay a one-time reward paid at the kill.

Seeded with the two that are true today — Marek's pistol and the gate key at
`mission.state === 'turned'`. Nothing else in the game is currently owed:
the MREs come from a counter and a chest, not a stage.

One real bug found while testing the actual path rather than the function:
`applySave` runs from the TITLE screen, before `GameState` becomes `'playing'`,
and `saveGame()` refuses to write unless it is playing. So the ledger was being
computed and then not reaching disk until some later save. Committed at once
now. Verified by loading a genuine pre-system save through the splash and the
title the way a player does: both items handed over, announced on screen, and
the ledger on disk immediately.

### 97. The rifle in the wreck
**Laurens:** "Build the damaged rifle, the option to fix it at the NPC, write
the description and make it so it drops from the boss. Then check if the player
has defeated the boss — if yes, give him the damaged rifle."

**Claude:** Built, and it is the first thing the rule from #96 was actually for.

**Where it comes from.** The Compactor spent a year swallowing this yard, and
one of the things it swallowed was carrying a rifle. So it comes out of the
WRECK, not out of the machine — the drop is a bent, dark, optic-less thing in
the KEY ITEMS tab, not a weapon. The banner is a single slot and the gate
announcement already owns it, so the rifle gets the thought channel instead:
*"A rifle in the wreck. Bent in half — but somebody might straighten it."*

**Who fixes it.** Bo, because he is already the man taking a Hunter-Killer
apart at the workbench — the only person in the ring who could. It costs
**3 tech and 10 scrap**, which is one tech more than the boss hands you, so it
is a small errand through Tam's counter rather than a formality.

His bench is the trade panel with two changes, both small: a **verb**, so it
reads `REPAIRS — BO` instead of `TRADE — BO`, and a **stock that is a function
rather than a list**, so the row only exists while you are carrying something
bent. Talk to him with a working rifle and he just talks.

**What it does.** 18 damage against the pistol's 10, further and flatter, and
0.78s between shots against 0.5s. One ammo pool — the ring only ever had one
kind of round in it, which is why Tam has been selling "rifle rounds" for a
pistol all along. `player.gun` picks which gun is in the slot, the same way
`player.melee` picks the melee, so swapping guns is the gesture you already know.

**One thing had to be undone first.** Bullet damage was the number `10` written
into four separate hit sites — Scrapper, bandit, droid, boss. A second gun was
impossible until the bullet carried its own damage. It does now, defaulting to
10, so nothing else changed.

**And the back-payment.** `bossDefeated` → the damaged rifle, with `has`
counting the REPAIRED one too, so somebody who already fixed theirs is not
handed a second broken one. Verified all four ways: killed early gets it,
reloading does not duplicate it, an already-repaired run is owed nothing, and a
run that never beat the boss gets nothing.

### 98. The price printed through the name
**Laurens:** "So the text doesn't fit the trade UI when trying to fix the rifle."

**Claude:** It did not, and the numbers say why: the row wanted
26 + 108 + 8 + 103.5 + 8 = **253 pixels of a 168-pixel panel**, so
"STRAIGHTEN THE RIFLE" and "3 LOW-Q TECH + 10 SCRAP" were drawn straight
through each other into mush.

**The panel was 168px wide whatever was in it.** That held up for exactly as
long as every row was one of Marek's three short ones, and Bo's was the first
row that was not. So it measures now: widest label + gap + widest price, then
clamps to what is actually left beside the YOURS column. Marek's comes out at
152, Tam's at 161, Bo's at 197 — each panel is the size of its own contents.

Two smaller things went with it. Prices say **`tech`** rather than `low-q tech`
— a price sits at the right-hand edge of a panel and the pack is where an item
gets its full name — and Bo's row is **`straighten it`**, which is what he
would say anyway.

And a backstop, because a fix that only fixes today's string is not a fix:
`ptClip` cuts a label that still will not fit rather than letting it overprint.
A price you cannot read is worse than a name you cannot finish.

Checked by measuring all three counters for collision rather than by looking at
one: zero overlap on every row, every panel still fits the 320px screen.

### 99. Seven things
**Laurens:** the rifle texture (with a reference image), droids with rifles
should drop rifle ammo, the rifle was shooting pistol ammo, the church is too
full, a crypt chest is walled off, the killer bots can be walked straight past,
and dead opponents should disappear after 45 seconds.

**Claude:**

**1 · The rifle.** Redrawn against the reference. The old one was a grey bar
with a box on it; a carbine only reads if each part is its own mass, so it has
a front sight post, a ribbed handguard, a receiver with a **carry handle
stepping the top line up**, a magazine hanging clear of the grip, and a notched
stock. The tan is the reference's and it suits the fiction — issued kit is not
painted the colour of junk. The broken one now reads broken rather than merely
dark: the barrel kinks **two** pixels (one is a rendering artefact), the carry
handle is torn to stubs, and the magazine is simply gone — a hole in the
silhouette says wrecked faster than shading does.

**3 · Two magazines.** They were one pool on the theory that the ring only ever
had one kind of round in it. That was a bad theory: it reads as a bug however
it is justified, and it gave the best gun in the game the most plentiful
ammunition. Each gun names the pocket it feeds from now.

**2 · So the machines carry them.** A dead droid is strippable — *E, strip the
hull* — for factory plate, sometimes a tech component, and, from the ones built
around a rifle, **the only rounds in the ring that fit one**.

**6 · And they can see.** Two things were wrong. Sight ranges were shorter than
a Scrapper's in places, so they are up across the board (the Marshal 6.0 → 8.5).
And the roster has always carried a per-unit `arc` that **nothing ever read** —
every machine in the city was squinting down the same 120 degrees as a yard
Scrapper. `canSpot` takes an arc now, so a hunter built for it sweeps up to 154.

**7 · One clock for the dead.** `CORPSE_LINGER` 45s, then five seconds fading,
for bandits and droids alike. A body that has gone is also no longer something
the game offers to search. Scrapper wrecks keep their own 20-second respawn:
that is a tutorial loop, not litter, and slowing it would slow the mission.

**4 · The nave.** Both pews and both fire barrels out. It read as cluttered
rather than lived-in, and a camp needs somewhere to walk — the hearth, the
votive stands and the drone bench still light it. 110 walkable tiles to 114.

**5 · The chest that could not be opened, and the audit that said it could.**
It sat in a corner with hay, preserves and two walls round it, reachable only
on the diagonal — and **a diagonal is 1.414 tiles against a 1.4 reach**. The
layout audit had passed it because it checked a 3×3 box, diagonals included,
instead of the rule the game actually uses. The audit measures what
`updateItems` measures now, which is the part worth keeping: the chest was one
bug, the blind spot would have produced more. Moving it took three attempts —
the east column is cistern, preserves, preserves, leaving one-tile gaps that
only x=7 serves, so two of my fixes just moved the pocket. In the end I stopped
guessing and searched every free tile for one that seals nothing and can be
reached.

### 99. Magazines
**Laurens:** "Quite a large combat change now. Instead of just firing
continuously, show how many bullets are left in the mag — and now there are mags
too. You don't buy rounds but mags, you don't find bullets but mags. The rifle
you reload every 12 bullets, the pistol every 6. If you reload a mag with
bullets left you use them. Make explanations and new texture mechanics etc.
This is a big change, be thorough."

**Claude:** Planned first in `design/magazines.md`, then built whole.

**Why the old number was weak, stated so the design has something to answer.**
`player.ammo` was one integer and the trigger read it directly. Forty rounds
and six played identically until it hit zero; the number was a wallet, not a
weapon; and nothing could ever catch you out. A round count answers *can I keep
shooting at all*. A magazine answers *can I keep shooting right now*, and only
the second question is worth asking in a fight.

**The model.** Each gun owns `{ loaded, spares: [] }` — one entry per magazine
carried, holding its round count. Pistol 6, rifle 12.

**The rule everything turns on:** reloading takes the fullest spare, and the
magazine coming out **goes back in the pouch with its rounds still in it**.
Nothing is ever lost by reloading early, which is exactly Laurens' *"if you
reload a mag with bullets left you use them"*. A system that punished topping
up would only teach players to fight on empty. The consequence — a pouch of
part-used magazines after a long fight — is correct, and the HUD pips show it.
Reload refuses out loud when there is nothing fuller to swap to.

**What you see.** The weapon slot carries `loaded/capacity` (amber on the last
third, red on empty) and one pip per spare, each filled to how full that
magazine is. Reloading replaces the pips with a filling bar so the pause is
visible and its length legible. Empty with spares pulses an `R`; empty with
nothing says so once. The first dry click fires the freeze-frame lesson.

**Where they come from.** Nothing hands out loose rounds any more: the yard
pickups, the two that shake loose at the gate, Marek, Tam, a stripped droid and
a searched raider all give magazines. The drops are deliberately PART-USED —
the machine was mid-magazine when you put it down — which is the pouch-of-
partials situation the reload rule exists for.

**Art.** Two icons that must differ at ten pixels: the pistol magazine is a
short straight steel box, the rifle magazine is longer and CURVED, which is the
one silhouette cue that survives at that size. Both carry a witness stripe, the
same thing the HUD pips quote.

**Saves.** `ammo`/`ammoRifle` were plain numbers, and this is a change of
representation rather than of what the player owns, so the conversion loses
nothing: fill the loaded magazine, bag the remainder. 15 pistol and 40 rifle
rounds came back as 6+[6,3] and 12+[12,12,4] — measured, still 15 and 40.

Verified with real key presses rather than by calling the functions: hold the
trigger to a dry click, R to reload, R refused when full, and an early reload
at 4/6 leaving a 4-round magazine in the pouch.

---

## Reloading, without the magazines (2026-08-20)

**Laurens:** *"ok how about you just have to reload every 6/12 bullets
depending on the gun, so no stupid mag stuff. make the change."*

The day-old magazine system is gone; the pause it was built around stays. Each
gun now has `{loaded, reserve}` — what is in it, and loose rounds in your
pocket for it — and `R` moves `min(cap - loaded, reserve)` across over
1.1s / 1.6s. The rule the pouch needed a paragraph to state ("a partial
magazine is never thrown away") now needs none: a part-full gun simply takes
fewer rounds to fill, so reloading early cannot cost anything. Reload refuses
out loud in the only two cases where it would do nothing — `ALREADY LOADED`
and `NO ROUNDS LEFT`.

**What went.** `spares[]` and every function that maintained it, the
`magPistol`/`magRifle` pack items and their two icons, magazines in the shops,
in droid strips, in body searches and in ground pickups, and the HUD pip row
that showed one part-lit pip per spare. Marek sells 6 rounds for 6 scrap again
and Tam 12 rifle rounds for 7 — the same prices per round the magazines had, so
the economy is untouched.

**What the slot shows now.** `loaded/capacity` as before, then **one pip per
round in the gun** — the row empties as you fire, which puts the moment you
have to stop *before* it happens rather than after — and the pocket total as a
small grey `×n` that turns red at zero. Reloading still replaces the pips with
a filling bar; an empty gun with rounds to put in still pulses an `R`.

**One thing fixed on the way.** The freeze-frame lesson says *press R*, and the
press that dismissed it was swallowed by the freeze — so being told to press R
and pressing R did nothing. `tutShow` takes an `onDo` now, and the key that
closes a lesson performs it. Measured: 0/6 with 8 in the pocket, one R,
6 loaded and 2 left.

**Saves.** Three shapes exist in the wild and all three load without losing a
round: plain `ammo`/`ammoRifle` numbers (15 and 40 → 6+9 and 12+28), the
one-day magazine pouch (`2 + [6,4]` → 2+10, poured into the pocket), and the
new `reserve`. Round-tripped through save/load as well.

**Verified in the browser**, not by calling the functions: held the trigger to
a dry click, R to reload, R refused when full, an early reload at 4/6 taking
only the two rounds it needed, the rifle filling to 12/12, the whole Marek
handover → shop → fire dry → reload chain in a live run, and screenshots of
every slot state (part full, full, empty-with-rounds, bone dry, mid-reload),
the pack, both counters and the tutorial. No console errors.

One unrelated thing caught by the same sweep: `arena.html` never loaded
`js/droids.js`, so the boss arena threw `updateDroids is not defined` on every
frame. One script tag, verified clean.

Docs: `design/magazines.md` is now `design/reloading.md`, rewritten, with a
section on why the magazine version was cut and where to find it if it is ever
wanted back. `PROJECT_STATE.md` updated to match.

---

## Handoff for tomorrow (2026-08-20, end of day)

**Laurens:** *"ok save all stuff so tomorrow i can keep going on ipad"*

Everything was already committed and pushed — `main` and the working branch
both on `edcdeda`, tree clean — so this was about making the repo readable cold
rather than about saving anything. Added a **"Where we left off"** block at the
top of `PROJECT_STATE.md`: what shipped today newest-first with the commits,
the explicit warning that `e49e386` (magazines) is superseded by `edcdeda` and
must not be rebuilt from, the three things waiting on Laurens' call (the
Scout's flare, stealth kills / squad respawn, ammunition balance against the
Compactor at ~18 rounds), and the two jobs that need no decision at all — long
props as volumes, and the rest of Candlelight.

Nothing is half-built and nothing lives only on this machine.

---

## The gunsmith — planned, 2026-08-21

**Laurens:** *"plan first. remove the robot on the table, and the dialogue
attached to it instead make it a weapon mod station make it like the immage a
bit. what is changable about weapons is different of every one. THe pipe, scrap
pistol and knife cant be modded but the rifle can. For the rife i want it to be
possible to change a part prbably the barrle to make it shoot bursts. the mag so
you can go for drum mag to not have to reload so often but realoading takes
longer. think of any other stuff that would be cool to mod for the rifle"*
(with the MW3 gunsmith screen as reference).

Wrote `design/gunsmith.md` — **planned, not built**, per rule 1. In short: the
Hunter-Killer comes off the bench sprite (and its glow, and the `USABLE` line,
and Bo's three lines about it), the bench becomes a gunsmith's bench that opens
a full-screen panel laid out like the reference — the rifle drawn big with its
fitted parts really on it, slot chips around it on leader lines.

Five slots on the rifle and nothing on the pipe, knife or pistol: **barrel**
(burst regulator — three rounds a click, and you no longer choose how many to
spend / long barrel — 22 damage, slower), **magazine** (drum 24 at a 2.9s
reload / stripped 8 at 1.15s), **muzzle** (compensator, and a suppressor that is
flagged because it needs "gunfire is heard", which the game has no notion of),
**optic** (laser line — the one real ambiguity in an iso view), **stock**
(padded, −0.35s reload). Parts are bought at the bench with scrap and tech, and
once bought they swap free.

Engineering core is `gunStats(gun)` — one merge of base plus fitted deltas that
firing, reload, the HUD and the panel all read, because the rifle's numbers are
already read in four places and mods would make those four disagree.

Three things want an answer before building: the suppressor / heard-gunfire
mechanic, whether any part should drop as loot, and whether the rifle ammunition
price needs to move once burst and drum exist.

---

## The gunsmith, built — 2026-08-21

**Laurens:** *"i like all except muzzle. start building"*

The muzzle slot is cut, and with it the suppressor and the "gunfire is heard"
mechanic it would have needed — detection stays visual, `canSpot` untouched.
Four slots on the rifle, five buyable parts. The other two open questions were
settled the way the plan leaned: bench-only parts, no ammunition price change
until somebody plays it.

Built in six commits, each one playable on its own:

1. **The bench** — the Hunter-Killer with its lid off is gone from the sprite,
   and with it the amber eye-glow, the look text and Bo's three lines about it.
   In its place a rifle in a cradle with its handguard off, a barrel in the
   vice, a tray of springs and a hooded lamp that now lights that wall. The
   first arrangement stacked the lamp over the vice and the right-hand end read
   as one grey lump; lamp went left, gun centre, vice far right.
2. **`gunStats()`** in a new `js/mods.js` — the only place the rifle's numbers
   come from, because mods on top of four separate readers of GUNS would have
   disagreed within a week. Parts declare deltas, so the panel prints what a
   part does by asking what the gun would become.
3. **The rifle drawn from its parts** — long barrel reaches further, drum hangs
   round and fat, stripped box is a stub, laser is a red diode under the
   handguard, burst regulator clamps over the gas port, padded stock is deeper.
   The HUD slot icon and the held pose take the same map.
4. **The panel** — gun big in the middle, four chips two to a side on stepped
   leader lines to the exact point each changes, and hovering a part you have
   not bought draws it on the gun.
5. **The burst and the laser** — the two parts that needed code. A burst in the
   air finishes itself whether or not you are still holding the trigger, which
   is the whole cost of the part; `R` pressed mid-burst is remembered and
   honoured the moment it ends.
6. **HUD and verification** — the pip row is sized to the magazine now, so 24
   pips fit the same 70px slot as 12. Verified in a browser: every part bought
   through the panel and fired, the burst counted round by round, the reload
   timed at its modified length, the save round-tripped through a page reload,
   an unknown part id falling back to standard, and a save written before the
   bench existed loading with every slot standard and not one round lost —
   which turned up a real bug on the way (a drum save read by a build without
   the drum used to clamp the loaded count and quietly eat twelve rounds).

Left for a human: whether burst + drum makes rifle rounds miserable.

---

## The bench stops selling — 2026-08-21

**Laurens:** *"ok no you cant buy them at the table you need to find them or
purchase them from npcs"*

Right, and the better design: a bench that sells you the part it then bolts on
is a menu with a table drawn behind it. The gunsmith now **fits only what is
already in your kit** — a part you do not have reads `NOT FOUND` and says, when
you hover it, that a thing like that is taken off a machine or traded for at a
counter. `buyPart` is gone; `givePart` replaces it, and prices stay on the part
so they are written once wherever it turns up.

**Off machines** — the two worth wanting. The **burst regulator** comes off a
stripped **Marshal**, which is the droid that fires in threes, and the **long
barrel** off a **Magistrate**, which finally gives the "come back later" wall a
reason to come back. Once each, never twice, and only if you own the rifle or
are carrying the bent one — you do not pocket a fitting for a gun you have
never held. Squads respawn, so nothing can be missed by having played early and
rule 7 needs no ledger entry.

**From people** — **Bo** sells the two things a man with a vice and an awl can
make (padded stock, stripped 8-round box); he cannot make a diode, a drum or a
regulator and does not pretend to. **Tam** buys from people who go further out
than he does, so the **laser box** and the **drum** turn up on his counter.
Neither lists them until you own the rifle.

Also: a **PARTS tab** in the pack, generated from the same registry so a part's
name is written once, with a green bar on whichever one is on the gun; six new
part icons, each a different silhouette so they tell each other apart in a 26px
tile; and the panel's bottom text is now counted against the room left, after
the fourth line printed through `E — close`.

Verified in a browser: both droid drops (and no duplicate from a second
Marshal, and nothing at all before you own a rifle), both counters listing and
then dropping their rows, fitting an owned part, refusing an unowned one, and
the pack tab.

---

## The drum goes in the crypt — 2026-08-21

**Laurens:** *"so one of the chests in the basement should give the drum mag.
the other 2 sure they can be purchased for the npc and dropped from the finge
patrols."*

Tam stops selling the drum; the chest at (1,6) in the crypt carries it, beside
the strongbox. The right home for it: the camp keeps what it cannot use next to
what it cannot open, and a magazine for a rifle nobody owns is exactly that —
which also means the single biggest change the rifle can have is something you
find in the dark under a church rather than something on a counter. Everything
else stays as it was: burst regulator off a Marshal, long barrel off a
Magistrate, laser box from Tam, padded stock and stripped box from Bo.

A chest empties once and never refills, so a run that had already been down
there is handed the drum on load — `crypt-drum` in `MILESTONE_GRANTS`, keyed on
the same open-chest record the world restores from. Rule 7, doing what it was
written for.

**And it turned up a real bug on the way.** `collectAreaState()` in `save.js`
was a second hand-written copy of the snapshot `stashArea()` takes when you walk
out of a door — and it had never learned about chests. So opening a chest and
then reloading a save made in that same area handed the chest back unopened:
infinite loot, and, from today, an infinite supply of a unique weapon part. Both
now call one `snapshotArea()`. Verified: open the chest, save in the crypt,
reload the page — the chest is still empty and the drum is still yours.

---

## The laser box upstairs, and one rifle drawn three sizes — 2026-08-21

**Laurens:** *"the laser box should be in one of the top chests should give it.
Also the icon for rifle in the table looks so much better than the inventory and
the side ui make it look the same"*

**The laser box** comes out of Tam's stock and goes into the camp's own chest at
(9,13), on the warm side of the nave — so both of the parts that change the
rifle most are now things you find in a box rather than things you buy. Tam
sells no parts at all any more; Bo still sells the two a man with a vice and an
awl can make. `candlelight-laser` joins `crypt-drum` in `MILESTONE_GRANTS`, so a
run that emptied that chest before the part existed is handed it on load.

**And the rifle is one drawing at three sizes now.** It was three different
guns: the gunsmith's big 34×12 build, the pack scaling that same sprite into a
26px tile it overflowed by five pixels each side, and the weapon slot drawing a
cruder 18×8 gun from back when there was only one rifle to draw. The pack and
the slot now share a faithful **miniature** — the same palette and the same
masses in the same order, hider through notched stock, with the same parts on
it — mirrored for the slot, because there it is the gun the way you are holding
it. A drum, a laser diode, a long barrel and a padded butt all read at 24px.

Verified: the chest hands over the laser once, an old save that had emptied it
gets it on load and not twice, Tam's board is rations and rounds again, and the
pack tile and weapon slot were screenshotted beside the bench for comparison.

---

## The corner that never closed — 2026-08-21

**Laurens:** *"so in the cathedral the bottom right on the top floor and the
crypt the walls dont line up there is a gap"*

Real, and in both rooms for the same reason. `shellWalls()` built its east run
one tile short — `length: H - 1` — so the south-east corner tile carried only
the south run's slice. Every wall run trims about seven pixels off the end that
meets a corner so that two runs interlock there; with only one run present those
seven pixels met nothing, and the kerb simply stopped a tile early, leaving bare
floor edge at the bottom of the room. The crypt's own east run had the same
off-by-one. The other three corners of both rooms have always had two slices,
which is exactly why this was easy to miss.

Both east runs are full height now. Verified by counting wall slices per corner
tile — all four corners in Candlelight, the crypt and the junkyard now carry two,
and the only bare edge tiles left anywhere are the doorway at (5,15)/(6,15) and
the junkyard gate at (31,11..13), which is correct. Also verified by pixel-diffing
a before/after screenshot of each room: exactly one kerb-shaped patch changed in
each, at the corner. Walkable counts are unchanged (114 and 34) and both audits
are clean.

`design/candlelight.md` gains the rule under "only the far walls are walls",
because CLAUDE.md already said corner tiles belong to both runs and this was a
violation of it that nobody had written down anywhere the builder would look.

---

## The corner, actually fixed — 2026-08-21

**Laurens:** *"fix it"*

He was right to send it back: the previous commit had put the missing slice
back into the corner tile, but the gap was still there, because **the missing
slice was the smaller half of the bug.**

With both halves present it was obvious that they were landing eight pixels
apart. `Sprites._makeWallRun` undoes the shear per tile so a run's whole strip
can be drawn at one anchor — and the y branch was one tile out: `8*(n-si)`
where the shear puts that block at `8*(n-si-1)`. So **every wall in the game
built along y has been sitting one tile-height above the floor edge it belongs
to** — the west walls, the east kerbs, the shack's sides, the junkyard's side
fences.

Along a wall's length that reads as nothing: the wall is tall, the edge beyond
it is dark. Where two walls MEET it is a step — and at the one place in the
game where two knee-high kerbs meet, Candlelight's and the crypt's south-east
corner, it read as exactly what Laurens said it was: the walls not lining up,
with a gap.

One character of arithmetic. Checked every wall run in the game before and
after, at ten camera positions with the evening grade turned off so the
geometry is visible: both rooms' south-east corners now close, and so do the
apexes of the north-west corners, the junkyard's fence corners, the shack's
walls and the gate posts — all of which had been half a tile out and had been
read, by me included, as "that is how the pixels fall". Walkable counts, the
layout audit and the cover audit are all unchanged.

`design/candlelight.md` carries the real cause now, replacing the half-story I
wrote in the last entry.

---

## One drawing of the rifle — 2026-08-21

**Laurens:** *"now the rifle in weapon and inventory ui, looks different than on
the weapons table, on the table it looks really cool but the others look cooked
so take the one from the weapon table. Than make sure it also looks the same
when the hero is holding it and shooting"*

There were three rifles in the game: the bench's 36×14 build, a two-thirds
miniature for the pack and the weapon slot, and a cruder still-smaller one for
the hands. The miniature only existed because a 26px pack tile could not hold
36px of gun — so **the tile grew instead**. The pack is 36px cells in a 4×3 grid
now (twelve slots is still more than any tab holds, and every other icon got
bigger with it), and the weapon slot went 70×23 → 84×28 so the same drawing fits
beside its numbers. Both draw `Sprites.rifleBuild` with the fitted parts on it;
the slot mirrors it, because there it is the gun the way you hold it. The pistol
takes its full-size icon in the slot now too.

**The hands are the one place that cannot take it.** The traveller is sixteen
pixels across and the bench's rifle is thirty-six long: drawn in their fists it
buries them — receiver over the chest, drum past the elbow. I tried it, and it
looked like a person wearing a gun. The pistol they carry is twelve pixels, so a
rifle is about twenty-four: the held version is the same gun at two thirds, mass
for mass, with the same parts showing. The muzzle flash now comes off the end of
*this* barrel — further out with a long barrel fitted — instead of a fixed
sixteen pixels.

Checked at all eight aim angles, firing and not, plus every pack tab, the
equip dialog, both counters and the layout audits.

---

## Two triggers — 2026-08-21

**Laurens:** *"change the 3 bullet burst thing so when you left click it shoots
normal but rightlick shoots at 3 bullet burst"*

Done, and it is the better shape for the part. The regulator used to *take away*
single fire — every left click became a burst — which made it a decision you had
to commit to at a bench, before the fight. Now it adds a second trigger under
your right finger and the choice is per shot: left is one round, right is three,
and holding either repeats it.

The cost stays honest twice over: the heavier trigger group still slows every
shot (0.78 → 0.95s), so single fire with the regulator fitted is worse than a
standard barrel's — and once a burst starts **it finishes**, which is still the
part's real price in a ring where rifle rounds are the scarcest thing going.

`Input.rDown` is new (the right button HELD; `rPressed` was only ever an edge for
the any-key tutorial). Right-click does nothing at all with any other barrel, or
with the pistol — no new mode, no message, nothing to unlearn.

Verified in a browser: a left tap spends one, a right tap spends exactly three
even when released instantly, holding right fires two bursts in 1.1s, `R` during
a burst is still remembered and honoured when it ends, an empty gun still gives
the dry click and the reload lesson on either button, and the pistol and the
standard barrel ignore the right button entirely. The gunsmith row reads
`right click: 3-round burst`, and the part's description leads with the rule.

---

## The weapon panel, and a bar for the right hand — 2026-08-21

**Laurens:** *"rework the wapon ui when just playing having the numbre and the
visualisation of the bullets and the amount leaft all together makes it
confusion + i need a coolown timer or bar for the rightclick ability"*

The old slot crammed `17/24`, a strip of pips and a bare `×30` into eighty-four
pixels — three different quantities in one glance with nothing telling them
apart. It is three ROWS now, each answering one question, in the order you need
them:

1. **What am I holding, and how many rounds are in it** — the gun, then the
   loaded count BIG with the capacity small beside it.
2. **How many is that** — the pip strip on its own line, sized to the magazine
   so a drum's twenty-four fit as neatly as twelve.
3. **What is left, and can I burst** — under a rule, a *labelled* `POCKET n`
   (the label is the whole fix for "which number is which") and the `RMB` bar.

Reloading still replaces the strip with a filling bar; an empty gun with rounds
to put in now says `PRESS R` across the empty strip instead of a lone `R`.

**And the burst became an ability, because it needed to be one to have a bar.**
It recharges for two seconds after it fires, so holding the right button can no
longer spray — sustained that is 1.5 rounds/s against single fire's 1.05, better
but front-loaded, which is what a burst should be. The bar is amber and full
when the right button will do something and grey and filling when it will not;
nothing else in the panel is amber while it recharges, so the eye finds it
without reading it. It is labelled `RMB` rather than `BURST` because the bar's
job is to say *which button*, and because `BURST` collided with the pocket total.

Verified in a browser: every panel state (ready, cooling, drum, empty,
reloading, pistol, melee), a real right-click spending exactly three rounds and
starting the bar, holding the right button through a cooldown firing nothing
until it recharged, left click unaffected by it, and the cooldown starting clean
on load.

---

## Enemies stop disappearing — 2026-08-21

**Laurens:** *"you know how when i walk next to a building and you still show
the charcter transparently do the same with any opponen otherwise they just
become invisible and unkillable for me"*

Done for every living hostile — scrappers, bandits and droids — in the same
washed-out silhouette the player has always had.

Two conditions, and both matter. **Covered**, because an enemy in the open needs
no help. **Within eight tiles**, because drawing every occluded enemy on the map
through its wall is x-ray vision, and this game's stealth depends on a droid two
streets away being a droid you have not found yet.

The interesting part was "covered". The cheap test — is any tile between it and
the camera `heavy`? — is wrong in a way that shows: a building's footprint is
heavy on every tile it stands on, so an enemy behind its FAR side counts as
hidden while being drawn clear above the roof, plainly visible, and would get a
40%-alpha copy of itself painted on top. So the tall props (buildings, wall
runs, piers, trash mountains, and everything that goes through the common prop
draw) now record the **rectangle they actually painted**, and the ghost pass
asks whether this sprite's head *and* middle are inside one of them, from
something nearer the camera. Half-covered is not covered: you can see them.

The rect list is rebuilt per frame and only while something hostile is near —
with nobody around, `wantBlockers` is false and not a single rect is recorded.
Measured: 8.16ms a frame in the headless canvas either way, which is to say the
difference is noise.

Also pulled the frame-picking for each enemy into `banditFrame`, `scrapperFrame`
and `droidFrame`, shared by the real draw and the ghost — two copies of a frame
table drift, and a ghost in the wrong pose is worse than no ghost.

Verified by walking a droid out from behind a building step by step: covered for
exactly the four steps the building paints over it, not before (above the roof),
not after (clear of the corner). A scrapper behind a trash mountain ghosts; the
same scrapper in the open does not; a bandit behind a car does not, because a
car hides your legs and not your head.

---

## Four pins come off the map — 2026-08-21

**Laurens:** *"ok now remove the pins for those other buildings on the map they
dont jet have a purpose"*

Gone: THE FORECOURT, ALDERGROVE PRIMARY, THE REGENT HOTEL and CITY & COUNTY
BANK. A pin is a promise — four of them spread across the ring, each saying
*there is something here*, and there is not; they are silhouettes you walk past.
A map that marks things you cannot use teaches the player to stop reading the
map, which costs more than four icons are worth.

What the map shows now is only places you can go and do something: **the two
camps, the yard gate from both sides, and the sign trail** (which earns its
keep — the signs are how you find Candlelight the first time).

The `landmark` kind stays wired up end to end — icon, declutter rule, panel —
so putting a pin back is one line the day that building has a door, a trader or
a fight in it. Their names and blurbs are parked in `design/map-ui.md` §3.2a so
they are not lost with the code.

Verified: the table is down to four entries and zero landmarks, the open map
draws 2 camps + 2 gates, zoomed in it adds the 14 signs and nothing else, and
the map's own test pass reports no errors.

---

## The road north — 2026-08-22

**Laurens:** *"what area is next plan it map it and eplain how to get there the
whole map and quest camps"*

Planned, not built: `design/the-road-north.md`.

**What is next: the empty north of the Fringe.** Everything ever built sits
between y 36 (the north cross) and y 126 (the gate road); above it is a
forty-tile band of dead lots that has been there since the ring was drawn. That
band holds the two things `design/fringe-buildout.md` listed as phases 4 and 5
of 5 — **Field 12**, the dead airfield with the crashed news drone in the middle
of the runway, and **the Underpass** under the collapsed viaduct, which is the
door to **Ring 4**.

Three reasons agree on it, which is why it did not need arguing: the build order
said so five phases ago; Act 2 cannot start without Q3, because Q4 exists to
decode what Q3 finds; and north is the only direction the map is open in — the
gate road dead-ends at the yard, the spine dead-ends into blocks.

**One thing has to come first and it is small.** Ivar has a mission slot and no
mission, so nothing in the game currently sends the player north at all. Q2 is
that sentence. Proposed: *THE LONG AERIAL* — Candlelight's radio receives and
cannot transmit, the aerial is on the school's mast, it goes up the church
tower, and what it catches is a loop still repeating from the night of the
Correction, coming from the airfield. That pays for the tower stair (already
outstanding) and gives the school back the map pin we took off it last session,
because now it has a purpose.

**Field 12 is the first sightline space in the game.** Every fight so far has
been a corridor, a yard or a street, and the whole occlusion stack — the player
fade, `spriteCovered`, the enemy ghosts built two days ago — is about things
standing in the way. On a runway nothing does. That is the point of it and it is
also written down as a risk, along with the fact that ninety tiles of centreline
paint is the biggest sheared surface this project has ever attempted and gets
prototyped twenty tiles at a time.

**The seam goes in the dark.** `design/world-map.md` promises no loading
screens and the engine loads areas, so the viaduct becomes the Fringe's north
wall — five storeys of pancaked deck, visible from the north cross, with exactly
one hole in it — and the exit trigger sits *inside* the tunnel. You walk into
the dark and the transition happens on a black screen. It also retires the
Fringe's invisible north boundary, which is currently a hard edge with nothing
drawn on it.

**Four camps on the road, two new.** Marek's shack, Candlelight, then **the
Lamp** — two people and a drum fire in the underpass mouth, one stock list, no
beds, and the doc says out loud that it must never get beds because the whole
shape of it is *this is as far as anybody sane goes* — and then **Station 9**,
the Ring-4 camp in a dead metro station, with the full stack and Ada in it.

Build order N1–N7. **N1→N4 is the honest next chunk of work**; N5→N7 (the
Sprawl shell, Station 9, the turrets and the Shepherd) is a second project about
the size of the entire Fringe and is marked as needing its own plan rather than
being committed to now.

Seven questions back to Laurens, the first being whether Q2 is the aerial at
all. Nothing built, no code touched — approval first, per rule 1.

### Brainstorm — what the Fringe still needs to be finished
**Laurens:** *"Brainstorm a list of things this area needs to be compleated, i
added everything i find nessecary now come the detailles."*
**Claude:** First re-synced: this session's branch was 58 commits behind and its
own map-UI plan had already been built on `main` (`cfb7200`), so the branch was
restarted from `main` and the two stale commits dropped rather than rebased —
rebasing them would have clobbered the built `design/map-ui.md` with the older
plan and appended duplicate log entries.
Then wrote `design/fringe-completion.md` — not a plan, no code. Everything
between the Fringe as it stands and a ring with no construction sites in it,
sized S/M/L and marked for whether it needs a call from Laurens. Seven groups:
the half-built debt (Halden and Bo's stock, Ade healing, respawn re-anchoring,
the strongbox, the tower stair, the churchyard, lit windows, the held-back
Scout, long props); the ring's missing economy; the 200×150 of city with no
reason to enter it; the detail pass that makes a street feel lived-through;
combat nobody has playtested; and Q2.
Three things the sweep turned up that were not on anyone's list:
- **There is no armour in the game at all.** `items.js` says outright that the
  ARMOUR tab was removed rather than stand empty promising the city would
  provide. It never did. That is a whole progression axis missing, and
  `progression-gear.md` never settled whether armour is one value or several.
- **Scrap has no sink.** Four traders in the ring and, once the knife and rifle
  are bought, nothing to want. Finishing the camp services fixes it as a side
  effect, which is an argument for doing the debt first.
- **The gas station is the best arena in the ring and nothing has ever been
  staged around it** — six pillars and four detonating pumps used as scenery.
Recommended order: the debt first (it needs no decisions and pays off the
economy), then Q2, then the detail pass, then interiors, then a balance pass —
that last one being Laurens' to do, since no browser check can tell you whether
a fight is miserable. Flagged armour and day/night as the two decisions that
block more than they appear to, both getting harder the later they are taken.

### The camp's services, and armour put off until Ring 4
**Laurens:** *"Ok do the depth first that think about the armour, since there
are already many upgrades in the fist part outisde of the toutorial, maybe save
new armour for next part of the quest."*

**The armour call, first.** Ring 5 is not getting armour, and that is now a
decision rather than an omission. Leaving the tutorial the Fringe already hands
over the piercing knife, the service rifle, and a bench with four slots and six
parts for it — a fourth progression axis would be a fourth thing competing for
the same scrap in the same ring, and armour is specifically the one that would
undo the pressure gradient, because armour is what makes walking deeper
survivable. It arrives with the Sprawl instead, where the player needs a reason
to keep going. Written into `design/progression-gear.md` above the Decided list,
with the two questions that still have to be answered when it is built (one
value or several slots; looted, traded or made).

**Then the debt — §1.1 to §1.3, the camp's services.**
- **Halden's counter.** 6 pistol rounds for 5 scrap, a snack bar for 3. The gap
  was real and nobody had noticed it: Tam sells *rifle* rounds, so a traveller
  who had not yet paid Bo to straighten the rifle could reach the only camp in
  the ring and find nothing on any counter that fitted his gun. He undercuts
  Marek on both rows, which is what "I'll trade you fair, I'm too old to be
  clever about it" ought to mean.
- **Ade's medbay.** Heals to full, and the row only exists while there is
  something to treat — the same shape as Bo's bench being empty until you carry
  something bent. **The price scales with the damage**, 2 scrap for a scratch
  and 9 for near-death, rather than a flat rate that robs you for a graze. She
  is the ring's first *repeatable* scrap sink; everything else it sells is
  bought once, which is why scrap had been piling up with nowhere to go.
  Her greeting had to become conditional: "you're not bleeding, come back when
  you are" is exactly right to somebody whole and exactly wrong to somebody who
  walked in at nine health, so `lines` may now be a function and hers is — the
  line Laurens wrote is kept, for the person it was written for.
- **The bays re-anchor respawn.** The highest-value item on the list. Respawn
  was two numbers with no map attached, and the only map they could have meant
  was the junkyard — so dying at the roadblocks put you a whole area away,
  behind a boss. Now `player.respawnArea` sits beside the coordinates, taking a
  bay claims it, and dying somewhere else routes through the **same fade a door
  does**, because a cut here reads as a crash. Bays are solid (everything in
  that room is), so you wake in the aisle at the bay's shoulder — and the aisle
  is *checked* rather than assumed, since only the middle bay actually has a
  free tile there. Sleeping heals; a bed that leaves you at nine health is a
  save point wearing a blanket. It moves no time on, there being no clock.
- **Saves migrate by default, not by conversion.** A save with no `respawnArea`
  predates bays and is a junkyard save by definition, so the absent field
  *is* the right answer. Also fixed a latent version of the same bug in
  `applySave`, which tested the out-of-bounds fallback against the literal
  string 'junkyard'.

**Verified in the browser** (`TEST_MODE`, scratch save key, screenshots taken):
Halden's two rows and Ade's one render correctly; Ade shows nothing at full
health and 1 row when hurt; her price moves 2 → 9 as damage rises; buying heals
30 → 100 and charges 7, and a second press charges nothing. A bay claimed in
Candlelight, then death in the Fringe, wakes the traveller **in Candlelight at
the bay's aisle**, full health. Save round-trips `candlelight`; the same save
with the field stripped loads as `junkyard`. No console errors.
One thing worth writing down about the harness rather than the game: jumping
straight to `GameState='playing'` leaves the first freeze-frame lesson up, and a
lesson freezes the world — so nothing ticks and a test can look like a failure
when the sim simply never ran.

### Making the questline clear — the plan
**Laurens:** *"first we have to make the questline clear, so after you reach the
shelter change it to talk to the survivors in the camp (formulate it better).
One of the npcs needs to somehow say something that gives you the quest to go to
the next ring or quest area, make a plan for this."*
**Claude:** Read the chain before planning, and it is worse than "thin". The
last line of `currentObjective()` is `return null` — so reaching the shelter does
not weaken the game's voice, it **ends it permanently**: HUD line gone, green
dot off both maps, seven people in a lit church and nothing anywhere saying
another thing exists.
Three more faults underneath it, all of which the fix has to carry:
- **"Reach the shelter" is completed by reading the map table**, not by
  arriving. You can walk in, meet everybody, sleep, buy a rifle part, and the
  HUD still says reach the shelter, because you never touched the altar.
- **There is no quest system.** `mission = {state}` is one object with one state
  belonging to the yard's five-scrap errand. Q2 has nowhere to live.
- **Who you have spoken to is not saved.** `buildFolk()` rebuilds the camp with
  `said: 0` on every entry, so "I talked to Tam" is forgotten the moment you
  step outside. A "talk to the survivors" objective needs its own memory.
Plan is `design/questline.md`. The chain becomes: reach the shelter → **"Ask
around Candlelight" (n/3)** → **"Hear Ivar out"** → Q2 → Q3. The wording Laurens
asked to be improved is an instruction rather than a description and names the
place so it still reads from the yard. Three of seven, any three: enough to walk
the room and trip over Bo's bench, Tam's counter or Ade's cots — which is the
camp teaching its own services — without becoming a hunt for whoever you missed.
Ivar is excluded from the count so he is always still there to be the
conversation that changes something.
**Ivar gives it** because he was built for it — the docs say outright he has the
mission slot and no mission, and his existing lines are about knowledge, not
goods. His dialogue gets the same conditional treatment Ade's just got.
The mechanism is two saved fields and one rule, not an engine: `Quests` and
`campMet`, merged onto defaults, with **a live run that has already arrived
credited on load** the way `MILESTONE_GRANTS` credits items — and the rule that
`currentObjective()` never returns null again while there is a next thing.
**And the trap the plan exists to avoid:** Q2 ends by saying something is
transmitting from the airfield, and the north band of the Fringe **is not
built** — the edge there is an invisible wall with nothing drawn on it. An
objective that walks the player into that is worse than the silence being fixed,
because silence promises nothing. So Q2 ships with **N1, the viaduct as the
ring's north wall** — the cheapest thing in the road-north plan, and it turns
the worst edge in the ring into a way north that is visibly not open yet.
Recommended Q2 is THE LONG AERIAL, because it does not assert that you should go
north, it produces the reason — and what it finds is the same broadcast Q3
exists to recover, so Act 1 and Act 2 join up. Four open questions; the first is
still whether Q2 is the aerial at all.

### The prologue: harmony, the turn, the graveyard, and the mechanic
**Laurens:** Cutscenes at the start plus slight tutorial changes — show the world
in harmony with robots helping, then all at once turning on people; the hero
fleeing and getting hit at the last second **at the graveyard**; a **mechanic**
who carries him to a second small shack where the hero spawns now, heals him and
**rebuilds some of his body parts with mechanical parts**, and then one day
leaves — and the hero wakes up. Plan first, in detail.
**Claude:** Wrote `design/prologue.md`. Nothing built. The largest single content
addition since the Fringe, and it rewrites lore that is already written down.
**Why it is worth it beyond the spectacle.** The current opening is three
typewriter lines, every one of them a summary: the player is *told* there was a
world and *told* it ended. Showing the machines being good first also fixes the
twist's weakest joint — the Correction stops being "robots go evil" and becomes
a man deciding people are the problem and being right about the machines and
wrong about himself. On a second playthrough the harmony scene is the most
damning thing in the game, because the player was the one who ended it.
**The graveyard should be St Martin's churchyard.** Not one invented for the
cutscene — the one the sign trail leads to, that the camp lives inside, already
owed as `cathedral.md` phase 2. It is geographically clean (he fled the Core
outward, went down at the edge of the ring, and a man carrying a body walks east
away from the city, which is where the yard is) and it buys the cheapest big
payoff in the project: **Q2 walks the player back to the exact place they died
and they do not know it.** The survivors have built their camp on top of it.
**The mechanic should NOT be Marek** (recommended). Making him Marek means Marek
has known all along that the traveller is half machine and never said so, which
makes him a liar for the whole tutorial and wastes the disappearance. A separate
man leaves the shack full of his tools and a diagram board, keeps Marek's
function untouched with a better line, and keeps the amnesia intact because the
one person who could explain anything is not there to ask.
**And the reason he left, which is the hook:** he is the only man alive who has
had this skull open, and **he recognised him** — not from the face, which was
ruined, but from something in the body. He finished the work anyway, then packed
his tools and went, telling nobody. The whole moral question of the game, asked
once, quietly, before the player knows there is a question.
**Two parts only**, because sixteen pixels: the left forearm (the arm that holds
the pipe, and the sprite already draws an extended arm) and a plate over the left
temple (the lore already had his head split open; it is the amnesia's physical
cause and what the mechanic had to open). **They must not glow amber at rest** —
amber means *this can be hurt* and that grammar is load-bearing — so instead they
glow when he is badly hurt, which is a health cue with no HUD.
**It also solves Ring 4.** Armour was deferred to the Sprawl on 08-22 with the
question of what it even is left open. If the traveller is already part machine
then the answer is **better parts, not scavenged plate**, fitted by a mechanic —
native rather than bolted on, and planted in the first three minutes.
**Tutorial changes are two:** movement moves into the playable flee, where it is
taught because you are being chased rather than by a freeze-frame in a quiet
yard; and a new first beat inside the shack teaches `E` on the diagrams.
Everything after is untouched. **Naming moves to waking in the shack** — the
moment the character genuinely has no name — which makes the final card land on
something the player did as he lost the first one. Returning players skip all of
it.
**The technical finding:** there is no cutscene system. `GateCine` and the boss
phases are bespoke timelines, one hand-written `t += dt` each. Fine for two, not
for six beats with camera moves, typed text and sound — so the plan's first piece
of code is a ~150-line beat runner, proved by re-expressing the existing gate
cutscene in it, after which every cutscene is data.
Seven open questions; the first three are the mechanic's identity, his name, and
whether the graveyard is the churchyard.

### The prologue, built — and the old opening kept in the file
**Laurens:** *"Ok build all cutsceens, but keep the current funktions as comments
so we can change it back if needed."*
**Claude:** Built. **On the branch, not merged** — it is a large visual change,
so under the local-first rule it does not reach the live site until Laurens has
seen it.
**The old opening is kept, and it is more than commented out.** `INTRO_LINES` and
the whole `intro` state — its update block and its draw block — are still live
and still working in `game.js`; nothing was deleted. The only change is that the
title screen no longer routes into it, and the two lines that used to do so are
sitting right there commented above the call that replaced them. Going back is
un-commenting two lines. The old text is also written out in full at the bottom
of `js/cine.js` next to an explanation of what replaced it.
**The blocker had to go first.** There was no cutscene system: `GateCine` and the
boss's phases were one hand-written `t += dt` each. `js/cine.js` is now a **beat
runner** — a cutscene is a list of beats, each saying how long it lasts, where
the camera looks, what is typed, whether the player has the sticks, and what to
run on entry and per frame. Every cutscene after this one is data.
Making that work needed `updateCamera` pulled out of the middle of `update()`,
where it had been sitting inline as twenty un-callable lines — which is why a
cutscene in any state other than `playing` had no camera at all.
**The prologue is a real area, not painted cards.** `buildPrologue` is 34×26 and
gets the actual renderer: same tiles, same building volumes, same AO, god rays,
colour grade and tilt-shift. A painted cutscene would have looked like a
different game, and the entire point of the scene is that it is the *same city*
the player is about to walk through as a ruin.
**The whole cast rides the `folk` pipeline** — four civilians, a child and three
helper machines are `Sprites.folk` entries, so there is no new drawing code for
any of them. And **the Correction is a key swap**: every machine keeps its
sprite, its frame and its place on the pavement, and only the bar it sees with
changes, blue to amber. Verified in the browser on one frame.
**Two bugs found by building it:**
- **Framing.** The first pass put a south building's roof across the middle of
  every shot. In this projection anything south of the subject draws in FRONT of
  it, and a 46-pixel house stands about six tiles of screen height — so the
  frontage moved three tiles back and the cast moved to the north pavement, with
  the camera framed on the road rather than on the pavement they stand on.
- **The movement lesson would have fired twice** — once in the run, once again
  three minutes later in a quiet junkyard. The run now marks the yard's as
  taught. And if you SKIP the prologue it does not, so a skipper is still taught
  to walk; that fell out rather than being designed, and it is the right
  behaviour.
**Verified end to end in the browser** under `TEST_MODE`: all six beats, the
machines turning, the playable run driven with the keyboard from the east end to
the lych gate, the hit, the fade, and the landing in the naming prompt with the
yard built. ESC from any beat lands in exactly the same place. No console errors.
**Five things deliberately not built**, listed in `design/prologue.md` §11. The
largest is that **there is no drawing of him on the ground** — the hit is a
shake, sparks, a hard zoom and a fade, and he is still standing when it lands.
The boots-entering-frame shot is not built either, and that is the emotional
peak of the scene. Also unbuilt: lit windows (the "before" city is lit by
streetlights, not by people being home), the mechanic's shack and waking up in
it, and the dressing on the Correction beat.

### Three corrections to the prologue, and the Core in the first shot
**Laurens:** *"dont make the cutsceens playable, and make the change be from the
yellow orange to the core blue color, make sure the scapper eye also changes to
that color, also make sure you show and slightly explain the core in the
beginning cutsceen."*
**Claude:**
- **The run is watched, not played.** He is right and the reason is worth
  keeping: this is a memory of a night that has already happened, and handing
  somebody the sticks quietly promises they can change it. They cannot — he goes
  down at the gate whatever they do. It also means the movement lesson goes back
  to the yard where it always was, and the prologue teaches nothing.
- **The colour was the wrong way round, and it was my error.** `droids.js` has
  said since it was written: *"Blue is WARDEN. Amber is damage."* I had the
  helper machines blue while they were still serving people and amber once they
  turned, which inverted the game's own language. Now they are **warm amber
  while they are the city's, and Core blue the moment they are not** — the
  Correction is the Core's colour reaching the edge of the city.
- **The Scrapper's eye is Core blue.** This overrides a deliberate note in
  `droids.js` that called its amber bulb the junk bot's warm exception. Worth
  the trade: the amber law becomes absolute. **The only amber left on any
  machine is a weak-point flash and the Compactor's eye**, so "what glows amber
  can be hurt" is now true with no footnote. Its attack telegraph stays
  red/amber — that is a warning, not an eye. Updated the stale comment.
  `CORE_BLUE` is defined once in `sprites.js` and used everywhere.
- **The Core is the first thing the game shows.** A new opening beat: the camera
  drifts up off the rooftops to the tower, lit and working, over two lines
  explaining what it is and what WARDEN did for the city. It is drawn FAR —
  desaturated, low contrast and deliberately **not** outlined, because contrast
  is depth in a flat palette and an outlined tower would sit in the street
  instead of behind it. The crown is the only saturated thing in the sprite.
  The framing needed the camera aimed at a negative tile y: the sprite is 132px
  tall above an anchor at its base, so aiming at the tile it stands on puts the
  crown off the top of the screen.
Verified in the browser end to end: warm → Core on one frame, the run driving
itself from the east end to the lych gate with no input, and the landing in the
naming prompt. No console errors.

### The Core is a crystal
**Laurens** (with three reference images): *"Nutze das als inspiration, the core
soll aber so gross wie ein hochaus sein, der core soll eine art crystal sein
welcher ganz viele compterserver powert."*
**Claude:** Replaced the tower with the crystal. A faceted bipyramid the height
of a high-rise — point at the top, widest line two thirds up, point at the
bottom sitting in its own cradle — standing over a **rack hall**: rows of
machines with their status lights on, which at this distance reads as a black
mass with blue rain in it, and is what says what the thing is *for*.
Three drawing decisions, all from rules this project already has:
- **Integer fills only.** Every facet is a scanline run, every part of the heart
  a stepped diamond. Nothing needs antialiasing to read and anything that did
  would turn to mush at this size.
- **The heart is white-hot, not amber.** The reference has a warm centre and it
  is the best thing in the picture, but amber is spoken for — *what glows amber
  can be hurt*. The Core is the one thing in the game that cannot be shot, so it
  runs white into cyan and stays out of that vocabulary entirely.
- **Not outlined.** Contrast is depth in a flat palette, so the far thing gets
  soft edges or it sits in the street instead of a mile behind it.
Two framing lessons worth keeping for every cutscene after this one:
- **A caption is a wall.** Five lines of pixel font went straight over the
  middle of the crystal. At 320×180 a shot carries about three lines before the
  text *is* the picture, so the Core is two shots now instead of one.
- **A tall sprite needs the camera aimed above the tile it stands on** — 168px
  of crystal above an anchor at its base means framing on its own tile puts the
  point off the top of the screen. The camera ends on a negative tile y, which
  is fine; cameras are not clamped to the map.
Also fixed the nested-diamond heart, which read as a logo printed on the front
of the glass — each ring is nudged off the one inside it now, so it reads as
light trapped behind a lot of stone.

### The Core belongs on the horizon
**Laurens:** *"Make the cutsceen accurate with core atlas, the core is far away
in the inner part of the city."*
**Claude:** Checked `design/city-blueprint.html` and he is right, in a way that
mattered. **The prologue street is in the Fringe — Ring 5, the outermost** — and
the atlas runs the whole journey bottom-to-centre along the M7, so the Core is
**five rings in**. The crystal was standing twelve tiles up the road filling the
frame, which quietly told the player they could walk to it before breakfast.
The entire game is the distance between those two points, so the opening shot is
exactly the one that has to establish it.
It is a **backdrop now, not a prop on a tile** — `drawFarCity` paints a band
behind the world and an area asks for it with `skyline: true`. Three depths: the
Core District palest at the back, the Grid's towers, then the Belt's stacks and
the Sprawl's blocks darkest and nearest. Contrast falls away with depth, which
in a flat palette is the only thing that makes distance read; nothing on the
band is more than three shades off the night behind it except the Core itself
and the lit shelf of server floors under it. The crystal is about forty pixels
tall there, which is what a high-rise looks like from the edge of a city.
Two lessons worth keeping for every backdrop after this:
- **Parallax at a tenth** — enough that it reads as being out there, little
  enough that it never slides out of a shot.
- **Anchored, never tiled.** The first version tiled the band and let the
  parallax decide where the Core landed, so the one thing the shot is about
  drifted off frame the moment the camera moved. Drawn once now and lined up so
  the crystal sits near screen centre — which is also what lets the push-in
  reach it, because the cutscene zoom scales about that point.
The beat is two shots: the horizon at rest, then a push to 1.85x that closes on
the Core without ever pretending it is near.

### "This looks cooked" — and why the Core is a plate now
**Laurens** (iPad screenshot): *"There is a problem in the cutsceen this looks
cooked, you know why."*
**Claude:** Yes, and the cause was mine. Half the frame was a flat wedge of
ground with speckles and a hard diagonal edge — the prologue map's default fill,
which I had written into the code as *"rubble default, never seen"* and then
pointed a camera straight at. Past that edge was the void where the tilemap
stops. His screen is much wider than the one I had been checking on, which is
why it was obvious to him and not to me; I now screenshot at his aspect ratio.
Three attempts to fix it by framing, each of which taught something:
1. **Build on every bare tile** — traded one problem for a worse one: a solid
   mass of roofs edge to edge with no sky left to put a horizon in.
2. **Keep the camera on the street** — fully dressed, and the Core invisible
   behind the frontage.
3. **Lift the camera over the roofs** — back to seeing the edge of the map.
The pattern under all three is a property of the projection and it is now
written into `design/prologue.md` §14, because it will come up again:
**everything north of the camera is drawn both higher up the screen AND taller,
so there is no sky from street level — and any camera lifted far enough to find
one is looking over the edge of the tilemap.**
So the Core does not get a view. **It gets a plate.** A beat can set
`plate: true` and the runner draws a picture instead of a place: the skyline
band, the crystal pinned to a fixed point, a deterministic star scatter, no
tiles and no camera. `plateScale` animates across the beat so the push-in
enlarges it without letting it wander. That is what an establishing shot of
something ten kilometres away actually is — and it means the Core shot can never
again be broken by something changing on the map.
The street beats after it are untouched and still play in the real world.
Verified end to end at 2000x1300 as well as 1280x720: the full prologue runs to
the naming prompt in 52s with no console errors.

### A man standing on the roof of a car
**Laurens** (circled it on the screenshot): *"Die person steht auf dem auto."*
**Claude:** He was at (21.5, 13.5) and the parked car is on tile (21, 13) — the
same tile. Moved him to (20.5, 14.5), out in the road crossing it, which is what
"late for something that is still going to happen" should look like anyway.
**The cause was a missing check, not a typo.** People are placed by hand in
`FOLK` and props are placed by hand in `map.js`, and **nothing compared the two
lists.** Candlelight's builder has refused to stack two things on one tile since
the day it was written; folk were the one kind of object exempt from that rule,
in every area. `buildFolk` now walks its own list against `solid`, warns with
the key and the tile so it shows up in the console during development, and
nudges the person to the nearest free spot so a missed one can never ship as a
man standing on a car roof. Verified: no one in the prologue cast is on a solid
tile, and no warnings fire.

### One person is caught
**Laurens:** *"Add one person beeing caugth and killed to the cutsceen."*
**Claude:** Added to the Correction beat, and the victim is **the patient the
medical unit had its hands on two beats earlier**. Nothing else available says
as much in as little time: it is not a soldier that turned, it is the thing that
was treating you.
Staged so it is never explicit. There is barely a chase — its hands were already
on them — they pull away, it closes, and it is **standing over them** when it
happens, its sprite nearer the camera so it covers the moment. One amber flash,
because amber is what damage looks like in this game, and `SFX.banditDie`, which
was written for people rather than machines. What is left when it walks on is a
shape on the pavement, and **it does not stay to look at it.**
Drawn as `civDown`, a slumped figure in the same 15x20 frame the standing people
use — so it is a **key swap** and no drawing code had to learn about it, the same
trick the Correction uses for the machines' light. It follows the idiom of
`Sprites.banditDead`, which already carries the note *"No glow — this one was a
person."*
Two bugs worth writing down:
- **The victim was moved twice a frame** — once by their own flight and again by
  the generic "everybody scatters" loop — so they ran at 4.6 tiles a second
  against the machine's 3.0 and **the gap grew**. Nobody was ever caught.
  Anything with its own movement has to be excluded from the crowd loop.
- **The moment was not framed.** It happened at the edge of a shot pointed at
  the street. At 320x180 an event you have to hunt for has not happened, so the
  beat frames the pair at 1.32x now and the body lands near the middle of it.
Verified: the catch fires at t~1.9, the body stays put while everyone else runs,
and the full prologue still reaches the naming prompt in 54s with no errors.

### A bug pass on the prologue
**Laurens:** *"Fix any bugges and push to main."*
**Claude:** Hunted rather than guessed — wrote probes for the paths most likely
to be broken and found three, all in code added the same day.
**1. Skipping the prologue could break the next one.** The Correction's
blue-to-amber swap was guarded by a one-shot flag living on the runner
(`Cine._turned`), cleared only in the beat's `exit` — and **a skip never runs
`exit`**. So skipping during that beat left the flag set and **on the next New
Game the machines never turned at all**. Proved it with a test before fixing it.
The fix is general rather than a patch: beat-scoped state belongs on the beat,
so the runner clears `b.once` on every entry and hands `tick` its own beat.
Every future one-shot inherits it.
**2. The prologue appeared on the traveller's world map.** It is a real area
with a `world` offset that collects fog like any other, so it earned a
thumbnail — a street from a year before the game, drawn at (40, 44), which is
exactly where St Martin's stands in the present. Areas can be marked
`memory: true` now, and a memory never gets a thumbnail: it cannot be drawn,
framed by the zoom floor, or counted as somewhere you have been.
**3. Its fog was written into every save** — same root cause, and dead data in
every save file forever. `collectFog` skips memories.
**Old saves are fixed too.** A save written before the change still carries
`fog.prologue`; verified it loads cleanly with the prologue still off the map,
because the guard is at the drawing end and not only at the writing end.
Checked and unaffected: all four areas load with the right cast and prop counts,
a returning player's CONTINUE goes straight into the world with the save intact,
the full prologue still reaches the naming prompt in 54s, and the only console
line anywhere is the pre-existing favicon 404.
Two non-bugs ruled out on the way: `saveGame` already refuses to write outside
`GameState === 'playing'`, so the prologue can never be saved as a position; and
the player's invulnerability during it does decay properly once the yard starts.

### A bugcheck across the whole game
**Laurens:** *"Run a bugcheck, any graphics overlapping that shouldn't or any
other bugs, and fix after, make a report at the end."*
**Claude:** Wrote four harnesses rather than eyeballing screenshots, because
"looks fine" is what let all of these ship in the first place.

**The occlusion test had to be rebuilt before it could be trusted.** The first
version measured sprite bounding boxes and duly reported that three survivors
in Candlelight were 100% hidden — behind a church column that is nine parts
transparent. Bounding boxes cannot see through anything. The test now renders
the frame, moves the subject off the map, renders again and counts the pixels
that changed; and it puts the camera on each subject first, so the question is
"when the traveller walks up to this, can they see it" and not "is it on screen
from where I happen to be standing". With that, every person, NPC and pickup in
all five areas is visible. The three Candlelight "bugs" were the tool.

**Three real defects, all the same shape: two hand-written lists that nothing
compares.**

1. **Six of the Fringe's eighteen rounds could never be picked up.** The ammo at
   150.5,130.5 sat inside a building footprint — a later edit closed a wall over
   a coordinate written before it. Moved to open street three tiles west, and
   `loadAreaItems` now warns and relocates anything spawned inside geometry, the
   same guard people already had.
2. **A lamp post standing inside a petrol-station canopy leg, and a second one a
   tile from another.** The root cause was not the pillars: the forecourt claim
   only ever moved *tiles*. Buildings honour that claim, but the street-furniture
   pass runs earlier and plants lamp posts on any pavement, and pavement inside
   the forecourt stays pavement. The forecourt now sweeps the street furniture
   out of itself before the station is built on it — two lamp posts removed,
   nothing else touched.
3. **A 404 on every single page load.** No favicon was declared, so the browser
   asked for one and the console carried an error that hid anything real behind
   it. The tab icon is now the Core: a lit crystal on a dark plate, inline, in
   both `index.html` and `arena.html`.

**Two flagged, looked at, and left alone.** The map's east boundary wall runs
through the building at 189,127 — swept every legal standing position around it
and the worst view differs by 199 pixels of 57,600, where the two structures
share a palette and read as one building. And the traffic light at 35,80 with a
signboard beside it is a street corner, not a collision.

**Everything else came back clean:** no entity or pickup inside geometry in any
area, no unreachable item, chest or person by flood fill from spawn, no stacked
props beyond the corner tiles that belong to two wall runs by design, the
prologue's eleven beats, area round trips, all five shop counters, v1 and v2
save migration, the out-of-bounds rescue (including a save pointing at the tile
that had swallowed the ammo), death and cross-area respawn, and twenty simulated
seconds in every area — with no thrown errors and, now, a clean console.

**One thing found and deliberately not fixed.** `currentObjective()` still says
"Reach the shelter" while the traveller is standing inside the shelter, because
that objective is completed by reading the altar's map table and not by arriving.
It is finding (a) of `design/questline.md`, which is still marked *awaiting
approval, nothing built* — so it stays a report line, not a commit.

### The map opens on the ring, and grows a column
**Laurens:** *"1. change the map, i want it so if you press m it shows the whole
map i have explored, for example when i'm in the Fringe also show the junkyard
map, in proportion of course, then you can click on an area to only show that
area. 2. Next to the map you can also see your current objective and add an
option to view all past objectives too, all with a short explanation. 3. Change
the icon for the yard gate and the description, right now i don't get the second
part."*

**1. `M` frames everything now.** The overhaul built the world view and then
opened the map framed on the area you were standing in, on the reasoning that it
should behave as it always had until you touched the wheel. That hid the whole
point of it behind a gesture nobody makes on a screen that had never rewarded
scrolling. It opens on the ring: every area walked, at true relative scale,
where they actually are. Click an area to frame it; click it again — or pull
back past three quarters of its fit — to return to the ring, gliding rather than
cutting, because a cut between two scales of one picture reads as two pictures.
One piece of arithmetic (`mapFit`) makes both frames, so they cannot disagree
about scale, and the clickable rectangle for an area IS the rectangle its ground
was drawn into. A pin always beats an area under the cursor: it is smaller and
harder to hit on purpose. With one area known the header names that area, since
"THE RING" is a lie on the first day.

**2. A column down the right, 112px of it.** The objective — title, which area,
and the detail line — is now on screen the whole time the map is open, instead
of being readable only by clicking the green dot, and only when that dot
happened to be in the area you were looking at. **`L` swaps it for the ledger**:
every step the run has reached, oldest first, green tick for done, a pulse for
the one you are on, each with a short line. The wheel scrolls the column and
still zooms everywhere else.

**What the column needed underneath it.** `currentObjective()` was a ladder of
ifs that could only ever answer *what now*. A ledger has to ask the same chain
backwards, so it is a table plus a rank now. **Nothing new is saved** — "done"
is `rank > mine`, and the rank only climbs, so the log cannot contradict itself
and no old save needs migrating. Each step carries a forward-looking `detail`
and a past-tense `log`. The Compactor is in the table as a **silent** step:
still never marked while you are on it, because a dot pointing at the ambush
gives it away, but present in the log once it is done — the ledger would be
lying by omission without the biggest thing that happened in the yard. And a
finished step drops its live counter, which was reading *"loot scrap 0/5"*
beside a tick, counting scrap that had long since been spent.

**3. The yard gate.** The icon was a blue arch, and both things were wrong. An
arch reads as a doorway, which is the one thing a chain-link gate you unlock is
not — and **blue is WARDEN**, the Core's own colour, spent here on the least
important pin on the map. Grey steel now: two posts and a barred leaf, so the
only colours left on the map are amber for a camp and green for the objective.
The description Laurens could not parse was *"It was chained shut for a reason"*
— a riddle with no answer anywhere in the game. Both gate blurbs say plainly
what is on the other side and what it costs now.

**Two bugs it uncovered.** The world HUD had been running underneath the map all
along — invisible only because the map's title sat at the centre of the screen,
and printing straight through that title the moment the map moved left. And a
fast click on the map did nothing at all: clicks were found by polling
`mouseDown` across frames, so a press and release that both landed between two
frames — a trackpad tap, or one slow frame — never opened a drag and the release
branch had nothing to close.

Verified through the real input path, not by calling the functions: M opens the
ring, L opens the ledger, the wheel scrolls it over the column and zooms over
the map, the header click closes it, clicking the junkyard frames it at 4.0
px/tile and clicking it again returns to 0.77, M closes. Every objective state
screenshotted from a fresh run to the silence after the map table. The bugcheck
suite and the systems pass both still come back clean with no console output.

### The junkyard was not on the map, and had never been
**Laurens:** *"It still doesn't show the junkyard on the map."*
**Claude:** He was right, and the cause was older than yesterday's change.

A map thumbnail is a picture of an area's TILE ARRAYS, and only one area's tile
arrays exist at a time — so thumbnails were only ever taken on the way *out* of
an area, in `stashArea()`. That works inside a session and is useless across
one: `mapThumbs` lives in memory and a save has never carried it. **So a
returning player's world map had the area they loaded into and nothing else,
however far they had walked.** Reproduced it exactly: walk both areas, save,
reload the page, continue — fog `junkyard=121 fringe=1113`, thumbnails `(none)`,
and one area drawn.

The world view has been broken across a page load since the day it was built.
It only became visible when `M` started opening on the whole ring instead of on
the area you were standing in, which is why it read as a new bug.

**Every area the save has fog for is now built once at load, its fog unpacked
at its own size, photographed, and thrown away again**; the area the save is
actually in is rebuilt afterwards, so the live arrays end up right. Verified the
swept thumbnails are pixel-identical to ones taken from the live area — the
builds are deterministic — and the whole of `applySave` costs 85ms with the
sweep in it, once, behind the title screen.

Unpacking the fog there fixed a second thing on the way. It used to be decoded
with `id === currentArea ? MAP_W : (id === 'fringe' ? FRINGE_W : 32)` — a table
of two areas and a default, which would have silently decoded the next 64×64
area's fog at 32×32. Each area is built before its own fog is read now.

**And a leak the fix walked into.** `wipeSave()` cleared the ledger and the
rifle's parts but not the fog or the thumbnails, so wiping the run and starting
over *without reloading the page* handed the new traveller the old one's
explored ground — in the world and on the map both. Fog of war is the one thing
in this game that is only ever about what THIS run has seen. Both are cleared
now, and `explored` is re-pointed, because deleting the key does not move what
the live pointer was aimed at.

Verified the way Laurens actually hits it: play the yard, the Fringe and the
camp, save, **reload the page**, `[E] continue` from the title, press `M` — the
Fringe and the junkyard are both there, in proportion. Migration of v1 and v2
saves, area round trips and the systems pass all still come back clean.

### The title screen shows where you logged out
**Laurens** (screenshot of the title screen over the junkyard): *"This is the
screen when reentering the game, it shows the junkyard at the start, make it so
it shows where you logged out."*

The title renders the live world behind its wash, and the live world at boot is
whatever `buildJunkyard()` left standing there — so a run twelve hours deep into
the Fringe was welcomed back by a picture of the tutorial yard, the one place
the traveller had most certainly moved on from.

**The save is not applied at the title, and must not be** — pressing `[N]`
instead has to start a run that owes the old one nothing. So `previewSaveArea()`
stands the CAMERA where the save left off and no more: it builds that area,
unpacks its fog, restores what the area remembers, puts the people back in it
and stands the traveller where they logged out. No inventory, no mission, no
machines. Everything it touches is either loaded properly by `[E]` or cleared by
`[N]`. Unpacking the fog there also fills in the world map's thumbnails before
the player has pressed anything.

**And then the thing underneath it.** Making the player state visible at the
title meant asking what `[N] NEW GAME` actually resets — and the answer was
almost nothing. `wipeSave()` cleared the milestone ledger and the rifle's parts;
that was the whole of it, because a page load had always cleared the rest for
free and nobody had started over *without* one. Measured it: wipe a run carrying
a rifle, 88 scrap, 30 rounds, a dead Compactor and a read map table, and the new
run began with **every one of them**. A new game that starts with the first
quest finished is not a new game.

`resetRun()` pours the player back from `PLAYER_DEFAULTS` — captured in
`js/entities.js` from the literal itself, so adding a field to the player cannot
leave a hole in the reset — and clears the run's other globals: the mission, the
boss, the map table, the kill and pity counters, the tutorials, every area's
remembered state, the fog and the map's thumbnails.

**One last leak, found by testing the whole flow through the real UI.** After
the wipe, walking into the prologue photographed the area being left on the way
out — blank fog and all — so the new run's world map had an empty rectangle
labelled THE FRINGE on it. A thumbnail existing is what makes the map draw an
area, frame it and name it, and the map's one promise is that it shows nowhere
you have not been. `buildMapThumb` refuses an area with nothing explored now,
which is the rule in one place rather than a check at each call site.

Verified end to end: log out in the Fringe, in Candlelight and in the junkyard —
each one is the backdrop on return, with the camp's seven survivors behind the
title where that is where you left. `[E]` continues into the right area with the
run intact; `[N]` → confirm → prologue starts with nothing owned, no scrap, no
boss down, no fog, no thumbnails, no name, and the save gone from storage. The
bugcheck, the systems pass and the map input suite all still come back clean.

### Lamp posts standing behind buildings
**Laurens** (screenshot of a bare pole beside a block): *"There are still lanterns
in buildings."*

He was right, and it was not a placement mistake — it was a projection one.
Screen-right-down is world +x and screen-left-down is world +y, so **depth is
x + y**: every block of buildings has pavement along its up-screen faces that
the camera cannot see into at all. `freeSpot` was happily planting lamp posts
down it, because a pavement tile is a pavement tile. A three-storey facade then
swallowed the post whole and left the tip poking out through the roof.

Measured rather than eyeballed: stand the camera on each of the Fringe's 49 lamp
posts in turn, render, move the lamp off the map, render again, and count the
pixels that changed. **Eleven were more than half gone and one showed a single
pixel.** Two more showed 61% — those were the ones with their heads taken off,
which is the version in Laurens's screenshot.

**Three rules, in the order they were needed, each one wrong until it was
measured.**

1. *A wedge of tiles straight in front.* Killed the eleven badly buried ones.
   36 lamps left, worst 61%.
2. *A half-plane out to six tiles.* Every survivor perfect — and the Fringe went
   from 36 lamp posts to 14, from 5 hydrants to 1, and lost two boards off the
   trail west. A cure worse than the disease.
3. **A block is a wide diamond on screen, not a tile.** The building that took
   the heads off had its near corner at (+4, −2): two steps deeper, drawn later,
   and wide enough to reach back across the lamp from over there. No tile test
   can express that. So compare against the block's own rectangle in the two
   axes the projection actually has — depth (x + y) and screen-across (x − y) —
   and ask whether its near corner is within a facade's height in front and its
   span reaches across. **34 lamps, worst 99%, nothing under 70%.**

**Signs are not lamps.** Two boards on the trail west were in the same shadow,
one drawing exactly zero pixels while still putting a pin on the map — the map
promising a waypoint that is not there. A lamp in that spot can be dropped; a
waypoint on the only marked route west cannot, so a board steps ACROSS the road
instead, perpendicular to the way it points, and takes the nearest tile that is
both free pavement and actually in view. The first attempt searched only
perpendicular and dropped "KEEP TO THIS ROAD", leaving a forty-tile gap in the
trail — worse than the bug. It searches both axes now, preferring to cross the
road over sliding along it. All fourteen boards stand, all fourteen visible, the
order of the trail unchanged.

**Two things ruled out on the way.** The grey stubs poking through a roof beside
the buried lamp are the buildings' own chimneys, drawn by `drawRoof` — not
props, and not a bug. And no lamp is "floating" (base hidden, head showing),
which would read as one bolted to a wall: checked separately, none.

The bugcheck and systems suites still come back clean, with no console output.

### One gate, one pin, on the seam
**Laurens:** *"On the map, the junkyard gate is there twice, just make it like
one connection in the right spot."*

There were two `THE YARD GATE` pins, one anchored in each area — and neither was
in the right place. A door is a single thing that two areas share, but each side
had been given its own entry, so the world map drew them on opposite **outer**
edges with both districts in between: the yard's pin at world x 236, its far
side, pointing away from the Fringe it opens onto.

One pin now, anchored on the Fringe at the gate tile, with a blurb that names
both sides instead of reading as a one-way trip. And the junkyard's world offset
moved from x 206 to 203, so the yard sits three tiles off the Fringe's east edge
and the pin lands in the gap between the two thumbnails: the Fringe ends at
screen x 169, the yard starts at 170, and the gate is at 166. It reads as the
door it is. Framed on the yard it is still on screen, just outside the yard's
own rectangle — which is exactly where the gate is.

(The y offset was already right and stays: 106 puts the yard's gate row at world
118 against the Fringe's 120.)

Verified with the map open at ring scale and framed on the junkyard, the pin
clicked to read its blurb, and the systems and map-input suites clean.

### The you-are-here marker, and the text that would not sit still
**Laurens:** *"Change the you are here icon, the character standing there looks
out of place."* — and mid-way: *"So also the you are there text interferes with
other things so change that too while you're at it."*

**The marker.** The map drew the traveller's actual sprite once the zoom passed
1 — a seventeen-pixel person standing on a flat plan of roads and rooftops, at a
scale nothing else on the map was drawn at, and morphing into a 3px dot the
moment you pulled back. A marker that changes what it IS with the zoom is two
markers. It is one symbol at every zoom now: `Sprites.icoYou`, the iso tile you
are standing on, outlined like every other pin and the same size as them, in
white — the colour that has always meant "you" on the minimap and that nothing
else on either map is allowed to use. A slow ping goes out from it, drawn a
pixel at a time as a 2:1 diamond, because `ctx.arc` would put grey fringes on a
game made of pixels.

**The text.** "YOU ARE HERE" was printed under the marker wherever the marker
happened to be, so it laid itself across roads, over an area's own name, and
through whatever else was on that spot. Text pinned to a moving point has
nowhere safe to go. It is gone — and the district labels do the job instead, by
drawing **the area you are standing in in white**. That names every district and
answers "where am I" with one thing rather than two, and it cannot collide with
the marker because it sits above its own area. The label is skipped while you
have clicked into an area, where the header above already names it.

**Two smaller collisions fixed with it.** A district whose rectangle was mostly
off-frame used to clamp its name to the edge of the view and write it across
whatever district WAS on screen — "THE JUNKYARD" over the middle of the Fringe.
Names are centred on the part of their own area you can actually see now, and an
area with almost none of it in frame does not get to write on top of one that
is. And because a name can be wider than its district — THE JUNKYARD is fifty
pixels of text on a twenty-six pixel square — every label sits on a dark plate,
so it reads as a label on the map rather than as marks in the ground.

Checked at ring scale, framed on an area, and zoomed close; the systems, map
input and bugcheck suites all clean.

### Kill the hunter and the hunt is over
**Laurens:** *"Make sure that the while hunted status ends if you kill the
opponent that is hunting you."*

It did not, and the reason is that `memory` — the seconds an enemy keeps coming
after losing sight of you — **is only ever counted down inside the chase state.**
Anything left holding a number outside a chase held it forever.

`spawnScrapper()` cleared `alert` and left `memory` alone. So a Scrapper killed
mid-chase came back twenty seconds later on patrol, having seen nothing, with 12
seconds of memory that nothing would ever decrement — and `beingHunted()` went
on answering yes for the rest of the run. Measured it: thirty seconds after the
kill, `state=patrol  mem=12.0  alert=0.00`, and the map still refusing to
travel. Killing the thing hunting you was not enough, because what came back was
not hunting you either and still counted.

Fixed at the root and then guarded: `killScrapper`, `killBandit` and a wiped
droid squad all clear `alert` and `memory` now, `spawnScrapper` clears them
too, and `beingHunted()` asks only the living.

**Two more things the test found.**

- **The droid squads were not in `beingHunted` at all.** A squad chasing you
  down the ring road was no reason you could not vanish off the map. They hunt
  as one and share a single memory, so a squad counts for as long as any of it
  is standing — and stops the moment the last of it is down.
- **You could not select Candlelight to travel to it while it was your
  objective.** The green dot for "Reach the shelter" sits eight tiles from the
  camp's own pin, inside the click radius once you pull back, and the objective
  used to win the click outright. It competes on distance now, so the nearer of
  the two is what you select.

And one drawn where it should not be: the objective dot and the you-marker had
no bounds test, so panning your own district off the edge of the map painted
them over the objective column beside it. The pins were already culled; those
two are now too.

Verified through the line the player actually reads: chased → **NOT WHILE
HUNTED**; both machines killed → **[E] TRAVEL** at once; twenty-five seconds
later with the pair respawned → still **[E] TRAVEL**. Also that breaking off and
escaping ends it after the memory runs out, and that walking into another area
ends it. Bugcheck, systems and map-input suites clean.

### One suspicion meter, drawn once
**Laurens:** *"Change the vision bar to see if the enemies are watching you to
the one the Scrappers have with the eye — the squads have different ones."*

They did, and the comment above the droids' version said *"same language as the
Scrapper's"* over something that was not: a bare bar with **no eye on it**, two
pixels narrower, in a different white (`#efe6d2` against `#e8eef5`), on a
smaller plate, and with no dark track behind the fill — so the machines that
hunt you in packs, the ones it matters most to read, were the ones whose meter
you had to learn separately.

The Scrapper and the raider already drew the same meter, as two verbatim copies
of each other. Three copies of a rule is exactly how the third one drifts, so
there is one now: `drawSuspicion(cx, ay, alert)` in `js/game.js` — the eye, its
pupil, the track, and the fill that turns red past 0.7 — and the Scrapper, the
raider and every droid call it.

Measured rather than eyeballed: render each one with the meter drawn and with
`drawSuspicion` stubbed out, and diff. All three come back **24×5 pixels, 120 of
them** — the same badge, pixel for pixel. (Two things had to be pinned first to
get a clean read: the live render loop, which was landing a normal frame between
the two captures, and `performance.now()`, because the Bailiff's lamp pulses in
the same screen column as its badge.)

Bugcheck, systems and hunted suites all still clean.

### Brainstorming the next expansion — Field 12
**Laurens:** *"Start brainstorming the next map expansion, the next area, the
vibe, buildings, quests, NPCs, upgrades, all of that in detail."*

**There was already a plan for which area is next** — `design/the-road-north.md`,
written 2026-08-22 and still unbuilt: Q2 at Candlelight, the north frontier,
Field 12, the Underpass, then Ring 4. That still stands and this does not
replace it. What it never had is the layer underneath: what the place feels
like, what is inside the buildings, who the people are, what you do there.
`design/field-twelve.md` is that, and it covers N1–N4 only — Ring 4 is a
separate project and is not costed.

**The pitch in one line: Ring 5 has been a game about corridors, and Field 12 is
the game's first sky.** Everything built so far — the yard, the church corridor,
the streets — is a space with something standing between you and what is hunting
you, and the occlusion system, the crouch and the whole stealth loop assume
walls. An airfield has none. That is the reason to build it and the reason it is
the riskiest thing on the board. It is not *deeper* than the Fringe — depth is
Ring 4's job — it is **wider and colder**: the same ring seen from the one place
in it with a horizon.

**The vibe.** Cold grey-blue tint, the first cold tint in the game, quietly
foreshadowing the Core two rings early. Pre-dawn. Concrete instead of brick,
grass through the cracks. The ambient drone **drops out** — every other area has
a machine hum under it, and its absence says the machines here are visiting
rather than resident. Three lights only: the tower beacon sweeping an empty
runway for aircraft that stopped coming a year ago, the recovery detail's work
lamps in the middle of all that dark, and hazard strobes on the fuel bowsers.

**Two ideas I would defend hardest:**
- **The loop is the quest marker.** The broadcast Q2 finds on the church radio
  is audible in the world, from the wreck's dead transmitter, and gets louder as
  you approach. A WebAudio gain on a positional source — the system exists — and
  the objective becomes diegetic.
- **The beacon sweep raises detection.** A light crossing you in the open pushes
  the meter; crouching halves it; cover is nothing at all. It gives Ring 5 the
  surveillance pressure it is not allowed to have as cameras (those are Ring
  2's), gives open ground a rhythm instead of a flat risk, and gives the player
  something to read and time. And S2 lets you switch it off for good.

**Buildings**, each with a reason to enter: Hangar 1 is the nest and **pays
nothing** — one deliberate disappointment per area teaches that the world is not
a checklist. Hangar 2 is the store and has someone's abandoned bedroll in it.
The **control tower** is its own indoor area, the crypt trick again, and its cab
is where the player stands higher than they have since the prologue and sees
**the Core** — `skyline: true` and `Sprites.cityFar` already exist and only the
prologue uses them. Silent when it happens. No line, no bubble.

**The new enemy: the rust drone**, the Flyer role `GAME_PLAN.md` has listed since
day one and never built. Circle → mark → swoop → recover, with the mark drawn as
a laser dot tracking to your feet (the rifle's laser box already draws exactly
that) and the rotor housing glowing amber on recovery — what glows amber can be
hurt, applied to something in the air. **The threat is not damage, it is that it
ignores your habits**: a whole ring spent learning to break line of sight, and a
drone does not care about the heap you are behind. It gets its own build phase,
because altitude, no ground collision, melee reach and the cover tests that
assume feet on a tile are all real work.

**The people.** The Lamp gets **Wren** — young, fast, the only person alive who
has been inside Field 12 and out, who sells the last rifle rounds before Ring 4
and knows about the tower's fire stair — and **Oz**, who keeps the fire, will
not go past the fence, and has been hearing the loop for a year and stopped
hearing it: *"It's a year old. Everything's a year old."* And **Field 12 itself
has no living people**, which is the point: one dead man in a shed, three tapes,
and a squad doing a job.

**Quests.** Q2 ends with a *bearing, not a marker* — Ivar says which direction
the loop comes from, the player has already seen the control tower on the
skyline, and those two facts meet in the player's head rather than in a quest
log. Q3 is the runway, the recovery detail and the slate, and it is **not
required to be a fight**. Three side quests: fetch Wren's pack (teaches the
hangars), the dead man's three tapes (whose reward is the beacon breaker — an
optional collectible that changes how the area plays), and Oz's windbreak, which
is `GAME_PLAN.md`'s "survivors improve the camp" in its smallest possible form:
one kill, one prop swap, one visible change, proven here before Station 9 needs
the full version.

**Two roads north**, and this is the structural idea worth arguing about. Both
already exist on the map: up the spine you meet the Lamp first and Wren briefs
you, then you enter by the quiet west breach — the *prepared* run. Up the mid
street you arrive at the vehicle gate dead ahead of the wreck with nothing told
to you — the *cold* run. Both complete, neither wrong, the world never comments.
It costs nothing because both entrances were already planned.

**Upgrades:** the gun-camera optic (tower) and the recoil-braced stock (off the
Magistrate, via S3) — **alternatives, not additions**, since both slots already
hold a part, so the bench stays a set of choices. Both go in `MILESTONE_GRANTS`.
No armour: armour is Ring 4's and that stays decided.

Eight open questions at the end, the sharpest being whether the rust drone
should preview over the Fringe first so Field 12 is one new thing and not two.
*(My lean: yes.)*

### The box, and two ways out of it
**Laurens:** *"It's too early to tease the Core with ambiance. Also the Fringe
is currently a box and not a ring — maybe we need to reimagine the way the map
is built. Open atlas for me and add a second idea: we can make the Fringe
larger, make a second map, that doesn't have huge parts where we will never go
/ build."*

**The atlas:** https://claude.ai/code/artifact/e5127405-9a8f-4c59-a807-0dd9c58b2927

**The Core tease is cut**, and it was two mistakes at once. The tower cab's
window onto the Core is gone from `design/field-twelve.md`, and so is the cold
blue-grey tint that was there to "foreshadow the Core two rings early" — the
same mistake with the volume down. He is right twice over: the Core has been
seen once, in the prologue, as a thing from a year ago, and the next time should
be earned; and a Core you can see from a Ring-5 airfield is not five rings away,
which is the distance the whole atlas is built on. Field 12 is still colder than
the Fringe, but because concrete at dawn is colder than brick at dusk and for no
other reason. Bleached grey, not blue. The tower keeps its climb, its beacon,
its breaker and the optic; it loses the view.

**Then I measured the box rather than agreeing with it**, and the numbers are
worse than the complaint. The Fringe is 30,000 tiles. 21,437 are walkable. Only
**33% is within five tiles of any prop**, only **12.9% is within fourteen tiles
of the critical path**, and **everything the game ever sends you to fits in 32%
of the map** — x 35–197, y 60–120. The whole northern half and the far west
contain nothing anyone is ever sent to or would miss. Thirty thousand tiles
carrying about three thousand nine hundred tiles of game.

**Why it reads as a box**, in order of how cheap each is to fix: three of its
four edges are invisible and the atlas already says what belongs on them (the
Ashfield fire, the Grey Run floodplain, the Cordon, the viaduct — none built);
the density is uniform, so no part feels closer to anything; the street grid has
no *inward*, because the M7 that is the radial road on the atlas is just another
street here; and the emptiness **is** the box, because undressed ground has no
shape to feel instead.

**Two ideas, in `design/map-shape.md`.**

**A — grow the Fringe into an arc.** Finish the edges, curve the circumferential
streets (a tile of offset every twelve is enough, and it stays a staircase of
straight runs so the angle rule is untouched), make the spine an eight-lane M7
so the world has an inward, density falloff toward the centre, and put Field 12
in the north band. Honest verdict: **it fixes "box" and makes "dead space"
worse** — after rewriting the street table and re-proving the church corridor's
flood fill, it is 3,900 tiles of game in 38,000.

**B — right-sized districts joined at seams**, which is what he described, and
what I would build. Three parts. **Stop growing the Fringe and finish it — with
fire:** the blockers are not edge decoration, they can be brought *inward*, so
the Ashfield's smoke ceiling eats the empty western strip and the Grey Run takes
the south-west corner. Nothing built is touched, no save breaks, and the
walkable Fringe drops from 21,437 tiles to around 12,000 with nearly all of it
near something. Then the rule for everything after: **do not build a rectangle
and then look for things to put in it — pick a real place with a real boundary
and build all of it.** And the proof: **an airfield is a fence around exactly
the content you build**, so Field 12 becomes its own ~90×70 area rather than a
band bolted onto a map that already has 26,000 tiles of nothing.

**Recommendation: B, plus the cheap half of A.** Finish and shrink the Fringe's
edges, widen the spine into the M7 so there is an inward, build Field 12 in its
own fence. The curved streets and density falloff go on the shelf for **Ring 4**,
which is not built and can be drawn that way from the first line — far cheaper
than re-cutting a live map to prove it.

Five open questions, the sharpest being whether taking ~9,000 walkable tiles of
bare ground away behind fire and water is acceptable. *(My lean: do it — the map
gets smaller and the world gets bigger.)*

### A plan to finish the Fringe
**Laurens:** *"Ok make a detailed plan to finish the Fringe."*

`design/finish-the-fringe.md` — idea B1 from `design/map-shape.md`, costed and
drawn on real coordinates. It adds **no new walkable ground and no new content**;
it gives the map the four edges it has never had and brings them inward to where
the content actually stops.

**The fact that settles what kind of problem this is:** solid tiles on the outer
ring — **north 0, south 0, west 0, east 0.** The Fringe has no edges at all.
Every boundary is the arithmetic check in `canStand`. You do not walk up to
anything; you walk until the game stops letting you.

**Every cut was checked against everything the game needs** — POIs, signs, items,
chests, the workbench, the map table, raiders, droids, the area exits and the
player's entry — before a line was written:

| edge | region | tiles | walkable | props | verdict |
|---|---|---|---|---|---|
| North — **the viaduct** | y 0–21 | 4,400 | 3,157 | 24 | clear |
| South — **the Grey Run** | y 140–149 | 2,000 | 1,800 | 0 | clear |
| West — **the Ashfield** | x 0–19 | 3,000 | 2,180 | 10 | clear |
| East — **the city limit** | x 190–199 except the gate | 1,170 | 992 | 0 | clear |

All four came back `NOTHING — clear to cut`. **Walkable 21,437 → ~13,912**, and
the share of walkable ground within five tiles of something goes **46.3% →
58.5%**.

**Where the pass goes matters more than what it draws.** Inserted after the
street network and before the city blocks, every later pass avoids the dead
zones for free: `placeBuilding` already refuses solid tiles, so the block filler
stops generating the 34 props and their buildings, and `placeProp`'s `freeSpot`
already requires pavement. **The map gets cheaper, not more expensive** — 312
props down to ~278.

**The M7 gets dressed, not widened.** Re-cutting a 106-tile street's frontage is
the expensive half of idea A and buys less than the cheap version: three sign
gantries over the spine, motorway-blue boards reading **`M7 (N) — CITY CENTRE`**
with an arrow and, hand-painted over the top by somebody, **`DON'T`**. Crash
barriers instead of kerbs, motorway lane dashes. A blue sign naming the
destination is a stronger *inward* than eight lanes of tarmac, and it costs four
props and a decal.

**Six phases, each lookable-at**, and F1 — the cut in placeholder grey, no art at
all — is worth shipping on its own: it carries all the risk, and everything after
it is art on top of a proven cut. F3/F5/F6 stay local-first per CLAUDE.md.

**A migration bug this exposed.** A live save can be standing inside what is
about to become fire. `applySave` rescues an out-of-bounds player — but
`findSafeSpot` searches a radius of **8 tiles** and then gives up, and the
fallback is the map's centre, which happens to be on the east cross and happens
to work. **It works by luck, and luck is not a migration.** Two small fixes: walk
the search outward to 64, and give each area an explicit `safeSpawn` instead of
guessing at `MAP_W / 2`.

Five open questions, the first being whether losing 7,525 walkable tiles of bare
ground is acceptable at all. *(My lean: yes.)* The second is whether to cut the
underpass mouth in the viaduct now as the future seam — *(my lean: yes; a tunnel
you cannot enter yet is a promise, a wall you later knock a hole in is a
demolition.)*

### The expansion, specified to the tile
**Laurens:** *"Make the expansion plan in extreme detail now."* — then: *"Output
the detailed plan."*

`design/expansion-build-spec.md`. Four documents now stack and none replaces
another: `the-road-north.md` picks **which** area, `field-twelve.md` says what it
**feels like**, `map-shape.md` says how the world is **put together**, and this
one is **exactly what to type**.

**The structural idea got better under the districts model.** The brainstorm's
"two roads north" becomes a **loop of three areas**: the Fringe's viaduct gets
*two* holes — the spine at x 26–34 and the mid street at x 88–96 — leading to
**the Underpass** (20×36, with the Lamp in a service bay) and **Field 12**
(96×72), and Field 12's west breach opens into the Underpass's bay. Go up the
spine and Wren briefs you before you enter by the quiet end; go up the mid street
and you arrive cold with the wreck dead ahead. Leave by the other end and find
what you missed. Both halves already had to exist, so the loop costs nothing.

Written to be typed from, not interpreted: the three `Areas` entries with world
offsets and the arithmetic that derives them; the fence runs as `wallRun` calls;
every structure with an (x, y, w, h); three new ground ids; a ~390-line prop
census; the rust drone's four states with real numbers and **the four engine
touchpoints it needs** (altitude, no ground collision, melee reach limited to
`recover`, and the cover/ghost passes that assume feet on a tile); the beacon
sweep's arc, range, per-second detection contribution and its cap below alert
1.0; `FOLK.lamp` and `STOCK.wren` in the existing shape with Wren's and Oz's
lines verbatim; the quest state machine with save fields and the new
`OBJECTIVES` rows; both `PARTS` entries with real stats and their
`MILESTONE_GRANTS`; the full new-art list; nine build phases each with its own
verification; and a frame budget that says to measure at the wreck with four
drones up rather than in the quiet.

**E0 goes first and is thrown away**: twenty tiles of sheared runway paint on the
existing Fringe, looked at, then deleted. Ninety tiles of centreline is the
largest sheared surface ever attempted here and flat rectangles on an iso floor
is this project's most repeated bug.

**E1–E3 is a shippable milestone on its own** — an empty, walkable, fenced
airfield with no enemies and no quest is already a place, and it is the right
thing to look at before committing to the drone, the beacon and the quests.

Eight open questions. The sharpest is whether the rust drones should preview over
the Fringe's north end first so Field 12 is one new thing and not two. *(My lean:
yes.)*

---

## "Ok build the fringe map expansion"

Built `design/finish-the-fringe.md` — all six phases, locally, nothing pushed.

**F1/F2 (the cut and the east wall).** Ash `x ≤ 19`, water `y ≥ 140`, deck
`y ≤ 29` all set solid and heavy with three new ground types; the junkyard's
boundary wall extended from 32 tiles to the full height of the map with the gate
still in it, and the one-tile corridor outside it sealed. Outer ring solid went
from 0/0/0/0 to 200/200 · 200/200 · 150/150 · 150/150.

**F3 (the viaduct).** The north edge shipped as invisible collision at first —
"honest grey walls" turned out to draw nothing at all. Deck volumes fixed that,
but `kind: 'B'` rendered them as brick offices with windows, which reads as more
city rather than as an edge. New `BUILD_STYLE.V`: blank concrete faces with
shutter joints and base grime, and a **carriageway** on the roof instead of a
felt-and-aircon flat roof — lane paint, edge lines, a central reservation, ruts,
spalling, a crack walking the length, burnt-out cars and rebar bristling off the
broken parapets. Both underpass mouths open, walkable and dead-ending.

**F4 (the M7).** Three gantries over the spine, drawn flat and put through one
`sheared(+1)` — which is what puts the beam and the board on the iso diagonal
while leaving the legs upright. Each carries `M7 (N) / CITY CENTRE` with an
arrow, and **`DON'T`** sprayed across it in red on a slant, with runs. Three
iterations: the first board hung *below head height*, the second had `DON'T`
sitting level and deleting the destination, the third leans it so you can still
read what is being argued with. The spine's paint is motorway paint now — 16px
marks at 5-tile spacing. **Crash barriers along the spine were not built**: ~200
props for something the gantries already say.

**F5 (the Grey Run).** Silt-and-reed tidemark along the last dry ground, 26
drowned cars sitting window-deep, sheen bands sliding along the water and
per-point glints. The first waterline across each car was a horizontal
`fillRect` — the same bug as a rectangle of road paint. It is the car's own
footprint diamond now.

**F6 (the Ashfield).** Burning ground beyond the west edge, a smoke ceiling over
the western strip, real lights spaced along the fire line so the glow lands on
the ground you are standing on, and ash falling east as it drops (the opposite
way to the dust, so the two never read as one effect). All of it anchored in the
world, not pinned to the screen, and all of it scaled by how close you are — off
entirely by x 66.

**The bug this build made and caught.** The Grey Run's dressing first drew from
`rng` in the middle of `buildFringe`, which re-rolled every pass after it: 354
walkable tiles moved and **St Martin's ended up inside a block**. The Fringe is
generated fresh on every load, so that is a different city for an existing save.
New dressing runs last, on its own seed.

**Saves.** `findSafeSpot` searched 8 tiles and gave up; the Ashfield is twenty
columns deep, so a run saved at x 5 fell through to a hardcoded map centre. It
reaches 44 now and every area names a `safeSpawn`. Five rescue cases that all
returned `null` before now land on real ground.

**Measured, not estimated.** Walkable 21,437 → 14,423. Props 312 → **399**, not
the ~278 the plan predicted — the east wall alone adds ~105 slices. Frame cost
**unchanged within noise**, not cheaper: 14.72/15.54/14.53/13.44/12.99 ms before
against 14.83/14.04/14.00/14.71/13.33 after, the one real cost being ~1.3 ms
beside the fire. Church corridor still gates 0/24. `audit2`, `smoke`, `hunted`,
`live`, `verifycut` and `cost` all green, no console errors.

Also renumbered Field 12's ground ids in `design/expansion-build-spec.md` from
12/13/14 to **15/16/17** — the edge pass took those three.

**Not pushed.** Big art change: local-first until Laurens has seen it.

---

## "the road has the same color · i cant go farther as one bit · make the ash field irregular, walkable, burning"

Played on the live site and sent a screenshot. Three complaints, one cause: the
Ashfield was a dead-straight solid column at x 19, so it read as more dark
ground and it stopped you without teaching you anything.

- **The front wanders now** — three sine waves on its own `mulberry32(7717)`,
  x 11–22, clamped off the spine's pavement. Bays and headlands instead of a
  ruled line.
- **You can walk into it.** Six tiles of margin; the heart is still solid, which
  is what bounds the map. Measured 100 HP → 0 in **7.7 s**. The burn does not go
  through `hurtPlayer()` — that knocks you back and grants i-frames, and being
  shoved by the ground while trying to escape it is the wrong feel.
- **Three bands, so it warns you**: grey road → new `scorch` ground (id 15) →
  coals. The ash tile was re-cut as black crust broken open by orange. First
  attempt was too dense and read as lava — the traveller vanished into it while
  it was killing him — so it was pulled back to embers on black, and the
  screen-space glow now peaks at the front and backs off once you are inside it.
- **It caught a bug**: the margin is not solid, and `placeBuilding` only refused
  *solid* tiles, so two office blocks generated inside the fire (plus 15 weeds).
  Both passes test `burning` now.

On "I can't go farther as one bit": part of that was my own probe walking due
west into a parked car. But it is honest that west of the spine is a thin strip
— 6 to 15 tiles by row, city blocks on some of them. §3 cut that ground on
purpose. The fire makes it interesting, not bigger.

Walkable 14,423 → 15,167 (+744, all lethal). Props unchanged at 399. Ring still
solid on all four sides. All suites green. Field 12's ground ids moved again,
15/16/17 → 16/17/18, since 15 is scorch.

---

## "add some burnt things there, also expand the map so i can walk further than the broken up road"

Turned the west strip into a district.

- **The fire pulled back** from x 11–22 to **x 2–8**, which is what made room.
- **A west lane** at x 15 running the height of the map, with two links onto the
  M7 at y 52 and y 104 so you can get onto it properly.
- **Gutted shells** — new `BUILD_STYLE.X`: soot render, window openings with
  nothing behind them and soot smeared up the wall above each, roof caved in.
  Every building entirely west of the motorway's kerb is retagged to it, and
  shallow terraces fill the four-tile strip the generic filler could not use.
- **Burnt things**: burnt-out cars, snapped stumps, debris heaps, leaning poles,
  tipped barrels.

Walking west from the spine: **10 tiles → 26–28**. Walkable 15,167 → 16,012.
Props 399 → 475. Frame cost unchanged.

**It did not re-roll the map**, and the reason is worth keeping: both block
fillers draw their rng *before* testing whether a candidate fits, so opening
ground changes which candidates succeed, never which numbers come out. The lane
is kept out of `STREETS` (the lining and dressing loops walk that) and dressed
last on its own seed.

Two sprites were wrong first time: the stumps were straight trunks with
symmetrical stubs, which is a cactus, and the "burnt" cars still had bright
headlamps, which reads as a parked car no matter how dark the paint.

And it created a save bug that got caught: the fire's margin is walkable, so it
passes `canStand`, and `findSafeSpot` would have rescued a save **onto burning
ground**. It skips burning tiles now — standable is not the same as safe.

---

## "check that props and buildings dont collide and i still cant go further under the broken bridge"

Both were the same bug: something stopping you that is not drawn.

**Props behind buildings.** `westProp` skipped the two tests `placeProp` has had
since the lamp-post pass. Measured with the same pixel-diff — render, remove the
prop, render again, count changed pixels — **9 of 67 burnt props drew zero
pixels**. With the tests applied: 0 of 50, none on a building tile. Bumped
attempts per row 2 → 3 to keep the density.

**The underpass.** It stopped eleven tiles in against ground id 14 that happened
to be solid, with nothing drawn on it — the invisible wall this whole plan
exists to remove, at the one place the map invites you to push. It is built now:
**21 tiles deep**, retaining walls either side (`BUILD_STYLE.W`), its own dark
`tunnel` ground (id 16), ending against a concrete face choked with debris,
girders and tipped drums so it reads as a collapse rather than as the map
stopping.

**And the same class of bug for the third time**: opening eighteen tiles that had
been solid let `placeBuilding` — which only refuses *solid* — drop a block across
the mid mouth and seal it. Ground 16 is refused like ground 4 now. Buildings in
the fire, weeds on the coals, a block in the tunnel: check the ground type, not
just `solid`.

Walkable 16,012 → 16,191. Props 475 → 497. Frame cost unchanged. All suites
green. `verifycut` now asserts you can reach y 17 — deep inside the tunnel, not
just its lip.

The far side of the collapse is still Field 12, which is spec'd and not built.

---

## "Start it" — the north expansion, E0 to E3

Built the first four phases of `design/expansion-build-spec.md`. Two new areas
and the loop between them.

**E0 — the runway paint, and the spec was wrong.** §2.1 said the markings would
be `sheared(img, +1)`. A shear maps the u axis and leaves v alone: fine for a
2px dash, plainly wrong for a 4 × 7-tile runway number. Every mark is built in
tile space and projected instead, like the cathedral and the viaduct deck — the
angle rule by construction, with no rectangle anywhere to get wrong. Two
tunings after looking: opacity 0.55 → 0.34 (it read as freshly repainted), and
the digit box narrowed because the number spanned 9.5 tiles of a 7-tile runway.

**E1 — the loop closes.** Both viaduct mouths are seams now; the rubble moved to
the sides and the collapse face came out. Walked in both directions, six hops,
every one landing on standable ground.

**E2 — the fence holds.** Field 12 is 6,912 tiles, 6,024 walkable from the
vehicle gate, and with both openings sealed **0 tiles are reachable in either
opening** — the church-corridor test. Nothing unreachable.

**E3 — it reads as an airfield.** Hangars, tower, blast pens, four bowsers (each
a `boomBarrel`), the crash tender shed, the wreck with work lamps, six dead
floodlight masts, the windsock. 392 props against the ~390 estimated.

The style table was wrong first time: hangars and pens went in as the garage and
*shopfront* styles and came out with glazing and a fascia board. New
`BUILD_STYLE.A` for the hangars, `W` for the pens. An airfield is not a high
street.

Frame cost at the wreck 16.66 ms, inside the band the Fringe already sits in.
All suites green.

**E4–E8 are not built**: the rust drones, the beacon sweep, Wren and Oz in the
Lamp, and the two quests. Both areas are places you can walk; they are not yet
levels.

---

## "make the underpass look like a tunnel · don't put rounds on the floor"

**The underpass is a bore now, not a cutting.** Retaining walls either side with
open sky above reads as the road being sliced off — a road that dives under a
motorway has a roof on it, and the dark rectangle of its mouth is what says
*this continues* from fifty tiles away. Both bores are roofed for their whole
length using the shack's own machinery: a soffit slab with beam lines, a header
band across the mouth drawn at full opacity whatever the roof is doing (it is
the portal, and the portal has to read from the far end of the map), and
`insideTunnel()` joining `insideShack()` to fade the roof as you walk in.

**Nothing lies in the road but food and rifle rounds.** Every area's pickups
were loose pistol rounds — the lazy pickup: it says nothing about where it is
lying and there is nothing to decide about it. Snacks everywhere now, with
rifle rounds on the Fringe and Field 12. The junkyard has no pistol ammo on its
floor any more, which is safe because the Compactor drops two lots of six
itself.

**It exposed a bug**: the pickup had two branches — the pipe, and
*everything-else-is-rounds*. A snack bar lying in the street would have handed
the player ammunition. It knows about `FOOD` now and uses the existing icon.

Verified: floor snack → inv.snack 1, rounds unchanged, eaten → +40 HP.
All suites green.

---

## "you still leave on the side instead of the other side"

Right, and it was worse than a layout question: the way onward was on the
Underpass's east wall, and it was a bare trigger zone standing in open floor
with **no door drawn on that wall at all**. You walked at blank concrete and the
screen faded.

The opening is in the **north wall** now — x 8–11, with the road running out
between the two pieces of it. In the south mouth, out the far end. Nothing in
the side walls but the service bay.

This moves Ring 4's seam: it attaches to Field 12's north fence when it is
built, rather than to the Underpass's far end. A tunnel with a door in its side
is a corridor with a secret; a tunnel with two ends is a road.

Walked both ways, every hop landing on standable ground. Underpass walkable
359 → 376. All suites green.
