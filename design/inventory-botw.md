# THE PACK — a BotW-style inventory

Plan, written 2026-08-19. **Built the same day** — Laurens chose "build the
pack now, fill it later", pack screen only. Built and verified on localhost;
**not pushed**, per the big-visual-change rule.

Laurens: *"overhaul the inventory, make it like BotW, not a list but just
squares with items you have, and if you hover over them it explains what it is
and what it's used for. If you have 0 of an item don't show it."*

---

## The thing to decide before any of it is worth building

BotW's grid reads well because it is **full**. The screenshot has twenty-odd
distinct materials in it, and the pleasure of the screen is scanning a wall of
stuff you gathered.

This game currently has **seven items in total**:

| item | kind | source |
|---|---|---|
| Scrap | counted | wrecks, chests, crates |
| Low-quality tech component | counted | wrecks (1-in-5 + pity), crypt chest |
| Snack bar | counted | trade, chests |
| Rounds | counted | trade, tied to the pistol |
| Metal pipe | owned | found in the yard |
| Piercing knife | owned | traded for 2 tech |
| Scrap pistol | owned | Marek, mission reward |
| Yard gate key | owned | Marek, mission reward |

Split across tabs that is **two or three squares per tab**. The grid will be
correct, and it will look bare — not because the layout is wrong but because
there is nothing to put in it. That is a content problem, not a UI one, and it
is the honest thing to say before building.

**Laurens chose option 1: build the pack now, fill it later.** The three that
were on the table:

1. **Build the pack now, fill it later.** The grid is the right structure and
   it costs nothing to have it ready. It looks sparse until the city gives the
   player more to carry. Lowest risk, and the bandits/chests already landing in
   the Fringe will start filling it.
2. **Build the pack and widen the loot table in the same pass.** Give the
   Fringe its own materials — wire, glass, cloth, battery cells, ration tins,
   bandit trophies — so the grid has something to show the moment it ships.
   More work, and it touches balance, but it is the version that actually looks
   like the screenshot.
3. **Wait.** Keep the list until there is enough to fill a grid.

Everything below assumes option 1 or 2; the UI work is identical either way.

---

## What it looks like

The internal resolution is **320×180 logical pixels** — the whole screen is
about the size of one BotW item tile. So this is an *adaptation*, not a copy:
no rotating Link, no 3D item render. What carries over is the grammar —
**squares you scan, one description panel, counts on the tile, nothing you
don't own.**

Proposed geometry, to be tuned on screen:

```
 0                                                              320
 ┌──────────────────────────────────────────────────────────────┐
 │                          THE PACK                            │ y 6
 │   WEAPONS   FOOD   MATERIALS   KEY ITEMS                     │ y 20  tab row
 │  ┌────┬────┬────┬────┬────┬────┐   ┌──────────────────────┐  │
 │  │    │    │    │    │    │    │   │  Spicy Pepper        │  │ y 40  grid top
 │  ├────┼────┼────┼────┼────┼────┤   │                      │  │
 │  │    │    │    │    │    │    │   │  what it is, and     │  │
 │  ├────┼────┼────┼────┼────┼────┤   │  what it is FOR,     │  │
 │  │    │    │    │    │    │    │   │  wrapped to the      │  │
 │  ├────┼────┼────┼────┼────┼────┤   │  panel width         │  │
 │  │    │    │    │    │    │    │   │                      │  │
 │  └────┴────┴────┴────┴────┴────┘   └──────────────────────┘  │ y 137
 │        arrows/mouse select · E use · I close                 │ y 165
 └──────────────────────────────────────────────────────────────┘
```

- **Cell** 22×22 with a 3px gutter → 25px pitch. **6 columns × 4 rows = 24
  slots** per tab, far more than we can fill.
- **Grid** x 10–157. **Description panel** x 165–310, 145px wide ≈ 24
  characters per line in the 5×7 font.
- **Count badge** bottom-right inside the tile, `×12`, the way BotW does it —
  and **only on counted items**, never `×1` on a weapon you own one of.
  Nor on the pistol: rounds are a MATERIAL and are badged there, and badging
  them on the gun as well made the weapons tab read like a magazine
  (Laurens: *"just show the gun, the ammo is in the other pocket"*).
- Selected tile gets the amber highlight the rest of the UI already uses
  (`rgba(255,210,122,…)`), plus a 1px border so it reads without colour.

## How it is driven

**One cursor, two ways to move it.** BotW moves a cursor with the stick and the
description follows it. Mouse hover and keyboard must not be two separate
systems:

- Mouse move → hit-test the cell rects → that cell becomes the cursor.
- Arrows / WASD → move the cursor by one cell, wrapping at the edges.
- `Q`/`E` or `A`/`D` on the tab row → change tab; the rest of the game is
  keyboard-first and the pack must not become mouse-only.
- `E` → the item's action (equip a weapon, eat a snack). Click does the same.

`Input.mouseX/mouseY` are already tracked in VIEW space by the existing canvas
listener, so hover needs no new plumbing.

## The item registry — the actual structural change

Today an item's identity is scattered: its name is a string literal inside
`invEntries()`, its icon is picked in the same place, its description **does not
exist anywhere**, and the trade panel writes its own copy of the same names.
The grid needs a description per item, so this is the moment to give items one
home:

```js
const ITEMS = {
  scrap: {
    name: 'Scrap',
    icon: () => Sprites.scrapBit,
    tab: 'materials',
    desc: 'Torn plate and broken frame, prised off dead machines. ' +
          'The whole outskirts runs on it — every trader takes it.',
    count: () => player.inv.scrap,
  },
  pipe: {
    name: 'Metal pipe', tab: 'weapons', icon: () => Sprites.pipeIcon,
    desc: 'A length of scaffold. Crude, but it swings, and it reaches ' +
          'further than a Scrapper\'s arm.',
    owned: () => player.owned.pipe,
    equipped: () => player.melee === 'pipe',
    action: 'equip',
  },
  // …
};
```

The renderer then becomes: for each entry whose `tab` matches, ask `count()` or
`owned()`, **skip it if that is 0 or false**, draw the rest in order. Laurens'
"don't show what you have none of" is one `if` rather than a rule scattered
through the drawing code.

Two things fall out of that for free:

- The **trade panel stops hardcoding names** and reads them from the registry,
  so an item is renamed in one place.
- A **tab with nothing in it hides itself**, by the same rule as the items.
  This kills the `ARMOUR` tab, which has been showing "No armour yet — the city
  will provide." since it was written, and brings it back by itself the day
  armour exists.

## Writing the descriptions

This is the part the user actually asked for and the part that is easy to
under-do. Each is two short sentences: **what it is**, then **what it is for**.
The game's voice — plain, worn, no tutorial-speak, and it never uses the
player's name. Draft copy lives in this doc when the plan is approved so it can
be argued with before it is in code.

## Icons

A grid of squares is nothing but icons, so gaps are fatal in a way they are not
in a list:

- **Missing entirely: the yard gate key** (`icon: null` today — it renders as a
  blank row and would render as an empty square). Needs drawing.
- **Rounds** use `Sprites.ammo`; fine.
- The existing six icons are different sizes and were drawn to sit in a text
  row, not centred in a tile. They need a **common centring pass** — not
  redrawing, just measuring each one and centring it in the 22px cell.

## Phases

| # | What | Verifiable by |
|---|---|---|
| 1 | Item registry + descriptions. No visual change; the old list reads from it. | Every item resolves a name, icon, tab, description; list still renders as before |
| 2 | Grid renderer, cursor, hover hit-testing, description panel | Hover and keyboard both drive one cursor; counts correct; 0-count items absent |
| 3 | Gate-key icon + centring pass on all icons | Every tile in every tab has art, centred |
| 4 | Tab auto-hide, equip/eat actions, sounds, empty-pack line | Equipping and eating still work from the grid; ARMOUR gone until it exists |

## Risks, and what protects against them

- **It is a big visual change**, so per CLAUDE.md it is built and iterated on
  **localhost and not pushed** until Laurens has seen it.
- **No save-format change.** The registry is a view over `player.inv` and
  `player.owned`, which are untouched. Old saves need no migration — worth
  keeping true as it is built, because it means this overhaul cannot eat a run.
- **The 22px cell is tight** for icons drawn at other sizes. If centring is not
  enough, the fix is a per-item scale in the registry, not redrawn art.
- **Keyboard parity** must be checked, not assumed — it is the easiest thing to
  break when adding hover.

## Verification, before it is called done

In the browser with `window.TEST_MODE = true`, per the standing rule:

- every tab, with a full pack and an empty one
- an item spent to 0 disappears from the grid on the same frame
- hover and keyboard select the same cell and show the same description
- equipping a weapon and eating a snack still work from the grid
- no console errors; screenshot of each tab

---

# BUILT — what actually shipped, and where it differs from the plan

| planned | built |
|---|---|
| 22px cell, 6x4 grid | **36px cell, 4x3** — the tile is sized to the WEAPON. It went 22 → 26 because `pistolIcon` is 24px wide; it went 26 → 36 because the service rifle is 36px of drawn gun and the pack was showing a shrunken redraw of it instead. Twelve slots a tab is still more than any tab holds. |
| description panel 145px | 146px, x 162–308 |
| `Q`/`R` for tabs | as planned, **plus** clicking a tab and **plus** the scroll wheel |
| auto-fit icons | as planned, integer scale capped at x3; only Scrap overrides it (a 5x5 speck) |

Three things the plan did not foresee:

- **The world HUD printed straight through the pack.** The old panel was 250x130
  so the health bar and minimap sitting behind it were fine; a full-screen pack
  put the minimap on top of the tiles and the health bar under the footer hint.
  The whole world HUD is now wrapped in `if (!InvUI.open)`.
- **The scroll wheel silently switched weapons behind the open pack** — a bug
  that predates this work, because the wheel listener mutates `player.active`
  directly rather than going through `updatePlayer`. The pack now owns the
  wheel while it is up and cycles tabs with it.
- **`ptWrap` already existed.** A second word-wrapper was written before that
  was noticed; it was deleted and `ptFit` now just converts a pixel width into
  a character count and calls the existing one.

**Keys changed for the player:** `A`/`D` and the arrows used to change section.
They now move the cursor inside the grid, because in a grid that is what they
have to mean. Sections moved to `Q`/`R`, and the footer says so.

**Verified** on localhost with `window.TEST_MODE = true`: all four tabs; an
item spent to 0 vanishes and takes its tab with it (`FOOD` present at 2 snacks,
absent at 0); eating from the grid 3 -> 2 and 40 -> 80 HP; equipping and
unequipping the pipe; the arrow keys and the mouse driving the *same* cursor
(arrow to index 1, hover to index 2) and the cursor clamping at the last item
you actually carry rather than running into empty slots; `I` opening and
closing it; the wheel changing tabs without touching the equipped weapon; the
world HUD returning intact on close; a fresh tab reporting no console errors.

---

# POINTED AT, NOT DRIVEN — the second pass

Laurens: *"instead of the text saying what does what, only have i close
inventory but smaller. for the rest you just click on all the items and it will
give two options almost like a dialogue to equip or cancel. Also the top bar
you click on what page you want to be no arrows."*

The pack is now a **pointing** UI. Keys are gone from it except the one that
closes it.

- **Pages are clicked.** `Q`/`R` removed. The wheel no longer changes page
  either — it is swallowed entirely while the pack is open, which still matters
  because that listener writes `player.active` directly and would otherwise
  switch weapons behind the open pack.
- **Items are clicked, and they ask.** A tile with something to do raises a
  small centred dialogue: the item's name, then **EQUIP** / **PUT AWAY** /
  **EAT** and **CANCEL**. Nothing else on the screen responds until it is
  answered. `Escape` cancels the ask — and had to be taken off the pack's own
  close toggle first, or cancelling a dialogue slammed the whole pack shut
  behind it.
- **Things with no action do not ask.** Scrap has no answer to "equip or
  cancel", so clicking a material just reads it. The description panel was
  always the point of clicking those.
- **Arrow/WASD grid navigation removed.** Hover selects; the description panel
  follows the pointer.
- **The footer is one line:** `I — close inventory`, dimmed to 0.38.

**On "smaller":** it could not be made smaller in glyphs. `ptGet` has exactly
two sizes — scale 1 below 12 and scale 2 at 12 and above — so a `size` of 7 and
a `size` of 8 render the same 5x7 bitmap, and 5x7 at scale 1 is the atom of
this UI. Anything genuinely smaller would mean a second font, which the
standing rule forbids. It is smaller in the ways available: far shorter, and
much dimmer.

**Verified** click-by-click on localhost: clicking the knife raises EQUIP /
CANCEL; confirm equips and closes the ask; cancel closes it and changes
nothing; `Escape` closes the ask and leaves the pack open; clicking a tab
changes page; clicking Scrap raises no dialogue and just selects it; eating
runs 3 -> 2 and 30 -> 70 HP; the verb reads PUT AWAY on an equipped weapon and
unequips it. The nastiest case works too — **eating the last snack**, where the
item and its whole tab disappear out from under the open dialogue: the ask
clears itself, the tab index reclamps to MATERIALS, and it renders. Fresh tab,
no console errors.
