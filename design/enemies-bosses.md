# Enemies & Bosses

## Decided
- **Role families per ring**, never one robot type per ring: grunt (melee), archer (ranged), runner (fast), flyer, heavy (large), turret (stationary), support (shields/repair).
- Each ring fields its own stronger, more advanced versions of these roles.
- Shallow rings: crude, partial squads. Deep rings: full coordinated squads.
- Encounters are always mixed (melee pressure + ranged fire + something fast/flying).
- Bosses are mission targets and landmarks, NOT gates — Guardians hold key districts in Ring 1; The Core is the final multi-stage fight.

## Open questions
- **Boss designs:** what should each Guardian actually be? (a factory mother-unit? a giant walker? a swarm controller?) — design one at a time as we reach them.
- **Elite/rare spawns:** occasional named/elite versions of normal robots with better loot? *(my lean: yes — great reward moments)*
- **Alarm system:** should robots call reinforcements when they spot you (stealth value)?
- **Robot infighting or malfunctioning units** in the outskirts for flavor?
- Do destroyed robots stay destroyed, or do areas repopulate over time?

## Decided (playtest)
- **Enemies spawn only after the survivor's warning** (first NPC talk) — the yard starts quiet, his dialogue "wakes it up". Narrative gates spawning, not timers.
- Respawn pacing: wreck lingers 20s unlooted; after looting, next robot spawns in ~4s (behind a mound, seeking).
- **Explosive red barrels** (hazard stripe) are a recurring WORLD element found across the whole city: shoot to detonate — 2.3-tile radius, hurts player AND machines (one-shots a Scrapper at close range; survivors aggro instantly), chain-reacts with nearby barrels, leaves a scorch mark. Placed deliberately in combat spaces (mid-yard), not random clutter. Code: `boomBarrels` in map.js + `explodeBarrel` in entities.js — reuse everywhere.
- **Stealth & detection (core system for ALL robots):** enemies never magically know the player's position. They **patrol heap-to-heap** (`patrolPoints`), pausing to scan. Detection is a visible meter above their head (yellow → red) that fills when the player is inside their sight — robot sight (4.5) is SHORTER than the player's view, so you can outrun it. **Crouch (CTRL or C)** slows you to half speed but shrinks their sight to 2.2 — useless up close though: under 1.6 tiles they see you regardless. Losing a chase (range > 7.5) drops them back to suspicious patrol (alert 0.35).
- **Knife trade costs 3 low-quality tech parts** (not scrap) — first gear gated behind the tech-component tier.

## Boss roster LOCKED (Laurens, 2026-08-17) — full detail in design/city-blueprint.html
- **The Compactor** (Ring 5, junkyard gate) — TUTORIAL-END BOSS, mandatory. Hidden in
  plain sight: it looks like part of the junk until the player walks to the gate to
  leave, then it unfolds. Beatable but a real fight:
  - **HP 200** — deliberately above the ~180 damage of "6 free rounds + one cheap
    12-round purchase", so the gun alone can't finish it: the stagger-punish melee
    windows are mandatory, which is the fight's core lesson.
  - Attacks: SLAM (wide telegraphed smash), CHARGE (bait into junk → 3s stagger =
    the damage window), SCRAP SPRAY below half HP (sidestep fan).
  - Hits for 20; everything heavily telegraphed.
  - **Bosses take 50% damage from explosive barrels** (armor plating) — the arena
    barrel is a ~45 HP bailout, never a one-button solution. (Rule applies to ALL bosses.)
  - Knife owners (18 dmg) melt the stagger windows ~2.5× faster than pipe users —
    optional prep pays off.
  - **BIG: ~3× player height** (sprite ~60px tall, 2×2 tile footprint) — it should
    fill the screen when it charges.
  - **ARMOR + WEAK POINTS (locational damage):**
    - **Armor plates** (hull, crusher arm, front): hits deal ZERO damage — grey
      spark, dull CLANK sound, no hit-flash.
    - **Feedback is DIEGETIC — the traveller THINKS.** No UI notes/messages:
      a small thought bubble appears over the player's head, pixel font:
      first armor bullet-hit → *"Armored. My bullets just bounce off..."*;
      first melee clank → *"Not even the blade. There has to be a soft spot."*;
      first stagger (core exposed) → *"There — the glow!"*
      Each thought fires ONCE. This introduces the character's inner voice —
      the same system later carries the amnesia breadcrumbs (headaches,
      familiar handwriting) in the main story.
    - **Weak point 1 — the EYE** (small, front): always damageable, full damage,
      but a small moving target — precision shooting is the skill-shot option.
    - **AIMED SHOTS — how it works (planned):** the boss carries hit ZONES
      (circles attached to its body: eye at the front, core at the rear, armor
      everywhere else); bullets check zones in priority order at the point of
      impact — no random spread, the shot goes exactly along your aim line, so
      accuracy is purely player skill. A small pixel **crosshair reticle** at the
      mouse replaces the bare cursor, and it **glows amber when your aim line
      rests on a weak point** — "take aim, then shoot" made visible. Weak-point
      hits get an amber flash + a 40ms hit-pause so they feel meaty; hitbox radii
      are tuning knobs (eye starts generous, ~0.35 tiles).
    - **Weak point 2 — the REAR CORE** (glowing vents on its back): full damage,
      but it faces you while active — reachable mid-fight only by outmaneuvering it.
    - **STAGGER = exposure**: after a charge crashes into junk, it slumps forward
      — the rear core points at the arena for ~3s and takes **1.5× damage**.
      The intended loop stays: bait charge → punish core.
    - Visual language (LAW for all future bosses): **what glows amber can be hurt;
      dull plate cannot.** No tooltips needed — the Scrapper's glowing eye taught
      this from hour one.
- **The Shepherd** (Ring 4, the Gallery — moved to the OUTER Sprawl near the Fringe
  boundary, reachable early) — optional, drone-flock herder.
- **The Foreman** (Ring 3, Assembly Plant 03) — mandatory, Q7.
- **The Smelter** (Ring 3, Blastworks) — optional.
- **The Auditor** (Ring 2, Neon Plaza, post-Q9) — optional.
- **Twin Watchers** (Ring 2, Coreward Bridge) — route-optional.
- **Ring 1 Guardians: pick-one by approach.** CANONICAL ROUTE = **the Sentinel's
  bridge**; Chorister and Surgeon exist for replay variety.
- **The Last Guardian** (Ring 0) — final fight; its wreckage provides the cutscene Scrapper.

**THE LOOT RULE:** every boss (optional ones especially) drops high-quality
materials/gear pieces that only **the Forge at Cinder Row** can craft into great
equipment — each boss holds a UNIQUE forge material, so no optional boss is ever
pointless. Signature drops listed in the city blueprint.

## Style notes
- Robot look evolves inward: rust/junk/improvised (outskirts) → clean/lethal/uniform (Core). The AI's "handwriting" gets neater as you approach it.
