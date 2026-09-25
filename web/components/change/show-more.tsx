"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide";
import { Morph } from "@/components/icons/morph";
import { useT } from "@/components/i18n/use-t";

/**
 * The rest of a long list behind one button: the first view is rendered by
 * the caller, `children` holds the remainder and mounts when opened.
 */
export function ShowMore({
  count,
  showKey,
  hideKey,
  children,
}: {
  count: number;
  showKey: string;
  hideKey: string;
  children: ReactNode;
}) {
  const t = useT("home");
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <div id={id} hidden={!open}>
        {open ? children : null}
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-sm border border-line px-3 text-sm font-medium text-ink transition-fast hover:border-line-strong pointer-coarse:min-h-11 sm:w-auto"
      >
        {open ? t(hideKey) : t(showKey, { n: count })}
        <Morph icon={open ? ChevronUp : ChevronDown} size={14} />
      </button>
    </>
  );
}
