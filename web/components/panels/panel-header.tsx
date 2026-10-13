"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { KindGlyph } from "@/components/kind-glyph";
import { useDict } from "@/components/i18n/use-t";
import { useSelection } from "@/components/selection/selection-provider";
import { useSelectionView, type SelectionMeta } from "./use-selection-view";

/**
 * The mark of a pick: a portrait for a person, the coat of arms or official
 * logo of an organisation (ADR 0029), otherwise a shape in its colour.
 */
export function SelectionMark({ meta, size }: { meta: SelectionMeta; size: number }) {
  if (meta.mark === "person") {
    return <Avatar name={meta.name} url={meta.portrait} color={meta.color.startsWith("#") ? meta.color : null} size={size} />;
  }
  if (meta.mark === "org" && meta.portrait) {
    return (
      <OrgEmblemMark url={meta.portrait} logo={meta.emblemKind === "logo"} size={size} fallback={<SelectionMark meta={{ ...meta, portrait: null }} size={size} />} />
    );
  }
  const tint = { backgroundColor: `color-mix(in oklab, ${meta.color} 16%, transparent)`, borderColor: `color-mix(in oklab, ${meta.color} 50%, transparent)` };
  let inner;
  switch (meta.mark) {
    case "fractie":
      inner = (
        <span className="max-w-full truncate px-0.5 text-[11px] font-semibold leading-none text-ink">{meta.markText}</span>
      );
      break;
    case "cluster":
      inner = (
        <svg aria-hidden="true" viewBox="0 0 16 16" width={size * 0.45} height={size * 0.45} style={{ fill: meta.color }}>
          {[3, 8, 13].flatMap((x) => [3, 8, 13].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
        </svg>
      );
      break;
    case "sector":
      inner = (
        <svg aria-hidden="true" viewBox="0 0 16 16" width={size * 0.5} height={size * 0.5}>
          <path d="M2 13A11 11 0 0 1 13 2v4.5A6.5 6.5 0 0 0 6.5 13Z" style={{ fill: meta.color }} />
        </svg>
      );
      break;
    case "news":
      inner = (
        <svg aria-hidden="true" viewBox="0 0 16 16" width={size * 0.45} height={size * 0.45} className="text-ink-muted">
          <path d="M3 3.5h10v9H3zM5.5 6h5M5.5 8.5h5M5.5 11h3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
      break;
    case "topic":
      inner = <KindGlyph kind="topic" size={Math.round(size * 0.36)} />;
      break;
    default:
      inner = (
        <span aria-hidden="true" className="rounded-[3px]" style={{ width: size * 0.32, height: size * 0.32, backgroundColor: meta.color }} />
      );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-md border"
      style={{ width: size, height: size, ...tint }}
    >
      {inner}
    </span>
  );
}

/**
 * A coat of arms as it is, or an official logo on a white plate (logos are
 * drawn for a white page) loaded without a referrer. Decorative: the name is
 * next to it. When the image fails, the plain mark comes back.
 */
function OrgEmblemMark({ url, logo, size, fallback }: { url: string; logo: boolean; size: number; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${logo ? "rounded-md bg-white p-1" : ""}`}
      style={{ width: logo ? Math.round(size * 1.6) : size, height: size }}
    >
      <img
        src={url}
        alt=""
        decoding="async"
        referrerPolicy={logo ? "no-referrer" : undefined}
        onError={() => setFailed(true)}
        className="max-h-full max-w-full object-contain"
      />
    </span>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="tap-target inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-fast hover:bg-surface-inset hover:text-ink"
    >
      {children}
    </button>
  );
}

/** "Back to X": names the previous pick once it can, a plain "Back" until then. */
function BackButton() {
  const { previous, back } = useSelection();
  const t = useDict("panels");
  const view = useSelectionView(previous);
  const label = view.meta ? t("back", { name: view.meta.name }) : t("backPlain");
  return (
    <button
      type="button"
      onClick={back}
      title={label}
      className="tap-row inline-flex min-h-8 min-w-0 max-w-full items-center gap-1 rounded-sm pe-2 ps-1 text-xs font-medium text-ink-muted transition-fast hover:bg-surface-inset hover:text-ink"
    >
      <svg aria-hidden="true" viewBox="0 0 12 12" width="11" height="11" className="shrink-0">
        <path d="M7.5 2.5 4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

/**
 * The top of a selection panel: the way back and the close button on one
 * line, then the mark, the kind and the Dutch name. `size` "md" is the page
 * column profile, "sm" the side panel.
 */
export function PanelHeader({
  meta,
  size,
  headingId,
  compact = false,
}: {
  meta: SelectionMeta | null;
  size: "sm" | "md";
  headingId?: string;
  /**
   * The details panel beside the canvas already carries the mark, the way back
   * and the close button; the page column then keeps only the kind and the name
   * so the two never open with the same block.
   */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="min-w-0">
        <p className="text-xs leading-snug text-ink-muted">{meta?.kindLabel ?? " "}</p>
        <h2
          id={headingId}
          lang={meta && (meta.mark === "org" || meta.mark === "person" || meta.mark === "fractie" || meta.mark === "topic") ? "nl" : undefined}
          className="mt-0.5 text-lg font-semibold leading-tight tracking-tight text-ink [overflow-wrap:anywhere]"
        >
          {meta?.name ?? <span className="sg-skeleton inline-block h-4 w-40 rounded-sm align-middle" />}
        </h2>
      </div>
    );
  }
  const { canGoBack, clear } = useSelection();
  const t = useDict("panels");
  const markSize = size === "md" ? 56 : 40;
  return (
    <div>
      <div className="flex min-h-8 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1">{canGoBack ? <BackButton /> : null}</div>
        <IconButton label={t("close")} onClick={clear}>
          <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14">
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </IconButton>
      </div>
      <div className="mt-1.5 flex items-start gap-3">
        {meta ? <SelectionMark meta={meta} size={markSize} /> : <span className="sg-skeleton shrink-0 rounded-md" style={{ width: markSize, height: markSize }} />}
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-snug text-ink-muted">{meta?.kindLabel ?? " "}</p>
          <h2
            id={headingId}
            lang={meta && (meta.mark === "org" || meta.mark === "person" || meta.mark === "fractie" || meta.mark === "topic") ? "nl" : undefined}
            className={`mt-0.5 font-semibold leading-tight tracking-tight text-ink [overflow-wrap:anywhere] ${size === "md" ? "text-xl" : "text-base"}`}
          >
            {meta?.name ?? <span className="sg-skeleton inline-block h-4 w-40 rounded-sm align-middle" />}
          </h2>
          {/* "House of Representatives" as the kind and again as the gloss says it twice. */}
          {meta?.gloss && meta.gloss.toLowerCase() !== (meta.kindLabel ?? "").toLowerCase() ? (
            <p lang="en" className="mt-0.5 text-xs text-ink-faint">{meta.gloss}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
