"use client";

import { Building2, Crown, DoorClosed, FileText, UserCheck, UserPlus, UsersRound, Wallet, X } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { agentApi } from "@/features/agent/api/agentApi";
import { friendApi } from "@/features/communication/api/friendApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { ApiClientError } from "@/lib/api/errors";
import { notifyDataChanged } from "@/lib/data-changed";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { isWindowsTauriRuntime } from "@/lib/tauri/platform";
import { readTauriStartupOptimizationConfig } from "@/lib/tauri/startup-optimization";
import { shouldUseWorkspacePreviewData } from "@/lib/workspace-preview-data";
import type { AgentSuggestionResponse } from "@/types/api/agent";
import type { FriendResponse } from "@/types/api/friend";
import type { ProjectRoomInvitationResponse, ProjectRoomMemberResponse, ProjectRoomPaymentStatus, ProjectRoomResponse, ProjectRoomRole } from "@/types/api/projectRoom";
import type { ResourceResponse } from "@/types/api/resource";

import styles from "./project-room-settings-panel.module.css";

type ContractFillFields = {
  clientName?: string;
  contractAmount?: string;
  paidAt?: string;
  paymentDueDate?: string;
};

type ContractFillOption = {
  fields: ContractFillFields;
  name: string;
  resourceId: string;
};

async function readWindowsRoomSettingsTimeoutMs() {
  if (!isWindowsTauriRuntime()) return 0;

  const startupConfig = await readTauriStartupOptimizationConfig().catch(() => null);
  if (startupConfig?.profile !== "windows") return 0;
  return startupConfig.settingsTimeoutMs;
}

function withWindowsRoomSettingsDeadline<T>(request: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  if (timeoutMs <= 0 || typeof window === "undefined") return request;

  let timeoutId: number | null = null;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([request, timeout]).finally(() => {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  });
}

// 계약서 추출 필드(payloadJson.fieldKey/value)를 입금 폼 슬롯으로 매핑한다.
// 표준 fieldKey(contract_amount 등)를 우선하되, 옛 자유 문자열·한글 라벨도 관대하게 흡수한다.
function classifyContractField(fieldKey: string, label: string): keyof ContractFillFields | null {
  const key = `${fieldKey} ${label}`.toLowerCase();
  if (/contract_amount|\bamount\b|금액|견적|계약금|대금/.test(key)) return "contractAmount";
  if (/payment_due_date|due|예정일|마감|deadline/.test(key)) return "paymentDueDate";
  if (/payment_date|paid|입금일|지급일|결제일/.test(key)) return "paidAt";
  if (/client_name|client|클라이언트|고객|발주|거래처|company|회사/.test(key)) return "clientName";
  return null;
}

function normalizeAmountValue(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length > 0 ? digits : null;
}

function normalizeDateValue(raw: string): string | null {
  const iso = raw.match(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = new Date(raw.trim());
  if (!Number.isNaN(parsed.getTime())) {
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${parsed.getFullYear()}-${month}-${day}`;
  }
  return null;
}

function confidenceOf(reference: AgentSuggestionResponse): number {
  const value = reference.payloadJson?.confidence;
  return typeof value === "number" ? value : 0;
}

// 룸의 계약 참고값을 자료(계약서)별로 묶어, 채울 값이 하나라도 있는 계약서만 선택지로 만든다.
function buildContractFillOptions(
  references: AgentSuggestionResponse[],
  resources: ResourceResponse[],
  fallbackName: string,
): ContractFillOption[] {
  const nameById = new Map(resources.map((resource) => [resource.id, resource.title] as const));
  const grouped = new Map<string, AgentSuggestionResponse[]>();

  for (const reference of references) {
    const resourceId = reference.resourceId;
    if (!resourceId) continue;
    const bucket = grouped.get(resourceId);
    if (bucket) bucket.push(reference);
    else grouped.set(resourceId, [reference]);
  }

  const options: ContractFillOption[] = [];

  for (const [resourceId, group] of grouped) {
    const sorted = [...group].sort((a, b) => confidenceOf(b) - confidenceOf(a));
    const fields: ContractFillFields = {};

    for (const reference of sorted) {
      const payload = reference.payloadJson ?? {};
      const value = String(payload.value ?? "").trim();
      if (!value) continue;
      const slot = classifyContractField(String(payload.fieldKey ?? ""), String(payload.title ?? ""));
      if (!slot || fields[slot]) continue;

      if (slot === "contractAmount") {
        const amount = normalizeAmountValue(value);
        if (amount) fields.contractAmount = amount;
      } else if (slot === "paymentDueDate") {
        const date = normalizeDateValue(value);
        if (date) fields.paymentDueDate = date;
      } else if (slot === "paidAt") {
        const date = normalizeDateValue(value);
        if (date) fields.paidAt = date;
      } else {
        fields.clientName = value;
      }
    }

    if (fields.contractAmount || fields.paymentDueDate || fields.paidAt || fields.clientName) {
      options.push({ fields, name: nameById.get(resourceId) ?? fallbackName, resourceId });
    }
  }

  return options;
}

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

const roleOptions: Array<{ labelKey: MessageKey; value: ProjectRoomRole }> = [
  { labelKey: "room.board.roleLeader", value: "PROJECT_LEADER" },
  { labelKey: "room.board.roleMember", value: "MEMBER" },
];

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

// 초대는 수락한 친구에게만 보낼 수 있다(백엔드 PROJECT_403_003). 그 경우만 쉬운 안내로 바꾼다.
function inviteErrorText(t: TranslateFn, error: unknown) {
  if (error instanceof ApiClientError && error.code === "PROJECT_403_003") {
    return t("room.settings.inviteFriendOnly");
  }
  return requestErrorText(t, error);
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
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null);
  const [isCloseConfirming, setIsCloseConfirming] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [inviteBubliId, setInviteBubliId] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectRoomInvitationResponse[]>([]);
  const [cancelingInvitationId, setCancelingInvitationId] = useState<string | null>(null);
  const [contractFillOpen, setContractFillOpen] = useState(false);
  const [contractOptions, setContractOptions] = useState<ContractFillOption[]>([]);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [friends, setFriends] = useState<FriendResponse[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [invitingFriendId, setInvitingFriendId] = useState<string | null>(null);

  const activeMembers = useMemo(() => members.filter((member) => member.status === "ACTIVE"), [members]);
  const canManage = useMemo(() => {
    if (shouldUseWorkspacePreviewData()) return true;
    if (!currentUserId) return false;
    if (room.createdByUserId === currentUserId) return true;
    return activeMembers.some((member) => member.userId === currentUserId && member.role === "PROJECT_LEADER");
  }, [activeMembers, currentUserId, room.createdByUserId]);

  // 룸/멤버 변경을 부모 화면에 반영하면서, 셸 스위처·탑바·홈 카드 등 같은 창의 다른 표면에도 즉시 알린다.
  const emitRoomChange = (updated: ProjectRoomResponse) => {
    onRoomChange(updated);
    notifyDataChanged("project-room");
  };

  const emitMembersChange = (nextMembers: ProjectRoomMemberResponse[]) => {
    onMembersChange(nextMembers);
    notifyDataChanged("project-room");
  };

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
      emitRoomChange(updated);
      setNotice({ text: t("room.settings.infoSaved"), tone: "ok" });
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        emitRoomChange({ ...room, ...body, updatedAt: new Date().toISOString() });
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
      emitRoomChange(updated);
      setNotice({ text: t("room.settings.paymentSaved"), tone: "ok" });
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        emitRoomChange({ ...room, ...body, updatedAt: new Date().toISOString() });
        setNotice({ text: t("room.settings.paymentSaved"), tone: "ok" });
      } else {
        setNotice({ text: requestErrorText(t, error), tone: "error" });
      }
    } finally {
      setIsSavingPayment(false);
    }
  };

  const selectedContract = useMemo(
    () => contractOptions.find((option) => option.resourceId === selectedContractId) ?? null,
    [contractOptions, selectedContractId],
  );

  // 선택한 계약서가 채울 값을 사람이 읽을 수 있는 미리보기 칩으로 만든다 (저장 전 확인용).
  const contractFillPreviewTags = useMemo(() => {
    if (!selectedContract) return [] as string[];
    const { clientName, contractAmount, paidAt, paymentDueDate } = selectedContract.fields;
    const tags: string[] = [];
    if (contractAmount) tags.push(`${t("room.settings.amountLabel")} ${Number(contractAmount).toLocaleString()}`);
    if (paymentDueDate) tags.push(`${t("room.settings.dueLabel")} ${paymentDueDate}`);
    if (paidAt) tags.push(`${t("room.settings.paidAtLabel")} ${paidAt}`);
    if (clientName) tags.push(`${t("room.settings.clientLabel")} ${clientName}`);
    return tags;
  }, [selectedContract, t]);

  // 계약서에서 불러오기: 룸의 계약 참고값 + 자료 목록을 함께 받아 계약서별 선택지를 만든다.
  const handleToggleContractFill = async () => {
    if (contractFillOpen) {
      setContractFillOpen(false);
      return;
    }

    setIsLoadingContracts(true);

    try {
      const referencesRequest = agentApi.listRoomContractReferences(room.id);
      const resourcesRequest = resourcesApi.listRoomResources(room.id).then((page) => page.items);
      const timeoutMs = await readWindowsRoomSettingsTimeoutMs();
      const [references, resources] = await Promise.all([
        withWindowsRoomSettingsDeadline(referencesRequest, timeoutMs, []),
        withWindowsRoomSettingsDeadline(resourcesRequest, timeoutMs, []),
      ]);
      const options = buildContractFillOptions(references, resources, t("room.settings.contractFillUnnamed"));
      setContractOptions(options);
      setSelectedContractId(options[0]?.resourceId ?? "");
      setContractFillOpen(true);
      if (timeoutMs > 0 && references.length === 0 && resources.length === 0) {
        void Promise.allSettled([referencesRequest, resourcesRequest]).then(([latestReferences, latestResources]) => {
          if (latestReferences.status !== "fulfilled" || latestResources.status !== "fulfilled") return;
          const latestOptions = buildContractFillOptions(
            latestReferences.value,
            latestResources.value,
            t("room.settings.contractFillUnnamed"),
          );
          setContractOptions(latestOptions);
          setSelectedContractId(latestOptions[0]?.resourceId ?? "");
        });
      }
    } catch (error) {
      setContractOptions([]);
      setSelectedContractId("");
      setContractFillOpen(true);
      setNotice({ text: requestErrorText(t, error), tone: "error" });
    } finally {
      setIsLoadingContracts(false);
    }
  };

  // 프리필만 한다 — 저장은 사용자가 값을 확인한 뒤 기존 저장 버튼으로 직접 한다.
  const handleApplyContract = () => {
    if (!selectedContract) return;

    const { clientName, contractAmount, paidAt, paymentDueDate } = selectedContract.fields;

    if (contractAmount || paidAt || paymentDueDate) {
      setPaymentDraft((current) => ({
        ...current,
        contractAmount: contractAmount ?? current.contractAmount,
        paidAt: paidAt ?? current.paidAt,
        paymentDueDate: paymentDueDate ?? current.paymentDueDate,
      }));
    }
    if (clientName) {
      setInfoDraft((current) => ({ ...current, clientName }));
    }

    setContractFillOpen(false);
    setNotice({ text: t("room.settings.contractFillApplied", { name: selectedContract.name }), tone: "ok" });
  };

  // 대기 중 초대 목록 — 채팅 페이지와 같은 projectRoomApi.getInvitations 계약을 그대로 쓴다.
  const loadInvitations = useCallback(async () => {
    try {
      const request = projectRoomApi.getInvitations(room.id);
      const timeoutMs = await readWindowsRoomSettingsTimeoutMs();
      const page = await withWindowsRoomSettingsDeadline<Awaited<typeof request> | null>(request, timeoutMs, null);
      if (!page) {
        void request
          .then((latest) => setPendingInvitations(latest.items.filter((invitation) => invitation.status === "PENDING")))
          .catch(() => undefined);
        return;
      }
      setPendingInvitations(page.items.filter((invitation) => invitation.status === "PENDING"));
    } catch {
      // 초대 목록 로드 실패는 조용히 넘기고, 초대 전송/취소 시 다시 시도한다.
    }
  }, [room.id]);

  // 친구 목록 — 초대는 친구에게만 보낼 수 있으므로, 골라 초대할 후보로 쓴다.
  const loadFriends = useCallback(async () => {
    setIsLoadingFriends(true);
    try {
      const request = friendApi.listFriends();
      const timeoutMs = await readWindowsRoomSettingsTimeoutMs();
      const friends = await withWindowsRoomSettingsDeadline<FriendResponse[] | null>(request, timeoutMs, null);
      if (!friends) {
        void request.then(setFriends).catch(() => undefined);
        return;
      }
      setFriends(friends);
    } catch {
      // 친구 목록 로드 실패는 조용히 넘긴다. Bubli ID 직접 초대는 그대로 쓸 수 있다.
    } finally {
      setIsLoadingFriends(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInvitations();
      void loadFriends();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadInvitations, loadFriends]);

  // 이미 멤버이거나 초대 대기 중인 친구는 후보에서 뺀다.
  const invitableFriends = useMemo(() => {
    const memberIds = new Set(activeMembers.map((member) => member.userId));
    const pendingIds = new Set(pendingInvitations.map((invitation) => invitation.inviteeUserId));
    return friends.filter((friend) => !memberIds.has(friend.friendUserId) && !pendingIds.has(friend.friendUserId));
  }, [friends, activeMembers, pendingInvitations]);

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
      setNotice({ text: inviteErrorText(t, error), tone: "error" });
    } finally {
      setIsInviting(false);
    }
  };

  const handleInviteFriend = async (friend: FriendResponse) => {
    if (invitingFriendId) return;

    setInvitingFriendId(friend.friendUserId);

    try {
      await projectRoomApi.createInvitation(room.id, { inviteeUserId: friend.friendUserId, role: "MEMBER" });
      setNotice({ text: t("room.settings.inviteSent", { name: friend.name }), tone: "ok" });
      await loadInvitations();
    } catch (error) {
      setNotice({ text: inviteErrorText(t, error), tone: "error" });
    } finally {
      setInvitingFriendId(null);
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
      emitMembersChange(members.map((entry) => (entry.userId === member.userId ? { ...entry, ...updated } : entry)));
      setNotice({ text: t("room.settings.roleUpdated"), tone: "ok" });
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        emitMembersChange(members.map((entry) => (entry.userId === member.userId ? { ...entry, role } : entry)));
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
        emitMembersChange(members.filter((entry) => entry.userId !== member.userId));
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
      // 종료 즉시 셸 스위처/홈 카드가 룸 목록을 다시 받도록 알린다.
      notifyDataChanged("project-room");
      onRoomClosed();
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        notifyDataChanged("project-room");
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
      emitRoomChange(updated);
      setNotice({ text: t("room.settings.reopened"), tone: "ok" });
    } catch (error) {
      if (shouldUseWorkspacePreviewData()) {
        emitRoomChange({ ...room, closedAt: null, status: "ACTIVE", updatedAt: new Date().toISOString() });
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

          {canManage ? (
            <div className={styles.contractFill}>
              <div className={styles.contractFillHead}>
                <p className={styles.hint}>{t("room.settings.contractFillHint")}</p>
                <Button
                  icon={<FileText aria-hidden="true" size={14} strokeWidth={1.9} />}
                  loading={isLoadingContracts}
                  onClick={() => void handleToggleContractFill()}
                  size="sm"
                  variant="quiet"
                >
                  {contractFillOpen ? t("room.settings.contractFillClose") : t("room.settings.contractFillOpen")}
                </Button>
              </div>

              {contractFillOpen ? (
                contractOptions.length === 0 ? (
                  <p className={styles.hint}>{t("room.settings.contractFillEmpty")}</p>
                ) : (
                  <>
                    <label className={styles.field}>
                      <span>{t("room.settings.contractFillPick")}</span>
                      <select onChange={(event) => setSelectedContractId(event.target.value)} value={selectedContractId}>
                        {contractOptions.map((option) => (
                          <option key={option.resourceId} value={option.resourceId}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {contractFillPreviewTags.length > 0 ? (
                      <div className={styles.contractFillPreview}>
                        {contractFillPreviewTags.map((tag) => (
                          <span className={styles.contractFillTag} key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.hint}>{t("room.settings.contractFillNoFields")}</p>
                    )}

                    <div className={styles.fieldActions}>
                      <Button disabled={contractFillPreviewTags.length === 0} onClick={handleApplyContract} size="sm" variant="primary">
                        {t("room.settings.contractFillApply")}
                      </Button>
                    </div>
                  </>
                )
              ) : null}
            </div>
          ) : null}

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

          {canManage ? (
            isLoadingFriends && friends.length === 0 ? (
              <p className={styles.hint}>{t("room.settings.inviteFriendLoading")}</p>
            ) : invitableFriends.length === 0 ? (
              <p className={styles.hint}>{t("room.settings.inviteFriendEmpty")}</p>
            ) : (
              <div className={styles.memberList}>
                {invitableFriends.map((friend) => (
                  <article className={styles.memberRow} key={friend.friendUserId}>
                    <span aria-hidden="true" className={styles.memberIcon}>
                      <UserCheck size={14} strokeWidth={1.9} />
                    </span>
                    <span className={styles.memberName}>
                      <strong>{friend.name}</strong>
                      <small>@{friend.bubliId}</small>
                    </span>
                    <span className={styles.memberActions}>
                      <Button
                        loading={invitingFriendId === friend.friendUserId}
                        onClick={() => void handleInviteFriend(friend)}
                        size="sm"
                        variant="quiet"
                      >
                        {t("room.settings.inviteFriendAction")}
                      </Button>
                    </span>
                  </article>
                ))}
              </div>
            )
          ) : null}

          <p className={styles.hint}>{t("room.settings.inviteIdHint")}</p>
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
