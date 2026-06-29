import {
  Archive,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  MonitorSmartphone,
  RadioTower,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

import styles from "./notification-routing-boundary-panel.module.css";

type NotificationRoute = {
  description: string;
  icon: typeof Server;
  label: string;
  routeLabel: string;
  scope: string;
  tone: "approved" | "pending" | "personal" | "room";
};

type NotificationItem = {
  channel: string;
  label: string;
  message: string;
  sourceLabel: string;
  state: "unread" | "read" | "archived";
};

type DeliveryRule = {
  detail: string;
  label: string;
  tag: string;
};

const routes: NotificationRoute[] = [
  {
    description: "알림은 한 곳에 남기고 사용자별 읽음과 보관 상태를 함께 관리합니다.",
    icon: Server,
    label: "같은 알림 기준",
    routeLabel: "알림 목록",
    scope: "웹과 앱 공통",
    tone: "approved",
  },
  {
    description: "실시간 개인 알림은 로그인한 사용자 큐로 받고 화면 데이터만 갱신합니다.",
    icon: RadioTower,
    label: "개인 알림 큐",
    routeLabel: "실시간 연결",
    scope: "로그인 사용자",
    tone: "pending",
  },
  {
    description: "알림 버블은 오늘 필요한 항목만 짧게 보여주는 개인 표시 채널입니다.",
    icon: BellRing,
    label: "알림 버블",
    routeLabel: "작업 중 표시",
    scope: "개인 버블",
    tone: "personal",
  },
  {
    description: "데스크톱 알림은 사용자가 켠 종류만 운영체제 알림으로 보냅니다.",
    icon: MonitorSmartphone,
    label: "데스크톱 알림",
    routeLabel: "운영체제 알림",
    scope: "데스크톱 앱",
    tone: "room",
  },
];

const notificationItems: NotificationItem[] = [
  {
    channel: "웹 알림",
    label: "후보 확인",
    message: "에이전트가 WBS 후보 4개를 제안했어요.",
    sourceLabel: "에이전트 완료",
    state: "unread",
  },
  {
    channel: "버블",
    label: "오늘 할 일",
    message: "내 담당 TODO 마감이 오늘로 다가왔어요.",
    sourceLabel: "TODO 변경",
    state: "read",
  },
  {
    channel: "데스크톱 앱",
    label: "소통",
    message: "프로젝트룸 채팅에 새 메시지가 도착했어요.",
    sourceLabel: "새 채팅",
    state: "unread",
  },
  {
    channel: "알림 센터",
    label: "자료",
    message: "업로드한 요구사항 문서 분석이 끝났어요.",
    sourceLabel: "자료 분석 완료",
    state: "archived",
  },
];

const deliveryRules: DeliveryRule[] = [
  {
    detail: "읽음과 보관은 알림 원본을 지우는 동작이 아니라 사용자별 상태 변경입니다.",
    label: "상태 변경",
    tag: "읽음과 보관",
  },
  {
    detail: "버블에는 전체 알림이 아니라 지금 확인할 항목만 요약해 보여줍니다.",
    label: "버블 표시",
    tag: "알림 버블",
  },
  {
    detail: "데스크톱 알림은 앱 설정과 운영체제 권한을 모두 확인한 뒤 보냅니다.",
    label: "권한 확인",
    tag: "데스크톱 권한",
  },
  {
    detail: "알림 상세 사용 이벤트는 로컬 집계 대상이며, 서버에는 항목 상태와 요약 집계만 보냅니다.",
    label: "사용 기록",
    tag: "버블 사용 집계",
  },
];

const stateMeta: Record<NotificationItem["state"], { label: string; tone: "approved" | "pending" | "neutral" }> = {
  archived: { label: "보관", tone: "neutral" },
  read: { label: "읽음", tone: "approved" },
  unread: { label: "새 알림", tone: "pending" },
};

function RouteCard({ item }: { item: NotificationRoute }) {
  const Icon = item.icon;

  return (
    <article className={styles.routeCard}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className={styles.badges}>
          <StatusBadge tone={item.tone}>{item.scope}</StatusBadge>
          <StatusBadge tone="neutral">{item.routeLabel}</StatusBadge>
        </div>
        <h3>{item.label}</h3>
        <p>{item.description}</p>
      </div>
    </article>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const meta = stateMeta[item.state];

  return (
    <article className={styles.notificationRow}>
      <div className={styles.rowIcon}>
        <BellRing size={16} strokeWidth={2.1} />
      </div>
      <div>
        <div className={styles.rowMeta}>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          <strong>{item.label}</strong>
          <span>{item.sourceLabel}</span>
        </div>
        <p>{item.message}</p>
      </div>
      <span className={styles.channel}>{item.channel}</span>
    </article>
  );
}

function DeliveryRuleCard({ rule }: { rule: DeliveryRule }) {
  return (
    <article className={styles.ruleCard}>
      <span className={styles.ruleTag}>{rule.tag}</span>
      <h4>{rule.label}</h4>
      <p>{rule.detail}</p>
    </article>
  );
}

export function NotificationRoutingBoundaryPanel() {
  return (
    <section className={styles.panel} aria-label="알림 라우팅 경계 패널">
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<ShieldCheck size={14} />} selected>
            알림 전달 기준
          </Chip>
          <h2>알림은 한 기준으로 남기고, 화면과 버블은 필요한 만큼만 보여줍니다</h2>
          <p>
            Bubli 알림은 웹 알림 센터, 데스크톱 알림, 버블 표시가 같은 기준을 봅니다. 사용자가 읽거나
            보관한 상태는 서버에 남기고, 상세 사용 흐름은 로컬 집계로 관리합니다.
          </p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">개인 큐</StatusBadge>
          <strong>4개</strong>
          <span>초기 전달 채널</span>
          <ProgressBar label="알림 전달 정책 정합도" value={86} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.flowPanel}>
        <div className={styles.sectionTitle}>
          <h3>전달 흐름</h3>
          <p>알림은 저장 원본, 실시간 큐, 개인 표시 채널을 나눠 다룹니다.</p>
        </div>
        <div className={styles.routeGrid}>
          {routes.map((route, index) => (
            <div className={styles.routeSlot} key={route.label}>
              <RouteCard item={route} />
              {index < routes.length - 1 ? (
                <span className={styles.connector} aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={2.1} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className={styles.columns}>
        <GlassPanel className={styles.listPanel}>
          <div className={styles.sectionTitle}>
            <h3>알림 예시</h3>
            <p>같은 알림 원본이 화면 위치에 따라 다르게 표현되는 예시입니다.</p>
          </div>
          <div className={styles.notificationList}>
            {notificationItems.map((item) => (
              <NotificationRow item={item} key={`${item.channel}-${item.sourceLabel}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rulePanel}>
          <div className={styles.sectionTitle}>
            <h3>구현 규칙</h3>
            <p>알림을 놓치지 않으면서도 위젯과 서버 저장 책임을 분리합니다.</p>
          </div>
          <div className={styles.ruleList}>
            {deliveryRules.map((rule) => (
              <DeliveryRuleCard key={rule.label} rule={rule} />
            ))}
          </div>
          <div className={styles.notice}>
            <Archive size={16} strokeWidth={2.1} />
            <p>보관은 알림 목록에서 숨기는 사용자 상태입니다. 원본 이벤트 삭제로 처리하지 않습니다.</p>
          </div>
          <div className={styles.notice}>
            <Clock3 size={16} strokeWidth={2.1} />
            <p>오프라인 중 받은 알림은 재연결 후 서버 목록을 다시 조회해 맞춥니다.</p>
          </div>
          <Chip icon={<CheckCircle2 size={14} />}>웹, 데스크톱 앱, 버블이 같은 알림 기준을 사용</Chip>
        </GlassPanel>
      </div>

      <GlassPanel className={styles.footerPanel}>
        <Sparkles size={18} strokeWidth={2.1} />
        <p>
          알림 버블은 회원 웹 화면을 줄인 것이 아니라, 사용자가 작업 중 바로 확인해야 할 항목만 남기는 개인
          작업 인터페이스입니다.
        </p>
        <StatusBadge tone="personal">버블 표시 데이터</StatusBadge>
        <StatusBadge tone="approved">같은 알림 원본</StatusBadge>
        <StatusBadge tone="pending">개인 알림 연결</StatusBadge>
      </GlassPanel>
    </section>
  );
}
