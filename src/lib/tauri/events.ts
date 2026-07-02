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
