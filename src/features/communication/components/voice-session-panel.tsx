"use client";

import { LockKeyhole, Mic, MicOff, PhoneOff, Radio, ShieldCheck, UsersRound, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

type Participant = {
  nameKey: MessageKey;
  roleKey: MessageKey;
  state: "speaking" | "muted" | "listening";
};

const participants: Participant[] = [
  { nameKey: "chat.voiceSession.p1Name", roleKey: "chat.voiceSession.roleLeader", state: "speaking" },
  { nameKey: "chat.voiceSession.p2Name", roleKey: "chat.voiceSession.roleMember", state: "listening" },
  { nameKey: "chat.voiceSession.p3Name", roleKey: "chat.voiceSession.roleMember", state: "muted" },
];

const participantState: Record<Participant["state"], { labelKey: MessageKey; tone: "success" | "personal" | "communication" }> = {
  listening: { labelKey: "chat.voiceSession.stateListening", tone: "personal" },
  muted: { labelKey: "chat.voiceSession.stateMuted", tone: "communication" },
  speaking: { labelKey: "chat.voiceSession.stateSpeaking", tone: "success" },
};

function ParticipantRow({ participant }: { participant: Participant }) {
  const { t } = useI18n();
  const state = participantState[participant.state];
  const name = t(participant.nameKey);

  return (
    <article className="voice-session-participant">
      <span className="voice-session-participant__avatar" aria-hidden="true">
        {name.slice(0, 1)}
      </span>
      <div>
        <div className="voice-session-participant__meta">
          <StatusBadge tone={state.tone}>{t(state.labelKey)}</StatusBadge>
          <span>{t(participant.roleKey)}</span>
        </div>
        <h3>{name}</h3>
      </div>
      {participant.state === "muted" ? <MicOff size={17} strokeWidth={2.1} /> : <Mic size={17} strokeWidth={2.1} />}
    </article>
  );
}

export function VoiceSessionPanel() {
  const { t } = useI18n();

  return (
    <section className="voice-session" aria-label={t("chat.voiceSession.aria")}>
      <GlassPanel className="voice-session__hero">
        <div className="voice-session__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <Radio size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>{t("chat.voiceSession.chip")}</Chip>
            <h2>{t("chat.voiceSession.heroTitle")}</h2>
            <p>
              {t("chat.voiceSession.heroBody")}
            </p>
          </div>
        </div>
        <div className="voice-session__status">
          <StatusBadge tone="success">{t("chat.voiceSession.connected")}</StatusBadge>
          <strong>{t("chat.voiceSession.participantCount")}</strong>
          <span>{t("chat.voiceSession.currentParticipants")}</span>
          <ProgressBar label={t("chat.voiceSession.quality")} value={92} />
        </div>
      </GlassPanel>

      <div className="voice-session__grid">
        <GlassPanel className="voice-session__panel">
          <div className="voice-session__panel-header">
            <div>
              <h3>{t("chat.voiceSession.panelTitle")}</h3>
              <p>{t("chat.voiceSession.panelBody")}</p>
            </div>
            <Chip icon={<Volume2 size={14} />}>{t("chat.voiceSession.connectionChip")}</Chip>
          </div>

          <div className="voice-session__participants">
            {participants.map((participant) => (
              <ParticipantRow key={`${participant.nameKey}-${participant.roleKey}`} participant={participant} />
            ))}
          </div>

          <footer className="voice-session__controls">
            <Button icon={<Mic size={15} />} size="sm" variant="primary">
              {t("chat.voiceSession.micOn")}
            </Button>
            <Button icon={<PhoneOff size={15} />} size="sm" variant="quiet">
              {t("chat.voiceSession.leave")}
            </Button>
          </footer>
        </GlassPanel>

        <GlassPanel className="voice-session__policy">
          <h3>{t("chat.voiceSession.policyTitle")}</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <LockKeyhole size={16} strokeWidth={2.1} />
            </span>
            <p>{t("chat.voiceSession.policy1")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <UsersRound size={16} strokeWidth={2.1} />
            </span>
            <p>{t("chat.voiceSession.policy2")}</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>{t("chat.voiceSession.policy3")}</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
