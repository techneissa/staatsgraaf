"use client";

import { useEffect } from "react";

/**
 * One observer for the whole site that runs the one-shot entrance motion.
 *
 * Server components opt in with `className="motion-rise" data-reveal="pending"`
 * (or `motion-draw` for a rail). Without JavaScript nothing is hidden: the
 * hiding rule in globals.css only applies once this component has set
 * `html[data-reveal="on"]`. Elements already on screen at first paint are
 * marked shown without animating, so nothing flashes on load; elements further
 * down fade and rise once as they scroll in. Under prefers-reduced-motion the
 * CSS keyframes are not applied at all, so this only toggles an attribute.
 */
export function RevealObserver() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const root = document.documentElement;

    const show = (element: Element) => element.setAttribute("data-reveal", "shown");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    const inView = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    };

    const scan = (scope: ParentNode, initial: boolean) => {
      const nodes = scope.querySelectorAll('[data-reveal="pending"]');
      for (const node of nodes) {
        if (initial && inView(node)) {
          node.setAttribute("data-reveal", "static");
          continue;
        }
        observer.observe(node);
      }
    };

    scan(document, true);
    root.setAttribute("data-reveal", "on");

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.getAttribute("data-reveal") === "pending") observer.observe(node);
          scan(node, false);
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.removeAttribute("data-reveal");
    };
  }, []);

  return null;
}
