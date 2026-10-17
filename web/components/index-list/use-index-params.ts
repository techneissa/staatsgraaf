"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const URL_DEBOUNCE_MS = 200;

function writeParams<Key extends string>(keys: readonly Key[], values: Record<Key, string>) {
  const url = new URL(window.location.href);
  for (const key of keys) {
    const value = values[key].trim();
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
}

/**
 * URL state of an index list (?q=, ?groep=, ?partij=): read once after mount,
 * written back with replaceState after a short pause, so typing a search does
 * not rewrite the address on every key. A filtered list can still be linked
 * and Back restores it. Nothing is written before the first read, so a link
 * with a filter is not wiped by the empty first render.
 */
export function useIndexParams<Key extends string>(keys: readonly Key[]) {
  const [values, setValues] = useState<Record<Key, string>>(() => Object.fromEntries(keys.map((key) => [key, ""])) as Record<Key, string>);
  const [ready, setReady] = useState(false);
  const keysRef = useRef(keys);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValues(Object.fromEntries(keysRef.current.map((key) => [key, params.get(key) ?? ""])) as Record<Key, string>);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => writeParams(keysRef.current, valuesRef.current), URL_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [values, ready]);

  useEffect(() => {
    if (!ready) return;
    return () => writeParams(keysRef.current, valuesRef.current);
  }, [ready]);

  const set = useCallback((key: Key, value: string) => setValues((current) => (current[key] === value ? current : { ...current, [key]: value })), []);
  const clear = useCallback(() => setValues(Object.fromEntries(keysRef.current.map((key) => [key, ""])) as Record<Key, string>), []);
  return { values, set, clear, ready };
}
