import { CalendarCheck2, CalendarClock, CheckCircle2, ExternalLink, ShieldCheck, Sparkles, Unplug } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type CalendarItem = {
  title: string;
  source: "Bubli" | "Google Calendar";
  time: string;
  projectHint: string;
  status: "confirmed" | "external" | "candidate";
};

const calendarItems: CalendarItem[] = [
  {
    projectHint: "자료 기준 정리",
    source: "Bubli",
    status: "confirmed",
    time: "10:00",
    title: "납품물 범위 확인",
  },
  {
    projectHint: "외부 일정",
    source: "Google Calendar",
    status: "external",
    time: "13:30",
    title: "클라이언트 미팅",
  },
  {
    projectHint: "웹사이트 리뉴얼",
    source: "Bubli",
    status: "candidate",
    time: "16:00",
    title: "검수 기준 질문 보내기",
  },
];

const statusMeta: Record<CalendarItem["status"], { label: string; tone: "success" | "pending" | "personal" }> = {
  candidate: { label: "일정 후보", tone: "pending" },
  confirmed: { label: "Bubli 일정", tone: "success" },
  external: { label: "외부 일정", tone: "personal" },
};

function CalendarSyncRow({ item }: { item: CalendarItem }) {
  const status = statusMeta[item.status];

  return (
    <article className="google-calendar-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <CalendarClock size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="google-calendar-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.time}</span>
          <span>{item.source}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.projectHint}</p>
      </div>
    </article>
  );
}

export function GoogleCalendarSyncPanel() {
  return (
    <section className="google-calendar-sync" aria-label="Google Calendar 연동">
      <GlassPanel className="google-calendar-sync__hero">
        <div className="google-calendar-sync__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <CalendarCheck2 size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>일정 연동</Chip>
            <h2>Bubli 일정과 외부 일정을 한 화면에서 봅니다</h2>
            <p>
              프로젝트룸에서 승인된 일정과 TODO 마감은 Bubli 서버에 저장됩니다. Google Calendar 일정은 오늘의
              충돌과 빈 시간을 함께 볼 수 있게 연결합니다.
            </p>
          </div>
        </div>
        <div className="google-calendar-sync__status">
          <StatusBadge tone="success">연결됨</StatusBadge>
          <strong>12개</strong>
          <span>오늘 표시 일정</span>
          <ProgressBar label="캘린더 동기화 상태" value={91} />
        </div>
      </GlassPanel>

      <div className="google-calendar-sync__grid">
        <GlassPanel className="google-calendar-sync__panel">
          <div className="google-calendar-sync__panel-header">
            <div>
              <h3>오늘 일정</h3>
              <p>Bubli 원본 일정과 외부 일정을 구분해서 보여줍니다.</p>
            </div>
          </div>

          <div className="google-calendar-sync__list">
            {calendarItems.map((item) => (
              <CalendarSyncRow item={item} key={`${item.source}-${item.title}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="google-calendar-sync__policy">
          <h3>연동 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>에이전트가 만든 일정 후보는 사용자가 승인한 뒤 Bubli 일정에 저장합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ExternalLink size={16} strokeWidth={2.1} />
            </span>
            <p>Google Calendar 일정은 외부 일정으로 표시하고, 프로젝트룸 자료나 WBS를 직접 바꾸지 않습니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Unplug size={16} strokeWidth={2.1} />
            </span>
            <p>연동이 끊겨도 Bubli 일정, TODO, 타이머 기록은 서버 원본 기준으로 유지됩니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>캘린더 접근 권한은 사용자 설정에서 해제할 수 있고, 사용자가 선택한 일정만 프로젝트룸에 연결합니다.</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="google-calendar-sync__footer">
        <span className="bubli-icon-tile" aria-hidden="true">
          <Sparkles size={16} strokeWidth={2.1} />
        </span>
        <p>대시보드와 일정/WBS 버블은 Bubli 일정과 외부 일정을 함께 보여주되, 원본 위치를 구분합니다.</p>
      </GlassPanel>
    </section>
  );
}
