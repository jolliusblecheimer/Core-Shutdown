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
