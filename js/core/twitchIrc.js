/**
 * Minimal Twitch IRC client over WebSocket.
 * Used to send BLT commands and read bot replies — no game mod changes needed.
 */

export function createIrcClient({ onLog } = {}) {
  let socket = null;
  let authenticated = false;
  let channel = "";
  let login = "";
  /** @type {Set<(msg: object) => void>} */
  const messageListeners = new Set();

  function log(line) {
    onLog?.(line);
  }

  function emitMessage(msg) {
    for (const fn of messageListeners) fn(msg);
  }

  function parseLine(raw) {
    // Basic IRC: [@tags] [:prefix] COMMAND params :trailing
    let rest = raw;
    let tags = {};
    if (rest.startsWith("@")) {
      const space = rest.indexOf(" ");
      const tagStr = rest.slice(1, space);
      rest = rest.slice(space + 1);
      for (const part of tagStr.split(";")) {
        const eq = part.indexOf("=");
        if (eq === -1) tags[part] = true;
        else tags[part.slice(0, eq)] = part.slice(eq + 1);
      }
    }

    let prefix = null;
    if (rest.startsWith(":")) {
      const space = rest.indexOf(" ");
      prefix = rest.slice(1, space);
      rest = rest.slice(space + 1);
    }

    const parts = rest.split(" ");
    const command = parts.shift();
    let trailing = null;
    const colon = rest.indexOf(" :");
    if (colon !== -1) {
      trailing = rest.slice(colon + 2);
    }

    return { raw, tags, prefix, command, params: parts, trailing };
  }

  function nickFromPrefix(prefix) {
    if (!prefix) return "";
    return prefix.split("!")[0].toLowerCase();
  }

  function connect({ token, loginName, channelName }) {
    return new Promise((resolve, reject) => {
      disconnect();
      login = loginName.toLowerCase();
      channel = channelName.replace(/^#/, "").toLowerCase();
      authenticated = false;

      socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");

      const timeout = setTimeout(() => {
        reject(new Error("Twitch IRC connect timeout"));
        disconnect();
      }, 12000);

      socket.addEventListener("open", () => {
        log("IRC connected");
        socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        socket.send(`PASS oauth:${token}`);
        socket.send(`NICK ${login}`);
      });

      socket.addEventListener("message", (ev) => {
        const chunks = String(ev.data).split(/\r?\n/).filter(Boolean);
        for (const line of chunks) {
          if (line.startsWith("PING")) {
            socket.send("PONG :tmi.twitch.tv");
            continue;
          }
          const msg = parseLine(line);
          if (msg.command === "001" || msg.command === "376" || msg.command === "422") {
            if (!authenticated) {
              authenticated = true;
              socket.send(`JOIN #${channel}`);
              log(`Joined #${channel}`);
              clearTimeout(timeout);
              resolve();
            }
          }
          if (msg.command === "PRIVMSG") {
            const from = nickFromPrefix(msg.prefix);
            const text = msg.trailing || "";
            const displayName = msg.tags["display-name"] || from;
            emitMessage({
              from,
              displayName,
              text,
              tags: msg.tags,
              channel,
            });
          }
          if (msg.command === "NOTICE") {
            log(`NOTICE: ${msg.trailing || line}`);
          }
          if (msg.command === "JOIN" && nickFromPrefix(msg.prefix) === login) {
            // already resolved on 001; keep quiet
          }
        }
      });

      socket.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("Twitch IRC socket error"));
      });

      socket.addEventListener("close", () => {
        log("IRC disconnected");
        authenticated = false;
      });
    });
  }

  function disconnect() {
    if (socket) {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
    }
    socket = null;
    authenticated = false;
  }

  function sendChat(text) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authenticated) {
      throw new Error("Not connected to Twitch chat");
    }
    socket.send(`PRIVMSG #${channel} :${text}`);
    log(`→ ${text}`);
  }

  function onMessage(fn) {
    messageListeners.add(fn);
    return () => messageListeners.delete(fn);
  }

  return {
    connect,
    disconnect,
    sendChat,
    onMessage,
    isConnected: () => authenticated && socket?.readyState === WebSocket.OPEN,
    getChannel: () => channel,
  };
}
