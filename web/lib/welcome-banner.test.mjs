import { test } from "node:test";
import assert from "node:assert/strict";

import {
  WELCOME_BANNER_ATTR,
  WELCOME_BANNER_INIT_SCRIPT,
  WELCOME_BANNER_KEY,
  isDismissed,
  readDismissed,
  writeDismissed,
} from "./welcome-banner.ts";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
  };
}

test("the storage key uses the project name", () => {
  assert.equal(WELCOME_BANNER_KEY, "staatsgraaf.welcome-banner");
});

test("only the stored word 'dismissed' hides the banner", () => {
  assert.equal(isDismissed("dismissed"), true);
  for (const raw of [null, undefined, "", "1", "true", "Dismissed"]) assert.equal(isDismissed(raw), false);
});

test("a fresh browser shows the banner, a dismissal sticks", () => {
  const storage = memoryStorage();
  assert.equal(readDismissed(storage), false);
  assert.equal(writeDismissed(storage), true);
  assert.equal(readDismissed(storage), true);
  assert.equal(storage.getItem(WELCOME_BANNER_KEY), "dismissed");
});

test("blocked storage never throws: the banner shows, and the dismissal lasts one page view", () => {
  const blocked = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };
  assert.equal(readDismissed(blocked), false);
  assert.equal(writeDismissed(blocked), false);
  assert.equal(readDismissed(undefined), false);
  assert.equal(writeDismissed(undefined), false);
});

test("the head script sets the attribute only when the key says dismissed", () => {
  function run(stored) {
    const attrs = new Map();
    const localStorage = { getItem: (key) => (key === WELCOME_BANNER_KEY ? stored : null) };
    const document = { documentElement: { setAttribute: (name, value) => attrs.set(name, value) } };
    new Function("localStorage", "document", WELCOME_BANNER_INIT_SCRIPT)(localStorage, document);
    return attrs;
  }
  assert.equal(run("dismissed").has(WELCOME_BANNER_ATTR), true);
  assert.equal(run(null).has(WELCOME_BANNER_ATTR), false);
  assert.equal(run("nope").has(WELCOME_BANNER_ATTR), false);
});

test("the head script survives a localStorage that throws", () => {
  const localStorage = {
    getItem() {
      throw new Error("denied");
    },
  };
  const document = { documentElement: { setAttribute() {} } };
  assert.doesNotThrow(() => new Function("localStorage", "document", WELCOME_BANNER_INIT_SCRIPT)(localStorage, document));
});
