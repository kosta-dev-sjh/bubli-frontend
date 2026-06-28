import { Eye, EyeOff, GripVertical, X } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { sizeToClass } from "./widget-catalog";
import type { WidgetSize } from "./widget-catalog";

type DashboardWidgetTileProps = HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  dragging?: boolean;
  editMode?: boolean;
  hidden?: boolean;
  icon?: ReactNode;
  interactive?: boolean;
  onRemove?: () => void;
  onToggleHide?: () => void;
  resizing?: boolean;
  selected?: boolean;
  size?: WidgetSize;
  title: string;
};

export function DashboardWidgetTile({
  children,
  className,
  disabled = false,
  dragHandleProps,
  dragging = false,
  editMode = false,
  hidden = false,
  icon,
  interactive = false,
  onRemove,
  onToggleHide,
  resizing = false,
  selected = false,
  size = "M",
  title,
  ...props
}: DashboardWidgetTileProps) {
  return (
    <div
      className={cn(
        "bubli-dash-tile",
        sizeToClass[size],
        interactive && "bubli-dash-tile--interactive",
        selected && "bubli-dash-tile--selected",
        dragging && "bubli-dash-tile--dragging",
        resizing && "bubli-dash-tile--resizing",
        hidden && "bubli-dash-tile--hidden",
        disabled && "bubli-dash-tile--disabled",
        className,
      )}
      {...props}
    >
      <div className="bubli-dash-tile__head">
        <span className="bubli-dash-tile__title">
          {icon ? <span className="bubli-dash-tile__icon">{icon}</span> : null}
          {title}
        </span>
        {editMode ? (
          <span className="bubli-dash-tile__actions">
            <button aria-label="이동" className="bubli-dash-tile__act bubli-dash-tile__handle" type="button" {...dragHandleProps}>
              <GripVertical />
            </button>
            <button aria-label={hidden ? "보이기" : "숨기기"} className="bubli-dash-tile__act" onClick={onToggleHide} type="button">
              {hidden ? <Eye /> : <EyeOff />}
            </button>
            <button aria-label="삭제" className="bubli-dash-tile__act" onClick={onRemove} type="button">
              <X />
            </button>
          </span>
        ) : null}
      </div>
      <div className="bubli-dash-tile__body">{children}</div>
    </div>
  );
}
