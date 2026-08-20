# CORE SHUTDOWN

A dystopian action game about a scavenger fighting free of a machine-ruled mega-city —
isometric HD-2D pixel art, stealth patrols, scrap-and-barter survival.

**▶ Play it in your browser:** https://jolliusblecheimer.github.io/Core-Shutdown/

No install — runs in any desktop browser. Progress saves automatically in your browser.

## Controls
- **WASD** move · **SHIFT** crouch (sneak past the machines)
- **Mouse** aim · **LMB** use weapon · **mouse wheel** switch weapon
- **E** interact / loot / talk · **I** inventory · **H** eat snack bar

## Project layout
- `index.html` + `js/` — the game (vanilla JavaScript + Canvas, no build step)
- `arena.html` — boss test arena
- `PROJECT_STATE.md` — **what's built right now and what's next**
- `CONVERSATION_LOG.md` — running log of every design conversation
- `CLAUDE.md` — working rules for the project
- `design/` — living design documents: every decision, one file per topic
- `GAME_PLAN.md` — the overall vision: world rings, enemy roster, build phases
- `backup/` — pre-HD-2D snapshot of the code

Run locally with `python serve.py` (port 8123) or just open `index.html`.

Built by Laurens with Claude.
