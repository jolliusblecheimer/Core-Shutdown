# CORE SHUTDOWN — working rules for Claude

Read this first every session. It is the contract for how this project runs.

## Standing rules (set by Laurens)

1. **Plan before code.** For anything bigger than a small fix, write the plan
   (chat + a doc), get approval, then build.
2. **Keep the .md files current.** Every session: update the affected design
   docs *and* append to `CONVERSATION_LOG.md`. Docs are the memory of this
   project — treat them as part of the deliverable, not an afterthought.
3. **Append every exchange to `CONVERSATION_LOG.md`** — what Laurens asked,
   what was done. Newest at the bottom.
4. **Never touch the player's save while testing.** Set `window.TEST_MODE = true`
   before any test that saves; it redirects to a scratch key. (This was learned
   the hard way — a real run was overwritten twice.)
5. **Verify in the browser before claiming done.** Run it, check the console,
   screenshot when the pane is open. Report honestly what was and wasn't checked.
6. **Saves must survive updates.** Migrate old versions, never discard. See
   `js/save.js` — fields merge onto live defaults, world objects are keyed by
   position, and out-of-bounds players are rescued.
7. **A live run is never punished for having played early.** If we add an item
   and the player has already passed the stage that gives it — killed the boss,
   turned the mission in — **they get it on load.** Declare it in
   `MILESTONE_GRANTS` (`js/items.js`) with the milestone that earns it;
   `grantMilestoneItems()` settles the account and writes it to a ledger so it
   happens exactly once. **Unique keepable things only** — weapons, keys, quest
   items. Never consumables: you cannot tell "spent it" from "never got it" for
   scrap or rounds, so backfilling those would hand out free ammo every update.
8. **Commit and push after each meaningful change**, with a message that
   explains the *why*.

## Where things live

| Path | What |
|---|---|
| `index.html`, `js/` | The game — vanilla JS + Canvas, no build step |
| `arena.html` | Boss test arena (`window.ARENA_MODE`) |
| `serve.py` | Dev server with caching disabled (`python serve.py`, port 8123) |
| `GAME_PLAN.md` | The overall vision: rings, phases |
| `PROJECT_STATE.md` | **What is built right now + what's outstanding** |
| `CONVERSATION_LOG.md` | Running log of every exchange |
| `design/*.md`, `design/*.html` | Per-topic design docs; the .html ones are published artifacts |
| `backup/` | Pre-HD-2D snapshot |

## Big art changes: LOCAL FIRST, DO NOT PUSH
When making a large visual overhaul, build and iterate on localhost and **do
not commit/push until Laurens has seen and approved it** — a bad look must
never reach the live site. Small verified bug fixes may still be pushed.

## THE ANGLE RULE — check this for every texture you make

This world is isometric: **screen-right-down is world +x, screen-left-down is
world +y.** Anything that lies on, along or against the ground must be drawn on
that diagonal, never axis-aligned.

Before shipping any new sprite or decal, ask: *does this thing lie flat on the
ground, or run along a wall/road?* If yes it must be **sheared to the iso
grid** (`sheared(img, +1)` for things running along world +x, `-1` for +y) and
placed with a `dir` so the right variant is used. This applies to road paint,
crossings, arrows, vehicles, benches, shelters, signs, kerbs, anything long.
Only free-standing upright objects (poles, barrels, people) may be drawn
straight.

Flat rectangles pasted on an iso floor were the single most common visual bug
in this project. Check the angle every time.

## Hard-won technical rules

- **Buildings are single pre-rendered volumes**, never assembled wall panels.
  See `Sprites.makeBuilding`. Panels could not be made to line up — three
  attempts failed before this replaced them.
- **Walls that ARE panels** (junkyard fence, shack) use `Sprites.makeWallRun`
  with half-tile corner trims, and corner tiles belong to both runs.
- **Enemies never pop into existence in view** — they spawn behind cover.
- **What glows amber can be hurt; dull plate cannot.** The game's damage
  language, established by the Compactor.
- **UI text is the hand-built 5×7 bitmap font** on the high-res overlay canvas.
  Never a browser font in the HUD.
- **NPCs never learn the player's name.** "traveller" or "stranger".
- The browser caches hard: use `fetch(f, {cache:'reload'})` then reload, or
  Ctrl+F5.
