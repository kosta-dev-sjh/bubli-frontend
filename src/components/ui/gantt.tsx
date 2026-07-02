"use client";

/*
 * roadmap-ui(shadcn 레지스트리) Gantt 컴포넌트 이식본.
 * 원본 구현을 그대로 유지하기 위해 원본이 사용하는 ref/throttle 패턴에 대한 lint 규칙을 파일 단위로 끈다.
 */
/* eslint-disable react-hooks/refs, react-hooks/use-memo, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */

import { DndContext, MouseSensor, useDraggable, useSensor } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { useMouse, useThrottle, useWindowScroll } from "@uidotdev/usehooks";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarWeeks,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  getDate,
  getDaysInMonth,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { atom, useAtom } from "jotai";
import throttle from "lodash.throttle";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, FC, KeyboardEventHandler, MouseEventHandler, PointerEventHandler, ReactNode, RefObject } from "react";

import { Card } from "@/components/ui/card";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

const draggingAtom = atom(false);
const scrollXAtom = atom(0);

export const useGanttDragging = () => useAtom(draggingAtom);
export const useGanttScrollX = () => useAtom(scrollXAtom);

const WEEK_OPTIONS = { weekStartsOn: 1 } as const;
const DAYS_IN_WEEK = 7;
const WEEKDAY_LABEL_KEYS: MessageKey[] = [
  "ui.gantt.weekdaySun",
  "ui.gantt.weekdayMon",
  "ui.gantt.weekdayTue",
  "ui.gantt.weekdayWed",
  "ui.gantt.weekdayThu",
  "ui.gantt.weekdayFri",
  "ui.gantt.weekdaySat",
];

const pad2 = (value: number) => String(value).padStart(2, "0");
const formatShortDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
const formatFullDate = (date: Date) => `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
const formatDateRange = (t: TranslateFn, startAt: Date, endAt: Date | null) =>
  endAt ? `${formatShortDate(startAt)} - ${formatShortDate(endAt)}` : t("ui.gantt.rangeFrom", { start: formatShortDate(startAt) });

export type GanttStatus = {
  id: string;
  name: string;
  color: string;
};

export type GanttFeature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: GanttStatus;
};

export type GanttMarkerProps = {
  id: string;
  date: Date;
  label: string;
};

export type Range = "daily" | "weekly" | "monthly" | "quarterly";

export type TimelineData = {
  year: number;
  quarters: {
    months: {
      days: number;
    }[];
  }[];
}[];

export type GanttContextProps = {
  zoom: number;
  range: Range;
  columnWidth: number;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
  onAddItem: ((date: Date, rowIndex?: number) => void) | undefined;
  setSidebarWidth?: (width: number) => void;
  placeholderLength: number;
  timelineData: TimelineData;
  ref: RefObject<HTMLDivElement | null> | null;
};

const getsDaysIn = (range: Range) => {
  // For when range is daily
  let fn = (_date: Date) => 1;

  if (range === "weekly") {
    fn = (_date: Date) => DAYS_IN_WEEK;
  } else if (range === "monthly" || range === "quarterly") {
    fn = getDaysInMonth;
  }

  return fn;
};

const getDifferenceIn = (range: Range) => {
  let fn: (dateLeft: Date, dateRight: Date) => number = differenceInDays;

  if (range === "weekly") {
    fn = (dateLeft: Date, dateRight: Date) => differenceInCalendarWeeks(dateLeft, dateRight, WEEK_OPTIONS);
  } else if (range === "monthly" || range === "quarterly") {
    fn = differenceInMonths;
  }

  return fn;
};

const getInnerDifferenceIn = (range: Range) => {
  let fn = differenceInHours;

  if (range === "weekly" || range === "monthly" || range === "quarterly") {
    fn = differenceInDays;
  }

  return fn;
};

const getStartOf = (range: Range) => {
  let fn: (date: Date) => Date = startOfDay;

  if (range === "weekly") {
    fn = (date: Date) => startOfWeek(date, WEEK_OPTIONS);
  } else if (range === "monthly" || range === "quarterly") {
    fn = startOfMonth;
  }

  return fn;
};

const getEndOf = (range: Range) => {
  let fn: (date: Date) => Date = endOfDay;

  if (range === "weekly") {
    fn = (date: Date) => endOfWeek(date, WEEK_OPTIONS);
  } else if (range === "monthly" || range === "quarterly") {
    fn = endOfMonth;
  }

  return fn;
};

const getAddRange = (range: Range) => {
  let fn = addDays;

  if (range === "weekly") {
    fn = addWeeks;
  } else if (range === "monthly" || range === "quarterly") {
    fn = addMonths;
  }

  return fn;
};

const weeksInYear = (year: number) =>
  differenceInCalendarWeeks(new Date(year + 1, 0, 1), new Date(year, 0, 1), WEEK_OPTIONS);

const getDateByMousePosition = (context: GanttContextProps, mouseX: number) => {
  const rawTimelineStartDate = new Date(context.timelineData[0].year, 0, 1);
  const timelineStartDate = getStartOf(context.range)(rawTimelineStartDate);
  const columnWidth = (context.columnWidth * context.zoom) / 100;
  const offset = Math.floor(mouseX / columnWidth);
  const daysIn = getsDaysIn(context.range);
  const addRange = getAddRange(context.range);
  const month = addRange(timelineStartDate, offset);
  const daysInMonth = daysIn(month);
  const pixelsPerDay = Math.round(columnWidth / daysInMonth);
  const dayOffset = Math.floor((mouseX % columnWidth) / pixelsPerDay);
  const actualDate = addDays(month, dayOffset);

  return actualDate;
};

const createInitialTimelineData = (today: Date) => {
  const data: TimelineData = [];

  data.push(
    { year: today.getFullYear() - 1, quarters: new Array(4).fill(null) },
    { year: today.getFullYear(), quarters: new Array(4).fill(null) },
    { year: today.getFullYear() + 1, quarters: new Array(4).fill(null) },
  );

  for (const yearObj of data) {
    yearObj.quarters = new Array(4).fill(null).map((_, quarterIndex) => ({
      months: new Array(3).fill(null).map((_, monthIndex) => {
        const month = quarterIndex * 3 + monthIndex;
        return {
          days: getDaysInMonth(new Date(yearObj.year, month, 1)),
        };
      }),
    }));
  }

  return data;
};

const getOffset = (date: Date, timelineStartDate: Date, context: GanttContextProps) => {
  const parsedColumnWidth = (context.columnWidth * context.zoom) / 100;
  const differenceIn = getDifferenceIn(context.range);
  const startOf = getStartOf(context.range);
  const fullColumns = differenceIn(startOf(date), timelineStartDate);

  if (context.range === "daily") {
    return parsedColumnWidth * fullColumns;
  }

  if (context.range === "weekly") {
    const pixelsPerDay = parsedColumnWidth / DAYS_IN_WEEK;
    const partialDays = differenceInDays(startOfDay(date), startOf(date));
    return fullColumns * parsedColumnWidth + partialDays * pixelsPerDay;
  }

  const partialColumns = date.getDate();
  const daysInMonth = getDaysInMonth(date);
  const pixelsPerDay = parsedColumnWidth / daysInMonth;

  return fullColumns * parsedColumnWidth + partialColumns * pixelsPerDay;
};

const getWidth = (startAt: Date, endAt: Date | null, context: GanttContextProps) => {
  const parsedColumnWidth = (context.columnWidth * context.zoom) / 100;

  if (!endAt) {
    return parsedColumnWidth * 2;
  }

  const differenceIn = getDifferenceIn(context.range);

  if (context.range === "daily") {
    const delta = differenceIn(endAt, startAt);
    return parsedColumnWidth * (delta ? delta : 1);
  }

  if (context.range === "weekly") {
    const pixelsPerDay = parsedColumnWidth / DAYS_IN_WEEK;
    const days = differenceInDays(startOfDay(endAt), startOfDay(startAt));
    return Math.max(days, 1) * pixelsPerDay;
  }

  const daysInStartMonth = getDaysInMonth(startAt);
  const pixelsPerDayInStartMonth = parsedColumnWidth / daysInStartMonth;

  if (isSameDay(startAt, endAt)) {
    return pixelsPerDayInStartMonth;
  }

  const innerDifferenceIn = getInnerDifferenceIn(context.range);
  const startOf = getStartOf(context.range);

  if (isSameDay(startOf(startAt), startOf(endAt))) {
    return innerDifferenceIn(endAt, startAt) * pixelsPerDayInStartMonth;
  }

  const startRangeOffset = daysInStartMonth - getDate(startAt);
  const endRangeOffset = getDate(endAt);
  const fullRangeOffset = differenceIn(startOf(endAt), startOf(startAt));
  const daysInEndMonth = getDaysInMonth(endAt);
  const pixelsPerDayInEndMonth = parsedColumnWidth / daysInEndMonth;

  return (
    (fullRangeOffset - 1) * parsedColumnWidth +
    startRangeOffset * pixelsPerDayInStartMonth +
    endRangeOffset * pixelsPerDayInEndMonth
  );
};

const calculateInnerOffset = (date: Date, range: Range, columnWidth: number) => {
  if (range === "weekly") {
    const dayIndex = differenceInDays(startOfDay(date), startOfWeek(date, WEEK_OPTIONS));
    return (dayIndex / DAYS_IN_WEEK) * columnWidth;
  }

  const startOf = getStartOf(range);
  const endOf = getEndOf(range);
  const differenceIn = getInnerDifferenceIn(range);
  const startOfRange = startOf(date);
  const endOfRange = endOf(date);
  const totalRangeDays = differenceIn(endOfRange, startOfRange);
  const dayOfMonth = date.getDate();

  return (dayOfMonth / totalRangeDays) * columnWidth;
};

const GanttContext = createContext<GanttContextProps>({
  zoom: 100,
  range: "monthly",
  columnWidth: 50,
  headerHeight: 60,
  sidebarWidth: 350,
  rowHeight: 44,
  onAddItem: undefined,
  setSidebarWidth: undefined,
  placeholderLength: 2,
  timelineData: [],
  ref: null,
});

export type GanttContentHeaderProps = {
  renderHeaderItem: (index: number) => ReactNode;
  title: string;
  columns: number;
};

export const GanttContentHeader: FC<GanttContentHeaderProps> = ({ title, columns, renderHeaderItem }) => {
  const id = useId();

  return (
    <div
      className="sticky top-0 z-20 grid w-full shrink-0 bg-backdrop/90 backdrop-blur-sm"
      style={{ height: "var(--gantt-header-height)" }}
    >
      <div>
        <div
          className="sticky inline-flex whitespace-nowrap px-3 py-2 text-muted-foreground text-xs"
          style={{
            left: "var(--gantt-sidebar-width)",
          }}
        >
          <p>{title}</p>
        </div>
      </div>
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))`,
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div className="shrink-0 border-border/50 border-b py-1 text-center text-xs" key={`${id}-${index}`}>
            {renderHeaderItem(index)}
          </div>
        ))}
      </div>
    </div>
  );
};

const DailyHeader: FC = () => {
  const gantt = useContext(GanttContext);
  const { t } = useI18n();

  return gantt.timelineData.map((year) =>
    year.quarters
      .flatMap((quarter) => quarter.months)
      .map((month, index) => (
        <div className="relative flex flex-col" key={`${year.year}-${index}`}>
          <GanttContentHeader
            columns={month.days}
            renderHeaderItem={(item: number) => (
              <div className="flex items-center justify-center gap-1">
                <p>{addDays(new Date(year.year, index, 1), item).getDate()}</p>
                <p className="text-muted-foreground">
                  {t(WEEKDAY_LABEL_KEYS[addDays(new Date(year.year, index, 1), item).getDay()])}
                </p>
              </div>
            )}
            title={t("ui.gantt.yearMonth", { year: year.year, month: index + 1 })}
          />
          <GanttColumns
            columns={month.days}
            isColumnSecondary={(item: number) => [0, 6].includes(addDays(new Date(year.year, index, 1), item).getDay())}
          />
        </div>
      )),
  );
};

const WeeklyHeader: FC = () => {
  const gantt = useContext(GanttContext);

  return gantt.timelineData.map((year) => {
    const columns = weeksInYear(year.year);
    const firstWeekStart = startOfWeek(new Date(year.year, 0, 1), WEEK_OPTIONS);

    return (
      <div className="relative flex flex-col" key={year.year}>
        <GanttContentHeader
          columns={columns}
          renderHeaderItem={(item: number) => <p>{formatShortDate(addWeeks(firstWeekStart, item))}</p>}
          title={`${year.year}`}
        />
        <GanttColumns columns={columns} />
      </div>
    );
  });
};

const MonthlyHeader: FC = () => {
  const gantt = useContext(GanttContext);
  const { t } = useI18n();

  return gantt.timelineData.map((year) => (
    <div className="relative flex flex-col" key={year.year}>
      <GanttContentHeader
        columns={year.quarters.flatMap((quarter) => quarter.months).length}
        renderHeaderItem={(item: number) => <p>{t("ui.gantt.month", { month: item + 1 })}</p>}
        title={`${year.year}`}
      />
      <GanttColumns columns={year.quarters.flatMap((quarter) => quarter.months).length} />
    </div>
  ));
};

const QuarterlyHeader: FC = () => {
  const gantt = useContext(GanttContext);
  const { t } = useI18n();

  return gantt.timelineData.map((year) =>
    year.quarters.map((quarter, quarterIndex) => (
      <div className="relative flex flex-col" key={`${year.year}-${quarterIndex}`}>
        <GanttContentHeader
          columns={quarter.months.length}
          renderHeaderItem={(item: number) => <p>{t("ui.gantt.month", { month: quarterIndex * 3 + item + 1 })}</p>}
          title={t("ui.gantt.yearQuarter", { year: year.year, quarter: quarterIndex + 1 })}
        />
        <GanttColumns columns={quarter.months.length} />
      </div>
    )),
  );
};

const headers: Record<Range, FC> = {
  daily: DailyHeader,
  weekly: WeeklyHeader,
  monthly: MonthlyHeader,
  quarterly: QuarterlyHeader,
};

export type GanttHeaderProps = {
  className?: string;
};

export const GanttHeader: FC<GanttHeaderProps> = ({ className }) => {
  const gantt = useContext(GanttContext);
  const Header = headers[gantt.range];

  return (
    <div className={cn("-space-x-px flex h-full w-max divide-x divide-border/50", className)}>
      <Header />
    </div>
  );
};

export type GanttSidebarItemProps = {
  actions?: ReactNode;
  accentColor?: string;
  feature: GanttFeature;
  indentLevel?: number;
  kindLabel?: string;
  onSelectItem?: (id: string) => void;
  parentLabel?: string | null;
  className?: string;
};

export const GanttSidebarItem: FC<GanttSidebarItemProps> = ({
  accentColor,
  actions,
  className,
  feature,
  indentLevel = 0,
  kindLabel,
  onSelectItem,
  parentLabel,
}) => {
  const { t } = useI18n();
  const tempEndAt = feature.endAt && isSameDay(feature.startAt, feature.endAt) ? addDays(feature.endAt, 1) : feature.endAt;
  const duration = formatDateRange(t, feature.startAt, tempEndAt);
  const color = accentColor ?? feature.status.color;

  const handleClick: MouseEventHandler<HTMLDivElement> = () => {
    onSelectItem?.(feature.id);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === "Enter") {
      onSelectItem?.(feature.id);
    }
  };

  return (
    <div
      className={cn("relative flex items-center gap-2.5 p-2.5 text-xs", className)}
      key={feature.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      style={{
        "--gantt-row-accent": color,
        "--gantt-row-indent": `${Math.max(0, indentLevel) * 18}px`,
        height: "var(--gantt-row-height)",
      } as CSSProperties}
      tabIndex={0}
    >
      <div
        className="pointer-events-none h-2 w-2 shrink-0 rounded-full"
        style={{
          backgroundColor: color,
        }}
      />
      <span
        className="pointer-events-none grid min-w-0 flex-1 gap-0.5 text-left"
        style={{ paddingLeft: "var(--gantt-row-indent)" }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {kindLabel ? (
            <span className="shrink-0 rounded-full border border-border/50 bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {kindLabel}
            </span>
          ) : null}
          <span className="truncate font-medium">{feature.name}</span>
        </span>
        {parentLabel ? <span className="truncate text-[10px] text-muted-foreground">{parentLabel}</span> : null}
      </span>
      <p className="pointer-events-none text-muted-foreground">{duration}</p>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  );
};

export const GanttSidebarHeader: FC = () => {
  const { t } = useI18n();

  return (
    <div
      className="sticky top-0 z-10 flex shrink-0 items-end justify-between gap-2.5 border-border/50 border-b bg-backdrop/90 p-2.5 font-medium text-muted-foreground text-xs backdrop-blur-sm"
      style={{ height: "var(--gantt-header-height)" }}
    >
      <p className="flex-1 truncate text-left">{t("ui.gantt.taskColumn")}</p>
      <p className="shrink-0">{t("ui.gantt.durationColumn")}</p>
    </div>
  );
};

export type GanttSidebarGroupProps = {
  children: ReactNode;
  name: string;
  className?: string;
};

export const GanttSidebarGroup: FC<GanttSidebarGroupProps> = ({ children, name, className }) => (
  <div className={className}>
    {name ? (
      <p
        className="w-full truncate p-2.5 text-left font-medium text-muted-foreground text-xs"
        style={{ height: "var(--gantt-row-height)" }}
      >
        {name}
      </p>
    ) : null}
    <div className="divide-y divide-border/50">{children}</div>
  </div>
);

export type GanttSidebarProps = {
  children: ReactNode;
  className?: string;
};

export const GanttSidebar: FC<GanttSidebarProps> = ({ children, className }) => {
  const gantt = useContext(GanttContext);

  const handleResizeStart: PointerEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = gantt.sidebarWidth;

    const handleMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(560, Math.max(280, startWidth + moveEvent.clientX - startX));
      gantt.setSidebarWidth?.(nextWidth);
    };

    const handleEnd = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd, { once: true });
  };

  return (
    <div
      className={cn(
        "sticky left-0 z-30 h-max min-h-full overflow-clip border-border/50 border-r bg-background/90 backdrop-blur-md",
        className,
      )}
      data-roadmap-ui="gantt-sidebar"
      style={{ width: "var(--gantt-sidebar-width)" }}
    >
      <GanttSidebarHeader />
      <div className="space-y-4">{children}</div>
      <div
        aria-label="WBS 목록 폭 조절"
        className="absolute top-0 right-0 z-40 h-full w-2 cursor-col-resize touch-none"
        onPointerDown={handleResizeStart}
        role="separator"
      />
    </div>
  );
};

export type GanttAddFeatureHelperProps = {
  top: number;
  className?: string;
};

export const GanttAddFeatureHelper: FC<GanttAddFeatureHelperProps> = ({ top, className }) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useContext(GanttContext);
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();

  const handleClick = () => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x = mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const currentDate = getDateByMousePosition(gantt, x);
    const rowIndex = Number.isFinite(top) ? Math.max(0, Math.floor(top / gantt.rowHeight)) : undefined;

    gantt.onAddItem?.(currentDate, rowIndex);
  };

  return (
    <div
      className={cn("absolute top-0 w-full px-0.5", className)}
      ref={mouseRef}
      style={{
        marginTop: -gantt.rowHeight / 2,
        transform: `translateY(${top}px)`,
      }}
    >
      <button
        className="flex h-full w-full items-center justify-center rounded-md border border-dashed p-2"
        onClick={handleClick}
        type="button"
      >
        <PlusIcon className="pointer-events-none select-none text-muted-foreground" size={16} />
      </button>
    </div>
  );
};

export type GanttColumnProps = {
  index: number;
  isColumnSecondary?: (item: number) => boolean;
};

export const GanttColumn: FC<GanttColumnProps> = ({ index, isColumnSecondary }) => {
  const gantt = useContext(GanttContext);
  const [dragging] = useGanttDragging();
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [hovering, setHovering] = useState(false);
  const [windowScroll] = useWindowScroll();

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => setHovering(false);

  const top = useThrottle(
    mousePosition.y - (mouseRef.current?.getBoundingClientRect().y ?? 0) - (windowScroll.y ?? 0),
    10,
  );

  return (
    <div
      className={cn("group relative h-full overflow-hidden", isColumnSecondary?.(index) ? "bg-secondary" : "")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={mouseRef}
    >
      {!dragging && hovering && gantt.onAddItem ? <GanttAddFeatureHelper top={top} /> : null}
    </div>
  );
};

export type GanttColumnsProps = {
  columns: number;
  isColumnSecondary?: (item: number) => boolean;
};

export const GanttColumns: FC<GanttColumnsProps> = ({ columns, isColumnSecondary }) => {
  const id = useId();

  return (
    <div
      className="divide grid h-full w-full divide-x divide-border/50"
      style={{
        gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))`,
      }}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <GanttColumn index={index} isColumnSecondary={isColumnSecondary} key={`${id}-${index}`} />
      ))}
    </div>
  );
};

export type GanttCreateMarkerTriggerProps = {
  onCreateMarker: (date: Date) => void;
  className?: string;
};

export const GanttCreateMarkerTrigger: FC<GanttCreateMarkerTriggerProps> = ({ onCreateMarker, className }) => {
  const gantt = useContext(GanttContext);
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [windowScroll] = useWindowScroll();
  const x = useThrottle(
    mousePosition.x - (mouseRef.current?.getBoundingClientRect().x ?? 0) - (windowScroll.x ?? 0),
    10,
  );

  const date = getDateByMousePosition(gantt, x);

  const handleClick = () => onCreateMarker(date);

  return (
    <div
      className={cn("group pointer-events-none absolute top-0 left-0 h-full w-full select-none overflow-visible", className)}
      ref={mouseRef}
    >
      <div
        className="-ml-2 pointer-events-auto sticky top-6 z-20 flex w-4 flex-col items-center justify-center gap-1 overflow-visible opacity-0 group-hover:opacity-100"
        style={{ transform: `translateX(${x}px)` }}
      >
        <button
          className="z-50 inline-flex h-4 w-4 items-center justify-center rounded-full bg-card"
          onClick={handleClick}
          type="button"
        >
          <PlusIcon className="text-muted-foreground" size={12} />
        </button>
        <div className="whitespace-nowrap rounded-full border border-border/50 bg-background/90 px-2 py-1 text-foreground text-xs backdrop-blur-lg">
          {formatFullDate(date)}
        </div>
      </div>
    </div>
  );
};

export type GanttFeatureDragHelperProps = {
  featureId: GanttFeature["id"];
  direction: "left" | "right";
  date: Date | null;
};

export const GanttFeatureDragHelper: FC<GanttFeatureDragHelperProps> = ({ direction, featureId, date }) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `feature-drag-helper-${featureId}`,
  });

  const isPressed = Boolean(attributes["aria-pressed"]);

  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);

  return (
    <div
      className={cn(
        "group -translate-y-1/2 !cursor-col-resize absolute top-1/2 z-[3] h-full w-6 rounded-md outline-none",
        direction === "left" ? "-left-2.5" : "-right-2.5",
      )}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
    >
      <div
        className={cn(
          "-translate-y-1/2 absolute top-1/2 h-[80%] w-1 rounded-sm bg-muted-foreground opacity-0 transition-all",
          direction === "left" ? "left-2.5" : "right-2.5",
          direction === "left" ? "group-hover:left-0" : "group-hover:right-0",
          isPressed && (direction === "left" ? "left-0" : "right-0"),
          "group-hover:opacity-100",
          isPressed && "opacity-100",
        )}
      />
      {date && (
        <div
          className={cn(
            "-translate-x-1/2 absolute top-10 hidden whitespace-nowrap rounded-lg border border-border/50 bg-background/90 px-2 py-1 text-foreground text-xs backdrop-blur-lg group-hover:block",
            isPressed && "block",
          )}
        >
          {formatFullDate(date)}
        </div>
      )}
    </div>
  );
};

export type GanttFeatureItemCardProps = Pick<GanttFeature, "id"> & {
  color?: string;
  children?: ReactNode;
};

export const GanttFeatureItemCard: FC<GanttFeatureItemCardProps> = ({ color, id, children }) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  const isPressed = Boolean(attributes["aria-pressed"]);

  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);

  return (
    <Card
      className="h-full w-full rounded-md bg-background p-2 text-xs shadow-sm"
      data-roadmap-ui="gantt-feature-card"
      style={{ "--gantt-feature-color": color ?? "currentColor" } as CSSProperties}
    >
      <div
        className={cn("flex h-full w-full items-center justify-between gap-2 text-left", isPressed && "cursor-grabbing")}
        {...attributes}
        {...listeners}
        ref={setNodeRef}
      >
        {children}
      </div>
    </Card>
  );
};

export type GanttFeatureItemProps = GanttFeature & {
  onMove?: (id: string, startDate: Date, endDate: Date | null) => void;
  children?: ReactNode;
  className?: string;
};

export const GanttFeatureItem: FC<GanttFeatureItemProps> = ({ onMove, children, className, ...feature }) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useContext(GanttContext);
  const timelineStartDate = new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1);
  const [startAt, setStartAt] = useState<Date>(feature.startAt);
  const [endAt, setEndAt] = useState<Date | null>(feature.endAt);
  const width = getWidth(startAt, endAt, gantt);
  const offset = getOffset(startAt, timelineStartDate, gantt);
  const addRange = getAddRange(gantt.range);
  const [mousePosition] = useMouse<HTMLDivElement>();

  const [previousMouseX, setPreviousMouseX] = useState(0);
  const [previousStartAt, setPreviousStartAt] = useState(startAt);
  const [previousEndAt, setPreviousEndAt] = useState(endAt);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const getTimelineMouseX = () => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    return mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
  };

  const handleItemDragStart = () => {
    setPreviousMouseX(getTimelineMouseX());
    setPreviousStartAt(startAt);
    setPreviousEndAt(endAt);
  };

  const handleItemDragMove = () => {
    const currentDate = getDateByMousePosition(gantt, getTimelineMouseX());
    const originalDate = getDateByMousePosition(gantt, previousMouseX);
    const delta =
      gantt.range === "daily"
        ? getDifferenceIn(gantt.range)(currentDate, originalDate)
        : getInnerDifferenceIn(gantt.range)(currentDate, originalDate);
    const newStartDate = addDays(previousStartAt, delta);
    const newEndDate = previousEndAt ? addDays(previousEndAt, delta) : null;

    setStartAt(newStartDate);
    setEndAt(newEndDate);
  };

  const onDragEnd = () => onMove?.(feature.id, startAt, endAt);

  const handleLeftDragMove = () => {
    const newStartAt = getDateByMousePosition(gantt, getTimelineMouseX());

    setStartAt(newStartAt);
  };

  const handleRightDragMove = () => {
    const newEndAt = getDateByMousePosition(gantt, getTimelineMouseX());

    setEndAt(newEndAt);
  };

  return (
    <div
      className={cn("relative flex w-max min-w-full py-0.5", className)}
      style={{ height: "var(--gantt-row-height)" }}
    >
      <div
        className="pointer-events-auto absolute top-0.5"
        data-gantt-feature-id={feature.id}
        style={{
          height: "calc(var(--gantt-row-height) - 4px)",
          width: Math.round(width),
          left: Math.round(offset),
        }}
      >
        {onMove && (
          <DndContext
            autoScroll={false}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={onDragEnd}
            onDragMove={handleLeftDragMove}
            sensors={[mouseSensor]}
          >
            <GanttFeatureDragHelper date={startAt} direction="left" featureId={feature.id} />
          </DndContext>
        )}
        <DndContext
          autoScroll={false}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={onDragEnd}
          onDragMove={handleItemDragMove}
          onDragStart={handleItemDragStart}
          sensors={[mouseSensor]}
        >
          <GanttFeatureItemCard color={feature.status.color} id={feature.id}>
            {children ?? <p className="flex-1 truncate text-xs">{feature.name}</p>}
          </GanttFeatureItemCard>
        </DndContext>
        {onMove && (
          <DndContext
            autoScroll={false}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={onDragEnd}
            onDragMove={handleRightDragMove}
            sensors={[mouseSensor]}
          >
            <GanttFeatureDragHelper date={endAt ?? addRange(startAt, 2)} direction="right" featureId={feature.id} />
          </DndContext>
        )}
      </div>
    </div>
  );
};

export type GanttFeatureListGroupProps = {
  children: ReactNode;
  className?: string;
  hasHeader?: boolean;
};

export const GanttFeatureListGroup: FC<GanttFeatureListGroupProps> = ({ children, className, hasHeader = true }) => (
  <div className={className} style={{ paddingTop: hasHeader ? "var(--gantt-row-height)" : 0 }}>
    {children}
  </div>
);

export type GanttFeatureListProps = {
  className?: string;
  children: ReactNode;
};

export const GanttFeatureList: FC<GanttFeatureListProps> = ({ className, children }) => (
  <div
    className={cn("absolute top-0 left-0 h-full w-max space-y-4", className)}
    style={{ marginTop: "var(--gantt-header-height)" }}
  >
    {children}
  </div>
);

export const GanttMarker: FC<
  GanttMarkerProps & {
    onRemove?: (id: string) => void;
    onRename?: (id: string) => void;
    className?: string;
  }
> = ({ label, date, id, onRemove, onRename, className }) => {
  const { t } = useI18n();
  const gantt = useContext(GanttContext);
  const differenceIn = getDifferenceIn(gantt.range);
  const timelineStartDate = new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1);
  const offset = differenceIn(date, timelineStartDate);
  const innerOffset = calculateInnerOffset(date, gantt.range, (gantt.columnWidth * gantt.zoom) / 100);
  const handleRemove = () => onRemove?.(id);
  const handleRename = () => onRename?.(id);

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
      style={{
        width: 0,
        transform: `translateX(calc(var(--gantt-column-width) * ${offset} + ${innerOffset}px))`,
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-card px-2 py-1 text-foreground text-xs",
              className,
            )}
          >
            {label}
            <span className="max-h-[0] overflow-hidden opacity-80 transition-all group-hover:max-h-[2rem]">
              {formatFullDate(date)}
            </span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onRename ? (
            <ContextMenuItem className="flex items-center gap-2" onClick={handleRename}>
              <PencilIcon className="text-muted-foreground" size={16} />
              {t("ui.gantt.rename")}
            </ContextMenuItem>
          ) : null}
          {onRemove ? (
            <ContextMenuItem className="flex items-center gap-2 text-destructive" onClick={handleRemove}>
              <TrashIcon size={16} />
              {t("ui.gantt.removeMarker")}
            </ContextMenuItem>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      <div className={cn("h-full w-px bg-card", className)} />
    </div>
  );
};

export type GanttProviderProps = {
  range?: Range;
  zoom?: number;
  onAddItem?: (date: Date, rowIndex?: number) => void;
  children: ReactNode;
  className?: string;
};

export const GanttProvider: FC<GanttProviderProps> = ({ zoom = 100, range = "monthly", onAddItem, children, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [timelineData] = useState<TimelineData>(createInitialTimelineData(new Date()));
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [, setScrollX] = useGanttScrollX();

  const headerHeight = 60;
  const rowHeight = 44;

  let columnWidth = 50;

  if (range === "weekly") {
    columnWidth = 140;
  } else if (range === "monthly") {
    columnWidth = 150;
  } else if (range === "quarterly") {
    columnWidth = 100;
  }

  const cssVariables = {
    "--gantt-zoom": `${zoom}`,
    "--gantt-column-width": `${(zoom / 100) * columnWidth}px`,
    "--gantt-header-height": `${headerHeight}px`,
    "--gantt-row-height": `${rowHeight}px`,
    "--gantt-sidebar-width": `${sidebarWidth}px`,
  } as CSSProperties;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-render when props change
  useEffect(() => {
    const element = scrollRef.current;
    const timelineStartYear = timelineData[0]?.year;

    if (element && timelineStartYear) {
      const today = new Date();
      const timelineStartDate = new Date(timelineStartYear, 0, 1);
      const todayOffset = getOffset(today, timelineStartDate, {
        columnWidth,
        headerHeight,
        onAddItem,
        placeholderLength: 2,
        range,
        ref: scrollRef,
        rowHeight,
        sidebarWidth,
        timelineData,
        zoom,
      });
      const viewportWidth = Math.max(0, element.clientWidth - sidebarWidth);
      const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
      const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, todayOffset - viewportWidth * 0.36));

      element.scrollLeft = nextScrollLeft;
      setScrollX(element.scrollLeft);
    }
  }, [range, zoom, setScrollX]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: "Throttled"
  const handleScroll = useCallback(
    throttle(() => {
      if (!scrollRef.current) {
        return;
      }

      setScrollX(scrollRef.current.scrollLeft);
    }, 100),
    [setScrollX],
  );

  useEffect(() => {
    const element = scrollRef.current;

    if (element) {
      element.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (element) {
        element.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]);

  return (
    <GanttContext.Provider
      value={{
        zoom,
        range,
        headerHeight,
        columnWidth,
        sidebarWidth,
        rowHeight,
        onAddItem,
        setSidebarWidth,
        timelineData,
        placeholderLength: 2,
        ref: scrollRef,
      }}
    >
      <div
        className={cn("gantt relative grid h-full w-full flex-none select-none overflow-auto rounded-sm bg-secondary", range, className)}
        data-roadmap-ui="gantt-root"
        ref={scrollRef}
        style={{
          ...cssVariables,
          gridTemplateColumns: "var(--gantt-sidebar-width) 1fr",
        }}
      >
        {children}
      </div>
    </GanttContext.Provider>
  );
};

export type GanttTimelineProps = {
  children: ReactNode;
  className?: string;
};

export const GanttTimeline: FC<GanttTimelineProps> = ({ children, className }) => (
  <div className={cn("relative flex h-full w-max flex-none overflow-clip", className)}>{children}</div>
);

export type GanttTodayProps = {
  className?: string;
};

export const GanttToday: FC<GanttTodayProps> = ({ className }) => {
  const { t } = useI18n();
  const label = t("ui.gantt.today");
  const date = new Date();
  const gantt = useContext(GanttContext);
  const differenceIn = getDifferenceIn(gantt.range);
  const timelineStartDate = new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1);
  const offset = differenceIn(date, timelineStartDate);
  const innerOffset = calculateInnerOffset(date, gantt.range, (gantt.columnWidth * gantt.zoom) / 100);

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
      style={{
        width: 0,
        transform: `translateX(calc(var(--gantt-column-width) * ${offset} + ${innerOffset}px))`,
      }}
    >
      <div
        className={cn(
          "group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-card px-2 py-1 text-foreground text-xs",
          className,
        )}
      >
        {label}
        <span className="max-h-[0] overflow-hidden opacity-80 transition-all group-hover:max-h-[2rem]">
          {formatFullDate(date)}
        </span>
      </div>
      <div className={cn("h-full w-px bg-card", className)} />
    </div>
  );
};
