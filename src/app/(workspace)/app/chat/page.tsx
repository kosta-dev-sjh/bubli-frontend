"use client";

import { AtSign, Check, Copy, Download, Inbox, LogOut, Mic, MicOff, Paperclip, Phone, Search, Send, Smile, Square, UserPlus, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { authApi } from "@/features/auth/api/authApi";
import { chatApi } from "@/features/communication/api/chatApi";
import { friendApi } from "@/features/communication/api/friendApi";
import { voiceApi } from "@/features/communication/api/voiceApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { getApiBaseUrl } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import { getAuthAccessToken } from "@/lib/auth/auth-session";
import { useI18n } from "@/lib/i18n";
import type { TranslateVars, MessageKey } from "@/lib/i18n";
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
import type { VoiceParticipantResponse, VoiceRoomResponse } from "@/types/api/voice";

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

type VoiceAction = "join" | "mic" | "leave" | "end";

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

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

// 컴포저 이모지 피커에 노출하는 기본 이모지 세트(외부 의존성 없이 하드코딩).
const composerEmojis = [
  "😀", "😄", "😆", "😂", "🤣", "😊", "🙂", "😉",
  "😍", "😘", "😎", "🤔", "😅", "😭", "😢", "😡",
  "😱", "🥳", "🤗", "😴", "🙃", "😇", "🤩", "😋",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "👌", "✌️",
  "🙌", "❤️", "💙", "💛", "💚", "🔥", "⭐", "✨",
  "🎉", "🎊", "✅", "❌", "⚡", "☕", "🍀", "💡",
] as const;

function roomTypeLabel(t: TranslateFn, room: ChatRoomResponse) {
  if (room.chatType === "GROUP") return t("chat.roomType.group");
  return room.chatType === "ROOM" ? t("chat.roomType.room") : t("chat.roomType.direct");
}

function updatedLabel(t: TranslateFn, room: ChatRoomResponse) {
  const updatedAt = new Date(room.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return t("chat.room.beforeActivity");

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(updatedAt);
}

function messageText(t: TranslateFn, message: ChatMessageResponse) {
  const body = message.body;
  const text =
    message.messageType === "AGENT_COMMAND"
      ? body.text ?? body.message ?? body.request ?? body.command ?? body.query ?? body.prompt ?? body.content
      : body.text ?? body.message ?? body.content ?? body.request;

  if (message.messageType === "FILE") {
    const name = body.attachmentName ?? body.originalName ?? body.fileName ?? body.name;
    if (typeof name === "string" && name.trim()) return name;
    return t("chat.message.file");
  }
  if (typeof text === "string" && text.trim()) return text;
  if (message.messageType === "AGENT_COMMAND") return t("chat.message.agentCommand");
  if (message.messageType === "AGENT_RESPONSE") return t("chat.message.agentResponse");
  return t("chat.message.default");
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

function displayMessageText(t: TranslateFn, message: ChatMessageResponse) {
  const text = messageText(t, message);
  const isAgentMessage = message.messageType === "AGENT_RESPONSE" || message.sender.type === "AGENT";
  return isAgentMessage ? formatAgentMessageText(text) : text;
}

function commandText(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  return text.toLowerCase().startsWith("/bubli") ? text : `/bubli ${text}`;
}

function withAgentCommandMessages(t: TranslateFn, messages: ChatMessageResponse[]) {
  const existingCommandKeys = new Set(
    messages
      .filter((message) => message.messageType === "AGENT_COMMAND")
      .map((message) => `${message.chatRoomId}:${message.roomSequence}:${messageText(t, message)}`),
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
            name: t("chat.senderMe"),
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

function voiceParticipantStatusLabel(t: TranslateFn, status: VoiceParticipantResponse["status"]) {
  if (status === "JOINED") return t("chat.participant.joined");
  if (status === "LEFT") return t("chat.participant.left");
  return t("chat.participant.disconnected");
}

function parseBubliCommand(t: TranslateFn, text: string): AgentCommandDraft | null {
  const match = text.trim().match(/^\/bubli(?:\s+(.+))?$/i);
  if (!match) return null;

  const message = match[1]?.trim() || t("chat.agentDefaultPrompt");
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

// 소통 탭 내에서의 다른 페이지(설정, 자료보드 등)로 이동 후 돌아올 때 voice 상태를 유지.
// 모듈 변수는 클라이언트 측 내비게이션 사이에서 살아남지만 하드 새로고침 시 초기화됨.
let _voiceCache: { expanded: boolean; state: VoiceState } | null = null;

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
  const [voiceState, setVoiceState] = useState<VoiceState>(() => _voiceCache?.state ?? { kind: "idle" });
  const [voiceAction, setVoiceAction] = useState<VoiceAction | null>(null);
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [copiedBubliId, setCopiedBubliId] = useState(false);
  const [voiceExpanded, setVoiceExpanded] = useState(() => _voiceCache?.expanded ?? false);
  const [voiceMicMuted, setVoiceMicMuted] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [roomInviteState, setRoomInviteState] = useState<RoomInviteState>({ kind: "idle" });
  const [chatRoomInviteState, setChatRoomInviteState] = useState<ChatRoomInviteState>({ kind: "idle" });
  const [roomInvitationsState, setRoomInvitationsState] = useState<RoomInvitationsState>({ kind: "idle" });
  const [busyFriendUserId, setBusyFriendUserId] = useState<string | null>(null);
  // 친구 삭제는 결과를 먼저 알리고 삭제/유지로 확인받는 2단계 확인(프로젝트룸 설정 패널과 동일 패턴).
  const [pendingDeleteFriendUserId, setPendingDeleteFriendUserId] = useState<string | null>(null);
  // /bubli 에이전트 명령 힌트 — 룸 대화 첫 진입 시 상단에 한 번 노출하고 닫을 수 있다.
  const [agentHintDismissed, setAgentHintDismissed] = useState(false);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [composerActive, setComposerActive] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [downloadingResourceId, setDownloadingResourceId] = useState<string | null>(null);
  const [emoticonOpen, setEmoticonOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [newRoomPickerOpen, setNewRoomPickerOpen] = useState(false);
  const [groupRoomName, setGroupRoomName] = useState("");
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [agentCommandNotice, setAgentCommandNotice] = useState<string | null>(null);
  const [roomCreateNotice, setRoomCreateNotice] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const friendSearchInputRef = useRef<HTMLInputElement | null>(null);
  const friendListRef = useRef<HTMLDivElement | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const speakingRafRef = useRef<number | null>(null);

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
    return roomsState.rooms.filter((room) => room.chatType === "ROOM");
  }, [roomMode, roomsState]);
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
  const pendingAgentCommand = useMemo(() => parseBubliCommand(t, draft), [draft, t]);
  const inviteTargetLabel = selectedProjectRoomId ? selectedProjectRoomName ?? t("chat.label.currentRoom") : t("chat.label.selectRoomNeeded");
  const pendingRoomInvitations = roomInvitationsState.kind === "ready" ? roomInvitationsState.invitations.filter((invitation) => invitation.status === "PENDING") : [];
  // 보이스는 프로젝트룸 전용이며 룸별로 독립 — 다른 프로젝트룸이나 1:1/그룹 뷰에서는 null
  const activeVoiceRoom =
    voiceState.kind === "ready" &&
    voiceState.room.status === "OPEN" &&
    selectedRoom?.chatType === "ROOM" &&
    voiceState.room.roomId === selectedRoom?.roomId
      ? voiceState.room
      : null;
  const isInVoice = activeVoiceRoom !== null && activeVoiceRoom.participants.some(
    (p) => p.userId === currentUser?.id && p.status === "JOINED"
  );
  const isVoiceCreator = activeVoiceRoom !== null && activeVoiceRoom.createdByUserId === currentUser?.id;
  const voiceParticipants = useMemo<VoiceParticipantResponse[]>(() => {
    if (voiceState.kind === "ready") {
      return voiceState.room.participants.map((participant) => ({
        ...participant,
        userName: participant.userName ?? participant.name ?? t("chat.participant.fallbackName"),
      }));
    }

    return [];
  }, [voiceState, t]);
  const joinedVoiceParticipants = useMemo(
    () => (activeVoiceRoom ? voiceParticipants.filter((participant) => participant.status === "JOINED") : []),
    [activeVoiceRoom, voiceParticipants],
  );

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
      const sortedMessages = [...page.items].sort((a, b) => a.roomSequence - b.roomSequence);
      setMessagesState({ kind: "ready", messages: withAgentCommandMessages(t, sortedMessages) });
      const lastReadSequence = sortedMessages.at(-1)?.roomSequence;
      if (lastReadSequence !== undefined) {
        void chatApi.markRead(chatRoomId, lastReadSequence).catch(() => {
          // 읽음 처리 실패는 조용히 무시 (다음 로드에서 재시도)
        });
      }
    } catch {
      if (shouldUseWorkspacePreviewData()) {
        setMessagesState({ kind: "ready", messages: withAgentCommandMessages(t, workspacePreviewChatMessages(chatRoomId)) });
        return;
      }
      setMessagesState({ kind: "offline" });
    }
  }, [t]);

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
    if (roomsState.kind !== "ready" || !queryRoomId) return;
    const hasChat = roomsState.rooms.some((r) => r.chatType === "ROOM" && r.roomId === queryRoomId);
    if (hasChat) return;
    void chatApi.createProjectRoomChatRoom({ roomId: queryRoomId }).then((room) => {
      setRoomsState({ kind: "ready", rooms: [room, ...roomsState.rooms.filter((r) => r.id !== room.id)] });
      setSelectedChatRoomId(room.id);
    });
  }, [roomsState, queryRoomId]);

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
    const interval = window.setInterval(() => { void loadRoomInvitations(); }, 15000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(interval);
    };
  }, [loadRoomInvitations]);

  // voice 상태를 모듈 캐시에 동기화 (다른 탭 갔다와도 복원)
  useEffect(() => {
    _voiceCache = { expanded: voiceExpanded, state: voiceState };
  }, [voiceState, voiceExpanded]);

  // 열린 보이스룸의 참여자 상태를 주기적으로 갱신 (다른 멤버의 참여/퇴장 반영)
  const openVoiceRoomDbId = voiceState.kind === "ready" && voiceState.room.status === "OPEN" ? voiceState.room.id : null;
  useEffect(() => {
    if (!openVoiceRoomDbId) return;

    const interval = window.setInterval(() => {
      void voiceApi
        .getRoom(openVoiceRoomDbId)
        .then((room) => setVoiceState({ kind: "ready", room }))
        .catch(() => {
          // 폴링 실패는 조용히 무시 (다음 주기에 재시도)
        });
    }, 12000);

    return () => window.clearInterval(interval);
  }, [openVoiceRoomDbId]);

  // 소셜/채팅룸/초대 상태 백그라운드 폴링 (친구 요청·초대 수락이 자동 반영)
  useEffect(() => {
    const pollSocial = async () => {
      const [friends, requests] = await Promise.allSettled([friendApi.listFriends(), friendApi.listRequests()]);
      if (friends.status === "rejected" && requests.status === "rejected") return;
      setSocialState({
        friends: friends.status === "fulfilled" ? friends.value : [],
        kind: "ready",
        requests: requests.status === "fulfilled" ? requests.value : [],
      });
    };
    const pollRooms = async () => {
      try {
        const page = await chatApi.listRooms();
        setRoomsState({ kind: "ready", rooms: page.items });
      } catch { /* 폴링 실패 시 무시 */ }
    };
    const socialInterval = window.setInterval(() => { void pollSocial(); }, 12000);
    const roomsInterval = window.setInterval(() => { void pollRooms(); }, 20000);
    return () => {
      window.clearInterval(socialInterval);
      window.clearInterval(roomsInterval);
    };
  }, []);

  useEffect(() => {
    const stopAll = () => {
      if (speakingRafRef.current) { cancelAnimationFrame(speakingRafRef.current); speakingRafRef.current = null; }
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      if (audioCtxRef.current) { void audioCtxRef.current.close(); audioCtxRef.current = null; }
      analyserRef.current = null;
      setIsSpeaking(false);
    };

    if (!isInVoice || voiceMicMuted) { stopAll(); return; }

    let active = true;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        micStreamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!active || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
          setIsSpeaking(avg > 12);
          speakingRafRef.current = requestAnimationFrame(tick);
        };
        speakingRafRef.current = requestAnimationFrame(tick);
      } catch { /* 마이크 권한 거부 시 무시 */ }
    })();

    return () => { active = false; stopAll(); };
  }, [isInVoice, voiceMicMuted]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSelectedChatRoomId(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [queryMode, queryRoomId]);

  useEffect(() => {
    if (queryMode === "direct" || roomsState.kind !== "ready") return;
    if (selectedChatRoomId !== null) return;
    const voiceRoomId = voiceState.kind === "ready" ? voiceState.room.roomId : null;
    const roomChats = roomsState.rooms.filter((r) => r.chatType === "ROOM");
    const voiceMatch = voiceRoomId ? roomChats.find((r) => r.roomId === voiceRoomId) : null;
    const best = voiceMatch ?? roomChats[0] ?? null;
    if (!best) return;
    const id = window.setTimeout(() => { setSelectedChatRoomId(best.id); }, 0);
    return () => window.clearTimeout(id);
  }, [queryMode, roomsState, selectedChatRoomId, voiceState]);

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

  useEffect(() => {
    if (messagesState.kind !== "ready") return;
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [activeChatRoomId, messagesState]);

  function selectChatRoom(room: ChatRoomResponse) {
    setSelectedChatRoomId(room.id);
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
        setPendingDeleteFriendUserId(null);
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
    if (!selectedRoom) return;
    if (selectedRoom.chatType !== "ROOM" || !selectedRoom.roomId) {
      setVoiceState({ kind: "blocked", message: t("chat.notice.voiceOnlyRoom") });
      return;
    }
    const voiceRoomId = selectedRoom.roomId;

    setVoiceState({ kind: "starting" });
    setVoiceAction(null);
    setVoiceMicMuted(false);
    setVoiceNotice(null);

    try {
      const room = await voiceApi.createRoom({ roomId: voiceRoomId });
      setVoiceState({ kind: "ready", room });
      setVoiceExpanded(true);
      setVoiceNotice(t("chat.notice.voiceOpened"));

      // 개설자는 곧바로 참여 처리 — 참여 토큰은 내부에서만 발급/사용하고 화면에 노출하지 않는다.
      try {
        await voiceApi.getToken(room.id);
        const refreshed = await voiceApi.getRoom(room.id);
        setVoiceState({ kind: "ready", room: refreshed });
      } catch {
        // 자동 참여 실패 시 룸은 열린 상태 유지 — "보이스 참여" 버튼으로 재시도 가능
      }
    } catch {
      setVoiceState({ kind: "blocked", message: t("chat.notice.voiceStartFailed") });
    }
  }, [selectedRoom, t]);

  // 보이스 참여: 참여 토큰 발급은 join 흐름 내부에서 자동 수행하고 토큰 자체는 사용자에게 보여주지 않는다.
  const joinVoice = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    setVoiceAction("join");
    try {
      await voiceApi.getToken(activeVoiceRoom.id);
      const room = await voiceApi.getRoom(activeVoiceRoom.id);
      setVoiceState({ kind: "ready", room });
      setVoiceMicMuted(false);
      setVoiceExpanded(true);
      setVoiceNotice(t("chat.notice.voiceJoined"));
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 403) {
        setVoiceNotice(t("chat.notice.voiceJoinDenied"));
      } else {
        setVoiceNotice(t("chat.notice.voiceJoinFailed"));
      }
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, voiceAction, t]);

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
  }, [activeVoiceRoom, currentUser, voiceAction, voiceMicMuted, t]);

  const leaveVoice = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    setVoiceAction("leave");
    try {
      const room = await voiceApi.leave(activeVoiceRoom.id);
      setVoiceState({ kind: "ready", room });
      setVoiceNotice(t("chat.notice.voiceLeft"));
      setVoiceExpanded(false);
    } catch {
      setVoiceNotice(t("chat.notice.voiceLeaveFailed"));
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, voiceAction, t]);

  const endVoice = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    setVoiceAction("end");
    try {
      const room = await voiceApi.end(activeVoiceRoom.id);
      setVoiceState({ kind: "ready", room });
      setVoiceNotice(t("chat.notice.voiceEnded"));
      setVoiceExpanded(false);
    } catch {
      setVoiceNotice(t("chat.notice.voiceEndFailed"));
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, voiceAction, t]);

  // 이모지 피커: Escape 또는 바깥 클릭으로 닫기
  useEffect(() => {
    if (!emoticonOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (emojiPickerRef.current?.contains(target) || emojiButtonRef.current?.contains(target)) return;
      setEmoticonOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEmoticonOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [emoticonOpen]);

  // 선택한 이모지를 입력창 커서 위치에 삽입
  const insertEmoji = useCallback((emoji: string) => {
    setComposerActive(true);
    const input = composerInputRef.current;

    if (!input) {
      setDraft((current) => `${current}${emoji}`);
      return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    setDraft((current) => `${current.slice(0, start)}${emoji}${current.slice(end)}`);
    window.requestAnimationFrame(() => {
      input.focus();
      const caret = start + emoji.length;
      input.setSelectionRange(caret, caret);
    });
  }, []);

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!activeChatRoomId || (!text && !selectedAttachment)) return;
    const agentCommand = parseBubliCommand(t, text);

    if (agentCommand) {
      if (!selectedAgentRoomId) {
        setComposerActive(true);
        setAgentCommandNotice(t("chat.notice.agentOnlyRoom"));
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
          name: currentUser?.name ?? t("chat.senderMe"),
          type: "USER",
        },
      };

      setSending(true);
      setAgentCommandNotice(t("chat.notice.agentSending"));
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
        setSelectedAttachment(null);
        setEmoticonOpen(false);
        setComposerActive(true);
        setAgentCommandNotice(t("chat.notice.agentSent"));
      } catch {
        setAgentCommandNotice(t("chat.notice.agentFailed"));
      } finally {
        setSending(false);
      }
      return;
    }

    setSending(true);
    setAgentCommandNotice(null);

    try {
      let resourceId: string | null = null;

      if (selectedAttachment) {
        const formData = new FormData();
        formData.append("title", selectedAttachment.name);
        formData.append("kind", "FILE");
        formData.append("visibility", selectedRoom?.chatType === "ROOM" ? "ROOM_SHARED" : "PERSONAL");
        if (selectedRoom?.chatType === "ROOM" && selectedRoom.roomId) {
          formData.append("roomId", selectedRoom.roomId);
        }
        formData.append("file", selectedAttachment);
        const uploaded = await resourcesApi.upload(formData);
        resourceId = uploaded.id;
      }

      const messageType = selectedAttachment && !text ? "FILE" : "TEXT";
      const messageBody = selectedAttachment
        ? { attachmentName: selectedAttachment.name, text: text || selectedAttachment.name }
        : { text };

      // TODO(widget): 이모지 전송 시 데스크톱 오버레이 이벤트 발행 지점.
      // 추후 Tauri 위젯 레이어가 붙으면, text에 포함된 이모지를 감지해
      // 데스크톱 위로 떠오르는 오버레이(스트리밍 오버레이 스타일) 이벤트를 여기서 emit한다.
      const response = await chatApi.sendMessage(activeChatRoomId, {
        body: messageBody,
        clientMessageId: crypto.randomUUID(),
        messageType,
        resourceId,
      });
      appendMessage(response);
      setDraft("");
      setSelectedAttachment(null);
      setEmoticonOpen(false);
    } catch {
      setAgentCommandNotice(t("chat.notice.sendFailed"));
    } finally {
      setSending(false);
    }
  }, [activeChatRoomId, appendMessage, draft, selectedAttachment, selectedAgentRoomId, selectedRoom, t]);

  const handleDownload = useCallback(async (resourceId: string, fallbackName?: string) => {
    setDownloadingResourceId(resourceId);
    try {
      const token = getAuthAccessToken();
      const response = await fetch(`${getApiBaseUrl()}/api/resources/${resourceId}/file`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error(`download failed: ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fallbackName ?? "";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // 다운로드 실패 무시
    } finally {
      setDownloadingResourceId(null);
    }
  }, []);

  return (
    <section className="workspace-route" aria-labelledby="chat-title">
      <header className="workspace-route__header">
        <div>
          <h1 id="chat-title">{t("chat.title")}</h1>
        </div>
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

      <div className="workspace-route__chat-toolbar">
        <nav className="workspace-route__chat-mode-tabs" aria-label={t("chat.tabs.aria")}>
          <Link className={queryMode !== "direct" ? "is-active" : ""} href={queryRoomId ? `/app/chat?roomId=${queryRoomId}&mode=room` : "/app/chat?mode=room"}>
            {t("chat.tabs.projectRoom")}
          </Link>
          <Link className={queryMode === "direct" ? "is-active" : ""} href="/app/chat?mode=direct">
            {t("chat.tabs.direct")}
          </Link>
        </nav>

        {roomsState.kind === "ready" ? (
          <div className="workspace-route__chat-quick-actions" aria-label={t("chat.quick.aria")}>
            {!isProjectRoomMode ? (
              <button
                className="workspace-route__quick-button"
                onClick={() => { setRoomCreateNotice(null); setNewRoomPickerOpen((open) => !open); }}
                type="button"
              >
                {t("chat.quick.create")}
              </button>
            ) : null}
            {roomCreateNotice ? <span className="workspace-route__pending">{roomCreateNotice}</span> : null}
            <button
              className="workspace-route__quick-button"
              onClick={() => setFriendsOpen(true)}
              type="button"
            >
              <UsersRound aria-hidden size={15} strokeWidth={2} />
              {t("chat.quick.manageFriends")}
            </button>
          </div>
        ) : null}
      </div>

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
                    <strong>{room.name ?? roomTypeLabel(t, room)}</strong>
                    <span>{updatedLabel(t, room)}</span>
                  </span>
                  <span className="workspace-route__meta">{roomTypeLabel(t, room)}</span>
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
                {selectedRoom ? (
                  <Button
                    aria-hidden={activeVoiceRoom ? "true" : undefined}
                    disabled={voiceState.kind === "starting" || !!activeVoiceRoom}
                    loading={voiceState.kind === "starting"}
                    onClick={() => void startVoice()}
                    style={{ visibility: activeVoiceRoom ? "hidden" : "visible" }}
                    tabIndex={activeVoiceRoom ? -1 : undefined}
                    type="button"
                    variant="quiet"
                  >
                    {t("chat.thread.startVoice")}
                  </Button>
                ) : null}
              </div>
            </div>
            {selectedRoom ? (
              <div className="workspace-route__voice-bar">
                <div className="workspace-route__voice-row">
                  <button
                    aria-expanded={activeVoiceRoom ? voiceExpanded : undefined}
                    className={`workspace-route__voice-status${activeVoiceRoom ? " workspace-route__voice-status--open workspace-route__voice-status--clickable" : ""}`}
                    disabled={!activeVoiceRoom}
                    onClick={() => { if (activeVoiceRoom) setVoiceExpanded((v) => !v); }}
                    type="button"
                  >
                    <Phone size={15} strokeWidth={2} aria-hidden="true" />
                    <span>
                      {activeVoiceRoom
                        ? joinedVoiceParticipants.length > 0
                          ? t("chat.voice.live", { count: joinedVoiceParticipants.length })
                          : t("chat.voice.open")
                        : t("chat.voice.waiting")}
                    </span>
                  </button>
                  {activeVoiceRoom ? (
                    <div className="workspace-route__voice-pills">
                      {!isInVoice ? (
                        <button className="workspace-route__voice-pill" data-voice-pill="0" disabled={voiceAction === "join"} onClick={() => void joinVoice()} type="button">
                          <Phone aria-hidden size={13} strokeWidth={2} />
                          {voiceAction === "join" ? t("chat.voice.joining") : t("chat.voice.join")}
                        </button>
                      ) : null}
                      {isInVoice ? (
                        <button
                          aria-pressed={voiceMicMuted}
                          className="workspace-route__voice-pill"
                          data-voice-pill="1"
                          disabled={voiceAction === "mic"}
                          onClick={() => void toggleVoiceMic()}
                          type="button"
                        >
                          {voiceMicMuted ? <Mic aria-hidden size={13} strokeWidth={2} /> : <MicOff aria-hidden size={13} strokeWidth={2} />}
                          {voiceAction === "mic" ? t("chat.voiceCard.changing") : voiceMicMuted ? t("chat.voiceCard.micOn") : t("chat.voiceCard.micOff")}
                        </button>
                      ) : null}
                      {isInVoice ? (
                        <button className="workspace-route__voice-pill" data-voice-pill="2" disabled={voiceAction === "leave"} onClick={() => void leaveVoice()} type="button">
                          <LogOut aria-hidden size={13} strokeWidth={2} />
                          {voiceAction === "leave" ? t("chat.voiceCard.leaving") : t("chat.voiceCard.leave")}
                        </button>
                      ) : null}
                      {isVoiceCreator ? (
                        <button className="workspace-route__voice-pill workspace-route__voice-pill--end" data-voice-pill="3" disabled={voiceAction === "end"} onClick={() => void endVoice()} type="button">
                          <Square aria-hidden size={13} strokeWidth={2} />
                          {voiceAction === "end" ? t("chat.voiceCard.ending") : t("chat.voiceCard.end")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {activeVoiceRoom && voiceExpanded ? (
                  <div className="workspace-route__voice-people workspace-route__voice-people--inline">
                    {joinedVoiceParticipants.map((participant) => {
                      const isMe = participant.userId === currentUser?.id;
                      return (
                        <div className="workspace-route__voice-person" key={participant.userId}>
                          <span
                            data-speaking={isMe ? String(isSpeaking) : undefined}
                            data-status={participant.status.toLowerCase()}
                          >
                            {initialOf(participant.userName)}
                          </span>
                          <div>
                            <strong>{participant.userName}</strong>
                            <small>{participant.micStatus === "MUTED" ? t("chat.voiceCard.micOffState") : t("chat.voiceCard.micOnState")}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {voiceNotice ? (
                  <span className="workspace-route__voice-notice">{voiceNotice}</span>
                ) : null}
              </div>
            ) : null}
            {selectedRoom && voiceState.kind === "blocked" ? (
              <div className="workspace-route__voice-status workspace-route__voice-status--blocked">{voiceState.message}</div>
            ) : null}

            {selectedRoom?.chatType === "ROOM" && !agentHintDismissed ? (
              <div className="workspace-route__agent-hint-line" role="note">
                <span>{t("chat.composer.hint")}</span>
                <button aria-label={t("common.close")} onClick={() => setAgentHintDismissed(true)} type="button">
                  <X aria-hidden size={13} strokeWidth={2} />
                </button>
              </div>
            ) : null}

            {messagesState.kind === "loading" ? <span className="workspace-route__empty">{t("chat.messages.loading")}</span> : null}
            {messagesState.kind === "offline" ? <span className="workspace-route__empty">{t("chat.messages.offline")}</span> : null}
            {messagesState.kind === "ready" && messagesState.messages.length === 0 ? (
              <span className="workspace-route__empty">{t("chat.messages.empty")}</span>
            ) : null}

            {messagesState.kind === "ready" && messagesState.messages.length > 0 ? (
              <div className="workspace-route__messages" ref={messagesViewportRef}>
                {messagesState.messages.map((message) => {
                  const isAgent = message.messageType === "AGENT_RESPONSE" || message.sender.type === "AGENT";
                  const isMine = message.messageType === "AGENT_COMMAND" || (!isAgent && Boolean(currentUser?.id && message.sender.id === currentUser.id));
                  const text = displayMessageText(t, message);

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
                          <button aria-label={t("chat.messages.copy")} onClick={() => void navigator.clipboard.writeText(text)} type="button">
                            <Copy aria-hidden size={13} strokeWidth={2} />
                          </button>
                        </span>
                      </div>
                      {message.messageType === "FILE" && message.resourceId ? (
                        <button
                          className="workspace-route__file-download"
                          disabled={downloadingResourceId === message.resourceId}
                          onClick={() => void handleDownload(message.resourceId!, text)}
                          type="button"
                        >
                          <Download aria-hidden size={13} strokeWidth={2} />
                          <span>{text}</span>
                        </button>
                      ) : (
                        <p>{text}</p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : null}

            {selectedRoom ? (
              <form
                className={[
                  "workspace-route__composer",
                  composerActive || draft || selectedAttachment ? "workspace-route__composer--active" : "",
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
                  <input
                    ref={fileInputRef}
                    className="workspace-route__composer-file"
                    onChange={(event) => {
                      setSelectedAttachment(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                    type="file"
                  />
                  <textarea
                    ref={composerInputRef}
                    aria-label={t("chat.composer.message")}
                    onBlur={() => {
                      if (!draft.trim() && !selectedAttachment) setComposerActive(false);
                    }}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      if (agentCommandNotice) setAgentCommandNotice(null);
                    }}
                    onFocus={() => setComposerActive(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (!sending) void sendMessage();
                      }
                    }}
                    placeholder={t("chat.composer.placeholder")}
                    rows={1}
                    value={draft}
                  />
                  <button
                    ref={emojiButtonRef}
                    aria-expanded={emoticonOpen}
                    aria-haspopup="true"
                    aria-label={t("chat.composer.emoticon")}
                    onClick={() => { setEmoticonOpen((open) => !open); setComposerActive(true); }}
                    type="button"
                  >
                    <Smile aria-hidden size={17} strokeWidth={2} />
                  </button>
                  <Button disabled={(!draft.trim() && !selectedAttachment) || sending} loading={sending} type="submit" variant="primary">
                    <Send aria-hidden size={15} strokeWidth={1.9} />
                  </Button>
                </div>
                {emoticonOpen ? (
                  <div ref={emojiPickerRef} aria-label={t("chat.composer.emojiPickerAria")} className="workspace-route__composer-emoji-picker" role="group">
                    {composerEmojis.map((emoji) => (
                      <button key={emoji} onClick={() => insertEmoji(emoji)} type="button">
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
                {composerActive || draft || selectedAttachment ? (
                  <div className="workspace-route__composer-tools">
                    {selectedAttachment ? (
                      <button className="workspace-route__composer-chip" onClick={() => setSelectedAttachment(null)} type="button">
                        {t("chat.composer.attachChip", { name: selectedAttachment.name })}
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
                  </div>
                ) : null}
              </form>
            ) : null}
          </GlassPanel>

        </div>
      ) : null}

      {friendsOpen ? (
        <div className="workspace-route__new-room-overlay" role="dialog" aria-modal="true" aria-label={t("chat.social.aria")}>
          <button className="workspace-route__new-room-backdrop" onClick={() => setFriendsOpen(false)} type="button" aria-label={t("common.close")} />
          <div className="workspace-route__new-room-modal workspace-route__friends-modal">
            <div className="workspace-route__new-room-modal-head">
              <div>
                <strong>{t("chat.quick.manageFriends")}</strong>
                <span>{t("chat.social.subtitle")}</span>
              </div>
              <button className="workspace-route__new-room-close" onClick={() => setFriendsOpen(false)} type="button" aria-label={t("common.close")}>
                <X aria-hidden size={16} strokeWidth={2} />
              </button>
            </div>

            {/* 내 ID */}
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

            {/* 친구 검색/추가 */}
            <section className="workspace-route__social-card">
              <span className="workspace-route__social-kicker">
                <UserPlus aria-hidden size={14} strokeWidth={2} />
                {t("chat.social.addFriendKicker")}
              </span>
              <form
                className="workspace-route__friend-search"
                onSubmit={(event) => { event.preventDefault(); void searchFriend(); }}
              >
                <label htmlFor="friend-id-search-modal">{t("chat.social.searchLabel")}</label>
                <div>
                  <Search aria-hidden size={16} strokeWidth={2} />
                  <input
                    autoComplete="off"
                    id="friend-id-search-modal"
                    onChange={(event) => {
                      setFriendSearchQuery(event.target.value);
                      if (!event.target.value.trim()) setFriendSearchState({ kind: "idle" });
                    }}
                    placeholder={t("chat.social.searchPlaceholder")}
                    ref={friendSearchInputRef}
                    value={friendSearchQuery}
                  />
                  <button aria-label={t("chat.social.searchAria")} type="submit">{t("chat.social.searchCta")}</button>
                </div>
              </form>
              {friendSearchState.kind === "searching" ? <span className="workspace-route__empty">{t("chat.search.searching")}</span> : null}
              {friendSearchState.kind === "empty" ? <span className="workspace-route__empty">{t("chat.search.empty")}</span> : null}
              {friendSearchState.kind === "offline" ? <span className="workspace-route__empty">{t("chat.search.offline")}</span> : null}
              {friendSearchState.kind === "sent" ? <span className="workspace-route__pending">{t("chat.search.sent", { name: friendSearchState.targetName })}</span> : null}
              {friendSearchState.kind === "ready"
                ? friendSearchState.results.slice(0, 3).map((person) => {
                    const alreadyFriend = socialState.kind === "ready" && socialState.friends.some((f) => f.friendUserId === person.userId || f.bubliId === person.bubliId);
                    return (
                      <div className="workspace-route__friend-result" key={person.userId}>
                        <span aria-hidden="true">{initialOf(person.name)}</span>
                        <div><strong>{person.name}</strong><small>{person.bubliId}</small></div>
                        <button disabled={alreadyFriend} onClick={() => void sendFriendRequest(person)} type="button">
                          {alreadyFriend ? t("chat.search.alreadyFriend") : t("chat.search.sendRequest")}
                        </button>
                      </div>
                    );
                  })
                : null}
            </section>

            {/* 친구 목록 */}
            <section className="workspace-route__social-card">
              <span className="workspace-route__social-kicker">
                <UsersRound aria-hidden size={14} strokeWidth={2} />
                {t("chat.friends.title")} {friendCount > 0 ? `(${friendCount})` : ""}
              </span>
              {socialState.kind === "loading" ? <span className="workspace-route__empty">{t("chat.friends.loading")}</span> : null}
              {socialState.kind === "ready" && socialState.friends.length === 0 ? <span className="workspace-route__empty">{t("chat.friends.empty")}</span> : null}
              {socialState.kind === "ready"
                ? socialState.friends.map((friend) => (
                    <article className="workspace-route__friend-row" key={friend.friendUserId}>
                      <span aria-hidden="true">{initialOf(friend.name)}</span>
                      <div><strong>{friend.name}</strong><small>{friend.bubliId}</small></div>
                      <div className="workspace-route__friend-actions">
                        <button onClick={() => { void openDirectRoom(friend); setFriendsOpen(false); }} type="button">{t("chat.friends.direct")}</button>
                        {selectedRoom?.chatType === "GROUP" ? (
                          <button disabled={chatRoomInviteState.kind === "sending"} onClick={() => void inviteFriendToChatRoom(friend)} type="button">
                            {chatRoomInviteState.kind === "sending" && chatRoomInviteState.friendName === friend.name ? t("chat.friends.inviting") : t("chat.friends.chatInvite")}
                          </button>
                        ) : null}
                        <button disabled={!selectedProjectRoomId || roomInviteState.kind === "sending"} onClick={() => void inviteFriendToRoom(friend)} type="button">
                          {roomInviteState.kind === "sending" && roomInviteState.friendName === friend.name ? t("chat.friends.sending") : t("chat.friends.roomInvite")}
                        </button>
                        {pendingDeleteFriendUserId === friend.friendUserId ? (
                          <>
                            <span className="workspace-route__pending" role="status">{t("chat.friends.deleteConfirm")}</span>
                            <button disabled={busyFriendUserId === friend.friendUserId} onClick={() => void deleteFriend(friend)} type="button">
                              {busyFriendUserId === friend.friendUserId ? t("chat.friends.deleting") : t("chat.friends.deleteConfirmDelete")}
                            </button>
                            <button disabled={busyFriendUserId === friend.friendUserId} onClick={() => setPendingDeleteFriendUserId(null)} type="button">
                              {t("chat.friends.deleteConfirmKeep")}
                            </button>
                          </>
                        ) : (
                          <button disabled={busyFriendUserId === friend.friendUserId} onClick={() => setPendingDeleteFriendUserId(friend.friendUserId)} type="button">
                            {busyFriendUserId === friend.friendUserId ? t("chat.friends.deleting") : t("chat.friends.delete")}
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                : null}
              {roomInviteState.kind === "sent" ? <span className="workspace-route__pending">{t("chat.invite.roomSent", { name: roomInviteState.friendName, room: selectedProjectRoomName ?? t("chat.room.fallbackName") })}</span> : null}
              {chatRoomInviteState.kind === "sent" ? <span className="workspace-route__pending">{t("chat.invite.chatSent", { name: chatRoomInviteState.friendName })}</span> : null}
            </section>

            {/* 친구 요청 */}
            {pendingFriendRequestCount > 0 ? (
              <section className="workspace-route__social-card">
                <span className="workspace-route__social-kicker">
                  <Inbox aria-hidden size={14} strokeWidth={2} />
                  {t("chat.requests.title")} ({pendingFriendRequestCount})
                </span>
                {receivedFriendRequests.length > 0 ? (
                  <div className="workspace-route__request-group">
                    <span>{t("chat.requests.received", { count: receivedFriendRequests.length })}</span>
                    {receivedFriendRequests.map((request) => (
                      <div className="workspace-route__friend-request" key={request.id}>
                        <div><strong>{request.requester.name}</strong><small>{request.requester.bubliId}</small></div>
                        <div>
                          <button onClick={() => void respondFriendRequest(request, "accept")} type="button">{t("chat.requests.accept")}</button>
                          <button onClick={() => void respondFriendRequest(request, "reject")} type="button">{t("chat.requests.reject")}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {sentFriendRequests.length > 0 ? (
                  <div className="workspace-route__request-group">
                    <span>{t("chat.requests.sent", { count: sentFriendRequests.length })}</span>
                    {sentFriendRequests.map((request) => (
                      <div className="workspace-route__friend-request workspace-route__friend-request--sent" key={request.id}>
                        <div><strong>{request.receiver.name}</strong><small>{request.receiver.bubliId}</small></div>
                        <span>{t("chat.requests.waiting")}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* 프로젝트룸 초대 현황 */}
            {pendingRoomInvitations.length > 0 ? (
              <section className="workspace-route__social-card">
                <span className="workspace-route__social-kicker">
                  {t("chat.invite.pending", { count: pendingRoomInvitations.length })}
                </span>
                {pendingRoomInvitations.map((invitation) => (
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
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {newRoomPickerOpen ? (
        <div className="workspace-route__new-room-overlay" role="dialog" aria-modal="true" aria-label={t("chat.newRoom.aria")}>
          <button className="workspace-route__new-room-backdrop" onClick={() => setNewRoomPickerOpen(false)} type="button" aria-label={t("common.close")} />
          <div className="workspace-route__new-room-modal">
            <div className="workspace-route__new-room-modal-head">
              <div>
                <strong>{t("chat.newRoom.title")}</strong>
                <span>{t("chat.newRoom.subtitle")}</span>
              </div>
              <button className="workspace-route__new-room-close" onClick={() => setNewRoomPickerOpen(false)} type="button" aria-label={t("common.close")}>
                <X aria-hidden size={16} strokeWidth={2} />
              </button>
            </div>
            {socialState.kind === "loading" ? <span className="workspace-route__empty">{t("chat.newRoom.friendsLoading")}</span> : null}
            {socialState.kind === "offline" ? <span className="workspace-route__empty">{t("chat.newRoom.friendsOffline")}</span> : null}
            {socialState.kind === "ready" && socialState.friends.length === 0 ? (
              <button
                className="workspace-route__quick-button"
                onClick={() => {
                  setNewRoomPickerOpen(false);
                  // 친구 검색 입력은 친구 관리 모달 안에 있으므로 해당 모달을 연다
                  setFriendsOpen(true);
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
                          <button onClick={() => { void openDirectRoom(friend); setNewRoomPickerOpen(false); }} type="button">
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
