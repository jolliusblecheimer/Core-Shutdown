# Save System & First-Boot Intro (PLANNED — approved design, not yet built)

## 1. How saving works in a browser

**Primary: `localStorage`.** Every browser has a small built-in storage that belongs
to our game's address. Data written there survives refreshing, closing the tab,
closing the browser, and rebooting the PC. No account, no server, no files to manage
— it just works, and our whole save easily fits (a few KB; the limit is ~5MB).

**What's in a save** (one JSON object, key `coreshutdown_save_v1`):
- Player: name, position, hp, ammo, inventory (scrap/tech/snacks/gate key),
  owned + equipped weapons, active weapon, respawn point / homeSet
- World: mission state, scrapper kill count, destroyed barrels, world items
  already picked up, trade purchases (knife owned)
- Meta: tutorials already seen (never replay them), total playtime, save version

**When it saves (autosave, no save button):**
- On every meaningful event: item pickup, wreck looted, trade, mission change,
  entering the shack, death
- Plus a 10-second interval heartbeat
- Plus on tab close (`beforeunload`)

**Versioned + migratable:** the save carries `version: 1`. Future updates that
change the format read old saves and upgrade them instead of breaking them.

**Known limitation (accepted):** localStorage is per-browser-per-device, and
clearing browser data deletes it. Future option if it ever matters: an
"Export save" that gives the player a small text code to keep / paste back in.

## 2. First-boot intro flow

Game gets a proper state machine: `TITLE → INTRO → NAMING → PLAYING`.
The world doesn't run until PLAYING.

**Every boot — title screen:**
- "CORE SHUTDOWN" in big pixel lettering over a darkened, blurred yard,
  god rays + dust still animating behind it
- First visit: "press any key"
- Returning player: "Welcome back, {NAME}" with CONTINUE / NEW GAME
  (NEW GAME asks "wipe your run?" before overwriting)

**First time only — intro:**
1. Three short story lines, typewriter-style, advance with E:
   the machines took the city · you made it out to the junkyard · barely
2. "What is your name?" — typed name entry in the pixel font,
   letters/digits, max 12 characters, Enter to confirm, can't be empty
3. Load into the yard; tutorials begin as they do now

**The name is for the GAME, not the NPCs.** The title screen welcomes you back
by name — but characters in the world don't magically know it. NPCs call you
"traveller" or "stranger", or would have to ask. (Laurens' rule, 2026-08-16.)

## 3. Build order (when approved)

1. `js/save.js` — serialize / load / migrate / autosave hooks (~1 session)
2. Title + intro + naming states drawn on the UI canvas, world frozen behind
3. Wire the survivor's first line + returning-player title to the name
4. Test matrix: fresh boot → name → play → refresh mid-run → CONTINUE restores
   everything; NEW GAME wipes cleanly; old-version save still loads
