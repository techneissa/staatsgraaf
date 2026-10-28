"use client";

import { Download } from "lucide";
import { useT } from "@/components/i18n/use-t";
import { LucideIcon } from "@/components/icons/lucide-icon";

/**
 * An icon-only download link. The accessible name and the tooltip both name the
 * file, because the icon alone does not say which one it saves.
 */
export function DownloadButton({ file, href }: { file: string; href: string }) {
  const t = useT("pages");
  const label = t("downloadFile", { file });
  return (
    <a
      href={href}
      download={file}
      aria-label={label}
      title={label}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm border border-line bg-surface text-ink transition-[border-color,background-color,color,scale] duration-150 hover:border-accent/40 hover:bg-accent-soft hover:text-accent-text motion-safe:active:scale-[0.96]"
    >
      <LucideIcon icon={Download} size={18} strokeWidth={1.9} />
    </a>
  );
}
