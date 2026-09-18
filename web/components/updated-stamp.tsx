import { T } from "@/components/i18n/t";
import { formatDate } from "@/lib/format";

export function UpdatedStamp({ datasetDate }: { datasetDate: string | null }) {
  return (
    <p className="mt-2 text-xs text-ink-faint">
      <T area="pages" k="updatedLabel" />{" "}
      {datasetDate !== null ? (
        <time dateTime={datasetDate}>{formatDate(datasetDate)}</time>
      ) : (
        <T area="pages" k="updatedUnknown" />
      )}
    </p>
  );
}
