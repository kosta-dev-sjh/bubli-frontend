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

export default function ProjectsPage() {
  return (
    <>
      <ProjectRoomBoard />

      <div className="page-grid">
        <ProjectRoomCreateFlowPanel />
        <ProjectRoomDocumentSeedPanel
          documents={defaultSeedDocuments}
          fields={defaultSeedFields}
          targets={defaultSeedTargets}
          title="문서 후보로 프로젝트룸 시작하기"
        />
        <ContractExtractedFieldsReviewPanel />
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
        <ProjectRoomEventTimeline />
      </div>
    </>
  );
}
