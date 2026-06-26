import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Database,
  History,
  Laptop,
  MessageSquareText,
  RadioTower,
  Server,
} from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

import styles from "./chat-sequence-loading-boundary-panel.module.css";

type SequenceStep = {
  description: string;
  icon: typeof Server;
  label: string;
  metric: string;
  owner: string;
  tone: "room" | "personal" | "approved" | "pending";
};

type MessageTrace = {
  body: string;
  clientMessageId: string;
  roomSequence: number;
  state: "serverSaved" | "cached" | "read";
  writer: string;
};

type SyncRule = {
  detail: string;
  label: string;
  token: string;
};

const sequenceSteps: SequenceStep[] = [
  {
    description: "웹은 채팅방에 들어갈 때 서버에서 최근 메시지를 받습니다.",
    icon: Server,
    label: "서버 최근 메시지",
    metric: "최근 메시지 기준",
    owner: "서버 채팅 원본",
    tone: "room",
  },
  {
    description: "앱은 기기 안 최근 대화를 먼저 보여주고 누락 메시지를 서버에서 보충합니다.",
    icon: Laptop,
    label: "앱 빠른 표시",
    metric: "최근 대화 임시 보관",
    owner: "기기 안 저장소",
    tone: "personal",
  },
  {
    description: "누락분은 마지막으로 받은 순서값 다음부터 요청합니다.",
    icon: ArrowDownToLine,
    label: "누락 보충",
    metric: "빠진 구간 요청",
    owner: "서버 메시지 조회",
    tone: "pending",
  },
  {
    description: "읽음 위치는 사용자가 확인한 마지막 순서값으로 저장합니다.",
    icon: CheckCircle2,
    label: "읽음 반영",
    metric: "마지막 읽음 기준",
    owner: "읽음 상태 저장",
    tone: "approved",
  },
];

const messageTrace: MessageTrace[] = [
  {
    body: "계약서 기준으로 납품일 확인 부탁드려요.",
    clientMessageId: "전송 ID A",
    roomSequence: 128,
    state: "read",
    writer: "정현",
  },
  {
    body: "/bubli 질문 후보 정리",
    clientMessageId: "전송 ID B",
    roomSequence: 129,
    state: "serverSaved",
    writer: "민준",
  },
  {
    body: "에이전트가 확인 질문 3개를 제안했어요.",
    clientMessageId: "에이전트 응답 ID",
    roomSequence: 130,
    state: "cached",
    writer: "Bubli",
  },
];

const syncRules: SyncRule[] = [
  {
    detail: "전송 완료는 임시 표시가 아니라 서버가 확인한 메시지 ID와 순서값을 기준으로 봅니다.",
    label: "전송 기준",
    token: "메시지 ID",
  },
  {
    detail: "이전 메시지는 현재 위치 앞쪽으로 불러오고, 새 메시지는 실시간 이벤트를 먼저 받습니다.",
    label: "양방향 로딩",
    token: "이전 메시지",
  },
  {
    detail: "캐시가 비었거나 손상되면 서버 최근 메시지로 다시 채웁니다.",
    label: "캐시 복구",
    token: "최근 메시지",
  },
  {
    detail: "프로젝트룸 이벤트와 채팅 본문은 서로 다른 실시간 통로로 받습니다.",
    label: "실시간 통로 분리",
    token: "연결 이벤트",
  },
];

const stateMeta: Record<MessageTrace["state"], { label: string; tone: "approved" | "pending" | "personal" }> = {
  cached: { label: "캐시 반영", tone: "personal" },
  read: { label: "읽음", tone: "approved" },
  serverSaved: { label: "서버 저장", tone: "pending" },
};

function SequenceStepCard({ step }: { step: SequenceStep }) {
  const Icon = step.icon;

  return (
    <article className={styles.stepCard}>
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className={styles.badges}>
          <StatusBadge tone={step.tone}>{step.owner}</StatusBadge>
          <StatusBadge tone="neutral">{step.metric}</StatusBadge>
        </div>
        <h3>{step.label}</h3>
        <p>{step.description}</p>
      </div>
    </article>
  );
}

function TraceRow({ item }: { item: MessageTrace }) {
  const meta = stateMeta[item.state];

  return (
    <article className={styles.traceRow}>
      <div className={styles.sequenceBadge}>
        <span>#{item.roomSequence}</span>
      </div>
      <div>
        <div className={styles.traceMeta}>
          <strong>{item.writer}</strong>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          <code>{item.clientMessageId}</code>
        </div>
        <p>{item.body}</p>
      </div>
    </article>
  );
}

function RuleCard({ rule }: { rule: SyncRule }) {
  return (
    <article className={styles.ruleCard}>
      <code>{rule.token}</code>
      <h4>{rule.label}</h4>
      <p>{rule.detail}</p>
    </article>
  );
}

export function ChatSequenceLoadingBoundaryPanel() {
  return (
    <section className={styles.panel} aria-label="채팅 sequence 로딩 경계 패널">
      <GlassPanel className={styles.hero}>
        <div className={styles.heroCopy}>
          <Chip icon={<MessageSquareText size={14} />} selected>
            채팅 로딩 기준
          </Chip>
          <h2>채팅은 메시지 순서값으로 이어 붙입니다</h2>
          <p>
            프로젝트룸 채팅과 1:1 채팅은 서버 DB의 메시지를 원본으로 봅니다. 웹은 서버에서 바로 읽고,
            Tauri는 기기 안 최근 대화를 먼저 보여준 뒤 빠진 메시지를 서버 순서값 기준으로 보충합니다.
          </p>
        </div>
        <div className={styles.heroMetric}>
          <StatusBadge tone="approved">서버 원본</StatusBadge>
          <strong>130</strong>
          <span>최근 메시지 기준</span>
          <ProgressBar label="현재 채팅 동기화율" value={92} />
        </div>
      </GlassPanel>

      <GlassPanel className={styles.flowPanel}>
        <div className={styles.sectionTitle}>
          <h3>조회와 보충 흐름</h3>
          <p>화면은 순서값을 기준으로 메시지를 이어 붙이고 중복 수신을 피합니다.</p>
        </div>
        <div className={styles.stepGrid}>
          {sequenceSteps.map((step, index) => (
            <div className={styles.stepSlot} key={step.label}>
              <SequenceStepCard step={step} />
              {index < sequenceSteps.length - 1 ? (
                <span className={styles.connector} aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={2.1} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className={styles.columns}>
        <GlassPanel className={styles.tracePanel}>
          <div className={styles.sectionTitle}>
            <h3>메시지 순서 예시</h3>
            <p>전송 ID는 중복 전송을 막고, 메시지 순서값은 화면 정렬 기준이 됩니다.</p>
          </div>
          <div className={styles.traceList}>
            {messageTrace.map((item) => (
              <TraceRow item={item} key={item.roomSequence} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.rulePanel}>
          <div className={styles.sectionTitle}>
            <h3>구현 규칙</h3>
            <p>웹, Tauri, 실시간 연결이 같은 메시지를 다룰 때 지켜야 하는 기준입니다.</p>
          </div>
          <div className={styles.ruleList}>
            {syncRules.map((rule) => (
              <RuleCard key={rule.label} rule={rule} />
            ))}
          </div>
          <div className={styles.topicBox}>
            <RadioTower size={16} strokeWidth={2.1} />
            <span>채팅 실시간 연결</span>
            <ArrowLeftRight size={14} strokeWidth={2.1} />
            <span>프로젝트룸 이벤트 연결</span>
          </div>
          <div className={styles.notice}>
            <BellRing size={16} strokeWidth={2.1} />
            <p>채팅 본문과 프로젝트룸 상태 이벤트를 분리하면 화면 갱신 범위를 좁게 유지할 수 있습니다.</p>
          </div>
          <div className={styles.notice}>
            <History size={16} strokeWidth={2.1} />
            <p>기기 안 임시 보관은 빠른 표시용입니다. 비어 있으면 서버 최근 메시지로 다시 채웁니다.</p>
          </div>
          <Chip icon={<Database size={14} />}>원본은 서버 채팅, 기기 안 기록은 빠른 표시용</Chip>
        </GlassPanel>
      </div>
    </section>
  );
}
