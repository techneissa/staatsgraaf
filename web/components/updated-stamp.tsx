import { formatDate } from "@/lib/format";

export function UpdatedStamp({ datasetDate }: { datasetDate: string | null }) {
  return (
    <p className="mt-2 text-xs text-ink-faint">
      Laatst bijgewerkt:{" "}
      {datasetDate !== null ? <time dateTime={datasetDate}>{formatDate(datasetDate)}</time> : "onbekend"}
    </p>
  );
}
