import { EmptyState } from "@/components/empty-state";
import { EntityChip } from "@/components/entity-chip";
import { SourceLink } from "@/components/source-link";
import { getSourceById } from "@/lib/data";
import { groupConnections, type Connection } from "@/lib/entity";

export function EntityConnections({ connections }: { connections: Connection[] }) {
  if (connections.length === 0) {
    return (
      <EmptyState
        title="Nog geen verbindingen"
        description="In de dataset zijn voor dit onderdeel nog geen inkomende of uitgaande relaties met een bron opgenomen."
      />
    );
  }

  const groups = groupConnections(connections);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.type} aria-labelledby={`verbinding-${group.type}`}>
          <h3 id={`verbinding-${group.type}`} className="text-sm font-semibold text-ink">
            {group.label}{" "}
            <span className="font-normal text-ink-faint">({group.connections.length})</span>
          </h3>
          <ul className="mt-2 space-y-2">
            {group.connections.map((connection) => {
              const source = getSourceById(connection.source.source);
              return (
                <li key={connection.id} className="flex flex-wrap items-center gap-2">
                  <span aria-hidden="true" className="w-4 shrink-0 text-center text-ink-faint">
                    {connection.direction === "outgoing" ? "\u2192" : "\u2190"}
                  </span>
                  <span className="sr-only">
                    {connection.direction === "outgoing"
                      ? "Uitgaande relatie naar "
                      : "Inkomende relatie van "}
                  </span>
                  <EntityChip href={connection.other.href}>{connection.other.name}</EntityChip>
                  {source ? (
                    <SourceLink href={source.url} meta={source.publisher}>
                      Bron
                    </SourceLink>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
