// 위젯 버블 로컬 설정(타이머 모드 · 뽀모도로 진행 상태) 저장/복원 클라이언트.
// summary 캐시와 같은 방식으로 (kind, context:'personal'|roomId)로 키를 분리해
// 개인/룸 컨텍스트의 상태가 서로 덮어쓰지 않게 한다. Tauri 런타임이 아니면 no-op이며
// 서버로는 절대 반영하지 않는다(뽀모도로 사이클은 로컬 전용, 스펙 §타이머 버블).
import { getStoredAuthSession } from "@/lib/auth/auth-session";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";

export type WidgetTimerMode = "clock" | "work" | "pomodoro";

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
};

export const POMODORO_FOCUS_SECONDS = 25 * 60;
export const POMODORO_BREAK_SECONDS = 5 * 60;

const TIMER_MODE_KIND = "timer_mode";
const POMODORO_KIND = "pomodoro_state";

const TIMER_MODES: readonly WidgetTimerMode[] = ["clock", "work", "pomodoro"];

function isTimerMode(value: unknown): value is WidgetTimerMode {
  return typeof value === "string" && (TIMER_MODES as readonly string[]).includes(value);
}

// summary-client와 동일한 컨텍스트 스코프 규칙. 룸이면 room:{id}, 아니면 personal.
// 사용자 격리를 위해 JWT sub를 접두어로 붙인다(토큰 없으면 anon).
function resolvePrefCacheKey(selectedRoomId?: string | null): string {
  const token = getStoredAuthSession()?.accessToken ?? null;
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
    const cached = await tauriCommands.readWidgetPref({ cacheKey: resolvePrefCacheKey(selectedRoomId), kind: TIMER_MODE_KIND });
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
      cacheKey: resolvePrefCacheKey(selectedRoomId),
      kind: TIMER_MODE_KIND,
      valueJson: JSON.stringify({ mode }),
    });
  } catch {
    // best-effort: 저장 실패가 위젯 표시를 막지 않는다.
  }
}

function isPomodoroState(value: unknown): value is PomodoroState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PomodoroState>;
  return (
    (state.phase === "focus" || state.phase === "break") &&
    typeof state.cyclesCompleted === "number" &&
    typeof state.running === "boolean"
  );
}

export async function readPomodoroState(selectedRoomId?: string | null): Promise<PomodoroState | null> {
  if (!isTauriRuntime()) return null;
  try {
    const cached = await tauriCommands.readWidgetPref({ cacheKey: resolvePrefCacheKey(selectedRoomId), kind: POMODORO_KIND });
    if (!cached) return null;
    const parsed: unknown = JSON.parse(cached.valueJson);
    return isPomodoroState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writePomodoroState(state: PomodoroState, selectedRoomId?: string | null): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    await tauriCommands.storeWidgetPref({
      cacheKey: resolvePrefCacheKey(selectedRoomId),
      kind: POMODORO_KIND,
      valueJson: JSON.stringify(state),
    });
  } catch {
    // best-effort
  }
}

export function createIdlePomodoroState(): PomodoroState {
  return {
    cyclesCompleted: 0,
    phase: "focus",
    phaseEndsAt: null,
    remainingSeconds: POMODORO_FOCUS_SECONDS,
    running: false,
  };
}

export function phaseDurationSeconds(phase: PomodoroPhase): number {
  return phase === "focus" ? POMODORO_FOCUS_SECONDS : POMODORO_BREAK_SECONDS;
}
