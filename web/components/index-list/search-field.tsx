"use client";

/** The search box of an index list: a labelled search input with a magnifier. */
export function IndexSearchField({
  value,
  onChange,
  label,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={`relative block shrink-0 ${className}`.trim()}>
      <span className="sr-only">{label}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        width="15"
        height="15"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
      >
        <circle cx="7" cy="7" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="m10.6 10.6 3.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        className="h-10 w-full rounded-md border border-line bg-surface pe-3 ps-9 text-base text-ink placeholder:text-ink-faint focus-visible:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus pointer-coarse:h-11"
      />
    </label>
  );
}
