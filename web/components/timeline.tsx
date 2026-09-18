import type { ReactNode } from "react";
import { Card } from "./card";
import { KindBadge } from "./kind-badge";
import { L } from "@/components/i18n/t";

export type TimelineItem = {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  period: string;
  current: boolean;
  badges?: string[];
};

export function Timeline({ items, label }: { items: TimelineItem[]; label: string }) {
  return (
    <ol aria-label={label} className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Card className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-start gap-3">
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{item.title}</p>
                {item.meta ? <p className="mt-0.5 text-sm text-ink-muted">{item.meta}</p> : null}
                {item.badges && item.badges.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {item.badges.map((badge) => (
                      <KindBadge key={badge}>{badge}</KindBadge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.current ? (
                <KindBadge tone="accent">
                  <L nl="Huidig" en="Current" />
                </KindBadge>
              ) : null}
              <span className="text-xs text-ink-faint">{item.period}</span>
            </div>
          </Card>
        </li>
      ))}
    </ol>
  );
}
