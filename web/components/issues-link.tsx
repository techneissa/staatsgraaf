/** The place to report a wrong fact, a removal request or an accessibility problem. */
export const ISSUES_URL = "https://github.com/techneissa/staatsgraaf/issues";

export function IssuesLink({ label = "GitHub" }: { label?: string }) {
  return (
    <a
      href={ISSUES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-text underline-offset-2 hover:underline"
    >
      {label}
    </a>
  );
}
