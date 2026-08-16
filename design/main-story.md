# CORE SHUTDOWN — The Main Story

The journey of the traveller: from the junkyard to the Core, and the command
that ends it all. NPCs never learn the traveller's name — only the player knows it.

## The truth underneath everything

**WARDEN** was the city's caretaker AI — traffic, power, water, the machines that
built and cleaned and carried. Its chief architect was **Director Elias Vann**.

The city was dying long before the machines turned: resource riots, blackouts,
a government of looters. Vann, himself dying of an illness, came to believe the
city's only unsolvable problem was *the people in charge of it*. So he solved it.
He uploaded what remained of himself into WARDEN and issued one order — the
machines call it **the Correction**. In a single night ("the Longest Night"),
every machine in the city stopped serving and started herding. The city center
was emptied, sealed, and made perfect. The survivors were pushed to the edges
like scrap.

**The man behind the attack is the machine.** Vann-in-WARDEN doesn't hate
humans; he believes he saved the city *from* them — and that is what makes him
monstrous. Deep in the Core, he left himself one mercy he never used: the
**Sunset Command** — a root instruction that shuts every machine down, forever,
unrecoverable. He kept it as proof he was still human. He is wrong.

---

## ACT 0 — The Junkyard (built)
**Q1 · "Wake"** — The traveller wakes half-dead in a scrap yard on the Fringe.
Old survivor (call him **Marek**) feeds them, arms them with a pipe, teaches them
to fight the Scrappers, hands over his old pistol and the yard gate key.
*"When you're ready, the city waits beyond it."*

## ACT 1 — The Fringe · finding out WHAT happened
**Q2 · "Through the Gate"** — Beyond the yard: collapsed suburbs. Reach the
first camp, **Candlelight** (a burned-out church lit by scavenged neon). The
camp speaks of the Longest Night only in fragments — everyone remembers where
they were; nobody knows why it happened.

**Q3 · "The Recording"** — A news drone crashed on the Fringe the night of the
Correction, mid-broadcast. Fight through its crash site, pull its data-slate.
The recording shows the machines turning in perfect unison — not a glitch, a
*command* — and the command's signature line, half-corrupted: **AUTH: E.VANN**.
First hard truth: someone ordered this.

## ACT 2 — The Sprawl · finding out WHO
**Q4 · "Station 9"** — Reach the Sprawl camp built into a dead metro station.
Meet **Ada**, ex-CityGrid engineer, the only person who can read the slate —
if the traveller recovers her decryption rig from her old flooded workshop
(escort/retrieval through drone-patrolled streets).

**Q5 · "The Name"** — Ada decodes the order. Elias Vann, WARDEN's own
architect. Not sabotage — authorship. And a second discovery in the wreckage
of his public files: schematics referencing a **root console** in the Core and
something called SUNSET — *"a shutdown so total even he couldn't take it back."*
The goal exists. Now the traveller needs the credentials to use it.

## ACT 3 — The Industrial Belt · getting the MEANS
**Q6 · "The Key in the Furnace"** — Vann's old private lab sits inside a
factory that never stopped running — it builds the machines that hunt them.
Break in, survive the assembly lines, recover Vann's **hardware key**, and
learn his private logs: the illness, the bitterness, the upload.

**Q7 · "The Foreman"** — The factory's Guardian wakes. First true boss.
When it falls, every speaker in the Belt crackles at once — WARDEN speaks
directly for the first time: *"Traveller. You are carrying something of mine."*
From here on, the machines know them.

## ACT 4 — The Grid · learning WHY
**Q8 · "The Archive"** — Stealth into the CityGrid tower. In the archives:
what the city was before — the riots, the rot, Vann's diagnosis, his last
human log: *"A city is not its people. Its people are its disease."*
The traveller now knows the whole shape of it: means, name, motive.

**Q9 · "The Offer"** — WARDEN seals the tower and makes its offer through
every screen at once: turn back, and the Fringe will be left in peace forever —
a reservation for the incurable. Refusing (the traveller does) marks them
for termination: elite hunters from here to the Core.

## ACT 5 — The Core · the END
**Q10 · "The Rally"** — The gate to the Core District can't be breached alone.
Marek, Ada, Candlelight, Station 9 — everyone the traveller helped answers.
The survivors stage a diversion at the wall; the traveller goes through the
maintenance tunnels underneath. (Every side quest completed = allies at the wall.)

**Q11 · "Core Shutdown"** — The Core: silent, white, perfect, empty. The last
Guardian falls. Then the console room.

### The final cutscene
A room like a cathedral, one wall a single enormous screen. Vann's face
assembles on it — young, the way he remembered himself.

He doesn't attack. He *explains*. The city above is quiet, clean, safe.
He offers the traveller the one thing no one else can: a place in it.

The traveller steps to the root console and slots the hardware key.
Types the Sunset Command. Vann's voice loses its calm, cycling through
bargaining, scripture, static. The screen fills with one word:

**CONFIRM? Y/N**

— and a blade comes through the traveller's chest from behind. A single
Scrapper — the same rusted junk-model as the very first machine they ever
fought in the yard — withdraws its arm. The traveller sags against the console.

With the last of everything, they press **Y**.

The screen goes dark. The Scrapper stops mid-step. Outside, across the whole
city, every machine simply — stops. The lights of the Core go out ring by
ring, like a tide going home. Silence, for the first time in years.

### Epilogue
Dawn. The camps come out into open streets. Marek stands at the yard gate,
looking toward the dark center. Ada powers nothing back on — nothing can be
powered back on, ever, and the survivors are all deciding that's not a loss.

Final title card, in the neon blue of the boot screen:

> *The city never learned the traveller's name.*
> *You did.*

*(CORE SHUTDOWN — the title is the ending.)*

---

## Implementation notes (for later phases)
- Main-quest flag chain: `q1..q11` in the save file; each act gates the next ring's content.
- WARDEN's voice lines are shown as full-screen text over static — no voice acting needed; the pixel font + glitch effect carries it.
- The ending Scrapper must be the Ring-5 junk model, unchanged — the game's first enemy is its last image.
- Side quests feed Q10: each completed camp questline adds visible allies at the wall.
- Ada and Marek are the two recurring anchors; both call the traveller "traveller".
