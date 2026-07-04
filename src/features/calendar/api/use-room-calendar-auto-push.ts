"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { calendarApi } from "@/features/calendar/api/calendarApi";
import type { ScheduleResponse } from "@/types/api/work";

// 룸(WBS 포함) 일정을 사용자의 구글 캘린더로 자동 push하는 훅.
//
// 백엔드 semantics(develop 기준):
// - POST /api/calendar/push-unsynced?from&to 는 "내가 소유한(ownerUserId=나)"
//   LOCAL_ONLY/SYNC_FAILED 일정만 기간으로 골라 push한다. roomId 파라미터는 없다.
// - roomId가 있는 일정은 백엔드 ensureRoomCalendar가 룸 이름의 전용 구글 캘린더를
//   (사용자별로) 지연 생성해 그쪽으로 사본을 만든다.
// - 즉 이 훅으로 자동 연동되는 것은 "내가 만든" 룸 일정까지다. 다른 멤버가 만든
//   룸 일정을 내 캘린더로 보내는 API는 아직 없다(백엔드 갭).
const SESSION_GUARD_PREFIX = "bubli.room-calendar-auto-push:";
const DEBOUNCE_MS = 5_000;

export type RoomCalendarPushResult = {
  /** push가 끝난 시각(ISO). 팝오버의 "방금/{n}분 전" 표기에 쓴다. */
  at: string;
  /** 이번 push로 구글에 연동된 이 룸 일정 수(SYNCED로 끝난 것만). */
  roomEventCount: number;
};

function sessionGuardKey(roomId: string) {
  return `${SESSION_GUARD_PREFIX}${roomId}`;
}

function hasSessionGuard(roomId: string) {
  try {
    return window.sessionStorage.getItem(sessionGuardKey(roomId)) !== null;
  } catch {
    // sessionStorage를 못 쓰면 가드 없이 진행한다(마운트당 1회 push).
    return false;
  }
}

function setSessionGuard(roomId: string) {
  try {
    window.sessionStorage.setItem(sessionGuardKey(roomId), new Date().toISOString());
  } catch {
    // 저장 실패는 무시한다.
  }
}

/**
 * 룸 화면(WBS 보드 등)을 열었을 때 세션당 한 번, 그리고 일정 변경 후 5초 디바운스로
 * push-unsynced를 호출해 내 구글 캘린더에 룸 일정 사본을 맞춰 준다.
 * 실패는 조용히 무시한다(수동 저장·동기화 경로는 그대로 동작).
 */
export function useRoomCalendarAutoPush({
  enabled,
  from,
  onPushed,
  roomId,
  to,
}: {
  /** 구글 연동이 활성(ACTIVE)일 때만 true로 넘긴다. */
  enabled: boolean;
  from: string;
  /** push 성공 시 이번에 연동된 "이 룸" 일정 목록을 돌려준다(0건이어도 호출). */
  onPushed?: (roomEvents: ScheduleResponse[]) => void;
  roomId: string;
  to: string;
}) {
  const [lastPushByRoom, setLastPushByRoom] = useState<Record<string, RoomCalendarPushResult>>({});
  const inFlightRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const onPushedRef = useRef(onPushed);

  useEffect(() => {
    onPushedRef.current = onPushed;
  }, [onPushed]);

  const pushNow = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    calendarApi
      .pushUnsyncedGoogleEvents({ from, to })
      .then((pushed) => {
        const roomEvents = pushed.filter((event) => event.roomId === roomId && event.syncStatus === "SYNCED");
        setLastPushByRoom((current) => ({
          ...current,
          [roomId]: { at: new Date().toISOString(), roomEventCount: roomEvents.length },
        }));
        onPushedRef.current?.(roomEvents);
      })
      .catch(() => {
        // 자동 push 실패는 표시하지 않는다. 다음 세션/다음 변경에서 다시 시도된다.
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [from, roomId, to]);

  // 룸을 열고 구글 연동이 확인되면 세션당 한 번 자동 push한다.
  // 가드를 먼저 세우고 0ms 타이머로 실행해, StrictMode의 이중 마운트에서도 한 번만 나간다.
  useEffect(() => {
    if (!enabled || hasSessionGuard(roomId)) return;

    setSessionGuard(roomId);
    window.setTimeout(pushNow, 0);
  }, [enabled, pushNow, roomId]);

  // WBS 생성/수정/삭제 직후 호출하면 5초 디바운스로 한 번만 push한다.
  const schedulePush = useCallback(() => {
    if (!enabled) return;

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      pushNow();
    }, DEBOUNCE_MS);
  }, [enabled, pushNow]);

  useEffect(
    () => () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  return {
    lastPush: lastPushByRoom[roomId] ?? null,
    schedulePush,
  };
}
