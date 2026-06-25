"use client";

import {
  ContractExtractedFieldsReviewPanel,
  defaultHandoffCandidates,
  defaultHandoffRules,
  defaultInviteFriends,
  defaultInviteRules,
  defaultSeedDocuments,
  defaultSeedFields,
  defaultSeedTargets,
  MemberRolePanel,
  ProjectRoomBoard,
  ProjectRoomCreateFlowPanel,
  ProjectRoomDocumentSeedPanel,
  ProjectRoomEventTimeline,
  ProjectRoomInvitationResponsePanel,
  ProjectRoomInviteAccessPanel,
  ProjectRoomInviteFlow,
  ProjectRoomLeaderHandoffPanel,
  ProjectReferenceInfo,
  ProjectRoomRetentionPolicyPanel,
  ProjectRoomSwitcherPanel,
} from "@/features/project-room/components";

const invitationAccessPreview = [
  {
    description: "프로젝트룸 멤버가 함께 보는 자료에 접근합니다.",
    label: "프로젝트룸 자료",
  },
  {
    description: "승인된 WBS와 TODO를 작업판에서 확인합니다.",
    label: "WBS/TODO",
  },
  {
    description: "프로젝트룸 채팅과 보이스 참여 권한을 받습니다.",
    label: "소통",
  },
];

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

const retentionRules = [
  {
    description: "진행 중인 프로젝트룸은 자료, 채팅, WBS, TODO를 계속 수정할 수 있습니다.",
    label: "ACTIVE",
    status: "active" as const,
    value: "진행 중",
  },
  {
    description: "닫힌 프로젝트룸은 자료와 기록을 보관하고 새 작업 반영을 제한합니다.",
    label: "CLOSED",
    status: "readonly" as const,
    value: "읽기 중심",
  },
  {
    description: "활성 프로젝트룸에는 프로젝트 리더가 최소 1명 있어야 합니다.",
    label: "리더 기준",
    status: "needsLeader" as const,
    value: "0명 방지",
  },
];

const retentionActions = [
  {
    description: "끝난 프로젝트룸은 바로 삭제하지 않고 보관 상태로 전환합니다.",
    icon: "archive" as const,
    label: "보관",
  },
  {
    description: "나가기 전 다른 활성 멤버에게 프로젝트 리더 권한을 넘길 수 있습니다.",
    icon: "leader" as const,
    label: "리더 위임",
  },
  {
    description: "삭제는 자료와 멤버 권한을 확인한 뒤 별도 확인 절차로 처리합니다.",
    icon: "delete" as const,
    label: "삭제 검토",
  },
];

export default function ProjectsPage() {
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
        <ProjectRoomInvitationResponsePanel
          accessPreview={invitationAccessPreview}
          expiresLabel="7일 뒤 만료"
          inviterName="정현"
          projectRoomName="K-Stay 번역 프로젝트"
          roleLabel="멤버"
          status="pending"
        />
        <MemberRolePanel />
        <ProjectRoomLeaderHandoffPanel
          candidates={defaultHandoffCandidates}
          currentUserName="정현"
          roomName="K-Stay 번역 프로젝트"
          rules={defaultHandoffRules}
        />
        <ProjectRoomRetentionPolicyPanel
          activeUntilLabel="2026.07.15 납품 후 검토"
          leaderCount={1}
          memberCount={4}
          retentionActions={retentionActions}
          retentionRules={retentionRules}
          roomName="K-Stay 번역 프로젝트"
        />
        <ProjectRoomEventTimeline />
      </div>
    </>
  );
}
