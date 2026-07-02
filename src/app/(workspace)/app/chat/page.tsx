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

const emoticonTokens = [
  { label: "좋아요", value: "[좋아요]" },
  { label: "확인", value: "[확인]" },
  { label: "웃음", value: "[웃음]" },
  { label: "응원", value: "[응원]" },
  { label: "잠시만요", value: "[잠시만요]" },
];

function roomTypeLabel(room: ChatRoomResponse) {
  if (room.chatType === "GROUP") return "그룹";
  return room.chatType === "ROOM" ? "프로젝트룸" : "1:1";
}

function updatedLabel(room: ChatRoomResponse) {
  const updatedAt = new Date(room.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return "활동 전";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(updatedAt);
}

function messageText(message: ChatMessageResponse) {
  const body = message.body;
  const text =
    message.messageType === "AGENT_COMMAND"
      ? body.text ?? body.message ?? body.request ?? body.command ?? body.query ?? body.prompt ?? body.content
      : body.text ?? body.message ?? body.content ?? body.request;

  if (typeof text === "string" && text.trim()) return text;
  if (message.messageType === "AGENT_COMMAND") return "에이전트 명령";
  if (message.messageType === "AGENT_RESPONSE") return "에이전트 응답";
  if (message.messageType === "FILE") return "첨부 자료";
  return "메시지";
}

const agentSectionLabels = ["TODO", "TASK", "REQUIREMENT", "QUESTION", "REVIEW_ITEM"] as const;

function formatAgentMessageText(text: string) {
  let formatted = text.replace(/\r\n/g, "\n").trim();

  for (const label of agentSectionLabels) {
    formatted = formatted.replace(new RegExp(`\\s*${label}:`, "g"), (match, offset) => `${offset === 0 ? "" : "\n\n"}${label}:`);
  }

  formatted = formatted.replace(/:\s*-\s*/g, ":\n- ");
  formatted = formatted.replace(/\s+-\s+/g, "\n- ");
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  return formatted;
}

function displayMessageText(message: ChatMessageResponse) {
  const text = messageText(message);
  const isAgentMessage = message.messageType === "AGENT_RESPONSE" || message.sender.type === "AGENT";
  return isAgentMessage ? formatAgentMessageText(text) : text;
}

function commandText(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  return text.toLowerCase().startsWith("/bubli") ? text : `/bubli ${text}`;
}

function withAgentCommandMessages(messages: ChatMessageResponse[]) {
  const existingCommandKeys = new Set(
    messages
      .filter((message) => message.messageType === "AGENT_COMMAND")
      .map((message) => `${message.chatRoomId}:${message.roomSequence}:${messageText(message)}`),
  );
  const expanded: ChatMessageResponse[] = [];

  for (const message of messages) {
    const requestText = message.messageType === "AGENT_RESPONSE" ? commandText(message.body.request) : null;

    if (requestText) {
      const commandKey = `${message.chatRoomId}:${message.roomSequence - 1}:${requestText}`;

      if (!existingCommandKeys.has(commandKey)) {
        expanded.push({
          body: { text: requestText },
          chatRoomId: message.chatRoomId,
          createdAt: message.createdAt,
          id: `agent-command-${message.id}`,
          messageType: "AGENT_COMMAND",
          resourceId: message.resourceId,
          roomSequence: message.roomSequence - 0.1,
          sender: {
            id: null,
            name: "나",
            type: "USER",
          },
        });
      }
    }

    expanded.push(message);
  }

  return expanded.sort((a, b) => a.roomSequence - b.roomSequence);
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

function voiceParticipantStatusLabel(status: VoiceParticipantResponse["status"]) {
  if (status === "JOINED") return "참여 중";
  if (status === "LEFT") return "나감";
  return "연결 끊김";
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
  const friendListRef = useRef<HTMLDivElement | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  const appendMessage = useCallback((message: ChatMessageResponse) => {
    setMessagesState((current) => {
      if (current.kind !== "ready") {
        return { kind: "ready", messages: [message] };
      }

      if (
        current.messages.some(
          (item) => item.id === message.id || (Boolean(message.clientMessageId) && item.clientMessageId === message.clientMessageId),
        )
      ) {
        return current;
      }

      return {
        kind: "ready",
        messages: [...current.messages, message].sort((a, b) => a.roomSequence - b.roomSequence),
      };
    });
  }, []);

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
    selectedRoom?.chatType === "ROOM" ? selectedRoom.name?.replace(/\s*대화$/, "") ?? getActiveProjectRoomLabel() ?? "프로젝트룸" : getActiveProjectRoomLabel();
  const pendingAgentCommand = useMemo(() => parseBubliCommand(draft), [draft]);
  const inviteTargetLabel = selectedProjectRoomId ? selectedProjectRoomName ?? "현재 프로젝트룸" : "프로젝트룸 선택 필요";
  const pendingRoomInvitations = roomInvitationsState.kind === "ready" ? roomInvitationsState.invitations.filter((invitation) => invitation.status === "PENDING") : [];
  const activeVoiceRoom = voiceState.kind === "ready" && voiceState.room.status === "OPEN" ? voiceState.room : null;
  const voiceParticipants = useMemo<VoiceParticipantResponse[]>(() => {
    if (voiceState.kind === "ready") {
      return voiceState.room.participants.map((participant) => ({
        ...participant,
        userName: participant.userName ?? participant.name ?? "참여자",
      }));
    }

    return [];
  }, [voiceState]);

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
      setMessagesState({ kind: "ready", messages: withAgentCommandMessages([...page.items].sort((a, b) => a.roomSequence - b.roomSequence)) });
    } catch {
      if (shouldUseWorkspacePreviewData()) {
        setMessagesState({ kind: "ready", messages: withAgentCommandMessages(workspacePreviewChatMessages(chatRoomId)) });
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
    setActiveProjectRoomId(selectedRoom.roomId, selectedRoom.name?.replace(/\s*대화$/, "") ?? "프로젝트룸");
  }, [currentUser, selectedRoom]);

  useEffect(() => {
    if (messagesState.kind !== "ready") return;
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [activeChatRoomId, messagesState]);

  function selectChatRoom(room: ChatRoomResponse) {
    setSelectedChatRoomId(room.id);
    setVoiceState({ kind: "idle" });
    setVoiceAction(null);
    setVoiceMicMuted(false);
    setVoiceNotice(null);
    setVoiceTokenInfo(null);
    if (room.chatType === "ROOM" && room.roomId) {
      setActiveProjectRoomId(room.roomId, room.name?.replace(/\s*대화$/, "") ?? "프로젝트룸");
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
      setRoomCreateNotice("프로젝트룸을 먼저 선택하세요.");
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
      if (room.roomId) setActiveProjectRoomId(room.roomId, room.name?.replace(/\s*대화$/, "") ?? selectedProjectRoomName ?? "프로젝트룸");
      setRoomCreateNotice("프로젝트룸 채팅방을 만들었습니다.");
    } catch {
      if (shouldUseWorkspacePreviewData()) {
        const previewRooms = workspacePreviewChatRoomsFor(selectedProjectRoomId, selectedProjectRoomName);
        const room = previewRooms.find((item) => item.roomId === selectedProjectRoomId);
        setRoomsState({ kind: "ready", rooms: previewRooms });
        if (room) setSelectedChatRoomId(room.id);
        setNewRoomPickerOpen(false);
        setRoomCreateNotice("프로젝트룸 채팅방을 만들었습니다.");
        return;
      }
      setRoomCreateNotice("프로젝트룸 채팅방을 만들지 못했습니다. 프로젝트룸 선택이나 서버 상태를 확인하세요.");
    } finally {
      setSending(false);
    }
  }, [roomsState, selectedProjectRoomId, selectedProjectRoomName]);

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
    const name = groupRoomName.trim() || (fallbackName ? `${fallbackName} 그룹` : "새 그룹 채팅");

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
      setChatRoomInviteState({ kind: "blocked", message: "그룹 채팅방을 만들지 못했습니다. 친구 선택이나 서버 상태를 확인하세요." });
    } finally {
      setSending(false);
    }
  }, [groupRoomName, roomsState, selectedGroupMemberIds, socialState]);

  const inviteFriendToChatRoom = useCallback(
    async (friend: FriendResponse) => {
      if (!selectedRoom || selectedRoom.chatType !== "GROUP") {
        setChatRoomInviteState({ kind: "blocked", message: "그룹 채팅방에서 친구를 초대할 수 있습니다." });
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
        setChatRoomInviteState({ kind: "blocked", message: "채팅방에 초대하지 못했습니다. 서버 상태나 권한을 확인하세요." });
      }
    },
    [selectedRoom],
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
        setRoomInviteState({ kind: "blocked", message: "프로젝트룸 대화에서 친구를 초대할 수 있습니다." });
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
        setRoomInviteState({ kind: "blocked", message: "초대를 보내지 못했습니다. 멤버 권한이나 서버 상태를 확인하세요." });
      }
    },
    [loadRoomInvitations, selectedProjectRoomId],
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
        message: "보이스는 프로젝트룸에서 사용할 수 있습니다.",
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
      setVoiceNotice("보이스룸이 열렸습니다. 참여 토큰을 받아 LiveKit 연결을 준비할 수 있습니다.");
    } catch {
      setVoiceState({ kind: "blocked", message: "보이스를 시작하지 못했습니다. 서버 상태를 확인하세요." });
    }
  }, [selectedRoom]);

  const requestVoiceToken = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    setVoiceAction("token");
    try {
      const token = await voiceApi.getToken(activeVoiceRoom.id);
      setVoiceTokenInfo({
        expiresAt: token.expiresAt,
        serverUrl: token.serverUrl,
      });
      setVoiceNotice("참여 토큰을 받았습니다. 실제 음성 연결은 LiveKit 클라이언트 연결 단계에서 사용합니다.");
    } catch {
      setVoiceNotice("참여 토큰을 받지 못했습니다. 보이스 서버 상태를 확인하세요.");
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, voiceAction]);

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
      setVoiceNotice(nextMuted ? "내 마이크를 껐습니다." : "내 마이크를 켰습니다.");
    } catch {
      setVoiceNotice("마이크 상태를 바꾸지 못했습니다.");
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, currentUser, voiceAction, voiceMicMuted]);

  const leaveVoice = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    setVoiceAction("leave");
    try {
      const room = await voiceApi.leave(activeVoiceRoom.id);
      setVoiceState({ kind: "ready", room });
      setVoiceNotice("보이스룸에서 나갔습니다.");
    } catch {
      setVoiceNotice("보이스룸에서 나가지 못했습니다.");
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, voiceAction]);

  const endVoice = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    setVoiceAction("end");
    try {
      const room = await voiceApi.end(activeVoiceRoom.id);
      setVoiceState({ kind: "ready", room });
      setVoiceNotice("보이스룸을 종료했습니다.");
    } catch {
      setVoiceNotice("보이스룸을 종료하지 못했습니다.");
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, voiceAction]);

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!activeChatRoomId || (!text && !selectedAttachmentName)) return;
    const agentCommand = parseBubliCommand(text);

    if (agentCommand) {
      if (!selectedAgentRoomId) {
        setComposerActive(true);
        setAgentCommandNotice("/bubli는 프로젝트룸 대화에서만 사용할 수 있습니다.");
        return;
      }

      const clientMessageId = crypto.randomUUID();
      const optimisticCommandMessage: ChatMessageResponse = {
        body: { text },
        chatRoomId: activeChatRoomId,
        clientMessageId,
        createdAt: new Date().toISOString(),
        id: `local-agent-command-${clientMessageId}`,
        messageType: "AGENT_COMMAND",
        roomSequence:
          messagesState.kind === "ready" ? Math.max(...messagesState.messages.map((message) => message.roomSequence), 0) + 1 : 1,
        sender: {
          id: currentUser?.id ?? null,
          name: currentUser?.name ?? "나",
          type: "USER",
        },
      };

      setSending(true);
      setAgentCommandNotice("에이전트에게 질문을 보내는 중입니다.");
      appendMessage(optimisticCommandMessage);

      try {
        const response = await chatApi.runRoomAgentCommand(selectedAgentRoomId, {
          clientMessageId,
          message: agentCommand.message,
          mode: agentCommand.mode,
          resourceIds: [],
        });
        appendMessage(response.message);
        setDraft("");
        setSelectedAttachmentName(null);
        setEmoticonOpen(false);
        setComposerActive(true);
        setAgentCommandNotice("에이전트에게 질문을 보냈습니다.");
      } catch {
        setAgentCommandNotice("에이전트에게 질문을 보내지 못했습니다. 서버 상태나 프로젝트룸 권한을 확인하세요.");
      } finally {
        setSending(false);
      }
      return;
    }

    const messageType = selectedAttachmentName && !text ? "FILE" : "TEXT";
    const messageBody = selectedAttachmentName
      ? {
          attachmentName: selectedAttachmentName,
          text: text || `첨부: ${selectedAttachmentName}`,
        }
      : { text };

    setSending(true);
    setAgentCommandNotice(null);

    try {
      const response = await chatApi.sendMessage(activeChatRoomId, {
        body: messageBody,
        clientMessageId: crypto.randomUUID(),
        messageType,
      });
      appendMessage(response);
      setDraft("");
      setSelectedAttachmentName(null);
      setEmoticonOpen(false);
    } catch {
      setMessagesState({ kind: "offline" });
    } finally {
      setSending(false);
    }
  }, [activeChatRoomId, appendMessage, currentUser, draft, messagesState, selectedAgentRoomId, selectedAttachmentName]);

  return (
    <section className="workspace-route" aria-labelledby="chat-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="chat-title">소통</h1>
        </div>
        <nav className="workspace-route__mode-tabs" aria-label="대화 보기">
          <Link className={queryMode !== "direct" ? "is-active" : ""} href={queryRoomId ? `/app/chat?roomId=${queryRoomId}&mode=room` : "/app/chat?mode=room"}>
            프로젝트룸
          </Link>
          <Link className={queryMode === "direct" ? "is-active" : ""} href="/app/chat?mode=direct">
            1:1/그룹
          </Link>
        </nav>
      </header>

      {roomsState.kind === "loading" ? <GlassPanel className="workspace-route__panel">대화를 불러오는 중</GlassPanel> : null}
      {roomsState.kind === "auth" ? (
        <GlassPanel className="workspace-route__panel">
          <strong>로그인이 필요합니다</strong>
          <Link className="bubli-button bubli-button--primary" href="/login">
            로그인
          </Link>
        </GlassPanel>
      ) : null}
      {roomsState.kind === "offline" ? (
        <GlassPanel className="workspace-route__panel">
          <strong>대화를 불러오지 못했습니다</strong>
          <span>서버 연결이 돌아오면 대화 목록을 다시 불러옵니다.</span>
        </GlassPanel>
      ) : null}

      {roomsState.kind === "ready" && roomsState.rooms.length === 0 ? (
        <GlassPanel className="workspace-route__panel">
          <strong>대화 시작 전</strong>
          <Link className="bubli-button bubli-button--primary" href="/app/project-rooms">
            프로젝트룸 보기
          </Link>
        </GlassPanel>
      ) : null}

      {roomsState.kind === "ready" && roomsState.rooms.length > 0 ? (
        <section className="workspace-route__chat-overview" aria-label="소통 상태">
          <article>
            <MessageCircle size={17} strokeWidth={2} aria-hidden="true" />
            <div>
              <strong>프로젝트룸 대화</strong>
              <span>{roomConversationCount}개 룸</span>
            </div>
          </article>
          <article>
            <UsersRound size={17} strokeWidth={2} aria-hidden="true" />
            <div>
              <strong>1:1</strong>
              <span>{friendCount}명 · 요청 {pendingFriendRequestCount}</span>
            </div>
          </article>
          <article>
            <Phone size={17} strokeWidth={2} aria-hidden="true" />
            <div>
              <strong>보이스</strong>
              <span>{selectedRoom?.chatType === "ROOM" ? "프로젝트룸에서 시작" : "프로젝트룸 채팅에서 시작"}</span>
            </div>
          </article>
        </section>
      ) : null}

      {roomsState.kind === "ready" ? (
        <div className="workspace-route__chat-quick-actions" aria-label="친구와 초대 빠른 실행">
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
            새로 만들기
          </button>
          {roomCreateNotice ? <span className="workspace-route__pending">{roomCreateNotice}</span> : null}
          <button className="workspace-route__quick-button" disabled={!myBubliId} onClick={() => void copyMyBubliId()} type="button">
            <Copy aria-hidden size={15} strokeWidth={2} />
            {copiedBubliId ? "ID 복사됨" : "내 ID 복사"}
          </button>
          <button
            className="workspace-route__quick-button"
            onClick={() => {
              setFriendAddOpen(true);
              window.setTimeout(() => {
                friendSearchInputRef.current?.focus();
                friendSearchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 0);
            }}
            type="button"
          >
            <UserPlus aria-hidden size={15} strokeWidth={2} />
            친구 추가
          </button>
          <button
            className="workspace-route__quick-button"
            disabled={!selectedProjectRoomId}
            onClick={() => {
              friendListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            type="button"
          >
            <UsersRound aria-hidden size={15} strokeWidth={2} />
            현재 룸 초대
          </button>
        </div>
      ) : null}

      {roomsState.kind === "ready" ? (
        <div className="workspace-route__chat">
          <aside className="workspace-route__section workspace-route__chat-list" aria-label="대화방">
            <div className="workspace-route__chat-list-head">
              <strong>{roomMode === "direct" ? "친구 대화" : isProjectRoomScoped ? "현재 프로젝트룸 대화" : "프로젝트룸 대화"}</strong>
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
                    <strong>{room.name ?? roomTypeLabel(room)}</strong>
                    <span>{updatedLabel(room)}</span>
                  </span>
                  <span className="workspace-route__meta">{roomTypeLabel(room)}</span>
                </button>
              );
            })}
            {visibleRooms.length === 0 ? (
              <span className="workspace-route__empty">{roomMode === "direct" ? "아직 친구 대화가 없습니다" : "프로젝트룸 대화가 없습니다"}</span>
            ) : null}
          </aside>

          <GlassPanel className="workspace-route__section workspace-route__thread">
            <div className="workspace-route__section-head">
              <div>
                <strong>{selectedRoom?.name ?? "대화"}</strong>
                {selectedRoom ? (
                  <span>{selectedRoom.chatType === "ROOM" ? "이 프로젝트룸에 묶인 대화" : selectedRoom.chatType === "GROUP" ? "친구들과 함께하는 그룹 대화" : "친구와 1:1 대화"}</span>
                ) : null}
              </div>
              <div className="workspace-route__thread-actions">
                {selectedRoom?.chatType === "ROOM" && selectedRoom.roomId ? (
                  <Link className="bubli-button" href={`/app/project-rooms/${selectedRoom.roomId}`}>
                    프로젝트룸
                  </Link>
                ) : null}
                {selectedRoom?.chatType === "ROOM" ? (
                  <Button disabled={voiceState.kind === "starting"} loading={voiceState.kind === "starting"} onClick={() => void startVoice()} type="button" variant="quiet">
                    보이스 시작
                  </Button>
                ) : null}
              </div>
            </div>
            {newRoomPickerOpen ? (
              <div className="workspace-route__new-room-panel" aria-label="새 1:1 채팅방 만들기">
                <div>
                  <strong>새 채팅방</strong>
                  <span>친구 한 명은 1:1로 열고, 여러 명을 선택하면 그룹 채팅방을 만듭니다.</span>
                </div>
                {socialState.kind === "loading" ? <span className="workspace-route__empty">친구 목록을 불러오는 중</span> : null}
                {socialState.kind === "offline" ? <span className="workspace-route__empty">친구 목록을 불러오지 못했습니다</span> : null}
                {socialState.kind === "ready" && socialState.friends.length === 0 ? (
                  <button
                    className="workspace-route__quick-button"
                    onClick={() => {
                      setFriendAddOpen(true);
                      window.setTimeout(() => friendSearchInputRef.current?.focus(), 0);
                    }}
                    type="button"
                  >
                    친구 추가
                  </button>
                ) : null}
                {socialState.kind === "ready" && socialState.friends.length > 0 ? (
                  <>
                    <label className="workspace-route__group-name-field" htmlFor="group-room-name">
                      <span>그룹 이름</span>
                      <input
                        id="group-room-name"
                        onChange={(event) => setGroupRoomName(event.target.value)}
                        placeholder="비워두면 친구 이름으로 생성"
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
                                1:1
                              </button>
                              <button onClick={() => toggleGroupMember(friend.friendUserId)} type="button">
                                {selected ? "선택 해제" : "그룹 선택"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="workspace-route__group-create-actions">
                      <span>{selectedGroupFriendCount}명 선택</span>
                      <Button disabled={selectedGroupFriendCount === 0 || sending} loading={sending} onClick={() => void createGroupRoom()} type="button" variant="primary">
                        그룹 채팅방 만들기
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
                <span>{voiceState.kind === "ready" ? "보이스 열림" : "보이스 대기"}</span>
                <span className="workspace-route__voice-stack" aria-label={`참여자 ${voiceParticipants.length}명`}>
                  {voiceParticipants.slice(0, 3).map((participant) => (
                    <i data-status={participant.status.toLowerCase()} key={participant.userId}>
                      {initialOf(participant.userName)}
                    </i>
                  ))}
                </span>
              </button>
            ) : null}
            {selectedRoom?.chatType === "ROOM" && voiceState.kind === "blocked" ? <div className="workspace-route__voice-status workspace-route__voice-status--blocked">{voiceState.message}</div> : null}

            {messagesState.kind === "loading" ? <span className="workspace-route__empty">메시지를 불러오는 중</span> : null}
            {messagesState.kind === "offline" ? <span className="workspace-route__empty">메시지를 불러오지 못했습니다</span> : null}
            {messagesState.kind === "ready" && messagesState.messages.length === 0 ? (
              <span className="workspace-route__empty">첫 메시지를 남겨보세요</span>
            ) : null}

            {messagesState.kind === "ready" && messagesState.messages.length > 0 ? (
              <div className="workspace-route__messages" ref={messagesViewportRef}>
                {messagesState.messages.map((message) => {
                  const isAgent = message.messageType === "AGENT_RESPONSE" || message.sender.type === "AGENT";
                  const isMine = message.messageType === "AGENT_COMMAND" || (!isAgent && Boolean(currentUser?.id && message.sender.id === currentUser.id));
                  const text = displayMessageText(message);

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
                          <button aria-label="메시지 복사" onClick={() => void navigator.clipboard.writeText(text)} type="button">
                            <Copy aria-hidden size={13} strokeWidth={2} />
                          </button>
                          <button aria-label="메시지 더보기" type="button">
                            <MoreHorizontal aria-hidden size={13} strokeWidth={2} />
                          </button>
                        </span>
                      </div>
                      <p>{text}</p>
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
                  <button aria-label="파일 첨부" onClick={() => fileInputRef.current?.click()} type="button">
                    <Paperclip aria-hidden size={17} strokeWidth={2} />
                  </button>
                  <button aria-label="보이스 참여자 보기" onClick={() => setVoiceExpanded((open) => !open)} type="button">
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
                    aria-label="메시지"
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
                    placeholder="메시지 쓰기"
                    rows={1}
                    value={draft}
                  />
                  <button aria-expanded={emoticonOpen} aria-label="이모티콘" onClick={() => setEmoticonOpen((open) => !open)} type="button">
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
                        첨부 {selectedAttachmentName}
                        <X aria-hidden size={13} strokeWidth={2} />
                      </button>
                    ) : agentCommandNotice ? (
                      <span className="workspace-route__agent-notice" role="status">
                        {agentCommandNotice}
                      </span>
                    ) : pendingAgentCommand ? (
                      <span className="workspace-route__agent-command-hint">
                        에이전트 질문 · {pendingAgentCommand.mode === "SUMMARIZE" ? "정리" : pendingAgentCommand.mode === "SUGGEST" ? "제안" : "답변"}
                      </span>
                    ) : (
                      <span>Shift+Enter 줄바꿈 · /bubli 질문으로 에이전트 호출</span>
                    )}
                    {emoticonOpen ? (
                      <div className="workspace-route__emoticons" aria-label="이모티콘 선택">
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
                            {token.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </form>
            ) : null}
          </GlassPanel>

          <aside className="workspace-route__section workspace-route__chat-social" aria-label="친구">
            <button
              aria-expanded={friendAddOpen}
              className="bubli-button bubli-button--quiet workspace-route__friend-add-control"
              onClick={() => {
                setFriendAddOpen((open) => !open);
                window.setTimeout(() => friendSearchInputRef.current?.focus(), 0);
              }}
              type="button"
            >
              친구추가
            </button>

            {friendAddOpen ? (
              <div className="workspace-route__social-flow" aria-label="친구 추가">
                <section className="workspace-route__social-card workspace-route__social-card--code">
                  <span className="workspace-route__social-kicker">
                    <AtSign aria-hidden size={14} strokeWidth={2} />
                    내 Bubli ID
                  </span>
                  <div className="workspace-route__my-code">
                    <div>
                      <small>친구 추가용</small>
                      <strong>{myBubliId || "로그인 후 표시"}</strong>
                    </div>
                    <button aria-label="내 Bubli ID 복사" disabled={!myBubliId} onClick={() => void copyMyBubliId()} type="button">
                      {copiedBubliId ? <Check aria-hidden size={15} strokeWidth={2.2} /> : <Copy aria-hidden size={15} strokeWidth={2} />}
                      {copiedBubliId ? "복사됨" : "복사"}
                    </button>
                  </div>
                </section>

                <section className="workspace-route__social-card">
                  <span className="workspace-route__social-kicker">
                    <UserPlus aria-hidden size={14} strokeWidth={2} />
                    친구 추가
                  </span>
                  <form
                    className="workspace-route__friend-search"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void searchFriend();
                    }}
                  >
                    <label htmlFor="friend-id-search">Bubli ID를 입력해 요청을 보냅니다</label>
                    <div>
                      <Search aria-hidden size={16} strokeWidth={2} />
                      <input
                        autoComplete="off"
                        id="friend-id-search"
                        onChange={(event) => {
                          setFriendSearchQuery(event.target.value);
                          if (!event.target.value.trim()) setFriendSearchState({ kind: "idle" });
                        }}
                        placeholder="예: bubli-id"
                        ref={friendSearchInputRef}
                        value={friendSearchQuery}
                      />
                      <button aria-label="친구 검색" type="submit">
                        찾기
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            ) : null}

            {friendSearchState.kind === "searching" ? <span className="workspace-route__empty">친구를 찾는 중</span> : null}
            {friendSearchState.kind === "empty" ? <span className="workspace-route__empty">일치하는 Bubli ID가 없습니다</span> : null}
            {friendSearchState.kind === "offline" ? <span className="workspace-route__empty">친구 요청을 처리하지 못했습니다</span> : null}
            {friendSearchState.kind === "sent" ? <span className="workspace-route__pending">{friendSearchState.targetName}님에게 요청을 보냈습니다</span> : null}
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
                        {alreadyFriend ? "친구" : "친구 요청"}
                      </button>
                    </div>
                  );
                })
              : null}

            <div className="workspace-route__friend-panel" aria-label="친구와 1:1" ref={friendListRef}>
              <div className="workspace-route__chat-list-head">
                <strong>친구목록</strong>
                <span>{friendCount}</span>
              </div>
              {socialState.kind === "loading" ? <span className="workspace-route__empty">친구 목록을 불러오는 중</span> : null}
              {socialState.kind === "offline" ? <span className="workspace-route__empty">친구 목록을 불러오지 못했습니다</span> : null}
              {socialState.kind === "ready" && socialState.friends.length === 0 ? <span className="workspace-route__empty">아직 친구가 없습니다</span> : null}
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
                          1:1
                        </button>
                        {selectedRoom?.chatType === "GROUP" ? (
                          <button disabled={chatRoomInviteState.kind === "sending"} onClick={() => void inviteFriendToChatRoom(friend)} type="button">
                            {chatRoomInviteState.kind === "sending" && chatRoomInviteState.friendName === friend.name ? "초대 중" : "채팅 초대"}
                          </button>
                        ) : null}
                        <button disabled={!selectedProjectRoomId || roomInviteState.kind === "sending"} onClick={() => void inviteFriendToRoom(friend)} type="button">
                          {roomInviteState.kind === "sending" && roomInviteState.friendName === friend.name ? "보내는 중" : "룸 초대"}
                        </button>
                        <button disabled={busyFriendUserId === friend.friendUserId} onClick={() => void deleteFriend(friend)} type="button">
                          {busyFriendUserId === friend.friendUserId ? "삭제 중" : "삭제"}
                        </button>
                      </div>
                    </article>
                  ))
                : null}
              {roomInviteState.kind === "sending" ? <span className="workspace-route__pending">{roomInviteState.friendName}님에게 초대 보내는 중</span> : null}
              {roomInviteState.kind === "sent" ? (
                <span className="workspace-route__pending">
                  {roomInviteState.friendName}님을 {selectedProjectRoomName ?? "프로젝트룸"}에 초대했습니다
                </span>
              ) : null}
              {roomInviteState.kind === "blocked" ? <span className="workspace-route__empty">{roomInviteState.message}</span> : null}
              {chatRoomInviteState.kind === "sending" ? <span className="workspace-route__pending">{chatRoomInviteState.friendName}님을 채팅방에 초대하는 중</span> : null}
              {chatRoomInviteState.kind === "sent" ? <span className="workspace-route__pending">{chatRoomInviteState.friendName}님을 채팅방에 초대했습니다</span> : null}
              {chatRoomInviteState.kind === "blocked" ? <span className="workspace-route__empty">{chatRoomInviteState.message}</span> : null}
              {roomInvitationsState.kind === "loading" ? <span className="workspace-route__empty">초대 목록을 불러오는 중</span> : null}
              {roomInvitationsState.kind === "offline" ? <span className="workspace-route__empty">초대 목록을 불러오지 못했습니다</span> : null}
              {pendingRoomInvitations.length > 0 ? (
                <div className="workspace-route__request-group">
                  <span>대기 중인 룸 초대 {pendingRoomInvitations.length}</span>
                  {pendingRoomInvitations.slice(0, 3).map((invitation) => (
                    <div className="workspace-route__friend-request workspace-route__friend-request--sent" key={invitation.id}>
                      <div>
                        <strong>{invitation.inviteeName ?? invitation.inviteeBubliId ?? invitation.inviteeUserId}</strong>
                        <small>{invitation.inviteeBubliId ?? invitation.role}</small>
                      </div>
                      <button disabled={busyInvitationId === invitation.id} onClick={() => void cancelRoomInvitation(invitation)} type="button">
                        {busyInvitationId === invitation.id ? "취소 중" : "초대 취소"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="workspace-route__friend-panel" aria-label="친구 요청">
              <div className="workspace-route__chat-list-head">
                <strong>친구 요청</strong>
                <span>{pendingFriendRequestCount}</span>
              </div>
              {socialState.kind === "ready" && pendingFriendRequests.length === 0 ? (
                <span className="workspace-route__empty">대기 중인 요청이 없습니다</span>
              ) : null}
              {receivedFriendRequests.length > 0 ? (
                <div className="workspace-route__request-group">
                  <span>받은 요청 {receivedFriendRequests.length}</span>
                  {receivedFriendRequests.slice(0, 3).map((request) => (
                    <div className="workspace-route__friend-request" key={request.id}>
                      <div>
                        <strong>{request.requester.name}</strong>
                        <small>{request.requester.bubliId}</small>
                      </div>
                      <div>
                        <button onClick={() => void respondFriendRequest(request, "accept")} type="button">
                          수락
                        </button>
                        <button onClick={() => void respondFriendRequest(request, "reject")} type="button">
                          거절
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {sentFriendRequests.length > 0 ? (
                <div className="workspace-route__request-group">
                  <span>보낸 요청 {sentFriendRequests.length}</span>
                  {sentFriendRequests.slice(0, 3).map((request) => (
                    <div className="workspace-route__friend-request workspace-route__friend-request--sent" key={request.id}>
                      <div>
                        <strong>{request.receiver.name}</strong>
                        <small>{request.receiver.bubliId}</small>
                      </div>
                      <span>대기 중</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="workspace-route__voice-card" aria-label="보이스 참여자">
              <div className="workspace-route__chat-list-head">
                <strong>보이스</strong>
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
                  <strong>{selectedRoom?.chatType === "ROOM" ? "프로젝트룸 보이스" : "1:1 보이스"}</strong>
                  <small>{activeVoiceRoom ? "열림" : voiceState.kind === "ready" ? "종료됨" : selectedRoom?.chatType === "ROOM" ? "시작 가능" : "프로젝트룸 채팅에서 시작"}</small>
                </div>
              </button>
              <div className="workspace-route__voice-controls" aria-label="보이스 액션">
                <button disabled={!activeVoiceRoom || voiceAction === "token"} onClick={() => void requestVoiceToken()} type="button">
                  <KeyRound aria-hidden size={14} strokeWidth={2} />
                  {voiceAction === "token" ? "받는 중" : "참여 토큰"}
                </button>
                <button disabled={!activeVoiceRoom || voiceAction === "mic"} onClick={() => void toggleVoiceMic()} type="button">
                  {voiceMicMuted ? <Mic aria-hidden size={14} strokeWidth={2} /> : <MicOff aria-hidden size={14} strokeWidth={2} />}
                  {voiceAction === "mic" ? "변경 중" : voiceMicMuted ? "마이크 켜기" : "마이크 끄기"}
                </button>
                <button disabled={!activeVoiceRoom || voiceAction === "leave"} onClick={() => void leaveVoice()} type="button">
                  <LogOut aria-hidden size={14} strokeWidth={2} />
                  {voiceAction === "leave" ? "나가는 중" : "나가기"}
                </button>
                <button disabled={!activeVoiceRoom || voiceAction === "end"} onClick={() => void endVoice()} type="button">
                  <Square aria-hidden size={14} strokeWidth={2} />
                  {voiceAction === "end" ? "종료 중" : "종료"}
                </button>
              </div>
              {voiceTokenInfo ? (
                <div className="workspace-route__voice-note">
                  <strong>토큰 준비됨</strong>
                  <span>{voiceTokenInfo.serverUrl} · {compactDateTime(voiceTokenInfo.expiresAt)}까지</span>
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
                        <small>{index === 0 && participant.status === "JOINED" ? "말하는 중" : voiceParticipantStatusLabel(participant.status)}</small>
                      </div>
                    </div>
                  )) : <span className="workspace-route__empty">아직 참여자가 없습니다</span>}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<GlassPanel className="workspace-route__panel">대화를 불러오는 중</GlassPanel>}>
      <ChatPageContent />
    </Suspense>
  );
}
