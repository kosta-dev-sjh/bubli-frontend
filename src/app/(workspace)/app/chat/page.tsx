"use client";

import { AtSign, Check, Copy, CornerUpLeft, Download, Flag, Inbox, LogOut, Mic, MicOff, MoreHorizontal, Paperclip, Phone, Search, Send, Smile, Square, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { agentApi } from "@/features/agent/api/agentApi";
import { authApi } from "@/features/auth/api/authApi";
import { chatApi } from "@/features/communication/api/chatApi";
import { AgentCommandAutocomplete } from "@/features/communication/components/agent-command-autocomplete";
import {
  dispatchEmojiSplash,
  EmojiSplashLayer,
  extractEmojiSplashEmojis,
} from "@/features/communication/components/emoji-splash-layer";
import { inferAgentCommandMode } from "@/features/communication/lib/agent-commands";
import { useAgentCommandAutocomplete } from "@/features/communication/lib/use-agent-command-autocomplete";
import { friendApi } from "@/features/communication/api/friendApi";
import { voiceApi } from "@/features/communication/api/voiceApi";
import { resourcesApi } from "@/features/resources/api/resourcesApi";
import { projectRoomApi } from "@/features/project-room/api/projectRoomApi";
import { getApiBaseUrl } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/errors";
import { getAuthAccessToken } from "@/lib/auth/auth-session";
import { notifyDataChanged } from "@/lib/data-changed";
import { projectRoomRoute } from "@/lib/project-room-routes";
import { openTauriChatWidget } from "@/lib/tauri/chat-widget-routing";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import {
  chatTypingDestinations,
  getChatRealtimeClient,
  isChatTypingRelaySupported,
} from "@/lib/websocket/chat-realtime";
import { websocketTopics } from "@/lib/websocket/topics";
import { useI18n } from "@/lib/i18n";
import type { TranslateVars, MessageKey } from "@/lib/i18n";
import { readCachedRoomMessages, syncCachedRoomMessages } from "@/lib/local";
import {
  connectLiveKitRoom,
  disconnectLiveKitRoom,
  getActiveLiveKitVoiceRoomId,
  onActiveSpeakersChanged,
  setLiveKitMicEnabled,
} from "@/lib/livekit-client";
import { voiceStore } from "@/lib/voice-store";
import {
  ACTIVE_PROJECT_ROOM_CHANGE_EVENT,
  getActiveProjectRoomId,
  getActiveProjectRoomLabel,
  setActiveProjectRoomId,
} from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewChatMessages,
  workspacePreviewChatRoomsFor,
  workspacePreviewUser,
} from "@/lib/workspace-preview-data";
import type { AgentSuggestionResponse } from "@/types/api/agent";
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

function sectionLines(text: string, sectionLabel: string) {
  const normalized = formatAgentMessageText(text);
  const pattern = new RegExp(`(?:^|\\n)${sectionLabel}:\\s*\\n?([\\s\\S]*?)(?=\\n\\n[A-Z_]+:|$)`, "i");
  const match = normalized.match(pattern);
  if (!match?.[1]) return [];

  return match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);
}

function isCommandLikeTodoTitle(value: unknown, request: string) {
  if (typeof value !== "string") return false;
  const text = value.trim().toLowerCase();
  const normalizedRequest = request.trim().toLowerCase();

  return (
    text.length === 0 ||
    text === normalizedRequest ||
    text === `/bubli ${normalizedRequest}` ||
    /^\/?bubli\b/.test(text) ||
    /(?:todo|to-do|할일)\s*.*후보/.test(text) ||
    /후보\s*만들/.test(text)
  );
}

function todoCandidatePatch(suggestion: AgentSuggestionResponse, title: string, request: string) {
  const currentTitle = suggestion.payloadJson.title ?? suggestion.payloadJson.name ?? suggestion.payloadJson.label;
  const currentSummary = suggestion.payloadJson.summary ?? suggestion.payloadJson.description ?? suggestion.payloadJson.content;
  const shouldPatchTitle = isCommandLikeTodoTitle(currentTitle, request);
  const shouldPatchSummary = typeof currentSummary !== "string" || currentSummary.trim().length === 0 || currentSummary === currentTitle;

  if (!shouldPatchTitle && !shouldPatchSummary) return null;

  return {
    ...suggestion.payloadJson,
    title: shouldPatchTitle ? title : currentTitle,
    summary: shouldPatchSummary ? title : currentSummary,
  };
}

async function repairTodoSuggestionsFromAgentReply(
  suggestions: AgentSuggestionResponse[],
  agentReplyText: string,
  request: string,
) {
  const todoLines = sectionLines(agentReplyText, "TODO");
  if (todoLines.length === 0) return;

  const todoSuggestions = suggestions.filter((suggestion) => suggestion.suggestionType === "TODO");
  await Promise.allSettled(
    todoSuggestions.map((suggestion, index) => {
      const payloadJson = todoCandidatePatch(suggestion, todoLines[index] ?? todoLines[0], request);
      if (!payloadJson) return Promise.resolve();
      return agentApi.updateSuggestion(suggestion.suggestionId, { action: "MODIFY", payloadJson });
    }),
  );
}

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

// withAgentCommandMessages가 합성한 명령 버블(id: agent-command-*)을 걷어낸다 —
// 실시간 병합 후 변환을 다시 돌릴 때 합성분이 중복 생성되지 않게 하기 위함.
function withoutSyntheticAgentCommands(messages: ChatMessageResponse[]) {
  return messages.filter((message) => !message.id.startsWith("agent-command-"));
}

// 실시간/재조회 병합용 중복 판정 — id·clientMessageId 일치, 또는 서버가 부여하는
// 정수 roomSequence가 같고 발신자/타입까지 같으면 같은 메시지로 본다.
// (낙관적 로컬 메시지는 정수 sequence를 추정하므로 발신자 조건 없이 sequence만 비교하면
//  같은 시각에 도착한 다른 사람 메시지를 삼킬 수 있다.)
function isDuplicateChatMessage(existing: ChatMessageResponse, incoming: ChatMessageResponse) {
  if (existing.id === incoming.id) return true;
  if (Boolean(incoming.clientMessageId) && existing.clientMessageId === incoming.clientMessageId) return true;
  return (
    Number.isInteger(existing.roomSequence) &&
    existing.roomSequence === incoming.roomSequence &&
    existing.messageType === incoming.messageType &&
    (existing.sender.id ?? null) === (incoming.sender.id ?? null)
  );
}

// /topic/chat/{id} 프레임 파싱 — 백엔드는 ChatMessageResponse JSON을 그대로 발행한다.
// (혹시 envelope({eventType, payload}) 형태로 바뀌어도 함께 수용한다.)
function parseIncomingChatMessage(data: unknown): ChatMessageResponse | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;

  if (record.eventType === "CHAT_MESSAGE_CREATED" && typeof record.payload === "object" && record.payload !== null) {
    return parseIncomingChatMessage(record.payload);
  }
  if (
    typeof record.id === "string" &&
    typeof record.chatRoomId === "string" &&
    typeof record.roomSequence === "number" &&
    typeof record.createdAt === "string" &&
    typeof record.messageType === "string" &&
    typeof record.sender === "object" &&
    record.sender !== null
  ) {
    return record as unknown as ChatMessageResponse;
  }
  return null;
}

// 타이핑 릴레이 페이로드 — src/lib/websocket/chat-realtime.ts의 백엔드 계약 주석 참고.
type ChatTypingSignal = {
  chatRoomId: string;
  typing: boolean;
  userId: string;
  userName: string;
};

function parseChatTypingSignal(data: unknown): ChatTypingSignal | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  if (
    typeof record.chatRoomId !== "string" ||
    typeof record.typing !== "boolean" ||
    typeof record.userId !== "string"
  ) {
    return null;
  }
  return {
    chatRoomId: record.chatRoomId,
    typing: record.typing,
    userId: record.userId,
    userName: typeof record.userName === "string" ? record.userName : "",
  };
}

const AGENT_TYPING_TIMEOUT_MS = 60000;
const TYPING_START_THROTTLE_MS = 3000;
const TYPING_IDLE_STOP_MS = 5000;
const TYPING_ENTRY_TTL_MS = 6000;
const NEAR_BOTTOM_THRESHOLD_PX = 96;

function messageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
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
  // 키워드→mode 매핑은 공용 명령 모듈이 단일 출처다(자동완성 목록과 동일 계약).
  return { message, mode: inferAgentCommandMode(message) };
}

function ChatPageContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRoomId = searchParams.get("roomId");
  const queryMode = searchParams.get("mode");
  const [roomsState, setRoomsState] = useState<RoomsState>({ kind: "loading" });
  const [messagesState, setMessagesState] = useState<MessagesState>({ kind: "idle" });
  const [socialState, setSocialState] = useState<SocialState>({ kind: "loading" });
  const [profileState, setProfileState] = useState<ProfileState>({ kind: "loading" });
  const [friendSearchState, setFriendSearchState] = useState<FriendSearchState>({ kind: "idle" });
  const [voiceState, setVoiceState] = useState<VoiceState>(() => {
    const s = voiceStore.getSnapshot().voice;
    return s.kind === "starting" ? { kind: "idle" } : s;
  });
  const [voiceAction, setVoiceAction] = useState<VoiceAction | null>(null);
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(() => voiceStore.getSnapshot().selectedChatRoomId);
  const [draft, setDraft] = useState("");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [copiedBubliId, setCopiedBubliId] = useState(false);
  const [voiceExpanded, setVoiceExpanded] = useState(() => voiceStore.getSnapshot().expanded);
  const [voiceMicMuted, setVoiceMicMuted] = useState(() => voiceStore.getSnapshot().micMuted);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [roomInviteState, setRoomInviteState] = useState<RoomInviteState>({ kind: "idle" });
  const [chatRoomInviteState, setChatRoomInviteState] = useState<ChatRoomInviteState>({ kind: "idle" });
  const [roomInvitationsState, setRoomInvitationsState] = useState<RoomInvitationsState>({ kind: "idle" });
  const [busyFriendUserId, setBusyFriendUserId] = useState<string | null>(null);
  const [busyFriendRequestId, setBusyFriendRequestId] = useState<string | null>(null);
  // 친구 삭제는 결과를 먼저 알리고 삭제/유지로 확인받는 2단계 확인(프로젝트룸 설정 패널과 동일 패턴).
  const [pendingDeleteFriendUserId, setPendingDeleteFriendUserId] = useState<string | null>(null);
  // 1:1/그룹 채팅방 나가기도 동일한 2단계 확인 패턴을 따른다.
  const [pendingLeaveRoomId, setPendingLeaveRoomId] = useState<string | null>(null);
  const [leavingRoomId, setLeavingRoomId] = useState<string | null>(null);
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
  const [speakingUserIds, setSpeakingUserIds] = useState<ReadonlySet<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [reportedMessageId, setReportedMessageId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessageResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const friendSearchInputRef = useRef<HTMLInputElement | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  // 실시간 채팅/타이핑 인디케이터 상태 — 방 전환 시 초기화 대신 chatRoomId로 스코프해
  // 렌더에서 현재 방 것만 보여준다(다른 방의 잔여 표시는 만료 정리로 사라진다).
  // agentTyping: /bubli 명령 후 "Bubli가 입력 중…"을 보여줄 마감 시각(60초 타임아웃 폴백).
  const [agentTyping, setAgentTyping] = useState<{ chatRoomId: string; until: number } | null>(null);
  const [typingPeople, setTypingPeople] = useState<
    Record<string, { chatRoomId: string; expiresAt: number; name: string }>
  >({});
  // 사용자가 스크롤로 과거를 읽는 중이면 새 메시지가 와도 강제 스크롤하지 않는다.
  const pinnedToBottomRef = useRef(true);
  const activeChatRoomIdRef = useRef<string | null>(null);
  const currentUserRef = useRef<AuthUser | null>(null);
  const typingPublishRef = useRef<{ lastStartSentAt: number; stopTimer: number | null }>({
    lastStartSentAt: 0,
    stopTimer: null,
  });
  const tauriChatRedirectSentRef = useRef(false);

  useEffect(() => {
    if (tauriChatRedirectSentRef.current || !isTauriRuntime()) return;

    tauriChatRedirectSentRef.current = true;
    const fallbackRoute = queryRoomId ? projectRoomRoute(queryRoomId, "work") : "/app";
    void openTauriChatWidget({ eventType: "handoff:chat-route", roomId: queryRoomId })
      .then(() => router.replace(fallbackRoute))
      .catch(() => router.replace(fallbackRoute));
  }, [queryRoomId, router]);

  // 이모지 퐁퐁 — 이모지만(1~5개)으로 된 TEXT 메시지가 도착하면(내 것/남의 것 모두)
  // "bubli:emoji-splash" 이벤트를 발행해 스레드 오버레이가 이모지를 띄우게 한다.
  // 같은 메시지가 REST 응답과 WS 에코로 두 번 들어와도 한 번만 발행되도록 ID로 중복 제거한다.
  const splashedMessageIdsRef = useRef<Set<string>>(new Set());
  const maybeSplashEmojiMessage = useCallback((message: ChatMessageResponse) => {
    if (message.messageType !== "TEXT") return;
    const text = typeof message.body.text === "string" ? message.body.text : null;
    if (!text) return;
    const emojis = extractEmojiSplashEmojis(text);
    if (!emojis) return;

    const seen = splashedMessageIdsRef.current;
    const keys = [message.id, message.clientMessageId].filter((key): key is string => Boolean(key));
    if (keys.some((key) => seen.has(key))) return;
    if (seen.size > 200) seen.clear();
    keys.forEach((key) => seen.add(key));

    dispatchEmojiSplash({
      chatRoomId: message.chatRoomId,
      emojis,
      messageId: message.id,
      senderId: message.sender.id ?? null,
    });
  }, []);

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

  // 실시간 수신/재조회 메시지를 현재 스레드에 병합 — 중복 제거 후
  // withAgentCommandMessages 변환과 roomSequence 정렬을 다시 적용한다.
  const mergeIncomingMessages = useCallback(
    (incoming: ChatMessageResponse[]) => {
      const scopedRoomId = activeChatRoomIdRef.current;
      const scoped = incoming.filter((message) => message.chatRoomId === scopedRoomId);
      if (scoped.length === 0) return;

      setMessagesState((current) => {
        const base = current.kind === "ready" ? current.messages : [];
        const fresh = scoped.filter(
          (message) => !base.some((item) => isDuplicateChatMessage(item, message)),
        );
        if (fresh.length === 0) return current;
        return {
          kind: "ready",
          messages: withAgentCommandMessages(t, [...withoutSyntheticAgentCommands(base), ...fresh]),
        };
      });
    },
    [t],
  );

  // 재연결 시 놓친 메시지 보정 — 최신 페이지를 다시 받아 병합한다(교체 아님).
  const refreshLatestMessages = useCallback(
    async (chatRoomId: string) => {
      try {
        const page = await chatApi.getMessages(chatRoomId, { size: 40 });
        if (activeChatRoomIdRef.current !== chatRoomId) return;
        const sortedMessages = [...page.items].sort((a, b) => a.roomSequence - b.roomSequence);
        void syncCachedRoomMessages(chatRoomId, sortedMessages, 0);
        mergeIncomingMessages(sortedMessages);
        const lastReadSequence = sortedMessages.at(-1)?.roomSequence;
        if (lastReadSequence !== undefined && typeof document !== "undefined" && document.hasFocus()) {
          void chatApi.markRead(chatRoomId, lastReadSequence).catch(() => {
            // 읽음 처리 실패는 조용히 무시
          });
        }
      } catch {
        // 재동기화 실패는 무시 — 다음 재연결/새로고침에서 다시 시도
      }
    },
    [mergeIncomingMessages],
  );

  // 내 타이핑 시작 신호 — 3초 스로틀로 발행하고, 5초 입력이 없으면 stop을 보낸다.
  // 백엔드 릴레이 미배포(플래그 OFF) 상태에서는 아무것도 하지 않는다.
  const notifyTypingActivity = useCallback(() => {
    if (!isChatTypingRelaySupported()) return;
    const chatRoomId = activeChatRoomIdRef.current;
    const me = currentUserRef.current;
    if (!chatRoomId || !me?.id) return;

    const client = getChatRealtimeClient();
    const state = typingPublishRef.current;
    const now = Date.now();
    const signal = { chatRoomId, typing: true, userId: me.id, userName: me.name };

    if (now - state.lastStartSentAt >= TYPING_START_THROTTLE_MS) {
      if (client.publish(chatTypingDestinations.publish(chatRoomId), signal)) {
        state.lastStartSentAt = now;
      }
    }
    if (state.stopTimer) window.clearTimeout(state.stopTimer);
    state.stopTimer = window.setTimeout(() => {
      state.stopTimer = null;
      if (state.lastStartSentAt === 0) return;
      state.lastStartSentAt = 0;
      client.publish(chatTypingDestinations.publish(chatRoomId), { ...signal, typing: false });
    }, TYPING_IDLE_STOP_MS);
  }, []);

  // 전송/방 전환/언마운트 시 타이핑 stop 신호를 즉시 보낸다(보낸 적이 있을 때만).
  const stopTypingPublish = useCallback((chatRoomId?: string | null) => {
    const state = typingPublishRef.current;
    if (state.stopTimer) {
      window.clearTimeout(state.stopTimer);
      state.stopTimer = null;
    }
    if (!isChatTypingRelaySupported() || state.lastStartSentAt === 0) return;
    state.lastStartSentAt = 0;
    const targetRoomId = chatRoomId ?? activeChatRoomIdRef.current;
    const me = currentUserRef.current;
    if (!targetRoomId || !me?.id) return;
    getChatRealtimeClient().publish(chatTypingDestinations.publish(targetRoomId), {
      chatRoomId: targetRoomId,
      typing: false,
      userId: me.id,
      userName: me.name,
    });
  }, []);

  const roomMode: "direct" | "room" = queryMode === "direct" ? "direct" : "room";

  // 상단바에서 고른 활성 프로젝트룸을 따라간다 — 룸 모드 대화는 이 룸 하나로 한정된다(Jitsi처럼 방에 들어가야 보이는 구조).
  const [activeRoomInfo, setActiveRoomInfo] = useState<{ id: string | null; label: string | null }>(() => ({
    id: getActiveProjectRoomId(),
    label: getActiveProjectRoomLabel(),
  }));

  useEffect(() => {
    const syncActiveRoom = (event: Event) => {
      const detail = event instanceof CustomEvent ? (event.detail as { roomId?: string | null; roomLabel?: string | null } | null) : null;
      setActiveRoomInfo({
        id: detail?.roomId ?? getActiveProjectRoomId(),
        label: detail?.roomLabel ?? getActiveProjectRoomLabel(),
      });
    };

    window.addEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, syncActiveRoom);
    return () => window.removeEventListener(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, syncActiveRoom);
  }, []);

  // ?roomId= 가 있으면 그 룸, 없으면 상단바 활성 룸 — 룸 모드에서 열리는 유일한 대화 기준.
  const scopedProjectRoomId = queryRoomId ?? activeRoomInfo.id;

  const directRooms = useMemo(
    () => (roomsState.kind === "ready" ? roomsState.rooms.filter((room) => room.chatType === "DIRECT" || room.chatType === "GROUP") : []),
    [roomsState],
  );

  const scopedRoomChat = useMemo(() => {
    if (roomsState.kind !== "ready" || !scopedProjectRoomId) return null;
    return roomsState.rooms.find((room) => room.chatType === "ROOM" && room.roomId === scopedProjectRoomId) ?? null;
  }, [roomsState, scopedProjectRoomId]);

  const activeChatRoomId = useMemo(() => {
    if (roomsState.kind !== "ready") return null;
    if (roomMode === "room") return scopedRoomChat?.id ?? null;
    if (selectedChatRoomId && directRooms.some((room) => room.id === selectedChatRoomId)) return selectedChatRoomId;
    return directRooms[0]?.id ?? null;
  }, [directRooms, roomMode, roomsState.kind, scopedRoomChat, selectedChatRoomId]);

  const selectedRoom = useMemo(() => {
    if (roomsState.kind !== "ready") return null;
    return roomsState.rooms.find((room) => room.id === activeChatRoomId) ?? null;
  }, [activeChatRoomId, roomsState]);
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
  const selectedProjectRoomId = selectedRoom?.chatType === "ROOM" && selectedRoom.roomId ? selectedRoom.roomId : scopedProjectRoomId;
  const selectedAgentRoomId = selectedRoom?.chatType === "ROOM" && selectedRoom.roomId ? selectedRoom.roomId : null;
  const selectedProjectRoomName =
    selectedRoom?.chatType === "ROOM" ? selectedRoom.name?.replace(/\s*대화$/, "") ?? activeRoomInfo.label ?? t("chat.room.fallbackName") : activeRoomInfo.label;
  const pendingAgentCommand = useMemo(() => parseBubliCommand(t, draft), [draft, t]);
  // /bubli 자동완성 — 프로젝트룸 대화에서만 연다(1:1/그룹에는 에이전트가 없다).
  // 완성 텍스트를 넣은 뒤 커서를 끝으로 옮겨 이어서 본문을 입력하게 한다.
  const applyAgentCommandCompletion = useCallback((completedText: string) => {
    setDraft(completedText);
    setComposerActive(true);
    const input = composerInputRef.current;
    if (!input) return;
    window.requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(completedText.length, completedText.length);
    });
  }, []);
  const agentAutocomplete = useAgentCommandAutocomplete({
    draft,
    enabled: selectedRoom?.chatType === "ROOM",
    onApply: applyAgentCommandCompletion,
  });
  // 컴포저 위 한 줄 인디케이터 문구 — 1명이면 이름, 여럿(에이전트 포함)이면 "여러 명".
  const agentTypingActive = agentTyping !== null && agentTyping.chatRoomId === activeChatRoomId;
  const typingIndicatorText = useMemo(() => {
    const names = Object.values(typingPeople)
      .filter((person) => person.chatRoomId === activeChatRoomId)
      .map((person) => person.name);
    const typingCount = names.length + (agentTypingActive ? 1 : 0);
    if (typingCount === 0) return null;
    if (typingCount > 1) return t("chat.typing.many");
    if (agentTypingActive) return t("chat.typing.agent");
    return t("chat.typing.one", { name: names[0] ?? t("chat.participant.fallbackName") });
  }, [activeChatRoomId, agentTypingActive, typingPeople, t]);
  const pendingRoomInvitations = roomInvitationsState.kind === "ready" ? roomInvitationsState.invitations.filter((invitation) => invitation.status === "PENDING") : [];
  // 보이스는 채팅방별로 독립 — 프로젝트룸은 roomId, 1:1/그룹은 chatRoomId로 매칭
  const activeVoiceRoom =
    voiceState.kind === "ready" &&
    voiceState.room.status === "OPEN" &&
    selectedRoom &&
    (selectedRoom.chatType === "ROOM"
      ? voiceState.room.roomId === selectedRoom.roomId
      : voiceState.room.chatRoomId === selectedRoom.id)
      ? voiceState.room
      : null;
  const isInVoice = activeVoiceRoom !== null && activeVoiceRoom.participants.some(
    (p) => p.userId === currentUser?.id && p.status === "JOINED"
  );
  const isVoiceCreator = activeVoiceRoom !== null && activeVoiceRoom.createdByUserId === currentUser?.id;

  // 새로고침 등으로 실제 LiveKit 연결만 끊긴 채 DB상 참여 상태가 남아있으면 조용히 재연결한다.
  useEffect(() => {
    if (!isInVoice || !activeVoiceRoom) return;
    if (getActiveLiveKitVoiceRoomId() === activeVoiceRoom.id) return;

    let cancelled = false;
    void (async () => {
      try {
        const token = await voiceApi.getToken(activeVoiceRoom.id);
        if (cancelled) return;
        await connectLiveKitRoom(activeVoiceRoom.id, token);
      } catch {
        // 조용히 실패 — "보이스 참여" 버튼으로 재시도 가능
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isInVoice, activeVoiceRoom]);
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
        const previewRoomId = queryRoomId ?? storedRoomId;
        setRoomsState({
          kind: "ready",
          rooms: workspacePreviewChatRoomsFor(previewRoomId, previewRoomId === storedRoomId ? getActiveProjectRoomLabel() : null),
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
      void syncCachedRoomMessages(chatRoomId, sortedMessages, 0);
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
      const cachedMessages = await readCachedRoomMessages(chatRoomId, 40);
      if (cachedMessages.length > 0) {
        setMessagesState({ kind: "ready", messages: withAgentCommandMessages(t, cachedMessages) });
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

  // 룸 모드 자동 진입: 활성 프로젝트룸의 채팅방이 없으면 만들어서 바로 연다.
  useEffect(() => {
    if (roomMode !== "room" || roomsState.kind !== "ready" || !scopedProjectRoomId) return;
    const hasChat = roomsState.rooms.some((room) => room.chatType === "ROOM" && room.roomId === scopedProjectRoomId);
    if (hasChat) return;
    void chatApi
      .createProjectRoomChatRoom({ roomId: scopedProjectRoomId })
      .then((room) => {
        setRoomsState((current) =>
          current.kind === "ready" ? { kind: "ready", rooms: [room, ...current.rooms.filter((item) => item.id !== room.id)] } : current,
        );
      })
      .catch(() => {
        if (shouldUseWorkspacePreviewData()) {
          setRoomsState((current) =>
            current.kind === "ready"
              ? { kind: "ready", rooms: workspacePreviewChatRoomsFor(scopedProjectRoomId, activeRoomInfo.label) }
              : current,
          );
        }
        // 생성 실패 시 빈 상태 유지 — 룸 목록 폴링에서 다시 시도한다.
      });
  }, [activeRoomInfo.label, roomMode, roomsState, scopedProjectRoomId]);

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

  // voice 상태를 전역 store에 동기화 — AppShell 영구 바 + 탭 복귀 복원 모두 여기서
  useEffect(() => {
    voiceStore.update({
      expanded: voiceExpanded,
      selectedChatRoomId,
      voice: voiceState.kind === "starting" || voiceState.kind === "blocked"
        ? { kind: "idle" }
        : voiceState,
    });
  }, [voiceState, voiceExpanded, selectedChatRoomId]);

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

  // "말하는 중" 표시 — LiveKit이 로컬/원격 참여자 전원의 오디오 레벨을 추적해 알려주므로
  // 직접 마이크 스트림을 열어 분석할 필요가 없다(모든 참여자에 대해 동일하게 동작).
  useEffect(() => {
    return onActiveSpeakersChanged(setSpeakingUserIds);
  }, []);

  useEffect(() => {
    activeChatRoomIdRef.current = activeChatRoomId;
  }, [activeChatRoomId]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (!activeChatRoomId) return;

    const timeoutId = window.setTimeout(() => {
      void loadMessages(activeChatRoomId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeChatRoomId, loadMessages]);

  // 실시간 구독 — 대화가 열려 있는 동안 /topic/chat/{id}를 구독해 새 메시지를 즉시 반영하고,
  // 재연결 시 최신 페이지를 재조회해 절전/끊김 동안 놓친 메시지를 메운다.
  useEffect(() => {
    if (!activeChatRoomId) return;

    const chatRoomId = activeChatRoomId;
    pinnedToBottomRef.current = true;

    const client = getChatRealtimeClient();
    const unsubscribeMessages = client.subscribe(websocketTopics.chatRoom(chatRoomId), (data) => {
      const message = parseIncomingChatMessage(data);
      if (!message || message.chatRoomId !== chatRoomId) return;

      mergeIncomingMessages([message]);
      notifyDataChanged("chat");
      // 남이 보낸(그리고 내 WS 에코) 이모지 전용 메시지 → 이모지 퐁퐁.
      maybeSplashEmojiMessage(message);

      // 에이전트 응답이 도착하면 "Bubli가 입력 중…"을 내린다.
      if (message.messageType === "AGENT_RESPONSE" || message.sender.type === "AGENT") {
        setAgentTyping((current) => (current?.chatRoomId === chatRoomId ? null : current));
      }
      // 메시지를 보낸 사람의 타이핑 표시는 즉시 제거.
      const senderId = message.sender.id;
      if (senderId) {
        setTypingPeople((current) => {
          if (!current[senderId]) return current;
          const next = { ...current };
          delete next[senderId];
          return next;
        });
      }
      // 창이 포커스된 상태로 보고 있으면 수신 즉시 읽음 처리.
      if (typeof document !== "undefined" && document.hasFocus()) {
        void chatApi.markRead(chatRoomId, message.roomSequence).catch(() => {
          // 읽음 처리 실패는 조용히 무시
        });
      }
    });

    const unsubscribeReconnect = client.onReconnect(() => {
      void refreshLatestMessages(chatRoomId);
    });

    // 사람 타이핑 구독 — 백엔드 릴레이가 배포되어 플래그가 켜진 경우에만.
    // (릴레이 없이 구독하면 서버 인가 로직이 세션을 끊으므로 기본 OFF. chat-realtime.ts 참고)
    let unsubscribeTyping: (() => void) | null = null;
    if (isChatTypingRelaySupported()) {
      unsubscribeTyping = client.subscribe(chatTypingDestinations.subscribe(chatRoomId), (data) => {
        const signal = parseChatTypingSignal(data);
        if (!signal || signal.chatRoomId !== chatRoomId) return;
        if (currentUserRef.current?.id && signal.userId === currentUserRef.current.id) return;

        setTypingPeople((current) => {
          if (!signal.typing) {
            if (!current[signal.userId]) return current;
            const next = { ...current };
            delete next[signal.userId];
            return next;
          }
          return {
            ...current,
            [signal.userId]: {
              chatRoomId,
              expiresAt: Date.now() + TYPING_ENTRY_TTL_MS,
              name: signal.userName.trim() || t("chat.participant.fallbackName"),
            },
          };
        });
      });
    }

    return () => {
      stopTypingPublish(chatRoomId);
      unsubscribeMessages();
      unsubscribeReconnect();
      unsubscribeTyping?.();
    };
  }, [activeChatRoomId, maybeSplashEmojiMessage, mergeIncomingMessages, refreshLatestMessages, stopTypingPublish, t]);

  // "Bubli가 입력 중…" 60초 타임아웃 폴백 — 응답이 끝내 안 오면 조용히 내린다.
  useEffect(() => {
    if (agentTyping === null) return;
    const timer = window.setTimeout(
      () => setAgentTyping(null),
      Math.max(0, agentTyping.until - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [agentTyping]);

  // stop 신호가 유실돼도 표시가 남지 않도록 만료된 타이핑 엔트리를 주기적으로 정리.
  useEffect(() => {
    if (Object.keys(typingPeople).length === 0) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setTypingPeople((current) => {
        const entries = Object.entries(current).filter(([, value]) => value.expiresAt > now);
        if (entries.length === Object.keys(current).length) return current;
        return Object.fromEntries(entries);
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [typingPeople]);

  useEffect(() => {
    if (!selectedRoom?.roomId || selectedRoom.chatType !== "ROOM") return;
    setActiveProjectRoomId(selectedRoom.roomId, selectedRoom.name?.replace(/\s*대화$/, "") ?? t("chat.room.fallbackName"));
  }, [currentUser, selectedRoom, t]);

  // 하단 근처에 있을 때만 자동 스크롤 — 과거 메시지를 읽는 중이면 위치를 유지한다.
  useEffect(() => {
    if (messagesState.kind !== "ready") return;
    const viewport = messagesViewportRef.current;
    if (!viewport || !pinnedToBottomRef.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [activeChatRoomId, messagesState]);

  const handleMessagesScroll = useCallback(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    pinnedToBottomRef.current =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < NEAR_BOTTOM_THRESHOLD_PX;
  }, []);

  function selectChatRoom(room: ChatRoomResponse) {
    setSelectedChatRoomId(room.id);
  }

  const openDirectRoom = useCallback(
    async (friend: FriendResponse) => {
      if (roomsState.kind !== "ready") return;

      // 백엔드가 1:1 방을 get-or-create로 중복 없이 돌려주므로 항상 API를 부른다.
      // (이름 부분일치로 기존 방을 찾던 빠른 경로는 엉뚱한 방을 열 수 있어 제거)
      try {
        const room = await chatApi.getOrCreateDirectRoom({ targetUserId: friend.friendUserId });
        setRoomsState({ kind: "ready", rooms: [room, ...roomsState.rooms.filter((item) => item.id !== room.id)] });
        setSelectedChatRoomId(room.id);
        setNewRoomPickerOpen(false);
        if (roomMode !== "direct") router.push("/app/chat?mode=direct");
      } catch {
        // 서버 미연결(프리뷰) 시 이름이 정확히 일치하는 기존 1:1 방이 있으면 그 방을 연다.
        const fallbackRoom = roomsState.rooms.find((room) => room.chatType === "DIRECT" && room.name === friend.name);
        if (fallbackRoom) {
          setSelectedChatRoomId(fallbackRoom.id);
          setNewRoomPickerOpen(false);
          if (roomMode !== "direct") router.push("/app/chat?mode=direct");
          return;
        }
        setSocialState({ kind: "offline" });
      }
    },
    [roomMode, roomsState, router],
  );

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
      if (roomMode !== "direct") router.push("/app/chat?mode=direct");
    } catch {
      setChatRoomInviteState({ kind: "blocked", message: t("chat.notice.groupCreateFailed") });
    } finally {
      setSending(false);
    }
  }, [groupRoomName, roomMode, roomsState, router, selectedGroupMemberIds, socialState, t]);

  const inviteFriendToChatRoom = useCallback(
    async (friend: FriendResponse) => {
      if (chatRoomInviteState.kind === "sending") return;
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
    [chatRoomInviteState.kind, selectedRoom, t],
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

  const leaveChatRoom = useCallback(
    async (room: ChatRoomResponse) => {
      if (roomsState.kind !== "ready" || leavingRoomId) return;

      setLeavingRoomId(room.id);
      try {
        await chatApi.leaveRoom(room.id);
        setRoomsState({ kind: "ready", rooms: roomsState.rooms.filter((item) => item.id !== room.id) });
        if (activeChatRoomId === room.id) {
          setSelectedChatRoomId(null);
        }
      } catch {
        // 실패 시 목록은 그대로 두고 다시 시도할 수 있게 한다
      } finally {
        setLeavingRoomId(null);
        setPendingLeaveRoomId(null);
      }
    },
    [activeChatRoomId, leavingRoomId, roomsState],
  );

  const inviteFriendToRoom = useCallback(
    async (friend: FriendResponse) => {
      if (roomInviteState.kind === "sending") return;
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
    [loadRoomInvitations, roomInviteState.kind, selectedProjectRoomId, t],
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
      // 이중 클릭 시 같은 요청에 PATCH가 중복 전송되지 않도록 진행 중 가드를 둔다.
      if (socialState.kind !== "ready" || busyFriendRequestId) return;

      setBusyFriendRequestId(request.id);
      try {
        if (action === "accept") {
          await friendApi.acceptRequest(request.id);
        } else {
          await friendApi.rejectRequest(request.id);
        }
        await loadSocial();
      } catch {
        setSocialState({ kind: "offline" });
      } finally {
        setBusyFriendRequestId(null);
      }
    },
    [busyFriendRequestId, loadSocial, socialState],
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
    const createRequest =
      selectedRoom.chatType === "ROOM" && selectedRoom.roomId
        ? { roomId: selectedRoom.roomId }
        : { chatRoomId: selectedRoom.id };

    setVoiceState({ kind: "starting" });
    setVoiceAction(null);
    setVoiceMicMuted(false);
    voiceStore.update({ micMuted: false });
    setVoiceNotice(null);

    try {
      const room = await voiceApi.createRoom(createRequest);
      setVoiceState({ kind: "ready", room });
      setVoiceExpanded(true);

      // 개설자는 곧바로 참여 처리 — 참여 토큰으로 실제 LiveKit 오디오까지 연결한다.
      try {
        const token = await voiceApi.getToken(room.id);
        await connectLiveKitRoom(room.id, token);
        const refreshed = await voiceApi.getRoom(room.id);
        setVoiceState({ kind: "ready", room: refreshed });
      } catch {
        // 자동 참여 실패 시 룸은 열린 상태 유지 — "보이스 참여" 버튼으로 재시도 가능
      }
    } catch {
      setVoiceState({ kind: "blocked", message: t("chat.notice.voiceStartFailed") });
    }
  }, [selectedRoom, t]);

  // 보이스 참여: 참여 토큰으로 실제 LiveKit 오디오 연결까지 수행한다(토큰 자체는 화면에 노출하지 않음).
  const joinVoice = useCallback(async () => {
    if (!activeVoiceRoom || voiceAction) return;

    setVoiceAction("join");
    try {
      const token = await voiceApi.getToken(activeVoiceRoom.id);
      await connectLiveKitRoom(activeVoiceRoom.id, token);
      const room = await voiceApi.getRoom(activeVoiceRoom.id);
      setVoiceState({ kind: "ready", room });
      setVoiceMicMuted(false);
      voiceStore.update({ micMuted: false });
      setVoiceExpanded(true);
      setVoiceNotice(null);
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
      await setLiveKitMicEnabled(!nextMuted);
      setVoiceMicMuted(nextMuted);
      voiceStore.update({ micMuted: nextMuted });
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
      setVoiceNotice(null);
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
      await disconnectLiveKitRoom();
      const room = await voiceApi.leave(activeVoiceRoom.id);
      setVoiceState({ kind: "ready", room });
      setVoiceNotice(null);
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
      await disconnectLiveKitRoom();
      const room = await voiceApi.end(activeVoiceRoom.id);
      setVoiceState({ kind: "ready", room });
      setVoiceNotice(null);
      setVoiceExpanded(false);
    } catch {
      setVoiceNotice(t("chat.notice.voiceEndFailed"));
    } finally {
      setVoiceAction(null);
    }
  }, [activeVoiceRoom, voiceAction, t]);

  // 다른 참여자가 종료했거나 폴링으로 ENDED를 확인한 경우, 실제 오디오 연결도 정리한다.
  useEffect(() => {
    if (voiceState.kind !== "ready" || voiceState.room.status !== "OPEN") {
      void disconnectLiveKitRoom();
    }
  }, [voiceState]);

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
    // 전송 시 내 타이핑 stop 신호를 보내고, 내 메시지는 항상 하단으로 따라간다.
    stopTypingPublish(activeChatRoomId);
    pinnedToBottomRef.current = true;
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
      // "Bubli가 입력 중…" — 응답 메시지가 도착(REST/WS)하거나 60초가 지나면 내려간다.
      setAgentTyping({ chatRoomId: activeChatRoomId, until: Date.now() + AGENT_TYPING_TIMEOUT_MS });
      appendMessage(optimisticCommandMessage);

      try {
        const response = await chatApi.runRoomAgentCommand(selectedAgentRoomId, {
          clientMessageId,
          message: agentCommand.message,
          mode: agentCommand.mode,
          resourceIds: [],
        });
        appendMessage(response.message);
        if (agentCommand.mode === "SUGGEST") {
          await repairTodoSuggestionsFromAgentReply(
            response.suggestions,
            messageText(t, response.message),
            agentCommand.message,
          );
        }
        setAgentTyping(null);
        void syncCachedRoomMessages(response.message.chatRoomId, [response.message]);
        setDraft("");
        setSelectedAttachment(null);
        setEmoticonOpen(false);
        setComposerActive(true);
        notifyDataChanged("agent");
        notifyDataChanged("chat");
        setAgentCommandNotice(t("chat.notice.agentSent"));
      } catch {
        setAgentTyping(null);
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
        // 첨부 업로드는 자료보드에도 등록된다 — 자료 목록/홈 최근 자료 카드에 즉시 반영한다.
        notifyDataChanged("resource");
      }

      const messageType = selectedAttachment && !text ? "FILE" : "TEXT";
      const replyTo = replyToMessage
        ? { messageId: replyToMessage.id, senderName: replyToMessage.sender.name, text: displayMessageText(t, replyToMessage) }
        : undefined;
      const messageBody = selectedAttachment
        ? { attachmentName: selectedAttachment.name, text: text || selectedAttachment.name, ...(replyTo ? { replyTo } : {}) }
        : { text, ...(replyTo ? { replyTo } : {}) };

      const response = await chatApi.sendMessage(activeChatRoomId, {
        body: messageBody,
        clientMessageId: crypto.randomUUID(),
        messageType,
        resourceId,
      });
      appendMessage(response);
      // 내가 보낸 이모지 전용 메시지도 즉시 퐁퐁 — WS 에코가 오면 ID 중복 제거로 한 번만 뜬다.
      // [TAURI WIDGET HOOK] dispatchEmojiSplash가 발행하는 "bubli:emoji-splash" CustomEvent를
      // 데스크톱 위젯 레이어가 나중에 구독해 데스크톱 오버레이 창으로 미러링할 수 있다
      // (계약과 페이로드는 emoji-splash-layer.tsx 상단 주석 참고 — 지금은 웹 오버레이만 구현).
      maybeSplashEmojiMessage(response);
      void syncCachedRoomMessages(response.chatRoomId, [response]);
      notifyDataChanged("chat");
      setDraft("");
      setSelectedAttachment(null);
      setEmoticonOpen(false);
      setReplyToMessage(null);
    } catch {
      setAgentCommandNotice(t("chat.notice.sendFailed"));
    } finally {
      setSending(false);
    }
  }, [activeChatRoomId, appendMessage, draft, maybeSplashEmojiMessage, replyToMessage, selectedAttachment, selectedAgentRoomId, selectedRoom, stopTypingPublish, t]);

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
            {roomMode === "direct" ? (
              <button
                className="workspace-route__quick-button"
                onClick={() => setNewRoomPickerOpen((open) => !open)}
                type="button"
              >
                {t("chat.quick.create")}
              </button>
            ) : null}
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

      {roomsState.kind === "ready" && roomMode === "room" && !scopedProjectRoomId ? (
        <GlassPanel className="workspace-route__panel workspace-route__chat-scope-empty">
          <strong>{t("chat.roomScope.emptyTitle")}</strong>
          <span>{t("chat.roomScope.emptyBody")}</span>
          <button
            className="bubli-button bubli-button--primary"
            onClick={() => window.dispatchEvent(new CustomEvent("bubli:open-project-room-switcher"))}
            type="button"
          >
            {t("chat.roomScope.pickRoom")}
          </button>
        </GlassPanel>
      ) : null}

      {roomsState.kind === "ready" && (roomMode === "direct" || scopedProjectRoomId) ? (
        <div className={`workspace-route__chat${roomMode === "room" ? " workspace-route__chat--room-scope" : ""}`}>
          {roomMode === "direct" ? (
            <aside className="workspace-route__section workspace-route__chat-list" aria-label={t("chat.list.aria")}>
              {directRooms.map((room) => {
                const selected = room.id === activeChatRoomId;
                const leavePending = pendingLeaveRoomId === room.id;
                const leaving = leavingRoomId === room.id;

                return (
                  <div
                    className={`workspace-route__row workspace-route__chat-room${selected ? " workspace-route__chat-room--active" : ""}`}
                    key={room.id}
                  >
                    <button
                      aria-pressed={selected}
                      className="workspace-route__chat-room-select"
                      onClick={() => selectChatRoom(room)}
                      type="button"
                    >
                      <span className="workspace-route__main">
                        <strong>{room.name ?? roomTypeLabel(t, room)}</strong>
                        <span>{updatedLabel(t, room)}</span>
                      </span>
                      <span className="workspace-route__meta">{roomTypeLabel(t, room)}</span>
                    </button>
                    {leavePending ? (
                      <span className="workspace-route__friend-actions">
                        <button disabled={leaving} onClick={() => void leaveChatRoom(room)} type="button">
                          {leaving ? t("chat.list.leaving") : t("chat.list.leaveConfirmLeave")}
                        </button>
                        <button disabled={leaving} onClick={() => setPendingLeaveRoomId(null)} type="button">
                          {t("chat.list.leaveConfirmKeep")}
                        </button>
                      </span>
                    ) : (
                      <span className="workspace-route__friend-actions">
                        <button onClick={() => setPendingLeaveRoomId(room.id)} type="button">
                          {t("chat.list.leave")}
                        </button>
                      </span>
                    )}
                  </div>
                );
              })}
              {directRooms.length === 0 ? (
                <span className="workspace-route__empty">{t("chat.list.emptyDirect")}</span>
              ) : null}
            </aside>
          ) : null}

          <GlassPanel className="workspace-route__section workspace-route__thread">
            <div className="workspace-route__section-head">
              <div>
                <strong>
                  {selectedRoom?.name ?? (roomMode === "room" ? selectedProjectRoomName ?? t("chat.thread.defaultName") : t("chat.thread.defaultName"))}
                </strong>
              </div>
              <div className="workspace-route__thread-actions">
                {selectedRoom?.chatType === "ROOM" && selectedRoom.roomId ? (
                  <Link className="bubli-button" href={projectRoomRoute(selectedRoom.roomId, "work")}>
                    {t("chat.thread.projectRoom")}
                  </Link>
                ) : null}
                {selectedRoom && !activeVoiceRoom ? (
                  <Button
                    disabled={voiceState.kind === "starting"}
                    icon={<Phone aria-hidden="true" size={15} strokeWidth={2} />}
                    loading={voiceState.kind === "starting"}
                    onClick={() => void startVoice()}
                    type="button"
                    variant="quiet"
                  >
                    {t("chat.thread.startVoice")}
                  </Button>
                ) : null}
              </div>
            </div>
            {selectedRoom && activeVoiceRoom ? (
              <div className="workspace-route__voice-bar">
                <div className="workspace-route__voice-row">
                  <button
                    aria-expanded={voiceExpanded}
                    className="workspace-route__voice-status workspace-route__voice-status--open workspace-route__voice-status--clickable"
                    onClick={() => setVoiceExpanded((v) => !v)}
                    type="button"
                  >
                    <Phone size={15} strokeWidth={2} aria-hidden="true" />
                    <span>
                      {joinedVoiceParticipants.length > 0
                        ? t("chat.voice.live", { count: joinedVoiceParticipants.length })
                        : t("chat.voice.open")}
                    </span>
                  </button>
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
                </div>
                {voiceExpanded ? (
                  <div className="workspace-route__voice-people workspace-route__voice-people--inline">
                    {joinedVoiceParticipants.map((participant) => {
                      const isMe = participant.userId === currentUser?.id;
                      return (
                        <div className="workspace-route__voice-person" key={participant.userId}>
                          <span
                            data-speaking={String(speakingUserIds.has(participant.userId))}
                            data-status={participant.status.toLowerCase()}
                          >
                            {initialOf(participant.userName)}
                          </span>
                          <div>
                            <strong>{participant.userName}</strong>
                            <small>
                              {isMe
                                ? voiceMicMuted
                                  ? t("chat.voiceCard.micOffState")
                                  : t("chat.voiceCard.micOnState")
                                : participant.micStatus
                                  ? participant.micStatus === "MUTED"
                                    ? t("chat.voiceCard.micOffState")
                                    : t("chat.voiceCard.micOnState")
                                  : voiceParticipantStatusLabel(t, participant.status)}
                            </small>
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

            {roomMode === "room" && !selectedRoom ? (
              <span className="workspace-route__empty">{t("chat.roomScope.opening")}</span>
            ) : null}
            {messagesState.kind === "loading" ? <span className="workspace-route__empty">{t("chat.messages.loading")}</span> : null}
            {messagesState.kind === "offline" ? <span className="workspace-route__empty">{t("chat.messages.offline")}</span> : null}
            {messagesState.kind === "ready" && messagesState.messages.length === 0 ? (
              <span className="workspace-route__empty">{t("chat.messages.empty")}</span>
            ) : null}

            {messagesState.kind === "ready" && messagesState.messages.length > 0 ? (
              <div className="workspace-route__messages" onScroll={handleMessagesScroll} ref={messagesViewportRef}>
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
                          <button
                            aria-label={t("chat.messages.copy")}
                            onClick={() => {
                              void navigator.clipboard.writeText(text).then(() => {
                                setCopiedMessageId(message.id);
                                setTimeout(() => setCopiedMessageId((id) => (id === message.id ? null : id)), 1600);
                              });
                            }}
                            type="button"
                          >
                            <Copy aria-hidden size={13} strokeWidth={2} />
                          </button>
                          <span className="workspace-route__message-more-wrap">
                            <button
                              aria-label="더보기"
                              onClick={() => setMessageMenuId((id) => (id === message.id ? null : message.id))}
                              type="button"
                            >
                              <MoreHorizontal aria-hidden size={13} strokeWidth={2} />
                            </button>
                            {messageMenuId === message.id ? (
                              <>
                                <button
                                  aria-hidden
                                  className="workspace-route__message-menu-backdrop"
                                  onClick={() => setMessageMenuId(null)}
                                  type="button"
                                />
                                <ul className="workspace-route__message-menu" role="menu">
                                  <li role="none">
                                    <button
                                      className="workspace-route__message-menu-item"
                                      onClick={() => { setReplyToMessage(message); setMessageMenuId(null); }}
                                      role="menuitem"
                                      type="button"
                                    >
                                      <CornerUpLeft aria-hidden size={13} strokeWidth={2} />
                                      {t("chat.messages.menuReply")}
                                    </button>
                                  </li>
                                  {isMine ? (
                                    <li role="none">
                                      <button
                                        className="workspace-route__message-menu-item workspace-route__message-menu-item--danger"
                                        onClick={() => {
                                          setMessagesState((s) =>
                                            s.kind === "ready"
                                              ? { kind: "ready", messages: s.messages.filter((m) => m.id !== message.id) }
                                              : s,
                                          );
                                          setMessageMenuId(null);
                                        }}
                                        role="menuitem"
                                        type="button"
                                      >
                                        <Trash2 aria-hidden size={13} strokeWidth={2} />
                                        {t("chat.messages.menuDelete")}
                                      </button>
                                    </li>
                                  ) : (
                                    <li role="none">
                                      <button
                                        className="workspace-route__message-menu-item"
                                        onClick={() => {
                                          setReportedMessageId(message.id);
                                          setMessageMenuId(null);
                                          setTimeout(() => setReportedMessageId((id) => (id === message.id ? null : id)), 2000);
                                        }}
                                        role="menuitem"
                                        type="button"
                                      >
                                        <Flag aria-hidden size={13} strokeWidth={2} />
                                        {t("chat.messages.menuReport")}
                                      </button>
                                    </li>
                                  )}
                                </ul>
                              </>
                            ) : null}
                          </span>
                        </span>
                        {copiedMessageId === message.id ? (
                          <span className="workspace-route__message-copied">{t("chat.messages.copied")}</span>
                        ) : null}
                        {reportedMessageId === message.id ? (
                          <span className="workspace-route__message-copied">{t("chat.messages.menuReported")}</span>
                        ) : null}
                      </div>
                      {typeof message.body.replyTo === "object" && message.body.replyTo !== null ? (
                        <blockquote className="workspace-route__message-reply-quote">
                          <strong>{(message.body.replyTo as { senderName?: string }).senderName}</strong>
                          <span>{(message.body.replyTo as { text?: string }).text}</span>
                        </blockquote>
                      ) : null}
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

            {/* 이모지 퐁퐁 오버레이 — 스레드 우하단(컴포저 위)에서 이모지가 떠오른다. 높이 0 앵커라 레이아웃 영향 없음. */}
            <EmojiSplashLayer chatRoomId={activeChatRoomId} />

            {selectedRoom && typingIndicatorText ? (
              <div aria-live="polite" className="workspace-route__typing-line" role="status">
                <span aria-hidden className="workspace-route__typing-line-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>{typingIndicatorText}</span>
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
                {replyToMessage ? (
                  <div className="workspace-route__reply-preview">
                    <span>
                      <CornerUpLeft aria-hidden size={13} strokeWidth={2} />
                      {t("chat.reply.replyingTo", { name: replyToMessage.sender.name })}
                    </span>
                    <span className="workspace-route__reply-preview-text">{displayMessageText(t, replyToMessage)}</span>
                    <button
                      aria-label={t("chat.reply.cancelAria")}
                      onClick={() => setReplyToMessage(null)}
                      type="button"
                    >
                      <X aria-hidden size={13} strokeWidth={2} />
                    </button>
                  </div>
                ) : null}
                {agentAutocomplete.open ? (
                  <AgentCommandAutocomplete
                    activeIndex={agentAutocomplete.activeIndex}
                    items={agentAutocomplete.items}
                    onHoverItem={agentAutocomplete.setActiveIndex}
                    onPick={agentAutocomplete.pick}
                    tone="glass"
                  />
                ) : null}
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
                      // 카카오톡식 타이핑 신호 — 릴레이 미지원이면 내부에서 no-op.
                      if (event.target.value.trim()) {
                        notifyTypingActivity();
                      } else {
                        stopTypingPublish();
                      }
                    }}
                    onFocus={() => setComposerActive(true)}
                    onKeyDown={(event) => {
                      // 자동완성이 열려 있으면 ↑/↓/Tab/Enter/Esc는 팝오버가 먼저 소비한다.
                      if (agentAutocomplete.handleKeyDown(event)) return;
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
                      // /bubli 에이전트는 프로젝트룸 대화 전용 — 1:1/그룹에서는 언급하지 않는다.
                      <span>{selectedRoom.chatType === "ROOM" ? t("chat.composer.hint") : t("chat.composer.hintDirect")}</span>
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
                <div>
                  <Search aria-hidden size={16} strokeWidth={2} />
                  <input
                    aria-label={t("chat.social.searchLabel")}
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
                          <button disabled={busyFriendRequestId !== null} onClick={() => void respondFriendRequest(request, "accept")} type="button">{t("chat.requests.accept")}</button>
                          <button disabled={busyFriendRequestId !== null} onClick={() => void respondFriendRequest(request, "reject")} type="button">{t("chat.requests.reject")}</button>
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
                        <button aria-label={selected ? t("chat.newRoom.deselect") : t("chat.newRoom.selectForGroup")} aria-pressed={selected} className="workspace-route__group-select" onClick={() => toggleGroupMember(friend.friendUserId)} type="button">
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
