export type EntityMarkupKind = "organization" | "position" | "person" | "topic";

export type SummaryNode =
  | { type: "text"; value: string }
  | { type: "entity"; id: string; label: string; kind: EntityMarkupKind };

const ENTITY_TAG = /<entity id="([^"]+)">([^<]*)<\/entity>/g;

const PREFIX_KIND: Record<string, EntityMarkupKind> = {
  org: "organization",
  pos: "position",
  person: "person",
  topic: "topic",
};

export function entityKind(id: string): EntityMarkupKind | null {
  const prefix = id.split(":")[0] ?? "";
  return PREFIX_KIND[prefix] ?? null;
}

export function parseSummaryMarkup(markup: string | null | undefined): SummaryNode[] {
  if (markup === null || markup === undefined || markup === "") return [];
  const nodes: SummaryNode[] = [];
  let cursor = 0;
  for (const match of markup.matchAll(ENTITY_TAG)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push({ type: "text", value: markup.slice(cursor, index) });
    const [, id, label] = match;
    const kind = entityKind(id);
    if (kind === null) {
      nodes.push({ type: "text", value: label });
    } else {
      nodes.push({ type: "entity", id, label, kind });
    }
    cursor = index + match[0].length;
  }
  if (cursor < markup.length) nodes.push({ type: "text", value: markup.slice(cursor) });
  return nodes;
}

export function extractEntityIds(markup: string | null | undefined): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const node of parseSummaryMarkup(markup)) {
    if (node.type === "entity" && !seen.has(node.id)) {
      seen.add(node.id);
      ids.push(node.id);
    }
  }
  return ids;
}

export function normaliseSummary(markup: string | null | undefined): string {
  return parseSummaryMarkup(markup)
    .map((node) => (node.type === "text" ? node.value : node.label))
    .join("");
}

export function isEntityMarkup(value: string): boolean {
  const probe = /<entity id="[^"]+">[^<]*<\/entity>/;
  return probe.test(value);
}
