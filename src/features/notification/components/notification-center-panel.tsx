import { Bell, BellRing, CalendarClock, CheckCircle2, EyeOff, MessageCircle, Pin, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

type NotificationKind = "todo" | "agent" | "communication" | "schedule";
type NotificationState = "unread" | "read" | "dismissed";

type NotificationItem = {
  description: string;
  kind: NotificationKind;
  originLabel: string;
  projectRoom: string;
  state: NotificationState;
  title: string;
  time: string;
};

const notifications: NotificationItem[] = [
  {
    description: "검수 기준 확인 요청이 생겼습니다. 승인 전 후보라서 작업판에는 아직 반영되지 않았습니다.",
    kind: "agent",
    originLabel: "에이전트 후보",
    projectRoom: "자료 기준 정리",
    state: "unread",
    time: "방금 전",
    title: "확인 질문 후보 2건",
  },
  {
    description: "오늘 마감인 TODO입니다. 담당자가 나로 지정되어 대시보드와 TODO 버블에 함께 보입니다.",
    kind: "todo",
    originLabel: "내 TODO",
    projectRoom: "브랜드 소개서",
    state: "unread",
    time: "12분 전",
    title: "1차 시안 검토",
  },
  {
    description: "프로젝트룸 채팅에서 나를 언급했습니다. 데스크톱 앱에서는 소통 버블에서 바로 열 수 있습니다.",
    kind: "communication",
    originLabel: "프로젝트룸 채팅",
    projectRoom: "웹사이트 리뉴얼",
    state: "read",
    time: "35분 전",
    title: "새 멘션",
  },
  {
    description: "오후 일정이 30분 앞으로 다가왔습니다. Google Calendar와 연결된 일정은 같은 일정 기준으로 표시합니다.",
    kind: "schedule",
    originLabel: "일정",
    projectRoom: "정기 운영 업무",
    state: "dismissed",
    time: "1시간 전",
    title: "회의 준비 알림",
  },
];

const kindMeta: Record<NotificationKind, { icon: typeof Bell; label: string; tone: "todo" | "agent" | "communication" | "warning" }> = {
  agent: { icon: Sparkles, label: "에이전트", tone: "agent" },
  communication: { icon: MessageCircle, label: "소통", tone: "communication" },
  schedule: { icon: CalendarClock, label: "일정", tone: "warning" },
  todo: { icon: CheckCircle2, label: "TODO", tone: "todo" },
};

const stateCopy: Record<NotificationState, { label: string; tone: "neutral" | "pending" | "success" }> = {
  dismissed: { label: "닫음", tone: "neutral" },
  read: { label: "읽음", tone: "success" },
  unread: { label: "새 알림", tone: "pending" },
};

function NotificationRow({ item }: { item: NotificationItem }) {
  const meta = kindMeta[item.kind];
  const state = stateCopy[item.state];
  const Icon = meta.icon;

  return (
    <article className="notification-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={17} strokeWidth={2.1} />
      </span>
      <div className="notification-row__body">
        <div className="notification-row__head">
          <div>
            <div className="notification-row__meta">
              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              <span>{item.projectRoom}</span>
              <span>{item.time}</span>
            </div>
            <h3>{item.title}</h3>
          </div>
          <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
        </div>
        <p>{item.description}</p>
        <footer className="notification-row__footer">
          <span>연결 항목: {item.originLabel}</span>
          <div>
            <Button icon={<Pin size={14} />} size="sm" variant="ghost">
              고정
            </Button>
            <Button icon={<EyeOff size={14} />} size="sm" variant="quiet">
              숨김
            </Button>
          </div>
        </footer>
      </div>
    </article>
  );
}

export function NotificationCenterPanel() {
  const unreadCount = notifications.filter((item) => item.state === "unread").length;

  return (
    <section className="notification-center" aria-label="알림 센터">
      <GlassPanel className="notification-center__hero">
        <div className="notification-center__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <BellRing size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>알림 버블</Chip>
            <h2>알림을 모아 보고, 버블에서는 필요한 것만 띄웁니다</h2>
            <p>
              알림은 웹과 데스크톱 버블에서 같은 기준으로 보입니다. 읽음, 숨김, 고정 같은 선택은 사용자별로 저장합니다.
            </p>
          </div>
        </div>
        <div className="notification-center__summary" aria-label="알림 요약">
          <strong>{unreadCount}</strong>
          <span>확인할 새 알림</span>
          <p>프로젝트룸, TODO, 일정, 에이전트 후보에서 온 알림을 사용자 기준으로 정리합니다.</p>
        </div>
      </GlassPanel>

      <div className="notification-center__grid">
        <GlassPanel className="notification-center__list">
          <div className="notification-center__toolbar">
            <h3>오늘 알림</h3>
            <div>
              <Chip selected>전체</Chip>
              <Chip>읽지 않음</Chip>
              <Chip>고정</Chip>
            </div>
          </div>
          <div className="notification-center__items">
            {notifications.map((item) => (
              <NotificationRow item={item} key={`${item.originLabel}-${item.title}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="notification-center__policy">
          <h3>저장 기준</h3>
          <dl>
            <div>
              <dt>원본</dt>
              <dd>TODO, 일정, 채팅, 에이전트 후보처럼 실제 항목이 있는 곳을 기준으로 다시 불러옵니다.</dd>
            </div>
            <div>
              <dt>사용자 상태</dt>
              <dd>읽음, 숨김, 고정, 다시 보기는 사용자별 상태로 남깁니다.</dd>
            </div>
            <div>
              <dt>데스크톱 표시</dt>
              <dd>알림 버블은 최근 표시만 빠르게 보여주고, 자세한 사용 기록은 기기 안에 남깁니다.</dd>
            </div>
          </dl>
        </GlassPanel>
      </div>
    </section>
  );
}
