// Polite HTTP for the live pipelines: one request per second per host, a
// declared user agent, conditional requests where the host supports them.
// The fetch implementation is injected, so tests never touch the network.

import { LIVE_USER_AGENT, sleep as realSleep } from "./live-util.mjs";

export const MIN_INTERVAL_MS = 1000;

export class HttpError extends Error {
  constructor(status, url, message) {
    super(message ?? `HTTP ${status} voor ${url}`);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

export function createHttp({
  fetchImpl = globalThis.fetch,
  userAgent = LIVE_USER_AGENT,
  minIntervalMs = MIN_INTERVAL_MS,
  now = () => Date.now(),
  sleep = realSleep,
} = {}) {
  const lastByHost = new Map();
  const stats = { requests: 0, byHost: {} };

  async function throttle(url) {
    const host = new URL(url).host;
    const wait = (lastByHost.get(host) ?? -Infinity) + minIntervalMs - now();
    if (wait > 0 && minIntervalMs > 0) await sleep(wait);
    lastByHost.set(host, now());
    stats.requests += 1;
    stats.byHost[host] = (stats.byHost[host] ?? 0) + 1;
  }

  /** GET without throwing on an HTTP error status: { status, ok, text, headers, notModified }. */
  async function get(url, { accept = "*/*", headers = {} } = {}) {
    await throttle(url);
    const response = await fetchImpl(url, {
      headers: { "User-Agent": userAgent, Accept: accept, "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8", ...headers },
      redirect: "follow",
    });
    const notModified = response.status === 304;
    const text = notModified ? "" : await response.text();
    const responseHeaders = {};
    if (response.headers && typeof response.headers.forEach === "function") {
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });
    }
    return { status: response.status, ok: response.ok || notModified, notModified, text, headers: responseHeaders };
  }

  async function getText(url, options) {
    const response = await get(url, options);
    if (!response.ok) throw new HttpError(response.status, url);
    return response.text;
  }

  async function getJson(url, options = {}) {
    const response = await get(url, { accept: "application/json", ...options });
    if (!response.ok) throw new HttpError(response.status, url);
    try {
      return JSON.parse(response.text);
    } catch (error) {
      throw new HttpError(response.status, url, `ongeldige JSON van ${url}: ${error.message}`);
    }
  }

  return { get, getText, getJson, stats };
}
