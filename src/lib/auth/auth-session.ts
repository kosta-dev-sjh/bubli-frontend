"use client";

import type { AuthClientType, AuthTokenResponse } from "@/types/api/auth";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { tauriCommands, type TauriAuthSessionReadResult } from "@/lib/tauri/commands";

const AUTH_SESSION_STORAGE_KEY = "bubli-auth-session";
const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 30_000;
const DEV_REFRESH_TOKEN_PREFIX = "dev-refresh-token:";
const tauriAuthMirrorRestoreEnabled =
  process.env.NEXT_PUBLIC_BUBLI_TAURI_AUTH_MIRROR_RESTORE === "true" ||
  process.env.NEXT_PUBLIC_BUBLI_TAURI_RUNTIME_SMOKE === "true" ||
  process.env.NEXT_PUBLIC_BUBLI_TAURI_REAL_OAUTH_QA === "true";

export const AUTH_SESSION_CHANGE_EVENT = "bubli:auth-session-change";

let tauriAuthSessionReadPromise: Promise<TauriAuthSessionReadResult | null> | null = null;
let tauriAuthSessionMutationEpoch = 0;

export type StoredAuthSession = AuthTokenResponse & {
  clientType: AuthClientType;
  savedAt: string;
  savedAtMs?: number;
};

export type AuthSessionInput = AuthTokenResponse & {
  clientType: AuthClientType;
};

export type AuthSessionDiagnosticsSource = "localStorage" | "tauriMirror";

export type AuthSessionDiagnostics = {
  source: AuthSessionDiagnosticsSource;
  hasRawSession: boolean;
  hasSession: boolean;
  clientType?: AuthClientType;
  isTauriClient?: boolean;
  isDevAccessTokenSession?: boolean;
  wouldRejectDevAccessTokenSession?: boolean;
  accessTokenExpiringSoon?: boolean;
  refreshTokenExpired?: boolean;
  savedAt?: string;
  savedAtMs?: number;
  tauriMirrorSavedAt?: string;
  expiresAt?: string;
  refreshTokenExpiresAt?: string;
  tokenType?: string;
  parseError?: "missing" | "invalid";
};

export type AuthSessionRestoreProbeDiagnostics = {
  browserSessionCleared?: boolean;
  error?: string;
  restoredLocalSession?: boolean;
  restoredRealOAuthSession?: boolean;
  restoredTauriClient?: boolean;
  restoredTokenLive?: boolean;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitAuthSessionChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGE_EVENT));
}

function isExpired(isoValue?: string | null) {
  if (!isoValue) return false;
  const timestamp = new Date(isoValue).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function sessionSavedAtMs(session: StoredAuthSession) {
  if (typeof session.savedAtMs === "number" && Number.isFinite(session.savedAtMs)) {
    return session.savedAtMs;
  }

  const savedAt = new Date(session.savedAt).getTime();
  return Number.isFinite(savedAt) ? savedAt : 0;
}

function parseStoredAuthSession(raw: string): StoredAuthSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiresAt !== "string" ||
      typeof parsed.refreshTokenExpiresAt !== "string" ||
      typeof parsed.tokenType !== "string" ||
      typeof parsed.clientType !== "string"
    ) {
      return null;
    }

    return parsed as StoredAuthSession;
  } catch {
    return null;
  }
}

function isDevAccessTokenSession(session: StoredAuthSession) {
  return session.refreshToken.startsWith(DEV_REFRESH_TOKEN_PREFIX);
}

function isDevAccessTokenSessionAllowed() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_BUBLI_ALLOW_TAURI_DEV_LOGIN === "true"
  );
}

function shouldRejectStoredAuthSession(session: StoredAuthSession) {
  return isDevAccessTokenSession(session) && !isDevAccessTokenSessionAllowed();
}

function createAuthSessionDiagnostics(
  source: AuthSessionDiagnosticsSource,
  raw: string | null | undefined,
  tauriMirrorSavedAt?: string,
): AuthSessionDiagnostics {
  if (!raw) {
    return {
      source,
      hasRawSession: false,
      hasSession: false,
      tauriMirrorSavedAt,
      parseError: "missing",
    };
  }

  const session = parseStoredAuthSession(raw);
  if (!session) {
    return {
      source,
      hasRawSession: true,
      hasSession: false,
      tauriMirrorSavedAt,
      parseError: "invalid",
    };
  }

  return {
    source,
    hasRawSession: true,
    hasSession: true,
    clientType: session.clientType,
    isTauriClient: session.clientType === "TAURI",
    isDevAccessTokenSession: isDevAccessTokenSession(session),
    wouldRejectDevAccessTokenSession: shouldRejectStoredAuthSession(session),
    accessTokenExpiringSoon: isAccessTokenExpiringSoon(session),
    refreshTokenExpired: isExpired(session.refreshTokenExpiresAt),
    savedAt: session.savedAt,
    savedAtMs: sessionSavedAtMs(session),
    tauriMirrorSavedAt,
    expiresAt: session.expiresAt,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    tokenType: session.tokenType,
  };
}

function sameAuthSession(left: StoredAuthSession | null, right: AuthSessionInput) {
  if (!left) return false;

  return (
    left.accessToken === right.accessToken &&
    left.refreshToken === right.refreshToken &&
    left.expiresAt === right.expiresAt &&
    left.refreshTokenExpiresAt === right.refreshTokenExpiresAt &&
    left.tokenType === right.tokenType &&
    left.clientType === right.clientType
  );
}

function createStoredAuthSession(session: AuthSessionInput): StoredAuthSession {
  return {
    ...session,
    savedAt: new Date().toISOString(),
    savedAtMs: Date.now(),
  };
}

function storeAuthSessionToTauriMirror(session: StoredAuthSession) {
  if (!isTauriRuntime()) return Promise.resolve();
  invalidateTauriAuthSessionRead();
  return tauriCommands.storeTauriAuthSession({ sessionJson: JSON.stringify(session) }).then(() => undefined);
}

function mirrorAuthSessionToTauri(session: StoredAuthSession) {
  return storeAuthSessionToTauriMirror(session).catch(() => undefined);
}

function clearTauriAuthSessionMirror() {
  if (!isTauriRuntime()) return;
  invalidateTauriAuthSessionRead();
  void tauriCommands.clearTauriAuthSession().catch(() => undefined);
}

function invalidateTauriAuthSessionRead() {
  tauriAuthSessionMutationEpoch += 1;
  tauriAuthSessionReadPromise = null;
}

function readTauriAuthSessionOnce() {
  if (!tauriAuthSessionReadPromise) {
    tauriAuthSessionReadPromise = tauriCommands.readTauriAuthSession().finally(() => {
      tauriAuthSessionReadPromise = null;
    });
  }

  return tauriAuthSessionReadPromise;
}

async function readTauriAuthSessionForRestore() {
  const readEpoch = tauriAuthSessionMutationEpoch;
  const restored = await readTauriAuthSessionOnce();
  return readEpoch === tauriAuthSessionMutationEpoch ? restored : null;
}

function clearLocalAuthSessionOnly() {
  if (!canUseStorage()) {
    return false;
  }

  try {
    const hadStoredSession = Boolean(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY));
    invalidateTauriAuthSessionRead();
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    if (hadStoredSession) {
      emitAuthSessionChange();
    }
    return hadStoredSession;
  } catch {
    return false;
  }
}

function clearRejectedStoredAuthSession() {
  if (isTauriRuntime()) {
    clearLocalAuthSessionOnly();
    return;
  }

  clearStoredAuthSession();
}

export function getStoredAuthSession(): StoredAuthSession | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = parseStoredAuthSession(raw);
    if (!parsed) {
      clearRejectedStoredAuthSession();
      return null;
    }
    if (shouldRejectStoredAuthSession(parsed)) {
      clearRejectedStoredAuthSession();
      return null;
    }

    return parsed;
  } catch {
    clearRejectedStoredAuthSession();
    return null;
  }
}

export function getStoredAuthSessionDiagnostics(): AuthSessionDiagnostics {
  if (!canUseStorage()) {
    return {
      source: "localStorage",
      hasRawSession: false,
      hasSession: false,
      parseError: "missing",
    };
  }

  try {
    return createAuthSessionDiagnostics(
      "localStorage",
      window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY),
    );
  } catch {
    return {
      source: "localStorage",
      hasRawSession: false,
      hasSession: false,
      parseError: "invalid",
    };
  }
}

export async function readTauriAuthSessionDiagnostics(): Promise<AuthSessionDiagnostics> {
  if (!isTauriRuntime()) {
    return {
      source: "tauriMirror",
      hasRawSession: false,
      hasSession: false,
      parseError: "missing",
    };
  }

  try {
    const restored = await readTauriAuthSessionForRestore();
    return createAuthSessionDiagnostics("tauriMirror", restored?.sessionJson, restored?.savedAt);
  } catch {
    return {
      source: "tauriMirror",
      hasRawSession: false,
      hasSession: false,
      parseError: "invalid",
    };
  }
}

export function setStoredAuthSession(session: AuthSessionInput) {
  if (!canUseStorage()) {
    return;
  }

  const current = getStoredAuthSession();
  if (sameAuthSession(current, session)) {
    return;
  }

  const next = createStoredAuthSession(session);

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(next));
  void mirrorAuthSessionToTauri(next);
  emitAuthSessionChange();
}

export async function setStoredAuthSessionAndWaitForTauriMirror(session: AuthSessionInput) {
  if (!canUseStorage()) {
    return null;
  }

  const current = getStoredAuthSession();
  const next = sameAuthSession(current, session) && current ? current : createStoredAuthSession(session);
  const nextRaw = JSON.stringify(next);
  const currentRaw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, nextRaw);

  await storeAuthSessionToTauriMirror(next).catch(() => undefined);
  if (currentRaw !== nextRaw) {
    emitAuthSessionChange();
  }

  return next;
}

export function clearStoredAuthSession() {
  if (!canUseStorage()) {
    clearTauriAuthSessionMirror();
    return;
  }

  const hadStoredSession = Boolean(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY));

  invalidateTauriAuthSessionRead();
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  clearTauriAuthSessionMirror();
  if (hadStoredSession) {
    emitAuthSessionChange();
  }
}

export async function restoreStoredAuthSessionFromTauri() {
  if (!canUseStorage() || !isTauriRuntime()) {
    return getStoredAuthSession();
  }

  let current = getStoredAuthSession();

  if (current && isExpired(current.refreshTokenExpiresAt)) {
    clearStoredAuthSession();
    current = null;
  }

  if (current && !isExpired(current.refreshTokenExpiresAt)) {
    await mirrorAuthSessionToTauri(current);
  }

  if (!tauriAuthMirrorRestoreEnabled) {
    return current;
  }

  try {
    const restored = await readTauriAuthSessionForRestore();
    if (!restored?.sessionJson) {
      return current;
    }

    const parsed = parseStoredAuthSession(restored.sessionJson);
    if (!parsed || shouldRejectStoredAuthSession(parsed) || isExpired(parsed.refreshTokenExpiresAt)) {
      clearTauriAuthSessionMirror();
      if (!current) {
        clearStoredAuthSession();
      }
      return current;
    }

    const shouldUseRestored =
      !current ||
      isExpired(current.refreshTokenExpiresAt) ||
      isAccessTokenExpiringSoon(current) ||
      sessionSavedAtMs(parsed) > sessionSavedAtMs(current);

    if (shouldUseRestored) {
      const restoredRaw = JSON.stringify(parsed);
      const currentRaw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, restoredRaw);
      if (currentRaw !== restoredRaw) {
        emitAuthSessionChange();
      }
      return parsed;
    }

    return current;
  } catch {
    return current;
  }
}

export async function probeStoredAuthSessionRestoreFromTauriMirrorForQa(): Promise<AuthSessionRestoreProbeDiagnostics> {
  if (!canUseStorage() || !isTauriRuntime()) {
    return { error: "not_tauri_storage_runtime" };
  }

  const originalRawSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  const originalSession = originalRawSession ? parseStoredAuthSession(originalRawSession) : null;

  try {
    if (!originalRawSession) {
      return { error: "missing_local_session" };
    }

    invalidateTauriAuthSessionRead();
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    const clearedSession = getStoredAuthSessionDiagnostics();
    const restored = await restoreStoredAuthSessionFromTauri();
    const restoredSession = getStoredAuthSessionDiagnostics();

    return {
      browserSessionCleared: !clearedSession.hasSession,
      restoredLocalSession: Boolean(restored) && restoredSession.hasSession,
      restoredRealOAuthSession:
        restoredSession.isDevAccessTokenSession === false &&
        restoredSession.wouldRejectDevAccessTokenSession === false,
      restoredTauriClient: restoredSession.clientType === "TAURI" && restoredSession.isTauriClient,
      restoredTokenLive: restoredSession.refreshTokenExpired === false,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (originalSession && !shouldRejectStoredAuthSession(originalSession) && !isExpired(originalSession.refreshTokenExpiresAt)) {
      await setStoredAuthSessionAndWaitForTauriMirror(originalSession);
    } else if (originalRawSession) {
      invalidateTauriAuthSessionRead();
      window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, originalRawSession);
    }
  }
}

export function getAuthAccessToken() {
  return getStoredAuthSession()?.accessToken ?? null;
}

export function getAuthRefreshToken() {
  return getStoredAuthSession()?.refreshToken ?? null;
}

export function getAuthClientType(): AuthClientType {
  return getStoredAuthSession()?.clientType ?? resolveAuthClientType();
}

export function resolveAuthClientType(): AuthClientType {
  if (isTauriRuntime()) {
    return "TAURI";
  }

  return "WEB";
}

export function isAccessTokenExpiringSoon(session = getStoredAuthSession()) {
  if (!session?.expiresAt) {
    return false;
  }

  const expiresAt = new Date(session.expiresAt).getTime();
  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  return expiresAt - Date.now() <= ACCESS_TOKEN_EXPIRY_BUFFER_MS;
}

export function getAuthRedirectUri() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim().replace(/\/$/, "");
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/auth/callback`;
  }

  if (typeof window === "undefined") {
    return "http://localhost:3791/auth/callback";
  }

  return `${window.location.origin}/auth/callback`;
}
