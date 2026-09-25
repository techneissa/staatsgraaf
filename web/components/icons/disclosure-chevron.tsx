"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide";
import { Morph } from "./morph";

/**
 * A chevron for a native <details> summary: it follows the open state of the
 * nearest <details> and turns from down to up. Without script it stays a
 * down chevron and the disclosure still works.
 */
export function DisclosureChevron({ size = 14 }: { size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const details = ref.current?.closest("details");
    if (!details) return;
    const sync = () => setOpen(details.open);
    sync();
    details.addEventListener("toggle", sync);
    return () => details.removeEventListener("toggle", sync);
  }, []);

  return (
    <span ref={ref} className="inline-flex shrink-0">
      <Morph icon={open ? ChevronUp : ChevronDown} size={size} />
    </span>
  );
}
