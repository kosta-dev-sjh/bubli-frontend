import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  FileClock,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Timer,
  UploadCloud,
  WifiOff,
} from "lucide-react";

import { Button, Chip, GlassPanel, StatusBadge } from "@/components/ui";

import styles from "./local-sync-outbox-panel.module.css";

type OutboxStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";
type OperationType = "TIME_LOG" | "WIDGET_ROLLUP" | "LOCAL_FILE_EVENT";

type OutboxItem = {
  createdAt: string;
  dedupeLabel: string;
  idempotencyKey: string;
  lastError?: string;
  nextRetryAt?: string;
  operationLabel: string;
  operationType: OperationType;
  retryCount: number;
  status: OutboxStatus;
  target: string;
  title: string;
};

const outboxItems: OutboxItem[] = [
  {
    createdAt: "10:21",
    dedupeLabel: "중복 방지 키 A",
    idempotencyKey: "time-20260622-1021-run",
    nextRetryAt: "네트워크 복구 시",
    operationLabel: "작업 시간",
    operationType: "TIME_LOG",
    retryCount: 0,
    status: "PENDING",
    target: "실행 중인 타이머 상태 반영",
    title: "타이머 실행 상태",
  },
  {
    createdAt: "10:18",
    dedupeLabel: "중복 방지 키 B",
    idempotencyKey: "widget-rollup-20260622-device-a",
    lastError: "요청 시간 초과",
    nextRetryAt: "10:25",
    operationLabel: "버블 집계",
    operationType: "WIDGET_ROLLUP",
    retryCount: 2,
    status: "FAILED",
    target: "날짜별 버블 집계 반영",
    title: "위젯 사용 집계",
  },
  {
    createdAt: "10:14",
    dedupeLabel: "중복 방지 키 C",
    idempotencyKey: "local-file-evt-9f2a",
    operationLabel: "관리 폴더",
    operationType: "LOCAL_FILE_EVENT",
    retryCount: 1,
    status: "SENDING",
    target: "개인 관리 폴더 변경 반영",
    title: "개인 관리 폴더 변경분",
  },
  {
    createdAt: "10:02",
    dedupeLabel: "중복 방지 키 D",
    idempotencyKey: "time-20260622-1002-stop",
    operationLabel: "작업 시간",
    operationType: "TIME_LOG",
    retryCount: 0,
    status: "SENT",
    target: "타이머 종료 기록 반영",
    title: "타이머 종료",
  },
];

const statusMeta: Record<OutboxStatus, { label: string; tone: "pending" | "warning" | "success" | "todo" }> = {
  FAILED: { label: "실패", tone: "warning" },
  PENDING: { label: "대기", tone: "pending" },
  SENDING: { label: "전송 중", tone: "todo" },
  SENT: { label: "완료", tone: "success" },
};

const operationIcon: Record<OperationType, React.ReactNode> = {
  LOCAL_FILE_EVENT: <FileClock size={17} strokeWidth={2.1} />,
  TIME_LOG: <Timer size={17} strokeWidth={2.1} />,
  WIDGET_ROLLUP: <Database size={17} strokeWidth={2.1} />,
};

function OutboxRow({ item }: { item: OutboxItem }) {
  const status = statusMeta[item.status];

  return (
    <article className={styles.outboxRow}>
      <span className="bubli-icon-tile" aria-hidden="true">
        {operationIcon[item.operationType]}
      </span>
      <div className={styles.rowBody}>
        <div className={styles.meta}>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.operationLabel}</span>
          <span>{item.createdAt}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.target}</p>
        <div className={styles.keyLine}>
          <KeyRound size={13} strokeWidth={2.1} aria-hidden="true" />
          <code>{item.dedupeLabel}</code>
        </div>
        {item.lastError || item.nextRetryAt ? (
          <div className={styles.retryLine}>
            {item.lastError ? <span>{item.lastError}</span> : null}
            {item.nextRetryAt ? <span>다음 시도 {item.nextRetryAt}</span> : null}
          </div>
        ) : null}
      </div>
      <div className={styles.rowSide}>
        <strong>{item.retryCount}</strong>
        <span>재시도</span>
      </div>
    </article>
  );
}

export function LocalSyncOutboxPanel() {
  return (
    <section className={styles.panel} aria-label="로컬 동기화 대기열">
      <GlassPanel className={styles.hero}>
        <div>
          <Chip icon={<WifiOff size={14} />} selected>
            기기 안 대기열
          </Chip>
          <h2>네트워크가 끊겨도 전송해야 할 작업은 기기 안 대기열에 남깁니다</h2>
          <p>
            타이머, 위젯 집계, 개인 관리 폴더 변경분처럼 서버에 반영해야 하는 작업은 중복 방지 키로
            한 번만 처리하고, 네트워크 복구 뒤 순서대로 다시 보냅니다.
          </p>
        </div>
        <div className={styles.heroState}>
          <StatusBadge tone="warning">미전송 있음</StatusBadge>
          <strong>3</strong>
          <span>대기 또는 실패</span>
        </div>
      </GlassPanel>

      <div className={styles.flow} aria-label="대기열 처리 흐름">
        <span>기기 안 작업 기록</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>중복 방지 키 부여</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>대기열 전송</span>
        <ArrowRight size={15} strokeWidth={2.1} />
        <span>서버 반영 확인</span>
      </div>

      <div className={styles.grid}>
        <GlassPanel className={styles.queuePanel}>
          <div className={styles.toolbar}>
            <div>
              <h3>전송 대기 목록</h3>
              <p>같은 요청이 다시 보내져도 서버는 같은 키를 기준으로 한 번만 반영합니다.</p>
            </div>
            <Button icon={<RefreshCw size={15} />} size="sm" variant="primary">
              대기열 전송
            </Button>
          </div>
          <div className={styles.list}>
            {outboxItems.map((item) => (
              <OutboxRow item={item} key={item.idempotencyKey} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className={styles.policyPanel}>
          <h3>재시도 기준</h3>
          <article>
            <RefreshCw size={17} strokeWidth={2.1} />
            <p>처음에는 바로 다시 보내고, 실패가 반복되면 다음 전송 시각을 늦춥니다.</p>
          </article>
          <article>
            <Clock3 size={17} strokeWidth={2.1} />
            <p>다음 전송 시각 전에는 같은 요청을 반복해서 보내지 않습니다.</p>
          </article>
          <article>
            <RotateCcw size={17} strokeWidth={2.1} />
            <p>앱을 다시 열면 서버 값과 기기 안 대기열을 비교해 남은 요청만 처리합니다.</p>
          </article>
          <article>
            <AlertCircle size={17} strokeWidth={2.1} />
            <p>개인 에이전트 원문과 위젯 상세 이벤트 원문은 서버 복구 대상이 아닙니다.</p>
          </article>
        </GlassPanel>
      </div>

      <GlassPanel className={styles.footer}>
        <CheckCircle2 size={17} strokeWidth={2.1} aria-hidden="true" />
        <p>
          다시 보여줘야 하는 값은 서버 기록을 기준으로 봅니다. 기기 안 저장소는 빠른 표시, 복구 상태,
          미전송 요청 보관을 맡습니다.
        </p>
        <Button icon={<UploadCloud size={15} />} size="sm" variant="quiet">
          서버 상태 확인
        </Button>
      </GlassPanel>
    </section>
  );
}
