import {
  Activity,
  ArchiveRestore,
  CheckCircle2,
  Database,
  Eye,
  Layers3,
  MonitorSmartphone,
  RefreshCcw,
  Server,
  Settings2,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./widget-storage-policy-panel.module.css";

export type WidgetStorageLayer = "SERVER_ORIGINAL" | "SERVER_STATE" | "LOCAL_CACHE" | "LOCAL_EVENT" | "LOCAL_ROLLUP";

export type WidgetStorageItem = {
  description: string;
  id: string;
  label: string;
  layer: WidgetStorageLayer;
  tags: string[];
};

export type WidgetRollupDevice = {
  bubbleType: string;
  deviceLabel: string;
  interactionCount: number;
  openCount: number;
  rollupKey: string;
  status: "LOCAL_ONLY" | "SYNC_PENDING" | "SYNCED" | "FAILED";
  visibleMinutes: number;
};

type WidgetStoragePolicyPanelProps = HTMLAttributes<HTMLElement> & {
  devices?: WidgetRollupDevice[];
  onFlushOutbox?: () => void;
  onOpenSettings?: () => void;
  onRollupUsage?: () => void;
  rollupProgress?: number;
  summaryDateLabel?: string;
};

const layerCopy: Record<WidgetStorageLayer, string> = {
  LOCAL_CACHE: "로컬 캐시",
  LOCAL_EVENT: "로컬 상세 이벤트",
  LOCAL_ROLLUP: "로컬 집계",
  SERVER_ORIGINAL: "서버 원본",
  SERVER_STATE: "서버 상태",
};

const layerTone: Record<WidgetStorageLayer, StatusTone> = {
  LOCAL_CACHE: "personal",
  LOCAL_EVENT: "pending",
  LOCAL_ROLLUP: "timer",
  SERVER_ORIGINAL: "room",
  SERVER_STATE: "success",
};

const statusCopy: Record<WidgetRollupDevice["status"], string> = {
  FAILED: "실패",
  LOCAL_ONLY: "로컬",
  SYNCED: "반영됨",
  SYNC_PENDING: "반영 대기",
};

const statusTone: Record<WidgetRollupDevice["status"], StatusTone> = {
  FAILED: "warning",
  LOCAL_ONLY: "personal",
  SYNCED: "success",
  SYNC_PENDING: "pending",
};

const defaultItems: WidgetStorageItem[] = [
  {
    description: "켜기, 끄기, 위치, 크기, 고스트 모드처럼 다시 열어도 유지돼야 하는 값입니다.",
    id: "settings",
    label: "위젯 설정",
    layer: "SERVER_STATE",
    tags: ["켜기/끄기", "위치와 크기", "표시 옵션"],
  },
  {
    description: "TODO, 일정, 채팅, 알림, 에이전트 제안처럼 웹과 앱에서 다시 보여야 하는 값입니다.",
    id: "display",
    label: "표시 데이터",
    layer: "SERVER_ORIGINAL",
    tags: ["TODO", "일정", "채팅", "알림"],
  },
  {
    description: "확인, 숨김, 고정, 다시 보기 상태는 같은 항목 row를 갱신합니다.",
    id: "item-state",
    label: "항목 상태",
    layer: "SERVER_STATE",
    tags: ["확인", "숨김", "고정", "나중에 보기"],
  },
  {
    description: "열기, 닫기, 클릭, 머문 시간 같은 상세 이벤트는 기기 안에만 둡니다.",
    id: "usage-event",
    label: "사용 기록",
    layer: "LOCAL_EVENT",
    tags: ["열기", "닫기", "클릭", "머문 시간"],
  },
  {
    description: "날짜별, 기기별, 버블별 집계만 서버로 보내 하루정리 근거에 씁니다.",
    id: "rollup",
    label: "사용 집계",
    layer: "LOCAL_ROLLUP",
    tags: ["날짜별", "기기별", "버블별", "하루정리 근거"],
  },
];

const defaultDevices: WidgetRollupDevice[] = [
  {
    bubbleType: "TODO",
    deviceLabel: "MacBook Air",
    interactionCount: 18,
    openCount: 9,
    rollupKey: "2026-06-23:todo:mac",
    status: "SYNCED",
    visibleMinutes: 74,
  },
  {
    bubbleType: "TIMER",
    deviceLabel: "iMac 작업실",
    interactionCount: 6,
    openCount: 4,
    rollupKey: "2026-06-23:timer:imac",
    status: "SYNC_PENDING",
    visibleMinutes: 42,
  },
  {
    bubbleType: "AGENT",
    deviceLabel: "MacBook Air",
    interactionCount: 5,
    openCount: 3,
    rollupKey: "2026-06-23:agent:mac",
    status: "LOCAL_ONLY",
    visibleMinutes: 16,
  },
];

export function WidgetStoragePolicyPanel({
  className,
  devices = defaultDevices,
  onFlushOutbox,
  onOpenSettings,
  onRollupUsage,
  rollupProgress = 72,
  summaryDateLabel = "2026-06-23",
  ...props
}: WidgetStoragePolicyPanelProps) {
  const pendingCount = devices.filter((device) => device.status === "SYNC_PENDING" || device.status === "FAILED").length;
  const totalVisibleMinutes = devices.reduce((sum, device) => sum + device.visibleMinutes, 0);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <Layers3 size={22} />
          </span>
          <div>
            <StatusBadge tone="timer">버블 저장 정책</StatusBadge>
            <h2>위젯 데이터는 성격별로 나눠 저장합니다</h2>
            <p>
              서버에 바로 보여야 하는 값은 서버에 두고, 상세 사용 기록은 기기 안에 남긴 뒤 집계만 서버로 보냅니다.
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<Settings2 size={15} />} onClick={onOpenSettings} size="sm" variant="quiet">
            버블 설정
          </Button>
          <Button icon={<RefreshCcw size={15} />} onClick={onFlushOutbox} size="sm" variant="primary">
            대기열 보내기
          </Button>
        </div>
      </header>

      <div className={styles.summaryGrid}>
        <SummaryCard icon={<Server size={18} />} label="서버 원본" value="표시 데이터와 항목 상태" />
        <SummaryCard icon={<Database size={18} />} label="기기 안 기록" value="캐시, 상세 이벤트, 로컬 집계" />
        <SummaryCard icon={<ArchiveRestore size={18} />} label="중복 방지" value="같은 집계는 한 번만 반영" />
      </div>

      <div className={styles.storageGrid} aria-label="위젯 저장 분류">
        {defaultItems.map((item) => (
          <article className={styles.storageCard} key={item.id}>
            <div className={styles.cardHead}>
              <span aria-hidden="true">{itemIcon[item.id] ?? <Database size={17} />}</span>
              <StatusBadge tone={layerTone[item.layer]}>{layerCopy[item.layer]}</StatusBadge>
            </div>
            <h3>{item.label}</h3>
            <p>{item.description}</p>
            <div className={styles.tableList}>
              {item.tags.map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className={styles.rollupPanel}>
        <div className={styles.rollupHeader}>
          <div>
            <StatusBadge tone={pendingCount > 0 ? "pending" : "success"}>{pendingCount}개 대기</StatusBadge>
            <h3>{summaryDateLabel} 위젯 집계</h3>
            <p>여러 기기의 집계를 사용자와 날짜 기준으로 합산해 하루정리 근거로 씁니다.</p>
          </div>
          <div className={styles.rollupTotal}>
            <strong>{totalVisibleMinutes}분</strong>
            <span>표시 시간 합계</span>
          </div>
        </div>
        <ProgressBar label="서버 집계 반영률" value={rollupProgress} />
        <div className={styles.deviceList} aria-label="기기별 위젯 집계">
          {devices.map((device) => (
            <div className={styles.deviceItem} key={device.rollupKey}>
              <div>
                <strong>{device.bubbleType} 버블</strong>
                <span>{device.deviceLabel}</span>
              </div>
              <div className={styles.deviceStats}>
                <Chip>{device.openCount}회 열림</Chip>
                <Chip>{device.interactionCount}회 상호작용</Chip>
                <Chip>{device.visibleMinutes}분</Chip>
              </div>
              <StatusBadge tone={statusTone[device.status]}>{statusCopy[device.status]}</StatusBadge>
            </div>
          ))}
        </div>
      </div>

      <footer className={styles.footer}>
        <div>
          <CheckCircle2 size={16} />
          상세 이벤트 원문은 서버에 남기지 않고, 서버에는 항목 상태와 날짜별 집계만 저장합니다.
        </div>
        <Button icon={<Activity size={14} />} onClick={onRollupUsage} size="sm" variant="ghost">
          로컬 집계 만들기
        </Button>
      </footer>
    </GlassPanel>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className={styles.summaryCard}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{value}</p>
      </div>
    </article>
  );
}

const itemIcon: Record<string, ReactNode> = {
  display: <Eye size={17} />,
  "item-state": <CheckCircle2 size={17} />,
  rollup: <MonitorSmartphone size={17} />,
  settings: <Settings2 size={17} />,
  "usage-event": <Activity size={17} />,
};
