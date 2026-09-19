#!/usr/bin/env bun
/**
 * Layout variant renderer for the graph rebuild (docs/13-graph-rebuild-plan.md,
 * phase 1). Reads the real bundle in web/public/graph.json and writes one SVG
 * per variant plus report.md with the computed criteria, so the owner decides
 * P1 (main layout) on real counts, real labels and real overlap.
 *
 * Variants:
 *   C   sectors v3, the current layout (control)
 *   A1  polder poles, five poles, Koninkrijk and Caribisch Nederland in an outer band
 *   A2  polder poles, six poles, Koninkrijk as a pole
 *   A3  polder poles, medeoverheden split into provincies, gemeenten, waterschappen
 *   B   concentric shells by constitutional distance
 *   D   A2 with the Grondwet and Statuut drawn as frame rings
 *   A2-H1, A2-H2  A2 with the Staten-Generaal pole drawn as hemicycles, opening
 *                 toward the hub (H1) or away from it (H2)
 *
 * No app code changes here. Everything is deterministic: no randomness, no time.
 *
 * Run: bun research/graph-variants/render-variants.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  GLYPH_BY_SUBTYPE,
  GLYPH_GAP,
  HUB_RADIUS,
  SECTOR_ORDER,
  compareNames,
  computeDepths,
  computeLayout,
  glyphFootprint,
  glyphRadiusForDegree,
  placeRing,
} from "../../web/lib/graph.ts";
import { glyphPath, hubBurstPath } from "../../web/components/graph/glyph.ts";
import { ORG_BRANCH_LABELS } from "../../web/lib/labels.ts";
import { isSplinterGroup, partyByDataset } from "../../web/lib/parties.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = fileURLToPath(new URL("./", import.meta.url));
const bundle = JSON.parse(readFileSync(`${ROOT}web/public/graph.json`, "utf8"));
const memberships = JSON.parse(readFileSync(`${ROOT}data/memberships.json`, "utf8"));
const coalitions = JSON.parse(readFileSync(`${ROOT}data/coalitions.json`, "utf8"));
const tokensCss = readFileSync(`${ROOT}web/app/generated/tokens.css`, "utf8");

const hubId = bundle.hub?.id ?? null;
const allNodes = bundle.nodes.filter((node) => node.id !== hubId);
const byId = new Map(bundle.nodes.map((node) => [node.id, node]));
const depths = computeDepths(bundle.nodes);
const allEdges = bundle.edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to));

/**
 * Collapse option: a gemeente, provincie, waterschap or openbaar lichaam is
 * drawn as one mark carrying its raad/staten/bestuur and its commissie as
 * orbit dots, instead of three separate nodes. The children stay in the data
 * and open on focus in the app; here they only leave the packing.
 */
const COLLAPSE_CHILD = new Set(["gemeenteraad", "provinciale-staten", "algemeen-bestuur-waterschap", "eilandsraad", "commissie"]);
const COLLAPSE_PARENT = new Set(["gemeente", "provincie", "waterschap", "openbaar-lichaam-bes"]);
const collapsedInto = new Map();
for (const node of allNodes) {
  const parent = node.parent ? byId.get(node.parent) : null;
  if (parent && COLLAPSE_CHILD.has(node.subtype) && COLLAPSE_PARENT.has(parent.subtype)) collapsedInto.set(node.id, parent.id);
}
const orbitCount = new Map();
for (const parentId of collapsedInto.values()) orbitCount.set(parentId, (orbitCount.get(parentId) ?? 0) + 1);

let nodes = allNodes;
let edges = allEdges;
let collapsing = false;
function setCollapse(on) {
  collapsing = on;
  if (!on) {
    nodes = allNodes;
    edges = allEdges;
    return;
  }
  nodes = allNodes.filter((node) => !collapsedInto.has(node.id));
  const seen = new Set();
  edges = [];
  for (const edge of allEdges) {
    const from = collapsedInto.get(edge.from) ?? edge.from;
    const to = collapsedInto.get(edge.to) ?? edge.to;
    if (from === to) continue;
    const key = `${from}|${to}|${edge.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ from, to, type: edge.type });
  }
}

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

function branchColor(branch) {
  const match = tokensCss.match(new RegExp(`--t-color-sector-${branch}: (#[0-9A-Fa-f]{6})`));
  return match ? match[1] : "#8A8FA3";
}

const EDGE_COLOR = {
  elects: "#D97A26",
  oversees: "#5B8DD9",
  advises: "#4C9E5C",
  part_of: "#8A8FA3",
  consists_of: "#8A8FA3",
  accountable_to: "#E05B5B",
};

function round(value) {
  return Math.round(value * 100) / 100;
}

function sortByDepthName(list) {
  return [...list].sort((a, b) => {
    const da = depths.get(a.id) ?? 0;
    const db = depths.get(b.id) ?? 0;
    if (da !== db) return da - db;
    return compareNames(a.name, b.name, a.id, b.id);
  });
}

/** Pack `list` on concentric rings around (cx, cy) inside the local arc [from, to]. */
function packRings(list, cx, cy, startRadius, step, from, to, placed) {
  let index = 0;
  let radius = startRadius;
  let outer = startRadius;
  while (index < list.length) {
    const ring = placeRing(list, index, from, to, radius);
    if (ring.length === 0) {
      radius += step;
      continue;
    }
    for (const { node, angle } of ring) {
      placed.set(node.id, {
        node,
        x: round(cx + Math.cos(angle) * radius),
        y: round(cy + Math.sin(angle) * radius),
        localAngle: angle,
        localRadius: radius,
      });
      outer = Math.max(outer, radius + glyphFootprint(node));
    }
    index += ring.length;
    radius += step;
  }
  return outer;
}

function ringStepFor(list) {
  let ceiling = 0;
  for (const node of list) ceiling = Math.max(ceiling, glyphFootprint(node));
  return Math.max(15, Math.ceil((2 * ceiling + GLYPH_GAP + 3) / 5) * 5);
}

// ---------------------------------------------------------------------------
// Poles
// ---------------------------------------------------------------------------

const MEDEOVERHEDEN = new Set(["decentraal-provinciaal", "decentraal-lokaal", "waterschap", "caribisch-nederland"]);

const POLE_DEFS = {
  "staten-generaal": {
    label: "Staten-Generaal",
    color: branchColor("staten-generaal"),
    member: (node) => node.branch === "staten-generaal",
    anchor: (node) => node.subtype === "tweede-kamer" || node.subtype === "eerste-kamer",
  },
  regering: {
    label: "Regering en kabinet",
    color: branchColor("regering"),
    member: (node) => node.branch === "regering" || node.branch === "zelfstandig",
    anchor: (node) => node.subtype === "ministerie" && node.branch === "regering",
    /** Bodies at arm's length (Kaderwet zbo) go on an outer band, not nested. */
    band: (node) => node.branch === "zelfstandig",
  },
  "rechterlijke-macht": {
    label: "Rechterlijke macht",
    color: branchColor("rechterlijke-macht"),
    member: (node) => node.branch === "rechterlijke-macht",
    anchor: (node) => node.id === "org:hoge-raad-der-nederlanden" || node.name === "Hoge Raad der Nederlanden",
  },
  "hoge-colleges": {
    label: "Hoge Colleges en adviescolleges",
    color: branchColor("hoge-colleges"),
    member: (node) => node.branch === "hoge-colleges" || node.branch === "adviescolleges",
    anchor: (node) => node.subtype === "hoge-college",
  },
  medeoverheden: {
    label: "Medeoverheden",
    color: branchColor("decentraal-lokaal"),
    member: (node) => MEDEOVERHEDEN.has(node.branch),
    anchor: (node) => node.subtype === "koepel",
  },
  provincies: {
    label: "Provincies",
    color: branchColor("decentraal-provinciaal"),
    member: (node) => node.branch === "decentraal-provinciaal",
    anchor: (node) => node.subtype === "koepel",
  },
  gemeenten: {
    label: "Gemeenten",
    color: branchColor("decentraal-lokaal"),
    member: (node) => node.branch === "decentraal-lokaal" || node.branch === "caribisch-nederland",
    anchor: (node) => node.subtype === "koepel",
  },
  waterschappen: {
    label: "Waterschappen",
    color: branchColor("waterschap"),
    member: (node) => node.branch === "waterschap",
    anchor: (node) => node.subtype === "koepel",
  },
  koninkrijk: {
    label: "Koninkrijk",
    color: branchColor("koninkrijk"),
    member: (node) => node.branch === "koninkrijk",
    anchor: (node) => node.subtype === "land-regering",
  },
};

const NOTCH = 60 * DEG;
const POLE_GAP = 40;
const ANCHOR_CLEARANCE = 22;
const BAND_GAP = 16;

/**
 * Pack one pole around a local origin. Anchors sit at the centre (one) or on a
 * small ring (several); members fill rings outside them, over the full circle
 * minus a notch facing the hub so the spoke stays clear. Band members go on an
 * outer band after a visible gap. Returns local coordinates and the pole radius.
 */
function packPole(def, members, options = {}) {
  const placed = new Map();
  const anchors = sortByDepthName(members.filter((node) => def.anchor(node)));
  const bandMembers = def.band ? members.filter((node) => def.band(node) && !def.anchor(node)) : [];
  const bandSet = new Set(bandMembers.map((node) => node.id));
  const rest = sortByDepthName(members.filter((node) => !def.anchor(node) && !bandSet.has(node.id)));

  let inner = 0;
  if (options.hemicycle) {
    // The chambers are drawn as hemicycles; their anchors sit at the pole
    // centre so edges to them still resolve and the node count stays complete.
    for (const anchor of anchors) placed.set(anchor.id, { node: anchor, x: 0, y: 0, localAngle: 0, localRadius: 0, hidden: true });
    inner = options.hemicycle.outer + 14;
  } else if (anchors.length === 1) {
    placed.set(anchors[0].id, { node: anchors[0], x: 0, y: 0, localAngle: 0, localRadius: 0 });
    inner = glyphFootprint(anchors[0]) + ANCHOR_CLEARANCE;
  } else if (anchors.length > 1) {
    const anchorRadius = Math.max(
      14,
      anchors.reduce((sum, node) => sum + 2 * glyphFootprint(node) + GLYPH_GAP, 0) / TAU + 4,
    );
    packRings(anchors, 0, 0, anchorRadius, 12, -Math.PI / 2, -Math.PI / 2 + TAU, placed);
    inner = anchorRadius + Math.max(...anchors.map(glyphFootprint)) + ANCHOR_CLEARANCE;
  }

  // Local arc: full circle minus the notch. The notch faces the hub, which in
  // local coordinates is at angle pi relative to the pole's own direction; the
  // caller rotates the pole so we pack relative to "outward = 0".
  const from = -Math.PI + NOTCH / 2;
  const to = Math.PI - NOTCH / 2;
  let outer = inner;
  if (rest.length > 0) outer = packRings(rest, 0, 0, inner, ringStepFor(rest), from, to, placed);
  let bandInner = null;
  if (bandMembers.length > 0) {
    bandInner = outer + BAND_GAP;
    outer = packRings(sortByDepthName(bandMembers), 0, 0, bandInner, ringStepFor(bandMembers), from, to, placed);
  }
  return { placed, radius: outer, bandInner, anchors };
}

function rotatePoint(x, y, angle) {
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) };
}

/**
 * Polder layout: poles at fixed angles and one distance from the hub. Angular
 * spacing between neighbours is proportional to the sum of their radii, and the
 * distance is raised until no two neighbouring poles can touch.
 */
function layoutPoles(poleIds, options = {}) {
  const assigned = new Set();
  const poles = poleIds.map((id) => {
    const def = POLE_DEFS[id];
    const members = nodes.filter((node) => !assigned.has(node.id) && def.member(node));
    for (const node of members) assigned.add(node.id);
    const packed = packPole(def, members, id === "staten-generaal" ? { hemicycle: options.hemicycle } : {});
    return { id, def, members, ...packed };
  });
  const leftover = nodes.filter((node) => !assigned.has(node.id));

  const count = poles.length;
  const weights = poles.map((pole, index) => pole.radius + poles[(index + 1) % count].radius + POLE_GAP);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const spans = weights.map((weight) => (weight / weightTotal) * TAU);
  let distance = HUB_RADIUS + 70 + Math.max(...poles.map((pole) => pole.radius));
  for (let index = 0; index < count; index += 1) {
    const needed = weights[index] / (2 * Math.sin(spans[index] / 2));
    distance = Math.max(distance, needed);
  }
  const placed = new Map();
  let angle = -Math.PI / 2;
  const centres = [];
  for (let index = 0; index < count; index += 1) {
    const pole = poles[index];
    const d = pole.id === "koninkrijk" && options.koninkrijkDistance ? options.koninkrijkDistance(distance, pole.radius) : distance;
    const cx = Math.cos(angle) * d;
    const cy = Math.sin(angle) * d;
    centres.push({ ...pole, angle, cx, cy, distance: d });
    for (const [id, local] of pole.placed) {
      const rotated = rotatePoint(local.x, local.y, angle);
      placed.set(id, { node: local.node, x: round(cx + rotated.x), y: round(cy + rotated.y), pole: pole.id, hidden: local.hidden === true });
    }
    angle += spans[index];
  }

  // Leftovers (branches no pole claims) go on an outer band around everything.
  let outerReach = Math.max(...centres.map((pole) => pole.distance + pole.radius));
  if (leftover.length > 0) {
    const bandRadius = outerReach + 50;
    outerReach = packRings(sortByDepthName(leftover), 0, 0, bandRadius, ringStepFor(leftover), -Math.PI / 2, -Math.PI / 2 + TAU, placed);
    for (const node of leftover) {
      const entry = placed.get(node.id);
      if (entry) entry.pole = "band";
    }
  }
  return { placed, poles: centres, distance, outerReach, leftover };
}

// ---------------------------------------------------------------------------
// Fans (variant A4): poles as annular sectors outward from a shared base radius.
// Same grouping as the discs, same geometry family as the current layout, so
// the comparison isolates grouping from shape.
// ---------------------------------------------------------------------------

const FAN_BASE = HUB_RADIUS + 46;
const FAN_GUTTER = 4 * DEG;

function layoutFans(poleIds) {
  const assigned = new Set();
  const groups = poleIds.map((id) => {
    const def = POLE_DEFS[id];
    const members = nodes.filter((node) => !assigned.has(node.id) && def.member(node));
    for (const node of members) assigned.add(node.id);
    const anchors = sortByDepthName(members.filter((node) => def.anchor(node)));
    const band = def.band ? members.filter((node) => def.band(node) && !def.anchor(node)) : [];
    const bandSet = new Set(band.map((node) => node.id));
    const rest = sortByDepthName(members.filter((node) => !def.anchor(node) && !bandSet.has(node.id)));
    const demand = members.reduce((sum, node) => sum + glyphFootprint(node) * 2 + GLYPH_GAP, 0);
    return { id, def, members, anchors, band: sortByDepthName(band), rest, weight: Math.sqrt(Math.max(1, demand)) };
  });
  const leftover = nodes.filter((node) => !assigned.has(node.id));
  const usable = TAU - groups.length * FAN_GUTTER;
  const weightTotal = groups.reduce((sum, group) => sum + group.weight, 0);
  const minSpan = 14 * DEG;
  let spans = groups.map((group) => Math.max(minSpan, (group.weight / weightTotal) * usable));
  const excess = spans.reduce((sum, value) => sum + value, 0) - usable;
  if (excess > 0) {
    const flexible = spans.reduce((sum, value) => sum + Math.max(0, value - minSpan), 0);
    spans = spans.map((value) => Math.max(minSpan, value - (excess * Math.max(0, value - minSpan)) / flexible));
  }

  const placed = new Map();
  const fans = [];
  let cursor = -Math.PI / 2 - spans[0] / 2;
  let outerReach = FAN_BASE;
  groups.forEach((group, index) => {
    const start = cursor + FAN_GUTTER / 2;
    const end = start + spans[index];
    const mid = (start + end) / 2;
    // Anchors sit on the base ring centred on the fan; the rest packs outward.
    let radius = FAN_BASE;
    if (group.anchors.length > 0) {
      const anchorSpan = group.anchors.reduce((sum, node) => sum + (2 * glyphFootprint(node) + GLYPH_GAP) / FAN_BASE, 0);
      const aStart = Math.max(start, mid - anchorSpan / 2);
      radius = packRings(group.anchors, 0, 0, FAN_BASE, ringStepFor(group.anchors), aStart, Math.min(end, aStart + anchorSpan + 0.01), placed) + 14;
    }
    let outer = radius;
    if (group.rest.length > 0) outer = packRings(group.rest, 0, 0, radius, ringStepFor(group.rest), start, end, placed);
    let bandInner = null;
    if (group.band.length > 0) {
      bandInner = outer + BAND_GAP;
      outer = packRings(group.band, 0, 0, bandInner, ringStepFor(group.band), start, end, placed);
    }
    for (const node of group.members) {
      const entry = placed.get(node.id);
      if (entry) entry.pole = group.id;
    }
    fans.push({ ...group, start, end, mid, outer, bandInner });
    outerReach = Math.max(outerReach, outer);
    cursor = end + FAN_GUTTER / 2;
  });
  if (leftover.length > 0) {
    outerReach = packRings(sortByDepthName(leftover), 0, 0, outerReach + 40, ringStepFor(leftover), -Math.PI / 2, -Math.PI / 2 + TAU, placed);
    for (const node of leftover) {
      const entry = placed.get(node.id);
      if (entry) entry.pole = "band";
    }
  }
  return { placed, fans, outerReach, leftover };
}

function fanChrome(result) {
  const parts = [];
  for (const fan of result.fans) {
    const r0 = FAN_BASE - 12;
    const r1 = fan.outer + 12;
    const p = (r, a) => `${round(Math.cos(a) * r)} ${round(Math.sin(a) * r)}`;
    const large = fan.end - fan.start > Math.PI ? 1 : 0;
    parts.push(
      `<path d="M ${p(r0, fan.start)} L ${p(r1, fan.start)} A ${round(r1)} ${round(r1)} 0 ${large} 1 ${p(r1, fan.end)} L ${p(r0, fan.end)} A ${round(r0)} ${round(r0)} 0 ${large} 0 ${p(r0, fan.start)} Z" fill="${fan.def.color}" fill-opacity="0.06" stroke="${fan.def.color}" stroke-opacity="0.3" stroke-width="0.8"/>`,
    );
    if (fan.bandInner !== null) {
      const rb = fan.bandInner - BAND_GAP / 2;
      parts.push(`<path d="M ${p(rb, fan.start)} A ${round(rb)} ${round(rb)} 0 ${large} 1 ${p(rb, fan.end)}" fill="none" stroke="${fan.def.color}" stroke-opacity="0.5" stroke-width="0.8" stroke-dasharray="4 3"/>`);
    }
    const lr = result.outerReach + 40;
    parts.push(`<text x="${round(Math.cos(fan.mid) * lr)}" y="${round(Math.sin(fan.mid) * lr)}" font-size="18" font-weight="600" letter-spacing="0.12em" text-anchor="middle" dominant-baseline="middle" fill="${fan.def.color}">${escape(fan.def.label.toUpperCase())} (${fan.members.length})</text>`);
  }
  return parts.join("\n");
}

function renderFans(id, title, poleIds, collapse) {
  setCollapse(collapse);
  const result = layoutFans(poleIds);
  const groupOf = (entry) => entry.pole;
  const metrics = record(id, title, result.placed, groupOf, result.outerReach + 70, {
    poles: result.fans.map((f) => `${f.id}:${f.members.length}/${Math.round(f.outer)}`).join(" "),
    band: result.leftover.length,
    collapsed: collapse ? collapsedInto.size : 0,
  });
  writeFileSync(
    `${OUT}${id}.svg`,
    wrapSvg(
      [fanChrome(result), edgesSvg(result.placed, groupOf), nodesSvg(result.placed), hubSvg(), anchorLabels(result.placed, LABEL_ANCHOR)].join("\n"),
      result.outerReach + 70,
      title,
      `nodes ${metrics.nodes}${collapse ? ` (${collapsedInto.size} raden en commissies collapsed into their body)` : ""}, overlaps ${metrics.overlaps}, edges through the hub ${metrics.crossHub}, cross-pole edges ${metrics.crossGroup}, longest edge ${metrics.longest}`,
    ),
  );
  setCollapse(false);
  return result;
}

// ---------------------------------------------------------------------------
// Shells (variant B)
// ---------------------------------------------------------------------------

const SHELLS = [
  { label: "Hoge Colleges van Staat", member: (n) => n.branch === "hoge-colleges" },
  { label: "Politieke kern", member: (n) => n.branch === "staten-generaal" || (n.branch === "regering" && n.subtype === "ministerie") },
  { label: "Beleid en uitvoering", member: (n) => n.branch === "regering" || n.branch === "adviescolleges" || n.branch === "rechterlijke-macht" },
  { label: "Op afstand", member: (n) => n.branch === "zelfstandig" },
  { label: "Medeoverheden", member: (n) => MEDEOVERHEDEN.has(n.branch) },
  { label: "Koninkrijk", member: (n) => n.branch === "koninkrijk" },
];

function layoutShells() {
  const placed = new Map();
  const assigned = new Set();
  const shells = [];
  let radius = HUB_RADIUS + 40;
  for (const shell of SHELLS) {
    const members = nodes.filter((node) => !assigned.has(node.id) && shell.member(node));
    for (const node of members) assigned.add(node.id);
    const sorted = [...members].sort((a, b) => {
      const ia = SECTOR_ORDER.indexOf(a.branch);
      const ib = SECTOR_ORDER.indexOf(b.branch);
      if (ia !== ib) return ia - ib;
      if (a.subtype !== b.subtype) return a.subtype < b.subtype ? -1 : 1;
      return compareNames(a.name, b.name, a.id, b.id);
    });
    const inner = radius;
    const outer = sorted.length > 0 ? packRings(sorted, 0, 0, inner, ringStepFor(sorted), -Math.PI / 2, -Math.PI / 2 + TAU, placed) : inner;
    shells.push({ label: shell.label, inner, outer, count: members.length });
    radius = outer + 34;
  }
  const leftover = nodes.filter((node) => !assigned.has(node.id));
  return { placed, shells, outerReach: radius, leftover };
}

// ---------------------------------------------------------------------------
// Hemicycle
// ---------------------------------------------------------------------------

const TK_ROWS = [22, 26, 30, 34, 38];
const EK_ROWS = [21, 25, 29];

/**
 * Seats of a ∩ hemicycle centred on (0, 0). Rows are concentric arcs from left
 * (angle pi) to right (angle 0) in the upper half plane; `flip` mirrors it to
 * the lower half. Seats are returned sorted by angle from left to right so a
 * consecutive fill produces contiguous wedges per fractie.
 */
function hemicycleSeats(rows, r0, step, flip = false) {
  const seats = [];
  rows.forEach((count, rowIndex) => {
    const radius = r0 + rowIndex * step;
    for (let seat = 0; seat < count; seat += 1) {
      const t = count === 1 ? 0.5 : seat / (count - 1);
      const angle = Math.PI + t * Math.PI;
      const sign = flip ? -1 : 1;
      seats.push({ angle: t, x: Math.cos(angle) * radius, y: sign * Math.sin(angle) * radius, row: rowIndex, radius });
    }
  });
  seats.sort((a, b) => a.angle - b.angle || a.row - b.row);
  return seats;
}

function tallyFor(orgId) {
  const current = memberships.filter((m) => m.organization === orgId && m.end === null);
  const grouped = new Map();
  for (const m of current) {
    const fractie = m.fractie ?? "onbekend";
    const party = partyByDataset(fractie);
    const key = party?.key ?? fractie;
    const entry = grouped.get(key) ?? {
      key,
      label: party?.abbrev ?? fractie,
      color: party?.color ?? "#9AA0AE",
      splinter: isSplinterGroup(fractie),
      seats: 0,
    };
    entry.seats += 1;
    grouped.set(key, entry);
  }
  const entries = [...grouped.values()].sort((a, b) => b.seats - a.seats || (a.label < b.label ? -1 : 1));
  return { total: current.length, majority: Math.floor(current.length / 2) + 1, entries };
}

function hemicycleSvg(orgId, rows, r0, step, seatRadius, flip, offsetX = 0, offsetY = 0, showLabels = true) {
  const tally = tallyFor(orgId);
  const seats = hemicycleSeats(rows, r0, step, flip);
  const parts = [];
  let cursor = 0;
  const labels = [];
  for (const entry of tally.entries) {
    const block = seats.slice(cursor, cursor + entry.seats);
    for (const seat of block) {
      parts.push(
        `<circle cx="${round(offsetX + seat.x)}" cy="${round(offsetY + seat.y)}" r="${seatRadius}" fill="${entry.color}"${entry.splinter ? ' stroke="#5B6070" stroke-width="0.5"' : ""}><title>${escape(entry.label)}</title></circle>`,
      );
    }
    if (showLabels && block.length >= 9) {
      const mid = block[Math.floor(block.length / 2)];
      const labelRadius = r0 + rows.length * step + 6;
      const angle = Math.PI + mid.angle * Math.PI;
      const lx = offsetX + Math.cos(angle) * labelRadius;
      const ly = offsetY + (flip ? -1 : 1) * Math.sin(angle) * labelRadius;
      labels.push(`<text x="${round(lx)}" y="${round(ly)}" font-size="${seatRadius * 2.2}" text-anchor="middle" fill="#2B2F3A">${escape(entry.label)} ${entry.seats}</text>`);
    }
    cursor += entry.seats;
  }
  // Majority marker at the boundary before seat `majority` (1-based).
  const boundary = seats[tally.majority - 1];
  const before = seats[tally.majority - 2];
  const t = before ? (boundary.angle + before.angle) / 2 : boundary.angle;
  const angle = Math.PI + t * Math.PI;
  const sign = flip ? -1 : 1;
  const rIn = r0 - step * 0.9;
  const rOut = r0 + rows.length * step - step * 0.1;
  parts.push(
    `<line x1="${round(offsetX + Math.cos(angle) * rIn)}" y1="${round(offsetY + sign * Math.sin(angle) * rIn)}" x2="${round(offsetX + Math.cos(angle) * rOut)}" y2="${round(offsetY + sign * Math.sin(angle) * rOut)}" stroke="#1F2330" stroke-width="${seatRadius * 0.5}" stroke-dasharray="${seatRadius} ${seatRadius * 0.6}"/>`,
  );
  if (showLabels) {
    parts.push(`<text x="${round(offsetX)}" y="${round(offsetY + (flip ? 1 : -1) * (r0 * 0.45))}" font-size="${seatRadius * 1.6}" text-anchor="middle" fill="#1F2330" font-weight="600">${tally.total} zetels</text>`);
    parts.push(`<text x="${round(offsetX)}" y="${round(offsetY + (flip ? 1 : -1) * (r0 * 0.45) + seatRadius * 2)}" font-size="${seatRadius * 1.2}" text-anchor="middle" fill="#5B6070">meerderheid ${tally.majority}</text>`);
  }
  if (showLabels) {
    const small = tally.entries.filter((entry) => entry.seats < 9);
    small.forEach((entry, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const lx = offsetX - 1.5 * 100 + col * 100;
      const ly = offsetY + 26 + row * 16;
      labels.push(`<circle cx="${round(lx)}" cy="${round(ly)}" r="5" fill="${entry.color}"/><text x="${round(lx + 9)}" y="${round(ly + 4)}" font-size="11" fill="#2B2F3A">${escape(entry.label)} ${entry.seats}</text>`);
    });
  }
  const outer = r0 + (rows.length - 1) * step + seatRadius;
  return { svg: parts.join("\n") + "\n" + labels.join("\n"), tally, outer };
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

function overlapCount(placed) {
  const cell = 24;
  const grid = new Map();
  const entries = [...placed.values()].filter((entry) => !entry.hidden);
  for (const entry of entries) {
    const key = `${Math.floor(entry.x / cell)}|${Math.floor(entry.y / cell)}`;
    const list = grid.get(key);
    if (list) list.push(entry);
    else grid.set(key, [entry]);
  }
  let overlaps = 0;
  for (const entry of entries) {
    const gx = Math.floor(entry.x / cell);
    const gy = Math.floor(entry.y / cell);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const other of grid.get(`${gx + dx}|${gy + dy}`) ?? []) {
          if (other.node.id <= entry.node.id) continue;
          const need = glyphFootprint(entry.node) + glyphFootprint(other.node);
          if (Math.hypot(other.x - entry.x, other.y - entry.y) < need - 0.01) {
            overlaps += 1;
            if (process.env.DEBUG_OVERLAP) console.error(`overlap: ${entry.node.id} <> ${other.node.id}`);
          }
        }
      }
    }
  }
  return overlaps;
}

function segmentDistanceToOrigin(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x1, y1);
  const t = Math.max(0, Math.min(1, -(x1 * dx + y1 * dy) / len2));
  return Math.hypot(x1 + t * dx, y1 + t * dy);
}

function edgeMetrics(placed, groupOf) {
  let crossHub = 0;
  let longest = 0;
  let crossGroup = 0;
  let drawn = 0;
  for (const edge of edges) {
    if (edge.from === hubId || edge.to === hubId) continue;
    const a = placed.get(edge.from);
    const b = placed.get(edge.to);
    if (!a || !b) continue;
    drawn += 1;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    longest = Math.max(longest, len);
    if (groupOf(a) !== groupOf(b)) crossGroup += 1;
    if (segmentDistanceToOrigin(a.x, a.y, b.x, b.y) < HUB_RADIUS) crossHub += 1;
  }
  return { drawn, crossHub, longest: Math.round(longest), crossGroup };
}

// ---------------------------------------------------------------------------
// SVG output
// ---------------------------------------------------------------------------

function escape(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function nodesSvg(placed) {
  const parts = [];
  for (const entry of placed.values()) {
    if (entry.hidden) continue;
    const node = entry.node;
    const glyph = GLYPH_BY_SUBTYPE[node.subtype] ?? "dot";
    parts.push(
      `<path transform="translate(${entry.x} ${entry.y})" d="${glyphPath(glyph, glyphRadiusForDegree(node.degree))}" fill="${branchColor(node.branch)}" opacity="0.85"><title>${escape(node.name)} (${node.subtype})</title></path>`,
    );
    const orbits = collapsing ? orbitCount.get(node.id) ?? 0 : 0;
    if (orbits > 0) {
      const r = glyphFootprint(node) + 1.6;
      const outward = Math.atan2(entry.y, entry.x);
      for (let k = 0; k < orbits; k += 1) {
        const a = outward + (k - (orbits - 1) / 2) * (50 * DEG);
        parts.push(`<circle cx="${round(entry.x + Math.cos(a) * r)}" cy="${round(entry.y + Math.sin(a) * r)}" r="0.9" fill="${branchColor(node.branch)}" opacity="0.7"/>`);
      }
    }
  }
  return parts.join("\n");
}

function edgesSvg(placed, groupOf) {
  const parts = [];
  for (const edge of edges) {
    if (edge.from === hubId || edge.to === hubId) continue;
    const a = placed.get(edge.from);
    const b = placed.get(edge.to);
    if (!a || !b) continue;
    const cross = groupOf(a) !== groupOf(b);
    const color = cross ? EDGE_COLOR[edge.type] ?? "#8A8FA3" : "#8A8FA3";
    parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="${cross ? 0.9 : 0.5}" opacity="${cross ? 0.55 : 0.22}"/>`);
  }
  // Hub edges: drawn from the hub to the target.
  for (const edge of edges) {
    const other = edge.from === hubId ? edge.to : edge.to === hubId ? edge.from : null;
    if (!other) continue;
    const b = placed.get(other);
    if (!b) continue;
    parts.push(`<line x1="0" y1="0" x2="${b.x}" y2="${b.y}" stroke="${EDGE_COLOR[edge.type] ?? "#8A8FA3"}" stroke-width="1.4" opacity="0.8"/>`);
  }
  return parts.join("\n");
}

function hubSvg() {
  return `<g><path d="${hubBurstPath(HUB_RADIUS)}" fill="#D97A26" opacity="0.95"/><text text-anchor="middle" font-size="15" font-weight="700" fill="#FFFFFF"><tspan x="0" dy="-6">Kiesgerechtigden</tspan><tspan x="0" dy="17">Nederland</tspan></text></g>`;
}

function wrapSvg(inner, reach, title, notes) {
  const r = reach + 90;
  const size = r * 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-r} ${-r - 60} ${size} ${size + 60}" width="${Math.round(size)}" height="${Math.round(size + 60)}" font-family="system-ui, sans-serif">
<rect x="${-r}" y="${-r - 60}" width="${size}" height="${size + 60}" fill="#FBFAF7"/>
<text x="${-r + 20}" y="${-r - 30}" font-size="26" font-weight="700" fill="#1F2330">${escape(title)}</text>
<text x="${-r + 20}" y="${-r - 8}" font-size="13" fill="#5B6070">${escape(notes)}</text>
${inner}
</svg>
`;
}

function poleChrome(result) {
  const parts = [];
  for (const pole of result.poles) {
    parts.push(`<circle cx="${round(pole.cx)}" cy="${round(pole.cy)}" r="${round(pole.radius + 10)}" fill="${pole.def.color}" fill-opacity="0.06" stroke="${pole.def.color}" stroke-opacity="0.35" stroke-width="0.8"/>`);
    if (pole.bandInner !== null && pole.bandInner !== undefined) {
      parts.push(`<circle cx="${round(pole.cx)}" cy="${round(pole.cy)}" r="${round(pole.bandInner - BAND_GAP / 2)}" fill="none" stroke="${pole.def.color}" stroke-opacity="0.5" stroke-width="0.8" stroke-dasharray="4 3"/>`);
    }
    const lx = Math.cos(pole.angle) * (pole.distance + pole.radius + 28);
    const ly = Math.sin(pole.angle) * (pole.distance + pole.radius + 28);
    parts.push(`<text x="${round(lx)}" y="${round(ly)}" font-size="18" font-weight="600" letter-spacing="0.12em" text-anchor="middle" fill="${pole.def.color}">${escape(pole.def.label.toUpperCase())} (${pole.members.length})</text>`);
    parts.push(`<line x1="${round(Math.cos(pole.angle) * (HUB_RADIUS + 4))}" y1="${round(Math.sin(pole.angle) * (HUB_RADIUS + 4))}" x2="${round(pole.cx - Math.cos(pole.angle) * (pole.radius + 10))}" y2="${round(pole.cy - Math.sin(pole.angle) * (pole.radius + 10))}" stroke="${pole.def.color}" stroke-opacity="0.35" stroke-width="1.2" stroke-dasharray="2 4"/>`);
  }
  return parts.join("\n");
}

function anchorLabels(placed, predicate, size = 9) {
  const parts = [];
  for (const entry of placed.values()) {
    if (entry.hidden || !predicate(entry.node)) continue;
    parts.push(`<text x="${round(entry.x + glyphFootprint(entry.node) + 3)}" y="${round(entry.y + 3)}" font-size="${size}" fill="#2B2F3A">${escape(entry.node.name)}</text>`);
  }
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Build every variant
// ---------------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });
const report = [];

function record(id, title, placed, groupOf, reach, extra = {}) {
  const missing = nodes.filter((node) => !placed.has(node.id)).length;
  // eslint-disable-next-line no-unused-vars
  const metrics = {
    id,
    title,
    nodes: placed.size,
    missing,
    overlaps: overlapCount(placed),
    ...edgeMetrics(placed, groupOf),
    reach: Math.round(reach),
    ...extra,
  };
  report.push(metrics);
  return metrics;
}

const LABEL_ANCHOR = (node) =>
  ["tweede-kamer", "eerste-kamer", "hoge-college", "ministerie", "land-regering", "koepel"].includes(node.subtype) &&
  node.branch !== "koninkrijk";

// C: the current layout.
{
  const layout = computeLayout(bundle);
  const placed = new Map(layout.nodes.map((node) => [node.id, { node, x: node.x, y: node.y, pole: node.sector }]));
  const chrome = layout.sectors
    .map((sector) => {
      const mid = (sector.startAngle + sector.endAngle) / 2;
      const x = Math.cos(mid) * sector.labelRadius;
      const y = Math.sin(mid) * sector.labelRadius;
      return `<text x="${round(x)}" y="${round(y)}" font-size="18" font-weight="600" letter-spacing="0.12em" text-anchor="middle" dominant-baseline="middle" fill="${branchColor(sector.branch)}">${escape(ORG_BRANCH_LABELS[sector.branch].toUpperCase())}</text>`;
    })
    .join("\n");
  const reach = layout.labelRadius + 60;
  const metrics = record("C", "Variant C: sectors v3 (current layout, control)", placed, (e) => e.pole, reach);
  writeFileSync(
    `${OUT}C.svg`,
    wrapSvg(
      [chrome, edgesSvg(placed, (e) => e.pole), nodesSvg(placed), hubSvg(), anchorLabels(placed, LABEL_ANCHOR)].join("\n"),
      reach,
      metrics.title,
      `nodes ${metrics.nodes}, overlaps ${metrics.overlaps}, edges through the hub ${metrics.crossHub}, longest edge ${metrics.longest}`,
    ),
  );
}

function renderPoles(id, title, poleIds, options = {}) {
  setCollapse(options.collapse === true);
  const result = layoutPoles(poleIds, options);
  const groupOf = (entry) => entry.pole;
  let extraSvg = "";
  if (options.hemicycle) {
    const pole = result.poles.find((p) => p.id === "staten-generaal");
    const flip = options.hemicycle.flip;
    const rot = pole.angle + Math.PI / 2; // local "up" points outward from the hub
    const tk = hemicycleSvg("org:tweede-kamer", TK_ROWS, 26, 6, 2.2, flip, 0, 0, false);
    const ek = hemicycleSvg("org:eerste-kamer", EK_ROWS, 7, 5, 1.6, flip, 0, 0, false);
    extraSvg = `<g transform="translate(${round(pole.cx)} ${round(pole.cy)}) rotate(${round(rot / DEG)})">${tk.svg}${ek.svg}</g>`;
  }
  if (options.frame) {
    const nl = result.poles.filter((p) => p.id !== "koninkrijk");
    const grondwet = Math.max(...nl.map((p) => p.distance + p.radius)) + 30;
    const kon = result.poles.find((p) => p.id === "koninkrijk");
    const statuut = kon ? kon.distance + kon.radius + 30 : grondwet + 60;
    extraSvg += `<circle r="${round(grondwet)}" fill="none" stroke="#1F2330" stroke-opacity="0.5" stroke-width="1.5"/><text x="0" y="${round(-grondwet - 8)}" text-anchor="middle" font-size="16" letter-spacing="0.2em" fill="#1F2330" opacity="0.7">GRONDWET</text>`;
    extraSvg += `<circle r="${round(statuut)}" fill="none" stroke="#1F2330" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="6 5"/><text x="0" y="${round(-statuut - 8)}" text-anchor="middle" font-size="16" letter-spacing="0.2em" fill="#1F2330" opacity="0.55">STATUUT VOOR HET KONINKRIJK</text>`;
    result.outerReach = Math.max(result.outerReach, statuut + 30);
  }
  const metrics = record(id, title, result.placed, groupOf, result.outerReach + 40, {
    poles: result.poles.map((p) => `${p.id}:${p.members.length}/${Math.round(p.radius)}`).join(" "),
    distance: Math.round(result.distance),
    band: result.leftover.length,
    collapsed: options.collapse ? collapsedInto.size : 0,
  });
  const body = [poleChrome(result), edgesSvg(result.placed, groupOf), nodesSvg(result.placed), extraSvg, hubSvg(), anchorLabels(result.placed, LABEL_ANCHOR)].join("\n");
  writeFileSync(
    `${OUT}${id}.svg`,
    wrapSvg(
      body,
      result.outerReach + 40,
      title,
      `nodes ${metrics.nodes}${options.collapse ? ` (${collapsedInto.size} collapsed)` : ""}, overlaps ${metrics.overlaps}, edges through the hub ${metrics.crossHub}, cross-pole edges ${metrics.crossGroup}, longest edge ${metrics.longest}, pole distance ${metrics.distance}`,
    ),
  );
  if (options.hemicycle) {
    // Detail crop of the Staten-Generaal pole, so orientation can be judged.
    const pole = result.poles.find((p) => p.id === "staten-generaal");
    const r = pole.radius + 40;
    writeFileSync(
      `${OUT}${id}-detail.svg`,
      `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(pole.cx - r)} ${round(pole.cy - r)} ${round(2 * r)} ${round(2 * r + 60)}" width="900" height="${Math.round((900 * (2 * r + 60)) / (2 * r))}" font-family="system-ui, sans-serif"><rect x="${round(pole.cx - r)}" y="${round(pole.cy - r)}" width="${round(2 * r)}" height="${round(2 * r + 60)}" fill="#FBFAF7"/><text x="${round(pole.cx)}" y="${round(pole.cy + r + 30)}" font-size="9" text-anchor="middle" fill="#5B6070">${escape(title)}. The hub is below this crop.</text>${body}</svg>\n`,
    );
  }
  setCollapse(false);
  return result;
}

renderPoles("A1", "Variant A1: polder poles, five poles, Koninkrijk in the outer band", [
  "staten-generaal", "regering", "rechterlijke-macht", "hoge-colleges", "medeoverheden",
]);
renderPoles("A2", "Variant A2: polder poles, six poles, Koninkrijk as a pole", [
  "staten-generaal", "regering", "rechterlijke-macht", "hoge-colleges", "medeoverheden", "koninkrijk",
]);
renderPoles("A3", "Variant A3: polder poles, medeoverheden as three poles", [
  "staten-generaal", "regering", "rechterlijke-macht", "hoge-colleges", "provincies", "gemeenten", "waterschappen", "koninkrijk",
]);
renderPoles("D", "Variant D: A2 with the Grondwet and Statuut as frame rings", [
  "staten-generaal", "regering", "rechterlijke-macht", "hoge-colleges", "medeoverheden", "koninkrijk",
], { frame: true, koninkrijkDistance: (distance, radius) => distance + radius + 90 });
renderPoles("A2c", "Variant A2c: A2 with raden and commissies collapsed into their body", [
  "staten-generaal", "regering", "rechterlijke-macht", "hoge-colleges", "medeoverheden", "koninkrijk",
], { collapse: true });
renderFans("A4", "Variant A4: polder fans, six poles as sectors from one base ring", [
  "staten-generaal", "regering", "rechterlijke-macht", "hoge-colleges", "medeoverheden", "koninkrijk",
], false);
renderFans("A4c", "Variant A4c: polder fans with raden and commissies collapsed into their body", [
  "staten-generaal", "regering", "rechterlijke-macht", "hoge-colleges", "medeoverheden", "koninkrijk",
], true);
renderPoles("A2-H1", "Variant A2-H1: Staten-Generaal pole as hemicycles opening toward the hub", [
  "staten-generaal", "regering", "rechterlijke-macht", "hoge-colleges", "medeoverheden", "koninkrijk",
], { hemicycle: { outer: 52, flip: true } });
renderPoles("A2-H2", "Variant A2-H2: Staten-Generaal pole as hemicycles opening away from the hub", [
  "staten-generaal", "regering", "rechterlijke-macht", "hoge-colleges", "medeoverheden", "koninkrijk",
], { hemicycle: { outer: 52, flip: false } });

// B: shells.
{
  const result = layoutShells();
  const groupOf = (entry) => {
    const r = Math.hypot(entry.x, entry.y);
    return result.shells.findIndex((shell) => r >= shell.inner - 1 && r <= shell.outer + 1);
  };
  const chrome = result.shells
    .map(
      (shell) =>
        `<circle r="${round(shell.outer + 12)}" fill="none" stroke="#1F2330" stroke-opacity="0.18" stroke-width="0.8"/><text x="0" y="${round(-(shell.outer + 16))}" text-anchor="middle" font-size="14" letter-spacing="0.14em" fill="#1F2330" opacity="0.6">${escape(shell.label.toUpperCase())} (${shell.count})</text>`,
    )
    .join("\n");
  const metrics = record("B", "Variant B: concentric shells by constitutional distance", result.placed, groupOf, result.outerReach + 40, {
    shells: result.shells.map((s) => `${s.label}:${s.count}/${Math.round(s.inner)}-${Math.round(s.outer)}`).join(" "),
    band: result.leftover.length,
  });
  writeFileSync(
    `${OUT}B.svg`,
    wrapSvg(
      [chrome, edgesSvg(result.placed, groupOf), nodesSvg(result.placed), hubSvg(), anchorLabels(result.placed, LABEL_ANCHOR)].join("\n"),
      result.outerReach + 40,
      metrics.title,
      `nodes ${metrics.nodes}, overlaps ${metrics.overlaps}, edges through the hub ${metrics.crossHub}, cross-shell edges ${metrics.crossGroup}, longest edge ${metrics.longest}`,
    ),
  );
}

// Standalone hemicycles for the entity page (H3 rows, H6 fractie blocks).
function standaloneHemicycle(file, orgId, rows, title) {
  const chart = hemicycleSvg(orgId, rows, 120, 34, 12, false, 0, 0, true);
  const coalitionNote =
    coalitions.length === 0
      ? "Coalition outline: pending data/coalitions.json (phase 3). Seat order: fractie blocks, largest first from the left (H6); real zaalindeling (H5) pending seatNumber sourcing."
      : "Coalition outline from data/coalitions.json.";
  const w = 760;
  writeFileSync(
    `${OUT}${file}`,
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-w / 2} -340 ${w} 480" width="${w}" height="480" font-family="system-ui, sans-serif">
<rect x="${-w / 2}" y="-340" width="${w}" height="480" fill="#FBFAF7"/>
<text x="${-w / 2 + 16}" y="-316" font-size="18" font-weight="700" fill="#1F2330">${escape(title)}</text>
<text x="${-w / 2 + 16}" y="-298" font-size="10" fill="#5B6070">${escape(coalitionNote)}</text>
${chart.svg}
<text x="0" y="120" font-size="11" text-anchor="middle" fill="#5B6070">Rows ${rows.join(", ")} (H3). Colours: web/lib/parties.ts (ADR 0009); grey = no sourced colour. Data: current memberships, ${escape(orgId)}.</text>
</svg>
`,
  );
  return chart.tally;
}
const tkTally = standaloneHemicycle("hemicycle-tk.svg", "org:tweede-kamer", TK_ROWS, "Tweede Kamer: 150 zetels, meerderheid 76 (H3 rows, H6 order)");
const ekTally = standaloneHemicycle("hemicycle-ek.svg", "org:eerste-kamer", EK_ROWS, "Eerste Kamer: 75 zetels, meerderheid 38 (H3 rows, H6 order)");

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const edgeTypes = new Map();
for (const edge of edges) edgeTypes.set(edge.type, (edgeTypes.get(edge.type) ?? 0) + 1);

const lines = [];
lines.push("# Layout variant report");
lines.push("");
lines.push(`Generated by \`render-variants.mjs\` from \`web/public/graph.json\` (snapshot \`${bundle.snapshot}\`, layout \`${bundle.layout}\`): ${bundle.nodes.length} nodes, ${edges.length} edges. Edge types in the bundle: ${[...edgeTypes.entries()].map(([t, n]) => `${t} ${n}`).join(", ")}.`);
lines.push("");
lines.push("Computed criteria per variant. Reading criteria (1, 2 and 6 of the plan) are scored by the reviewer in README.md.");
lines.push("");
lines.push("| Variant | Nodes placed | Collapsed | Missing | Glyph overlaps | Edges through hub | Cross-group edges | Longest edge | Reach | Detail |");
lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const m of report) {
  lines.push(`| ${m.id} | ${m.nodes} | ${m.collapsed ?? 0} | ${m.missing} | ${m.overlaps} | ${m.crossHub} | ${m.crossGroup} | ${m.longest} | ${m.reach} | ${m.poles ?? m.shells ?? ""}${m.band ? ` band:${m.band}` : ""} |`);
}
lines.push("");
lines.push("Pole detail reads `pole:members/radius`; shell detail reads `shell:members/inner-outer`. Reach is the half-size of the viewBox in canvas units.");
lines.push("");
lines.push("## Hemicycle tallies (current memberships)");
lines.push("");
for (const [name, tally] of [["Tweede Kamer", tkTally], ["Eerste Kamer", ekTally]]) {
  lines.push(`- ${name}: ${tally.total} seats, majority ${tally.majority}. ${tally.entries.map((e) => `${e.label} ${e.seats}`).join(", ")}.`);
}
lines.push("");
lines.push("## Data gaps the renders exposed");
lines.push("");
lines.push(`- The bundle carries ${edgeTypes.get("elects") ?? 0} \`elects\` edge(s) and ${edgeTypes.get("accountable_to") ?? 0} \`accountable_to\` edge(s). The four direct mandates (Tweede Kamer, Provinciale Staten, gemeenteraad, algemeen bestuur waterschap) and the vertrouwensregel are not yet relations in \`data/relations.json\`, so no variant can draw them. This is a phase 3 research item (T-relation-dates or a new workstream), sourced from the Grondwet (art. 54, 125, 129), Provinciewet, Gemeentewet and Waterschapswet.`);
lines.push("- `data/coalitions.json` is empty, so the coalition outline on the hemicycles is a placeholder note.");
lines.push("- `memberships.seatNumber` is null for every member, so H5 (real zaalindeling) cannot be rendered yet.");
lines.push(`- Nodes claimed by no pole in A1 (drawn on the outer band): ${report.find((m) => m.id === "A1")?.band ?? 0}; in A2: ${report.find((m) => m.id === "A2")?.band ?? 0}.`);
lines.push("");
writeFileSync(`${OUT}report.md`, lines.join("\n"));

console.log(lines.slice(6, 8 + report.length).join("\n"));
console.log(`\nWrote ${report.length} layout SVGs and 2 hemicycle SVGs to ${OUT}`);
