# THE GUNSMITH — Bo's bench, and what a rifle can become

**Status: BUILT, 2026-08-21.** Laurens: *"i like all except muzzle. start
building"* — so the muzzle slot is cut (§3) and the rifle has four.

**Revised twice the same day, and both are the better design.** Laurens: *"no
you cant buy them at the table you need to find them or purchase them from
npcs"*, then *"one of the chests in the basement should give the drum mag"*,
then the laser box into the chest upstairs — so **THE BENCH IS NOT A SHOP.** It fits what is already in your kit and sells
nothing; parts are found in the dark, taken off machines you put down, or
bought at a trader's counter. §4a is the new section, and it replaced the
paragraph that had the gunsmith taking your scrap. He is right: a bench that sells you the part it then bolts on is a
menu with a table drawn behind it, and a part you had to go and get is a thing
rather than a purchase.

Everything below is in the game and was verified in a browser: every part
acquired the way it is meant to be and fired, a burst counted round by round, a
reload
timed at its modified length, the save round-tripped through a page reload, a
part id the build does not ship falling back to standard, and a save written
before any of this existed loading with every slot standard and not one round
lost. Three things came out differently from the plan and are marked **[as
built]** where they appear.

Laurens, 2026-08-21: *"remove the robot on the table, and the dialogue attached
to it — instead make it a weapon mod station, make it like the image a bit.
What is changeable about weapons is different for every one. The pipe, scrap
pistol and knife can't be modded but the rifle can. For the rifle I want it to
be possible to change a part — probably the barrel — to make it shoot bursts.
The mag, so you can go for a drum mag to not have to reload so often but
reloading takes longer. Think of any other stuff that would be cool to mod."*
Reference: the MW3 gunsmith screen — a weapon laid out big with its slots
around it.

---

## 1. What this is for

The rifle is the only weapon in the game you *earn*: it comes off the
Compactor bent double and somebody has to straighten it. That makes it the
right — and the only — thing to build a modification system on. The pipe, the
knife and the scrap pistol stay exactly as they are: they are what you make do
with, and making do is their whole character. **What can be changed is a
property of the weapon, not a rule of the game.**

The point of the system is not numbers going up. It is that two people who
both own the rifle should be carrying visibly different guns:

- **burst barrel + drum + padded stock** — a room-clearer that almost never
  stops to reload, and burns the ring's scarcest ammunition doing it.
- **long barrel + light box + laser** — a marksman that kills at a distance
  and tops up between every fight.

Both are the same rifle. Both are legible on the sprite from across the room.

## 2. The bench, and the machine that has to come off it

Today `Sprites.workbench` is *a Hunter-Killer with its casing off and one arm
in the vice*, its eye still lit — with a glow drawn over it in `game.js` and a
`USABLE.workbench` line that describes it. Bo's three lines are about it too
("Don't touch that. Its cell is still hot."). All of that goes.

In its place: **a gunsmith's bench.** A rifle lying in a cradle with its
handguard off, a vice with a barrel in it, a parts tray, a hooded lamp over the
work. Same footprint (`foot: [1,5,2,1]`), same place in the room, so nothing in
the cover audit or the walkability audit moves. The lamp keeps the west wall
lit now that the amber eye is gone.

Interacting with the bench (`E — work the bench`) opens the gunsmith. **Bo
stays**: he stands beside it, and his straighten-the-rifle job stays on his own
counter exactly as it is — that path is built and verified and there is no
reason to disturb it. His lines get rewritten to point at the bench instead of
at a droid. He never learns your name; he is a man who fixes things and says so.

## 3. What the rifle has, slot by slot

Base rifle, for reference: 18 damage, 0.78s between shots, 12 rounds, 1.6s
reload, bullet speed 18, life 0.75, shake 2.2.

Every slot ships with a **standard** part fitted, which is free, always owned,
and is the gun as it is today. Nothing below changes the rifle until you fit
something.

### BARREL — one shot, or three

| Part | Does | Where |
|---|---|---|
| Standard barrel | the rifle as it comes | — |
| **Burst regulator** | A SECOND TRIGGER: left click still sends one round, **right click sends three**, 0.08s apart, and the second and third wander a couple of degrees. It then **recharges for 2s** — it is an ability, not a fire mode, and the weapon panel draws its bar. The *whole burst leaves the gun* whether or not the first round was enough, and the heavier trigger group slows every shot (0.78 → 0.95s). | off a **Marshal** |
| **Long barrel** | 18 → **22 damage**, bullet flies faster and further (speed 23, life 1.05), and slower between shots (0.78 → 0.95s). | off a **Magistrate** |

The burst is Laurens' ask and it is the most interesting part in the list.
**It began by taking single fire away** — the regulator made every left click a
burst — and that was wrong, because it made the part something you had to think
about *before* the fight rather than during it. Laurens, 2026-08-21: *"change
the 3 bullet burst thing so when you left click it shoots normal but right click
shoots at 3 bullet burst"*. Now the choice is per shot, with your two fingers on
two triggers, and the cost is honest three ways over: every left click is
slower than a standard barrel's, once a burst starts **you have stopped
choosing how many rounds to spend**, and the burst then **recharges for two
seconds**, so holding the right button cannot spray. Sustained, that is 1.5
rounds a second against single fire's 1.05 — better, but front-loaded, which is
what a burst should be. In a ring where rifle rounds only come off machines and
off Tam's counter, the second cost still bites hardest.

### MAGAZINE — how often you have to stop

| Part | Does | Where |
|---|---|---|
| 12-round box | as it comes | — |
| **Drum, 24** | double the rounds in the gun; reload 1.6 → **2.9s** | a **chest in the crypt** |
| **Stripped 8-round box** | 8 rounds, reload 1.6 → **1.15s** | **Bo**, 6 scrap |

Laurens' second ask, and its opposite. The drum is for the burst build (four
bursts became eight); the light box is for anyone who would rather top up
constantly than ever be caught in a three-second reload.

### ~~MUZZLE~~ — cut

**Laurens, 2026-08-21: *"i like all except muzzle"*.** The compensator and the
suppressor are both out, and with them the mechanic the suppressor needed:
gunfire is still silent to anything that cannot see you. Detection stays
purely visual, `canSpot` is untouched, and nothing in stealth moves.

He is right, and for the reason the rest of this document keeps insisting on:
the compensator only ever adjusted how much the *camera* moved, which is a
setting pretending to be a part, and the suppressor was a slot asking the game
to grow a whole new sense so that one purchase could exist. Four slots that
each change what the gun does beats five where one changes how it feels to
look at.

### OPTIC — knowing where the shot goes

| Part | Does | Where |
|---|---|---|
| Iron sights | as it comes | — |
| **Laser box** | draws a thin line from the muzzle to the first thing the shot would hit, and lights that target | a **chest in Candlelight** |

There is no aiming down sights in a top-down isometric game, so a scope has
nothing to do. What an optic *can* fix here is the one genuine ambiguity in the
view: at 2:1 iso the mouse angle and the world direction are not the same
thing, and at range you are guessing. The laser removes the guess. It is also
the most visible part on the sprite — a red dot and a thin line — which is
exactly what a cosmetic-feeling slot needs.

### STOCK — the pause, shortened

| Part | Does | Where |
|---|---|---|
| Fixed stock | as it comes | — |
| **Padded stock** | reload −0.35s, shake −0.4 | **Bo**, 1 tech + 9 scrap |

**Four slots, six parts: two in chests, two off machines, two off Bo's
counter.** Deliberately smaller than the reference screen's eight: every slot here has to *do* something the game can show, and a
slot that exists to be full is the kind of bookkeeping this project has thrown
out twice already.

### Later, not now

- **Armour-piercing rounds** in an AMMUNITION slot — the honest answer to the
  Magistrate's frontal shield, which currently reads *come back later* with
  nothing to come back with. Held because it lands on boss and squad balance
  at the same time, and both want a playtest first.
- **Underbarrel** — nothing earns it yet.
- **Parts as loot** — a drum off a Marshal that carried one. Good, and it can
  come after the bench works.

## 4. What the player sees

A full-screen panel in the game's own hand: parchment and amber on near-black,
the 5×7 bitmap font, never a browser font. The reference screen's *layout* is
what is being borrowed, not its colours.

```
 GUNSMITH — SERVICE RIFLE                       MODIFICATIONS 2/4

                                       ┌──[ OPTIC ]
                     ▄▄▟█████▙▄▄       │
  [ BARREL ]──────▟███████████████▛────┴──[ STOCK ]
                     ██     ▜██
                  [ MAGAZINE ]

  ┌─ MAGAZINE ────────────────────────────────────────┐
  │  12-round box      as it comes            FITTED  │
  │  Drum, 24          +12 rounds · reload 1.6→2.9s   │
  │  Stripped box      −4 rounds · reload 1.6→1.15s   │
  └───────────────────────────────────────────────────┘
                                              E — close
```

- The rifle is drawn **big (×4) and with its fitted parts actually on it** — a
  drum hanging under the receiver, a longer barrel, a red dot on the handle.
  If fitting a part does not change the picture, the part is not real.
- Each slot is a chip with a **leader line to the point on the gun it
  changes**. That line is the whole reason the reference screen reads at a
  glance, and it is cheap to draw.
- Selecting a slot lists its parts with **what they do in plain numbers**, not
  in adjectives: `reload 1.6 → 2.9s`. Owned parts say FITTED or FIT; a part you
  do not have says **NOT FOUND** — never a price, because this table does not
  sell anything — and hovering one says where a thing like that comes from.
- Mouse-driven like the map and the trade board, `E`/`Esc` out.

**[as built]** Two things the mock did not know:

- **The pack and the weapon slot draw the same gun the bench does.** They did
  not at first: the pack was scaling the big 36px-wide sprite into a 26px tile
  it overflowed by five pixels each side, and the weapon slot had a cruder gun
  drawn for it back when there was only one rifle to draw. Both take a faithful
  miniature now — same palette, same masses in the same order, same parts on it
  — mirrored in the slot, because there it is the gun the way you hold it.
- **The rows only have room for the headline effect.** The price column is
  measured, not guessed — the first attempt hard-coded the middle column's
  width and the prices printed straight through the effects — so a row shows
  its first effect, and the part under the pointer gets *every* effect spelled
  out in amber under the list, above its description.
- **No freeze-frame lesson for the burst.** The world is already standing still
  at a bench, so the parts that change how you fire get a THOUGHT the first
  time they go on instead — *"Three rounds a pull now. Whether or not the first
  one was enough."* — which lands as you walk away rather than stopping the
  game to explain a thing you just chose.

Once a part is yours it is **yours forever and swaps free** — the cost of a
part is in *getting* it, and charging again to change your mind would only
teach players not to experiment.

## 4a. Where parts come from — the bench sells nothing

**Two are in chests**, two are **taken off the machines that use them**, and
two are **bought from Bo**.

**The drum is in a chest in the crypt, and the laser box in the camp's chest
upstairs.** Laurens, 2026-08-21: *"one of the
chests in the basement should give the drum mag"* — and it is the right home
for it, and the laser box followed it out of Tam's stock the same day. The camp
keeps what it cannot use next to what it cannot open, and a magazine and an
optic for a rifle nobody there owns are exactly that; it also means the two
parts that change the gun most are things you find rather than things you buy.
The drum is in the chest at **(1,6)** in the crypt beside the strongbox, the
laser box in the camp's own chest at **(9,13)** on the warm side of the nave.

A chest empties once and never refills, so a run that had already opened either
is handed its part on load — `crypt-drum` and `candlelight-laser` in
`MILESTONE_GRANTS`, reading the same open-chest record the world restores from.
That is rule 7 doing exactly what it was written for.

Two more are taken off the machines that use them, and they are the two worth
wanting:

| Part | Off |
|---|---|
| **Burst regulator** | a stripped **Marshal** — it fires in threes, and the thing making it do that unbolts |
| **Long barrel** | a stripped **Magistrate** — its cannon is a long heavy barrel, and killing one is a real achievement that had no reward |

You only take either if you know what it is: they drop once you own the rifle
or are carrying the bent one, once, and never twice — a second is no use to
anybody. Squads respawn, so **no part can become unobtainable by having played
early**, and rule 7 needs no ledger entry for them.

The last two are **bought from Bo**, at the price written on the part:

| Part | From | Price |
|---|---|---|
| Padded stock | **Bo** | 1 tech + 9 scrap |
| Stripped 8-round box | **Bo** | 6 scrap |

The split is the fiction, not a spreadsheet: **Bo has a vice and an awl**, so
he sells the two things a man can make — a cut-down magazine and a stitched
cheek pad. He cannot make a diode, a drum or a regulator, and does not pretend
to; those came out of a factory and the only ones in this ring are on the
machines still using them, or in the boxes this camp keeps what it cannot use
in. **Tam sells no parts at all** — rations, rounds and a tech component.
His rows do not appear until you own the rifle: a stock list
should not advertise fittings for a gun the traveller has never held, and each
row disappears once you have the part, because a part is a thing and you cannot
want a second.

A part you own but have not fitted is in the pack, under **PARTS** — generated
from the same registry, so a part's name is written once — with a green bar on
the tile of whichever one is on the gun.

## 5. How it is built

The engineering core is one function, and everything else follows from it:

```js
gunStats('rifle')  // base GUNS.rifle, with every fitted part's deltas folded in
```

Firing, reloading, the HUD, the tutorial and the gunsmith panel all read
**that**, never `GUNS[gun]` directly. Today the rifle's numbers are read in
four places; if mods are added without this the four will disagree within a
week. Recomputed when a part is fitted, and cached.

State:

```js
player.mods = {
  owned:  { drum: true, burst: true },          // bought, forever
  fitted: { rifle: { barrel:'burst', mag:'drum', muzzle:'std', optic:'std', stock:'std' } },
}
```

Save: merged onto live defaults like every other field, and **a part id the
build no longer ships is dropped back to standard rather than breaking the
gun** — that is rule 6, and it is what lets this list change later. No
milestone grant is owed (rule 7 is about things you *earn* and these are
things you *buy*), and a save that has already straightened the rifle simply
arrives with every slot standard.

Build order, each step playable and verifiable on its own:

1. **The bench.** New sprite, the eye glow out of `game.js`, `USABLE.workbench`
   opens an empty gunsmith, Bo's lines rewritten. *(No mechanics yet.)*
2. **`gunStats()` + `player.mods` + save.** A pure refactor: the game plays
   exactly as it does today, with every consumer reading merged stats.
3. **The parametric rifle sprite** — `Sprites.rifleBuild(parts)`, cached per
   combination, used by the panel, the pack, the HUD and the held sprite.
4. **The panel** — slots, leader lines, part list, fit. *(It could buy, for
   half a day. See the revision at the top: it cannot now.)*
5. **The parts**, cheapest code first: magazine → stock → optic → **barrel**,
   since the burst needs a firing queue in `updatePlayer` that reload and death
   both have to cancel.
6. **HUD** — the pip row is capacity-aware. **[as built]** it does not need the
   segmented bar the plan expected: the pitch is measured against the room the
   pocket total leaves, so twelve rounds keep their 3px pips and a drum's
   twenty-four fit as 1px pips at a 2px pitch. Below a 2px pitch it *would*
   fall back to a bar with a tick every six rounds, and that code is there for
   whatever the next magazine is.
7. Docs, `CONVERSATION_LOG.md`, push.

**[as built] one more rule the swap had to keep.** Fitting a smaller magazine
puts the overflow back in your pocket — but so must LOADING a save whose gun
holds more than this build's parts allow (a drum run read by a build without
the drum). Both paths now spill into the reserve instead of clamping, because
"nothing is lost by reloading early" has to mean nothing is lost by changing
your mind either.

## 6. What this deliberately does not do

- **No mods on the pipe, the knife or the pistol.** Laurens' rule, and it is
  the right one: those three are what you have, not what you build.
- **No cosmetics tab.** The reference screen has one. This game has one rifle
  and it is tan because issued kit is not painted the colour of junk.
- **No weapon levels, no unlock ladder.** Parts are found, or cost scrap and
  tech, which the ring already runs on. A level gate would make the bench a
  chore.
- **No buying at the bench.** See the top. The bench fits; it does not sell.
- **No stat bars.** Numbers, in the units the game already speaks: seconds,
  rounds, damage.

## 7. Settled, 2026-08-21

1. **The suppressor and "gunfire is heard" — cut**, with the whole muzzle slot.
   Detection stays visual. If the ring ever needs to hear you, that is its own
   change, argued on its own merits, not smuggled in behind a part.
2. ~~The bench is the only source of parts this phase.~~ **Overruled the same
   day, and rightly** — parts are found on machines or bought from traders, and
   the bench only fits them. See §4a.
3. **The ammunition price does not move yet.** Burst and drum both burn rifle
   rounds much faster and rifle rounds are deliberately scarce — that scarcity
   *is* the burst's downside, so it gets played before it gets tuned. If it
   proves miserable, Tam's 12-for-7 becomes 12-for-5 and the droids drop more.
