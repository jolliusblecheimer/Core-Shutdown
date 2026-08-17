# Art & Audio Style

## Decided
- Isometric 2.5D pixel art (2:1 diamond tiles), Fallout/Hades-style view.
- Modern effects over retro art: dynamic lighting, glow (robot eyes, neon, muzzle flashes), particles (sparks, smoke, rain), parallax skyline, screen shake.
- Palette shifts with depth: rust/amber/overgrowth → grey industry → cold neon blue/white at the Core.
- Robot design language: junky and improvised outside, clean and uniform near the Core.
- Sprites procedural/placeholder first; replaceable with hand-made art later without code changes.
- Audio: WebAudio synthesized SFX; ambient drone/synth music shifting per ring.

## Open questions
- **Pixel resolution:** chunky (16×16-ish tiles, very retro) or finer (32×32, more detail)? *(my lean: 32×32 — isometric needs the detail)*
- **Player character look:** hooded scavenger? Armored wanderer? Customizable colors?
- UI style: diegetic/gritty (scratched HUD, handwritten map) or clean minimal?
- Camera zoom: fixed or player-controlled zoom levels?
- How dark is dark? (night/interior visibility — flashlight mechanic?)

## THE ANGLE RULE (2026-08-17) — applies to EVERY texture
Isometric projection: screen-right-down = world +x, screen-left-down = world +y.
**Anything lying on the ground or running along a road/wall must be sheared to
that diagonal.** Road dashes, crossings, painted arrows, cars, buses, benches,
bus shelters, signs — all take a direction (`dir: 'x' | 'y'`) and use the
matching sheared sprite. Only upright free-standing objects (poles, barrels,
hydrants, people) are drawn straight.
Check the angle when creating any new texture, and fix it before shipping.

## BUILDINGS ARE VOLUMES, NOT PANELS (2026-08-17 — supersedes all wall-panel work)
Three attempts to assemble buildings from sheared per-tile wall strips + a
separate roof quad + corner columns all failed to line up: four independent
pieces had to agree on the corners, and never did.
**The rule now:** a building is rendered ONCE into a single sprite
(`Sprites.makeBuilding`) containing both camera-facing faces and the roof,
drawn from the same four corner points — misalignment is structurally
impossible. Windows, doors, shutters, pilasters, balconies and band courses are
laid out in *face space* so they follow the wall angle exactly. Each building
is one prop with one depth (its south corner).
Nine styles: house, brick, shopfront, shutter, office, school, church, hotel,
bank — each with its own height, palette and flat-or-pitched roof.
`makeWallRun` survives only for genuinely thin walls (junkyard fence, shack).
**Any future prop that reads as a volume (kiosks, bus shelters, containers)
should be built this way, not as flat cards.**

## VEHICLES — what four attempts taught us (2026-08-17)
Cars are now `carIso` in sprites.js: a full-length lower body with a shorter,
narrower cabin sat on top, built from the footprint and filled with **integer
scanlines** (`isoFill`) in flat colours. Simple, chunky, seen from above.

The three rejected attempts, so nobody repeats them:
1. **Sheared side elevation** — "all cars look 2d". Shearing can only slope a
   sprite ONE way, so the roof stays a rectangle. A real iso roof is a rhombus,
   which cannot be produced by a shear at all; the sprite reads as a slab stood
   on edge. This is the key geometric lesson.
2. **Plain cuboid** — "the cars are blocks, that is not what cars look like".
   A single box has no cabin, so there is no car in the silhouette.
3. **Swept profile** — curves sampled along the length (sloping bonnet, plan
   taper, set-back greenhouse, wheels in arches). Geometrically the best of the
   lot, but "this is hurting my eyes": dozens of thin polygons with fractional
   coordinates and alpha overlays turn to mush at 320×180.

**The rule: iso geometry, flat colours, integer pixels.** Detail must survive
being 30 pixels wide. Anything that needs antialiasing to read is wrong here.

## A FLAT ROOF IS A WELL, NOT A LID (2026-08-17)
The parapet stands up around the edge and the deck is set DOWN inside it, with
a shadow cast inwards along the two far sides. The old code drew the parapet
coping as a full-size diamond on top of the finished deck, which repainted the
whole roof in one flat colour and erased every bit of detail underneath — the
"huge grey square" bug. Roof detail (felt seams, patch repairs, ballast,
standing water, plant) must **scale with the roof's size**: at 320×180 internal
resolution a single 7×9 roof fills the screen, so a fixed six seams is nothing.

## HD-2D rendering pipeline (round 7 — Octopath Traveler reference)
The target look is HD-2D: chunky pixel world + modern cinematic presentation. The pipeline, in order:
1. Rich ground tiles (slab seams, cracks, pebbles, debris chunks — 8 variants per material)
2. **Ambient occlusion**: ground tiles darken next to solid objects (`aoGrid` in map.js)
3. Dynamic lights + **god rays** (warm animated shafts) + **dust motes** drifting through them
4. Cool **rain puddles** with shimmer — material contrast against the warm dusk
5. Post-process: **color grade** (saturate 1.22, contrast 1.08) then **tilt-shift blur bands** top & bottom (the miniature/diorama signature)
Post-processing budget: whole render ≈ 3ms at 320×180 — headroom is fine.
Code backup before this change: `backup/v1-prototype-2026-08-16/`.

## Style notes
Playtest feedback (2026-08-16, first scrap yard build):
- Overall look approved — "looks quite nice already". Mouse-aim shooting feels good.
- **No visible tile grid** — the diamond outlines make the floor read as "tiles". Blend ground naturally (remove tile strokes, use texture variation instead).
- **Props must read as standing objects, not floor decals** — junk piles looked painted on the ground. Give props height, outlines, and strong contact shadows.
- **Fences/barricades looked blurry** — keep prop pixels crisp and chunky.
- **More junk density** — one car is not a scrap yard. Much more junk: wrecks, barrels, tires, pipes, girders.

Playtest feedback round 2 (2026-08-16, reference photo: real scrap yard — rust mountains):
- **Junk comes in sizes**: small single-tile piles AND multi-tile trash mountains (2×2 and ~12-tile 4×3 footprints). Rust-heavy palette like the photo.
- **Walls/barricades must be directional**: sprites are sheared to follow the isometric edge they run along (implemented via `sheared()` in sprites.js). Never draw all wall pieces facing the same way.
- Density again: way more cars and scrap piles. Look at the reference photo — the yard should feel buried in junk.

Playtest round 3 (2026-08-16):
- **Zoom: 320×180 internal resolution** (was 480×270) — character must read big on screen.
- **Tile seams:** ground diamonds are scanline-filled (no canvas path antialiasing) — never any visible lines between tiles.
- **Walls are continuous runs**, painted as one strip, sheared, then sliced per tile for depth sorting — no per-piece joints or protruding segments. See `Sprites.makeWallRun`.
- **Enemies must never pop into existence in the open** — they spawn at points tucked behind trash mountains and walk out (`moundSpawns` in map.js).

Playtest round 4 (2026-08-16):
- **All text/HUD renders on a separate high-resolution canvas** layered over the pixel canvas — UI text must always be crisp and readable, never upscaled pixel mush. World stays chunky, UI stays sharp. Permanent rule.
- **Wall joints are capped with posts** (map corners, building corners, door frames) to hide run seams.
- **Player is never invisible**: a ghost silhouette pass keeps the player faintly visible when occluded by buildings or mounds.
- Player sprite upgraded (14×18, outlined, goggle glint, belt/buckle); proper pistol HUD icon. Health bar compact.

Playtest round 5 (2026-08-16, character reference image saved by Laurens):
- ~~Player design: navy cloak, shadowed void face~~ superseded in round 6.
- **NPCs are the same size and detail tier as the player** — never smaller/simpler.
- **UI text uses the hand-built 5×7 bitmap pixel font** (`FONT` in game.js) — pixel look AND readable. No browser fonts in the HUD.
- **Barricades are uniform height** — variation comes from rust patterns, never from height changes (alternating heights read as protruding teeth).

Playtest round 6 (2026-08-16, new references: techwear character + pixel Glock):
- **Player design locked (v2)**: black techwear — hooded long open coat, pale upper face with dark mask over mouth/nose, fingerless gloves, baggy black pants, boots. All-dark palette; readability comes from the outline + pale face strip.
- **Pistol HUD icon**: Glock-style — light grey serrated slide over darker polymer frame/grip.
- **Wall corners**: corner tiles belong to BOTH intersecting wall runs, AND each run is half-tile-trimmed at corners (`trimStart`/`trimEnd` in `makeWallRun`) so both faces stop exactly at the corner point. Full-width corner pieces overshoot past the corner in both directions — that was the protruding-walls bug (took three rounds to find).
- **Gun pose**: when armed, the character shows a small extended arm (sleeve + glove) holding the pistol, vertically flipped when aiming left so the grip stays down.
- **Buildings have furnished interiors** — an empty room is unacceptable. The shack: cot, table + stool, supply shelf, crate, fire-barrel stove (flickering warm light source).
- **Tutorial style**: staged freeze-frames — world pauses, dimmed overlay, one short lesson at the moment it's relevant (move → melee → enemy warning → looting/inventory → gun). Dismissed by performing the taught action.
