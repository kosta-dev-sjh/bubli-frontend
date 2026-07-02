"use client";

import {
  CalendarClock,
  CheckCircle2,
  FileUp,
  Plus,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type ProjectRoomRole = "PROJECT_LEADER" | "MEMBER";
type ProjectRoomStatus = "active" | "review" | "archived";

type ProjectRoomItem = {
  checkNeededCount: number;
  dueLabel: string;
  id: string;
  memberCount: number;
  name: string;
  myRole: ProjectRoomRole;
  progress: number;
  resourceCount: number;
  status: ProjectRoomStatus;
  todoCount: number;
};

type MemberItem = {
  displayName: string;
  role: ProjectRoomRole;
  status: "ACTIVE" | "INVITED";
};

const projectRooms: ProjectRoomItem[] = [
  {
    checkNeededCount: 3,
    dueLabel: "D-9",
    id: "room-1",
    memberCount: 4,
    name: "K-Stay 번역 프로젝트",
    myRole: "PROJECT_LEADER",
    progress: 68,
    resourceCount: 18,
    status: "review",
    todoCount: 12,
  },
  {
    checkNeededCount: 1,
    dueLabel: "D-21",
    id: "room-2",
    memberCount: 1,
    name: "브랜드 소개 페이지",
    myRole: "PROJECT_LEADER",
    progress: 42,
    resourceCount: 7,
    status: "active",
    todoCount: 8,
  },
  {
    checkNeededCount: 0,
    dueLabel: "보관",
    id: "room-3",
    memberCount: 3,
    name: "상반기 캠페인 회고",
    myRole: "MEMBER",
    progress: 100,
    resourceCount: 24,
    status: "archived",
    todoCount: 0,
  },
];

const members: MemberItem[] = [
  { displayName: "나", role: "PROJECT_LEADER", status: "ACTIVE" },
  { displayName: "지유", role: "MEMBER", status: "ACTIVE" },
  { displayName: "하루카", role: "MEMBER", status: "ACTIVE" },
  { displayName: "민지", role: "MEMBER", status: "INVITED" },
];

const invitePolicies: Array<{
  descriptionKey: MessageKey;
  icon: typeof UserPlus;
  id: string;
  titleKey: MessageKey;
}> = [
  {
    descriptionKey: "room.board.invite1Description",
    icon: UserPlus,
    id: "friend",
    titleKey: "room.board.invite1Title",
  },
  {
    descriptionKey: "room.board.invite2Description",
    icon: CheckCircle2,
    id: "accepted-member",
    titleKey: "room.board.invite2Title",
  },
];

const roleLabelKey: Record<ProjectRoomRole, MessageKey> = {
  PROJECT_LEADER: "room.board.roleLeader",
  MEMBER: "room.board.roleMember",
};

const statusLabelKey: Record<ProjectRoomStatus, MessageKey> = {
  active: "room.board.statusActive",
  review: "room.board.statusReview",
  archived: "room.board.statusArchived",
};

function RoomCard({ room }: { room: ProjectRoomItem }) {
  const { t } = useI18n();
  return (
    <GlassPanel as="article" className="project-room-card">
      <div className="project-room-card__head">
        <div>
          <StatusBadge tone={room.status === "review" ? "warning" : room.status === "archived" ? "neutral" : "success"}>
            {t(statusLabelKey[room.status])}
          </StatusBadge>
          <h3>{room.name}</h3>
        </div>
        <Chip selected={room.myRole === "PROJECT_LEADER"}>{t(roleLabelKey[room.myRole])}</Chip>
      </div>
      <ProgressBar label={t("room.board.progressLabel", { name: room.name })} value={room.progress} />
      <dl className="project-room-card__stats">
        <div>
          <dt>{t("room.board.resources")}</dt>
          <dd>{room.resourceCount}</dd>
        </div>
        <div>
          <dt>{t("room.board.todo")}</dt>
          <dd>{room.todoCount}</dd>
        </div>
        <div>
          <dt>{t("room.board.members")}</dt>
          <dd>{room.memberCount}</dd>
        </div>
        <div>
          <dt>{t("room.board.due")}</dt>
          <dd>{room.dueLabel === "보관" ? t("room.board.dueArchived") : room.dueLabel}</dd>
        </div>
      </dl>
      <footer className="project-room-card__footer">
        {room.checkNeededCount > 0 ? <Chip selected>{t("room.board.checkNeeded", { count: room.checkNeededCount })}</Chip> : <Chip>{t("room.board.checkNone")}</Chip>}
        <Button size="sm" variant="quiet">
          {t("room.board.open")}
        </Button>
      </footer>
    </GlassPanel>
  );
}

function CreationFlow() {
  const { t } = useI18n();
  const steps: Array<{ icon: typeof FileUp; labelKey: MessageKey }> = [
    { icon: FileUp, labelKey: "room.board.step1" },
    { icon: CheckCircle2, labelKey: "room.board.step2" },
    { icon: CalendarClock, labelKey: "room.board.step3" },
  ];

  return (
    <GlassPanel className="project-room-flow">
      <div className="project-room-panel-head">
        <div>
          <h3>{t("room.board.createTitle")}</h3>
          <p>{t("room.board.createSub")}</p>
        </div>
        <Button icon={<Plus size={16} />} size="sm" variant="primary">
          {t("room.board.create")}
        </Button>
      </div>
      <ol className="project-room-flow__steps">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.labelKey}>
              <span className="bubli-icon-tile" aria-hidden="true">
                <Icon size={17} strokeWidth={2.1} />
              </span>
              <span>{t(step.labelKey)}</span>
            </li>
          );
        })}
      </ol>
      <div className="project-room-candidate">
        <b>{t("room.board.createCandidate")}</b>
        <span>{t("room.board.createCandidateList")}</span>
      </div>
    </GlassPanel>
  );
}

function InvitePanel() {
  const { t } = useI18n();
  return (
    <GlassPanel className="project-room-invite">
      <div className="project-room-panel-head">
        <div>
          <h3>{t("room.board.inviteTitle")}</h3>
          <p>{t("room.board.inviteSub")}</p>
        </div>
        <Chip selected>{t("room.board.inviteUnit")}</Chip>
      </div>
      <div className="project-room-invite__grid">
        {invitePolicies.map((policy) => {
          const Icon = policy.icon;
          return (
            <article className="project-room-policy" key={policy.id}>
              <span className="bubli-icon-tile" aria-hidden="true">
                <Icon size={17} strokeWidth={2.1} />
              </span>
              <div>
                <b>{t(policy.titleKey)}</b>
                <p>{t(policy.descriptionKey)}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="project-room-guardrail">{t("room.board.inviteGuardrail")}</div>
    </GlassPanel>
  );
}

function MemberPanel() {
  const { t } = useI18n();
  return (
    <GlassPanel className="project-room-members">
      <div className="project-room-panel-head">
        <div>
          <h3>{t("room.board.memberTitle")}</h3>
          <p>{t("room.board.memberSub")}</p>
        </div>
        <Chip icon={<UsersRound size={14} />}>{t("room.board.memberCount", { count: 4 })}</Chip>
      </div>
      <div className="project-room-members__list">
        {members.map((member) => (
          <div className="project-room-member" key={member.displayName}>
            <span className="project-room-member__avatar">{member.displayName.slice(0, 1)}</span>
            <div>
              <b>{member.displayName}</b>
              <span>{t(roleLabelKey[member.role])}</span>
            </div>
            <StatusBadge tone={member.status === "ACTIVE" ? "success" : "pending"}>
              {member.status === "ACTIVE" ? t("room.board.memberJoined") : t("room.board.memberInvited")}
            </StatusBadge>
          </div>
        ))}
      </div>
      <p className="project-room-members__note">
        {t("room.board.memberNote")}
      </p>
    </GlassPanel>
  );
}

export function ProjectRoomBoard() {
  const { t } = useI18n();
  return (
    <section className="project-room-board" aria-label={t("room.board.sectionAria")}>
      <SectionHeading
        eyebrow={t("room.board.sectionEyebrow")}
        title={t("room.board.sectionTitle")}
        description={t("room.board.sectionDescription")}
      />

      <div className="project-room-board__summary">
        <GlassPanel className="project-room-summary-card">
          <b>{t("room.board.summaryMineTitle")}</b>
          <strong>2</strong>
          <span>{t("room.board.summaryMineNote")}</span>
        </GlassPanel>
        <GlassPanel className="project-room-summary-card">
          <b>{t("room.board.summaryJoinedTitle")}</b>
          <strong>3</strong>
          <span>{t("room.board.summaryJoinedNote")}</span>
        </GlassPanel>
        <GlassPanel className="project-room-summary-card">
          <b>{t("room.board.summaryInvitedTitle")}</b>
          <strong>1</strong>
          <span>{t("room.board.summaryInvitedNote")}</span>
        </GlassPanel>
      </div>

      <div className="project-room-board__main">
        <div className="project-room-board__list">
          {projectRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
        <div className="project-room-board__side">
          <CreationFlow />
          <InvitePanel />
          <MemberPanel />
        </div>
      </div>
    </section>
  );
}
