import { isTauriRuntime } from "@/lib/tauri/is-tauri";

type TauriEvent<TPayload> = {
  payload: TPayload;
};

type TauriListen = <TPayload>(
  eventName: string,
  handler: (event: TauriEvent<TPayload>) => void,
) => Promise<() => void>;

export const TAURI_EVENTS = {
  managedFolderWatchEvent: "bubli-managed-folder-watch-event",
  // 바 창의 Bubli 버튼이 상시 실행 중인 메뉴(오브) 창에 "패널 열기"를 요청하는 창 간 이벤트.
  widgetMenuPanelRequested: "bubli-widget-menu-panel-requested",
  widgetRoomContextChanged: "bubli-widget-room-context-changed",
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

  return listen<TPayload>(eventName, (event) => handler(event.payload));
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
