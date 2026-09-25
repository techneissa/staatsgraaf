"use client";

import { useDict } from "@/components/i18n/use-t";
import type { Selection } from "@/lib/selection";
import { ClusterBody, FractieBody, NewsBody, OrgBody, PersonBody, SectorBody, TopicBody, type PanelVariant } from "./panel-bodies";
import { OpenPageLink, PanelSkeleton } from "./panel-parts";
import type { SelectionView } from "./use-selection-view";

/**
 * What a panel says about a pick, by kind. The side panel ("side") keeps to
 * structure and the essentials; the page column ("page") adds the profile:
 * description, budget, people, news and changes. `withStructure` lets the
 * page column also carry the graph structure when the side panel is hidden.
 */
export function SelectionBody({
  selection,
  view,
  variant,
  withStructure = false,
}: {
  selection: Selection;
  view: SelectionView;
  variant: PanelVariant;
  withStructure?: boolean;
}) {
  const t = useDict("panels");
  if (view.status === "error") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-ink-muted">{t("loadError")}</p>
        {view.meta?.href ? <OpenPageLink href={view.meta.href} /> : null}
      </div>
    );
  }
  if (view.status === "loading") return <PanelSkeleton rows={variant === "page" ? 5 : 4} />;
  const { record, layout } = view;
  switch (selection.kind) {
    case "org":
      return (
        <OrgBody
          id={selection.id}
          record={record?.kind === "org" ? record : null}
          layout={layout}
          variant={variant}
          withStructure={withStructure}
        />
      );
    case "person":
      return <PersonBody selection={selection} record={record?.kind === "person" ? record : null} layout={layout} variant={variant} />;
    case "fractie":
      return <FractieBody selection={selection} layout={layout} variant={variant} />;
    case "cluster":
      return <ClusterBody id={selection.id} layout={layout} variant={variant} />;
    case "sector":
      return <SectorBody id={selection.id} layout={layout} variant={variant} />;
    case "news":
      return <NewsBody record={record?.kind === "news" ? record : null} variant={variant} />;
    case "topic":
      return <TopicBody record={record?.kind === "topic" ? record : null} variant={variant} />;
  }
}

/** A stable key per pick, so a new pick swaps the panel content in. */
export function selectionKey(selection: Selection | null): string {
  if (selection === null) return "none";
  if (selection.kind === "fractie") return `fractie:${selection.chamberId}:${selection.index}`;
  return `${selection.kind}:${selection.id}`;
}
