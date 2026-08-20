// THE ITEM REGISTRY — one home for what a thing IS.
//
// Before this file an item's identity was scattered: its name was a string
// literal inside invEntries(), its icon was chosen in the same breath, the
// trade panel wrote its own second copy of both, and its description did not
// exist anywhere at all. The pack grid needs a description per item, so every
// item now declares itself once, here.
//
// Each entry answers four questions:
//   have()   — do I own any? The pack NEVER draws an item you have none of.
//   count()  — how many, or null for a thing you either own or do not
//   icon()   — resolved late, because Sprites is built after this file loads
//   desc     — what it is, then what it is FOR. Two sentences, plain, worn.
//
// The tab order here is the order they appear in the pack.

const ITEM_TABS = [
  { id: 'weapons', label: 'WEAPONS' },
  { id: 'food', label: 'FOOD' },
  { id: 'materials', label: 'MATERIALS' },
  { id: 'key', label: 'KEY ITEMS' },
];

// Icons were drawn at wildly different sizes (5x5 up to 24x18) for text rows,
// not for a tile, so the pack auto-fits each one to the cell at an INTEGER
// scale — this is pixel art and a fractional scale would blur it. An entry may
// set `scale` to override that; only Scrap needs to, being a 5x5 speck.
const ITEMS = {
  // ---- weapons: owned, never counted. You have it or you do not. ----
  pipe: {
    name: 'Metal pipe',
    tab: 'weapons',
    icon: () => Sprites.pipeIcon,
    desc: 'A length of scaffold pipe, one end flattened where it was prised ' +
          'loose. It outreaches a Scrapper\'s arm — swing from the edge of ' +
          'your reach and it never touches you.',
    have: () => player.owned.pipe,
    equipped: () => player.melee === 'pipe',
    action: 'equip',
  },
  knife: {
    name: 'Piercing knife',
    tab: 'weapons',
    icon: () => Sprites.knifeIcon,
    desc: 'Ground down from a machine\'s own plate, and it bites like one. ' +
          'Shorter than the pipe, but it punches through armour the pipe ' +
          'only clangs off.',
    have: () => player.owned.knife,
    equipped: () => player.melee === 'knife',
    action: 'equip',
  },
  pistol: {
    name: 'Scrap pistol',
    tab: 'weapons',
    icon: () => Sprites.pistolIcon,
    desc: 'Marek\'s old sidearm, held together with wire and hope. Every ' +
          'round is one you paid for, so make the shot worth the scrap.',
    have: () => player.owned.pistol,
    // no round count on the tile: the rounds are a MATERIAL and are badged
    // there. Counting them twice made the weapons tab look like a magazine.
    equipped: () => player.hasGun,
    action: 'equip',
  },

  // ---- food ----
  snack: {
    name: 'Snack bar',
    tab: 'food',
    icon: () => Sprites.snackIcon,
    desc: 'Pressed grain and something sweet, sealed before the shutdown and ' +
          'still good. Eat one to put forty health back — the survivor ' +
          'trades them for scrap.',
    have: () => player.inv.snack > 0,
    count: () => player.inv.snack,
    action: 'eat',
  },
  // Army rations, and the reason the camp has a counter at all. H eats the
  // WORST thing that still helps, so buying the beef does not mean losing it
  // to a scratch — see FOOD in js/entities.js.
  mreChicken: {
    name: 'Chicken MRE',
    tab: 'food',
    icon: () => Sprites.mreChicken,
    desc: 'A meal sealed in foil for a soldier who never opened it. Cold, ' +
          'salty, and worth forty-five health. Tam keeps a box of them.',
    have: () => player.inv.mreChicken > 0,
    count: () => player.inv.mreChicken,
    action: 'eat',
  },
  mreBeef: {
    name: 'Beef MRE',
    tab: 'food',
    icon: () => Sprites.mreBeef,
    desc: 'The good one, and everybody knows it — sixty health out of a ' +
          'pouch you can carry a year. Save it for something that is going ' +
          'to hurt.',
    have: () => player.inv.mreBeef > 0,
    count: () => player.inv.mreBeef,
    action: 'eat',
  },

  // ---- materials ----
  scrap: {
    name: 'Scrap',
    tab: 'materials',
    icon: () => Sprites.scrapBit,
    scale: 3,
    desc: 'Torn plate and broken frame, prised off the machines that came at ' +
          'you. The whole outskirts runs on the stuff — every trader takes ' +
          'it, and every deal is priced in it.',
    have: () => player.inv.scrap > 0,
    count: () => player.inv.scrap,
  },
  tech: {
    name: 'Low-quality tech component',
    tab: 'materials',
    icon: () => Sprites.techIcon,
    desc: 'A cracked board with most of its life still in it, cut out of a ' +
          'yard robot. Crude by city standards — deeper machines carry ' +
          'better. Traders want these for the things scrap cannot buy.',
    have: () => player.inv.tech > 0,
    count: () => player.inv.tech,
  },
  ammo: {
    name: 'Pistol rounds',
    tab: 'materials',
    icon: () => Sprites.ammo,
    desc: 'Hand-packed, mismatched, and there are never enough. Only the ' +
          'scrap pistol takes them.',
    have: () => player.ammo > 0,
    count: () => player.ammo,
  },

  // ---- key items ----
  gateKey: {
    name: 'Yard gate key',
    tab: 'key',
    icon: () => Sprites.keyIcon,
    desc: 'A stub of notched steel on a loop of wire, warm from Marek\'s ' +
          'pocket. It opens the yard gate, and the yard gate is the only ' +
          'way out of here.',
    have: () => !!player.inv.gateKey,
  },
};

// =====================================================================
// WHAT A MILESTONE OWES YOU
// =====================================================================
// THE RULE (Laurens, 2026-08-20): when we add an item, a player who has
// already passed the stage that gives it must still get it. A live run must
// never be punished for having played the game before we finished writing it.
//
// So every item a MILESTONE hands over is declared here with the milestone
// that earns it, and `grantMilestoneItems()` in save.js settles the account on
// load: anything you are past the gate for but do not hold gets handed to you.
//
// Two things make it safe to run on every single load:
//
//   1. A LEDGER, not a check. Each entry is granted at most once ever, and the
//      fact that it was granted is written into the save. Something you were
//      given and then sold, dropped or used is never handed back.
//   2. `has` covers the ordinary case. A player who earned it the normal way
//      is marked as settled without being given a second one.
//
// AND THE LINE THIS DOES NOT CROSS: **unique keepable things only** — weapons,
// keys, quest items. Never consumables. For a stack of scrap or a magazine of
// rounds there is no way to tell "spent it" from "never got it", so backfilling
// those would hand out free ammo on every update. The Compactor's 2 tech and
// 8 scrap stay a one-time reward paid at the kill.
//
// TO ADD ONE: give it an `id` that never changes (it is the ledger key), the
// `when` that earns it, a `has` if the player could already own it, and a
// `give`. That is all — the load path picks it up.
const MILESTONE_GRANTS = [
  {
    id: 'marek-pistol',
    name: 'SCRAP PISTOL',
    when: () => mission.state === 'turned',
    has: () => player.owned.pistol,
    give: () => { player.owned.pistol = true; },
  },
  {
    id: 'marek-gatekey',
    name: 'YARD GATE KEY',
    when: () => mission.state === 'turned',
    has: () => !!player.inv.gateKey,
    give: () => { player.inv.gateKey = true; },
  },
];

// Everything on a tab that the player actually has. This one filter IS the
// "if you have 0 of an item, do not show it" rule — it is not repeated
// anywhere in the drawing code.
function itemsOnTab(tabId) {
  const out = [];
  for (const id of Object.keys(ITEMS)) {
    const it = ITEMS[id];
    if (it.tab !== tabId) continue;
    if (!it.have()) continue;
    out.push({ id, ...it });
  }
  return out;
}

// A tab with nothing in it hides itself — the same rule, one level up. This is
// why there is no ARMOUR tab standing empty saying the city will provide.
function visibleTabs() {
  return ITEM_TABS.filter(t => itemsOnTab(t.id).length > 0);
}
