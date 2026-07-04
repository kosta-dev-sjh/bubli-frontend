"use client";

import { Building2, Check, Copy, Crown, DoorClosed, FileUp, Link2, UserCheck, UserPlus, UsersRound, Wallet, X } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { friendApi } from "@/features/communication/api/friendApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type {
  ContractDocumentType,
  InviteLinkResponse,
  ProjectRoomInvitationResponse,
  ProjectRoomMemberResponse,
  ProjectRoomPaymentStatus,
  ProjectRoomResponse,
  ProjectRoomRole,
} from "@/types/api/projectRoom";

import styles from "./project-room-settings-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type PanelNotice = {
  text: string;
  tone: "error" | "ok";
};

const paymentStatusOptions: Array<{ labelKey: MessageKey; value: ProjectRoomPaymentStatus }> = [
  { labelKey: "room.settings.paymentStatus.notRecorded", value: "NOT_RECORDED" },
  { labelKey: "room.settings.paymentStatus.pending", value: "PENDING" },
  { labelKey: "room.settings.paymentStatus.paid", value: "PAID" },
  { labelKey: "room.settings.paymentStatus.overdue", value: "OVERDUE" },
];

const documentTypeOptions: Array<{ labelKey: MessageKey; value: ContractDocumentType }> = [
  { labelKey: "room.settings.documentType.contract", value: "CONTRACT" },
  { labelKey: "room.settings.documentType.requirement", value: "REQUIREMENT" },
];

const roleOptions: Array<{ labelKey: MessageKey; value: ProjectRoomRole }> = [
  { labelKey: "room.board.roleLeader", value: "PROJECT_LEADER" },
  { labelKey: "room.board.roleMember", value: "MEMBER" },
];

const CONTRACT_UPLOAD_ACCEPT = ".pdf,.txt,.md,.doc,.docx";

function toDateInputValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function requestErrorText(t: TranslateFn, error: unknown) {
  if (error instanceof ApiClientError && error.message) return error.message;
  if (error instanceof Error && error.message && error.message !== "Failed to fetch") return error.message;
  return t("room.settings.genericError");
}

export function ProjectRoomSettingsPanel({
  currentUserId,
  members,
  onClose,
  onMembersChange,
  onRoomChange,
  onRoomClosed,
  room,
}: {
  currentUserId: string | null;
  members: ProjectRoomMemberResponse[];
  onClose: () => void;
  onMembersChange: (members: ProjectRoomMemberResponse[]) => void;
  onRoomChange: (room: ProjectRoomResponse) => void;
  onRoomClosed: () => void;
  room: ProjectRoomResponse;
}) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<PanelNotice | null>(null);
  const [infoDraft, setInfoDraft] = useState({ clientName: room.clientName ?? "", name: room.name });
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState({
    contractAmount: room.contractAmount != null ? String(room.contractAmount) : "",
    paidAt: toDateInputValue(room.paidAt),
    paymentDueDate: toDateInputValue(room.paymentDueDate),
    paymentStatus: room.paymentStatus ?? "NOT_RECORDED",
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [documentType, setDocumentType] = useState<ContractDocumentType>("CONTRACT");
  const [isUploading, setIsUploading] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null);
  const [isCloseConfirming, setIsCloseConfirming] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [inviteBubliId, setInviteBubliId] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectRoomInvitationResponse[]>([]);
  const [cancelingInvitationId, setCancelingInvitationId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<InviteLinkResponse | null>(null);
  const [isCreatingInviteLink, setIsCreatingInviteLink] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);

  const activeMembers = useMemo(() => members.filter((member) => member.status === "ACTIVE"), [members]);
  const canManage = useMemo(() => {
    if (shouldUseWorkspacePreviewData()) return true;
    if (!currentUserId) return false;
    if (room.createdByUserId === currentUserId) return true;
    return activeMembers.some((member) => member.userId === currentUserId && member.role === "PROJECT_LEADER");
  }, [activeMembers, currentUserId, room.createdByUserId]);

  const handleSaveInfo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = infoDraft.name.trim();
    if (!name) {
      setNotice({ text: t("room.settings.nameRequired"), tone: "error" });
      return;
    }

    const body = {
      clientName: infoDraft.clientName.trim() || null,
      name,
    };

    setIsSavingInfo(true);

    try {
      const updated = await projectRoomApi.update(room.id, body);
      onRoomChange(updated);
      setNotice({ text: t("room.settings.infoSaved"), tone: "ok" });
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        onRoomChange({ ...room, ...body, updatedAt: new Date().toISOString() });
        setNotice({ text: t("room.settings.infoSaved"), tone: "ok" });
      } else {
        setNotice({ text: requestErrorText(t, error), tone: "error" });
      }
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleSavePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = paymentDraft.contractAmount.trim();
    const parsedAmount = amount ? Number(amount.replace(/[,\s]/g, "")) : null;
    if (parsedAmount != null && Number.isNaN(parsedAmount)) {
      setNotice({ text: t("room.settings.amountInvalid"), tone: "error" });
      return;
    }

    const body = {
      contractAmount: parsedAmount,
      paidAt: paymentDraft.paidAt || null,
      paymentDueDate: paymentDraft.paymentDueDate || null,
      paymentStatus: paymentDraft.paymentStatus,
    };

    setIsSavingPayment(true);

    try {
      const updated = await projectRoomApi.updatePayment(room.id, body);
      onRoomChange(updated);
      setNotice({ text: t("room.settings.paymentSaved"), tone: "ok" });
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        onRoomChange({ ...room, ...body, updatedAt: new Date().toISOString() });
        setNotice({ text: t("room.settings.paymentSaved"), tone: "ok" });
      } else {
        setNotice({ text: requestErrorText(t, error), tone: "error" });
      }
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);

    try {
      await projectRoomApi.uploadContractDocument(room.id, file, documentType);
      setNotice({ text: t("room.settings.uploadDone", { name: file.name }), tone: "ok" });
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        setNotice({ text: t("room.settings.uploadDone", { name: file.name }), tone: "ok" });
      } else {
        setNotice({ text: requestErrorText(t, error), tone: "error" });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 대기 중 초대 목록 — 채팅 페이지와 같은 projectRoomApi.getInvitations 계약을 그대로 쓴다.
  const loadInvitations = useCallback(async () => {
    try {
      const page = await projectRoomApi.getInvitations(room.id);
      setPendingInvitations(page.items.filter((invitation) => invitation.status === "PENDING"));
    } catch {
      // 초대 목록 로드 실패는 조용히 넘기고, 초대 전송/취소 시 다시 시도한다.
    }
  }, [room.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInvitations();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadInvitations]);

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const bubliId = inviteBubliId.trim().replace(/^@/, "");
    if (!bubliId) {
      setNotice({ text: t("room.settings.inviteIdRequired"), tone: "error" });
      return;
    }

    setIsInviting(true);

    try {
      // createInvitation은 inviteeUserId를 요구하므로 Bubli ID를 먼저 사용자로 해석한다.
      const [target] = await friendApi.searchByBubliId(bubliId);
      if (!target) {
        setNotice({ text: t("room.settings.inviteNotFound"), tone: "error" });
        return;
      }

      await projectRoomApi.createInvitation(room.id, { inviteeUserId: target.userId, role: "MEMBER" });
      setInviteBubliId("");
      setNotice({ text: t("room.settings.inviteSent", { name: target.name }), tone: "ok" });
      await loadInvitations();
    } catch (error) {
      setNotice({ text: requestErrorText(t, error), tone: "error" });
    } finally {
      setIsInviting(false);
    }
  };

  // 초대 링크 — 만료 시간을 명시해 백엔드 계약(expiresInHours)을 그대로 따른다.
  const handleCreateInviteLink = async () => {
    if (isCreatingInviteLink) return;

    setIsCreatingInviteLink(true);
    setCopiedInviteLink(false);

    try {
      const link = await projectRoomApi.createInviteLink(room.id, { expiresInHours: 72 });
      setInviteLink(link);
      setNotice({ text: t("room.settings.inviteLinkCreated"), tone: "ok" });
    } catch (error) {
      setNotice({ text: requestErrorText(t, error), tone: "error" });
    } finally {
      setIsCreatingInviteLink(false);
    }
  };

  const inviteLinkUrl = inviteLink
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/app/invite/${inviteLink.token}`
    : "";

  const handleCopyInviteLink = async () => {
    if (!inviteLinkUrl) return;

    try {
      await navigator.clipboard.writeText(inviteLinkUrl);
      setCopiedInviteLink(true);
      window.setTimeout(() => setCopiedInviteLink(false), 1600);
    } catch {
      setCopiedInviteLink(false);
    }
  };

  const handleCancelInvitation = async (invitation: ProjectRoomInvitationResponse) => {
    if (cancelingInvitationId) return;

    setCancelingInvitationId(invitation.id);

    try {
      await projectRoomApi.cancelInvitation(invitation.id);
      setPendingInvitations((current) => current.filter((entry) => entry.id !== invitation.id));
      setNotice({ text: t("room.settings.inviteCanceled"), tone: "ok" });
    } catch (error) {
      setNotice({ text: requestErrorText(t, error), tone: "error" });
    } finally {
      setCancelingInvitationId(null);
    }
  };

  const handleRoleChange = async (member: ProjectRoomMemberResponse, role: ProjectRoomRole) => {
    if (member.role === role) return;

    setBusyMemberId(member.userId);

    try {
      const updated = await projectRoomApi.updateMemberRole(room.id, member.userId, { role });
      onMembersChange(members.map((entry) => (entry.userId === member.userId ? { ...entry, ...updated } : entry)));
      setNotice({ text: t("room.settings.roleUpdated"), tone: "ok" });
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        onMembersChange(members.map((entry) => (entry.userId === member.userId ? { ...entry, role } : entry)));
        setNotice({ text: t("room.settings.roleUpdated"), tone: "ok" });
      } else {
        setNotice({ text: requestErrorText(t, error), tone: "error" });
      }
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemoveMember = async (member: ProjectRoomMemberResponse) => {
    if (pendingRemoveUserId !== member.userId) {
      setPendingRemoveUserId(member.userId);
      return;
    }

    setBusyMemberId(member.userId);

    try {
      await projectRoomApi.removeMember(room.id, member.userId);
      onMembersChange(members.filter((entry) => entry.userId !== member.userId));
      setNotice({ text: t("room.settings.memberRemoved"), tone: "ok" });
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        onMembersChange(members.filter((entry) => entry.userId !== member.userId));
        setNotice({ text: t("room.settings.memberRemoved"), tone: "ok" });
      } else {
        setNotice({ text: requestErrorText(t, error), tone: "error" });
      }
    } finally {
      setBusyMemberId(null);
      setPendingRemoveUserId(null);
    }
  };

  const handleCloseRoom = async () => {
    if (!isCloseConfirming) {
      setIsCloseConfirming(true);
      return;
    }

    setIsClosing(true);

    try {
      await projectRoomApi.close(room.id);
      onRoomClosed();
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        onRoomClosed();
        return;
      }
      setNotice({ text: requestErrorText(t, error), tone: "error" });
      setIsClosing(false);
      setIsCloseConfirming(false);
    }
  };

  // 닫힌 룸 다시 열기 — 백엔드 PATCH /api/project-rooms/{roomId} 의 status(ACTIVE|CLOSED) 계약을 사용한다.
  const handleReopenRoom = async () => {
    if (isReopening) return;

    setIsReopening(true);

    try {
      const updated = await projectRoomApi.update(room.id, { status: "ACTIVE" });
      onRoomChange(updated);
      setNotice({ text: t("room.settings.reopened"), tone: "ok" });
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        onRoomChange({ ...room, closedAt: null, status: "ACTIVE", updatedAt: new Date().toISOString() });
        setNotice({ text: t("room.settings.reopened"), tone: "ok" });
      } else {
        setNotice({ text: requestErrorText(t, error), tone: "error" });
      }
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <section aria-label={t("room.settings.panelAria")} className={styles.panel}>
      <div className={styles.head}>
        <h2>{t("room.settings.title")}</h2>
        <div className={styles.headActions}>
          {room.status === "CLOSED" ? <StatusBadge tone="warning">{t("room.settings.statusClosed")}</StatusBadge> : null}
          {!canManage ? <StatusBadge tone="neutral">{t("room.settings.leaderOnly")}</StatusBadge> : null}
          <button aria-label={t("room.settings.closePanel")} className={styles.closeButton} onClick={onClose} type="button">
            <X aria-hidden="true" size={15} strokeWidth={1.9} />
          </button>
        </div>
      </div>

      {notice ? (
        <p aria-live="polite" className={notice.tone === "error" ? styles.noticeError : styles.notice}>
          {notice.text}
        </p>
      ) : null}

      <div className={styles.sections}>
        <section aria-label={t("room.settings.infoTitle")} className={styles.section}>
          <h3>
            <Building2 aria-hidden="true" size={15} strokeWidth={1.9} />
            {t("room.settings.infoTitle")}
          </h3>
          <form className={styles.fieldGrid} onSubmit={handleSaveInfo}>
            <label className={styles.field}>
              <span>{t("room.settings.nameLabel")}</span>
              <input
                disabled={!canManage}
                onChange={(event) => setInfoDraft((current) => ({ ...current, name: event.target.value }))}
                value={infoDraft.name}
              />
            </label>
            <label className={styles.field}>
              <span>{t("room.settings.clientLabel")}</span>
              <input
                disabled={!canManage}
                onChange={(event) => setInfoDraft((current) => ({ ...current, clientName: event.target.value }))}
                placeholder={t("room.settings.clientPlaceholder")}
                value={infoDraft.clientName}
              />
            </label>
            <div className={styles.fieldActions}>
              <Button disabled={!canManage} loading={isSavingInfo} size="sm" type="submit" variant="primary">
                {t("room.settings.save")}
              </Button>
            </div>
          </form>
        </section>

        <section aria-label={t("room.settings.paymentTitle")} className={styles.section}>
          <h3>
            <Wallet aria-hidden="true" size={15} strokeWidth={1.9} />
            {t("room.settings.paymentTitle")}
          </h3>
          <form className={styles.fieldGrid} onSubmit={handleSavePayment}>
            <label className={styles.field}>
              <span>{t("room.settings.paymentStatusLabel")}</span>
              <select
                disabled={!canManage}
                onChange={(event) =>
                  setPaymentDraft((current) => ({ ...current, paymentStatus: event.target.value as ProjectRoomPaymentStatus }))
                }
                value={paymentDraft.paymentStatus}
              >
                {paymentStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{t("room.settings.amountLabel")}</span>
              <input
                disabled={!canManage}
                inputMode="numeric"
                onChange={(event) => setPaymentDraft((current) => ({ ...current, contractAmount: event.target.value }))}
                placeholder={t("room.settings.amountPlaceholder")}
                value={paymentDraft.contractAmount}
              />
            </label>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>{t("room.settings.dueLabel")}</span>
                <input
                  disabled={!canManage}
                  onChange={(event) => setPaymentDraft((current) => ({ ...current, paymentDueDate: event.target.value }))}
                  type="date"
                  value={paymentDraft.paymentDueDate}
                />
              </label>
              <label className={styles.field}>
                <span>{t("room.settings.paidAtLabel")}</span>
                <input
                  disabled={!canManage}
                  onChange={(event) => setPaymentDraft((current) => ({ ...current, paidAt: event.target.value }))}
                  type="date"
                  value={paymentDraft.paidAt}
                />
              </label>
            </div>
            <div className={styles.fieldActions}>
              <Button disabled={!canManage} loading={isSavingPayment} size="sm" type="submit" variant="primary">
                {t("room.settings.save")}
              </Button>
            </div>
          </form>
        </section>

        <section aria-label={t("room.settings.contractTitle")} className={styles.section}>
          <h3>
            <FileUp aria-hidden="true" size={15} strokeWidth={1.9} />
            {t("room.settings.contractTitle")}
          </h3>
          <p className={styles.hint}>{t("room.settings.contractHint")}</p>
          <label className={styles.field}>
            <span>{t("room.settings.documentTypeLabel")}</span>
            <select
              disabled={!canManage || isUploading}
              onChange={(event) => setDocumentType(event.target.value as ContractDocumentType)}
              value={documentType}
            >
              {documentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <input
            accept={CONTRACT_UPLOAD_ACCEPT}
            className={styles.hiddenFile}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUploadFile(file);
            }}
            ref={fileInputRef}
            type="file"
          />
          <div className={styles.fieldActions}>
            <Button
              disabled={!canManage}
              icon={<FileUp size={14} strokeWidth={1.9} />}
              loading={isUploading}
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="secondary"
            >
              {isUploading ? t("room.settings.uploading") : t("room.settings.upload")}
            </Button>
          </div>
        </section>

        <section aria-label={t("room.settings.membersTitle")} className={styles.section}>
          <h3>
            <UsersRound aria-hidden="true" size={15} strokeWidth={1.9} />
            {t("room.settings.membersTitle")}
            <StatusBadge tone="room">{t("room.settings.membersCount", { count: activeMembers.length })}</StatusBadge>
          </h3>
          {activeMembers.length === 0 ? (
            <p className={styles.hint}>{t("room.settings.membersEmpty")}</p>
          ) : (
            <div className={styles.memberList}>
              {activeMembers.map((member) => {
                const isSelf = Boolean(currentUserId) && member.userId === currentUserId;
                const isBusy = busyMemberId === member.userId;
                const RoleIcon = member.role === "PROJECT_LEADER" ? Crown : UserCheck;

                return (
                  <article className={styles.memberRow} key={member.userId}>
                    <span aria-hidden="true" className={styles.memberIcon}>
                      <RoleIcon size={14} strokeWidth={1.9} />
                    </span>
                    <span className={styles.memberName}>
                      <strong>
                        {member.name}
                        {isSelf ? ` · ${t("room.settings.memberSelf")}` : ""}
                      </strong>
                      <small>{member.bubliId ? `@${member.bubliId}` : t(member.role === "PROJECT_LEADER" ? "room.board.roleLeader" : "room.board.roleMember")}</small>
                    </span>
                    {canManage && !isSelf ? (
                      <span className={styles.memberActions}>
                        <select
                          aria-label={t("room.settings.roleChangeAria", { name: member.name })}
                          disabled={isBusy}
                          onChange={(event) => void handleRoleChange(member, event.target.value as ProjectRoomRole)}
                          value={member.role}
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {t(option.labelKey)}
                            </option>
                          ))}
                        </select>
                        <Button
                          aria-label={t("room.settings.removeAria", { name: member.name })}
                          loading={isBusy && pendingRemoveUserId === member.userId}
                          onClick={() => void handleRemoveMember(member)}
                          size="sm"
                          variant={pendingRemoveUserId === member.userId ? "primary" : "quiet"}
                        >
                          {pendingRemoveUserId === member.userId ? t("room.settings.removeConfirm") : t("room.settings.remove")}
                        </Button>
                      </span>
                    ) : (
                      <StatusBadge tone={member.role === "PROJECT_LEADER" ? "approved" : "neutral"}>
                        {t(member.role === "PROJECT_LEADER" ? "room.board.roleLeader" : "room.board.roleMember")}
                      </StatusBadge>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section aria-label={t("room.settings.inviteTitle")} className={styles.section}>
          <h3>
            <UserPlus aria-hidden="true" size={15} strokeWidth={1.9} />
            {t("room.settings.inviteTitle")}
            {pendingInvitations.length > 0 ? (
              <StatusBadge tone="room">{t("room.settings.membersCount", { count: pendingInvitations.length })}</StatusBadge>
            ) : null}
          </h3>
          <p className={styles.hint}>{t("room.settings.inviteHint")}</p>
          <form className={styles.fieldGrid} onSubmit={handleInvite}>
            <label className={styles.field}>
              <span>{t("room.settings.inviteLabel")}</span>
              <input
                disabled={!canManage || isInviting}
                onChange={(event) => setInviteBubliId(event.target.value)}
                placeholder={t("room.settings.invitePlaceholder")}
                value={inviteBubliId}
              />
            </label>
            <div className={styles.fieldActions}>
              <Button disabled={!canManage} loading={isInviting} size="sm" type="submit" variant="primary">
                {isInviting ? t("room.settings.inviteSending") : t("room.settings.inviteSend")}
              </Button>
            </div>
          </form>

          <p className={styles.hint}>{t("room.settings.inviteLinkHint")}</p>
          <div className={styles.fieldActions}>
            <Button
              disabled={!canManage}
              icon={<Link2 size={14} strokeWidth={1.9} />}
              loading={isCreatingInviteLink}
              onClick={() => void handleCreateInviteLink()}
              size="sm"
              variant="secondary"
            >
              {isCreatingInviteLink ? t("room.settings.inviteLinkCreating") : t("room.settings.inviteLinkCreate")}
            </Button>
            {inviteLink ? (
              <Button
                aria-label={t("room.settings.inviteLinkCopyAria")}
                icon={copiedInviteLink ? <Check size={14} strokeWidth={2.2} /> : <Copy size={14} strokeWidth={1.9} />}
                onClick={() => void handleCopyInviteLink()}
                size="sm"
                variant="quiet"
              >
                {copiedInviteLink ? t("room.settings.inviteLinkCopied") : t("room.settings.inviteLinkCopy")}
              </Button>
            ) : null}
          </div>
          {inviteLink ? (
            <label className={styles.field}>
              <span>
                {t("room.settings.inviteLinkExpires", {
                  date: new Date(inviteLink.expiresAt).toLocaleString(),
                })}
              </span>
              <input aria-label={t("room.settings.inviteLinkTitle")} readOnly value={inviteLinkUrl} />
            </label>
          ) : null}

          {pendingInvitations.length === 0 ? (
            <p className={styles.hint}>{t("room.settings.invitePendingEmpty")}</p>
          ) : (
            <div className={styles.memberList}>
              {pendingInvitations.map((invitation) => {
                const inviteeName =
                  invitation.inviteeName ?? (invitation.inviteeBubliId ? `@${invitation.inviteeBubliId}` : invitation.inviteeUserId);

                return (
                  <article className={styles.memberRow} key={invitation.id}>
                    <span aria-hidden="true" className={styles.memberIcon}>
                      <UserPlus size={14} strokeWidth={1.9} />
                    </span>
                    <span className={styles.memberName}>
                      <strong>{inviteeName}</strong>
                      <small>
                        {invitation.inviteeBubliId ? `@${invitation.inviteeBubliId} · ` : ""}
                        {t("room.settings.invitePendingTitle")}
                      </small>
                    </span>
                    {canManage ? (
                      <Button
                        aria-label={t("room.settings.inviteCancelAria", { name: inviteeName })}
                        loading={cancelingInvitationId === invitation.id}
                        onClick={() => void handleCancelInvitation(invitation)}
                        size="sm"
                        variant="quiet"
                      >
                        {t("room.settings.inviteCancel")}
                      </Button>
                    ) : (
                      <StatusBadge tone="neutral">{t("room.settings.invitePendingTitle")}</StatusBadge>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {canManage && room.status === "ACTIVE" ? (
          <section aria-label={t("room.settings.dangerTitle")} className={styles.section}>
            <h3>
              <DoorClosed aria-hidden="true" size={15} strokeWidth={1.9} />
              {t("room.settings.dangerTitle")}
            </h3>
            <p className={styles.hint}>{t("room.settings.dangerHint")}</p>
            <div className={styles.dangerRow}>
              <Button loading={isClosing} onClick={() => void handleCloseRoom()} size="sm" variant={isCloseConfirming ? "primary" : "secondary"}>
                {isClosing
                  ? t("room.settings.closing")
                  : isCloseConfirming
                    ? t("room.settings.closeConfirm")
                    : t("room.settings.closeRoom")}
              </Button>
              {isCloseConfirming && !isClosing ? (
                <Button onClick={() => setIsCloseConfirming(false)} size="sm" variant="quiet">
                  {t("room.settings.closeCancel")}
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        {canManage && room.status === "CLOSED" ? (
          <section aria-label={t("room.settings.reopenTitle")} className={styles.section}>
            <h3>
              <DoorClosed aria-hidden="true" size={15} strokeWidth={1.9} />
              {t("room.settings.reopenTitle")}
            </h3>
            <p className={styles.hint}>{t("room.settings.reopenHint")}</p>
            <div className={styles.dangerRow}>
              <Button loading={isReopening} onClick={() => void handleReopenRoom()} size="sm" variant="primary">
                {isReopening ? t("room.settings.reopening") : t("room.settings.reopenRoom")}
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
