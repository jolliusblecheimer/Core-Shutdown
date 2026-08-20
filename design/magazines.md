# MAGAZINES — ammunition you have to think about

**Status: BUILT, 2026-08-20.** Every section below is in the game. Verified by
firing dry and reloading with real key presses, and by converting a
pre-magazine save without losing a round.

Laurens, 2026-08-20: *"instead of just firing continuously, show how many
bullets are left in the mag — and now there are mags too. You don't buy rounds
but mags, you don't find bullets but mags. The rifle you reload every 12
bullets, the pistol every 6. If you reload a mag with bullets left you use
them."*

---

## 1. What is wrong with firing today

`player.ammo` is a single number and the trigger reads it directly. That has
three consequences, and all three are the same problem wearing different hats:

- **There is no moment of risk.** Forty rounds and six rounds play identically
  until the number hits zero, and then the gun simply stops. Nothing ever makes
  you decide *when* to spend the pause.
- **The number is a wallet, not a weapon.** You watch it go down the way you
  watch scrap go down. It never tells you anything about the next four seconds.
- **You cannot be caught out.** A magazine is the only thing in a shooter that
  makes the player look at a machine walking toward them and think *not now*.

A round count in a pouch answers "can I keep shooting at all". A magazine
answers "can I keep shooting *right now*", and that is the question worth
asking.

## 2. The model

Each gun owns a loaded magazine and a pouch of spares:

```js
player.arms = {
  pistol: { loaded: 6,  spares: [6, 4] },
  rifle:  { loaded: 12, spares: [] },
}
```

| | capacity | reload |
|---|---|---|
| Scrap pistol | **6** | 1.1s |
| Service rifle | **12** | 1.6s |

- `loaded` is what is in the gun. This is the number on the HUD.
- `spares` is one entry per magazine you are carrying, holding its round count.
  A magazine you bought or found is full; a magazine is only partial because
  **you** took it out part-used.

### THE RULE THAT MATTERS: a partial magazine is never thrown away

Reloading takes the fullest spare and loads it — and the magazine coming out of
the gun **goes back in the pouch with its rounds still in it**. Nothing is ever
lost by reloading early. That is the whole of Laurens' *"if you reload a mag
with bullets left you use them"*, and it is what stops the mechanic from
punishing the sensible habit of topping up between fights.

The consequence is that a long fight leaves you with a pouch of part-used
magazines rather than a tidy stack. That is correct: it is the honest
bookkeeping of having reloaded under pressure, and the pips on the HUD show it.

Reload refuses only when there is nothing better to swap to — no spares at all,
or every spare is emptier than what is already in the gun. It says so rather
than silently doing nothing.

## 3. What the player sees

**The weapon slot** carries the state now, not a wallet total:

```
 ┌──────────────────────┐
 │ [rifle]   8/12       │   loaded / capacity — red at zero
 │           ▮▮▯        │   one pip per spare; part-used pips are half-lit
 └──────────────────────┘
```

- Reloading replaces the pips with a filling bar, so the pause is visible and
  its length is legible.
- Empty with spares in the pouch shows a pulsing **R**. Empty with nothing left
  says so, once, and stops nagging.

**The tutorial** fires the first time a magazine runs dry — the freeze-frame
lesson the game already uses for every other mechanic, so the first time you
click on an empty chamber it is explained rather than merely frustrating.

## 4. Where magazines come from

You never pick up a loose round again.

| Source | Gives |
|---|---|
| The three pickups in the yard | a pistol magazine each |
| The two that shake loose at the gate fight | a pistol magazine each |
| Marek | sells a **pistol magazine**, 6 scrap |
| Tam at Candlelight | sells a **rifle magazine**, 7 scrap |
| A stripped droid that carried a rifle | its magazine, **part-used** — 4 to 11 |
| A searched raider with a gun | a pistol magazine, part-used |

The part-used drops are deliberate: a machine you shot was in the middle of its
own magazine, and taking it off them mid-fight is exactly the pouch-of-partials
situation the reload rule is built for.

## 5. Save

`ammo` and `ammoRifle` were plain numbers. Old runs convert **without losing a
round**: fill the loaded magazine first, then bag the remainder as spares.

```
40 rifle rounds  ->  loaded 12, spares [12, 12, 4]
```

Per rule 6 nothing is discarded, and per rule 7 nothing needs a milestone
grant: this is a change of *representation*, not of what the player owns.

## 6. Art

Two icons, and they have to be told apart at 10px in a pack tile: the pistol
magazine is a short straight box, the rifle magazine is longer and **curved**,
which is the one silhouette cue that reads at this size. Both get a witness
slot down the side — the stripe that says how full a real magazine is — because
that is also what the HUD pips are quoting.

## 7. What this deliberately does not do

- **No auto-reload.** Firing dry gives you the click and the prompt. The pause
  is the mechanic; taking it away automatically would be taking away the
  decision.
- **No reload cancel.** At 1.1 and 1.6 seconds it is not long enough to need
  one, and it would add a state to a system that reads clearly without it.
- **No per-magazine identity.** A magazine is a number of rounds, not an
  object with a history. Anything more is bookkeeping the player cannot see.
