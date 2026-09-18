"use client";

import { useT } from "@/components/i18n/use-t";

/** Translated portrait alt text, rendered inside the server-drawn portrait frame. */
export function PortraitImg({
  name,
  url,
  size,
}: {
  name: string;
  url: string;
  size: number;
}) {
  const t = useT("entity");
  return (
    <img
      src={url}
      alt={t("personPortraitAlt", { name })}
      width={size}
      height={size}
      loading="lazy"
      className="h-full w-full object-cover"
    />
  );
}
