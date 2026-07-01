import { BellRing, CalendarDays, CheckCircle2, Clock3, LayoutDashboard, Sparkles } from "lucide-react";

import { WorkItemCard } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

type DashboardMetric = {
  label: string;
  value: string;
  tone: "todo" | "warning" | "agent" | "timer";
  description: string;
};

const metrics: DashboardMetric[] = [
  { description: "내가 맡은 항목", label: "오늘 할 일", tone: "todo", value: "8" },
  { description: "이번 주 마감", label: "가까운 마감", tone: "warning", value: "5" },
  { description: "내 검토 대기", label: "확인 필요", tone: "agent", value: "3" },
  { description: "오늘 누적", label: "작업 시간", tone: "timer", value: "03:42" },
];

function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <GlassPanel className="dashboard-metric">
      <StatusBadge tone={metric.tone}>{metric.label}</StatusBadge>
      <strong>{metric.value}</strong>
      <span>{metric.description}</span>
    </GlassPanel>
  );
}

export function DashboardOverviewPanel() {
  return (
    <section className="dashboard-overview" aria-label="사용자 대시보드">
      <GlassPanel className="dashboard-overview__hero">
        <div className="dashboard-overview__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <LayoutDashboard size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>대시보드</Chip>
            <h2>여러 프로젝트룸의 내 일을 한 화면에서 봅니다</h2>
            <p>
              맡은 TODO, 가까운 일정, 확인할 후보를 모아 오늘 처리할 일을 먼저 보여줍니다.
            </p>
          </div>
        </div>
        <div className="dashboard-overview__actions">
          <Button icon={<Sparkles size={15} />} variant="primary">
            오늘 정리 받기
          </Button>
          <Button icon={<LayoutDashboard size={15} />} variant="quiet">
            카드 구성
          </Button>
        </div>
      </GlassPanel>

      <div className="dashboard-overview__metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="dashboard-overview__grid">
        <GlassPanel className="dashboard-overview__panel">
          <div className="dashboard-overview__panel-head">
            <h3>내 TODO</h3>
            <Button size="sm" variant="ghost">
              전체 보기
            </Button>
          </div>
          <div className="dashboard-overview__stack">
            <WorkItemCard
              assignee="나"
              code="D-2"
              dueLabel="오늘"
              sourceLabel="작업 범위 정리"
              status="doing"
              title="1차 번역 검수 기준 확인"
            />
            <WorkItemCard
              assignee="나"
              code="검토"
              dueLabel="내일"
              sourceLabel="브랜드 소개서"
              status="review"
              title="납품물 범위 후보 승인"
            />
          </div>
        </GlassPanel>

        <GlassPanel className="dashboard-overview__panel">
          <div className="dashboard-overview__panel-head">
            <h3>확인 필요 항목</h3>
            <Button size="sm" variant="ghost">
              후보 보기
            </Button>
          </div>
          <div className="dashboard-check-list">
            <article>
              <BellRing size={16} strokeWidth={2.1} />
              <div>
                <b>기준 자료와 요구사항의 납품일이 다릅니다</b>
                <p>작업 범위 정리 · 확인 필요</p>
              </div>
            </article>
            <article>
              <CheckCircle2 size={16} strokeWidth={2.1} />
              <div>
                <b>WBS 후보 4건이 승인 대기 중입니다</b>
                <p>웹사이트 리뉴얼 · 에이전트 제안</p>
              </div>
            </article>
          </div>
        </GlassPanel>

        <GlassPanel className="dashboard-overview__panel dashboard-overview__panel--wide">
          <div className="dashboard-overview__panel-head">
            <h3>오늘 작업 요약</h3>
            <Button size="sm" variant="ghost">
              카드 설정
            </Button>
          </div>
          <div className="dashboard-handoff-row">
            <article>
              <span>TODO</span>
              <strong>8건</strong>
              <p>오늘 볼 일과 승인한 후보</p>
            </article>
            <article>
              <span>일정</span>
              <strong>4건</strong>
              <p>미팅과 가까운 마감</p>
            </article>
            <article>
              <span>작업 시간</span>
              <strong>03:42</strong>
              <p>타이머 원본 기준</p>
            </article>
          </div>
        </GlassPanel>

        <GlassPanel className="dashboard-overview__policy">
          <h3>데이터 기준</h3>
          <div>
            <CalendarDays size={16} strokeWidth={2.1} />
            <p>TODO, 일정, 알림, 작업 시간은 확정된 기준 데이터를 바탕으로 보여줍니다.</p>
          </div>
          <div>
            <Clock3 size={16} strokeWidth={2.1} />
            <p>작업 시간과 활동 기록은 기준 데이터로 모으고, 사용자가 승인한 하루정리만 저장합니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
