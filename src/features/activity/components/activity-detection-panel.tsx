import { Activity, AppWindow, Clock3, Database, EyeOff, ListChecks, ShieldCheck } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type ActivitySource = {
  appName: string;
  windowTitle: string;
  duration: string;
  projectHint: string;
  status: "tracking" | "suggested" | "local";
};

const activitySources: ActivitySource[] = [
  {
    appName: "Visual Studio Code",
    duration: "1시간 12분",
    projectHint: "Bubli 프론트 개발",
    status: "tracking",
    windowTitle: "activity-detection-panel.tsx",
  },
  {
    appName: "Chrome",
    duration: "28분",
    projectHint: "프로젝트룸 자료 조사",
    status: "suggested",
    windowTitle: "LiveKit docs",
  },
  {
    appName: "Notion",
    duration: "19분",
    projectHint: "발표 정리",
    status: "local",
    windowTitle: "Bubli v15 기획서",
  },
];

const statusCopy: Record<ActivitySource["status"], { label: string; tone: "timer" | "pending" | "personal" }> = {
  local: { label: "로컬 기록", tone: "personal" },
  suggested: { label: "후보 생성", tone: "pending" },
  tracking: { label: "집계 중", tone: "timer" },
};

function ActivitySourceRow({ source }: { source: ActivitySource }) {
  const status = statusCopy[source.status];

  return (
    <article className="activity-source-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <AppWindow size={17} strokeWidth={2.1} />
      </span>
      <div>
        <div className="activity-source-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{source.duration}</span>
        </div>
        <h3>{source.appName}</h3>
        <p>{source.windowTitle}</p>
        <Chip icon={<ListChecks size={14} />}>{source.projectHint}</Chip>
      </div>
    </article>
  );
}

export function ActivityDetectionPanel() {
  return (
    <section className="activity-detection" aria-label="활성 앱 감지 설정">
      <GlassPanel className="activity-detection__hero">
        <div className="activity-detection__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <Activity size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>Tauri 전용</Chip>
            <h2>작업 중인 앱 이름과 창 제목만 동의 후 기록합니다</h2>
            <p>
              활동 감지는 작업 시간 보조, WBS/TODO 후보, 하루정리에 쓰입니다. 화면 전체 내용과 키보드 입력은
              수집하지 않습니다.
            </p>
          </div>
        </div>
        <div className="activity-detection__consent">
          <StatusBadge tone="approved">동의됨</StatusBadge>
          <strong>3개 앱</strong>
          <span>오늘 집계 대상</span>
          <ProgressBar label="오늘 활동 집계" value={74} />
        </div>
      </GlassPanel>

      <div className="activity-detection__grid">
        <GlassPanel className="activity-detection__panel">
          <div className="activity-detection__panel-header">
            <div>
              <h3>최근 활동</h3>
              <p>선택한 프로젝트룸과 관련 있어 보이는 항목만 후보로 보여줍니다.</p>
            </div>
            <Chip icon={<Clock3 size={14} />}>최근 3시간</Chip>
          </div>

          <div className="activity-detection__list">
            {activitySources.map((source) => (
              <ActivitySourceRow key={`${source.appName}-${source.windowTitle}`} source={source} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="activity-detection__policy">
          <h3>저장 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>동의한 사용자에게만 활성 앱 이름, 창 제목, 머문 시간을 기록합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>상세 활동 원문은 Tauri SQLite에 두고, 서버에는 승인된 요약과 작업 시간만 반영합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <EyeOff size={16} strokeWidth={2.1} />
            </span>
            <p>화면 캡처, 파일 내용 전체, 키보드 입력은 활동 감지 범위에 넣지 않습니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
