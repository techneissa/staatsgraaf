const longDate = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDate = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTime = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const number = new Intl.NumberFormat("nl-NL");

function parse(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function formatDate(iso: string): string {
  return longDate.format(parse(iso));
}

export function formatDateShort(iso: string): string {
  return shortDate.format(parse(iso));
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatCount(value: number): string {
  return number.format(value);
}

export function formatPeriod(start: string, end: string | null): string {
  if (end === null) return `Sinds ${formatDate(start)}`;
  return `${formatDate(start)} tot ${formatDate(end)}`;
}

export function formatPeriodShort(start: string, end: string | null): string {
  if (end === null) return `Sinds ${formatDateShort(start)}`;
  return `${formatDateShort(start)} tot ${formatDateShort(end)}`;
}
