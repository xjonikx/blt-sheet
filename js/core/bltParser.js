import { createEmptyHero } from "./state.js";

const SEP = /\s*■\s*/;

function stripBotPrefix(text, prefix) {
  let t = text.trim();
  // Common forms: "[BLT] @User ..." or "[BLT]..."
  const p = (prefix || "[BLT]").trim();
  if (t.startsWith(p)) t = t.slice(p.length).trim();
  // Drop leading @mention of the viewer
  t = t.replace(/^@[^\s]+\s+/, "");
  return t.trim();
}

function isLikelyBltMessage(text, prefix, botLogin, from) {
  const p = (prefix || "[BLT]").trim();
  if (text.includes(p) || text.trimStart().startsWith(p)) return true;
  if (botLogin && from === botLogin.toLowerCase()) return true;
  // Fallback: tagged sections from HeroInfoCommand
  return /\[[A-Z][A-Z0-9]*\]/.test(text);
}

function splitChunks(text) {
  // BLT often joins with " ■ " or " - "
  if (text.includes("■")) return text.split(SEP).map((s) => s.trim()).filter(Boolean);
  // Also handle " - " used when FormatMessage joins
  return text.split(/\s+[—\-–]\s+/).map((s) => s.trim()).filter(Boolean);
}

function parseSkill(token) {
  // "1H 180 [f5]" or "Riding 150 [f4]"
  const m = token.match(/^(.+?)\s+(\d+)\s*\[\s*f?\s*(\d+)\s*\]$/i);
  if (!m) return { name: token, value: null, focus: null };
  return { name: m[1].trim(), value: Number(m[2]), focus: Number(m[3]) };
}

function parseAttr(token) {
  const m = token.match(/^(.+?)\s+(\d+)$/);
  if (!m) return { name: token, value: null };
  return { name: m[1].trim(), value: Number(m[2]) };
}

function parseBattleItem(token) {
  const m = token.match(/^(\S+)\s+(.+)$/);
  if (!m) return { icon: "⚙️", name: token };
  return { icon: m[1], name: m[2] };
}

function parseCustom(token) {
  const m = token.match(/^#(\d+)\s+(.+)$/);
  if (!m) return { index: null, name: token };
  return { index: Number(m[1]), name: m[2] };
}

function parseTroopLine(line) {
  const m = line.match(/^\[([^\]]+)\]\s+(.+)$/);
  if (!m) return null;
  return { index: m[1], name: m[2] };
}

function parseStat(token) {
  // K:42(12)
  const m = token.match(/^([^:]+):(\d+)\((\d+)\)$/);
  if (!m) return { name: token, total: null, classStat: null };
  return { name: m[1], total: Number(m[2]), classStat: Number(m[3]) };
}

/**
 * Parse accumulated BLT hero-info reply text into structured hero state.
 */
export function parseHeroInfoReplies(lines, { viewerLogin, botPrefix } = {}) {
  const hero = createEmptyHero();
  hero.rawLines = lines.slice();
  hero.source = "chat";
  hero.updatedAt = new Date().toISOString();
  if (viewerLogin) hero.name = viewerLogin;

  const joined = lines.join(" ■ ");
  const lower = joined.toLowerCase();
  if (
    /no hero|don't have a hero|do not have a hero|нет героя|не усыновил/i.test(joined) ||
    lower.includes("you don't have")
  ) {
    hero.noHero = true;
    return hero;
  }

  /** @type {string[]} */
  const pieces = [];
  for (const line of lines) {
    const cleaned = stripBotPrefix(line, botPrefix);
    pieces.push(...splitChunks(cleaned));
  }

  let section = "general";
  for (const piece of pieces) {
    if (!piece) continue;

    const tag = piece.match(/^\[([A-Z][A-Z0-9]*)\]\s*(.*)$/i);
    if (tag) {
      const name = tag[1].toUpperCase();
      const rest = (tag[2] || "").trim();
      section = name;

      switch (name) {
        case "LVL":
          hero.level = Number(rest) || hero.level;
          break;
        case "SKILLS":
          hero.skills = rest ? rest.split(SEP).filter(Boolean).map(parseSkill) : [];
          if (!rest.includes("■") && rest) {
            // skills may be Sep2-joined already split into pieces; keep if single blob
            hero.skills = rest.split(/\s*■\s*/).filter(Boolean).map(parseSkill);
          }
          break;
        case "ATTR":
          hero.attributes = rest.split(SEP).filter(Boolean).map(parseAttr);
          break;
        case "TIER":
          hero.equipTier = Number(rest) || rest;
          break;
        case "BATTLE":
          hero.battle = rest && !/^\(nothing\)$/i.test(rest)
            ? rest.split(SEP).filter(Boolean).map(parseBattleItem)
            : [];
          break;
        case "CIV":
          hero.civilian = rest && !/^\(nothing\)$/i.test(rest)
            ? rest.split(SEP).filter(Boolean).map(parseBattleItem)
            : [];
          break;
        case "CUSTOMS":
          hero.customs =
            rest && !/^\(nothing\)$/i.test(rest)
              ? rest.split(SEP).filter(Boolean).map(parseCustom)
              : [];
          break;
        case "RETINUE":
          hero.retinueSummary = rest || null;
          break;
        case "RETINUE2":
          hero.retinue2Summary = rest || null;
          break;
        case "ACHIEV":
          hero.achievements =
            rest && !/^\(none\)$/i.test(rest) ? rest.split(SEP).filter(Boolean) : [];
          break;
        case "STATS":
          hero.trackedStats = rest.split(SEP).filter(Boolean).map(parseStat);
          break;
        case "ACTIVE":
          hero.activePowers =
            rest && !/^\(none\)$/i.test(rest) ? rest.split(SEP).filter(Boolean) : [];
          break;
        case "PASSIVE":
          hero.passivePowers =
            rest && !/^\(none\)$/i.test(rest) ? rest.split(SEP).filter(Boolean) : [];
          break;
        case "ACH":
          // achievement powers — fold into passive list optionally
          if (rest && !/^\(none\)$/i.test(rest)) {
            hero.passivePowers = [
              ...hero.passivePowers,
              ...rest.split(SEP).filter(Boolean).map((n) => `(ach) ${n}`),
            ];
          }
          break;
        default:
          break;
      }
      continue;
    }

    // Troop list lines: [1-3] Name x 3
    const troop = parseTroopLine(piece);
    if (troop) {
      if (section === "RETINUE2" || hero.retinue2Summary != null && section !== "RETINUE") {
        // heuristic: after RETINUE2 summary, list goes to retinue2
        if (hero.retinue2Summary != null && hero.retinue.length > 0 && section !== "RETINUE") {
          hero.retinue2.push(troop);
        } else if (section === "RETINUE2") {
          hero.retinue2.push(troop);
        } else {
          hero.retinue.push(troop);
        }
      } else {
        hero.retinue.push(troop);
      }
      continue;
    }

    // Gold: "12500⦷" or "12500" + gold icon
    const goldMatch = piece.match(/^(\d+)\s*[⦷Øø]?$/);
    if (goldMatch && hero.gold == null && !piece.includes("HP")) {
      // Prefer pieces that look like gold (number only / with gold icon)
      if (/⦷|Ø/.test(piece) || /^\d+$/.test(piece.trim())) {
        hero.gold = Number(goldMatch[1]);
        continue;
      }
    }
    if (/⦷/.test(piece)) {
      const g = piece.match(/(\d+)\s*⦷/);
      if (g) {
        hero.gold = Number(g[1]);
        continue;
      }
    }

    const hp = piece.match(/^(\d+)\s*\/\s*(\d+)\s*HP$/i);
    if (hp) {
      hero.hp = Number(hp[1]);
      hero.maxHp = Number(hp[2]);
      continue;
    }

    const age = piece.match(/^(\d+)\s*yrs?$/i);
    if (age) {
      hero.age = Number(age[1]);
      continue;
    }

    const clan = piece.match(/^Clan\s+(.+)$/i);
    if (clan) {
      hero.clan = clan[1];
      continue;
    }

    const seen = piece.match(/^Last seen near\s+(.+)$/i);
    if (seen) {
      hero.lastSeen = seen[1];
      continue;
    }

    if (/^(Male|Female)$/i.test(piece)) {
      hero.gender = piece;
      continue;
    }

    // Equipment class name often follows [TIER]
    if (section === "TIER" && !hero.equipClass && !/^\d+$/.test(piece)) {
      hero.equipClass = piece;
      continue;
    }

    // Early free-text fields before tags: class, culture, occupation
    if (section === "general") {
      if (!hero.className && !/^\d/.test(piece) && piece.length < 48) {
        // First non-gold narrative token is usually class
        if (hero.gold != null || /⦷/.test(joined)) {
          if (!hero.className) hero.className = piece;
          else if (!hero.culture) hero.culture = piece;
          else if (!hero.occupation) hero.occupation = piece;
        } else if (hero.className == null) {
          hero.className = piece;
        } else if (hero.culture == null) {
          hero.culture = piece;
        } else if (hero.occupation == null && !/HP/i.test(piece)) {
          hero.occupation = piece;
        }
      }
    }
  }

  // Skills may arrive as separate pieces after [SKILLS] with empty rest
  if (hero.skills.length === 0) {
    const skillPieces = pieces.filter((p) => /\[\s*f?\d+\s*\]/i.test(p));
    if (skillPieces.length) hero.skills = skillPieces.map(parseSkill);
  }

  return hero;
}

export function messageLooksLikeHeroInfo(text, cfg) {
  return isLikelyBltMessage(text, cfg.botPrefix, cfg.botLogin, null);
}

export { stripBotPrefix, isLikelyBltMessage };
