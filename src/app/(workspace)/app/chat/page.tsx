"use client";

import { MessageCircle, Paperclip, Phone, RefreshCw, Send, Smile, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
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
import type { ChatMessageResponse, ChatRoomResponse } from "@/types/api/chat";
import type { FriendRequestResponse, FriendResponse } from "@/types/api/friend";
import type { VoiceRoomResponse } from "@/types/api/voice";

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
  const [voiceState, setVoiceState] = useState<VoiceState>({ kind: "idle" });
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [composerActive, setComposerActive] = useState(false);
  const [selectedAttachmentName, setSelectedAttachmentName] = useState<string | null>(null);
  const [emoticonOpen, setEmoticonOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeChatRoomId = useMemo(() => {
    if (roomsState.kind !== "ready") return null;
    if (queryRoomId) return preferredRoomId(roomsState.rooms, queryRoomId, queryMode);
    return selectedChatRoomId ?? preferredRoomId(roomsState.rooms, queryRoomId, queryMode);
  }, [queryMode, queryRoomId, roomsState, selectedChatRoomId]);

  const selectedRoom = useMemo(() => {
    if (roomsState.kind !== "ready") return null;
    return roomsState.rooms.find((room) => room.id === activeChatRoomId) ?? null;
  }, [activeChatRoomId, roomsState]);
  const roomMode = queryMode === "direct" ? "direct" : "room";
  const visibleRooms = useMemo(() => {
    if (roomsState.kind !== "ready") return [];
    return roomsState.rooms.filter((room) => (roomMode === "direct" ? room.chatType === "DIRECT" : room.chatType === "ROOM"));
  }, [roomMode, roomsState]);
  const roomConversationCount = roomsState.kind === "ready" ? roomsState.rooms.filter((room) => room.chatType === "ROOM").length : 0;
  const directConversationCount = roomsState.kind === "ready" ? roomsState.rooms.filter((room) => room.chatType === "DIRECT").length : 0;
  const friendCount = socialState.kind === "ready" ? socialState.friends.length : directConversationCount;
  const pendingFriendRequestCount = socialState.kind === "ready" ? socialState.requests.filter((request) => request.status === "PENDING").length : 0;

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
    if (room.chatType === "ROOM" && room.roomId) {
      setActiveProjectRoomId(room.roomId, room.name?.replace(/\s*대화$/, "") ?? "프로젝트룸");
    }
  }

  const startVoice = useCallback(async () => {
    if (!selectedRoom?.roomId) {
      setVoiceState({
        kind: "blocked",
        message: "현재 보이스는 프로젝트룸 대화에서 먼저 지원합니다. 1:1 보이스는 연결 준비 중입니다.",
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
          <Button onClick={() => void loadRooms()} variant="primary">
            <RefreshCw aria-hidden size={15} strokeWidth={1.9} />
            다시 연결
          </Button>
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
              <span>{selectedRoom?.chatType === "ROOM" ? "프로젝트룸에서 시작" : "1:1 준비 중"}</span>
            </div>
          </article>
        </section>
      ) : null}

      {roomsState.kind === "ready" && roomsState.rooms.length > 0 ? (
        <div className="workspace-route__chat">
          <aside className="workspace-route__section workspace-route__chat-list" aria-label="대화방">
            <div className="workspace-route__chat-list-head">
              <strong>{roomMode === "direct" ? "친구와 1:1" : "프로젝트룸"}</strong>
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
            {roomMode === "direct" ? (
              <div className="workspace-route__friend-panel" aria-label="친구">
                <div className="workspace-route__chat-list-head">
                  <strong>친구</strong>
                  <span>{friendCount}</span>
                </div>
                {socialState.kind === "loading" ? <span className="workspace-route__empty">친구 목록을 불러오는 중</span> : null}
                {socialState.kind === "offline" ? <span className="workspace-route__empty">친구 목록을 불러오지 못했습니다</span> : null}
                {socialState.kind === "ready" && socialState.friends.length === 0 ? <span className="workspace-route__empty">아직 친구가 없습니다</span> : null}
                {socialState.kind === "ready"
                  ? socialState.friends.slice(0, 4).map((friend) => (
                      <div className="workspace-route__friend-row" key={friend.friendUserId}>
                        <span aria-hidden="true">{friend.name.slice(0, 1)}</span>
                        <div>
                          <strong>{friend.name}</strong>
                          <small>{friend.bubliId}</small>
                        </div>
                      </div>
                    ))
                  : null}
                {pendingFriendRequestCount > 0 ? <span className="workspace-route__pending">{pendingFriendRequestCount}개 요청 확인 필요</span> : null}
              </div>
            ) : null}
          </aside>

          <GlassPanel className="workspace-route__section workspace-route__thread">
            <div className="workspace-route__section-head">
              <div>
                <strong>{selectedRoom?.name ?? "대화"}</strong>
                {selectedRoom ? <span>{roomTypeLabel(selectedRoom)}</span> : null}
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
            {voiceState.kind === "ready" ? (
              <div className="workspace-route__voice-status">
                <Phone size={15} strokeWidth={2} aria-hidden="true" />
                <span>보이스 열림 · {voiceState.room.participants.length}명 참여</span>
              </div>
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
