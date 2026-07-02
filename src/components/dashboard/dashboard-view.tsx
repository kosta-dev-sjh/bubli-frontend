"use client";

import { Settings2 } from "lucide-react";
import type { ReactNode } from "react";

import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { widgetIcon } from "@/components/dashboard/dashboard-palette";
import { DashboardWidgetTile } from "@/components/dashboard/dashboard-widget-tile";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Ring } from "@/components/ui/ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

/* Storybook에서 카드 조립을 확인하는 정적 데이터다. 실제 라우트는 API 데이터를 쓴다. */
export type DashboardViewData = {
  summary: { resources: number; candidates: number; todos: number; minutesFocused: number };
  todos: { id: string; titleKey: MessageKey; tone: "todo" | "warning" | "approved"; metaKey: MessageKey }[];
  timeRing: { labelKey: MessageKey; value: number; max: number; segments: { labelKey: MessageKey; value: number }[] };
  agent: { messageKey: MessageKey; count: number };
  approvals: { id: string; titleKey: MessageKey; fromKey: MessageKey }[];
  schedule: { id: string; time: string; titleKey: MessageKey }[];
  notifications: { id: string; tone: "todo" | "agent" | "memo" | "communication"; textKey: MessageKey }[];
};

export const DASHBOARD_STORY_DATA: DashboardViewData = {
  summary: { resources: 3, candidates: 6, todos: 4, minutesFocused: 135 },
  todos: [
    { id: "t1", titleKey: "dashboard.view.todo1", tone: "warning", metaKey: "dashboard.view.todo1Meta" },
    { id: "t2", titleKey: "dashboard.view.todo2", tone: "todo", metaKey: "dashboard.view.todo2Meta" },
    { id: "t3", titleKey: "dashboard.view.todo3", tone: "todo", metaKey: "dashboard.view.todo3Meta" },
    { id: "t4", titleKey: "dashboard.view.todo4", tone: "approved", metaKey: "dashboard.view.todo4Meta" },
  ],
  timeRing: {
    labelKey: "dashboard.view.ringLabel",
    value: 135,
    max: 240,
    segments: [
      { labelKey: "dashboard.view.ringSeg1", value: 70 },
      { labelKey: "dashboard.view.ringSeg2", value: 45 },
      { labelKey: "dashboard.view.ringSeg3", value: 20 },
    ],
  },
  agent: { messageKey: "dashboard.view.agentMessage", count: 6 },
  approvals: [
    { id: "a1", titleKey: "dashboard.view.approval1", fromKey: "dashboard.view.approval1From" },
    { id: "a2", titleKey: "dashboard.view.approval2", fromKey: "dashboard.view.approval2From" },
  ],
  schedule: [
    { id: "s1", time: "11:00", titleKey: "dashboard.view.schedule1" },
    { id: "s2", time: "15:30", titleKey: "dashboard.view.schedule2" },
  ],
  notifications: [
    { id: "n1", tone: "communication", textKey: "dashboard.view.noti1" },
    { id: "n2", tone: "agent", textKey: "dashboard.view.noti2" },
    { id: "n3", tone: "memo", textKey: "dashboard.view.noti3" },
  ],
};

function Line({ children }: { children: ReactNode }) {
  return <div className="bubli-dash-line">{children}</div>;
}

function Skeleton({ w = "100%", h = 12 }: { w?: string | number; h?: number }) {
  return <span className="bubli-skeleton" style={{ display: "block", width: w, height: h, borderRadius: 8 }} />;
}

type DashboardViewProps = {
  data?: DashboardViewData;
  empty?: boolean;
  loading?: boolean;
  onCustomize?: () => void;
};

export function DashboardView({ data = DASHBOARD_STORY_DATA, empty = false, loading = false, onCustomize }: DashboardViewProps) {
  const { t } = useI18n();
  const hoursLabel = t("dashboard.common.hourMinute", {
    hours: Math.floor(data.summary.minutesFocused / 60),
    minutes: data.summary.minutesFocused % 60,
  });

  return (
    <div className="bubli-dash-view">
      <header className="bubli-dash-view__bar">
        <div>
          <strong className="bubli-dash-view__title">{t("dashboard.view.title")}</strong>
          <p className="bubli-dash-view__sub">
            {t("dashboard.view.subtitle")}
          </p>
        </div>
        <Button onClick={onCustomize} variant="primary">
          <Settings2 aria-hidden size={15} strokeWidth={1.8} />
          {t("dashboard.view.editCards")}
        </Button>
      </header>

      {empty ? (
        <DashboardGrid empty mode="edit" />
      ) : (
        <DashboardGrid mode="view">
          <DashboardWidgetTile icon={widgetIcon("today-summary")} size="L" title={t("dashboard.view.todaySummary")}>
            {loading ? (
              <div style={{ display: "grid", gap: 8 }}>
                <Skeleton w="60%" />
                <Skeleton w="80%" />
              </div>
            ) : (
              <div className="bubli-dash-summary">
                <span>{t("dashboard.view.resources", { count: data.summary.resources })}</span>
                <span>{t("dashboard.view.candidates", { count: data.summary.candidates })}</span>
                <span>{t("dashboard.view.todos", { count: data.summary.todos })}</span>
                <span>{t("dashboard.view.focus", { value: hoursLabel })}</span>
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("today-todos")} size="M" title={t("dashboard.view.todayTodos")}>
            {loading ? (
              <div style={{ display: "grid", gap: 8 }}>
                <Skeleton />
                <Skeleton w="70%" />
                <Skeleton w="85%" />
              </div>
            ) : (
              <div className="bubli-dash-list">
                {data.todos.map((todo) => (
                  <Line key={todo.id}>
                    <span>{t(todo.titleKey)}</span>
                    <StatusBadge tone={todo.tone}>{t(todo.metaKey)}</StatusBadge>
                  </Line>
                ))}
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("project-time-ring")} size="M" title={t("dashboard.view.projectTime")}>
            {loading ? (
              <Skeleton h={96} w={96} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Ring
                  label={t(data.timeRing.labelKey)}
                  max={data.timeRing.max}
                  metric={`${Math.round((data.timeRing.value / data.timeRing.max) * 100)}%`}
                  segments={data.timeRing.segments.map((s) => ({ label: t(s.labelKey), value: s.value }))}
                  variant="time"
                />
                <div className="bubli-dash-list" style={{ flex: 1 }}>
                  {data.timeRing.segments.map((s) => (
                    <Line key={s.labelKey}>
                      <span>{t(s.labelKey)}</span>
                      <span className="bubli-dash-faint">{t("dashboard.view.minutes", { value: s.value })}</span>
                    </Line>
                  ))}
                </div>
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("pending-approval")} size="M" title={t("dashboard.view.needCheck")}>
            {loading ? (
              <Skeleton w="90%" h={40} />
            ) : (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden="true" className="bubli-agent-signal" />
                <div style={{ display: "grid", gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 13 }}>{t("dashboard.view.needCheckBody")}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button size="sm" variant="primary">
                      {t("dashboard.view.confirm")}
                    </Button>
                    <Chip>{t("dashboard.view.candidateCount", { count: data.agent.count })}</Chip>
                  </div>
                </div>
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("pending-approval")} size="M" title={t("dashboard.view.pendingApproval")}>
            {loading ? (
              <Skeleton w="80%" />
            ) : (
              <div className="bubli-dash-list">
                {data.approvals.map((a) => (
                  <Line key={a.id}>
                    <span>{t(a.titleKey)}</span>
                    <span className="bubli-dash-faint">{t(a.fromKey)}</span>
                  </Line>
                ))}
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("schedule")} size="M" title={t("dashboard.view.schedule")}>
            {loading ? (
              <Skeleton w="70%" />
            ) : (
              <div className="bubli-dash-list">
                {data.schedule.map((s) => (
                  <Line key={s.id}>
                    <span className="bubli-dash-faint">{s.time}</span>
                    <span style={{ flex: 1, textAlign: "right" }}>{t(s.titleKey)}</span>
                  </Line>
                ))}
              </div>
            )}
          </DashboardWidgetTile>

          <DashboardWidgetTile icon={widgetIcon("notifications")} size="M" title={t("dashboard.view.notifications")}>
            {loading ? (
              <Skeleton w="85%" />
            ) : (
              <div className="bubli-dash-list">
                {data.notifications.map((n) => (
                  <Line key={n.id}>
                    <StatusBadge tone={n.tone}>·</StatusBadge>
                    <span style={{ flex: 1 }}>{t(n.textKey)}</span>
                  </Line>
                ))}
              </div>
            )}
          </DashboardWidgetTile>
        </DashboardGrid>
      )}
    </div>
  );
}
