import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        Pagina niet gevonden
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Deze pagina bestaat niet of is verplaatst. Ga terug naar de{" "}
        <Link href="/" className="text-accent-text underline-offset-2 hover:underline">
          homepage
        </Link>
        .
      </p>
    </>
  );
}
