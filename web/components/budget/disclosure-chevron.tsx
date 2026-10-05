/** The turning chevron of a native disclosure; the parent `details` carries the `group` class. */
export function DisclosureChevron({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      className={`shrink-0 transition-fast group-open:rotate-90 ${className}`}
    >
      <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
