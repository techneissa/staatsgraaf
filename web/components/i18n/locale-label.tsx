"use client";

import { useLocale } from "./language-provider";
import {
  CHANGE_KIND_LABELS,
  CHANGE_KIND_LABELS_EN,
  END_REASON_LABELS,
  END_REASON_LABELS_EN,
  ENTRY_MODE_LABELS,
  ENTRY_MODE_LABELS_EN,
  FILL_METHOD_LABELS,
  FILL_METHOD_LABELS_EN,
  ORG_BRANCH_LABELS,
  ORG_BRANCH_LABELS_EN,
  ORG_LEVEL_LABELS,
  ORG_LEVEL_LABELS_EN,
  ORG_SUBTYPE_LABELS,
  ORG_SUBTYPE_LABELS_EN,
  ORG_TYPE_LABELS,
  ORG_TYPE_LABELS_EN,
} from "@/lib/labels";

type LabelKind =
  | "type"
  | "subtype"
  | "branch"
  | "level"
  | "fillMethod"
  | "entryMode"
  | "endReason"
  | "changeKind";

const TABLES: Record<LabelKind, [Record<string, string>, Record<string, string>]> = {
  type: [ORG_TYPE_LABELS, ORG_TYPE_LABELS_EN],
  subtype: [ORG_SUBTYPE_LABELS, ORG_SUBTYPE_LABELS_EN],
  branch: [ORG_BRANCH_LABELS, ORG_BRANCH_LABELS_EN],
  level: [ORG_LEVEL_LABELS, ORG_LEVEL_LABELS_EN],
  fillMethod: [FILL_METHOD_LABELS, FILL_METHOD_LABELS_EN],
  entryMode: [ENTRY_MODE_LABELS, ENTRY_MODE_LABELS_EN],
  endReason: [END_REASON_LABELS, END_REASON_LABELS_EN],
  changeKind: [CHANGE_KIND_LABELS, CHANGE_KIND_LABELS_EN],
};

/**
 * Locale-aware label renderer for the shared Dutch label maps in
 * web/lib/labels.ts. Renders the Dutch build-time value by default and swaps
 * to the stored locale after hydration.
 */
export function LocaleLabel({
  kind,
  value,
}: {
  kind: LabelKind;
  value: string | null | undefined;
}) {
  const locale = useLocale();
  if (value === null || value === undefined) return null;
  const [nlTable, enTable] = TABLES[kind];
  const text = locale === "en" ? (enTable[value] ?? nlTable[value] ?? value) : (nlTable[value] ?? value);
  return <>{text}</>;
}
