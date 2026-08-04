import { isLikelyBltMessage, parseHeroInfoReplies, stripBotPrefix } from "./bltParser.js";

/**
 * Sends chat commands and collects BLT bot replies for the logged-in viewer.
 */
export function createCommandBus({ irc, store, config, onLog }) {
  let collecting = false;
  /** @type {string[]} */
  let buffer = [];
  let collectTimer = null;
  /** @type {((lines: string[]) => void) | null} */
  let resolveCollect = null;

  function log(line) {
    onLog?.(line);
  }

  function viewerLogin() {
    return store.getUser()?.login?.toLowerCase() || "";
  }

  function shouldKeepMessage(msg) {
    const me = viewerLogin();
    const text = msg.text || "";
    const from = (msg.from || "").toLowerCase();
    const botLogin = (config.botLogin || "").toLowerCase();

    if (!isLikelyBltMessage(text, config.botPrefix, botLogin, from)) return false;

    // Prefer replies that mention the viewer
    const cleaned = stripBotPrefix(text, config.botPrefix);
    if (me && cleaned.toLowerCase().includes(`@${me}`)) return true;
    if (me && text.toLowerCase().includes(`@${me}`)) return true;

    // reply-threads / nearby messages while collecting
    if (collecting) return true;
    return false;
  }

  irc.onMessage((msg) => {
    if (!shouldKeepMessage(msg)) return;
    const line = msg.text;
    log(`← ${msg.displayName}: ${line}`);
    if (collecting) {
      buffer.push(line);
    }
  });

  function collectReplies(ms) {
    collecting = true;
    buffer = [];
    return new Promise((resolve) => {
      resolveCollect = resolve;
      clearTimeout(collectTimer);
      collectTimer = setTimeout(() => {
        collecting = false;
        const lines = buffer.slice();
        buffer = [];
        resolveCollect = null;
        resolve(lines);
      }, ms);
    });
  }

  async function sendAndCollect(command, collectMs) {
    if (!irc.isConnected()) throw new Error("Connect to Twitch chat first");
    const wait = collectMs ?? config.replyCollectMs ?? 4500;
    const pending = collectReplies(wait);
    // Small delay so collectors are armed
    await new Promise((r) => setTimeout(r, 50));
    irc.sendChat(command);
    return pending;
  }

  async function refreshHero() {
    const cmd = config.infoCommand || "!инв";
    log(`Refreshing hero via ${cmd} …`);
    const lines = await sendAndCollect(cmd);
    if (!lines.length) {
      throw new Error(
        "Нет ответа BLT. Кампания запущена? Команда infoCommand в config верная? Префикс бота?"
      );
    }
    return refreshHeroFromLines(lines);
  }

  function refreshHeroFromLines(lines) {
    const hero = parseHeroInfoReplies(lines, {
      viewerLogin: viewerLogin(),
      botPrefix: config.botPrefix,
    });
    store.setHero(hero);
    store.setMode("live");
    return hero;
  }

  async function runCommand(command) {
    return sendAndCollect(command, Math.min(config.replyCollectMs || 4500, 2500));
  }

  return {
    refreshHero,
    refreshHeroFromLines,
    runCommand,
    sendAndCollect,
  };
}
