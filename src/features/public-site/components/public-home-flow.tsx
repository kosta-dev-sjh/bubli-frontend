import { Bot, CheckCircle2, FileText, LayoutGrid, PanelTop } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";

const flowSteps = [
  {
    body: "계약서, 요구사항, 회의록을 프로젝트룸 기준으로 모읍니다.",
    icon: FileText,
    title: "자료 업로드",
  },
  {
    body: "작업 범위, 확인 질문, WBS/TODO 후보를 제안합니다.",
    icon: Bot,
    title: "후보 생성",
  },
  {
    body: "사용자가 확인한 항목만 실제 작업으로 이어집니다.",
    icon: CheckCircle2,
    title: "사용자 승인",
  },
  {
    body: "같은 TODO를 작업판, 대시보드, 버블에서 함께 봅니다.",
    icon: LayoutGrid,
    title: "버블 표시",
  },
];

export function PublicHomeFlow() {
  return (
    <section className="public-home-flow" aria-label="Bubli 핵심 업무 흐름">
      <GlassPanel className="public-home-flow__main" padded={false}>
        <div className="public-home-flow__copy">
          <Chip selected>핵심 흐름</Chip>
          <h2>자료를 올리면, 확인할 일과 오늘 할 일이 이어집니다</h2>
          <p>
            계약서와 요구사항을 올리고, 사용자가 후보를 확인하면 같은 TODO가 작업판과 대시보드, 버블까지 이어집니다.
          </p>
        </div>

        <div className="public-home-flow__steps" aria-label="자료에서 버블까지 이어지는 순서">
          {flowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className="public-home-flow__step" key={step.title}>
                <span className="bubli-icon-tile" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <StatusBadge tone="personal">{String(index + 1).padStart(2, "0")}</StatusBadge>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel className="public-home-flow__todo">
        <div className="public-home-flow__todo-head">
          <span className="bubli-icon-tile" aria-hidden="true">
            <PanelTop size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>하나의 TODO</h3>
            <p>복사하지 않고 여러 실행 화면에 연결합니다.</p>
          </div>
        </div>
        <div className="public-home-flow__todo-card">
          <b>계약서 검토 질문 정리</b>
          <span>D-2 · 내 TODO · 확인 필요</span>
        </div>
        <div className="public-home-flow__channels" aria-label="TODO가 표시되는 화면">
          <Chip>작업판</Chip>
          <Chip>대시보드</Chip>
          <Chip>일정</Chip>
          <Chip>TODO 버블</Chip>
        </div>
      </GlassPanel>
    </section>
  );
}
