# Build Approach & Tech

## Decided
- Vanilla JavaScript + HTML5 Canvas + WebAudio. No engine, no build step — open `index.html` and play.
- Start tiny: a few Fringe blocks with one enemy; iterate on feel before growing the world.
- Small reusable map blocks — all edits stay local.
- Ring identity (palette, enemies, loot) computed from distance-to-Core per tile.
- Five build phases (see GAME_PLAN.md §9), each ending in a playable build.
- Save/load via localStorage.

## Open questions
- Gamepad support eventually? *(easy to add, low priority)*
- Target frame rate / performance budget once the world grows (chunking strategy will handle it — revisit in Phase 3).

## Working agreements
- **Plan first, code second.** Before building any piece (a character, a scrap yard, a boss, a system), Claude first presents a mini-plan in chat: what it will look like, what will be in it, how it will play. Laurens approves or adjusts it — only then does coding start.
- **Testing loop:** no tools or installs needed. The game is just a folder with `index.html` — double-click it and it opens in the normal browser, play with keyboard + mouse. After Claude makes changes, press F5 (refresh) to get the new version. Claude also tests in its own browser pane with screenshots before handing anything over.
- Every decision we make in playtesting gets written into these design files immediately — they are the single source of truth for "what Laurens wants."
- When a design file and my assumption conflict, the file wins; when the file is silent, I ask or mark it as an open question.
