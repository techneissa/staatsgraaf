"use client";

import { Fragment, type ReactNode } from "react";
import { useT } from "@/components/i18n/use-t";
import type { DictArea } from "@/lib/i18n/dicts";

/**
 * A dictionary template whose {slots} are React nodes (links, dates), so a
 * sentence like "{person} werd {position} bij {body}" keeps its word order per
 * language without concatenating links into a string.
 */
export function TemplateT({
  area = "home",
  k,
  slots,
}: {
  area?: DictArea;
  k: string;
  slots: Record<string, ReactNode>;
}) {
  const t = useT(area);
  // Keep the placeholders: interpolate() only replaces keys it is given.
  const template = t(k);
  const parts = template.split(/(\{\w+\})/);
  return (
    <>
      {parts.map((part, index) => {
        const match = /^\{(\w+)\}$/.exec(part);
        if (match && match[1] in slots) return <Fragment key={index}>{slots[match[1]]}</Fragment>;
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}
