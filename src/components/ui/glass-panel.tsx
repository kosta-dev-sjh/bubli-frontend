import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type GlassPanelOwnProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  padded?: boolean;
};

type GlassPanelProps<T extends ElementType> = GlassPanelOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof GlassPanelOwnProps<T>>;

export function GlassPanel<T extends ElementType = "section">({
  as,
  children,
  className,
  padded = true,
  ...props
}: GlassPanelProps<T>) {
  const Component = as ?? "section";

  return (
    <Component className={cn("bubli-surface", padded && "p-5", className)} {...props}>
      {children}
    </Component>
  );
}
