"use client";

import { KeyRound, Mic, MicOff, Radio, ShieldCheck, Timer, UserCheck, UserRoundX, Volume2 } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type VoiceRuleStatus = "safe" | "limited" | "blocked";

export type VoiceTokenRule = {
  description: string;
  label: string;
  status: VoiceRuleStatus;
};

export type VoiceParticipantState = {
  canJoinVoice: boolean;
  label: string;
  roleLabel: string;
  stateLabel: string;
};

export type VoiceTokenSafetyPanelProps = HTMLAttributes<HTMLElement> & {
  participants: VoiceParticipantState[];
  roomLabel: string;
  rules: VoiceTokenRule[];
  title?: string;
  tokenEndpointLabel: string;
};

const statusMeta: Record<VoiceRuleStatus, { icon: ReactNode; labelKey: MessageKey; tone: StatusTone }> = {
  safe: {
    icon: <ShieldCheck size={16} strokeWidth={2.1} />,
    labelKey: "chat.voiceSafety.statusSafe",
    tone: "success",
  },
  limited: {
    icon: <Timer size={16} strokeWidth={2.1} />,
    labelKey: "chat.voiceSafety.statusLimited",
    tone: "pending",
  },
  blocked: {
    icon: <MicOff size={16} strokeWidth={2.1} />,
    labelKey: "chat.voiceSafety.statusBlocked",
    tone: "warning",
  },
};

export function VoiceTokenSafetyPanel({
  className,
  participants,
  roomLabel,
  rules,
  title,
  tokenEndpointLabel,
  ...props
}: VoiceTokenSafetyPanelProps) {
  const { t } = useI18n();
  const joinableCount = participants.filter((participant) => participant.canJoinVoice).length;

  return (
    <GlassPanel as="section" className={cn("grid gap-5", className)} {...props}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Chip icon={<Volume2 size={14} strokeWidth={2.1} />} selected>
            {t("chat.voiceSafety.chip")}
          </Chip>
          <div className="grid gap-1">
            <h2 className="m-0 text-[22px] font-[860] leading-tight text-[var(--color-text)]">{title ?? t("chat.voiceSafety.title")}</h2>
            <p className="m-0 max-w-[700px] text-[14px] leading-6 text-[var(--color-muted)]">
              {t("chat.voiceSafety.intro")}
            </p>
          </div>
        </div>
        <StatusBadge tone="room">{t("chat.voiceSafety.joinable", { count: joinableCount })}</StatusBadge>
      </header>

      <section className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/70 p-4 shadow-[var(--shadow-soft)] md:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-2 rounded-[var(--radius-input)] bg-[rgba(215,234,244,0.42)] p-3">
          <div className="flex items-center gap-2 text-[12.5px] font-[820] text-[var(--color-blue-deep)]">
            <Radio size={15} strokeWidth={2.1} />
            {roomLabel}
          </div>
          <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">
            {t("chat.voiceSafety.roomDesc")}
          </p>
        </div>
        <div className="grid gap-2 rounded-[var(--radius-input)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.62)] p-3">
          <div className="flex items-center gap-2 text-[12.5px] font-[820] text-[var(--color-text)]">
            <KeyRound size={15} strokeWidth={2.1} />
            {t("chat.voiceSafety.tokenIssue")}
          </div>
          <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">{tokenEndpointLabel}</p>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {rules.map((rule) => {
          const meta = statusMeta[rule.status];

          return (
            <article
              className="rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/70 p-4 shadow-[var(--shadow-soft)]"
              key={rule.label}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="bubli-icon-tile" aria-hidden="true">
                  {meta.icon}
                </span>
                <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
              </div>
              <h3 className="m-0 text-[15px] font-[840] leading-tight text-[var(--color-text)]">{rule.label}</h3>
              <p className="m-0 mt-2 text-[13px] leading-5 text-[var(--color-muted)]">{rule.description}</p>
            </article>
          );
        })}
      </div>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-[15px] font-[840] text-[var(--color-text)]">{t("chat.voiceSafety.participantAccess")}</h3>
          <Chip icon={<Mic size={14} strokeWidth={2.1} />}>{t("chat.voiceSafety.micScope")}</Chip>
        </div>
        <ul className="m-0 grid list-none gap-2 p-0">
          {participants.map((participant) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--glass-border)] bg-white/60 p-3"
              key={`${participant.roleLabel}-${participant.label}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="bubli-icon-tile" aria-hidden="true">
                  {participant.canJoinVoice ? <UserCheck size={17} strokeWidth={2.1} /> : <UserRoundX size={17} strokeWidth={2.1} />}
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-[13.5px] font-[820] text-[var(--color-text)]">{participant.label}</p>
                  <p className="m-0 text-[12.5px] text-[var(--color-muted)]">{participant.roleLabel}</p>
                </div>
              </div>
              <StatusBadge tone={participant.canJoinVoice ? "success" : "warning"}>{participant.stateLabel}</StatusBadge>
            </li>
          ))}
        </ul>
      </section>
    </GlassPanel>
  );
}
