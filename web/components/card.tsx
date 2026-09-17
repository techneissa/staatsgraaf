import type { ElementType, ReactNode } from "react";

type CardProps = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

export function Card({ as: Tag = "div", className = "", children }: CardProps) {
  return (
    <Tag className={`rounded-md border border-line bg-surface p-4 ${className}`.trim()}>
      {children}
    </Tag>
  );
}
