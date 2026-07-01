import { CheckCircle2, Clock3, FileText, HardDrive, PencilLine, Pin, RefreshCw, Save, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type MemoItem = {
  title: string;
  projectRoom: string;
  updatedAt: string;
  status: "draft" | "synced" | "pinned";
};

const memos: MemoItem[] = [
  {
    projectRoom: "번역 자료 검토",
    status: "draft",
    title: "클라이언트에게 확인할 수정 범위",
    updatedAt: "로컬 초안 2분 전",
  },
  {
    projectRoom: "Bubli 자료 정리",
    status: "pinned",
    title: "자료보드 공유 기준 발표 문장",
    updatedAt: "서버 저장 18분 전",
  },
  {
    projectRoom: "포트폴리오 리뉴얼",
    status: "synced",
    title: "디자인 시안 피드백",
    updatedAt: "서버 저장 오늘 13:40",
  },
];

const statusMeta: Record<MemoItem["status"], { label: string; tone: "memo" | "success" | "pending" }> = {
  draft: { label: "작성 중", tone: "pending" },
  pinned: { label: "고정", tone: "memo" },
  synced: { label: "저장됨", tone: "success" },
};

function MemoRow({ memo }: { memo: MemoItem }) {
  const status = statusMeta[memo.status];

  return (
    <article className="memo-draft-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileText size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="memo-draft-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{memo.projectRoom}</span>
        </div>
        <h3>{memo.title}</h3>
        <p>{memo.updatedAt}</p>
      </div>
      <Button size="sm" variant="quiet">
        열기
      </Button>
    </article>
  );
}

export function MemoDraftPanel() {
  return (
    <section className="memo-draft" aria-label="빠른 메모와 로컬 초안">
      <GlassPanel className="memo-draft__hero">
        <div>
          <Chip icon={<PencilLine size={14} />} selected>
            빠른 메모
          </Chip>
          <h2>작업 중 메모는 바로 남기고, 저장 기준은 나눠서 관리합니다</h2>
          <p>
            빠른 메모는 작업 흐름을 끊지 않기 위한 개인 기능입니다. 작성 중 초안은 내 기기에 먼저 남기고,
            사용자가 저장한 메모만 웹과 앱에서 함께 볼 수 있게 반영합니다.
          </p>
        </div>
        <div className="memo-draft__meter">
          <StatusBadge tone="memo">빠른 기록</StatusBadge>
          <strong>3</strong>
          <span>오늘 남긴 메모</span>
          <ProgressBar label="오늘 메모 정리율" value={74} />
        </div>
      </GlassPanel>

      <div className="memo-draft__grid">
        <GlassPanel className="memo-draft__composer">
          <div className="memo-draft__composer-top">
            <span className="bubli-icon-tile" aria-hidden="true">
              <Sparkles size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>로컬 초안</h3>
            <p>작성 중인 내용은 앱이 꺼져도 복구할 수 있게 내 기기에 먼저 남깁니다.</p>
            </div>
          </div>

          <div className="memo-draft__note">
            <span>번역 자료 검토</span>
            <h3>수정 범위가 2회인지, 문서별 2회인지 다시 확인하기</h3>
            <p>
              업무 범위 문서에는 2회 무상 수정, 회의록에는 페이지별 수정이라는 표현이 있어 확인 필요 항목으로 보관.
            </p>
          </div>

          <div className="memo-draft__actions">
            <Button icon={<Save size={15} />} variant="primary">
              서버에 저장
            </Button>
            <Button icon={<Pin size={15} />} variant="quiet">
              빠른 메모에 고정
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="memo-draft__list">
          <div className="memo-draft__list-top">
            <div>
              <h3>최근 메모</h3>
              <p>저장된 메모와 작성 중인 초안을 한 화면에서 구분합니다.</p>
            </div>
            <Chip>저장됨 / 작성 중</Chip>
          </div>
          <div className="memo-draft__items">
            {memos.map((memo) => (
              <MemoRow key={`${memo.projectRoom}-${memo.title}`} memo={memo} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <div className="memo-draft__policy">
        <GlassPanel>
          <HardDrive size={18} strokeWidth={2.1} />
          <h3>작성 중 초안</h3>
          <p>내 기기에 임시 저장하고, 비정상 종료 후 복구 대상으로 둡니다.</p>
        </GlassPanel>
        <GlassPanel>
          <CheckCircle2 size={18} strokeWidth={2.1} />
          <h3>확정 메모</h3>
          <p>사용자가 저장한 메모만 웹과 앱에서 함께 볼 수 있게 반영합니다.</p>
        </GlassPanel>
        <GlassPanel>
          <RefreshCw size={18} strokeWidth={2.1} />
          <h3>동기화 대기</h3>
          <p>네트워크가 끊기면 대기 상태로 남기고 재연결 시 전송합니다.</p>
        </GlassPanel>
        <GlassPanel>
          <Clock3 size={18} strokeWidth={2.1} />
          <h3>하루정리 연결</h3>
          <p>사용자가 남긴 메모와 로컬 요약은 하루정리 후보의 참고 정보가 됩니다.</p>
        </GlassPanel>
      </div>
    </section>
  );
}
