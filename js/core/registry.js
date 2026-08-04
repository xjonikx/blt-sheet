/**
 * Module registry — each feature (inventory, retinue, …) registers here.
 *
 * Module shape:
 * {
 *   id: string,
 *   title: string,
 *   order?: number,
 *   mount(rootEl, api): void,
 *   onHero?(hero): void,
 *   onMode?(mode): void,
 * }
 */

const modules = [];

export function registerModule(mod) {
  if (!mod?.id || !mod?.title || typeof mod.mount !== "function") {
    throw new Error("Invalid module registration");
  }
  if (modules.some((m) => m.id === mod.id)) {
    console.warn(`[BLT Sheet] module already registered: ${mod.id}`);
    return;
  }
  modules.push(mod);
  modules.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

export function getModules() {
  return modules.slice();
}
