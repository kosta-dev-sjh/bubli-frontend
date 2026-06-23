import { CalendarCheck2, CheckCircle2, Clock3, Database, FileText, ListTodo, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type SummarySource = {
  label: string;
  value: string;
  detail: string;
  tone: "todo" | "timer" | "pending" | "agent";
};

const summarySources: SummarySource[] = [
  {
    detail: "완료한 일과 일정",
    label: "완료 TODO",
    tone: "todo",
    value: "7개",
  },
  {
    detail: "오늘 타이머 기록",
    label: "총 작업시간",
    tone: "timer",
    value: "4시간 28분",
  },
  {
    detail: "날짜별 버블 집계",
    label: "버블 사용 집계",
    tone: "pending",
    value: "6개 버블",
  },
  {
    detail: "로컬 요약 참조",
    label: "개인 에이전트 요약",
    tone: "agent",
    value: "2개",
  },
];

function SummarySourceCard({ source }: { source: SummarySource }) {
  return (
    <article className="daily-summary-source">
      <StatusBadge tone={source.tone}>{source.label}</StatusBadge>
      <strong>{source.value}</strong>
      <span>{source.detail}</span>
    </article>
  );
}

export function DailySummaryPanel() {
  return (
    <section className="daily-summary" aria-label="하루정리">
      <GlassPanel className="daily-summary__hero">
        <div className="daily-summary__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <Sparkles size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>하루정리</Chip>
            <h2>서버 원본과 로컬 요약을 모아, 사용자가 확인한 결과만 저장합니다</h2>
            <p>
              완료한 일, 작업시간, 일정, 알림, 버블 집계, 개인 에이전트 로컬 요약을 근거로 정리 초안을 만듭니다.
              승인된 결과만 하루정리에 남습니다.
            </p>
          </div>
        </div>
        <div className="daily-summary__score">
          <StatusBadge tone="pending">검토 대기</StatusBadge>
          <strong>82%</strong>
          <span>오늘 정리 준비도</span>
          <ProgressBar label="오늘 정리 준비도" value={82} />
        </div>
      </GlassPanel>

      <div className="daily-summary__grid">
        <GlassPanel className="daily-summary__draft">
          <div className="daily-summary__draft-header">
            <div>
              <h3>정리 초안</h3>
              <p>에이전트가 제안한 문장은 사용자가 수정하거나 제외할 수 있습니다.</p>
            </div>
            <Chip icon={<CalendarCheck2 size={14} />}>2026-06-22</Chip>
          </div>

          <div className="daily-summary__draft-body">
            <article>
              <span className="bubli-icon-tile" aria-hidden="true">
                <ListTodo size={16} strokeWidth={2.1} />
              </span>
              <p>오늘은 Bubli 프론트 구조에서 대시보드와 위젯 관련 화면을 우선 정리했습니다.</p>
            </article>
            <article>
              <span className="bubli-icon-tile" aria-hidden="true">
                <Clock3 size={16} strokeWidth={2.1} />
              </span>
              <p>타이머 기록 기준으로 집중 시간이 가장 길었던 작업은 디자인 시스템 컴포넌트 검토입니다.</p>
            </article>
            <article>
              <span className="bubli-icon-tile" aria-hidden="true">
                <FileText size={16} strokeWidth={2.1} />
              </span>
              <p>확인 필요 항목은 API 계약 세부 DTO와 LiveKit 토큰 응답 형식입니다.</p>
            </article>
          </div>

          <footer className="daily-summary__actions">
            <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
              확인 후 저장
            </Button>
            <Button size="sm" variant="quiet">
              수정하기
            </Button>
          </footer>
        </GlassPanel>

        <GlassPanel className="daily-summary__source-panel">
          <h3>입력 근거</h3>
          <div className="daily-summary__sources">
            {summarySources.map((source) => (
              <SummarySourceCard key={source.label} source={source} />
            ))}
          </div>
          <div className="daily-summary__rule">
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>
              위젯 상세 사용 이벤트 원문은 서버에 저장하지 않고, 날짜별 집계와 사용자가 승인한 정리 결과만 서버에
              남깁니다.
            </p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
