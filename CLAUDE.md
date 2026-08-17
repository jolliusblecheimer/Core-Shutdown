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
7. **Commit and push after each meaningful change**, with a message that
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
