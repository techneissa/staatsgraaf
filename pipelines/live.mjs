#!/usr/bin/env bun
// `bun run live`: keep the office holders, the seats and the next election dates in step
// with the official sources, unattended (ADR 0006 amended, ADR 0024).
//
// Order: news trigger check, Tweede Kamer change check and fetch, Eerste Kamer hash
// check, bewindspersonen, election dates, apply (merge), changes, validate. It is fast when
// nothing changed: counts and hashes only, one request per second per host. A run that
// changes data validates it and restores the previous data if validation fails.
//
// Exit code: 0 ok (also when nothing changed), 2 a source was stopped by its guard
// (what passed is written; the summary names the rest), 1 a hard error (nothing kept).
// The machine-readable result is research/qa/live-run-latest.json.

import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createHttp } from "./live-http.mjs";
import { hoursSinceIso } from "./live-util.mjs";
import { EK_URLS, fetchEkHashes, parseEkColofon } from "./ek-live.mjs";
import { UPCOMING_FILE, electionEventsFromState, fetchElectionDates, mergeElectionRecords } from "./election-dates.mjs";
import { appendReviewQueue, writeSummary } from "./live-report.mjs";
import { loadState, saveState } from "./live-state.mjs";
import { applyEnvelopeToData } from "./live-apply.mjs";
import { fetchNewsSitemap, shouldRunEarly } from "./news-trigger.mjs";
import { loadDataset, runRefresh } from "./refresh-official.mjs";
import { writeChanges } from "./changes.mjs";
import { bootstrapSince, computeCursors, fetchTkCounts } from "./tk-fetch.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const DAILY_HOURS = 24;
export const WEEKLY_HOURS = 24 * 7;

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

/** Fractie keys web/lib/parties.ts knows (key and abbrev), to tell which new fractie has no colour. */
export async function loadRegisteredFractieKeys(root) {
  try {
    const text = await readFile(join(root, "web", "lib", "parties.ts"), "utf8");
    const keys = new Set();
    for (const match of text.matchAll(/\b(?:key|abbrev):\s*"([^"]+)"/g)) keys.add(match[1]);
    for (const match of text.matchAll(/unlisted\(\s*"([^"]+)"/g)) keys.add(match[1]);
    return keys.size > 0 ? keys : null;
  } catch {
    return null;
  }
}

function runValidate(root) {
  const script = join(root, "scripts", "validate.mjs");
  if (!existsSync(script)) return { ok: true, skipped: true, output: "scripts/validate.mjs ontbreekt in deze root" };
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", timeout: 300_000 });
  return { ok: result.status === 0, skipped: false, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split("\n").slice(-12).join("\n") };
}

async function backup(root, relativePaths) {
  const dir = await mkdtemp(join(tmpdir(), "staatsgraaf-live-"));
  const saved = [];
  const absent = [];
  for (const relative of relativePaths) {
    const from = join(root, relative);
    if (!existsSync(from)) {
      absent.push(relative);
      continue;
    }
    await cp(from, join(dir, relative.replace(/\//g, "__")), { recursive: true });
    saved.push(relative);
  }
  return { dir, saved, absent };
}

async function restore(root, snapshot) {
  for (const relative of snapshot.saved) {
    const target = join(root, relative);
    await rm(target, { recursive: true, force: true });
    await cp(join(snapshot.dir, relative.replace(/\//g, "__")), target, { recursive: true });
  }
  // a file the failed run created did not exist before
  for (const relative of snapshot.absent) await rm(join(root, relative), { recursive: true, force: true });
}

async function writeIfChanged(path, text) {
  let current = null;
  try {
    current = await readFile(path, "utf8");
  } catch {
    current = null;
  }
  if (current === text) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
  return true;
}

export async function runLive(options = {}) {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const today = options.today ?? nowIso.slice(0, 10);
  const root = options.root ?? REPO_ROOT;
  const log = options.log ?? console.log;
  const http = options.http ?? createHttp({ fetchImpl: options.fetchImpl, minIntervalMs: options.minIntervalMs });
  const validate = options.validate !== false;
  const force = Boolean(options.full);

  const summary = {
    generatedAt: nowIso,
    today,
    outcome: "unchanged",
    exitCode: 0,
    forced: force,
    trigger: { run: false, reason: null, matches: [] },
    sources: {},
    counts: { closures: 0, openings: 0, newPeople: 0, newPositions: 0, gaps: 0, reviewEntries: 0 },
    closures: [],
    openings: [],
    stoppedByGuard: [],
    gaps: [],
    reviewEntries: [],
    requests: null,
    merge: null,
    validate: null,
    files: { envelopeChanged: false, upcomingChanged: false, stateChanged: false },
  };

  const finish = async (exitCode) => {
    summary.exitCode = exitCode;
    summary.requests = { total: http.stats.requests, byHost: http.stats.byHost };
    const path = await writeSummary(root, summary);
    log(
      `live: ${summary.outcome}; sluitingen ${summary.counts.closures}, openingen ${summary.counts.openings}, ` +
        `nieuwe personen ${summary.counts.newPeople}, gestopt ${summary.stoppedByGuard.length}, gaps ${summary.counts.gaps}, ` +
        `verzoeken ${http.stats.requests}; samenvatting ${path}`,
    );
    return { exitCode, summary, summaryPath: path };
  };

  try {
    const state = options.state ?? (await loadState(root));
    const dataset = options.dataset ?? (await loadDataset(join(root, "data")));
    const registeredFractieKeys = options.registeredFractieKeys ?? (await loadRegisteredFractieKeys(root));

    // ----- 1. news trigger: only decides to read the official sources early -----
    const news = await readJson(join(root, "data", "news.json"), []);
    let sitemapItems = [];
    if (!options.skipSitemap) {
      try {
        sitemapItems = (await fetchNewsSitemap(http)).items;
      } catch (error) {
        summary.gaps.push({ what: "Rijksoverheid nieuwssitemap", why: error.message, endpoint: "https://www.rijksoverheid.nl/news/sitemap.xml", resume: "Alleen de vroege trigger vervalt; de vaste cadans blijft werken." });
      }
    }
    const trigger = shouldRunEarly([...(Array.isArray(news) ? news : []), ...sitemapItems], state.news.lastRun, { now });
    summary.trigger = trigger;
    if (trigger.run) log(`live: nieuwstrigger: ${trigger.reason}`);

    const early = force || trigger.run;

    // ----- 2. which sources are due -----
    const which = { bewindspersonen: false, tweedeKamer: false, eersteKamer: false };
    let tkCounts = null;
    const tkState = state.tk;
    const tkDaily = !tkState.lastFullRun || hoursSinceIso(tkState.lastFullRun, now) >= DAILY_HOURS;
    const tkNeedsRead = early || tkDaily || !tkState.cursors?.fzp || Boolean(tkState.pendingGuard);
    let presidiumId = tkState.presidiumId;
    if (tkNeedsRead) {
      which.tweedeKamer = true;
      summary.sources.tweedeKamer = { checked: false, reason: early ? "vroeg of geforceerd" : tkState.pendingGuard ? "vorige run gestopt door de bewaking" : "dagelijkse volledige lezing" };
    } else if (!presidiumId) {
      which.tweedeKamer = true;
      summary.sources.tweedeKamer = { checked: false, reason: "Presidium-id nog onbekend" };
    } else {
      tkCounts = await fetchTkCounts({ http, cursors: tkState.cursors, presidiumId });
      which.tweedeKamer = tkCounts.changed;
      summary.sources.tweedeKamer = { checked: true, counts: tkCounts.counts, changed: tkCounts.changed };
    }

    const ekDaily = !state.ek.lastFullRun || hoursSinceIso(state.ek.lastFullRun, now) >= DAILY_HOURS;
    const ekHash = await fetchEkHashes({ http, hashes: state.ek.hashes });
    which.eersteKamer = early || ekDaily || ekHash.changed;
    summary.sources.eersteKamer = { checked: true, hashChanged: ekHash.changed, full: which.eersteKamer };

    which.bewindspersonen = early || !state.bewindspersonen.lastRun || hoursSinceIso(state.bewindspersonen.lastRun, now) >= DAILY_HOURS;
    summary.sources.bewindspersonen = { full: which.bewindspersonen };

    const electionsDue = force || !state.electionDates.lastRun || hoursSinceIso(state.electionDates.lastRun, now) >= WEEKLY_HOURS;
    summary.sources.electionDates = { full: electionsDue };

    const nothingDue = !which.tweedeKamer && !which.eersteKamer && !which.bewindspersonen && !electionsDue;
    if (nothingDue) {
      summary.outcome = "unchanged";
      return await finish(0);
    }

    // ----- 3. election dates (weekly) -----
    let extraSources = [];
    let upcomingChanged = false;
    const nextState = structuredClone(state);
    if (electionsDue) {
      const fetchedDates = await fetchElectionDates({ http, today, existingSources: dataset.sources });
      const merged = mergeElectionRecords(state.electionDates.items, fetchedDates.records, fetchedDates.gaps);
      extraSources = fetchedDates.sources;
      nextState.electionDates = { lastRun: nowIso, items: merged, gaps: fetchedDates.gaps };
      summary.gaps.push(...fetchedDates.gaps);
      upcomingChanged = await writeIfChanged(join(root, "data", UPCOMING_FILE), `${JSON.stringify(merged, null, 2)}\n`);
      summary.sources.electionDates.records = merged.length;
    }
    const electionEvents = electionEventsFromState(nextState.electionDates.items, today);
    const datasetWithEvents = { ...dataset, elections: [...(dataset.elections ?? []), ...electionEvents] };

    // ----- 4. colofon terms (weekly, with a full Eerste Kamer read) -----
    if (which.eersteKamer && (!state.ek.colofon?.checked || hoursSinceIso(state.ek.colofon.checked, now) >= WEEKLY_HOURS)) {
      try {
        const page = await http.getText(EK_URLS.colofon, { accept: "text/html" });
        nextState.ek.colofon = { checked: nowIso, ...parseEkColofon(page) };
      } catch (error) {
        summary.gaps.push({ what: "Colofon van de Eerste Kamer", why: error.message, endpoint: EK_URLS.colofon, resume: "De vorige lezing blijft staan." });
      }
    }

    // ----- 5. fetch, plan, guard, write the envelope -----
    const envelopeBackup = await backup(root, ["research/P-live-ambtsdragers.json", "research/P-live-ambtsdragers.md", "data", "ATTRIBUTION.md"]);
    let result;
    try {
      result = await runRefresh({
        root,
        today,
        now,
        http,
        which,
        dataset: datasetWithEvents,
        state: nextState,
        registeredFractieKeys,
        extraSources,
        fractiesHtml: which.eersteKamer ? ekHash.pages.fracties : null,
        tkSince: nextState.tk.cursors?.fzp ? null : bootstrapSince(dataset.sources, today),
        log,
      });
    } catch (error) {
      await restore(root, envelopeBackup);
      throw error;
    }
    const plan = result.plan;
    summary.files.envelopeChanged = result.envelopeChanged;
    summary.files.upcomingChanged = upcomingChanged;

    const stopped = new Set(plan.stopped.map((entry) => entry.source));
    summary.stoppedByGuard = plan.stopped;
    summary.counts = {
      closures: plan.stats.closed,
      openings: plan.stats.opened,
      newPeople: plan.stats.newPeople,
      newPositions: plan.tkResult?.stats?.newPositions ?? 0,
      gaps: plan.gaps.length,
      reviewEntries: plan.review.length,
    };
    summary.closures = plan.closures.map((entry) => ({ id: entry.record.id, end: entry.record.end, confidence: entry.record.source.confidence, why: entry.why }));
    summary.openings = plan.openings.map((entry) => ({ id: entry.record.id, start: entry.record.start, why: entry.why }));
    summary.gaps.push(...plan.gaps);
    summary.reviewEntries = plan.review;
    if (plan.tkResult) {
      summary.sources.tweedeKamer = {
        ...summary.sources.tweedeKamer,
        fetched: true,
        stopped: stopped.has("tweedeKamer"),
        seatsByFractie: plan.stats.tweedeKamer?.seatsByFractie ?? null,
        newFracties: plan.stats.tweedeKamer?.newFracties ?? [],
        goneFracties: plan.stats.tweedeKamer?.goneFracties ?? [],
        invariants: plan.stats.tweedeKamer?.invariants ?? null,
        guard: plan.guards.tweedeKamer ?? null,
      };
    }
    for (const key of ["bewindspersonen", "eersteKamer"]) {
      if (plan.guards[key]) summary.sources[key] = { ...summary.sources[key], fetched: !stopped.has(key), stopped: stopped.has(key), guard: plan.guards[key] };
    }
    for (const entry of plan.stopped) {
      plan.review.push({ kind: "stopped-by-guard", key: `stopped-by-guard|${entry.source}|${today}`, text: `${entry.source} gestopt door de bewaking: ${entry.reasons.join("; ")}.` });
    }

    // ----- 6. state: cursors move only for a source that was applied -----
    const bodies = result.fetched.bodies;
    if (which.tweedeKamer && plan.planned.includes("tweedeKamer")) {
      nextState.tk.cursors = computeCursors(nextState.tk.cursors, bodies.tweedeKamer.raws, bodies.tweedeKamer.latest);
      nextState.tk.presidiumId = bodies.tweedeKamer.presidiumId ?? nextState.tk.presidiumId;
      nextState.tk.personMap = { ...nextState.tk.personMap, ...plan.personMapUpdates };
      nextState.tk.lastFullRun = nowIso;
      nextState.tk.lastCounts = tkCounts?.counts ?? null;
      nextState.tk.pendingGuard = null;
    } else if (which.tweedeKamer && stopped.has("tweedeKamer")) {
      nextState.tk.pendingGuard = plan.stopped.find((entry) => entry.source === "tweedeKamer").reasons;
      if (bodies.tweedeKamer.presidiumId) nextState.tk.presidiumId = bodies.tweedeKamer.presidiumId;
    }
    if (which.eersteKamer && plan.planned.includes("eersteKamer")) {
      nextState.ek.hashes = ekHash.hashes;
      nextState.ek.lastFullRun = nowIso;
    }
    if (which.bewindspersonen && plan.planned.includes("bewindspersonen")) {
      nextState.bewindspersonen = {
        cabinetSlug: bodies.bewindspersonen.cabinet?.slug ?? nextState.bewindspersonen.cabinetSlug,
        slugsHash: nextState.bewindspersonen.slugsHash,
        lastRun: nowIso,
      };
    }
    if (trigger.run || which.tweedeKamer || which.eersteKamer || which.bewindspersonen) nextState.news.lastRun = nowIso;

    // ----- 7. apply, changes, validate (restore on failure) -----
    let dataChanged = result.envelopeChanged || upcomingChanged;
    if (result.envelopeChanged) {
      // Not `merge`: on the committed dataset a full merge is not idempotent (ADR 0024), so the envelope is applied field by field.
      const envelope = JSON.parse(await readFile(join(root, "research", "P-live-ambtsdragers.json"), "utf8"));
      const applied = await applyEnvelopeToData({
        dataDir: join(root, "data"),
        envelope,
        now,
        attributionPath: join(root, "ATTRIBUTION.md"),
      });
      const changes = await writeChanges({ dataDir: join(root, "data") });
      summary.merge = { mode: "apply-envelope", changedFiles: applied.changedFiles, counts: applied.counts, changes: changes.changes.length };
      if (validate) {
        const checked = runValidate(root);
        summary.validate = { ok: checked.ok, skipped: checked.skipped, tail: checked.output };
        if (!checked.ok) {
          await restore(root, envelopeBackup);
          summary.outcome = "error";
          summary.gaps.push({ what: "bun run validate na de live-run", why: "de validatie faalde; data/ en de envelope zijn hersteld", endpoint: "scripts/validate.mjs", resume: "Lees het staartstuk in summary.validate en herstel de bron of het schema." });
          await rm(envelopeBackup.dir, { recursive: true, force: true });
          return await finish(1);
        }
      }
    }
    await rm(envelopeBackup.dir, { recursive: true, force: true });

    // ----- 8. state, queue, summary -----
    if (dataChanged || JSON.stringify(nextState) !== JSON.stringify(state)) {
      nextState.lastRun = { at: nowIso, outcome: stopped.size > 0 ? "stopped-by-guard" : dataChanged ? "updated" : "checked" };
    }
    summary.files.stateChanged = await saveState(root, nextState);
    const queueEntries = [
      ...plan.review,
      ...plan.gaps.map((gap) => ({ kind: "gap", key: `gap|${gap.what}|${gap.why}`, text: `${gap.what}: ${gap.why} (${gap.endpoint}). ${gap.resume}` })),
      ...summary.gaps.filter((gap) => !plan.gaps.includes(gap)).map((gap) => ({ kind: "gap", key: `gap|${gap.what}|${gap.why}`, text: `${gap.what}: ${gap.why} (${gap.endpoint}). ${gap.resume}` })),
    ];
    const added = await appendReviewQueue(root, queueEntries, today);
    summary.reviewEntries = queueEntries.map((entry) => ({ kind: entry.kind, text: entry.text, key: entry.key, newInQueue: added.includes(entry) }));
    summary.outcome = stopped.size > 0 ? "stopped-by-guard" : dataChanged ? "updated" : "checked";
    return await finish(stopped.size > 0 ? 2 : 0);
  } catch (error) {
    summary.outcome = "error";
    summary.gaps.push({ what: "bun run live", why: error.message, endpoint: "pipelines/live.mjs", resume: "Lees de foutmelding; er is niets bewaard van deze run." });
    log(`live failed: ${error.stack ?? error.message}`);
    return await finish(1);
  }
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--full") options.full = true;
    else if (argv[i] === "--root") options.root = argv[(i += 1)];
    else if (argv[i] === "--no-validate") options.validate = false;
  }
  return options;
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  const { exitCode } = await runLive(parseArgs(process.argv.slice(2)));
  process.exitCode = exitCode;
}
