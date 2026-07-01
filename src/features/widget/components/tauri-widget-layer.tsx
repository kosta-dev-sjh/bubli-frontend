import {
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  EyeOff,
  FolderSearch,
  Grip,
  MessageCircle,
  Minus,
  NotebookPen,
  Pin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import type { StatusTone } from "@/components/ui";

import styles from "./tauri-widget-layer.module.css";

const widgetBubbles = [
  {
    title: "TODO 버블",
    subtitle: "오늘 할 일 5개",
    rows: ["업무 범위 문서 수정 조항 회신", "WBS 후보 3개 검토"],
    source: "TODO와 항목 상태",
    tone: "todo",
    icon: CheckCircle2,
  },
  {
    title: "개인 에이전트 버블",
    subtitle: "기기 안 대화 보관",
    rows: ["새 회의록 정리 완료", "개인 대화는 기기 안에 보관"],
    source: "개인 에이전트 기록",
    tone: "agent",
    icon: Bot,
  },
  {
    title: "타이머 버블",
    subtitle: "42:18 · 진행 중",
    rows: ["1차 검수", "비정상 종료 후 복구"],
    source: "작업 시간과 복구 상태",
    tone: "timer",
    icon: Clock3,
  },
  {
    title: "소통 버블",
    subtitle: "1:1 · 프로젝트룸",
    rows: ["민지: 검수 기준 댓글", "프로젝트룸 보이스 대기"],
    source: "채팅과 알림",
    tone: "communication",
    icon: MessageCircle,
  },
  {
    title: "메모 버블",
    subtitle: "작성 중 초안",
    rows: ["기기 안 임시 초안", "저장 후 메모에 반영"],
    source: "메모와 임시 저장",
    tone: "memo",
    icon: NotebookPen,
  },
  {
    title: "일정/WBS 버블",
    subtitle: "금요일 중간보고",
    rows: ["D-2 일정", "자료보드 화면 정리 86%"],
    source: "일정과 WBS",
    tone: "schedule",
    icon: CalendarDays,
  },
  {
    title: "자료 제안 버블",
    subtitle: "확인 필요 항목",
    rows: ["업무 범위 문서와 회의록 조건 차이", "관련 자료 2개"],
    source: "관련 자료와 후보",
    tone: "resource",
    icon: FolderSearch,
  },
  {
    title: "알림 버블",
    subtitle: "새 댓글 1개",
    rows: ["새 버전 1개", "읽음 상태 동기화"],
    source: "알림 상태",
    tone: "notification",
    icon: Bell,
  },
];

const controls: Array<[string, LucideIcon]> = [
  ["고정", Pin],
  ["고스트", EyeOff],
  ["최소화", Minus],
];

const statusToneByBubble: Record<string, StatusTone> = {
  agent: "agent",
  communication: "communication",
  memo: "memo",
  notification: "neutral",
  resource: "room",
  schedule: "pending",
  timer: "timer",
  todo: "todo",
};

const policyRows = [
  ["개인 영역", "버블은 사용자 화면 위에 남는 개인 작업 인터페이스입니다."],
  ["권한 확인", "프로젝트룸 데이터는 사용자가 접근 권한을 가진 범위만 표시합니다."],
  ["저장 기준", "표시 데이터는 서버 값을 쓰고, 상세 사용 기록은 기기 안에 둡니다."],
  ["동작 기준", "항상 움직이는 효과보다 hover, 상태 전환, transform 중심으로 처리합니다."],
];

export function TauriWidgetLayer() {
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Grip size={16} aria-hidden="true" />
          데스크톱 위젯 레이어
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>작업 중 필요한 정보만 버블로 띄웁니다</h2>
            <p className={styles.summary}>
              위젯은 웹 설정 페이지가 아니라 데스크톱 위에 떠 있는 개인 영역입니다. 각 버블은 서버에 남길 값과 기기 안에 둘 기록을
              역할에 맞게 나눠 씁니다.
            </p>
          </div>
          <StatusBadge tone="personal">개인 버블</StatusBadge>
        </div>
        <div className={styles.chips} aria-label="위젯 레이어 설정">
          <Chip selected>기본 밀도</Chip>
          <Chip>100% 글자</Chip>
          <Chip>고스트 가능</Chip>
          <Chip>상단 고정</Chip>
        </div>
      </header>

      <section className={styles.stage} aria-label="바탕화면 위 개인 위젯">
        <div className={styles.toolbar}>
          <div>
            <h3>바탕화면 위 개인 위젯</h3>
            <p>선택한 프로젝트룸과 개인 자료에서 보여줄 수 있는 항목만 표시합니다.</p>
          </div>
          <div className={styles.density}>
            <span>기본</span>
            <span>집중</span>
            <span>컴팩트</span>
          </div>
        </div>

        <div className={styles.widgetGrid}>
          {widgetBubbles.map((bubble) => {
            const Icon = bubble.icon;

            return (
              <article className={`${styles.widgetCard} ${styles[bubble.tone]}`} key={bubble.title}>
                <div className={styles.widgetHead}>
                  <h4>
                    <Icon size={16} aria-hidden="true" />
                    {bubble.title}
                  </h4>
                  <div className={styles.controls}>
                    {controls.map(([label, ControlIcon]) => (
                      <button aria-label={`${bubble.title} ${label}`} key={label} type="button">
                        <ControlIcon size={13} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
                <p className={styles.subtitle}>{bubble.subtitle}</p>
                <div className={styles.rows}>
                  {bubble.rows.map((row) => (
                    <div className={styles.widgetRow} key={row}>
                      <span />
                      <strong>{row}</strong>
                    </div>
                  ))}
                </div>
                <StatusBadge tone={statusToneByBubble[bubble.tone]}>{bubble.source}</StatusBadge>
              </article>
            );
          })}
        </div>

        <div className={styles.dock} aria-label="최소화 위젯 도크">
          {widgetBubbles.map((bubble) => (
            <button key={bubble.title} type="button">
              {bubble.title.replace(" 버블", "")}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.policyGrid} aria-label="위젯 데이터와 권한 기준">
        {policyRows.map(([label, body]) => (
          <article className={styles.policyCard} key={label}>
            <h3>{label}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
