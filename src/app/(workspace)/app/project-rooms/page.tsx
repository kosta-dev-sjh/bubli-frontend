"use client";

import {
  ContractExtractedFieldsReviewPanel,
  defaultInviteFriends,
  defaultInviteRules,
  defaultSeedDocuments,
  defaultSeedFields,
  defaultSeedTargets,
  ProjectRoomBoard,
  ProjectRoomCreateFlowPanel,
  ProjectRoomDocumentSeedPanel,
  ProjectRoomInviteAccessPanel,
  ProjectRoomInviteFlow,
  ProjectReferenceInfo,
  ProjectRoomSwitcherPanel,
} from "@/features/project-room/components";

const projectRoomSwitcherItems = [
  {
    alertCount: 3,
    description: "계약서와 요구사항 후보 확인이 남아 있습니다.",
    id: "room-kstay",
    myTodoCount: 8,
    name: "K-Stay 번역 프로젝트",
    nextDueLabel: "D-2",
    progress: 62,
    role: "leader" as const,
    status: "needsReview" as const,
  },
  {
    alertCount: 1,
    description: "혼자 시작한 자료 정리 프로젝트룸입니다.",
    id: "room-portfolio",
    myTodoCount: 4,
    name: "포트폴리오 리뉴얼",
    nextDueLabel: "6.29",
    progress: 44,
    role: "member" as const,
    status: "solo" as const,
  },
  {
    alertCount: 0,
    description: "팀원과 WBS 작업판을 함께 보고 있습니다.",
    id: "room-bubli",
    myTodoCount: 6,
    name: "Bubli 제품 개발",
    nextDueLabel: "오늘",
    progress: 78,
    role: "leader" as const,
    status: "active" as const,
  },
];

export default function ProjectRoomsPage() {
  return (
    <>
      <ProjectRoomBoard />

      <div className="page-grid">
        <ProjectRoomSwitcherPanel activeRoomId="room-kstay" items={projectRoomSwitcherItems} />
        <ProjectRoomCreateFlowPanel />
        <ProjectRoomDocumentSeedPanel
          documents={defaultSeedDocuments}
          fields={defaultSeedFields}
          targets={defaultSeedTargets}
          title="문서 후보로 프로젝트룸 시작하기"
        />
        <ContractExtractedFieldsReviewPanel />
        <ProjectReferenceInfo />
        <ProjectRoomInviteFlow />
        <ProjectRoomInviteAccessPanel friends={defaultInviteFriends} roomName="K-Stay 번역 프로젝트" rules={defaultInviteRules} />
      </div>
    </>
  );
}
