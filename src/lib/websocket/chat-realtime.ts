import { getAuthAccessToken } from "@/lib/auth/auth-session";

// 채팅 화면 전용 STOMP 실시간 클라이언트.
//
// 백엔드 계약(검증됨):
// - STOMP 엔드포인트: NEXT_PUBLIC_WS_URL (예: ws://localhost:8080/ws)
// - CONNECT 프레임에 Authorization: Bearer {accessToken}
// - /topic/chat/{chatRoomId} 에는 RealtimeEnvelope가 아니라 ChatMessageResponse JSON이
//   그대로 발행된다(WebSocketPublishPublicServiceImpl.publishChatMessage 참고).
//   → 기존 lib/realtime 브라우저 클라이언트는 envelope(eventId/eventType)만 파싱해
//     채팅 프레임을 버리므로, 여기서는 destination 기반으로 원본 JSON을 그대로 전달한다.
// - SUBSCRIBE는 서버(WebSocketSubscriptionAuthorizationService)가 destination 단위로
//   인가하며, 허용되지 않은 destination을 구독하면 세션 전체가 ERROR로 끊긴다.
//   → 아직 서버에 없는 타이핑 토픽 구독은 반드시 플래그로 막아야 한다(아래 참고).

export type ChatRealtimeMessageHandler = (data: unknown) => void;

export type ChatRealtimeClient = {
  /** STOMP CONNECTED 상태 여부 — publish 가능 여부 판단에 사용. */
  isOpen: () => boolean;
  /** 재연결(끊김 후 CONNECTED 복구) 시 호출 — 놓친 메시지 재조회 트리거용. */
  onReconnect: (handler: () => void) => () => void;
  /** SEND 프레임 발행. 연결이 열려 있지 않으면 조용히 false를 반환한다. */
  publish: (destination: string, payload: unknown) => boolean;
  /** destination 구독. 해제 함수를 반환하며, 재연결 시 자동 재구독된다. */
  subscribe: (destination: string, handler: ChatRealtimeMessageHandler) => () => void;
};

// ---------------------------------------------------------------------------
// 사람(휴먼) 타이핑 릴레이 — 백엔드 미구현 상태의 프론트 선행 구현.
//
// 백엔드에는 아직 타이핑 릴레이가 없다. 아래 두 가지가 추가되면
// NEXT_PUBLIC_CHAT_TYPING_RELAY=1 로 켜기만 하면 동작한다.
//
// 1) @MessageMapping 릴레이 컨트롤러 (신규):
//    @Controller
//    public class ChatTypingController {
//      @MessageMapping("/chat/{chatRoomId}/typing")   // 클라이언트 SEND: /app/chat/{id}/typing
//      public void relay(@DestinationVariable UUID chatRoomId,
//                        @Payload ChatTypingSignalRequest signal,
//                        Principal principal) {
//        AuthUser authUser = ...; // principal(UsernamePasswordAuthenticationToken)에서 추출
//        // SEND 프레임은 WebSocketAuthChannelInterceptor가 인가하지 않으므로 여기서 멤버십 검증 필수
//        chatRoomAccessPublicService.assertActiveMember(authUser.userId(), chatRoomId);
//        messagingTemplate.convertAndSend(
//            "/topic/chat/" + chatRoomId + "/typing",
//            // userId/userName은 클라이언트 값을 믿지 말고 principal 기준으로 다시 채운다
//            new ChatTypingSignal(chatRoomId, authUser.userId(), authUser.name(), signal.typing()));
//      }
//    }
//
// 2) WebSocketSubscriptionAuthorizationService에 구독 인가 패턴 추가:
//    private static final Pattern CHAT_TYPING_TOPIC =
//        Pattern.compile("^/topic/chat/([0-9a-fA-F-]{36})/typing$");
//    // authorize()에서 CHAT_TOPIC과 동일하게 chatRoomAccessPublicService.assertActiveMember(...) 호출
//
// 페이로드 계약(양방향 동일):
//    { "chatRoomId": string, "typing": boolean, "userId": string, "userName": string }
// ---------------------------------------------------------------------------

export const chatTypingDestinations = {
  publish: (chatRoomId: string) => `/app/chat/${chatRoomId}/typing`,
  subscribe: (chatRoomId: string) => `/topic/chat/${chatRoomId}/typing`,
} as const;

// 서버 릴레이 없이 타이핑 토픽을 구독하면 서버가 세션을 ERROR로 끊어 채팅 실시간까지
// 망가지므로, 백엔드 배포 전까지는 기본 OFF. 배포 후 env로 켠다.
export function isChatTypingRelaySupported(): boolean {
  const flag = process.env.NEXT_PUBLIC_CHAT_TYPING_RELAY ?? "";
  return flag === "1" || flag.toLowerCase() === "true";
}

type ChatRealtimeSubscription = {
  destination: string;
  handler: ChatRealtimeMessageHandler;
  id: string;
};

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
// 방 전환처럼 구독이 잠깐 0이 되는 순간에 소켓을 끊지 않도록 유예를 둔다.
const IDLE_CLOSE_DELAY_MS = 15000;
// 한 번도 연결에 성공한 적이 없으면(서버 꺼짐/프리뷰) 무한 재시도 대신 멈추고,
// 온라인 복귀·탭 활성화 때 다시 시도한다 — 콘솔 스팸 방지.
const MAX_COLD_ATTEMPTS = 8;

let chatRealtimeSingleton: ChatRealtimeClient | null = null;

export function getChatRealtimeClient(): ChatRealtimeClient {
  if (!chatRealtimeSingleton) {
    chatRealtimeSingleton = createChatRealtimeClient();
  }
  return chatRealtimeSingleton;
}

function createChatRealtimeClient(): ChatRealtimeClient {
  const url = process.env.NEXT_PUBLIC_WS_URL;
  const canUseSocket =
    Boolean(url) && typeof window !== "undefined" && typeof WebSocket !== "undefined";

  const subscriptions = new Map<string, ChatRealtimeSubscription>();
  const reconnectHandlers = new Set<() => void>();

  let socket: WebSocket | null = null;
  let stompConnected = false;
  let everConnected = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let idleCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let nextSubscriptionSerial = 0;

  function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
    if (timer) clearTimeout(timer);
  }

  function safeSend(frame: string): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(frame);
      return true;
    } catch {
      return false;
    }
  }

  function sendSubscribeFrame(subscription: ChatRealtimeSubscription) {
    if (!stompConnected) return;
    safeSend(
      encodeStompFrame("SUBSCRIBE", {
        ack: "auto",
        destination: subscription.destination,
        id: subscription.id,
      }),
    );
  }

  function scheduleReconnect() {
    if (reconnectTimer || subscriptions.size === 0) return;
    if (!everConnected && reconnectAttempt >= MAX_COLD_ATTEMPTS) return;
    const delay = Math.min(
      RECONNECT_MAX_DELAY_MS,
      RECONNECT_BASE_DELAY_MS * 2 ** Math.min(reconnectAttempt, 5),
    );
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function handleFrames(raw: string) {
    for (const frame of parseStompFrames(raw)) {
      if (frame.command === "CONNECTED") {
        stompConnected = true;
        reconnectAttempt = 0;
        const isRecovery = everConnected;
        everConnected = true;
        subscriptions.forEach((subscription) => sendSubscribeFrame(subscription));
        if (isRecovery) {
          // 재구독을 먼저 끝낸 뒤 알림 — 핸들러가 REST 재조회로 공백을 메운다.
          reconnectHandlers.forEach((handler) => {
            try {
              handler();
            } catch {
              // 재연결 핸들러 실패는 다른 핸들러에 영향 주지 않게 무시
            }
          });
        }
        continue;
      }
      if (frame.command === "MESSAGE") {
        const subscriptionId = frame.headers.subscription;
        const destination = frame.headers.destination;
        const target =
          (subscriptionId ? subscriptions.get(subscriptionId) : undefined) ??
          (destination
            ? [...subscriptions.values()].find((item) => item.destination === destination)
            : undefined);
        if (!target) continue;
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(frame.body) as unknown;
        } catch {
          continue;
        }
        try {
          target.handler(parsed);
        } catch {
          // 구독 핸들러 예외로 소켓 처리 루프가 중단되지 않게 한다
        }
        continue;
      }
      if (frame.command === "ERROR") {
        // 서버가 세션을 거부(인증/인가 실패 등) — 닫고 백오프로 재시도.
        try {
          socket?.close();
        } catch {
          // 이미 닫힌 소켓 무시
        }
      }
    }
  }

  function connect() {
    if (!canUseSocket || socket || subscriptions.size === 0) return;

    let nextSocket: WebSocket;
    try {
      nextSocket = new WebSocket(url as string);
    } catch {
      scheduleReconnect();
      return;
    }

    socket = nextSocket;
    nextSocket.onopen = () => {
      let token: string | null = null;
      try {
        token = getAuthAccessToken();
      } catch {
        token = null;
      }
      if (!token || nextSocket.readyState !== WebSocket.OPEN) {
        nextSocket.close();
        return;
      }
      nextSocket.send(
        encodeStompFrame("CONNECT", {
          Authorization: `Bearer ${token}`,
          "accept-version": "1.2",
          "heart-beat": "0,0",
        }),
      );
    };
    nextSocket.onmessage = (message) => {
      if (typeof message.data === "string") {
        handleFrames(message.data);
      }
    };
    nextSocket.onerror = () => {
      try {
        nextSocket.close();
      } catch {
        // 이미 닫힌 소켓 무시
      }
    };
    nextSocket.onclose = () => {
      if (socket === nextSocket) {
        socket = null;
      }
      stompConnected = false;
      scheduleReconnect();
    };
  }

  function wakeUp() {
    if (subscriptions.size === 0) return;
    // 절전/오프라인에서 돌아오면 대기 중인 백오프를 앞당겨 즉시 재연결한다.
    reconnectAttempt = 0;
    if (reconnectTimer) {
      clearTimer(reconnectTimer);
      reconnectTimer = null;
    }
    if (!socket) {
      connect();
    }
  }

  if (canUseSocket) {
    window.addEventListener("online", wakeUp);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") wakeUp();
    });
  }

  return {
    isOpen() {
      return stompConnected && socket?.readyState === WebSocket.OPEN;
    },
    onReconnect(handler) {
      reconnectHandlers.add(handler);
      return () => {
        reconnectHandlers.delete(handler);
      };
    },
    publish(destination, payload) {
      if (!canUseSocket || !stompConnected) return false;
      let body: string;
      try {
        body = JSON.stringify(payload);
      } catch {
        return false;
      }
      return safeSend(
        encodeStompFrame("SEND", { "content-type": "application/json", destination }, body),
      );
    },
    subscribe(destination, handler) {
      if (!canUseSocket) {
        return () => undefined;
      }

      const subscription: ChatRealtimeSubscription = {
        destination,
        handler,
        id: `chat-sub-${nextSubscriptionSerial++}`,
      };
      subscriptions.set(subscription.id, subscription);

      if (idleCloseTimer) {
        clearTimer(idleCloseTimer);
        idleCloseTimer = null;
      }

      if (!socket) {
        reconnectAttempt = 0;
        if (reconnectTimer) {
          clearTimer(reconnectTimer);
          reconnectTimer = null;
        }
        connect();
      } else {
        sendSubscribeFrame(subscription);
      }

      return () => {
        if (!subscriptions.delete(subscription.id)) return;
        if (stompConnected) {
          safeSend(encodeStompFrame("UNSUBSCRIBE", { id: subscription.id }));
        }
        if (subscriptions.size === 0 && !idleCloseTimer) {
          idleCloseTimer = setTimeout(() => {
            idleCloseTimer = null;
            if (subscriptions.size === 0) {
              if (reconnectTimer) {
                clearTimer(reconnectTimer);
                reconnectTimer = null;
              }
              const current = socket;
              socket = null;
              stompConnected = false;
              try {
                current?.close();
              } catch {
                // 이미 닫힌 소켓 무시
              }
            }
          }, IDLE_CLOSE_DELAY_MS);
        }
      };
    },
  };
}

type StompFrame = {
  body: string;
  command: string;
  headers: Record<string, string>;
};

function encodeStompFrame(command: string, headers: Record<string, string>, body = "") {
  const headerText = Object.entries(headers)
    .map(([key, value]) => `${key}:${value}`)
    .join("\n");

  return `${command}\n${headerText}\n\n${body}\0`;
}

function parseStompFrames(raw: string): StompFrame[] {
  return raw
    .split("\0")
    .map((frame) => frame.replace(/^\s+/, ""))
    .filter((frame) => frame.length > 0)
    .map(parseStompFrame);
}

function parseStompFrame(raw: string): StompFrame {
  const separatorIndex = raw.indexOf("\n\n");
  const head = separatorIndex >= 0 ? raw.slice(0, separatorIndex) : raw;
  const body = separatorIndex >= 0 ? raw.slice(separatorIndex + 2).replace(/\0+$/, "") : "";
  const [command = "", ...headerLines] = head.split("\n");
  const headers = Object.fromEntries(
    headerLines
      .map((line) => {
        const separator = line.indexOf(":");
        return separator >= 0 ? [line.slice(0, separator), line.slice(separator + 1)] : null;
      })
      .filter((entry): entry is [string, string] => Boolean(entry)),
  );

  return { body, command: command.trim(), headers };
}
