import { createStore, createDemoHero, createEmptyHero } from "./core/state.js";
import { getModules } from "./core/registry.js";
import {
  beginLogin,
  clearSession,
  consumeOAuthRedirect,
  detectConnectBlocked,
  getRedirectUri,
  getStoredSession,
} from "./core/twitchAuth.js";
import { createIrcClient } from "./core/twitchIrc.js";
import { mountTwitchEmbed } from "./core/twitchEmbed.js";
import { createCommandBus } from "./core/commandBus.js";

import "./modules/overview.js";
// inventory/items/retinue merged into command tabs inside overview.js

function cfg() {
  return window.BLT_SHEET_CONFIG || {};
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 3200);
}

function appendLog(line) {
  const box = document.getElementById("event-log");
  const time = new Date().toLocaleTimeString();
  box.textContent = `[${time}] ${line}\n` + box.textContent;
}

function setStatus(mode) {
  const pill = document.getElementById("conn-status");
  const map = {
    live: ["live", "Live chat"],
    demo: ["demo", "Demo"],
    offline: ["offline", "Offline"],
  };
  const [state, label] = map[mode] || map.offline;
  pill.dataset.state = state;
  pill.textContent = label;
}

async function main() {
  const config = cfg();
  const store = createStore();
  const channelFromUrl = qs("channel");
  store.setChannel(channelFromUrl || config.channel || "");

  // Neocities free blocks connect-src → Twitch fetch/WebSocket fail
  const connectBlock = await detectConnectBlocked();
  if (connectBlock) {
    appendLog(connectBlock);
    toast("Этот хостинг блокирует Twitch — см. лог справа");
    const hint = document.querySelector(".side-card ul");
    if (hint) {
      const li = document.createElement("li");
      li.style.color = "#e0a898";
      li.textContent = connectBlock;
      hint.prepend(li);
    }
  }

  const irc = createIrcClient({ onLog: appendLog });
  const commandBus = createCommandBus({
    irc,
    store,
    config,
    onLog: appendLog,
  });

  const api = {
    store,
    commandBus,
    toast,
    loadDemo() {
      store.setHero(createDemoHero());
      store.setMode("demo");
    },
  };

  // --- header UI ---
  const channelInput = document.getElementById("channel-input");
  channelInput.value = store.getChannel();
  document.getElementById("hero-name").textContent = "—";
  document.getElementById("sheet-sub").textContent = `Канал: #${store.getChannel() || "…"}`;

  function refreshEmbed() {
    mountTwitchEmbed(document.getElementById("twitch-player"), store.getChannel());
  }
  refreshEmbed();

  document.getElementById("btn-apply-channel").addEventListener("click", () => {
    store.setChannel(channelInput.value.trim());
    const url = new URL(window.location.href);
    if (store.getChannel()) url.searchParams.set("channel", store.getChannel());
    else url.searchParams.delete("channel");
    history.replaceState(null, "", url);
    document.getElementById("sheet-sub").textContent = `Канал: #${store.getChannel() || "…"}`;
    refreshEmbed();
    toast("Канал обновлён");
  });

  // Show exact redirect URI so user can copy into Twitch Console
  const redirectUri = getRedirectUri();
  appendLog(`Redirect URI (добавь В ТВИЧ CONSOLE точно так): ${redirectUri}`);
  const redirectHint = document.getElementById("redirect-uri-hint");
  if (redirectHint) redirectHint.textContent = redirectUri;

  document.getElementById("btn-login").addEventListener("click", () => {
    if (connectBlock) {
      toast(connectBlock);
      appendLog(connectBlock);
      return;
    }
    try {
      beginLogin(config.twitchClientId, getRedirectUri());
    } catch (e) {
      toast(e.message || String(e));
    }
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    clearSession();
    store.setUser(null);
    irc.disconnect();
    store.setMode("offline");
    store.setHero(createEmptyHero());
    updateAuthUi();
    toast("Вышли");
  });

  document.getElementById("btn-connect").addEventListener("click", async () => {
    if (connectBlock) {
      toast(connectBlock);
      return;
    }
    const user = store.getUser();
    if (!user?.token) {
      toast("Сначала войди через Twitch");
      return;
    }
    if (!store.getChannel()) {
      toast("Укажи канал стримера");
      return;
    }
    try {
      appendLog("Connecting IRC…");
      await irc.connect({
        token: user.token,
        loginName: user.login,
        channelName: store.getChannel(),
      });
      store.setMode("live");
      toast("Чат подключён");
      updateAuthUi();
    } catch (e) {
      const msg = e.message || String(e);
      const nicer = /failed to fetch|socket error|timeout/i.test(msg) && connectBlock
        ? connectBlock
        : msg;
      toast(nicer);
      appendLog(nicer);
    }
  });

  document.getElementById("btn-refresh").addEventListener("click", async () => {
    try {
      await commandBus.refreshHero();
      toast("Лист обновлён");
    } catch (e) {
      toast(e.message || String(e));
    }
  });

  function updateAuthUi() {
    const user = store.getUser();
    const label = document.getElementById("user-label");
    label.textContent = user ? `${user.displayName}` : "гость";
    document.getElementById("btn-login").hidden = !!user;
    document.getElementById("btn-logout").hidden = !user;
    document.getElementById("btn-connect").disabled = !user;
    document.getElementById("btn-refresh").disabled = !user || !irc.isConnected();
  }

  store.subscribe((type, payload) => {
    if (type === "mode") setStatus(payload);
    if (type === "hero") {
      const name = payload.noHero
        ? "(нет героя)"
        : payload.name || store.getUser()?.displayName || "—";
      document.getElementById("hero-name").textContent = name;
    }
    if (type === "user" || type === "mode") {
      document.getElementById("btn-refresh").disabled =
        !store.getUser() || !irc.isConnected();
    }
  });

  // --- modules / tabs ---
  const tabsEl = document.getElementById("tabs");
  const hostEl = document.getElementById("module-host");
  const modules = getModules();
  /** @type {Map<string, HTMLElement>} */
  const panels = new Map();

  modules.forEach((mod, i) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tab" + (i === 0 ? " active" : "");
    tab.textContent = mod.title;
    tab.dataset.mod = mod.id;
    tabsEl.appendChild(tab);

    const panel = document.createElement("div");
    panel.className = "module-panel";
    panel.dataset.mod = mod.id;
    if (i !== 0) panel.hidden = true;
    hostEl.appendChild(panel);
    panels.set(mod.id, panel);
    mod.mount(panel, api);

    tab.addEventListener("click", () => {
      tabsEl.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      panels.forEach((p, id) => {
        p.hidden = id !== mod.id;
      });
    });
  });

  // --- session bootstrap ---
  try {
    const session =
      (await consumeOAuthRedirect(config.twitchClientId, { onLog: appendLog })) ||
      getStoredSession();
    if (session) {
      store.setUser(session);
      store.setHero(createEmptyHero());
      store.setMode("offline");
      appendLog(`Signed in as ${session.displayName}`);
    }
  } catch (e) {
    const msg = e.message || String(e);
    toast(msg);
    appendLog(msg);
  }

  // Demo only when nobody is logged in
  if (!store.getUser() && config.startInDemo && store.getHero().source === "empty") {
    api.loadDemo();
  }

  updateAuthUi();
  setStatus(store.getMode());
}

main().catch((e) => {
  console.error(e);
  toast(e.message || String(e));
});
