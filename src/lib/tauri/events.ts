import {
  DATA_CHANGED_EVENT,
  notifyDataChanged,
  type DataChangedDetail,
  type DataChangedDomain,
} from "@/lib/data-changed";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import type { WidgetWindowState } from "@/lib/tauri/commands";

type TauriEvent<TPayload> = {
  payload: TPayload;
};

type TauriListen = <TPayload>(
  eventName: string,
  handler: (event: TauriEvent<TPayload>) => void,
) => Promise<() => Promise<void> | void>;

type TauriUnlisten = () => Promise<void> | void;

export const TAURI_EVENTS = {
  managedFolderWatchEvent: "bubli-managed-folder-watch-event",
  // 메인(하이브리드) 창의 bubli:data-changed(window CustomEvent)를 위젯 버블 창까지,
  // 버블 안 액션을 메인 창까지 실어 나르는 창 간 데이터 변경 브로드캐스트.
  widgetDataChanged: "bubli-widget-data-changed",
  // 바 창의 Bubli 버튼이 상시 실행 중인 메뉴(오브) 창에 "패널 열기"를 요청하는 창 간 이벤트.
  widgetMenuPanelRequested: "bubli-widget-menu-panel-requested",
  widgetRoomContextChanged: "bubli-widget-room-context-changed",
  // 바로 숨었던 창은 웹뷰를 재사용(hide→show)하므로, Rust가 창 상태를 바꿀 때 해당 창
  // 라벨로만 보내는 상태 동기화 이벤트. 새로 빌드되는 창은 URL 쿼리 초기 동기화가 대신한다.
  widgetWindowStateChanged: "bubli-widget-window-state-changed",
  widgetBarItemsChanged: "bubli-widget-bar-items-changed",
  // 통화가 어느 창(chat)에서 시작됐는지와 무관하게 바(bar) 창의 발신 팝업/알림 처리가
  // 그 통화방을 알 수 있도록, 활성 보이스 통화방 id를 창 간에 브로드캐스트한다.
  widgetVoiceCallStateChanged: "bubli-widget-voice-call-state-changed",
  widgetIncomingCallChanged: "bubli-widget-incoming-call-changed",
} as const;

export type ManagedFolderWatchEventPayload = {
  changedCount: number;
  localFolderId: string;
  observedAt: string;
};

export type WidgetRoomContextChangedPayload = {
  selectedRoomId?: string | null;
};

export type WidgetMenuPanelRequestedPayload = {
  requestedAt: number;
};

export type WidgetDataChangedPayload = {
  domain: DataChangedDomain;
  /** 발행한 창(웹뷰) 식별자 — tauri emit은 발행 창 자신에게도 오므로 자기 메아리를 거른다. */
  emitterId: string;
  occurredAt: number;
};

export type WidgetVoiceCallStateChangedPayload = {
  /** 활성 보이스 통화방 id. 통화가 끝나면 null로 브로드캐스트해 다른 창의 발신 팝업도 같이 닫는다. */
  voiceRoomId: string | null;
  emitterId: string;
  occurredAt: number;
};

export type WidgetIncomingCallChangedPayload = {
  // 수신 전화 팝업을 채팅(chat) 창에서 그리기 위해 바(bar) 창이 받은 알림을 그대로 넘긴다.
  // 수락/거절로 채팅 창이 지우면 바 창의 통화음·타임아웃도 같이 멈춰야 하므로 양방향으로 쓴다.
  call: { callerName: string; chatRoomId: string; notificationId: string } | null;
  emitterId: string;
  occurredAt: number;
};

// 창(웹뷰)마다 모듈 로드 시 한 번 만들어지는 발행자 id. Tauri 창 라벨을 읽지 않고도
// "자기 창이 보낸 이벤트"를 구분할 수 있어 emit 브로드캐스트의 자기 수신 루프를 막는다.
const widgetDataChangedEmitterId = `bubli-window-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

async function listenTauriEvent<TPayload>(
  eventName: string,
  handler: (payload: TPayload) => void,
) {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  const { listen } = (await import("@tauri-apps/api/event")) as {
    listen: TauriListen;
  };

  const unlisten = await listen<TPayload>(eventName, (event) => handler(event.payload));
  return onceUnlisten(eventName, unlisten);
}

function onceUnlisten(eventName: string, unlisten: TauriUnlisten) {
  let called = false;

  return () => {
    if (called) return;
    called = true;

    try {
      const result = unlisten();
      if (result && typeof result === "object" && "catch" in result) {
        result.catch((error) => {
          console.warn(`Failed to remove Tauri event listener: ${eventName}`, error);
        });
      }
    } catch (error) {
      console.warn(`Failed to remove Tauri event listener: ${eventName}`, error);
    }
  };
}

export function listenManagedFolderWatchEvents(
  handler: (payload: ManagedFolderWatchEventPayload) => void,
) {
  return listenTauriEvent(TAURI_EVENTS.managedFolderWatchEvent, handler);
}

export function listenWidgetRoomContextChanged(
  handler: (payload: WidgetRoomContextChangedPayload) => void,
) {
  return listenTauriEvent(TAURI_EVENTS.widgetRoomContextChanged, handler);
}

export function listenWidgetMenuPanelRequested(
  handler: (payload: WidgetMenuPanelRequestedPayload) => void,
) {
  return listenTauriEvent(TAURI_EVENTS.widgetMenuPanelRequested, handler);
}

export function listenWidgetWindowStateChanged(
  handler: (payload: WidgetWindowState) => void,
) {
  return listenTauriEvent<WidgetWindowState>(TAURI_EVENTS.widgetWindowStateChanged, handler);
}

export function listenWidgetBarItemsChanged(handler: () => void) {
  return listenTauriEvent<void>(TAURI_EVENTS.widgetBarItemsChanged, () => handler());
}

export async function emitWidgetBarItemsChanged() {
  if (!isTauriRuntime()) return;

  const { emit } = (await import("@tauri-apps/api/event")) as {
    emit: (eventName: string, payload?: unknown) => Promise<void>;
  };

  await emit(TAURI_EVENTS.widgetBarItemsChanged);
}

// Tauri 이벤트 emit은 모든 창(웹뷰)에 브로드캐스트된다 — 바 창 → 메뉴 창 패널 열기 신호에 사용.
export async function emitWidgetMenuPanelRequested() {
  if (!isTauriRuntime()) return;

  const { emit } = (await import("@tauri-apps/api/event")) as {
    emit: (eventName: string, payload?: unknown) => Promise<void>;
  };

  await emit(TAURI_EVENTS.widgetMenuPanelRequested, {
    requestedAt: Date.now(),
  } satisfies WidgetMenuPanelRequestedPayload);
}

// 데이터 변경(todo/schedule/memo/resource/project-room)을 모든 창(웹뷰)에 브로드캐스트한다.
// 메인 창은 bubli:data-changed가 뜰 때, 버블 창은 버블 안 액션이 서버에 반영된 직후 호출한다.
export async function emitWidgetDataChanged(domain: DataChangedDomain) {
  if (!isTauriRuntime()) return;

  const { emit } = (await import("@tauri-apps/api/event")) as {
    emit: (eventName: string, payload?: unknown) => Promise<void>;
  };

  await emit(TAURI_EVENTS.widgetDataChanged, {
    domain,
    emitterId: widgetDataChangedEmitterId,
    occurredAt: Date.now(),
  } satisfies WidgetDataChangedPayload);
}

// 다른 창이 발행한 데이터 변경만 전달한다(자기 창 발행분은 이미 낙관적으로 반영했으므로 무시).
export function listenWidgetDataChanged(handler: (payload: WidgetDataChangedPayload) => void) {
  return listenTauriEvent<WidgetDataChangedPayload>(TAURI_EVENTS.widgetDataChanged, (payload) => {
    if (payload.emitterId === widgetDataChangedEmitterId) return;
    handler(payload);
  });
}

// 통화를 시작/종료한 창이 활성 보이스 통화방 id를 다른 모든 창(특히 바 창)에 알린다 —
// 바 창은 자체적으로는 통화를 시작하지 않으므로 이 브로드캐스트가 없으면 발신 팝업을 띄울
// 방 id를 영영 알 수 없다.
export async function emitWidgetVoiceCallStateChanged(voiceRoomId: string | null) {
  if (!isTauriRuntime()) return;

  const { emit } = (await import("@tauri-apps/api/event")) as {
    emit: (eventName: string, payload?: unknown) => Promise<void>;
  };

  await emit(TAURI_EVENTS.widgetVoiceCallStateChanged, {
    voiceRoomId,
    emitterId: widgetDataChangedEmitterId,
    occurredAt: Date.now(),
  } satisfies WidgetVoiceCallStateChangedPayload);
}

export function listenWidgetVoiceCallStateChanged(handler: (payload: WidgetVoiceCallStateChangedPayload) => void) {
  return listenTauriEvent<WidgetVoiceCallStateChangedPayload>(TAURI_EVENTS.widgetVoiceCallStateChanged, (payload) => {
    if (payload.emitterId === widgetDataChangedEmitterId) return;
    handler(payload);
  });
}

// 수신 전화 팝업을 채팅 창에서 그릴 수 있도록 바 창이 받은 알림을 브로드캐스트한다. 채팅 창이
// 수락/거절해서 null로 지울 때도 같은 채널로 보내 바 창의 통화음·타임아웃 안전망도 같이 멈춘다.
export async function emitWidgetIncomingCallChanged(
  call: WidgetIncomingCallChangedPayload["call"],
) {
  if (!isTauriRuntime()) return;

  const { emit } = (await import("@tauri-apps/api/event")) as {
    emit: (eventName: string, payload?: unknown) => Promise<void>;
  };

  await emit(TAURI_EVENTS.widgetIncomingCallChanged, {
    call,
    emitterId: widgetDataChangedEmitterId,
    occurredAt: Date.now(),
  } satisfies WidgetIncomingCallChangedPayload);
}

export function listenWidgetIncomingCallChanged(handler: (payload: WidgetIncomingCallChangedPayload) => void) {
  return listenTauriEvent<WidgetIncomingCallChangedPayload>(TAURI_EVENTS.widgetIncomingCallChanged, (payload) => {
    if (payload.emitterId === widgetDataChangedEmitterId) return;
    handler(payload);
  });
}

// 브릿지가 메인 창에 재발행하는 window 이벤트의 source — 이 source가 붙은 이벤트는
// 다시 tauri로 내보내지 않아 창 간 메아리 루프를 만들지 않는다.
export const WIDGET_DATA_CHANGED_BRIDGE_SOURCE = "tauri-widget-bridge";

// 메인(하이브리드) 창 전용 양방향 브릿지:
// - window bubli:data-changed → tauri emit(열린 버블 창들이 즉시 조용한 재조회)
// - tauri 수신(버블 안 액션) → window bubli:data-changed 재발행(useDataRefresh 구독 표면 갱신)
// Tauri 런타임이 아니면 no-op cleanup을 돌려준다.
export function startWidgetDataChangedBridge() {
  if (!isTauriRuntime() || typeof window === "undefined") {
    return () => undefined;
  }

  let disposed = false;
  let unlisten: (() => void) | null = null;

  const handleWindowDataChanged = (event: Event) => {
    const detail = event instanceof CustomEvent ? (event.detail as DataChangedDetail | null) : null;
    if (!detail || detail.source === WIDGET_DATA_CHANGED_BRIDGE_SOURCE) return;
    void emitWidgetDataChanged(detail.domain).catch(() => undefined);
  };
  window.addEventListener(DATA_CHANGED_EVENT, handleWindowDataChanged);

  void listenWidgetDataChanged((payload) => {
    notifyDataChanged(payload.domain, { source: WIDGET_DATA_CHANGED_BRIDGE_SOURCE });
  }).then((nextUnlisten) => {
    if (disposed) {
      nextUnlisten();
      return;
    }
    unlisten = nextUnlisten;
  });

  return () => {
    disposed = true;
    window.removeEventListener(DATA_CHANGED_EVENT, handleWindowDataChanged);
    unlisten?.();
    unlisten = null;
  };
}
