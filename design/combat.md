# Combat Design

## Decided
- Real-time action: WASD movement, mouse aim, dodge roll with i-frames.
- Ranged weapon + melee weapon both always available.
- Enemies always telegraph attacks (wind-ups, laser sights) — fair even when outgunned.
- Difficulty comes from the world (deeper = deadlier), not from difficulty menus (open question below).

## Decided (from playtesting)
- Mouse-aim + click-to-shoot feels good — keep.
- **You start with NO weapon.** First weapon is the **METAL PIPE** (melee, weak) found in the world. The **pistol comes from the NPC** as the first mission reward, with one full mag (6 rounds).
- **Melee is core early-game**: ammo is scarce (packs contain 6 and are rare), so melee must stay viable. Pipe: 7 dmg. Piercing knife (trade, 15 scrap): 14 dmg.
- **Melee OUTRANGES the Scrapper** (pipe 1.5 vs its 1.15 reach) — spacing is the skill: back off from the wind-up, strike at max range.
- **Weapon animations are distinct**: pipe = wide sweep with arc trail; knife = fast forward STAB with motion streaks. Knife dmg 18 (it pierces metal). Only ONE weapon shows at a time — the gun holsters during a melee swing.
- **Passive regen**: after 20 seconds with no combat (no attacking, no being hit, not being hunted), health regenerates at 3/s. Being chased counts as combat.
- **Health bar colour** slides smoothly green → yellow → orange → red with remaining health (hsl hue 112→0).
- **One active weapon**: LMB always uses the selected weapon; the MOUSE WHEEL switches between equipped melee and gun. The HUD shows only the active weapon. (Replaced the earlier LMB/RMB split.)
- **Robot memory**: once a robot locks on, it remembers you for **12 seconds** after losing sight, pushing toward your last known position. Escape = break sight AND stay hidden for 12s.
- **Respawn point**: entering the shack the first time sets it as your respawn (before that, you respawn at the yard entrance).
- **Tutorial**: staged freeze-frame lessons at the moment each mechanic first matters (see [[art-style]]).
- **Robots don't explode — they die into lootable wrecks.** E to loot: 1–2 scrap, 20% chance of a tech component. Wreck fades once looted; new robot spawns behind a mound ~6s later.
- **HUD shows weapon slots** (melee icon + gun icon + ammo). Resources live in the inventory (TAB), not the HUD.

## Open questions
- **Ammo:** how scarce? Does the starter pistol have infinite reserve but limited magazine, or is all ammo scavenged? *(my lean: scavenged ammo, generous drops early)*
- **Death penalty:** respawn at last camp losing some scrap? Lose gear? Permadeath? *(my lean: respawn at camp, drop a portion of carried scrap where you died — retrievable)*
- **Healing:** auto-regen, med items, camp-only healing? *(my lean: med items + full heal at camps)*
- **Weapon feel:** slow & heavy (Souls-like) or fast & twitchy (twin-stick)? *(my lean: middle — snappy but deliberate)*
- **Blocking/parry:** dodge only, or also a block/parry mechanic?
- Difficulty settings menu: yes/no?

## Style notes
Playtest round 2 (2026-08-16):
- **Starter pistol nerfed** — it felt too strong for early game. Now: slow fire rate (0.5s between shots, nerfed twice from 0.22) and short range (bullet lifetime 0.5s ≈ 6.5 tiles). Early weapons should feel scrappy; power comes later through gear.
- **Dodge roll REMOVED entirely** (round 4) — movement only. May return later as a skill-tree unlock (see [[progression-gear]]).
- **Enemies actively seek the player after spawning** — a fresh robot walks toward the player's area until close, then normal chase behavior. No passive wandering after spawn.
