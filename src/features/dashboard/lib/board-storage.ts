"use client";

// 홈 위젯 보드 배치(카드 순서 + 위젯별 룸 범위)의 로컬 영속화 전용 모듈.
// 서버에는 홈 보드 배치용 endpoint가 없고(widgetApi는 데스크톱 버블 설정/사용 집계 전용),
// 테마(theme-provider)·로케일(locale)과 같은 방식으로 이 모듈 한 곳에서만 브라우저 저장소를 쓴다.
// scripts/check-tauri-boundaries.mjs 의 ALLOWED_LOCALSTORAGE_FILES 에 등록되어 있다.

const BOARD_STORAGE_KEY = "bubli.dashboard.board.v2";

export type WidgetRoomScope = Record<string, string | null>;

export type StoredBoard = {
  roomScope: WidgetRoomScope;
  widgetIds: string[];
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// normalizeWidgetIds: 저장된 id 목록을 현재 연결된 위젯 카탈로그 기준으로 걸러낸다(호출부 소유).
export function readStoredBoard(normalizeWidgetIds: (ids: unknown) => string[]): StoredBoard | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(BOARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredBoard> | null;
    if (!parsed || typeof parsed !== "object") return null;

    const roomScope: WidgetRoomScope = {};
    if (parsed.roomScope && typeof parsed.roomScope === "object") {
      for (const [widgetId, roomId] of Object.entries(parsed.roomScope)) {
        if (typeof roomId === "string" && roomId) roomScope[widgetId] = roomId;
      }
    }

    return { roomScope, widgetIds: normalizeWidgetIds(parsed.widgetIds) };
  } catch {
    return null;
  }
}

export function writeStoredBoard(board: StoredBoard) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(board));
  } catch {
    // 저장 실패(사파리 프라이빗 모드 등)는 조용히 무시한다.
  }
}
