const STORAGE_KEY = "blt_sheet_twitch_token_v1";
const SCOPES = ["openid", "chat:read", "chat:edit"].join(" ");

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.token || !data?.login) return null;
    if (data.expiresAt && Date.now() > data.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function saveSession(data) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function decodeJwtPayload(jwt) {
  const part = jwt.split(".")[1];
  if (!part) throw new Error("Invalid id_token");
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const json = decodeURIComponent(
    atob(padded)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
  return JSON.parse(json);
}

export async function detectConnectBlocked() {
  const host = (window.location.hostname || "").toLowerCase();
  if (host.endsWith("neocities.org")) {
    return (
      "Neocities (бесплатный) блокирует Twitch. Открой http://localhost:5500/CompiledDevelopedApp/ или GitHub Pages."
    );
  }
  return null;
}

/**
 * Resolve Twitch login without relying on Helix when possible.
 * Order: id_token → oauth validate → helix → manual login prompt.
 */
async function resolveUser({ clientId, token, idToken, onLog }) {
  const log = (m) => onLog?.(m);

  if (idToken) {
    try {
      const claims = decodeJwtPayload(idToken);
      const expectedNonce = sessionStorage.getItem("blt_oauth_nonce");
      sessionStorage.removeItem("blt_oauth_nonce");
      if (expectedNonce && claims.nonce && claims.nonce !== expectedNonce) {
        throw new Error("OAuth nonce mismatch — войди ещё раз");
      }
      const login = (claims.preferred_username || claims.login || "").toLowerCase();
      if (login) {
        log(`User from id_token: ${login}`);
        return {
          login,
          displayName: claims.preferred_username || claims.login || login,
          userId: String(claims.sub || ""),
        };
      }
      log("id_token without preferred_username — trying validate…");
    } catch (e) {
      log(`id_token decode: ${e.message || e}`);
    }
  } else {
    log("No id_token in redirect — trying validate…");
  }

  // id.twitch.tv validate (often works when api.twitch.tv is blocked)
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `OAuth ${token}` },
    });
    if (res.ok) {
      const body = await res.json();
      if (body.login) {
        log(`User from validate: ${body.login}`);
        return {
          login: String(body.login).toLowerCase(),
          displayName: body.login,
          userId: String(body.user_id || ""),
        };
      }
    } else {
      log(`validate HTTP ${res.status}`);
    }
  } catch (e) {
    log(`validate failed: ${e.message || e}`);
  }

  // Helix last
  try {
    const user = await fetchTwitchUser(clientId, token);
    log(`User from Helix: ${user.login}`);
    return {
      login: user.login.toLowerCase(),
      displayName: user.display_name,
      userId: user.id,
    };
  } catch (e) {
    log(`Helix failed: ${e.message || e}`);
  }

  // Manual fallback — no network needed
  const typed = window.prompt(
    "Twitch не отдал ник через API (Failed to fetch).\nВведи свой Twitch login вручную (без #, латиницей):",
    ""
  );
  if (typed && typed.trim()) {
    const login = typed.trim().replace(/^@/, "").toLowerCase();
    log(`User from manual input: ${login}`);
    return { login, displayName: login, userId: "" };
  }

  throw new Error(
    "Не удалось узнать Twitch-логин. Проверь Redirect URL в Twitch Console " +
      "(должен ТОЧНО совпадать с адресом страницы) и попробуй снова."
  );
}

export async function consumeOAuthRedirect(clientId, { onLog } = {}) {
  const hash = window.location.hash?.replace(/^#/, "");
  if (!hash) return getStoredSession();

  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  const idToken = params.get("id_token");
  const state = params.get("state");
  const error = params.get("error");

  // Keep a copy for debugging before clearing
  onLog?.(`OAuth return: token=${token ? "yes" : "no"} id_token=${idToken ? "yes" : "no"}`);

  history.replaceState(null, "", window.location.pathname + window.location.search);

  if (error) {
    throw new Error(params.get("error_description") || error);
  }
  if (!token) return getStoredSession();

  const expected = sessionStorage.getItem("blt_oauth_state");
  sessionStorage.removeItem("blt_oauth_state");
  if (expected && state && expected !== state) {
    throw new Error("OAuth state mismatch — войди ещё раз");
  }

  const user = await resolveUser({ clientId, token, idToken, onLog });

  const expiresIn = Number(params.get("expires_in") || 14000);
  const session = {
    token,
    login: user.login,
    displayName: user.displayName,
    userId: user.userId,
    expiresAt: Date.now() + expiresIn * 1000 - 60_000,
  };
  saveSession(session);
  return session;
}

export function beginLogin(clientId, redirectUri) {
  if (!clientId || clientId === "YOUR_TWITCH_CLIENT_ID") {
    throw new Error("Set twitchClientId in config.js");
  }
  const state = randomState();
  const nonce = randomState();
  sessionStorage.setItem("blt_oauth_state", state);
  sessionStorage.setItem("blt_oauth_nonce", nonce);

  const url = new URL("https://id.twitch.tv/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "token id_token");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  // Ask Twitch to put username into id_token (no Helix call needed)
  url.searchParams.set(
    "claims",
    JSON.stringify({
      id_token: { preferred_username: null, picture: null },
    })
  );
  window.location.assign(url.toString());
}

export async function fetchTwitchUser(clientId, token) {
  const res = await fetch("https://api.twitch.tv/helix/users", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": clientId,
    },
  });
  if (!res.ok) throw new Error(`Twitch user lookup failed (${res.status})`);
  const body = await res.json();
  const user = body.data?.[0];
  if (!user) throw new Error("No Twitch user returned");
  return user;
}

/** Exact URL Twitch must have in OAuth Redirect URLs */
export function getRedirectUri() {
  return `${window.location.origin}${window.location.pathname}`;
}
