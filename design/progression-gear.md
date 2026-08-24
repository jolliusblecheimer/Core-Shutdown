# Progression & Gear

## ARMOUR IS RING 4's, NOT RING 5's (Laurens, 2026-08-22)

The Fringe has no armour and **that is now on purpose, not an oversight.**

The question came up because `js/items.js` says out loud that the ARMOUR tab was
pulled rather than stand empty promising *the city will provide* — and it never
did. Laurens' call: *"there are already many upgrades in the first part outside
of the tutorial, maybe save new armour for the next part of the quest."*

He is right and the count says so. Leaving the tutorial, Ring 5 already hands
the player **the piercing knife, the service rifle, and a bench with four slots
and six parts for it**. A fourth progression axis on top of that is not more
depth, it is a fourth thing competing for the same scrap in the same ring —
and armour is the one that would quietly undo the pressure gradient, because
armour is what makes walking deeper survivable.

**So armour arrives with the Sprawl**, where the player needs a reason to keep
going and where `world-map.md`'s gradient wants a new answer to "why can I
survive here now". Ring 5's answer to danger stays what it already is: cover,
the crouch, and knowing when not to fight.

When it is built, the open questions below still have to be answered first —
one value or several slots, and whether it is looted, traded or made.

## Decided
- Gear is found, looted, and crafted — not bought from abstract menus. Scrap is the universal resource, looted from robot wrecks (1–2 each).
- **Resource tiers:** scrap (common) → **tech components** (uncommon, from wreck loot ~20%) → **machine parts** (future, rare/deep-city). Higher tiers gate better gear.
- **Tech components have QUALITY tiers** shown in their name: outskirts robots drop **low-quality** ones; better quality comes from deeper-city machines. UI always states the quality so the player can tell.
- **Inventory: BotW-style full-screen pack** (tap **I**; game freezes). Four sections — WEAPONS / ARMOUR / FOOD / ITEMS. Navigate A/D + W/S, act with E. Weapons can be equipped/unequipped from here (melee slot + gun slot); food eaten from FOOD tab. HUD shows only health + equipped weapons.
- **Enemy AI baseline**: robots have a makeshift steering brain (`aiMove`) — when blocked by junk they probe rotated directions and sidestep around obstacles instead of getting stuck. All future robots build on this.
- **NPC trading exists from the first camp**: snack bars 4 scrap (heal 40, eat with H), 6 rounds for 6 scrap, piercing knife (2 low-q tech).
- **THE FORGE (Cinder Row, Ring 3)**: the crafting endgame for boss loot. Every boss
  drops a unique high-quality material; the Forge turns them into great gear
  (reinforced pipe, drone-jammer, heavy melee, heat-proof armor, precision sight,
  shield pulse, Guardian cores). Boss materials have NO other use — the Forge is
  why optional bosses always pay off.
- Gear tier is what truly "unlocks" deeper rings (the world never blocks you — your gear does).
- Crafting and trading happen at survivor camps.
- Simple upgrade board (health, dodge, weapon handling, crafting) — depth without menu overload.

## Open questions
- **Weapon variety:** how many weapon families? (pistol, rifle, shotgun-ish scrap cannon, energy weapons deeper in, melee tiers...)
- **Armor:** slots (head/body/etc.) or single armor value?
- **Gear from robots:** should weapons be literally built from robot parts you harvest (Ring 2 hunter arm → laser rifle)? *(my lean: yes — ties gear to enemies beautifully)*
- **Player level/XP** in addition to gear, or gear-only progression? *(my lean: gear + upgrade board only, no XP levels)*
- Inventory size: limited (weight/slots) or generous?
- Consumables besides meds: grenades, EMP charges, decoys?
- **Dodge roll as a skill-tree unlock** instead of available from the start? (floated in playtest round 2 — currently available from start)

## Style notes
(record what gear "feels" right as we build)
