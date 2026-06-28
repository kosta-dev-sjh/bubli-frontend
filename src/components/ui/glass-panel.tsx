import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type GlassPanelOwnProps<T extends ElementType> = {
  as?: T;
  children?: ReactNode;
  dense?: boolean;
  disabled?: boolean;
  floating?: boolean;
  interactive?: boolean;
  loading?: boolean;
  padded?: boolean;
};

type GlassPanelProps<T extends ElementType> = GlassPanelOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof GlassPanelOwnProps<T>>;

export function GlassPanel<T extends ElementType = "section">({
  as,
  children,
  className,
  dense = false,
  disabled = false,
  floating = false,
  interactive = false,
  loading = false,
  padded = true,
  ...props
}: GlassPanelProps<T>) {
  const Component = as ?? "section";
  const pad = padded ? (dense ? "p-3.5" : "p-5") : false;

  return (
    <Component
      aria-busy={loading || undefined}
      className={cn(
        "bubli-surface",
        interactive && "bubli-surface--interactive",
        dense && "bubli-surface--dense",
        floating && "bubli-surface--floating",
        disabled && "bubli-surface--disabled",
        pad,
        className,
      )}
      {...props}
    >
      {loading ? (
        <div aria-hidden="true" style={{ display: "grid", gap: 10 }}>
          <span className="bubli-skeleton" style={{ height: 14, width: "42%" }} />
          <span className="bubli-skeleton" style={{ height: 12, width: "88%" }} />
          <span className="bubli-skeleton" style={{ height: 12, width: "70%" }} />
        </div>
      ) : (
        children
      )}
    </Component>
  );
}
