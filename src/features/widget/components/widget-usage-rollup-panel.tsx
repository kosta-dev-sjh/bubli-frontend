import { BarChart3, CheckCircle2, EyeOff, Layers3, MousePointerClick, Pin, RotateCw, Smartphone } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type BubbleUsage = {
  bubble: string;
  status: "active" | "pinned" | "hidden";
  openCount: number;
  visibleMinutes: number;
  confirmedCount: number;
};

const usages: BubbleUsage[] = [
  {
    bubble: "TODO 버블",
    confirmedCount: 5,
    openCount: 18,
    status: "active",
    visibleMinutes: 42,
  },
  {
    bubble: "자료 제안 버블",
    confirmedCount: 2,
    openCount: 9,
    status: "pinned",
    visibleMinutes: 16,
  },
  {
    bubble: "알림 버블",
    confirmedCount: 7,
    openCount: 12,
    status: "hidden",
    visibleMinutes: 8,
  },
];

const statusMeta: Record<BubbleUsage["status"], { label: string; tone: "success" | "memo" | "neutral" }> = {
  active: { label: "표시 중", tone: "success" },
  hidden: { label: "숨김", tone: "neutral" },
  pinned: { label: "고정", tone: "memo" },
};

function UsageRow({ item }: { item: BubbleUsage }) {
  const status = statusMeta[item.status];

  return (
    <article className="widget-rollup-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Layers3 size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="widget-rollup-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.openCount}회 열림</span>
          <span>{item.visibleMinutes}분 표시</span>
        </div>
        <h3>{item.bubble}</h3>
        <p>확인 처리 {item.confirmedCount}개</p>
      </div>
      <ProgressBar label={`${item.bubble} 사용 비중`} value={Math.min(100, item.openCount * 4)} />
    </article>
  );
}

export function WidgetUsageRollupPanel() {
  return (
    <section className="widget-rollup" aria-label="위젯 사용 집계와 항목 상태">
      <GlassPanel className="widget-rollup__hero">
        <div>
          <Chip icon={<BarChart3 size={14} />} selected>
            위젯 사용 집계
          </Chip>
          <h2>버블 사용 기록은 상세 이벤트와 날짜별 집계를 나눠서 관리합니다</h2>
          <p>
            버블 열기, 클릭, 접기 같은 상세 이벤트는 데스크톱 앱 안에 남기고, 서버에는 날짜별 집계와 항목 상태만
            보냅니다. 하루정리는 이 집계값을 참고하되, 상세 이벤트 원문을 서버에 올리지 않습니다.
          </p>
        </div>
        <div className="widget-rollup__summary">
          <StatusBadge tone="timer">오늘 집계</StatusBadge>
          <strong>87분</strong>
          <span>버블 표시 시간</span>
          <ProgressBar label="집계 동기화 진행률" value={76} />
        </div>
      </GlassPanel>

      <div className="widget-rollup__grid">
        <GlassPanel className="widget-rollup__list">
          <div className="widget-rollup__list-top">
            <div>
              <h3>버블별 집계</h3>
              <p>여러 기기에서 올라온 날짜별 집계는 사용자와 날짜 기준으로 합산합니다.</p>
            </div>
            <Chip>기기별 집계</Chip>
          </div>
          <div className="widget-rollup__items">
            {usages.map((item) => (
              <UsageRow item={item} key={item.bubble} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="widget-rollup__state">
          <h3>항목 상태</h3>
          <div>
            <CheckCircle2 size={17} strokeWidth={2.1} />
            <p>사용자가 버블에서 확인한 TODO, 알림, 자료 후보 상태를 저장합니다.</p>
          </div>
          <div>
            <Pin size={17} strokeWidth={2.1} />
            <p>고정한 항목은 같은 사용자에게 다시 보여주고, 숨김 항목은 우선순위를 낮춥니다.</p>
          </div>
          <div>
            <EyeOff size={17} strokeWidth={2.1} />
            <p>같은 항목 상태는 새 기록을 계속 만들지 않고 기존 상태를 갱신합니다.</p>
          </div>
          <div>
            <RotateCw size={17} strokeWidth={2.1} />
            <p>네트워크가 끊기면 전송 대기 상태로 남기고, 재연결 후 중복 없이 보냅니다.</p>
          </div>
        </GlassPanel>
      </div>

      <div className="widget-rollup__policy">
        <GlassPanel>
          <MousePointerClick size={18} strokeWidth={2.1} />
          <h3>상세 이벤트</h3>
          <p>열기, 닫기, 클릭, 드래그 같은 세부 기록은 데스크톱 앱 안에 둡니다.</p>
        </GlassPanel>
        <GlassPanel>
          <Smartphone size={18} strokeWidth={2.1} />
          <h3>기기별 합산</h3>
          <p>여러 기기의 날짜별 집계는 중복 키를 기준으로 한 번만 반영합니다.</p>
        </GlassPanel>
        <GlassPanel>
          <BarChart3 size={18} strokeWidth={2.1} />
          <h3>하루정리 참고</h3>
          <p>완료 TODO, 작업 시간, 알림 상태와 함께 하루정리 후보의 근거가 됩니다.</p>
        </GlassPanel>
      </div>
    </section>
  );
}
