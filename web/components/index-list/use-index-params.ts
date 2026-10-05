"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * URL state of an index list (?q=, ?groep=, ?partij=): read once after mount,
 * written back with replaceState on every change, so a filtered list can be
 * linked and Back restores it. Nothing is written before the first read, so a
 * link with a filter is not wiped by the empty first render.
 */
export function useIndexParams<Key extends string>(keys: readonly Key[]) {
  const [values, setValues] = useState<Record<Key, string>>(() => Object.fromEntries(keys.map((key) => [key, ""])) as Record<Key, string>);
  const [ready, setReady] = useState(false);
  const keysRef = useRef(keys);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValues(Object.fromEntries(keysRef.current.map((key) => [key, params.get(key) ?? ""])) as Record<Key, string>);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    for (const key of keysRef.current) {
      const value = values[key].trim();
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [values, ready]);

  const set = useCallback((key: Key, value: string) => setValues((current) => (current[key] === value ? current : { ...current, [key]: value })), []);
  const clear = useCallback(() => setValues(Object.fromEntries(keysRef.current.map((key) => [key, ""])) as Record<Key, string>), []);
  return { values, set, clear, ready };
}
