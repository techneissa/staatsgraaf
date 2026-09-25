import { T } from "@/components/i18n/t";
import { LocalDate } from "@/components/content/local-date";

export function UpdatedStamp({ datasetDate }: { datasetDate: string | null }) {
  return (
    <p className="mt-2 text-xs text-ink-faint">
      <T area="pages" k="updatedLabel" />{" "}
      {datasetDate !== null ? (
        <LocalDate iso={datasetDate} />
      ) : (
        <T area="pages" k="updatedUnknown" />
      )}
    </p>
  );
}
