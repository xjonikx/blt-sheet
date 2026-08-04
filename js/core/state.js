/** @typedef {import('./types.js').HeroState} HeroState */

export function createEmptyHero() {
  return {
    rawLines: [],
    name: null,
    gold: null,
    className: null,
    clan: null,
    culture: null,
    age: null,
    gender: null,
    occupation: null,
    hp: null,
    maxHp: null,
    lastSeen: null,
    level: null,
    skills: [],
    attributes: [],
    equipTier: null,
    equipClass: null,
    battle: [],
    civilian: [],
    customs: [],
    retinueSummary: null,
    retinue: [],
    retinue2Summary: null,
    retinue2: [],
    achievements: [],
    trackedStats: [],
    activePowers: [],
    passivePowers: [],
    family: null,
    noHero: false,
    updatedAt: null,
    source: "empty",
  };
}

export function createDemoHero() {
  const hero = createEmptyHero();
  Object.assign(hero, {
    name: "DemoViewer",
    gold: 12500,
    className: "Vlandian Knight",
    clan: "Clan dey Tihr",
    culture: "Vlandia",
    age: 27,
    gender: "Male",
    occupation: "Lord",
    hp: 112,
    maxHp: 120,
    lastSeen: "Sargot",
    level: 18,
    skills: [
      { name: "1H", value: 180, focus: 5 },
      { name: "Riding", value: 150, focus: 4 },
      { name: "Athletics", value: 120, focus: 3 },
    ],
    attributes: [
      { name: "VIG", value: 6 },
      { name: "CON", value: 5 },
      { name: "END", value: 4 },
      { name: "CUN", value: 3 },
      { name: "SOC", value: 4 },
      { name: "INT", value: 3 },
    ],
    equipTier: 5,
    equipClass: "Heavy Cavalry",
    battle: [
      { icon: "🗡", name: "Fine Arming Sword" },
      { icon: "🛡", name: "Reinforced Kite Shield" },
      { icon: "⛑️", name: "Visored Helmet" },
      { icon: "👕", name: "Coat of Plates" },
      { icon: "🐴", name: "Destrier" },
    ],
    civilian: [
      { icon: "👕", name: "Fine Town Tunic" },
      { icon: "🥾", name: "Leather Boots" },
    ],
    customs: [
      { index: 1, name: "Forged Bastard Sword (+12 Dmg, +4 Speed)" },
      { index: 2, name: "Named Banner of the Watch" },
    ],
    retinueSummary: "8 (avg Tier 4.2)",
    retinue: [
      { index: "1-4", name: "Vlandian Sharpshooter x 4" },
      { index: "5-8", name: "Vlandian Champion x 4" },
    ],
    retinue2Summary: "None",
    retinue2: [],
    achievements: ["First Blood", "Tournament Regular"],
    trackedStats: [
      { name: "K", total: 42, classStat: 12 },
      { name: "D", total: 7, classStat: 2 },
      { name: "Sums", total: 19, classStat: 5 },
    ],
    activePowers: ["Battle Cry"],
    passivePowers: ["Iron Skin"],
    family: "None",
    noHero: false,
    updatedAt: new Date().toISOString(),
    source: "demo",
    rawLines: ["Demo data — not from Twitch chat"],
  });
  return hero;
}

/**
 * Tiny pub/sub + hero state store.
 */
export function createStore() {
  /** @type {HeroState} */
  let hero = createEmptyHero();
  let mode = "offline"; // offline | demo | live
  let user = null; // { login, displayName, token }
  let channel = "";
  const listeners = new Set();

  function emit(type, payload) {
    for (const fn of listeners) fn(type, payload);
  }

  return {
    getHero: () => hero,
    getMode: () => mode,
    getUser: () => user,
    getChannel: () => channel,
    setChannel(value) {
      channel = (value || "").replace(/^#/, "").toLowerCase();
      emit("channel", channel);
    },
    setMode(value) {
      mode = value;
      emit("mode", mode);
    },
    setUser(value) {
      user = value;
      emit("user", user);
    },
    setHero(next) {
      hero = next;
      emit("hero", hero);
    },
    patchHero(partial) {
      hero = { ...hero, ...partial, updatedAt: new Date().toISOString() };
      emit("hero", hero);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
