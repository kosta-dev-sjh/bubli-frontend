import { Bell, CheckCircle2, Clock3, LayoutGrid, MessageCircle, Pin, ShieldCheck, Sparkles, ToggleRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type BubbleSetting = {
  name: string;
  source: string;
  state: "enabled" | "pinned" | "hidden";
  detail: string;
};

const bubbleSettings: BubbleSetting[] = [
  {
    detail: "오늘 할 일 8개",
    name: "TODO 버블",
    source: "TODO 원본, 버블 항목 상태",
    state: "enabled",
  },
  {
    detail: "후보 3개 검토 대기",
    name: "에이전트 버블",
    source: "에이전트 작업, 후보 제안",
    state: "pinned",
  },
  {
    detail: "최근 프로젝트룸 메시지",
    name: "소통 버블",
    source: "채팅 메시지, 알림",
    state: "enabled",
  },
  {
    detail: "상세 이벤트는 기기 안 보관",
    name: "타이머 버블",
    source: "작업 시간, 기기 안 사용 기록",
    state: "hidden",
  },
];

const stateMeta: Record<BubbleSetting["state"], { label: string; tone: "success" | "pending" | "personal" }> = {
  enabled: { label: "켜짐", tone: "success" },
  hidden: { label: "숨김", tone: "personal" },
  pinned: { label: "고정", tone: "pending" },
};

function BubbleSettingRow({ bubble }: { bubble: BubbleSetting }) {
  const state = stateMeta[bubble.state];

  return (
    <article className="widget-settings-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        {bubble.state === "pinned" ? <Pin size={16} strokeWidth={2.1} /> : <LayoutGrid size={16} strokeWidth={2.1} />}
      </span>
      <div>
        <div className="widget-settings-row__meta">
          <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
          <span>{bubble.source}</span>
        </div>
        <h3>{bubble.name}</h3>
        <p>{bubble.detail}</p>
      </div>
      <Button icon={<ToggleRight size={15} />} size="sm" variant={bubble.state === "hidden" ? "quiet" : "primary"}>
        설정
      </Button>
    </article>
  );
}

export function WidgetSettingsPanel() {
  return (
    <section className="widget-settings" aria-label="버블 위젯 설정">
      <GlassPanel className="widget-settings__hero">
        <div className="widget-settings__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <LayoutGrid size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>버블 위젯</Chip>
            <h2>버블은 개인 영역이며, 권한 있는 기준 데이터와 기기 안 기록을 나눠 표시합니다</h2>
            <p>
              TODO, 일정, 채팅, 에이전트 제안처럼 웹에서도 보여야 하는 값은 확정된 기준 데이터를 씁니다. 열기, 접기, 클릭,
              머문 시간 같은 상세 사용 이벤트는 기기 안에 남깁니다.
            </p>
          </div>
        </div>
        <div className="widget-settings__summary">
          <StatusBadge tone="success">동기화됨</StatusBadge>
          <strong>6개</strong>
          <span>활성 버블</span>
          <ProgressBar label="버블 설정 저장 상태" value={86} />
        </div>
      </GlassPanel>

      <div className="widget-settings__grid">
        <GlassPanel className="widget-settings__panel">
          <div className="widget-settings__panel-header">
            <div>
              <h3>버블 구성</h3>
              <p>표시 여부, 위치, 크기, 고스트 모드, 항목 상태는 사용자별로 저장됩니다.</p>
            </div>
            <Chip icon={<Sparkles size={14} />}>개인 대시보드와 연결</Chip>
          </div>

          <div className="widget-settings__list">
            {bubbleSettings.map((bubble) => (
              <BubbleSettingRow bubble={bubble} key={bubble.name} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="widget-settings__policy">
          <h3>저장 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>확인, 숨김, 고정, 다시 보기 상태는 사용자별로 저장합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Bell size={16} strokeWidth={2.1} />
            </span>
            <p>알림과 채팅은 확정된 기준 데이터로 표시하고, 앱은 최근 표시 데이터를 기기 안에 임시 보관합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Clock3 size={16} strokeWidth={2.1} />
            </span>
            <p>타이머 총 작업시간은 저장된 작업 시간 기록을 기준으로 보고, 기기 안 상태는 복구에 사용합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <MessageCircle size={16} strokeWidth={2.1} />
            </span>
            <p>상세 위젯 사용 이벤트 원문은 서버에 저장하지 않고, 날짜별 집계만 서버에 보냅니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>프로젝트룸 데이터는 사용자가 접근 권한을 가진 범위만 버블에 표시합니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
