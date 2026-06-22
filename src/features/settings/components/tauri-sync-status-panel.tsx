import { AlertCircle, CheckCircle2, Database, HardDrive, RefreshCw, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type SyncQueueItem = {
  label: string;
  source: string;
  target: string;
  status: "queued" | "retrying" | "synced";
  count: number;
};

const queueItems: SyncQueueItem[] = [
  {
    count: 4,
    label: "타이머 이벤트",
    source: "local_sync_outbox",
    status: "queued",
    target: "time_logs",
  },
  {
    count: 2,
    label: "위젯 집계",
    source: "local_widget_usage_rollups",
    status: "retrying",
    target: "widget_daily_summaries",
  },
  {
    count: 0,
    label: "프로젝트룸 채팅 캐시",
    source: "local_room_message_cache",
    status: "synced",
    target: "chat_messages",
  },
];

const statusMeta: Record<SyncQueueItem["status"], { label: string; tone: "warning" | "pending" | "success" }> = {
  queued: { label: "대기 중", tone: "pending" },
  retrying: { label: "재시도", tone: "warning" },
  synced: { label: "동기화됨", tone: "success" },
};

function SyncQueueRow({ item }: { item: SyncQueueItem }) {
  const status = statusMeta[item.status];

  return (
    <article className="tauri-sync-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <UploadCloud size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="tauri-sync-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.count}건</span>
        </div>
        <h3>{item.label}</h3>
        <p>
          {item.source} → {item.target}
        </p>
      </div>
    </article>
  );
}

export function TauriSyncStatusPanel() {
  return (
    <section className="tauri-sync" aria-label="Tauri 로컬 동기화 상태">
      <GlassPanel className="tauri-sync__hero">
        <div className="tauri-sync__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <HardDrive size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>Tauri 로컬 동기화</Chip>
            <h2>서버 원본은 지키고, Tauri SQLite는 빠른 표시와 복구 대기열로 사용합니다</h2>
            <p>
              웹에서 바로 보여야 하는 데이터는 서버 DB가 원본입니다. Tauri SQLite는 채팅 캐시, 개인 로컬 데이터,
              위젯 상세 이벤트, 타이머 복구, 전송 대기열을 맡습니다.
            </p>
          </div>
        </div>
        <div className="tauri-sync__health">
          <StatusBadge tone="warning">동기화 대기</StatusBadge>
          <strong>6건</strong>
          <span>미전송 작업</span>
          <ProgressBar label="동기화 상태" value={78} />
        </div>
      </GlassPanel>

      <div className="tauri-sync__grid">
        <GlassPanel className="tauri-sync__panel">
          <div className="tauri-sync__panel-header">
            <div>
              <h3>동기화 대기열</h3>
              <p>네트워크 복구 후 idempotency_key 기준으로 중복 없이 서버에 반영합니다.</p>
            </div>
            <Button icon={<RefreshCw size={15} />} size="sm" variant="primary">
              다시 동기화
            </Button>
          </div>

          <div className="tauri-sync__list">
            {queueItems.map((item) => (
              <SyncQueueRow item={item} key={item.label} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="tauri-sync__policy">
          <h3>복구 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>프로젝트룸 채팅과 TODO, 일정, 타이머 원본은 서버 DB에서 다시 불러올 수 있습니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <RotateCcw size={16} strokeWidth={2.1} />
            </span>
            <p>SQLite가 손상되면 최신 로컬 백업을 찾아 복구하고, 실패한 원문은 복구 불가로 안내합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <AlertCircle size={16} strokeWidth={2.1} />
            </span>
            <p>개인 에이전트 원문과 위젯 상세 이벤트 원문은 서버 복구 대상이 아닙니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>서버에는 위젯 항목 상태, 날짜별 집계, 승인된 하루정리만 남깁니다.</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="tauri-sync__footer">
        <span className="bubli-icon-tile" aria-hidden="true">
          <CheckCircle2 size={16} strokeWidth={2.1} />
        </span>
        <p>같은 사용자가 여러 기기를 써도 SQLite는 기기별이고, 서버 집계는 device_id 기준으로 합산합니다.</p>
      </GlassPanel>
    </section>
  );
}
