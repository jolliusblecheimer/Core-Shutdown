# CORE SHUTDOWN — Game Design & Build Plan

*Working title — easy to change later.*

## 1. Concept

A dystopian action game set in a single massive AI-controlled mega-city. You start in the lawless outskirts, where the AI's grip is weak and only cheap, broken-down robots patrol. The deeper you push toward the city center, the stronger the AI's presence: bigger machines, denser patrols, heavier fortifications. Your end goal is to reach the Core at the heart of the city and shut down the AI for good.

**View:** Isometric 2.5D (Fallout/Hades style), pixel-art with modern lighting.
**Combat:** Real-time action — move, dodge, shoot, melee.
**Tech:** Web — JavaScript + HTML5 Canvas, no engine, runs in any browser.

## 2. Design pillars

1. **Pressure gradient** — the city itself is the difficulty curve. Every step inward should *feel* more dangerous: darker, denser, more surveillance, bigger machines.
2. **Scavenge to survive** — gear is found, looted, and crafted, not bought from menus. The world rewards exploration.
3. **Humans in the cracks** — survivor camps are the warm spots in a cold machine city: safety, trade, missions, story.

## 3. World structure — the Rings

The city is divided into concentric rings. Each ring is a level band with its own look, enemies, and gate.

| Ring | Name | Look & feel | Threat level |
|------|------|-------------|--------------|
| 5 (start) | The Fringe | Collapsed suburbs, rust, overgrowth, scrap fields | Weak scavenger bots, sparse patrols |
| 4 | The Sprawl | Dense low-rise ruins, abandoned malls, first drones | Patrol groups, basic turrets |
| 3 | The Industrial Belt | Factories still running, producing robots | Heavy workers, spider units, alarms that summon reinforcements |
| 2 | The Grid | High-rise corporate zone, neon, full surveillance | Elite hunters, camera networks, shielded units |
| 1 | The Core District | Pristine, silent, fully machine-run | Boss-class guardians |
| 0 | The Core | The AI itself | Final mission chain + final boss |

**No walls, no loading screens — the danger IS the gate.** Rings blend smoothly into each other: the architecture, palette, and lighting shift gradually as you walk inward, and you can go anywhere from minute one. Nothing physically stops you from sprinting toward the Core — but with starter gear, the deeper robots will shred you in seconds. Difficulty is enforced by lethality, not barriers: you naturally learn how deep your current gear lets you push, and better equipment is what "unlocks" the next ring. Bosses still exist, but as mission targets and landmarks (a Guardian holding a district, a factory heart), not as doors you must pass.

## 4. Enemies — robot roles × rings

Instead of one robot per ring, every ring fields a **family of roles**, so encounters are always mixed (melee pressure + ranged fire + something fast or flying). Each ring has its own versions of these roles — stronger, better armed, and more advanced-looking the deeper you go:

| Role | Behavior | Ring 5 example | Ring 2 example |
|------|----------|----------------|----------------|
| **Grunt** (melee) | Walks at you, swings | Scrapper — junk bot, slow | Enforcer — fast, combo attacks |
| **Archer** (ranged) | Keeps distance, shoots | Junk-slinger — lobbed scrap | Marksman — laser, leads your movement |
| **Runner** (fast) | Rushes and lunges | Feral hound-bot | Blade sprinter, dodges your shots |
| **Flyer** | Hovers, strafes, swoops | Rust drone, weak pot-shots | Gunship drone, missile bursts |
| **Heavy** (large) | Slow, armored, big slams | Loader brute | Siege walker |
| **Turret** (stationary) | Area denial, forces cover | Improvised gun nest | Shielded plasma battery |
| **Support** | Buffs/protects others | — (none this shallow) | Aegis shield projector, repair bot |

- Not every ring has every role — shallow rings field crude, partial squads; deep rings field full coordinated ones.
- **Bosses:** Guardians (Ring 1, multi-phase mini-bosses guarding key districts) and **The Core** itself (Ring 0, final multi-stage fight + shutdown sequence).
- Every enemy telegraphs attacks clearly (wind-up animations, laser sights) so real-time combat stays fair even when you're outgunned.

## 5. Player & progression

- **Combat kit:** ranged weapon + melee + dodge roll (with i-frames). Aim with mouse, move with WASD.
- **Gear:** weapons and armor found in the world, looted from robots, or crafted at camps from scrap. Rarity/tier scales with ring depth.
- **Scrap** is the universal currency/crafting resource — every robot drops some.
- **Upgrades:** simple skill/upgrade board (health, dodge, weapon handling, crafting) — depth without menu overload.

## 6. Survivors, camps & missions

- **Camps** in each ring: safe zones with a trader, a crafting bench, a med station, and mission-givers.
- **Missions:** main story chain (reach the next ring / breach the gate) + side missions (rescue a survivor, destroy a robot factory, recover supplies, escort). Side missions reward gear, scrap, and camp upgrades.
- **Rescued survivors** return to camp and improve it (better trader stock, new craft recipes) — makes rescuing feel meaningful.

## 7. Art & audio direction

- **Pixel art, isometric diamond tiles** (2:1 ratio). Moody palette: rust/amber in the outskirts shifting to cold neon-blue/white toward the Core.
- **Modern effects on retro art:** dynamic lighting and glow (robot eyes, neon signs, muzzle flashes), particles (sparks, smoke, rain), parallax skyline, screen shake, day/night tint per ring.
- Sprites generated programmatically/procedurally at first (placeholder-quality but consistent); can be replaced with hand-made art later without touching game code.
- Audio: synthesized SFX via WebAudio (shots, explosions, robot chirps); ambient drone/synth music per ring.

## 8. Technical architecture

- **Stack:** vanilla JavaScript (ES modules), HTML5 Canvas 2D, WebAudio. No frameworks, no build step — open `index.html` and play.
- **Isometric renderer:** diamond tile grid, depth-sorted entity drawing (things lower on screen draw in front), tile elevation for that 3D feel.
- **Core systems (each its own module):**
  - Game loop (fixed-timestep update, interpolated render)
  - Tile map + chunked world streaming (the city is big; only render/simulate what's near)
  - Entity system (player, robots, pickups, projectiles)
  - Enemy AI (state machines: patrol → alert → attack → search)
  - Collision (tile walls + entity circles)
  - Combat (projectiles, melee arcs, damage, knockback, i-frames)
  - Lighting layer (additive glow canvas composited over the scene)
  - Inventory / gear / crafting
  - Mission & dialogue system
  - Save/load (localStorage)
- **World generation:** the city is assembled from **small reusable map blocks** (a street corner, a ruined store, a scrap yard — each a small data file). Key locations (camps, boss districts) are hand-placed; filler blocks are stitched procedurally so the city feels huge. Because everything is block-based, changing one area means editing one small block — never the whole map.
- **Ring blending:** ring identity (palette, lighting, which enemy squads spawn, loot tier) is driven by *distance from the Core*, computed per tile — so the world shifts gradually and smoothly as you walk inward, with no visible seams between rings.

## 9. Build phases

We deliberately **start tiny and grow outward** — a small slice of the world first, never the whole map at once. Since the map is built from small blocks, every change stays local: tweak one block, not the whole city.

**Phase 1 — Walking skeleton (playable in days):**
Isometric renderer, player movement + dodge, camera, one weapon, health/damage, and a **single small test area** (a few blocks of the Fringe) with one Scrapper. *Goal: it feels good to move and shoot. We iterate on this tiny slice until it does.*

**Phase 2 — Combat depth:**
The Ring 5 squad roles (grunt, archer, runner, flyer), melee, enemy telegraphs, particles/screen shake, lighting pass, death/respawn — still on the small test slice.

**Phase 3 — World starts growing:**
Block-based map system, the Fringe proper + edge of the Sprawl, smooth ring blending, first camp with trader + crafting, scrap economy, save/load.

**Phase 4 — Progression:**
Gear tiers, upgrade board, missions system, survivor rescues, extend inward to Rings 3–2 with their squad variants.

**Phase 5 — Endgame & polish:**
Rings 1–0, Guardian fights, final Core mission + boss, music/ambience, balancing, title screen, ending.

Each phase ends with a playable build — we test, adjust, then move on.

## 10. Design decision files

Every design decision lives in the `design/` folder — one file per topic, each with a **Decided** section (locked-in choices) and **Open questions** (waiting for a call). These files are the single source of truth for what the game should be; they get updated the moment we decide anything.

- [design/combat.md](design/combat.md) — weapons feel, death penalty, healing, ammo
- [design/enemies-bosses.md](design/enemies-bosses.md) — role families, boss designs, elites, alarms
- [design/world-map.md](design/world-map.md) — city shape, landmarks, fast travel, weather
- [design/progression-gear.md](design/progression-gear.md) — gear tiers, crafting, upgrades
- [design/story-missions.md](design/story-missions.md) — the AI antagonist, the player, endings, survivors
- [design/art-style.md](design/art-style.md) — pixel resolution, palette, UI, audio
- [design/build-approach.md](design/build-approach.md) — tech choices and working agreements
