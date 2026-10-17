import { T } from "@/components/i18n/t";
import { LocalDate } from "@/components/content/local-date";

export function UpdatedStamp({ datasetDate }: { datasetDate: string | null }) {
  return (
    <span>
      <span className="sr-only">
        <T area="pages" k="updatedLabel" />{" "}
      </span>
      {datasetDate !== null ? <LocalDate iso={datasetDate} /> : <T area="pages" k="updatedUnknown" />}
    </span>
  );
}
