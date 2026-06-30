import {
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSearch,
  FileText,
  FolderKanban,
  Gauge,
  NotebookPen,
  Search,
  Sparkles,
  Timer,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ComponentType, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import type { DashboardWidgetDef } from "./widget-catalog";

const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  "today-todos": CheckCircle2,
  schedule: CalendarDays,
  timer: Timer,
  "agent-suggestions": Bot,
  "pending-approval": Clock3,
  "project-rooms": FolderKanban,
  "project-time-ring": Gauge,
  "activity-timeline": Sparkles,
  "today-summary": FileText,
  notifications: Bell,
  "recent-resources": FileSearch,
  "quick-memo": NotebookPen,
  "quick-upload": UploadCloud,
};

export function widgetIcon(widgetId: string) {
  const Icon = ICONS[widgetId] ?? FileText;
  return <Icon size={14} />;
}

type DashboardPaletteProps = HTMLAttributes<HTMLDivElement> & {
  draggable?: boolean;
  items: DashboardWidgetDef[];
  onAdd?: (widgetId: string) => void;
  onSearch?: (query: string) => void;
  query?: string;
  removeDropId?: string;
};

function DashboardPaletteItem({
  draggable,
  onAdd,
  widget,
}: {
  draggable?: boolean;
  onAdd?: (widgetId: string) => void;
  widget: DashboardWidgetDef;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    data: { widgetId: widget.widgetId },
    disabled: !draggable,
    id: `palette:${widget.widgetId}`,
  });

  return (
    <button
      className={cn("bubli-dash-palette__item", isDragging && "bubli-dash-palette__item--dragging")}
      key={widget.widgetId}
      onClick={() => onAdd?.(widget.widgetId)}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      type="button"
      {...listeners}
      {...attributes}
    >
      <span className="bubli-dash-tile__icon">{widgetIcon(widget.widgetId)}</span>
      <span style={{ minWidth: 0 }}>
        <span className="bubli-dash-palette__item-title" style={{ display: "block" }}>
          {widget.title}
        </span>
        <span className="bubli-dash-palette__item-desc">{widget.description}</span>
      </span>
    </button>
  );
}

function DashboardRemoveDropzone({ id }: { id: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div className="bubli-dash-palette__drop-remove" data-drop-active={isOver ? "true" : undefined} ref={setNodeRef}>
      <Trash2 aria-hidden size={15} strokeWidth={1.8} />
      <strong>보드에서 빼기</strong>
    </div>
  );
}

export function DashboardPalette({ className, draggable = false, items, onAdd, onSearch, query = "", removeDropId, ...props }: DashboardPaletteProps) {
  const filtered = query
    ? items.filter((w) => (w.title + w.description).toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div className={cn("bubli-dash-palette", className)} {...props}>
      <div className="bubli-dash-palette__title">카드 추가</div>
      {removeDropId ? <DashboardRemoveDropzone id={removeDropId} /> : null}
      <label className="bubli-dash-palette__search">
        <Search size={14} />
        <input
          aria-label="카드 검색"
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder="카드 검색"
          value={query}
        />
      </label>
      {filtered.length === 0 ? (
        <div className="bubli-dash-palette__empty">카드 없음</div>
      ) : (
        <div className="bubli-dash-palette__list">
          {filtered.map((w) => (
            <DashboardPaletteItem draggable={draggable} key={w.widgetId} onAdd={onAdd} widget={w} />
          ))}
        </div>
      )}
    </div>
  );
}
