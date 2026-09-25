"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { branchColorVar } from "@/lib/branch-colors";
import type { ClusterInfo } from "@/lib/graph";
import { ORG_SUBTYPE_LABELS_I18N, SECTOR_LABELS_I18N, TIER_LABELS_I18N } from "@/lib/i18n/dict-graph";
import { orgEnGloss } from "@/lib/name-gloss";
import { PARTIES, partySlug, type PartyRecord } from "@/lib/parties";
import type { Selection } from "@/lib/selection";
import type { OrgBranch } from "@/lib/types";
import type { PanelRecord } from "./panel-data";
import { useGraphLayout, usePanelRecord, type PanelLayout } from "./use-panel-data";

/** How a pick is named and marked in a panel header and in "back to ...". */
export type SelectionMeta = {
  name: string;
  /** What kind of thing it is, in the reader's language. */
  kindLabel: string;
  /** English gloss of a Dutch organisation name, shown in English only. */
  gloss: string | null;
  /** The full page, or null when the thing has none. */
  href: string | null;
  /** Branch, party or kind colour for the mark. */
  color: string;
  mark: "org" | "person" | "cluster" | "fractie" | "sector" | "news" | "topic";
  portrait: string | null;
  /** Short text inside the mark, for a fractie. */
  markText: string | null;
};

export type SelectionView = {
  layout: PanelLayout | null;
  record: PanelRecord | null;
  /** "loading" until what the panel needs has arrived. */
  status: "loading" | "ready" | "error";
  meta: SelectionMeta | null;
};

export function recordIdOf(selection: Selection | null): string | null {
  if (selection === null) return null;
  if (selection.kind === "org" || selection.kind === "person" || selection.kind === "news" || selection.kind === "topic") {
    return selection.id;
  }
  return null;
}

function localized(locale: "nl" | "en", map: Record<string, { nl: string; en: string }>, key: string | null | undefined): string | null {
  if (!key) return null;
  const entry = map[key];
  return entry ? entry[locale] : null;
}

export function partyForKey(key: string | null | undefined): PartyRecord | null {
  if (!key) return null;
  return PARTIES.find((party) => party.key === key) ?? null;
}

/** The fractie block a fractie pick points at, with its chamber and party. */
export function fractieOf(layout: PanelLayout | null, selection: Selection | null) {
  if (!layout || selection?.kind !== "fractie") return null;
  const chamber = layout.chambers[selection.chamberId];
  const entry = chamber?.entries[selection.index];
  if (!chamber || !entry) return null;
  const chamberName = layout.byId.get(selection.chamberId)?.name ?? selection.chamberId;
  return { chamber, entry, chamberName, chamberId: selection.chamberId, party: partyForKey(entry.key) };
}

export function useClusterLabel() {
  const tg = useT("graph");
  return (layout: PanelLayout, cluster: ClusterInfo): string => {
    const n = cluster.members.length;
    const parent = cluster.parent ? (layout.byId.get(cluster.parent)?.name ?? "") : "";
    if (cluster.kind === "oversight") return tg("clusterOversightTip", { n, parent });
    if (cluster.kind === "subtype") {
      const plural =
        cluster.subtype === "veiligheidsregio"
          ? tg("pluralVeiligheidsregio")
          : cluster.subtype === "samenwerkingsverband"
            ? tg("pluralSamenwerkingsverband")
            : tg("pluralOther");
      return tg("clusterSubtypeTip", { n, plural });
    }
    return tg("clusterTip", { n, parent });
  };
}

function useDescribe() {
  const t = useT("panels");
  const locale = useLocale() === "en" ? "en" : "nl";
  const clusterLabel = useClusterLabel();
  return (selection: Selection, layout: PanelLayout | null, record: PanelRecord | null): SelectionMeta | null => {
    switch (selection.kind) {
      case "org": {
        const node = layout?.byId.get(selection.id) ?? null;
        const org = record?.kind === "org" ? record : null;
        const name = node?.name ?? org?.name;
        if (!name) return null;
        const subtype = node?.subtype ?? org?.subtype ?? null;
        const branch = (node?.branch ?? org?.branch ?? null) as OrgBranch | null;
        return {
          name,
          kindLabel: localized(locale, ORG_SUBTYPE_LABELS_I18N, subtype) ?? t("kindOrganization"),
          gloss: locale === "en" ? orgEnGloss(name) : null,
          href: org?.href ?? (node ? `/organisaties/${node.slug}/` : null),
          color: branch ? branchColorVar(branch) : "var(--kind-organization)",
          mark: "org",
          portrait: null,
          markText: null,
        };
      }
      case "person": {
        const person = record?.kind === "person" ? record : null;
        const seated = layout?.seatPeople?.[selection.id] ?? null;
        const name = person?.name ?? seated?.name;
        if (!name) return null;
        return {
          name,
          kindLabel: person?.party ? `${t("kindPerson")}, ${person.party.abbrev}` : t("kindPerson"),
          gloss: null,
          href: person?.href ?? (seated ? `/personen/${seated.slug}/` : null),
          color: person?.color ?? "var(--kind-person)",
          mark: "person",
          portrait: person?.portrait?.url ?? seated?.image ?? null,
          markText: null,
        };
      }
      case "cluster": {
        const cluster = layout?.clusterById.get(selection.id);
        if (!layout || !cluster) return null;
        const sector = layout.sectors.find((entry) => entry.id === cluster.sector);
        return {
          name: clusterLabel(layout, cluster),
          kindLabel: t("kindCluster"),
          gloss: null,
          href: null,
          color: sector ? branchColorVar(sector.branch) : "var(--kind-organization)",
          mark: "cluster",
          portrait: null,
          markText: null,
        };
      }
      case "fractie": {
        const fractie = fractieOf(layout, selection);
        if (!fractie) return null;
        return {
          name: fractie.party?.name.nl ?? fractie.entry.label,
          kindLabel: t("kindFractie", { chamber: fractie.chamberName }),
          gloss: null,
          href: fractie.party ? `/partijen/${partySlug(fractie.party)}/` : null,
          color: fractie.entry.color ?? "var(--t-color-line-strong)",
          mark: "fractie",
          portrait: null,
          markText: fractie.entry.label,
        };
      }
      case "sector": {
        const sector = layout?.sectors.find((entry) => entry.id === selection.id);
        if (!sector) return null;
        return {
          name: localized(locale, SECTOR_LABELS_I18N, sector.id) ?? sector.id,
          kindLabel: localized(locale, TIER_LABELS_I18N, sector.tier) ?? t("kindSector"),
          gloss: null,
          href: null,
          color: branchColorVar(sector.branch),
          mark: "sector",
          portrait: null,
          markText: null,
        };
      }
      case "news": {
        const item = record?.kind === "news" ? record : null;
        if (!item) return null;
        const title = item.translation && item.translation.language === locale ? item.translation.title : item.title;
        return {
          name: title,
          kindLabel: t("kindNews"),
          gloss: null,
          href: item.url,
          color: "var(--t-color-ink-faint)",
          mark: "news",
          portrait: null,
          markText: null,
        };
      }
      case "topic": {
        const topic = record?.kind === "topic" ? record : null;
        if (!topic) return null;
        return {
          name: topic.name,
          kindLabel: t("kindTopic"),
          gloss: null,
          href: topic.href,
          color: "var(--kind-topic)",
          mark: "topic",
          portrait: null,
          markText: null,
        };
      }
    }
  };
}

/** Everything a panel needs to describe a pick: the graph layout, the panel record, and a name and mark. */
export function useSelectionView(selection: Selection | null): SelectionView {
  const graph = useGraphLayout();
  const recordId = recordIdOf(selection);
  const record = usePanelRecord(recordId);
  const describe = useDescribe();
  if (selection === null) return { layout: graph.value, record: null, status: "ready", meta: null };
  const needsGraph = selection.kind === "cluster" || selection.kind === "fractie" || selection.kind === "sector";
  const status =
    (needsGraph && graph.status === "error") || (recordId !== null && record.status === "error")
      ? "error"
      : (needsGraph && graph.status !== "ready") || (recordId !== null && record.status !== "ready")
        ? "loading"
        : "ready";
  return { layout: graph.value, record: record.value, status, meta: describe(selection, graph.value, record.value) };
}
