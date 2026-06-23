import { Bot, FolderKanban, LayoutGrid, MessageCircle, PanelTop, SearchCheck } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { FontStrategyPanel } from "@/features/public-site/components/font-strategy-panel";
import { HybridAppFrame } from "@/features/public-site/components/hybrid-app-frame";

const featureFlow = [
  {
    body: "계약서, 요구사항, 회의록을 한 프로젝트 기준으로 모읍니다.",
    icon: FolderKanban,
    label: "프로젝트룸",
    status: "자료 시작점",
  },
  {
    body: "개인 자료와 프로젝트룸 자료를 구분하고, 관련 문서와 확인 필요 항목을 같이 봅니다.",
    icon: SearchCheck,
    label: "자료보드",
    status: "문서 정리",
  },
  {
    body: "문서에서 작업 범위, 확인 질문, WBS/TODO 후보를 만들고 사용자가 승인합니다.",
    icon: Bot,
    label: "에이전트 후보",
    status: "승인 전",
  },
  {
    body: "확정된 TODO는 작업판, 대시보드, 일정, 버블에서 같은 작업으로 이어집니다.",
    icon: PanelTop,
    label: "WBS/작업판",
    status: "실행 화면",
  },
  {
    body: "친구, 1:1 채팅, 프로젝트룸 채팅, 보이스를 같은 소통 흐름 안에서 다룹니다.",
    icon: MessageCircle,
    label: "소통",
    status: "채팅과 보이스",
  },
  {
    body: "작업 중 필요한 TODO, 알림, 타이머, 자료 제안만 데스크탑 위에 남깁니다.",
    icon: LayoutGrid,
    label: "버블",
    status: "Tauri 기능",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHeading
        title="기능"
        description="프로젝트룸, 자료보드, 에이전트 후보, WBS/작업판, 버블 위젯을 한 흐름으로 연결합니다."
      />

      <section className="public-feature-flow" aria-label="Bubli 기능 흐름">
        <GlassPanel className="public-feature-flow__intro">
          <Chip selected>받은 자료를, 오늘 할 일로.</Chip>
          <h2>문서가 업무 구조가 되고, 업무는 버블까지 이어집니다</h2>
          <p>
            Bubli의 기능은 따로 떨어진 메뉴가 아니라 하나의 흐름입니다. 자료를 올리고, 후보를 확인하고, 승인된 작업을
            여러 실행 화면에서 같은 기준으로 봅니다.
          </p>
        </GlassPanel>

        <div className="public-feature-flow__grid">
          {featureFlow.map((feature) => {
            const Icon = feature.icon;

            return (
              <GlassPanel as="article" className="public-feature-flow__card" key={feature.label}>
                <span className="bubli-icon-tile" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <div className="public-feature-flow__card-head">
                    <h3>{feature.label}</h3>
                    <StatusBadge tone="personal">{feature.status}</StatusBadge>
                  </div>
                  <p>{feature.body}</p>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </section>

      <div className="page-grid">
        <HybridAppFrame />
        <FontStrategyPanel />
      </div>
    </>
  );
}
