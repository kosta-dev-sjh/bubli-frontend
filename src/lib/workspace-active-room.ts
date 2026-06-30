export const ACTIVE_PROJECT_ROOM_CHANGE_EVENT = "bubli:active-project-room-change";

// 프로젝트룸 선택 상태는 현재 작업공간 컨텍스트(메모리)에서만 유지한다.
// 영속화는 user_preferences API와 Tauri SQLite/outbox 정책이 붙을 때 그 경로로 옮긴다.
let activeProjectRoomId: string | null = null;
let activeProjectRoomLabel: string | null = null;

export function getActiveProjectRoomId() {
  return activeProjectRoomId;
}

export function getActiveProjectRoomLabel() {
  return activeProjectRoomLabel;
}

export function setActiveProjectRoomId(roomId: string, roomLabel?: string | null) {
  activeProjectRoomId = roomId;
  if (roomLabel?.trim()) {
    activeProjectRoomLabel = roomLabel.trim();
  }
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, {
      detail: { roomId, roomLabel: roomLabel ?? null },
    }),
  );
}

export function clearActiveProjectRoomId() {
  activeProjectRoomId = null;
  activeProjectRoomLabel = null;
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ACTIVE_PROJECT_ROOM_CHANGE_EVENT, { detail: { roomId: null } }),
  );
}
