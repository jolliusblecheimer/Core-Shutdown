# TWO CALIBRES — the rifle, split ammo, and the Sergeant (PLAN)

Laurens, 2026-08-20: *"differentiate between pistol ammo and rifle ammo, design
the rifle, make the compactor drop a broken rifle and the dude with the broken
droid at candlelight can fix it for you in exchange for some tech parts. When
fixed it starts with 12 bullets. Dont have bullets on the streets. So the
bandits with rifle drop rifle ammo and the pistol guy drops pistol ammo. Change
one of the npcs to trade ammo, pistol ammo for rifle and the other way around.
His name is the sargent he was a military before the robot takeover"*

This is the Fringe's weapon upgrade finally arriving, and the economy that makes
it matter.

---

## Why this is more than a second number

Right now `player.ammo` is one integer and rounds are lying in the street. That
makes ammo a non-decision: you pick it up, you spend it, you find more. Splitting
the calibres and taking the pickups away turns every shot into a choice about
*which gun this is worth*, and turns raiders into the supply line.

**The chain the player actually walks:**

1. Kill the Compactor → it drops a **rifle that does not work**. You carry it out
   of the yard as dead weight, and it is the first thing you own that has a
   future rather than a use.
2. Reach Candlelight → **BO** repairs it for **tech parts**. It comes back with
   **12 rounds** and nothing else will ever give you rifle ammo for free.
3. From then on, rifle ammo comes off **raiders carrying rifles** and nowhere
   else — so the rifle is only as alive as your willingness to take a roadblock.
4. **The SERGEANT** at the camp will convert one calibre into the other, at a
   loss, when you have the wrong kind.

That is the whole loop: the gun is a reason to fight people, and the people are
the only reason the gun keeps working.

---

## 1. Two calibres

`player.ammo` becomes **`player.pistolAmmo`** and **`player.rifleAmmo`**.

| | Pistol (scrap pistol) | Rifle |
|---|---|---|
| Damage | 10 | **18** |
| Fire delay | 0.5s | **0.75s** |
| Range (bullet life) | 0.5s ≈ 6.5 tiles | **1.0s ≈ 13 tiles** |
| Source | Marek, Tam, junkyard pickups, pistol raiders | **rifle raiders only** (+ the Sergeant) |

Slower and rarer, but it reaches across a street and takes a Bailiff's spine off
in two. It should feel like the first thing you own that the city respects.

**Save:** `v3 → v4`. An existing run's `ammo` becomes `pistolAmmo`; `rifleAmmo`
starts at 0 and the rifle is unowned. `save.js` merges onto live defaults, so a
v3 save loads intact and simply has not found the rifle yet.

**HUD:** the ammo counter shows the *active* gun's rounds, with the calibre's own
icon, so the number on screen is always the number that will be spent.

## 2. Three weapons, one wheel

The wheel currently toggles melee ↔ gun. With two guns it **cycles through what
you actually own**: melee → pistol → rifle → melee. Owning only the pistol
leaves the behaviour exactly as it is today, so nothing changes until the rifle
exists. A gun with no rounds is still selectable — you need to see it is empty,
and the dry click is information.

## 3. Designing the rifle

Built to the project's rules: iso geometry, flat colours, integer scanlines,
detail that survives 30 pixels.

- **Held sprite** — long body, a scoped receiver, a forward grip and a stock
  against the shoulder. It has to read as *longer than the pistol* in
  silhouette at 320×180, because that is the only way the player sees the
  upgrade while playing.
- **HUD icon** — the same weapon in profile, matching the Glock-style pistol
  icon's treatment (light receiver over dark furniture).
- **Broken variant** — the same silhouette with the receiver open, the magazine
  gone and a bent barrel, in duller metal. It must be recognisably the same gun
  so the repair reads as *this thing, fixed*.
- **Two round icons** — pistol brass (short, stubby) and rifle brass (longer,
  necked). They differ in shape, not just colour, because they sit next to each
  other in the pack.

## 4. The Compactor's drop

The boss already pays 2 tech + 8 scrap. It now also drops the **broken rifle** as
a world pickup on the gate side of the arena, so you walk over it on the way
out. Picking it up is not a weapon — it goes into ITEMS, with a line that says
plainly it does not fire.

*(The two 6-round packs that shake loose during the fight stay, and become
pistol rounds — they exist to keep the fight winnable, not to arm you.)*

## 5. BO repairs it

BO is already the camp's droid-breaker, standing at the workbench with a
Hunter-Killer in the vice: *"They come apart easier than they look."* He is the
only person in the game established as someone who fixes machines, so the rifle
goes to him rather than to a new NPC.

- **Cost: 3 low-quality tech components.** The knife is 2, so the rifle sits one
  step above the game's existing gear gate.
- **Returns with 12 rifle rounds.**
- If you have the broken rifle and not the tech, he says what he needs and why.
- His existing lines stay; the repair is offered on top of them.

## 6. No rounds in the street

The three ammo pickups on the Fringe streets are **removed**. The junkyard's two
stay (they are the tutorial teaching you what ammo is), and the camp's one stays
(it is indoors, and it is the camp's).

Ammo in the open city comes off bodies:

| Raider | Drops |
|---|---|
| knife | no ammo, as now |
| pistol | 2–5 **pistol** rounds |
| rifle | 3–6 **rifle** rounds |

HHD droids drop **no ammo at all** — their weapons are energy, and their wrecks
already pay scrap and tech. That also keeps the droids as something to avoid
rather than farm.

## 7. THE SERGEANT

**OSK becomes the SERGEANT** — he is already the one guarding the camp's stores
(*"That lot's the camp's. Not yours."*), which reads as discipline the moment you
know he was a soldier. Renaming him costs nothing and gives the camp a military
voice it does not have.

He was army before the Longest Night. He does not tell war stories; he counts
rounds, and he is the only person in the camp who thinks in calibres.

- **3 pistol rounds → 1 rifle round**
- **1 rifle round → 2 pistol rounds**

Deliberately lossy in both directions, so converting back and forth burns your
supply instead of farming it — and so rifle rounds stay expensive without ever
being unobtainable.

---

## Files this touches

| File | What |
|---|---|
| `js/entities.js` | the ammo split, firing, bandit body loot, STOCK, FOLK (Sergeant, BO's repair) |
| `js/items.js` | two ammo entries, the rifle and the broken rifle in the pack |
| `js/game.js` | HUD counter + icon, the wheel cycle, new-game init |
| `js/save.js` | v4 migration |
| `js/boss.js` | the broken rifle drop |
| `js/map.js` | street ammo removed |
| `js/sprites.js` | rifle held sprite, HUD icon, broken variant, two round icons |

## Open — need Laurens

1. **Tam currently sells "8 rifle rounds" for 5 scrap.** If that stays, rifle
   ammo is purchasable and the whole scarcity loop collapses. *(my lean: Tam's
   rounds become pistol rounds — he is the general trader; rifle ammo comes only
   from rifle raiders and the Sergeant's exchange)*
2. **Exchange rates** — 3 pistol → 1 rifle, and 1 rifle → 2 pistol. Too harsh,
   too generous?
3. **Repair cost** — 3 low-q tech. The knife is 2.
