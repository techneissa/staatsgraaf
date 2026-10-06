// Names of decentral office holders as the Register van Overheidsorganisaties and the
// Rijksoverheid write them ("Dhr. mr. J.H.C. van Zanen", "Mw. drs. M.C. Starmans - Gelijns",
// "mr. drs. A.J.G. (Toine) Poppelaars", "Joris Bengevoord") and the match of such a form
// against a person already in data/people.json ("Toine Poppelaars", "Anno Wietze Hiemstra").
//
// The sources give initials, not a stable person id, so the match is deliberately strict:
// surname and initials must agree. The caller adds a second fact (the holder of this very
// position) before it trusts the loose match. Pure functions, no I/O.

import { normalizeName } from "./live-util.mjs";

const HONORIFICS = new Set(["dhr", "mw", "mevr", "hr", "mevrouw", "jhr", "jkvr", "heer"]);
const PREFIX_TITLES = new Set(["mr", "drs", "dr", "ir", "prof", "ing", "ds", "em", "lic", "kand", "bc", "ba", "ma", "msc", "bsc", "llm", "mba", "ec"]);
const SUFFIX_TITLES = new Set(["MBA", "MCM", "RA", "MSM", "BSc", "MSc", "MPM", "MA", "LLM", "MPA", "CMC", "MMC", "RC", "MFM", "BA", "CTW", "MLM", "MHRM", "PMP", "MMR", "MIM", "EMPM"]);
// A surname particle may stand in front of the surname and is never a given name.
const PARTICLES = new Set(["van", "de", "den", "der", "het", "ten", "ter", "te", "op", "in", "aan", "la", "le", "el", "von", "bij", "du", "di", "af", "zu"]);

function bare(token) {
  return token.replace(/\.+$/, "").toLowerCase();
}

function isInitialToken(token) {
  return /^(?:[A-Z][a-z]{0,2}\.)+(?:[A-Z][a-z]{0,2})?$/.test(token);
}

function words(value) {
  return normalizeName(value).split(" ").filter(Boolean);
}

/**
 * Parse a register or Rijksoverheid name form.
 * Returns { raw, display, initials, hasInitials, surnameTokens, givenFirst, nickname }:
 * `display` is the name without honorific, titles and nickname ("J.H.C. van Zanen", "Joris Bengevoord"),
 * `initials` the first letter of each initial, `surnameTokens` the normalised words of the surname.
 */
export function parseHolderName(raw) {
  const original = typeof raw === "string" ? raw : "";
  let nickname = null;
  const text = original
    .replace(/\(([^)]*)\)/g, (_, inner) => {
      if (nickname === null && inner.trim() !== "") nickname = inner.trim();
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  const tokens = text.split(" ").filter(Boolean);
  let start = 0;
  while (start < tokens.length - 1 && (HONORIFICS.has(bare(tokens[start])) || PREFIX_TITLES.has(bare(tokens[start])))) start += 1;
  let end = tokens.length;
  while (end > start + 1 && SUFFIX_TITLES.has(tokens[end - 1].replace(/\.+$/, ""))) end -= 1;
  const body = tokens.slice(start, end);
  const initialTokens = [];
  let index = 0;
  while (index < body.length - 1 && isInitialToken(body[index])) {
    initialTokens.push(body[index]);
    index += 1;
  }
  const initials = initialTokens.flatMap((token) => [...token.matchAll(/[A-Z][a-z]{0,2}/g)].map((match) => match[0][0].toLowerCase()));
  const restWords = body.slice(index).join(" ").replace(/\s*-\s*/g, "-").split(" ").filter(Boolean);
  const hasInitials = initials.length > 0;
  let givenWord = null;
  let surnameWords = restWords;
  // "Joris Bengevoord": the first word is a given name, unless it is a particle or part of a double surname ("Gräper-van Koolwijk").
  if (!hasInitials && restWords.length > 1 && !PARTICLES.has(restWords[0].toLowerCase()) && !restWords[0].includes("-")) {
    givenWord = restWords[0];
    surnameWords = restWords.slice(1);
  }
  const display = hasInitials ? `${initialTokens.join("")} ${surnameWords.join(" ")}`.trim() : restWords.join(" ");
  return {
    raw: original,
    display: display || original.trim(),
    initials,
    hasInitials,
    surnameTokens: words(surnameWords.join(" ")),
    givenFirst: givenWord ? givenWord[0].toLowerCase() : null,
    nickname,
  };
}

function startsWithTokens(longer, shorter) {
  return shorter.length > 0 && shorter.length <= longer.length && shorter.every((token, i) => longer[i] === token);
}

/** The ways to read a full name as given names plus surname: [{ surname: tokens, given: first letters }]. */
function readings(form) {
  const known = parseHolderName(form);
  if (known.hasInitials) return [{ surname: known.surnameTokens, given: known.initials }];
  const all = words(form.replace(/\([^)]*\)/g, " "));
  const out = [];
  for (let cut = all.length <= 1 ? 0 : 1; cut < all.length; cut += 1) out.push({ surname: all.slice(cut), given: all.slice(0, cut).map((word) => word[0]) });
  return out;
}

/**
 * Does `parsed` (a register form) fit `person` ({ name, aliases })?
 *
 * Default (the holder of the same position, where the position is the second fact): the surname decides,
 * a partner name on one side only counts ("W.J.F. van der Rijt-van der Kruis" and "Wilma van der Rijt"),
 * and initials are not compared, because the dataset often holds the call name ("Hein van der Loo" for "W.H.J.M. van der Loo").
 *
 * `pool: true` (a search across people with no position fact): the surname must be exactly the same and the
 * register must give initials, one of which is the first letter of a given name (or of the call name) of the person.
 */
export function holderMatchesPerson(parsed, person, { pool = false } = {}) {
  const forms = [person.name, ...(Array.isArray(person.aliases) ? person.aliases : [])].filter((form) => typeof form === "string" && form !== "");
  for (const form of forms) {
    if (normalizeName(form) === normalizeName(parsed.raw) || normalizeName(form) === normalizeName(parsed.display)) return true;
    for (const reading of readings(form)) {
      const sur = reading.surname;
      const same = sur.length === parsed.surnameTokens.length && sur.every((token, i) => token === parsed.surnameTokens[i]);
      if (!pool) {
        if (same || startsWithTokens(sur, parsed.surnameTokens) || startsWithTokens(parsed.surnameTokens, sur)) return true;
        continue;
      }
      if (!same || !parsed.hasInitials || reading.given.length === 0) continue;
      const known = parseHolderName(form);
      if (known.hasInitials) {
        const common = Math.min(known.initials.length, parsed.initials.length);
        if (known.initials.slice(0, common).every((letter, i) => letter === parsed.initials[i])) return true;
      } else if (reading.given.some((letter) => parsed.initials.includes(letter[0]))) return true;
    }
  }
  return false;
}
