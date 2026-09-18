import { getMediaItem, personPortraitId } from "@/lib/entity";
import type { Person } from "@/lib/types";

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((part) => part.length > 1 && /^[A-ZÀ-Ý]/.test(part));
  if (parts.length === 0) return name.slice(0, 1).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}

export function PersonPortrait({
  person,
  size = 64,
  className = "",
}: {
  person: Person;
  size?: number;
  className?: string;
}) {
  const media = getMediaItem(personPortraitId(person));
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill border border-line bg-surface-raised ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      {media ? (
        <img
          src={media.url}
          alt={`Portret van ${person.name}`}
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="font-medium text-ink-muted"
          style={{ fontSize: Math.max(11, Math.round(size / 3)) }}
        >
          {initials(person.name)}
        </span>
      )}
    </span>
  );
}
