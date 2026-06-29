import { AlertCircle, CalendarDays, CheckCircle2, Clock3, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

export type DashboardFiveCardState = "ready" | "empty" | "loading" | "error";

type DashboardFocusCard = {
  description: string;
  label: string;
  meta: string;
  tone: "todo" | "warning" | "agent" | "timer" | "personal";
  value: string;
};

const focusCards: DashboardFocusCard[] = [
  { description: "오늘 내 담당 작업", label: "오늘 TODO", meta: "tasks", tone: "todo", value: "8" },
  { description: "이번 주 안에 닫을 일정", label: "가까운 마감", meta: "schedules", tone: "warning", value: "5" },
  { description: "승인하거나 답해야 할 항목", label: "확인 필요", meta: "agent_suggestions", tone: "agent", value: "3" },
  { description: "오늘 누적 작업 시간", label: "작업 시간", meta: "time_logs", tone: "timer", value: "03:42" },
  { description: "내가 참여한 프로젝트룸 흐름", label: "룸별 요약", meta: "project_rooms", tone: "personal", value: "4" },
];

const iconMap = {
  agent: AlertCircle,
  personal: FolderKanban,
  timer: Clock3,
  todo: CheckCircle2,
  warning: CalendarDays,
};

function DashboardFiveCardStatePanel({ state }: { state: Exclude<DashboardFiveCardState, "ready"> }) {
  const copy = {
    empty: {
      action: "프로젝트룸 만들기",
      body: "아직 대시보드에 표시할 내 작업이 없습니다. 자료를 올리거나 TODO를 직접 추가하면 이곳에 모입니다.",
      title: "오늘 보여줄 작업이 없습니다",
    },
    error: {
      action: "다시 불러오기",
      body: "대시보드 데이터를 가져오지 못했습니다. 서버 원본은 유지되므로 잠시 뒤 다시 조회하면 됩니다.",
      title: "대시보드를 불러오지 못했습니다",
    },
    loading: {
      action: "불러오는 중",
      body: "TODO, 일정, 확인 필요 항목, 작업 시간을 사용자 기준으로 모으는 중입니다.",
      title: "대시보드를 준비하고 있습니다",
    },
  }[state];

  return (
    <GlassPanel className="dashboard-five-card-state">
      <Chip selected>{state === "loading" ? "로딩" : state === "empty" ? "빈 상태" : "오류"}</Chip>
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      <Button disabled={state === "loading"} variant={state === "error" ? "primary" : "quiet"}>
        {copy.action}
      </Button>
    </GlassPanel>
  );
}

export function DashboardFiveCardPanel({ state = "ready" }: { state?: DashboardFiveCardState }) {
  if (state !== "ready") {
    return <DashboardFiveCardStatePanel state={state} />;
  }

  return (
    <section className="dashboard-five-card" aria-label="대시보드 핵심 카드">
      <div className="dashboard-five-card__head">
        <div>
          <Chip selected>개인 대시보드</Chip>
          <h2>오늘 볼 것만 다섯 장으로 모읍니다</h2>
          <p>서버에 확정된 TODO, 일정, 알림, 작업 시간을 사용자 기준으로 묶어 보여줍니다.</p>
        </div>
        <Button variant="quiet">카드 구성</Button>
      </div>
      <div className="dashboard-five-card__grid">
        {focusCards.map((card) => {
          const Icon = iconMap[card.tone];
          return (
            <GlassPanel className="dashboard-five-card__item" key={card.label}>
              <div className="dashboard-five-card__topline">
                <span className="bubli-icon-tile" aria-hidden="true">
                  <Icon size={17} strokeWidth={2.1} />
                </span>
                <StatusBadge tone={card.tone}>{card.meta}</StatusBadge>
              </div>
              <strong>{card.value}</strong>
              <b>{card.label}</b>
              <p>{card.description}</p>
            </GlassPanel>
          );
        })}
      </div>
    </section>
  );
}
