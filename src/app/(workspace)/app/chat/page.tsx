"use client";

import { Check, Copy, MessageCircle, Mic, MoreHorizontal, Paperclip, Phone, Search, Send, Smile, UserPlus, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { authApi } from "@/features/auth/api/authApi";
import { chatApi } from "@/features/communication/api/chatApi";
import { friendApi } from "@/features/communication/api/friendApi";
import { voiceApi } from "@/features/communication/api/voiceApi";
import { ApiClientError } from "@/lib/api/errors";
import { getActiveProjectRoomId, getActiveProjectRoomLabel, setActiveProjectRoomId } from "@/lib/workspace-active-room";
import {
  shouldUseWorkspacePreviewData,
  workspacePreviewChatMessages,
  workspacePreviewChatRoomsFor,
  workspacePreviewUser,
} from "@/lib/workspace-preview-data";
import type { AuthUser } from "@/types/api/auth";
import type { ChatMessageResponse, ChatRoomResponse } from "@/types/api/chat";
import type { FriendRequestResponse, FriendResponse, FriendSearchResponse } from "@/types/api/friend";
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
      bubliId: "maren",
      name: "Maren",
      userId: workspacePreviewUser.id,
    },
    requester: {
      bubliId: "copy-editor",
      name: "카피 에디터",
      userId: "preview-requester-1",
    },
    status: "PENDING",
  },
];

const previewFriendSearchResults: FriendSearchResponse[] = [
  {
    bubliId: "motion-editor",
    name: "모션 에디터",
    userId: "preview-search-friend-1",
  },
  {
    bubliId: "voice-partner",
    name: "보이스 파트너",
    userId: "preview-search-friend-2",
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
  const text = body.text ?? body.message ?? body.content;

  if (typeof text === "string" && text.trim()) return text;
  if (message.messageType === "AGENT_COMMAND") return "에이전트 명령";
  if (message.messageType === "AGENT_RESPONSE") return "에이전트 응답";
  if (message.messageType === "FILE") return "첨부 자료";
  return "메시지";
}

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

function voiceParticipantStatusLabel(status: VoiceParticipantResponse["status"]) {
  if (status === "JOINED") return "참여 중";
  if (status === "LEFT") return "나감";
  return "연결 끊김";
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
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [copiedBubliId, setCopiedBubliId] = useState(false);
  const [voiceExpanded, setVoiceExpanded] = useState(false);
  const [composerActive, setComposerActive] = useState(false);
  const [selectedAttachmentName, setSelectedAttachmentName] = useState<string | null>(null);
  const [emoticonOpen, setEmoticonOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const roomMode = selectedRoom?.chatType === "DIRECT" || queryMode === "direct" ? "direct" : "room";
  const visibleRooms = useMemo(() => {
    if (roomsState.kind !== "ready") return [];
    if (roomMode === "direct") return roomsState.rooms.filter((room) => room.chatType === "DIRECT");
    if (queryRoomId) return roomsState.rooms.filter((room) => room.roomId === queryRoomId);
    return roomsState.rooms.filter((room) => room.chatType === "ROOM");
  }, [queryRoomId, roomMode, roomsState]);
  const roomConversationCount = roomsState.kind === "ready" ? roomsState.rooms.filter((room) => room.chatType === "ROOM").length : 0;
  const directConversationCount = roomsState.kind === "ready" ? roomsState.rooms.filter((room) => room.chatType === "DIRECT").length : 0;
  const friendCount = socialState.kind === "ready" ? socialState.friends.length : directConversationCount;
  const pendingFriendRequestCount = socialState.kind === "ready" ? socialState.requests.filter((request) => request.status === "PENDING").length : 0;
  const currentUser = profileState.kind === "ready" ? profileState.user : workspacePreviewUser;
  const myBubliId = currentUser.bubliId;
  const voiceParticipants = useMemo<VoiceParticipantResponse[]>(() => {
    if (voiceState.kind === "ready") return voiceState.room.participants;

    const now = new Date().toISOString();
    const me: VoiceParticipantResponse = {
      joinedAt: now,
      name: currentUser.name,
      status: "JOINED",
      userId: currentUser.id,
    };

    if (selectedRoom?.chatType === "DIRECT") {
      const directFriend = socialState.kind === "ready" ? socialState.friends.find((friend) => selectedRoom.name?.includes(friend.name)) : null;
      return directFriend
        ? [
            me,
            {
              joinedAt: now,
              name: directFriend.name,
              status: "JOINED",
              userId: directFriend.friendUserId,
            },
          ]
        : [me];
    }

    if (selectedRoom?.chatType === "ROOM") {
      return [
        me,
        ...previewFriends.slice(0, 2).map((friend, index) => ({
          joinedAt: now,
          name: friend.name,
          status: index === 0 ? ("JOINED" as const) : ("DISCONNECTED" as const),
          userId: friend.friendUserId,
        })),
      ];
    }

    return [me];
  }, [currentUser, selectedRoom, socialState, voiceState]);

  const loadRooms = useCallback(async () => {
    setRoomsState({ kind: "loading" });

    if (shouldUseWorkspacePreviewData()) {
      const storedRoomId = getActiveProjectRoomId();
      setRoomsState({
        kind: "ready",
        rooms: workspacePreviewChatRoomsFor(queryRoomId, storedRoomId === queryRoomId ? getActiveProjectRoomLabel() : null),
      });
      return;
    }

    try {
      const page = await chatApi.listRooms();
      setRoomsState({ kind: "ready", rooms: page.items });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setRoomsState({ kind: "auth" });
        return;
      }
      setRoomsState({ kind: "offline" });
    }
  }, [queryRoomId]);

  const loadMessages = useCallback(async (chatRoomId: string) => {
    setMessagesState({ kind: "loading" });

    if (shouldUseWorkspacePreviewData()) {
      setMessagesState({ kind: "ready", messages: workspacePreviewChatMessages(chatRoomId) });
      return;
    }

    try {
      const page = await chatApi.getMessages(chatRoomId, { size: 40 });
      setMessagesState({ kind: "ready", messages: [...page.items].sort((a, b) => a.roomSequence - b.roomSequence) });
    } catch {
      setMessagesState({ kind: "offline" });
    }
  }, []);

  const loadSocial = useCallback(async () => {
    setSocialState({ kind: "loading" });

    if (shouldUseWorkspacePreviewData()) {
      setSocialState({ friends: previewFriends, kind: "ready", requests: previewFriendRequests });
      return;
    }

    const [friends, requests] = await Promise.allSettled([friendApi.listFriends(), friendApi.listRequests()]);

    if (friends.status === "rejected" && requests.status === "rejected") {
      setSocialState({ kind: "offline" });
      return;
    }

    setSocialState({
      friends: friends.status === "fulfilled" ? friends.value : [],
      kind: "ready",
      requests: requests.status === "fulfilled" ? requests.value : [],
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setProfileState({ kind: "loading" });

    if (shouldUseWorkspacePreviewData()) {
      setProfileState({ kind: "ready", user: workspacePreviewUser });
      return;
    }

    try {
      const user = await authApi.getMe();
      setProfileState({ kind: "ready", user });
    } catch {
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
  }, [selectedRoom]);

  function selectChatRoom(room: ChatRoomResponse) {
    setSelectedChatRoomId(room.id);
    setVoiceState({ kind: "idle" });
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

      if (shouldUseWorkspacePreviewData()) {
        const createdAt = new Date().toISOString();
        const previewRoom: ChatRoomResponse = {
          chatType: "DIRECT",
          createdAt,
          id: `preview-direct-${friend.friendUserId}`,
          name: `${friend.name}와 1:1`,
          roomId: null,
          status: "ACTIVE",
          updatedAt: createdAt,
        };

        setRoomsState({ kind: "ready", rooms: [...roomsState.rooms, previewRoom] });
        setSelectedChatRoomId(previewRoom.id);
        return;
      }

      try {
        const room = await chatApi.getOrCreateDirectRoom({ targetUserId: friend.friendUserId });
        setRoomsState({ kind: "ready", rooms: [room, ...roomsState.rooms.filter((item) => item.id !== room.id)] });
        setSelectedChatRoomId(room.id);
      } catch {
        setSocialState({ kind: "offline" });
      }
    },
    [roomsState],
  );

  const respondFriendRequest = useCallback(
    async (request: FriendRequestResponse, action: "accept" | "reject") => {
      if (socialState.kind !== "ready") return;

      if (shouldUseWorkspacePreviewData()) {
        const nextRequests = socialState.requests.filter((item) => item.id !== request.id);
        const nextFriends =
          action === "accept"
            ? [
                ...socialState.friends,
                {
                  avatarUrl: request.requester.avatarUrl,
                  bubliId: request.requester.bubliId,
                  friendUserId: request.requester.userId,
                  name: request.requester.name,
                },
              ]
            : socialState.friends;
        setSocialState({ friends: nextFriends, kind: "ready", requests: nextRequests });
        return;
      }

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

    if (shouldUseWorkspacePreviewData()) {
      const pool = [...previewFriendSearchResults, ...previewFriends.map(({ friendUserId, ...friend }) => ({ ...friend, userId: friendUserId }))];
      const results = pool.filter((person) => person.bubliId.includes(query) || person.name.includes(query));
      setFriendSearchState(results.length > 0 ? { kind: "ready", results } : { kind: "empty" });
      return;
    }

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

      if (shouldUseWorkspacePreviewData()) {
        const createdAt = new Date().toISOString();
        const nextRequest: FriendRequestResponse = {
          createdAt,
          direction: "SENT",
          id: `preview-request-${target.userId}`,
          receiver: target,
          requester: {
            avatarUrl: currentUser.avatarUrl,
            bubliId: currentUser.bubliId,
            name: currentUser.name,
            userId: currentUser.id,
          },
          status: "PENDING",
        };

        setSocialState({
          friends: socialState.friends,
          kind: "ready",
          requests: [nextRequest, ...socialState.requests.filter((request) => request.id !== nextRequest.id)],
        });
        setFriendSearchState({ kind: "sent", targetName: target.name });
        return;
      }

      try {
        await friendApi.sendRequest({ receiverUserId: target.userId });
        setFriendSearchState({ kind: "sent", targetName: target.name });
        await loadSocial();
      } catch {
        setFriendSearchState({ kind: "offline" });
      }
    },
    [currentUser, loadSocial, socialState],
  );

  const startVoice = useCallback(async () => {
    if (!selectedRoom?.roomId) {
      setVoiceState({
        kind: "blocked",
        message: "1:1 보이스는 서버 방 연결이 필요합니다. 지금은 프로젝트룸 보이스부터 시작할 수 있습니다.",
      });
      return;
    }

    setVoiceState({ kind: "starting" });

    if (shouldUseWorkspacePreviewData()) {
      setVoiceState({
        kind: "ready",
        room: {
          id: `preview-voice-${selectedRoom.roomId}`,
          livekitRoomName: `bubli-preview-${selectedRoom.roomId}`,
          participants: [
            {
              joinedAt: new Date().toISOString(),
              name: workspacePreviewUser.name,
              status: "JOINED",
              userId: workspacePreviewUser.id,
            },
          ],
          roomId: selectedRoom.roomId,
          status: "OPEN",
        },
      });
      return;
    }

    try {
      const room = await voiceApi.createRoom({ roomId: selectedRoom.roomId });
      setVoiceState({ kind: "ready", room });
    } catch {
      setVoiceState({ kind: "blocked", message: "보이스를 시작하지 못했습니다. 서버 상태를 확인하세요." });
    }
  }, [selectedRoom]);


  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!activeChatRoomId || (!text && !selectedAttachmentName)) return;
    const messageType = selectedAttachmentName && !text ? "FILE" : "TEXT";
    const messageBody = selectedAttachmentName
      ? {
          attachmentName: selectedAttachmentName,
          text: text || `첨부: ${selectedAttachmentName}`,
        }
      : { text };

    setSending(true);

    try {
      if (shouldUseWorkspacePreviewData()) {
        const currentMessages = messagesState.kind === "ready" ? messagesState.messages : [];
        const nextSequence = Math.max(0, ...currentMessages.map((message) => message.roomSequence)) + 1;
        const createdAt = new Date().toISOString();
        const nextMessage: ChatMessageResponse = {
          body: messageBody,
          chatRoomId: activeChatRoomId,
          clientMessageId: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `preview-${createdAt}`,
          createdAt,
          id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `preview-message-${createdAt}`,
          messageType,
          roomSequence: nextSequence,
          sender: {
            id: workspacePreviewUser.id,
            name: workspacePreviewUser.name,
            type: "USER",
          },
        };

        setMessagesState({ kind: "ready", messages: [...currentMessages, nextMessage] });
        setDraft("");
        setSelectedAttachmentName(null);
        setEmoticonOpen(false);
        return;
      }

      await chatApi.sendMessage(activeChatRoomId, {
        body: messageBody,
        clientMessageId: crypto.randomUUID(),
        messageType,
      });
      setDraft("");
      setSelectedAttachmentName(null);
      setEmoticonOpen(false);
      await loadMessages(activeChatRoomId);
    } finally {
      setSending(false);
    }
  }, [activeChatRoomId, draft, loadMessages, messagesState, selectedAttachmentName]);

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
            1:1
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
              <span>{selectedRoom?.chatType === "ROOM" ? "프로젝트룸에서 시작" : "1:1은 서버 연결 준비"}</span>
            </div>
          </article>
        </section>
      ) : null}

      {roomsState.kind === "ready" && roomsState.rooms.length > 0 ? (
        <div className="workspace-route__chat">
          <aside className="workspace-route__section workspace-route__chat-list" aria-label="대화방">
            <div className="workspace-route__chat-list-head">
              <strong>{roomMode === "direct" ? "친구와 1:1" : isProjectRoomScoped ? "현재 프로젝트룸 대화" : "프로젝트룸 대화"}</strong>
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
              <span className="workspace-route__empty">{roomMode === "direct" ? "아직 1:1 대화가 없습니다" : "프로젝트룸 대화가 없습니다"}</span>
            ) : null}
          </aside>

          <GlassPanel className="workspace-route__section workspace-route__thread">
            <div className="workspace-route__section-head">
              <div>
                <strong>{selectedRoom?.name ?? "대화"}</strong>
                {selectedRoom ? (
                  <span>{selectedRoom.chatType === "ROOM" ? "이 프로젝트룸에 묶인 대화" : "친구와 1:1 대화"}</span>
                ) : null}
              </div>
              <div className="workspace-route__thread-actions">
                {selectedRoom?.chatType === "ROOM" && selectedRoom.roomId ? (
                  <Link className="bubli-button" href={`/app/project-rooms/${selectedRoom.roomId}`}>
                    프로젝트룸
                  </Link>
                ) : null}
                <Button disabled={voiceState.kind === "starting"} loading={voiceState.kind === "starting"} onClick={() => void startVoice()} type="button" variant="quiet">
                  보이스
                </Button>
              </div>
            </div>
            {selectedRoom ? (
              <button
                aria-expanded={voiceExpanded}
                className="workspace-route__voice-status workspace-route__voice-status--interactive"
                onClick={() => setVoiceExpanded((open) => !open)}
                type="button"
              >
                <Phone size={15} strokeWidth={2} aria-hidden="true" />
                <span>{voiceState.kind === "ready" ? "보이스 열림" : selectedRoom.chatType === "ROOM" ? "보이스 대기" : "1:1 보이스 준비 중"}</span>
                <span className="workspace-route__voice-stack" aria-label={`참여자 ${voiceParticipants.length}명`}>
                  {voiceParticipants.slice(0, 3).map((participant) => (
                    <i data-status={participant.status.toLowerCase()} key={participant.userId}>
                      {initialOf(participant.name)}
                    </i>
                  ))}
                </span>
              </button>
            ) : null}
            {voiceState.kind === "blocked" ? <div className="workspace-route__voice-status workspace-route__voice-status--blocked">{voiceState.message}</div> : null}

            {messagesState.kind === "loading" ? <span className="workspace-route__empty">메시지를 불러오는 중</span> : null}
            {messagesState.kind === "offline" ? <span className="workspace-route__empty">메시지를 불러오지 못했습니다</span> : null}
            {messagesState.kind === "ready" && messagesState.messages.length === 0 ? (
              <span className="workspace-route__empty">첫 메시지를 남겨보세요</span>
            ) : null}

            {messagesState.kind === "ready" && messagesState.messages.length > 0 ? (
              <div className="workspace-route__messages">
                {messagesState.messages.map((message) => {
                  const isMine = message.sender.id === workspacePreviewUser.id;
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
                          <button aria-label="메시지 복사" onClick={() => void navigator.clipboard.writeText(messageText(message))} type="button">
                            <Copy aria-hidden size={13} strokeWidth={2} />
                          </button>
                          <button aria-label="메시지 더보기" type="button">
                            <MoreHorizontal aria-hidden size={13} strokeWidth={2} />
                          </button>
                        </span>
                      </div>
                      <p>{messageText(message)}</p>
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
                    onChange={(event) => setDraft(event.target.value)}
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
                    ) : (
                      <span>Shift+Enter 줄바꿈</span>
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

          <aside className="workspace-route__section workspace-route__chat-social" aria-label="친구와 보이스">
            <div className="workspace-route__chat-list-head">
              <strong>사람</strong>
              <span>{friendCount}</span>
            </div>

            <div className="workspace-route__my-code">
              <div>
                <small>내 Bubli ID</small>
                <strong>{myBubliId}</strong>
              </div>
              <button aria-label="내 Bubli ID 복사" onClick={() => void copyMyBubliId()} type="button">
                {copiedBubliId ? <Check aria-hidden size={15} strokeWidth={2.2} /> : <Copy aria-hidden size={15} strokeWidth={2} />}
                {copiedBubliId ? "복사됨" : "복사"}
              </button>
            </div>

            <form
              className="workspace-route__friend-search"
              onSubmit={(event) => {
                event.preventDefault();
                void searchFriend();
              }}
            >
              <label htmlFor="friend-code-search">친구 추가</label>
              <div>
                <Search aria-hidden size={16} strokeWidth={2} />
                <input
                  autoComplete="off"
                  id="friend-code-search"
                  onChange={(event) => {
                    setFriendSearchQuery(event.target.value);
                    if (!event.target.value.trim()) setFriendSearchState({ kind: "idle" });
                  }}
                  placeholder="Bubli ID 입력"
                  value={friendSearchQuery}
                />
                <button aria-label="친구 검색" type="submit">
                  <UserPlus aria-hidden size={15} strokeWidth={2} />
                </button>
              </div>
            </form>

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
                        {alreadyFriend ? "친구" : "요청"}
                      </button>
                    </div>
                  );
                })
              : null}

            <div className="workspace-route__friend-panel" aria-label="친구와 1:1">
              <div className="workspace-route__chat-list-head">
                <strong>친구 / 1:1</strong>
                <span>{friendCount}</span>
              </div>
              {socialState.kind === "loading" ? <span className="workspace-route__empty">친구 목록을 불러오는 중</span> : null}
              {socialState.kind === "offline" ? <span className="workspace-route__empty">친구 목록을 불러오지 못했습니다</span> : null}
              {socialState.kind === "ready" && socialState.friends.length === 0 ? <span className="workspace-route__empty">아직 친구가 없습니다</span> : null}
              {socialState.kind === "ready"
                ? socialState.friends.slice(0, 5).map((friend) => (
                    <button className="workspace-route__friend-row" key={friend.friendUserId} onClick={() => void openDirectRoom(friend)} type="button">
                      <span aria-hidden="true">{initialOf(friend.name)}</span>
                      <div>
                        <strong>{friend.name}</strong>
                        <small>1:1 대화 열기 · {friend.bubliId}</small>
                      </div>
                    </button>
                  ))
                : null}
            </div>

            <div className="workspace-route__friend-panel" aria-label="친구 요청">
              <div className="workspace-route__chat-list-head">
                <strong>친구 요청</strong>
                <span>{pendingFriendRequestCount}</span>
              </div>
              {socialState.kind === "ready" && socialState.requests.filter((request) => request.status === "PENDING").length === 0 ? (
                <span className="workspace-route__empty">대기 중인 요청이 없습니다</span>
              ) : null}
              {socialState.kind === "ready"
                ? socialState.requests
                    .filter((request) => request.status === "PENDING")
                    .slice(0, 4)
                    .map((request) => (
                      <div className="workspace-route__friend-request" key={request.id}>
                        <div>
                          <strong>{request.direction === "RECEIVED" ? request.requester.name : request.receiver.name}</strong>
                          <small>{request.direction === "RECEIVED" ? "친구 요청 도착" : "요청 보냄"}</small>
                        </div>
                        {request.direction === "RECEIVED" ? (
                          <div>
                            <button onClick={() => void respondFriendRequest(request, "accept")} type="button">
                              수락
                            </button>
                            <button onClick={() => void respondFriendRequest(request, "reject")} type="button">
                              거절
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                : null}
            </div>

            <div className="workspace-route__voice-card" aria-label="보이스 참여자">
              <div className="workspace-route__chat-list-head">
                <strong>보이스</strong>
                <span>{voiceParticipants.length}</span>
              </div>
              <button
                className="workspace-route__voice-card-main"
                disabled={voiceState.kind === "starting"}
                onClick={() => void startVoice()}
                type="button"
              >
                <Phone aria-hidden size={17} strokeWidth={2} />
                <div>
                  <strong>{selectedRoom?.chatType === "ROOM" ? "프로젝트룸 보이스" : "1:1 보이스"}</strong>
                  <small>{voiceState.kind === "ready" ? "열림" : selectedRoom?.chatType === "ROOM" ? "시작 가능" : "확장 준비"}</small>
                </div>
              </button>
              {voiceExpanded || voiceState.kind === "ready" ? (
                <div className="workspace-route__voice-people">
                  {voiceParticipants.map((participant, index) => (
                    <div className="workspace-route__voice-person" key={participant.userId}>
                      <span data-status={participant.status.toLowerCase()}>{initialOf(participant.name)}</span>
                      <div>
                        <strong>{participant.name}</strong>
                        <small>{index === 0 && participant.status === "JOINED" ? "말하는 중" : voiceParticipantStatusLabel(participant.status)}</small>
                      </div>
                    </div>
                  ))}
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
