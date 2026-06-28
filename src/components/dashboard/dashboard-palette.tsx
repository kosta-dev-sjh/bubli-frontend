import { Bell, Bot, CalendarDays, CheckCircle2, Clock3, FileSearch, FileText, Gauge, NotebookPen, Search, Sparkles, Timer, UploadCloud } from "lucide-react";
import type { ComponentType, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import type { DashboardWidgetDef } from "./widget-catalog";

const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  "today-todos": CheckCircle2,
  schedule: CalendarDays,
  timer: Timer,
  "agent-suggestions": Bot,
  "pending-approval": Clock3,
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
  items: DashboardWidgetDef[];
  onAdd?: (widgetId: string) => void;
  onSearch?: (query: string) => void;
  query?: string;
};

export function DashboardPalette({ className, items, onAdd, onSearch, query = "", ...props }: DashboardPaletteProps) {
  const filtered = query
    ? items.filter((w) => (w.title + w.description).toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div className={cn("bubli-dash-palette", className)} {...props}>
      <div className="bubli-dash-palette__title">위젯 팔레트</div>
      <label className="bubli-dash-palette__search">
        <Search size={14} />
        <input
          aria-label="위젯 검색"
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder="위젯 검색"
          value={query}
        />
      </label>
      {filtered.length === 0 ? (
        <div className="bubli-dash-palette__empty">찾는 위젯이 없어요. 다른 말로 검색해볼까요?</div>
      ) : (
        <div className="bubli-dash-palette__list">
          {filtered.map((w) => (
            <button
              className="bubli-dash-palette__item"
              key={w.widgetId}
              onClick={() => onAdd?.(w.widgetId)}
              type="button"
            >
              <span className="bubli-dash-tile__icon">{widgetIcon(w.widgetId)}</span>
              <span style={{ minWidth: 0 }}>
                <span className="bubli-dash-palette__item-title" style={{ display: "block" }}>
                  {w.title}
                </span>
                <span className="bubli-dash-palette__item-desc">{w.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
