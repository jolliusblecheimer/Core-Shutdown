# Code backup — 2026-08-19

A verbatim snapshot of the working tree as it stood on 2026-08-19, taken
before consolidating the diverged histories (local `main` was 2 ahead / 14
behind `origin/main`) into a single push.

It captures the tree **including uncommitted work in flight**, which at the
time of the snapshot was:

- `js/map.js` — "THE CORDON" roadblocks in `buildFringe` (+75 lines), uncommitted
- `js/sprites.js` — +418 lines of new sprite work, uncommitted

plus the two local-only commits `a88f52c` (crest pipes / stray specks) and
`a33ac98` (vehicle hitboxes, two Scrappers, tech pity).

This is a safety net, not a source of truth. Nothing reads from this folder.
