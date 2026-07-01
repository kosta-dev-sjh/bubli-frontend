import { CalendarDays, CheckCircle2, Clock3, ExternalLink, Link2, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

type ScheduleSource = "internal" | "google";
type ScheduleKind = "meeting" | "deadline" | "focus";

type ScheduleItem = {
  connectedItem: string;
  dateLabel: string;
  kind: ScheduleKind;
  projectRoom: string;
  source: ScheduleSource;
  time: string;
  title: string;
};

const days = [
  { day: "월", date: "22", count: 4, selected: true },
  { day: "화", date: "23", count: 2 },
  { day: "수", date: "24", count: 3 },
  { day: "목", date: "25", count: 1 },
  { day: "금", date: "26", count: 5 },
];

const schedules: ScheduleItem[] = [
  {
    connectedItem: "TODO: 번역 검수 기준 확인",
    dateLabel: "오늘",
    kind: "meeting",
    projectRoom: "요구사항 정리",
    source: "google",
    time: "10:30",
    title: "클라이언트 확인 미팅",
  },
  {
    connectedItem: "WBS 2.1 납품물 정리",
    dateLabel: "오늘",
    kind: "deadline",
    projectRoom: "브랜드 소개서",
    source: "internal",
    time: "15:00",
    title: "1차 납품 마감",
  },
  {
    connectedItem: "타이머 버블 집중 세션",
    dateLabel: "오늘",
    kind: "focus",
    projectRoom: "웹사이트 리뉴얼",
    source: "internal",
    time: "17:00",
    title: "작업판 정리",
  },
];

const kindMeta: Record<ScheduleKind, { label: string; tone: "communication" | "warning" | "timer" }> = {
  deadline: { label: "마감", tone: "warning" },
  focus: { label: "집중", tone: "timer" },
  meeting: { label: "미팅", tone: "communication" },
};

const sourceCopy: Record<ScheduleSource, string> = {
  google: "Google Calendar",
  internal: "Bubli 일정",
};

function ScheduleRow({ item }: { item: ScheduleItem }) {
  const meta = kindMeta[item.kind];

  return (
    <article className="schedule-row">
      <div className="schedule-row__time">
        <Clock3 size={15} strokeWidth={2.1} />
        <b>{item.time}</b>
      </div>
      <div className="schedule-row__body">
        <div className="schedule-row__meta">
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          <span>{item.projectRoom}</span>
          <span>{sourceCopy[item.source]}</span>
        </div>
        <h3>{item.title}</h3>
        <p>
          <Link2 size={14} strokeWidth={2.1} aria-hidden="true" />
          {item.connectedItem}
        </p>
      </div>
    </article>
  );
}

export function ScheduleOverviewPanel() {
  return (
    <section className="schedule-overview" aria-label="일정과 캘린더">
      <GlassPanel className="schedule-overview__hero">
        <div className="schedule-overview__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <CalendarDays size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>일정/WBS 버블</Chip>
            <h2>일정은 따로 흩어지지 않고 작업과 연결해서 봅니다</h2>
            <p>
              Bubli 일정은 서버에 저장된 일정을 원본으로 두고, 연결된 TODO와 WBS를 함께 보여줍니다.
            </p>
          </div>
        </div>
        <div className="schedule-overview__summary">
          <strong>4</strong>
          <span>오늘 일정</span>
          <p>외부 캘린더 일정은 사용자가 연결한 범위 안에서 표시합니다.</p>
        </div>
      </GlassPanel>

      <div className="schedule-overview__grid">
        <GlassPanel className="schedule-overview__calendar">
          <div className="schedule-overview__toolbar">
            <h3>6월 일정</h3>
            <Button icon={<ExternalLink size={15} />} size="sm" variant="quiet">
              Google Calendar 연결
            </Button>
          </div>
          <div className="schedule-days" aria-label="주간 일정 요약">
            {days.map((day) => (
              <button className={day.selected ? "schedule-day schedule-day--selected" : "schedule-day"} key={day.date} type="button">
                <span>{day.day}</span>
                <b>{day.date}</b>
                <small>{day.count}건</small>
              </button>
            ))}
          </div>
          <div className="schedule-overview__items">
            {schedules.map((item) => (
              <ScheduleRow item={item} key={`${item.time}-${item.title}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="schedule-overview__policy">
          <h3>표시 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>내부 일정과 마감은 서버에 저장된 일정을 기준으로 대시보드와 버블에 같이 표시합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Video size={16} strokeWidth={2.1} />
            </span>
            <p>프로젝트룸 보이스 일정은 소통 기능과 연결하지만, 보이스 녹음이나 자동 회의록은 만들지 않습니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
