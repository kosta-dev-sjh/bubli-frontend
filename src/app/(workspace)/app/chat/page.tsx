"use client";

import { AtSign, Check, Copy, Inbox, KeyRound, LogOut, MessageCircle, Mic, MicOff, MoreHorizontal, Paperclip, Phone, Search, Send, Smile, Square, UserPlus, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { authApi } from "@/features/auth/api/authApi";
import { chatApi } from "@/features/communication/api/chatApi";
import { friendApi } from "@/features/communication/api/friendApi";
import { voiceApi } from "@/features/communication/api/voiceApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { ApiClientError } from "@/lib/api/errors";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { getActiveProjectRoomId, getActiveProjectRoomLabel, setActiveProjectRoomId } from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewChatMessages,
  workspacePreviewChatRoomsFor,
  workspacePreviewUser,
} from "@/lib/workspace-preview-data";
import type { AuthUser } from "@/types/api/auth";
import type { ChatMessageResponse, ChatRoomResponse, RoomAgentCommandMode } from "@/types/api/chat";
import type { FriendRequestResponse, FriendResponse, FriendSearchResponse } from "@/types/api/friend";
import type { ProjectRoomInvitationResponse } from "@/types/api/projectRoom";
import type { VoiceParticipantResponse, VoiceRoomResponse, VoiceTokenResponse } from "@/types/api/voice";

type RoomsState =
  | { kind: "loading" }
  | { kind: "ready"; rooms: ChatRoomResponse[] }
  | { kind: "auth" }
  | { kind: "offline" };

type MessagesState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; messages: ChatMessageResponse[] }
  | { kind: "offline" };

type SocialState =
  | { kind: "loading" }
  | { friends: FriendResponse[]; kind: "ready"; requests: FriendRequestResponse[] }
  | { kind: "offline" };

type ProfileState = { kind: "loading" } | { kind: "ready"; user: AuthUser } | { kind: "offline" };

type FriendSearchState =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "ready"; results: FriendSearchResponse[] }
  | { kind: "sent"; targetName: string }
  | { kind: "empty" }
  | { kind: "offline" };

type VoiceState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "ready"; room: VoiceRoomResponse }
  | { kind: "blocked"; message: string };

type VoiceAction = "token" | "mic" | "leave" | "end";

type VoiceTokenInfo = Pick<VoiceTokenResponse, "expiresAt" | "serverUrl">;

type RoomInviteState =
  | { kind: "idle" }
  | { friendName: string; kind: "sending" }
  | { friendName: string; kind: "sent" }
  | { kind: "blocked"; message: string };

type ChatRoomInviteState =
  | { kind: "idle" }
  | { friendName: string; kind: "sending" }
  | { friendName: string; kind: "sent" }
  | { kind: "blocked"; message: string };

type AgentCommandDraft = {
  message: string;
  mode: RoomAgentCommandMode;
};

type RoomInvitationsState =
  | { kind: "idle" }
  | { invitations: ProjectRoomInvitationResponse[]; kind: "ready" }
  | { kind: "loading" }
  | { kind: "offline" };

const previewFriends: FriendResponse[] = [
  {
    bubliId: "brand-pm",
    friendUserId: "preview-friend-1",
    name: "브랜드 PM",
  },
  {
    bubliId: "design-partner",
    friendUserId: "preview-friend-2",
    name: "디자인 파트너",
  },
];

const previewFriendRequests: FriendRequestResponse[] = [
  {
    createdAt: "2026-06-30T08:30:00.000Z",
    direction: "RECEIVED",
    id: "preview-friend-request-1",
    receiver: {
      bubliId: workspacePreviewUser.bubliId,
      name: workspacePreviewUser.name,
      userId: workspacePreviewUser.id,
    },
    requester: {
      bubliId: "copy-editor",
      name: "카피 에디터",
      userId: "preview-requester-1",
    },
    status: "PENDING",
  },
  {
    createdAt: "2026-06-30T09:10:00.000Z",
    direction: "SENT",
    id: "preview-friend-request-2",
    receiver: {
      bubliId: "motion-editor",
      name: "모션 에디터",
      userId: "preview-search-friend-1",
    },
    requester: {
      bubliId: workspacePreviewUser.bubliId,
      name: workspacePreviewUser.name,
      userId: workspacePreviewUser.id,
    },
    status: "PENDING",
  },
];

// 번역 함수 시그니처. 모듈 레벨 헬퍼에 t를 넘길 때 사용한다.
type Translate = (key: MessageKey) => string;

// value는 메시지 본문에 삽입되어 전송되는 로직 문자열이므로 번역하지 않는다.
const emoticonTokens: Array<{ labelKey: MessageKey; value: string }> = [
  { labelKey: "chat.emoticon.like", value: "[좋아요]" },
  { labelKey: "chat.emoticon.ok", value: "[확인]" },
  { labelKey: "chat.emoticon.laugh", value: "[웃음]" },
  { labelKey: "chat.emoticon.cheer", value: "[응원]" },
  { labelKey: "chat.emoticon.wait", value: "[잠시만요]" },
];

function roomTypeLabel(room: ChatRoomResponse, t: Translate) {
  if (room.chatType === "GROUP") return t("chat.roomType.group");
  return room.chatType === "ROOM" ? t("chat.roomType.room") : t("chat.roomType.direct");
}

function updatedLabel(room: ChatRoomResponse, t: Translate) {
  const updatedAt = new Date(room.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return t("chat.room.beforeActivity");

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(updatedAt);
}

function messageText(message: ChatMessageResponse, t: Translate) {
  const body = message.body;
  const text = body.text ?? body.message ?? body.content;

  if (typeof text === "string" && text.trim()) return text;
  if (message.messageType === "AGENT_COMMAND") return t("chat.message.agentCommand");
  if (message.messageType === "AGENT_RESPONSE") return t("chat.message.agentResponse");
  if (message.messageType === "FILE") return t("chat.message.file");
  return t("chat.message.default");
}

function messageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function compactDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(date);
}

function initialOf(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "B";
}

function voiceParticipantStatusLabel(status: VoiceParticipantResponse["status"], t: Translate) {
  if (status === "JOINED") return t("chat.participant.joined");
  if (status === "LEFT") return t("chat.participant.left");
  return t("chat.participant.disconnected");
}

function parseBubliCommand(text: string): AgentCommandDraft | null {
  const match = text.trim().match(/^\/bubli(?:\s+(.+))?$/i);
  if (!match) return null;

  const message = match[1]?.trim() || "현재 프로젝트룸 맥락을 기준으로 도와줘";
  const normalized = message.toLowerCase();
  const mode: RoomAgentCommandMode =
    /^(정리|요약|summary|summarize)\b/.test(normalized)
      ? "SUMMARIZE"
      : /^(todo|할일|작업|질문|제안|검토|suggest|proposal)\b/.test(normalized)
        ? "SUGGEST"
        : "ANSWER";

  return { message, mode };
}

function preferredRoomId(rooms: ChatRoomResponse[], roomId: string | null, mode: string | null) {
  if (roomId) {
    return rooms.find((room) => room.roomId === roomId)?.id ?? null;
  }

  if (mode === "direct") {
    return rooms.find((room) => room.chatType === "DIRECT")?.id ?? null;
  }

  if (mode === "room") {
    return rooms.find((room) => room.chatType === "ROOM")?.id ?? null;
  }

  return rooms[0]?.id ?? null;
}

function ChatPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const queryRoomId = searchParams.get("roomId");
  const queryMode = searchParams.get("mode");
  const [roomsState, setRoomsState] = useState<RoomsState>({ kind: "loading" });
  const [messagesState, setMessagesState] = useState<MessagesState>({ kind: "idle" });
  const [socialState, setSocialState] = useState<SocialState>({ kind: "loading" });
  const [profileState, setProfileState] = useState<ProfileState>({ kind: "loading" });
  const [friendSearchState, setFriendSearchState] = useState<FriendSearchState>({ kind: "idle" });
  const [voiceState, setVoiceState] = useState<VoiceState>({ kind: "idle" });
  const [voiceAction, setVoiceAction] = useState<VoiceAction | null>(null);
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [copiedBubliId, setCopiedBubliId] = useState(false);
  const [voiceExpanded, setVoiceExpanded] = useState(false);
  const [voiceMicMuted, setVoiceMicMuted] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [voiceTokenInfo, setVoiceTokenInfo] = useState<VoiceTokenInfo | null>(null);
  const [roomInviteState, setRoomInviteState] = useState<RoomInviteState>({ kind: "idle" });
  const [chatRoomInviteState, setChatRoomInviteState] = useState<ChatRoomInviteState>({ kind: "idle" });
  const [roomInvitationsState, setRoomInvitationsState] = useState<RoomInvitationsState>({ kind: "idle" });
  const [busyFriendUserId, setBusyFriendUserId] = useState<string | null>(null);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [composerActive, setComposerActive] = useState(false);
  const [selectedAttachmentName, setSelectedAttachmentName] = useState<string | null>(null);
  const [emoticonOpen, setEmoticonOpen] = useState(false);
  const [friendAddOpen, setFriendAddOpen] = useState(false);
  const [newRoomPickerOpen, setNewRoomPickerOpen] = useState(false);
  const [groupRoomName, setGroupRoomName] = useState("");
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [agentCommandNotice, setAgentCommandNotice] = useState<string | null>(null);
  const [roomCreateNotice, setRoomCreateNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const friendSearchInputRef = useRef<HTMLInputElement | null>(null);

  const activeChatRoomId = useMemo(() => {
    if (roomsState.kind !== "ready") return null;
    if (selectedChatRoomId) return selectedChatRoomId;
    if (queryRoomId) return preferredRoomId(roomsState.rooms, queryRoomId, queryMode);
    return preferredRoomId(roomsState.rooms, queryRoomId, queryMode);
  }, [queryMode, queryRoomId, roomsState, selectedChatRoomId]);

  const selectedRoom = useMemo(() => {
    if (roomsState.kind !== "ready") return null;
    return roomsState.rooms.find((room) => room.id === activeChatRoomId) ?? null;
  }, [activeChatRoomId, roomsState]);
  const isProjectRoomScoped = Boolean(queryRoomId);
  const isProjectRoomMode = queryMode !== "direct";
  const roomMode = selectedRoom?.chatType === "DIRECT" || selectedRoom?.chatType === "GROUP" || queryMode === "direct" ? "direct" : "room";
  const visibleRooms = useMemo(() => {
    if (roomsState.kind !== "ready") return [];
    if (roomMode === "direct") return roomsState.rooms.filter((room) => room.chatType === "DIRECT" || room.chatType === "GROUP");
    if (queryRoomId) return roomsState.rooms.filter((room) => room.roomId === queryRoomId);
    return roomsState.rooms.filter((room) => room.chatType === "ROOM");
  }, [queryRoomId, roomMode, roomsState]);
  const pendingFriendRequests = useMemo(
    () => (socialState.kind === "ready" ? socialState.requests.filter((request) => request.status === "PENDING") : []),
    [socialState],
  );
  const receivedFriendRequests = useMemo(
    () => pendingFriendRequests.filter((request) => request.direction === "RECEIVED"),
    [pendingFriendRequests],
  );
  const sentFriendRequests = useMemo(
    () => pendingFriendRequests.filter((request) => request.direction === "SENT"),
    [pendingFriendRequests],
  );
  const roomConversationCount = roomsState.kind === "ready" ? roomsState.rooms.filter((room) => room.chatType === "ROOM").length : 0;
  const directConversationCount = roomsState.kind === "ready" ? roomsState.rooms.filter((room) => room.chatType === "DIRECT").length : 0;
  const friendCount = socialState.kind === "ready" ? socialState.friends.length : directConversationCount;
  const pendingFriendRequestCount = pendingFriendRequests.length;
  const selectedGroupFriendCount = selectedGroupMemberIds.length;
  const currentUser = profileState.kind === "ready" ? profileState.user : null;
  const myBubliId = currentUser?.bubliId ?? "";
  const activeProjectRoomId = queryRoomId ?? getActiveProjectRoomId();
  const selectedProjectRoomId = selectedRoom?.chatType === "ROOM" && selectedRoom.roomId ? selectedRoom.roomId : activeProjectRoomId;
  const selectedAgentRoomId = selectedRoom?.chatType === "ROOM" && selectedRoom.roomId ? selectedRoom.roomId : null;
  const selectedProjectRoomName =
    selectedRoom?.chatType === "ROOM" ? selectedRoom.name?.replace(/\s*대화$/, "") ?? getActiveProjectRoomLabel() ?? t("chat.room.fallbackName") : getActiveProjectRoomLabel();
  const pendingAgentCommand = useMemo(() => parseBubliCommand(draft), [draft]);
  const inviteTargetLabel = selectedProjectRoomId ? selectedProjectRoomName ?? t("chat.label.currentRoom") : t("chat.label.selectRoomNeeded");
  const pendingRoomInvitations = roomInvitationsState.kind === "ready" ? roomInvitationsState.invitations.filter((invitation) => invitation.status === "PENDING") : [];
  const activeVoiceRoom = voiceState.kind === "ready" && voiceState.room.status === "OPEN" ? voiceState.room : null;
  const voiceParticipants = useMemo<VoiceParticipantResponse[]>(() => {
    if (voiceState.kind === "ready") {
      return voiceState.room.participants.map((participant) => ({
        ...participant,
        userName: participant.userName ?? participant.name ?? t("chat.participant.fallbackName"),
      }));
    }

    return [];
  }, [t, voiceState]);

  const loadRooms = useCallback(async () => {
    setRoomsState({ kind: "loading" });

    try {
      const page = await chatApi.listRooms();
      setRoomsState({ kind: "ready", rooms: page.items });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setRoomsState({ kind: "auth" });
        return;
      }
      if (shouldUseWorkspacePreviewData()) {
        const storedRoomId = getActiveProjectRoomId();
        setRoomsState({
          kind: "ready",
          rooms: workspacePreviewChatRoomsFor(queryRoomId, storedRoomId === queryRoomId ? getActiveProjectRoomLabel() : null),
        });
        return;
      }
      setRoomsState({ kind: "offline" });
    }
  }, [queryRoomId]);

  const loadMessages = useCallback(async (chatRoomId: string) => {
    setMessagesState({ kind: "loading" });

    try {
      const page = await chatApi.getMessages(chatRoomId, { size: 40 });
      setMessagesState({ kind: "ready", messages: [...page.items].sort((a, b) => a.roomSequence - b.roomSequence) });
    } catch {
      if (shouldUseWorkspacePreviewData()) {
        setMessagesState({ kind: "ready", messages: workspacePreviewChatMessages(chatRoomId) });
        return;
      }
      setMessagesState({ kind: "offline" });
    }
  }, []);

  const loadSocial = useCallback(async () => {
    setSocialState({ kind: "loading" });

    const [friends, requests] = await Promise.allSettled([friendApi.listFriends(), friendApi.listRequests()]);

    if (friends.status === "rejected" && requests.status === "rejected") {
      if (shouldUseWorkspacePreviewData()) {
        setSocialState({ friends: previewFriends, kind: "ready", requests: previewFriendRequests });
        return;
      }
      setSocialState({ kind: "offline" });
      return;
    }

    setSocialState({
      friends: friends.status === "fulfilled" ? friends.value : [],
      kind: "ready",
      requests: requests.status === "fulfilled" ? requests.value : [],
    });
  }, []);

  const loadRoomInvitations = useCallback(async () => {
    if (!selectedProjectRoomId) {
      setRoomInvitationsState({ kind: "idle" });
      return;
    }

    setRoomInvitationsState({ kind: "loading" });

    try {
      const page = await projectRoomApi.getInvitations(selectedProjectRoomId);
      setRoomInvitationsState({ invitations: page.items, kind: "ready" });
    } catch {
      setRoomInvitationsState({ kind: "offline" });
    }
  }, [selectedProjectRoomId]);

  const loadProfile = useCallback(async () => {
    setProfileState({ kind: "loading" });

    try {
      const user = await authApi.getMe();
      setProfileState({ kind: "ready", user });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setProfileState({ kind: "offline" });
        return;
      }
      if (shouldUseWorkspacePreviewData()) {
        setProfileState({ kind: "ready", user: workspacePreviewUser });
        return;
      }
      setProfileState({ kind: "offline" });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRooms();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRooms]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSocial();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSocial]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRoomInvitations();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRoomInvitations]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSelectedChatRoomId(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [queryMode, queryRoomId]);

  useEffect(() => {
    if (!activeChatRoomId) return;

    const timeoutId = window.setTimeout(() => {
      void loadMessages(activeChatRoomId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeChatRoomId, loadMessages]);

  useEffect(() => {
    if (!selectedRoom?.roomId || selectedRoom.chatType !== "ROOM") return;
    setActiveProjectRoomId(selectedRoom.roomId, selectedRoom.name?.replace(/\s*대화$/, "") ?? t("chat.room.fallbackName"));
  }, [currentUser, selectedRoom, t]);

  function selectChatRoom(room: ChatRoomResponse) {
    setSelectedChatRoomId(room.id);
    setVoiceState({ kind: "idle" });
    setVoiceAction(null);
    setVoiceMicMuted(false);
    setVoiceNotice(null);
    setVoiceTokenInfo(null);
    if (room.chatType === "ROOM" && room.roomId) {
      setActiveProjectRoomId(room.roomId, room.name?.replace(/\s*대화$/, "") ?? t("chat.room.fallbackName"));
    }
  }

  const openDirectRoom = useCallback(
    async (friend: FriendResponse) => {
      if (roomsState.kind !== "ready") return;

      const existingRoom = roomsState.rooms.find((room) => room.chatType === "DIRECT" && room.name?.includes(friend.name));

      if (existingRoom) {
        selectChatRoom(existingRoom);
        return;
      }

      try {
        const room = await chatApi.getOrCreateDirectRoom({ targetUserId: friend.friendUserId });
        setRoomsState({ kind: "ready", rooms: [room, ...roomsState.rooms.filter((item) => item.id !== room.id)] });
        setSelectedChatRoomId(room.id);
        setNewRoomPickerOpen(false);
      } catch {
        setSocialState({ kind: "offline" });
      }
    },
    [roomsState],
  );

  const createProjectChatRoom = useCallback(async () => {
    if (roomsState.kind !== "ready") return;

    if (!selectedProjectRoomId) {
      setRoomCreateNotice(t("chat.notice.selectRoomFirst"));
      setNewRoomPickerOpen(false);
      return;
    }

    setSending(true);
    setRoomCreateNotice(null);

    try {
      const room = await chatApi.createProjectRoomChatRoom({ roomId: selectedProjectRoomId });
      setRoomsState({ kind: "ready", rooms: [room, ...roomsState.rooms.filter((item) => item.id !== room.id)] });
      setSelectedChatRoomId(room.id);
      setNewRoomPickerOpen(false);
      if (room.roomId) setActiveProjectRoomId(room.roomId, room.name?.replace(/\s*대화$/, "") ?? selectedProjectRoomName ?? t("chat.room.fallbackName"));
      setRoomCreateNotice(t("chat.notice.roomChatCreated"));
    } catch {
      if (shouldUseWorkspacePreviewData()) {
        const previewRooms = workspacePreviewChatRoomsFor(selectedProjectRoomId, selectedProjectRoomName);
        const room = previewRooms.find((item) => item.roomId === selectedProjectRoomId);
        setRoomsState({ kind: "ready", rooms: previewRooms });
        if (room) setSelectedChatRoomId(room.id);
        setNewRoomPickerOpen(false);
        setRoomCreateNotice(t("chat.notice.roomChatCreated"));
        return;
      }
      setRoomCreateNotice(t("chat.notice.roomChatFailed"));
    } finally {
      setSending(false);
    }
  }, [roomsState, selectedProjectRoomId, selectedProjectRoomName, t]);

  const toggleGroupMember = useCallback((friendUserId: string) => {
    setSelectedGroupMemberIds((current) =>
      current.includes(friendUserId) ? current.filter((memberId) => memberId !== friendUserId) : [...current, friendUserId],
    );
  }, []);

  const createGroupRoom = useCallback(async () => {
    if (roomsState.kind !== "ready" || selectedGroupMemberIds.length === 0) return;

    const fallbackName =
      socialState.kind === "ready"
        ? socialState.friends
            .filter((friend) => selectedGroupMemberIds.includes(friend.friendUserId))
            .map((friend) => friend.name)
            .slice(0, 3)
            .join(", ")
        : "";
    const name = groupRoomName.trim() || (fallbackName ? t("chat.groupNameSuffix", { name: fallbackName }) : t("chat.newGroupFallback"));

    setSending(true);
    setChatRoomInviteState({ kind: "idle" });

    try {
      const room = await chatApi.createGroupRoom({
        memberUserIds: selectedGroupMemberIds,
        name,
      });
      setRoomsState({ kind: "ready", rooms: [room, ...roomsState.rooms.filter((item) => item.id !== room.id)] });
      setSelectedChatRoomId(room.id);
      setNewRoomPickerOpen(false);
      setGroupRoomName("");
      setSelectedGroupMemberIds([]);
    } catch {
      setChatRoomInviteState({ kind: "blocked", message: t("chat.notice.groupCreateFailed") });
    } finally {
      setSending(false);
    }
  }, [groupRoomName, roomsState, selectedGroupMemberIds, socialState, t]);

  const inviteFriendToChatRoom = useCallback(
    async (friend: FriendResponse) => {
      if (!selectedRoom || selectedRoom.chatType !== "GROUP") {
        setChatRoomInviteState({ kind: "blocked", message: t("chat.notice.chatInviteOnlyGroup") });
        return;
      }

      setChatRoomInviteState({ friendName: friend.name, kind: "sending" });

      try {
        const room = await chatApi.inviteMembers(selectedRoom.id, {
          memberUserIds: [friend.friendUserId],
        });
        setRoomsState((current) =>
          current.kind === "ready" ? { kind: "ready", rooms: current.rooms.map((item) => (item.id === room.id ? room : item)) } : current,
        );
        setChatRoomInviteState({ friendName: friend.name, kind: "sent" });
      } catch {
        setChatRoomInviteState({ kind: "blocked", message: t("chat.notice.chatInviteFailed") });
      }
    },
    [selectedRoom, t],
  );

  const deleteFriend = useCallback(
    async (friend: FriendResponse) => {
      if (socialState.kind !== "ready" || busyFriendUserId) return;

      setBusyFriendUserId(friend.friendUserId);
      try {
        await friendApi.deleteFriend(friend.friendUserId);
        await loadSocial();
      } catch {
        setSocialState({ kind: "offline" });
      } finally {
        setBusyFriendUserId(null);
      }
    },
    [busyFriendUserId, loadSocial, socialState],
  );

  const inviteFriendToRoom = useCallback(
    async (friend: FriendResponse) => {
      if (!selectedProjectRoomId) {
        setRoomInviteState({ kind: "blocked", message: t("chat.notice.roomInviteOnlyRoom") });
        return;
      }

      setRoomInviteState({ friendName: friend.name, kind: "sending" });

      try {
        await projectRoomApi.createInvitation(selectedProjectRoomId, {
          inviteeUserId: friend.friendUserId,
          role: "MEMBER",
        });
        setRoomInviteState({ friendName: friend.name, kind: "sent" });
        await loadRoomInvitations();
      } catch {
        setRoomInviteState({ kind: "blocked", message: t("chat.notice.roomInviteFailed") });
      }
    },
    [loadRoomInvitations, selectedProjectRoomId, t],
  );

  const cancelRoomInvitation = useCallback(
    async (invitation: ProjectRoomInvitationResponse) => {
      if (busyInvitationId) return;

      setBusyInvitationId(invitation.id);
      try {
        await projectRoomApi.cancelInvitation(invitation.id);
        await loadRoomInvitations();
      } catch {
        setRoomInvitationsState({ kind: "offline" });
      } finally {
        setBusyInvitationId(null);
      }
    },
    [busyInvitationId, loadRoomInvitations],
  );

  const respondFriendRequest = useCallback(
    async (request: FriendRequestResponse, action: "accept" | "reject") => {
      if (socialState.kind !== "ready") return;

      try {
        if (action === "accept") {
          await friendApi.acceptRequest(request.id);
        } else {
          await friendApi.rejectRequest(request.id);
        }
        await loadSocial();
      } catch {
        setSocialState({ kind: "offline" });
      }
    },
    [loadSocial, socialState],
  );

  const copyMyBubliId = useCallback(async () => {
    if (!myBubliId) return;

    try {
      await navigator.clipboard.writeText(myBubliId);
      setCopiedBubliId(true);
      window.setTimeout(() => setCopiedBubliId(false), 1600);
    } catch {
      setCopiedBubliId(false);
    }
  }, [myBubliId]);

  const searchFriend = useCallback(async () => {
    const query = friendSearchQuery.trim().replace(/^@/, "");
    if (!query) {
      setFriendSearchState({ kind: "idle" });
      return;
    }

    setFriendSearchState({ kind: "searching" });

    try {
      const results = await friendApi.searchByBubliId(query);
      setFriendSearchState(results.length > 0 ? { kind: "ready", results } : { kind: "empty" });
    } catch {
      setFriendSearchState({ kind: "offline" });
    }
  }, [friendSearchQuery]);

  const sendFriendRequest = useCallback(
    async (target: FriendSearchResponse) => {
      if (socialState.kind !== "ready") return;

      try {
        await friendApi.sendRequest({ bubliId: target.bubliId });
        setFriendSearchState({ kind: "sent", targetName: target.name });
        await loadSocial();
      } catch {
        setFriendSearchState({ kind: "offline" });
      }
    },
    [loadSocial, socialState],
  );

  const startVoice = useCallback(async () => {
    if (!selectedRoom?.roomId) {
      setVoiceState({
        kind: "blocked",
        message: t("chat.notice.voiceOnlyRoom"),
      });
      return;
    }

    setVoiceState({ kind: "starting" });
    setVoiceAction(null);
    setVoiceMicMuted(false);
    setVoiceNotice(null);
    setVoiceTokenInfo(null);

    try {
      const room = await voiceApi.createRoom({ roomId: selectedRoom.roomId });
      setVoiceState({ kind: "ready", room });
      setVoiceExpanded(true);
      setVoiceNotice(t("chat.notice.voiceOpened"));
    } catch {
      setVoiceState({ kind: "blocked", message: t("chat.notice.voiceStartFailed") });
    }
  }, [selectedRoom, t]);

  const requestVoiceToken = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    setVoiceAction("token");
    try {
      const token = await voiceApi.getToken(activeVoiceRoom.id);
      setVoiceTokenInfo({
        expiresAt: token.expiresAt,
        serverUrl: token.serverUrl,
      });
      setVoiceNotice(t("chat.notice.tokenReceived"));
    } catch {
      setVoiceNotice(t("chat.notice.tokenFailed"));
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, t, voiceAction]);

  const toggleVoiceMic = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    const nextMuted = !voiceMicMuted;
    const nextMicStatus = nextMuted ? "MUTED" : "UNMUTED";
    setVoiceAction("mic");

    try {
      await voiceApi.updateMicStatus(activeVoiceRoom.id, { micStatus: nextMicStatus });
      setVoiceMicMuted(nextMuted);
      setVoiceState((state) => {
        if (state.kind !== "ready" || !currentUser) return state;

        return {
          kind: "ready",
          room: {
            ...state.room,
            participants: state.room.participants.map((participant) =>
              participant.userId === currentUser.id ? { ...participant, micStatus: nextMicStatus } : participant,
            ),
          },
        };
      });
      setVoiceNotice(nextMuted ? t("chat.notice.micOff") : t("chat.notice.micOn"));
    } catch {
      setVoiceNotice(t("chat.notice.micFailed"));
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, currentUser, t, voiceAction, voiceMicMuted]);

  const leaveVoice = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    setVoiceAction("leave");
    try {
      const room = await voiceApi.leave(activeVoiceRoom.id);
      setVoiceState({ kind: "ready", room });
      setVoiceNotice(t("chat.notice.voiceLeft"));
    } catch {
      setVoiceNotice(t("chat.notice.voiceLeaveFailed"));
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, t, voiceAction]);

  const endVoice = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    setVoiceAction("end");
    try {
      const room = await voiceApi.end(activeVoiceRoom.id);
      setVoiceState({ kind: "ready", room });
      setVoiceNotice(t("chat.notice.voiceEnded"));
    } catch {
      setVoiceNotice(t("chat.notice.voiceEndFailed"));
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, t, voiceAction]);

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!activeChatRoomId || (!text && !selectedAttachmentName)) return;
    const agentCommand = parseBubliCommand(text);

    if (agentCommand) {
      if (!selectedAgentRoomId) {
        setComposerActive(true);
        setAgentCommandNotice(t("chat.notice.agentOnlyRoom"));
        return;
      }

      setSending(true);
      setAgentCommandNotice(t("chat.notice.agentSending"));

      try {
        await chatApi.runRoomAgentCommand(selectedAgentRoomId, {
          clientMessageId: crypto.randomUUID(),
          message: agentCommand.message,
          mode: agentCommand.mode,
          resourceIds: [],
        });
        setDraft("");
        setSelectedAttachmentName(null);
        setEmoticonOpen(false);
        await loadMessages(activeChatRoomId);
        setComposerActive(true);
        setAgentCommandNotice(t("chat.notice.agentSent"));
      } catch {
        setAgentCommandNotice(t("chat.notice.agentFailed"));
      } finally {
        setSending(false);
      }
      return;
    }

    const messageType = selectedAttachmentName && !text ? "FILE" : "TEXT";
    const messageBody = selectedAttachmentName
      ? {
          attachmentName: selectedAttachmentName,
          text: text || t("chat.attachPrefix", { name: selectedAttachmentName }),
        }
      : { text };

    setSending(true);
    setAgentCommandNotice(null);

    try {
      await chatApi.sendMessage(activeChatRoomId, {
        body: messageBody,
        clientMessageId: crypto.randomUUID(),
        messageType,
      });
      setDraft("");
      setSelectedAttachmentName(null);
      setEmoticonOpen(false);
      await loadMessages(activeChatRoomId);
    } catch {
      setMessagesState({ kind: "offline" });
    } finally {
      setSending(false);
    }
  }, [activeChatRoomId, draft, loadMessages, selectedAgentRoomId, selectedAttachmentName, t]);

  return (
    <section className="workspace-route" aria-labelledby="chat-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="chat-title">{t("chat.title")}</h1>
        </div>
        <nav className="workspace-route__mode-tabs" aria-label={t("chat.tabs.aria")}>
          <Link className={queryMode !== "direct" ? "is-active" : ""} href={queryRoomId ? `/app/chat?roomId=${queryRoomId}&mode=room` : "/app/chat?mode=room"}>
            {t("chat.tabs.projectRoom")}
          </Link>
          <Link className={queryMode === "direct" ? "is-active" : ""} href="/app/chat?mode=direct">
            {t("chat.tabs.direct")}
          </Link>
        </nav>
      </header>

      {roomsState.kind === "loading" ? <GlassPanel className="workspace-route__panel">{t("chat.panel.loading")}</GlassPanel> : null}
      {roomsState.kind === "auth" ? (
        <GlassPanel className="workspace-route__panel">
          <strong>{t("chat.panel.authTitle")}</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            {t("common.login")}
          </Link>
        </GlassPanel>
      ) : null}
      {roomsState.kind === "offline" ? (
        <GlassPanel className="workspace-route__panel">
          <strong>{t("chat.panel.offlineTitle")}</strong>
          <span>{t("chat.panel.offlineBody")}</span>
        </GlassPanel>
      ) : null}

      {roomsState.kind === "ready" && roomsState.rooms.length === 0 ? (
        <GlassPanel className="workspace-route__panel">
          <strong>{t("chat.panel.emptyTitle")}</strong>
          <Link className="bubli-button bubli-button--primary" href="/app/project-rooms">
            {t("chat.panel.viewProjectRooms")}
          </Link>
        </GlassPanel>
      ) : null}

      {roomsState.kind === "ready" && roomsState.rooms.length > 0 ? (
        <section className="workspace-route__chat-overview" aria-label={t("chat.overview.aria")}>
          <article>
            <MessageCircle size={17} strokeWidth={2} aria-hidden="true" />
            <div>
              <strong>{t("chat.overview.roomChats")}</strong>
              <span>{t("chat.overview.roomCount", { count: roomConversationCount })}</span>
            </div>
          </article>
          <article>
            <UsersRound size={17} strokeWidth={2} aria-hidden="true" />
            <div>
              <strong>{t("chat.overview.direct")}</strong>
              <span>{t("chat.overview.directSummary", { count: friendCount, requests: pendingFriendRequestCount })}</span>
            </div>
          </article>
          <article>
            <Phone size={17} strokeWidth={2} aria-hidden="true" />
            <div>
              <strong>{t("chat.overview.voice")}</strong>
              <span>{selectedRoom?.chatType === "ROOM" ? t("chat.overview.voiceFromRoom") : t("chat.overview.voicePriority")}</span>
            </div>
          </article>
        </section>
      ) : null}

      {roomsState.kind === "ready" ? (
        <div className="workspace-route__chat-quick-actions" aria-label={t("chat.quick.aria")}>
          <button
            className="workspace-route__quick-button"
            onClick={() => {
              if (isProjectRoomMode) {
                void createProjectChatRoom();
                return;
              }
              setRoomCreateNotice(null);
              setNewRoomPickerOpen((open) => !open);
              setFriendAddOpen(false);
            }}
            type="button"
          >
            {t("chat.quick.create")}
          </button>
          {roomCreateNotice ? <span className="workspace-route__pending">{roomCreateNotice}</span> : null}
          <button className="workspace-route__quick-button" disabled={!myBubliId} onClick={() => void copyMyBubliId()} type="button">
            <Copy aria-hidden size={15} strokeWidth={2} />
            {copiedBubliId ? t("chat.quick.idCopied") : t("chat.quick.copyId")}
          </button>
          <button
            className="workspace-route__quick-button"
            onClick={() => {
              friendSearchInputRef.current?.focus();
              friendSearchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            type="button"
          >
            <UserPlus aria-hidden size={15} strokeWidth={2} />
            {t("chat.quick.addFriend")}
          </button>
          <button
            className="workspace-route__quick-button"
            disabled={!selectedProjectRoomId}
            onClick={() => {
              friendSearchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            type="button"
          >
            <UsersRound aria-hidden size={15} strokeWidth={2} />
            {t("chat.quick.inviteCurrentRoom")}
          </button>
        </div>
      ) : null}

      {roomsState.kind === "ready" ? (
        <div className="workspace-route__chat">
          <aside className="workspace-route__section workspace-route__chat-list" aria-label={t("chat.list.aria")}>
            <div className="workspace-route__chat-list-head">
              <strong>{roomMode === "direct" ? t("chat.list.friendChats") : isProjectRoomScoped ? t("chat.list.currentRoomChats") : t("chat.list.roomChats")}</strong>
              <span>{visibleRooms.length}</span>
            </div>
            {visibleRooms.map((room) => {
              const selected = room.id === activeChatRoomId;

              return (
                <button
                  aria-pressed={selected}
                  className={`workspace-route__row workspace-route__chat-room${selected ? " workspace-route__chat-room--active" : ""}`}
                  key={room.id}
                  onClick={() => selectChatRoom(room)}
                  type="button"
                >
                  <span className="workspace-route__dot" aria-hidden="true" />
                  <span className="workspace-route__main">
                    <strong>{room.name ?? roomTypeLabel(room, t)}</strong>
                    <span>{updatedLabel(room, t)}</span>
                  </span>
                  <span className="workspace-route__meta">{roomTypeLabel(room, t)}</span>
                </button>
              );
            })}
            {visibleRooms.length === 0 ? (
              <span className="workspace-route__empty">{roomMode === "direct" ? t("chat.list.emptyDirect") : t("chat.list.emptyRoom")}</span>
            ) : null}
          </aside>

          <GlassPanel className="workspace-route__section workspace-route__thread">
            <div className="workspace-route__section-head">
              <div>
                <strong>{selectedRoom?.name ?? t("chat.thread.defaultName")}</strong>
                {selectedRoom ? (
                  <span>{selectedRoom.chatType === "ROOM" ? t("chat.thread.roomDesc") : selectedRoom.chatType === "GROUP" ? t("chat.thread.groupDesc") : t("chat.thread.directDesc")}</span>
                ) : null}
              </div>
              <div className="workspace-route__thread-actions">
                {selectedRoom?.chatType === "ROOM" && selectedRoom.roomId ? (
                  <Link className="bubli-button" href={`/app/project-rooms/${selectedRoom.roomId}`}>
                    {t("chat.thread.projectRoom")}
                  </Link>
                ) : null}
                {selectedRoom?.chatType === "ROOM" ? (
                  <Button disabled={voiceState.kind === "starting"} loading={voiceState.kind === "starting"} onClick={() => void startVoice()} type="button" variant="quiet">
                    {t("chat.thread.startVoice")}
                  </Button>
                ) : null}
              </div>
            </div>
            {newRoomPickerOpen ? (
              <div className="workspace-route__new-room-panel" aria-label={t("chat.newRoom.aria")}>
                <div>
                  <strong>{t("chat.newRoom.title")}</strong>
                  <span>{t("chat.newRoom.subtitle")}</span>
                </div>
                {socialState.kind === "loading" ? <span className="workspace-route__empty">{t("chat.newRoom.friendsLoading")}</span> : null}
                {socialState.kind === "offline" ? <span className="workspace-route__empty">{t("chat.newRoom.friendsOffline")}</span> : null}
                {socialState.kind === "ready" && socialState.friends.length === 0 ? (
                  <button
                    className="workspace-route__quick-button"
                    onClick={() => {
                      setFriendAddOpen(true);
                      window.setTimeout(() => friendSearchInputRef.current?.focus(), 0);
                    }}
                    type="button"
                  >
                    {t("chat.newRoom.addFriend")}
                  </button>
                ) : null}
                {socialState.kind === "ready" && socialState.friends.length > 0 ? (
                  <>
                    <label className="workspace-route__group-name-field" htmlFor="group-room-name">
                      <span>{t("chat.newRoom.groupName")}</span>
                      <input
                        id="group-room-name"
                        onChange={(event) => setGroupRoomName(event.target.value)}
                        placeholder={t("chat.newRoom.groupNamePlaceholder")}
                        value={groupRoomName}
                      />
                    </label>
                    <div className="workspace-route__new-room-friends">
                      {socialState.friends.map((friend) => {
                        const selected = selectedGroupMemberIds.includes(friend.friendUserId);

                        return (
                          <div className="workspace-route__friend-row workspace-route__group-friend-row" key={friend.friendUserId}>
                            <button aria-pressed={selected} className="workspace-route__group-select" onClick={() => toggleGroupMember(friend.friendUserId)} type="button">
                              {selected ? <Check aria-hidden size={14} strokeWidth={2.2} /> : initialOf(friend.name)}
                            </button>
                            <div>
                              <strong>{friend.name}</strong>
                              <small>{friend.bubliId}</small>
                            </div>
                            <div className="workspace-route__friend-actions">
                              <button onClick={() => void openDirectRoom(friend)} type="button">
                                {t("chat.newRoom.direct")}
                              </button>
                              <button onClick={() => toggleGroupMember(friend.friendUserId)} type="button">
                                {selected ? t("chat.newRoom.deselect") : t("chat.newRoom.selectForGroup")}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="workspace-route__group-create-actions">
                      <span>{t("chat.newRoom.selectedCount", { count: selectedGroupFriendCount })}</span>
                      <Button disabled={selectedGroupFriendCount === 0 || sending} loading={sending} onClick={() => void createGroupRoom()} type="button" variant="primary">
                        {t("chat.newRoom.createGroup")}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            {selectedRoom?.chatType === "ROOM" ? (
              <button
                aria-expanded={voiceExpanded}
                className="workspace-route__voice-status workspace-route__voice-status--interactive"
                onClick={() => setVoiceExpanded((open) => !open)}
                type="button"
              >
                <Phone size={15} strokeWidth={2} aria-hidden="true" />
                <span>{voiceState.kind === "ready" ? t("chat.voice.open") : t("chat.voice.waiting")}</span>
                <span className="workspace-route__voice-stack" aria-label={t("chat.voice.participantsAria", { count: voiceParticipants.length })}>
                  {voiceParticipants.slice(0, 3).map((participant) => (
                    <i data-status={participant.status.toLowerCase()} key={participant.userId}>
                      {initialOf(participant.userName)}
                    </i>
                  ))}
                </span>
              </button>
            ) : null}
            {selectedRoom?.chatType === "ROOM" && voiceState.kind === "blocked" ? <div className="workspace-route__voice-status workspace-route__voice-status--blocked">{voiceState.message}</div> : null}

            {messagesState.kind === "loading" ? <span className="workspace-route__empty">{t("chat.messages.loading")}</span> : null}
            {messagesState.kind === "offline" ? <span className="workspace-route__empty">{t("chat.messages.offline")}</span> : null}
            {messagesState.kind === "ready" && messagesState.messages.length === 0 ? (
              <span className="workspace-route__empty">{t("chat.messages.empty")}</span>
            ) : null}

            {messagesState.kind === "ready" && messagesState.messages.length > 0 ? (
              <div className="workspace-route__messages">
                {messagesState.messages.map((message) => {
                  const isMine = Boolean(currentUser?.id && message.sender.id === currentUser.id);
                  const isAgent = message.sender.type === "AGENT";

                  return (
                    <article
                      className={[
                        "workspace-route__message",
                        isMine ? "workspace-route__message--mine" : "",
                        isAgent ? "workspace-route__message--agent" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={message.id}
                    >
                      <div>
                        <strong>{message.sender.name}</strong>
                        <span>{messageTime(message.createdAt)}</span>
                        <span className="workspace-route__message-tools">
                          <button aria-label={t("chat.messages.copy")} onClick={() => void navigator.clipboard.writeText(messageText(message, t))} type="button">
                            <Copy aria-hidden size={13} strokeWidth={2} />
                          </button>
                          <button aria-label={t("chat.messages.more")} type="button">
                            <MoreHorizontal aria-hidden size={13} strokeWidth={2} />
                          </button>
                        </span>
                      </div>
                      <p>{messageText(message, t)}</p>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {selectedRoom ? (
              <form
                className={[
                  "workspace-route__composer",
                  composerActive || draft || selectedAttachmentName ? "workspace-route__composer--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
              >
                <div className="workspace-route__composer-main">
                  <button aria-label={t("chat.composer.attach")} onClick={() => fileInputRef.current?.click()} type="button">
                    <Paperclip aria-hidden size={17} strokeWidth={2} />
                  </button>
                  <button aria-label={t("chat.composer.voiceParticipants")} onClick={() => setVoiceExpanded((open) => !open)} type="button">
                    <Mic aria-hidden size={17} strokeWidth={2} />
                  </button>
                  <input
                    ref={fileInputRef}
                    className="workspace-route__composer-file"
                    onChange={(event) => {
                      setSelectedAttachmentName(event.target.files?.[0]?.name ?? null);
                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                  <textarea
                    aria-label={t("chat.composer.message")}
                    onBlur={() => {
                      if (!draft.trim() && !selectedAttachmentName) setComposerActive(false);
                    }}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      if (agentCommandNotice) setAgentCommandNotice(null);
                    }}
                    onFocus={() => setComposerActive(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder={t("chat.composer.placeholder")}
                    rows={1}
                    value={draft}
                  />
                  <button aria-expanded={emoticonOpen} aria-label={t("chat.composer.emoticon")} onClick={() => setEmoticonOpen((open) => !open)} type="button">
                    <Smile aria-hidden size={17} strokeWidth={2} />
                  </button>
                  <Button disabled={(!draft.trim() && !selectedAttachmentName) || sending} loading={sending} type="submit" variant="primary">
                    <Send aria-hidden size={15} strokeWidth={1.9} />
                  </Button>
                </div>
                {composerActive || draft || selectedAttachmentName ? (
                  <div className="workspace-route__composer-tools">
                    {selectedAttachmentName ? (
                      <button className="workspace-route__composer-chip" onClick={() => setSelectedAttachmentName(null)} type="button">
                        {t("chat.composer.attachChip", { name: selectedAttachmentName })}
                        <X aria-hidden size={13} strokeWidth={2} />
                      </button>
                    ) : agentCommandNotice ? (
                      <span className="workspace-route__agent-notice" role="status">
                        {agentCommandNotice}
                      </span>
                    ) : pendingAgentCommand ? (
                      <span className="workspace-route__agent-command-hint">
                        {t("chat.composer.agentQuestion")} · {pendingAgentCommand.mode === "SUMMARIZE" ? t("chat.composer.agentSummarize") : pendingAgentCommand.mode === "SUGGEST" ? t("chat.composer.agentSuggest") : t("chat.composer.agentAnswer")}
                      </span>
                    ) : (
                      <span>{t("chat.composer.hint")}</span>
                    )}
                    {emoticonOpen ? (
                      <div className="workspace-route__emoticons" aria-label={t("chat.composer.emoticonAria")}>
                        {emoticonTokens.map((token) => (
                          <button
                            key={token.value}
                            onClick={() => {
                              setDraft((current) => `${current}${current ? " " : ""}${token.value}`);
                              setEmoticonOpen(false);
                              setComposerActive(true);
                            }}
                            type="button"
                          >
                            {t(token.labelKey)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </form>
            ) : null}
          </GlassPanel>

          <aside className="workspace-route__section workspace-route__chat-social" aria-label={t("chat.social.aria")}>
            <button
              aria-expanded={friendAddOpen}
              className="bubli-button bubli-button--quiet workspace-route__friend-add-control"
              onClick={() => {
                setFriendAddOpen((open) => !open);
                window.setTimeout(() => friendSearchInputRef.current?.focus(), 0);
              }}
              type="button"
            >
              {t("chat.social.addFriend")}
            </button>

            {friendAddOpen ? (
              <div className="workspace-route__social-flow" aria-label={t("chat.social.addFlowAria")}>
                <section className="workspace-route__social-card workspace-route__social-card--code">
                  <span className="workspace-route__social-kicker">
                    <AtSign aria-hidden size={14} strokeWidth={2} />
                    {t("chat.social.myBubliId")}
                  </span>
                  <div className="workspace-route__my-code">
                    <div>
                      <small>{t("chat.social.forAdding")}</small>
                      <strong>{myBubliId || t("chat.social.loginToShow")}</strong>
                    </div>
                    <button aria-label={t("chat.social.copyMyId")} disabled={!myBubliId} onClick={() => void copyMyBubliId()} type="button">
                      {copiedBubliId ? <Check aria-hidden size={15} strokeWidth={2.2} /> : <Copy aria-hidden size={15} strokeWidth={2} />}
                      {copiedBubliId ? t("chat.social.copied") : t("chat.social.copy")}
                    </button>
                  </div>
                </section>

                <section className="workspace-route__social-card">
                  <span className="workspace-route__social-kicker">
                    <UserPlus aria-hidden size={14} strokeWidth={2} />
                    {t("chat.social.addFriendKicker")}
                  </span>
                  <form
                    className="workspace-route__friend-search"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void searchFriend();
                    }}
                  >
                    <label htmlFor="friend-id-search">{t("chat.social.searchLabel")}</label>
                    <div>
                      <Search aria-hidden size={16} strokeWidth={2} />
                      <input
                        autoComplete="off"
                        id="friend-id-search"
                        onChange={(event) => {
                          setFriendSearchQuery(event.target.value);
                          if (!event.target.value.trim()) setFriendSearchState({ kind: "idle" });
                        }}
                        placeholder={t("chat.social.searchPlaceholder")}
                        ref={friendSearchInputRef}
                        value={friendSearchQuery}
                      />
                      <button aria-label={t("chat.social.searchAria")} type="submit">
                        {t("chat.social.searchCta")}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            ) : null}

            {friendSearchState.kind === "searching" ? <span className="workspace-route__empty">{t("chat.search.searching")}</span> : null}
            {friendSearchState.kind === "empty" ? <span className="workspace-route__empty">{t("chat.search.empty")}</span> : null}
            {friendSearchState.kind === "offline" ? <span className="workspace-route__empty">{t("chat.search.offline")}</span> : null}
            {friendSearchState.kind === "sent" ? <span className="workspace-route__pending">{t("chat.search.sent", { name: friendSearchState.targetName })}</span> : null}
            {friendSearchState.kind === "ready"
              ? friendSearchState.results.slice(0, 3).map((person) => {
                  const alreadyFriend =
                    socialState.kind === "ready" && socialState.friends.some((friend) => friend.friendUserId === person.userId || friend.bubliId === person.bubliId);

                  return (
                    <div className="workspace-route__friend-result" key={person.userId}>
                      <span aria-hidden="true">{initialOf(person.name)}</span>
                      <div>
                        <strong>{person.name}</strong>
                        <small>{person.bubliId}</small>
                      </div>
                      <button disabled={alreadyFriend} onClick={() => void sendFriendRequest(person)} type="button">
                        {alreadyFriend ? t("chat.search.alreadyFriend") : t("chat.search.sendRequest")}
                      </button>
                    </div>
                  );
                })
              : null}

            <div className="workspace-route__friend-panel" aria-label={t("chat.friends.title")}>
              <div className="workspace-route__chat-list-head">
                <strong>{t("chat.friends.title")}</strong>
                <span>{friendCount}</span>
              </div>
              {socialState.kind === "loading" ? <span className="workspace-route__empty">{t("chat.friends.loading")}</span> : null}
              {socialState.kind === "offline" ? <span className="workspace-route__empty">{t("chat.friends.offline")}</span> : null}
              {socialState.kind === "ready" && socialState.friends.length === 0 ? <span className="workspace-route__empty">{t("chat.friends.empty")}</span> : null}
              {socialState.kind === "ready"
                ? socialState.friends.slice(0, 5).map((friend) => (
                    <article className="workspace-route__friend-row" key={friend.friendUserId}>
                      <span aria-hidden="true">{initialOf(friend.name)}</span>
                      <div>
                        <strong>{friend.name}</strong>
                        <small>{friend.bubliId}</small>
                      </div>
                      <div className="workspace-route__friend-actions">
                        <button onClick={() => void openDirectRoom(friend)} type="button">
                          {t("chat.friends.direct")}
                        </button>
                        {selectedRoom?.chatType === "GROUP" ? (
                          <button disabled={chatRoomInviteState.kind === "sending"} onClick={() => void inviteFriendToChatRoom(friend)} type="button">
                            {chatRoomInviteState.kind === "sending" && chatRoomInviteState.friendName === friend.name ? t("chat.friends.inviting") : t("chat.friends.chatInvite")}
                          </button>
                        ) : null}
                        <button disabled={!selectedProjectRoomId || roomInviteState.kind === "sending"} onClick={() => void inviteFriendToRoom(friend)} type="button">
                          {roomInviteState.kind === "sending" && roomInviteState.friendName === friend.name ? t("chat.friends.sending") : t("chat.friends.roomInvite")}
                        </button>
                        <button disabled={busyFriendUserId === friend.friendUserId} onClick={() => void deleteFriend(friend)} type="button">
                          {busyFriendUserId === friend.friendUserId ? t("chat.friends.deleting") : t("chat.friends.delete")}
                        </button>
                      </div>
                    </article>
                  ))
                : null}
              {roomInviteState.kind === "sending" ? <span className="workspace-route__pending">{t("chat.invite.roomSending", { name: roomInviteState.friendName })}</span> : null}
              {roomInviteState.kind === "sent" ? (
                <span className="workspace-route__pending">
                  {t("chat.invite.roomSent", { name: roomInviteState.friendName, room: selectedProjectRoomName ?? t("chat.room.fallbackName") })}
                </span>
              ) : null}
              {roomInviteState.kind === "blocked" ? <span className="workspace-route__empty">{roomInviteState.message}</span> : null}
              {chatRoomInviteState.kind === "sending" ? <span className="workspace-route__pending">{t("chat.invite.chatSending", { name: chatRoomInviteState.friendName })}</span> : null}
              {chatRoomInviteState.kind === "sent" ? <span className="workspace-route__pending">{t("chat.invite.chatSent", { name: chatRoomInviteState.friendName })}</span> : null}
              {chatRoomInviteState.kind === "blocked" ? <span className="workspace-route__empty">{chatRoomInviteState.message}</span> : null}
              {roomInvitationsState.kind === "loading" ? <span className="workspace-route__empty">{t("chat.invite.listLoading")}</span> : null}
              {roomInvitationsState.kind === "offline" ? <span className="workspace-route__empty">{t("chat.invite.listOffline")}</span> : null}
              {pendingRoomInvitations.length > 0 ? (
                <div className="workspace-route__request-group">
                  <span>{t("chat.invite.pending", { count: pendingRoomInvitations.length })}</span>
                  {pendingRoomInvitations.slice(0, 3).map((invitation) => (
                    <div className="workspace-route__friend-request workspace-route__friend-request--sent" key={invitation.id}>
                      <div>
                        <strong>{invitation.inviteeName ?? invitation.inviteeBubliId ?? invitation.inviteeUserId}</strong>
                        <small>{invitation.inviteeBubliId ?? invitation.role}</small>
                      </div>
                      <button disabled={busyInvitationId === invitation.id} onClick={() => void cancelRoomInvitation(invitation)} type="button">
                        {busyInvitationId === invitation.id ? t("chat.invite.canceling") : t("chat.invite.cancel")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="workspace-route__friend-panel" aria-label={t("chat.requests.title")}>
              <div className="workspace-route__chat-list-head">
                <strong>{t("chat.requests.title")}</strong>
                <span>{pendingFriendRequestCount}</span>
              </div>
              {socialState.kind === "ready" && pendingFriendRequests.length === 0 ? (
                <span className="workspace-route__empty">{t("chat.requests.empty")}</span>
              ) : null}
              {receivedFriendRequests.length > 0 ? (
                <div className="workspace-route__request-group">
                  <span>{t("chat.requests.received", { count: receivedFriendRequests.length })}</span>
                  {receivedFriendRequests.slice(0, 3).map((request) => (
                    <div className="workspace-route__friend-request" key={request.id}>
                      <div>
                        <strong>{request.requester.name}</strong>
                        <small>{request.requester.bubliId}</small>
                      </div>
                      <div>
                        <button onClick={() => void respondFriendRequest(request, "accept")} type="button">
                          {t("chat.requests.accept")}
                        </button>
                        <button onClick={() => void respondFriendRequest(request, "reject")} type="button">
                          {t("chat.requests.reject")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {sentFriendRequests.length > 0 ? (
                <div className="workspace-route__request-group">
                  <span>{t("chat.requests.sent", { count: sentFriendRequests.length })}</span>
                  {sentFriendRequests.slice(0, 3).map((request) => (
                    <div className="workspace-route__friend-request workspace-route__friend-request--sent" key={request.id}>
                      <div>
                        <strong>{request.receiver.name}</strong>
                        <small>{request.receiver.bubliId}</small>
                      </div>
                      <span>{t("chat.requests.waiting")}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="workspace-route__voice-card" aria-label={t("chat.voiceCard.aria")}>
              <div className="workspace-route__chat-list-head">
                <strong>{t("chat.voiceCard.title")}</strong>
                <span>{voiceParticipants.length}</span>
              </div>
              <button
                className="workspace-route__voice-card-main"
                disabled={voiceState.kind === "starting" || Boolean(activeVoiceRoom) || selectedRoom?.chatType !== "ROOM"}
                onClick={() => void startVoice()}
                type="button"
              >
                <Phone aria-hidden size={17} strokeWidth={2} />
                <div>
                  <strong>{selectedRoom?.chatType === "ROOM" ? t("chat.voiceCard.roomVoice") : t("chat.voiceCard.directVoice")}</strong>
                  <small>{activeVoiceRoom ? t("chat.voiceCard.open") : voiceState.kind === "ready" ? t("chat.voiceCard.ended") : selectedRoom?.chatType === "ROOM" ? t("chat.voiceCard.canStart") : t("chat.voiceCard.priority")}</small>
                </div>
              </button>
              <div className="workspace-route__voice-controls" aria-label={t("chat.voiceCard.actionsAria")}>
                <button disabled={!activeVoiceRoom || voiceAction === "token"} onClick={() => void requestVoiceToken()} type="button">
                  <KeyRound aria-hidden size={14} strokeWidth={2} />
                  {voiceAction === "token" ? t("chat.voiceCard.receiving") : t("chat.voiceCard.joinToken")}
                </button>
                <button disabled={!activeVoiceRoom || voiceAction === "mic"} onClick={() => void toggleVoiceMic()} type="button">
                  {voiceMicMuted ? <Mic aria-hidden size={14} strokeWidth={2} /> : <MicOff aria-hidden size={14} strokeWidth={2} />}
                  {voiceAction === "mic" ? t("chat.voiceCard.changing") : voiceMicMuted ? t("chat.voiceCard.micOn") : t("chat.voiceCard.micOff")}
                </button>
                <button disabled={!activeVoiceRoom || voiceAction === "leave"} onClick={() => void leaveVoice()} type="button">
                  <LogOut aria-hidden size={14} strokeWidth={2} />
                  {voiceAction === "leave" ? t("chat.voiceCard.leaving") : t("chat.voiceCard.leave")}
                </button>
                <button disabled={!activeVoiceRoom || voiceAction === "end"} onClick={() => void endVoice()} type="button">
                  <Square aria-hidden size={14} strokeWidth={2} />
                  {voiceAction === "end" ? t("chat.voiceCard.ending") : t("chat.voiceCard.end")}
                </button>
              </div>
              {voiceTokenInfo ? (
                <div className="workspace-route__voice-note">
                  <strong>{t("chat.voiceCard.tokenReady")}</strong>
                  <span>{t("chat.voiceCard.tokenUntil", { url: voiceTokenInfo.serverUrl, time: compactDateTime(voiceTokenInfo.expiresAt) })}</span>
                </div>
              ) : null}
              {voiceNotice ? <div className="workspace-route__voice-note">{voiceNotice}</div> : null}
              {voiceExpanded || voiceState.kind === "ready" ? (
                <div className="workspace-route__voice-people">
                  {voiceParticipants.length > 0 ? voiceParticipants.map((participant, index) => (
                    <div className="workspace-route__voice-person" key={participant.userId}>
                      <span data-status={participant.status.toLowerCase()}>{initialOf(participant.userName)}</span>
                      <div>
                        <strong>{participant.userName}</strong>
                        <small>{index === 0 && participant.status === "JOINED" ? t("chat.voiceCard.speaking") : voiceParticipantStatusLabel(participant.status, t)}</small>
                      </div>
                    </div>
                  )) : <span className="workspace-route__empty">{t("chat.voiceCard.noParticipants")}</span>}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function ChatPageFallback() {
  const { t } = useI18n();
  return <GlassPanel className="workspace-route__panel">{t("chat.panel.loading")}</GlassPanel>;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ChatPageContent />
    </Suspense>
  );
}
