"use client";

import { Crown, Settings2, ShieldCheck, UserCheck, UserPlus, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type MemberItem = {
  nameKey: MessageKey;
  role: "leader" | "member";
  statusKey: MessageKey;
  visibleScopeKey: MessageKey;
};

const members: MemberItem[] = [
  {
    nameKey: "room.member.self",
    role: "leader",
    statusKey: "room.member.roleLeaderStatus",
    visibleScopeKey: "room.member.leaderScope",
  },
  {
    nameKey: "room.member.reviewMember",
    role: "member",
    statusKey: "room.member.roleMemberStatus",
    visibleScopeKey: "room.member.memberScope",
  },
];

const roleMeta: Record<MemberItem["role"], { tone: "approved" | "room" | "warning"; icon: typeof Crown }> = {
  leader: { icon: Crown, tone: "approved" },
  member: { icon: UserCheck, tone: "room" },
};

function MemberRow({ item }: { item: MemberItem }) {
  const { t } = useI18n();
  const meta = roleMeta[item.role];
  const Icon = meta.icon;

  return (
    <article className="member-role-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="member-role-row__meta">
          <StatusBadge tone={meta.tone}>{t(item.statusKey)}</StatusBadge>
          <span>{t(item.visibleScopeKey)}</span>
        </div>
        <h3>{t(item.nameKey)}</h3>
      </div>
      <Button size="sm" variant={item.role === "leader" ? "quiet" : "secondary"}>
        {t("room.member.manage")}
      </Button>
    </article>
  );
}

export function MemberRolePanel() {
  const { t } = useI18n();
  return (
    <section className="member-role" aria-label={t("room.member.panelAria")}>
      <GlassPanel className="member-role__hero">
        <div>
          <Chip icon={<UsersRound size={14} />} selected>
            {t("room.member.chip")}
          </Chip>
          <h2>{t("room.member.heading")}</h2>
          <p>{t("room.member.description")}</p>
        </div>
        <div className="member-role__summary">
          <StatusBadge tone="room">{t("room.member.accessBadge")}</StatusBadge>
          <strong>{t("room.member.countPeople", { count: 3 })}</strong>
          <span>{t("room.member.joined")}</span>
          <ProgressBar label={t("room.member.completionLabel")} value={78} />
        </div>
      </GlassPanel>

      <div className="member-role__grid">
        <GlassPanel className="member-role__list">
          <div className="member-role__list-top">
            <div>
              <h3>{t("room.member.roleListTitle")}</h3>
          <p>{t("room.member.roleListSub")}</p>
            </div>
            <Button icon={<UserPlus size={15} />} size="sm" variant="primary">
              {t("room.member.inviteFriend")}
            </Button>
          </div>
          <div className="member-role__items">
            {members.map((item) => (
              <MemberRow item={item} key={`${item.role}-${item.nameKey}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="member-role__policy">
          <h3>{t("room.member.policyTitle")}</h3>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>{t("room.member.policyLeader")}</p>
          </div>
          <div>
            <Settings2 size={17} strokeWidth={2.1} />
            <p>{t("room.member.policyLastLeader")}</p>
          </div>
          <div>
            <UserPlus size={17} strokeWidth={2.1} />
            <p>{t("room.member.policyInvite")}</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
