import { tauriCommands } from "@/lib/tauri/commands";
import { isWindowsTauriRuntime } from "@/lib/tauri/platform";
import type { ChatRoomResponse } from "@/types/api/chat";
import type { ProjectRoomResponse } from "@/types/api/projectRoom";

const WINDOWS_CHAT_ROOMS_CACHE_KEY = "bubli:windows-chat-rooms:v1";
const WINDOWS_CHAT_ROOMS_CACHE_KIND = "windows_chat_rooms";
const WINDOWS_PROJECT_ROOMS_CACHE_KEY = "bubli:windows-project-rooms:v1";
const WINDOWS_PROJECT_ROOMS_CACHE_KIND = "windows_project_rooms";
const WINDOWS_ROUTE_CACHE_MAX_AGE_MS = 30 * 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCachedChatRoom(value: unknown): value is ChatRoomResponse {
  return isRecord(value) && typeof value.id === "string" && (value.chatType === "DIRECT" || value.chatType === "GROUP" || value.chatType === "ROOM");
}

function isCachedProjectRoom(value: unknown): value is ProjectRoomResponse {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

async function readWindowsRouteCache<T>(
  input: {
    cacheKey: string;
    isItem: (value: unknown) => value is T;
    kind: string;
  },
): Promise<T[] | null> {
  if (!isWindowsTauriRuntime()) return null;

  try {
    const cached = await tauriCommands.readWidgetPref({
      cacheKey: input.cacheKey,
      kind: input.kind,
    });
    if (!cached) return null;
    const parsed = JSON.parse(cached.valueJson) as { items?: unknown; rooms?: unknown; savedAt?: unknown };
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > WINDOWS_ROUTE_CACHE_MAX_AGE_MS) return null;
    const items = Array.isArray(parsed.items) ? parsed.items : parsed.rooms;
    if (!Array.isArray(items)) return null;
    return items.filter(input.isItem);
  } catch {
    return null;
  }
}

async function writeWindowsRouteCache<T>(input: { cacheKey: string; items: T[]; kind: string }) {
  if (!isWindowsTauriRuntime()) return;

  try {
    await tauriCommands.storeWidgetPref({
      cacheKey: input.cacheKey,
      kind: input.kind,
      valueJson: JSON.stringify({ items: input.items, savedAt: Date.now() }),
    });
  } catch {
    // Last-known route cache is a Windows startup optimization; the server remains the source of truth.
  }
}

export function readWindowsChatRoomsCache() {
  return readWindowsRouteCache<ChatRoomResponse>({
    cacheKey: WINDOWS_CHAT_ROOMS_CACHE_KEY,
    isItem: isCachedChatRoom,
    kind: WINDOWS_CHAT_ROOMS_CACHE_KIND,
  });
}

export function writeWindowsChatRoomsCache(rooms: ChatRoomResponse[]) {
  return writeWindowsRouteCache({
    cacheKey: WINDOWS_CHAT_ROOMS_CACHE_KEY,
    items: rooms,
    kind: WINDOWS_CHAT_ROOMS_CACHE_KIND,
  });
}

export function readWindowsProjectRoomsCache() {
  return readWindowsRouteCache<ProjectRoomResponse>({
    cacheKey: WINDOWS_PROJECT_ROOMS_CACHE_KEY,
    isItem: isCachedProjectRoom,
    kind: WINDOWS_PROJECT_ROOMS_CACHE_KIND,
  });
}

export function writeWindowsProjectRoomsCache(rooms: ProjectRoomResponse[]) {
  return writeWindowsRouteCache({
    cacheKey: WINDOWS_PROJECT_ROOMS_CACHE_KEY,
    items: rooms,
    kind: WINDOWS_PROJECT_ROOMS_CACHE_KIND,
  });
}
