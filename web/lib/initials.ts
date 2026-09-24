/**
 * Initials for an avatar when no portrait is on record: the first letter of
 * the first and last capitalised name parts ("Dick Schoof" -> "DS",
 * "Mona Keijzer" -> "MK", "Hanneke van der Werf" -> "HW"). Pure, so server
 * portraits, the peek popover and client lists render the same letters.
 */
export function initialsFor(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, " ")
    .split(/[\s-]+/)
    .filter((part) => part.length > 1 && /^[A-ZÀ-ÝĲ]/u.test(part));
  if (parts.length === 0) return name.trim().slice(0, 1).toUpperCase() || "?";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}

/**
 * Background and ring for an initials avatar: a soft tint of the party or
 * branch colour mixed into the raised surface, or the plain surface when no
 * sourced colour exists. The letters stay in the ink colour for contrast.
 */
export function avatarTint(color: string | null | undefined): { backgroundColor: string; borderColor: string } {
  if (!color) {
    return { backgroundColor: "var(--t-color-surface-raised)", borderColor: "var(--t-color-line)" };
  }
  return {
    backgroundColor: `color-mix(in srgb, ${color} 26%, var(--t-color-surface-raised))`,
    borderColor: `color-mix(in srgb, ${color} 55%, var(--t-color-line))`,
  };
}
