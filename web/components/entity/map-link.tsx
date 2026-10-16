"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/use-t";
import type { Address } from "@/lib/types";

/** iPhone, iPad (which reports itself as a Mac) and Mac: Apple Maps opens there without a detour. */
function onApple(): boolean {
  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
}

function oneLine(address: Address): string {
  return [address.street, [address.postcode, address.city].filter(Boolean).join(" "), address.country === "Nederland" ? null : address.country]
    .filter(Boolean)
    .join(", ");
}

/**
 * The visiting address of a body as a link to the map: Google Maps, or Apple
 * Maps on Apple devices. The name goes with the address, so the map can show
 * the building, not only the street. The server renders the Google link; an
 * Apple device swaps it after hydration, which changes no text and no layout.
 */
export function MapLink({ address, name }: { address: Address; name: string }) {
  const t = useT("entity");
  const common = useT("common");
  const [apple, setApple] = useState(false);
  useEffect(() => setApple(onApple()), []);
  const full = oneLine(address);
  const href = apple
    ? `https://maps.apple.com/?q=${encodeURIComponent(name)}&address=${encodeURIComponent(full)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${full}`)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={t("addressOpenMaps", { address: full })}
      className="inline-flex min-w-0 max-w-full items-baseline text-accent-text underline-offset-2 hover:underline"
    >
      <span className="min-w-0 break-words">
        {address.street}, {address.city}
      </span>
      <span className="sr-only">
        , {t("addressOnMap")} {common("opensNewTab")}
      </span>
    </a>
  );
}
