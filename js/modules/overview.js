import { registerModule } from "../core/registry.js";
import { COMMAND_GROUPS } from "../core/commandCatalog.js";
import { renderCommandGrid } from "../core/commandUi.js";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stat(label, value) {
  const v = value == null || value === "" ? "—" : value;
  return `<div class="stat-card"><span class="label">${label}</span><span class="value">${escapeHtml(
    String(v)
  )}</span></div>`;
}

registerModule({
  id: "overview",
  title: "Лист",
  order: 5,
  mount(root, api) {
    root.innerHTML = `
      <div class="toolbar">
        <button type="button" data-act="inv" class="primary">!инв</button>
        <button type="button" data-act="gold">!золото</button>
        <button type="button" data-act="stat">!стат</button>
        <button type="button" data-act="ach">!дост</button>
        <button type="button" data-act="demo" class="ghost">Демо</button>
      </div>
      <div data-role="banner" class="empty-hint"></div>
      <div class="stat-grid" data-role="grid"></div>
      <h3 class="section-title">Навыки</h3>
      <div class="skill-chips" data-role="skills"></div>
      <h3 class="section-title">Атрибуты</h3>
      <div class="skill-chips" data-role="attrs"></div>
      <h3 class="section-title">Сырой ответ</h3>
      <div class="log-box" data-role="raw"></div>
    `;

    const send = async (cmd, refresh) => {
      try {
        api.toast(`→ ${cmd}`);
        if (refresh) {
          await api.commandBus.refreshHero();
        } else {
          const lines = await api.commandBus.sendAndCollect(cmd);
          root.querySelector('[data-role="raw"]').textContent = lines.join("\n") || "(нет ответа)";
        }
      } catch (e) {
        api.toast(e.message || String(e));
      }
    };

    root.querySelector('[data-act="inv"]').addEventListener("click", () => send("!инв", true));
    root.querySelector('[data-act="gold"]').addEventListener("click", () => send("!золото", false));
    root.querySelector('[data-act="stat"]').addEventListener("click", () => send("!стат", false));
    root.querySelector('[data-act="ach"]').addEventListener("click", () => send("!дост", false));
    root.querySelector('[data-act="demo"]').addEventListener("click", () => {
      api.loadDemo();
      api.toast("Демо-данные");
    });

    const render = (hero) => {
      const banner = root.querySelector('[data-role="banner"]');
      if (hero.noHero) banner.textContent = "Нет усыновлённого героя.";
      else if (hero.source === "empty")
        banner.textContent = "Войди → Чат → жми !инв (или вкладки команд справа/ниже).";
      else banner.textContent = "";

      root.querySelector('[data-role="grid"]').innerHTML = [
        stat("Имя", hero.name),
        stat("Золото", hero.gold),
        stat("Класс", hero.className),
        stat("Клан", hero.clan),
        stat("Культура", hero.culture),
        stat("HP", hero.hp != null ? `${hero.hp} / ${hero.maxHp}` : null),
        stat("Уровень", hero.level),
        stat("Тир", hero.equipTier),
        stat("Где", hero.lastSeen),
      ].join("");

      root.querySelector('[data-role="skills"]').innerHTML = hero.skills?.length
        ? hero.skills
            .map(
              (s) =>
                `<span class="chip">${escapeHtml(s.name)} ${s.value ?? "?"} [f${
                  s.focus ?? "?"
                }]</span>`
            )
            .join("")
        : `<span class="empty-hint">—</span>`;

      root.querySelector('[data-role="attrs"]').innerHTML = hero.attributes?.length
        ? hero.attributes
            .map((a) => `<span class="chip">${escapeHtml(a.name)} ${a.value ?? "?"}</span>`)
            .join("")
        : `<span class="empty-hint">—</span>`;

      root.querySelector('[data-role="raw"]').textContent = (hero.rawLines || []).join("\n");
    };

    render(api.store.getHero());
    return api.store.subscribe((t, p) => t === "hero" && render(p));
  },
});

for (const [id, group] of Object.entries(COMMAND_GROUPS)) {
  registerModule({
    id: `cmd-${id}`,
    title: group.title,
    order: group.order,
    mount(root, api) {
      renderCommandGrid(root, group, api);
    },
  });
}
