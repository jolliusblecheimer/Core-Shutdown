# RELOADING — six and twelve, and the pause between them

**Status: BUILT, 2026-08-20.** Every section below is in the game. Verified by
firing dry and reloading with real key presses, and by loading all three save
shapes this system has ever had without losing a round.

Laurens, 2026-08-20: *"instead of just firing continuously, show how many
bullets are left"* — and then, having seen the magazine version of it:
*"ok how about you just have to reload every 6/12 bullets depending on the gun,
so no stupid mag stuff. make the change."*

**This file replaces `design/magazines.md`.** The pause stayed; the magazine
bookkeeping went. What follows is the mechanic as it now stands, with a note at
the bottom on why the bigger version was cut, so nobody rebuilds it by
accident.

---

## 1. What the mechanic is for

`player.ammo` used to be a single number that the trigger read directly, and
that number never told you anything about the next four seconds. Forty rounds
and six rounds played identically until the count hit zero and the gun simply
stopped.

A gun that holds **six** or **twelve** fixes exactly that, and nothing else:

- **There is a moment of risk.** The gun runs out on a schedule you can see
  coming, and filling it costs you time you may not have.
- **The number on the HUD is about the fight**, not about your wallet. It says
  how many shots you have *right now*.
- **You can be caught out.** A machine walking at you while the gun is at 1/12
  is a decision — shoot it dry, or step back and fill up.

What the mechanic is NOT for is bookkeeping. You carry rounds, the gun holds
six or twelve, and `R` moves them across. That is the whole model.

## 2. The model

Each gun has what is in it and what you are carrying for it:

```js
player.arms = {
  pistol: { loaded: 4, reserve: 14 },
  rifle:  { loaded: 12, reserve: 0 },
}
```

| | capacity | reload |
|---|---|---|
| Scrap pistol | **6** | 1.1s |
| Service rifle | **12** | 1.6s |

- `loaded` is what is in the gun. This is the number on the HUD.
- `reserve` is loose rounds in your pocket for that gun.
- `R` takes `min(capacity - loaded, reserve)` and puts it in the gun, after the
  pause.

**Nothing is ever lost by reloading early**, because there is nothing that
*can* be lost: a gun that is part full simply takes fewer rounds to fill. That
was Laurens' *"if you reload with bullets left you use them"* — and this is the
version of it that needs no rule, no pouch and no explanation.

Reload refuses, out loud, in the only two cases where it does nothing:
`ALREADY LOADED` when the gun is full, `NO ROUNDS LEFT` when the pocket is
empty.

## 3. What the player sees

The weapon slot, bottom right:

```
 ┌──────────────────────┐
 │ [rifle]      8/12    │   loaded / capacity — amber low, red at zero
 │ ▮▮▮▮▮▮▮▮▯▯▯▯   ×23   │   one pip per ROUND in the gun, then the pocket
 └──────────────────────┘
```

- **One pip per round loaded.** The row empties as you fire, so the moment you
  have to stop is visible before it arrives rather than after.
- **`×n` is the pocket** — grey, small, and red at zero, because a pocket at
  zero is the thing worth noticing.
- **Reloading** replaces the pips with a filling bar, so the pause is visible
  and its length legible.
- **Empty with rounds to put in** pulses an `R` where the pocket total was.

**The tutorial** fires the first time a gun runs dry — the freeze-frame lesson
the game already uses for every other mechanic. It says *press R*, and the `R`
that dismisses it now performs the reload as well (`tutShow(..., onDo)`),
because a lesson that teaches a key and then eats the keypress teaches the
wrong thing.

## 4. Where rounds come from

| Source | Gives |
|---|---|
| The pickups in the yard and the Fringe | 6 rounds each |
| Marek | **6 pistol rounds**, 6 scrap |
| Tam at Candlelight | **12 rifle rounds**, 7 scrap |
| A stripped droid that carried a rifle | 4–11 rifle rounds |
| A searched raider with a gun | 2–6 pistol rounds |
| Marek's handover | the pistol, **loaded**, and six more |

Rounds always go into the **pocket**, never straight into the gun — putting
them in is what `R` is for. The two exceptions are moments where a weapon is
handed over: Marek's pistol and Bo's straightened rifle both arrive loaded, via
`chamber()`, because being handed an empty gun reads as a bug rather than as a
lesson.

Each gun feeds from its own pocket. Rifle rounds are the scarce ones — the
Correction issued them, so they come off the machines still carrying them or
off Tam's counter.

## 5. Save

Three shapes exist in the wild, and **none of them may lose a round**, because
every change here has been a change of *representation*, not of what the player
owns:

| In the save | Era | Converts by |
|---|---|---|
| `ammo` / `ammoRifle` | before reloading | filling the gun, pocketing the rest |
| `arms[gun].spares[]` | the magazine day | pouring every spare into the pocket |
| `arms[gun].reserve` | now | reading it |

Measured: 15 pistol / 40 rifle rounds come back as 6+9 and 12+28; a pouch of
`2 + [6,4]` comes back as 2+10. Same totals, every time.

Per rule 7 none of this needs a milestone grant — nothing new is being given,
and ammunition is a consumable, which the grant rule explicitly does not
backfill.

## 6. Art

Two ammunition boxes, and they have to be told apart at ten pixels in a pack
tile: the pistol's is olive with **gold** hand-packed rounds standing out of
it, the rifle's is darker, boxed tight, with **steel** rounds and a stencil
stripe — issued, not made in a shed. Both already existed; the magazine icons
that briefly replaced them are gone.

## 7. What this deliberately does not do

- **No magazines as objects.** The version with a pouch of part-used magazines
  is built and was cut the day after: it made the player track a list of little
  numbers to get the same 1.1 seconds of risk this gets from one. If it ever
  comes back, it is in `git show e49e386`.
- **No auto-reload.** Firing dry gives you the click and the prompt. The pause
  is the mechanic; taking it away automatically would take away the decision.
- **No reload cancel.** At 1.1 and 1.6 seconds it is not long enough to need
  one, and it would add a state to a system that reads clearly without it.
