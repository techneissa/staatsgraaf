"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { parentPath } from "@/lib/back-nav";
import { navServerSnapshot, navSnapshot, setNavMotion, subscribeNav, type NavMotion } from "@/lib/nav-history";

/**
 * Where back goes from here: the previous page of this visit, else one level
 * up (lib/back-nav.ts), else nowhere (the home page reached from outside).
 * The back buttons and the swipe share it, so they always agree.
 */
export type BackTarget = "history" | "up" | null;

export function useGoBack(): { target: BackTarget; goBack: (motion?: NavMotion) => boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const { canBack } = useSyncExternalStore(subscribeNav, navSnapshot, navServerSnapshot);
  const target: BackTarget = canBack ? "history" : parentPath(pathname) !== null ? "up" : null;

  const goBack = useCallback(
    (motion: NavMotion = "back") => {
      if (navSnapshot().canBack) {
        setNavMotion(motion);
        window.history.back();
        return true;
      }
      const parent = parentPath(window.location.pathname);
      if (parent === null) return false;
      setNavMotion(motion);
      // In place of this entry, so back again goes up again (a person, the
      // people index, the home page) instead of returning here.
      router.replace(parent);
      return true;
    },
    [router],
  );

  return { target, goBack };
}
