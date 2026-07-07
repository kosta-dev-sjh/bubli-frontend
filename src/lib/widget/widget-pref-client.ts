// 위젯 버블 로컬 설정(타이머 모드 · 뽀모도로 진행 상태) 저장/복원 클라이언트.
// summary 캐시와 같은 방식으로 (kind, context:'personal'|roomId)로 키를 분리해
// 개인/룸 컨텍스트의 상태가 서로 덮어쓰지 않게 한다. Tauri 런타임이 아니면 no-op이며
// 서버로는 절대 반영하지 않는다(뽀모도로 사이클은 로컬 전용, 스펙 §타이머 버블).
import { getStoredAuthSession, restoreStoredAuthSessionFromTauri } from "@/lib/auth/auth-session";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export type WidgetTimerMode = "clock" | "work" | "pomodoro";

// 타이머 탭 내부의 하위 종류. work=서버 누적(룸 귀속), personal=로컬 임시(저장 안 함).
export type WidgetTimerKind = "work" | "personal";

export type PomodoroPhase = "focus" | "break";

// 로컬 전용 뽀모도로 진행 상태. running 중에는 phaseEndsAt(에폭 ms)로 남은 시간을 복원한다.
// 창을 닫아도 sqlite에서 복원되도록 재오픈 시 이 값을 읽어 다시 카운트한다.
export type PomodoroState = {
  cyclesCompleted: number;
  phase: PomodoroPhase;
  // 실행 중이면 이 시각(에폭 ms)에 현재 페이즈가 끝난다. 정지/일시정지면 null.
  phaseEndsAt: number | null;
  // 일시정지 시 남은 초. 실행 중이면 null.
  remainingSeconds: number | null;
  running: boolean;
  // 사용자가 설정한 집중/휴식 길이(분). 예전 저장본에는 없어 읽을 때 기본값으로 채운다.
  focusMinutes: number;
  breakMinutes: number;
};

export const POMODORO_DEFAULT_FOCUS_MINUTES = 25;
export const POMODORO_DEFAULT_BREAK_MINUTES = 5;
// 설정 가능한 분 범위(집중 5~90, 휴식 1~30) — UI 스텝퍼와 공유한다.
export const POMODORO_FOCUS_MIN = 5;
export const POMODORO_FOCUS_MAX = 90;
export const POMODORO_BREAK_MIN = 1;
export const POMODORO_BREAK_MAX = 30;
export const POMODORO_FOCUS_SECONDS = POMODORO_DEFAULT_FOCUS_MINUTES * 60;
export const POMODORO_BREAK_SECONDS = POMODORO_DEFAULT_BREAK_MINUTES * 60;

const TIMER_MODE_KIND = "timer_mode";
const TIMER_SUBKIND_KIND = "timer_kind";
const POMODORO_KIND = "pomodoro_state";

const TIMER_MODES: readonly WidgetTimerMode[] = ["clock", "work", "pomodoro"];

function isTimerMode(value: unknown): value is WidgetTimerMode {
  return typeof value === "string" && (TIMER_MODES as readonly string[]).includes(value);
}

// summary-client와 동일한 컨텍스트 스코프 규칙. 룸이면 room:{id}, 아니면 personal.
// 사용자 격리를 위해 JWT sub를 접두어로 붙인다(토큰 없으면 anon).
// 주의: 바에서 복원된 새 창·앱 재시작 직후에는 세션 미러 복원보다 이 키 계산이 먼저 돌 수 있다.
// 그 순간 동기 localStorage가 비어 있으면 sub:anon 키로 읽어버려 저장해 둔 탭·뽀모도로를
// 못 찾는 레이스가 있었으므로, 토큰이 없을 때는 Tauri 미러 복원을 한 번 기다린 뒤 키를 확정한다
// (비-Tauri는 기존과 동일하게 동기 값만 쓴다).
async function resolvePrefCacheKey(selectedRoomId?: string | null): Promise<string> {
  let token = getStoredAuthSession()?.accessToken ?? null;
  if (!token && isTauriRuntime()) {
    token = (await restoreStoredAuthSessionFromTauri().catch(() => null))?.accessToken ?? null;
  }
  const subject = getJwtSubject(token) ?? "anon";
  const roomId = selectedRoomId?.trim();
  const scope = roomId ? `room:${roomId}` : "personal";
  return `sub:${subject}:${scope}`;
}

function getJwtSubject(token: string | null): string | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(base64)) as { sub?: unknown };
    return typeof parsed.sub === "string" && parsed.sub.trim() ? parsed.sub.trim() : null;
  } catch {
    return null;
  }
}

export async function readWidgetTimerMode(selectedRoomId?: string | null): Promise<WidgetTimerMode | null> {
  if (!isTauriRuntime()) return null;
  try {
    const cached = await tauriCommands.readWidgetPref({ cacheKey: await resolvePrefCacheKey(selectedRoomId), kind: TIMER_MODE_KIND });
    if (!cached) return null;
    const parsed: unknown = JSON.parse(cached.valueJson);
    const mode = (parsed as { mode?: unknown })?.mode;
    return isTimerMode(mode) ? mode : null;
  } catch {
    return null;
  }
}

export async function writeWidgetTimerMode(mode: WidgetTimerMode, selectedRoomId?: string | null): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    await tauriCommands.storeWidgetPref({
      cacheKey: await resolvePrefCacheKey(selectedRoomId),
      kind: TIMER_MODE_KIND,
      valueJson: JSON.stringify({ mode }),
    });
  } catch {
    // best-effort: 저장 실패가 위젯 표시를 막지 않는다.
  }
}

function isTimerKind(value: unknown): value is WidgetTimerKind {
  return value === "work" || value === "personal";
}

export async function readWidgetTimerKind(selectedRoomId?: string | null): Promise<WidgetTimerKind | null> {
  if (!isTauriRuntime()) return null;
  try {
    const cached = await tauriCommands.readWidgetPref({ cacheKey: await resolvePrefCacheKey(selectedRoomId), kind: TIMER_SUBKIND_KIND });
    if (!cached) return null;
    const parsed: unknown = JSON.parse(cached.valueJson);
    const kind = (parsed as { kind?: unknown })?.kind;
    return isTimerKind(kind) ? kind : null;
  } catch {
    return null;
  }
}

export async function writeWidgetTimerKind(kind: WidgetTimerKind, selectedRoomId?: string | null): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    await tauriCommands.storeWidgetPref({
      cacheKey: await resolvePrefCacheKey(selectedRoomId),
      kind: TIMER_SUBKIND_KIND,
      valueJson: JSON.stringify({ kind }),
    });
  } catch {
    // best-effort
  }
}

function isPomodoroState(value: unknown): value is Partial<PomodoroState> {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PomodoroState>;
  return (
    (state.phase === "focus" || state.phase === "break") &&
    typeof state.cyclesCompleted === "number" &&
    typeof state.running === "boolean"
  );
}

function clampMinutes(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

// 같은 창(웹 미리보기 포함)에서 PomodoroView와 GhostPomodoro가 실행 상태를 즉시 공유하기 위한
// 인메모리 캐시. Tauri storeWidgetPref는 재오픈·다른 창 공유용이고, 이 캐시는 Tauri가 아닌
// 환경(웹 위젯)에서도 고스트가 "실행 중 뽀모도로 숫자"를 읽게 해준다(고스트에서 00:00만 뜨던 문제 해결).
const pomodoroStateCache = new Map<string, PomodoroState>();

function normalizePomodoroState(parsed: Partial<PomodoroState>): PomodoroState {
  // 예전 저장본(분 필드 없음)은 기본 25/5로 채워 하위호환한다.
  return {
    cyclesCompleted: parsed.cyclesCompleted ?? 0,
    phase: parsed.phase ?? "focus",
    phaseEndsAt: parsed.phaseEndsAt ?? null,
    remainingSeconds: parsed.remainingSeconds ?? null,
    running: parsed.running ?? false,
    focusMinutes: clampMinutes(parsed.focusMinutes, POMODORO_DEFAULT_FOCUS_MINUTES, POMODORO_FOCUS_MIN, POMODORO_FOCUS_MAX),
    breakMinutes: clampMinutes(parsed.breakMinutes, POMODORO_DEFAULT_BREAK_MINUTES, POMODORO_BREAK_MIN, POMODORO_BREAK_MAX),
  };
}

export async function readPomodoroState(selectedRoomId?: string | null): Promise<PomodoroState | null> {
  const cacheKey = await resolvePrefCacheKey(selectedRoomId);
  // Tauri에서는 영속 저장본을 우선(다른 창/재오픈 반영)하고, 아직 저장 전이면 인메모리로 폴백한다.
  if (isTauriRuntime()) {
    try {
      const cached = await tauriCommands.readWidgetPref({ cacheKey, kind: POMODORO_KIND });
      if (cached) {
        const parsed: unknown = JSON.parse(cached.valueJson);
        if (isPomodoroState(parsed)) return normalizePomodoroState(parsed);
      }
    } catch {
      // 저장 읽기 실패는 인메모리 폴백으로 넘어간다.
    }
  }
  // 비-Tauri(웹 위젯)에서는 인메모리 캐시가 유일한 공유 경로다.
  return pomodoroStateCache.get(cacheKey) ?? null;
}

export async function writePomodoroState(state: PomodoroState, selectedRoomId?: string | null): Promise<void> {
  const cacheKey = await resolvePrefCacheKey(selectedRoomId);
  pomodoroStateCache.set(cacheKey, state);
  if (!isTauriRuntime()) return;
  try {
    await tauriCommands.storeWidgetPref({
      cacheKey,
      kind: POMODORO_KIND,
      valueJson: JSON.stringify(state),
    });
  } catch {
    // best-effort
  }
}

// 설정한 분(focus/break)을 유지한 채 idle 상태를 만든다. reset 시 사용자의 분 설정을 보존한다.
export function createIdlePomodoroState(
  focusMinutes: number = POMODORO_DEFAULT_FOCUS_MINUTES,
  breakMinutes: number = POMODORO_DEFAULT_BREAK_MINUTES,
): PomodoroState {
  const focus = clampMinutes(focusMinutes, POMODORO_DEFAULT_FOCUS_MINUTES, POMODORO_FOCUS_MIN, POMODORO_FOCUS_MAX);
  const brk = clampMinutes(breakMinutes, POMODORO_DEFAULT_BREAK_MINUTES, POMODORO_BREAK_MIN, POMODORO_BREAK_MAX);
  return {
    cyclesCompleted: 0,
    phase: "focus",
    phaseEndsAt: null,
    remainingSeconds: focus * 60,
    running: false,
    focusMinutes: focus,
    breakMinutes: brk,
  };
}

export function phaseDurationSeconds(
  phase: PomodoroPhase,
  focusMinutes: number = POMODORO_DEFAULT_FOCUS_MINUTES,
  breakMinutes: number = POMODORO_DEFAULT_BREAK_MINUTES,
): number {
  return (phase === "focus" ? focusMinutes : breakMinutes) * 60;
}
