"use client";

import {
  Bell,
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

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { DashboardWidgetDef } from "./widget-catalog";

const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  "next-focus": Clock3,
  "today-todos": CheckCircle2,
  schedule: CalendarDays,
  timer: Timer,
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
  const { t } = useI18n();
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
          {t(widget.titleKey)}
        </span>
        <span className="bubli-dash-palette__item-desc">{t(widget.descriptionKey)}</span>
      </span>
    </button>
  );
}

function DashboardRemoveDropzone({ id }: { id: string }) {
  const { t } = useI18n();
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div className="bubli-dash-palette__drop-remove" data-drop-active={isOver ? "true" : undefined} ref={setNodeRef}>
      <Trash2 aria-hidden size={15} strokeWidth={1.8} />
      <strong>{t("dashboard.palette.removeHint")}</strong>
    </div>
  );
}

export function DashboardPalette({ className, draggable = false, items, onAdd, onSearch, query = "", removeDropId, ...props }: DashboardPaletteProps) {
  const { t } = useI18n();
  const filtered = query
    ? items.filter((w) => (t(w.titleKey) + t(w.descriptionKey)).toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div className={cn("bubli-dash-palette", className)} {...props}>
      <div className="bubli-dash-palette__title">{t("dashboard.palette.title")}</div>
      <p className="bubli-dash-palette__hint">{t("dashboard.palette.hint")}</p>
      {removeDropId ? <DashboardRemoveDropzone id={removeDropId} /> : null}
      <label className="bubli-dash-palette__search">
        <Search size={14} />
        <input
          aria-label={t("dashboard.palette.search")}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder={t("dashboard.palette.search")}
          value={query}
        />
      </label>
      {filtered.length === 0 ? (
        <div className="bubli-dash-palette__empty">{t("dashboard.palette.empty")}</div>
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
