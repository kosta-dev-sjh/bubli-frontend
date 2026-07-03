"use client";

import { DoorOpen, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { InviteLinkResponse } from "@/types/api/projectRoom";

type InvitePageState =
  | { kind: "loading" }
  | { kind: "ready"; link: InviteLinkResponse }
  | { kind: "accepted"; link: InviteLinkResponse }
  | { kind: "auth" }
  | { kind: "error"; message: string | null };

function expiresLabel(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : "en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    month: "short",
  }).format(date);
}

export default function InviteLinkPage() {
  const { locale, t } = useI18n();
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [state, setState] = useState<InvitePageState>({ kind: "loading" });
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });

    try {
      const link = await projectRoomApi.getInviteLink(token);
      setState({ kind: "ready", link });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      setState({
        kind: "error",
        message: error instanceof ApiClientError && error.message ? error.message : null,
      });
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const accept = useCallback(async () => {
    if (state.kind !== "ready" || accepting) return;

    setAccepting(true);
    setAcceptError(null);

    try {
      const link = await projectRoomApi.acceptInviteLink(token);
      setState({ kind: "accepted", link });
      router.push(`/app/project-rooms/${link.roomId}`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ kind: "auth" });
        return;
      }
      setAcceptError(
        error instanceof ApiClientError && error.message ? error.message : t("room.inviteJoin.acceptFailed"),
      );
    } finally {
      setAccepting(false);
    }
  }, [accepting, router, state.kind, t, token]);

  return (
    <section className="workspace-route" aria-labelledby="invite-join-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="invite-join-title">{t("room.inviteJoin.title")}</h1>
          <p>{t("room.inviteJoin.subtitle")}</p>
        </div>
      </header>

      {state.kind === "loading" ? (
        <GlassPanel className="workspace-route__panel">{t("room.inviteJoin.loading")}</GlassPanel>
      ) : null}

      {state.kind === "auth" ? (
        <GlassPanel className="workspace-route__panel">
          <div className="workspace-route__section-head">
            <div>
              <h2>{t("room.inviteJoin.loginRequired")}</h2>
              <p>{t("room.inviteJoin.loginHint")}</p>
            </div>
          </div>
          <div className="workspace-route__actions">
            <Link className="bubli-button bubli-button--primary" href="/login">
              {t("common.login")}
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "error" ? (
        <GlassPanel className="workspace-route__panel">
          <div className="workspace-route__section-head">
            <div>
              <h2>{t("room.inviteJoin.invalidTitle")}</h2>
              <p>{state.message ?? t("room.inviteJoin.invalidDesc")}</p>
            </div>
          </div>
          <div className="workspace-route__actions">
            <Button onClick={() => void load()} size="sm" variant="secondary">
              {t("room.inviteJoin.retry")}
            </Button>
          </div>
        </GlassPanel>
      ) : null}

      {state.kind === "ready" || state.kind === "accepted" ? (
        <GlassPanel className="workspace-route__panel">
          <div className="workspace-route__section-head">
            <div>
              <h2>
                <UserPlus aria-hidden size={16} strokeWidth={1.9} /> {state.link.roomName}
              </h2>
              <p>{t("room.inviteJoin.inviterLine", { name: state.link.inviterName })}</p>
              {state.link.expiresAt && !state.link.expired ? (
                <p>
                  {(() => {
                    const label = expiresLabel(state.link.expiresAt, locale);
                    return label ? t("room.inviteJoin.expiresLine", { date: label }) : null;
                  })()}
                </p>
              ) : null}
            </div>
            {state.link.expired ? <StatusBadge tone="warning">{t("room.inviteJoin.expiredBadge")}</StatusBadge> : null}
            {state.kind === "accepted" ? <StatusBadge tone="approved">{t("room.inviteJoin.acceptedBadge")}</StatusBadge> : null}
          </div>

          {acceptError ? <p aria-live="polite">{acceptError}</p> : null}

          <div className="workspace-route__actions">
            {state.kind === "accepted" ? (
              <Link className="bubli-button bubli-button--primary" href={`/app/project-rooms/${state.link.roomId}`}>
                <DoorOpen aria-hidden size={14} strokeWidth={1.9} /> {t("room.inviteJoin.goRoom")}
              </Link>
            ) : state.link.expired ? (
              <p>{t("room.inviteJoin.expiredDesc")}</p>
            ) : (
              <Button loading={accepting} onClick={() => void accept()} size="sm" variant="primary">
                {accepting ? t("room.inviteJoin.accepting") : t("room.inviteJoin.accept")}
              </Button>
            )}
          </div>
        </GlassPanel>
      ) : null}
    </section>
  );
}
