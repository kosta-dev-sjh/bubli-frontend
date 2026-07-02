"use client";

import type { AuthClientType, AuthTokenResponse } from "@/types/api/auth";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import { tauriCommands } from "@/lib/tauri/commands";

const AUTH_SESSION_STORAGE_KEY = "bubli-auth-session";
const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 30_000;

export const AUTH_SESSION_CHANGE_EVENT = "bubli:auth-session-change";

export type StoredAuthSession = AuthTokenResponse & {
  clientType: AuthClientType;
  savedAt: string;
  savedAtMs?: number;
};

export type AuthSessionInput = AuthTokenResponse & {
  clientType: AuthClientType;
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

function mirrorAuthSessionToTauri(session: StoredAuthSession) {
  if (!isTauriRuntime()) return;
  void tauriCommands
    .storeTauriAuthSession({ sessionJson: JSON.stringify(session) })
    .catch(() => undefined);
}

function clearTauriAuthSessionMirror() {
  if (!isTauriRuntime()) return;
  void tauriCommands.clearTauriAuthSession().catch(() => undefined);
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
      clearStoredAuthSession();
      return null;
    }

    return parsed;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export function setStoredAuthSession(session: AuthSessionInput) {
  if (!canUseStorage()) {
    return;
  }

  const next: StoredAuthSession = {
    ...session,
    savedAt: new Date().toISOString(),
    savedAtMs: Date.now(),
  };

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(next));
  mirrorAuthSessionToTauri(next);
  emitAuthSessionChange();
}

export function clearStoredAuthSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  clearTauriAuthSessionMirror();
  emitAuthSessionChange();
}

export async function restoreStoredAuthSessionFromTauri() {
  if (!canUseStorage() || !isTauriRuntime()) {
    return getStoredAuthSession();
  }

  const current = getStoredAuthSession();

  try {
    const restored = await tauriCommands.readTauriAuthSession();
    if (!restored?.sessionJson) {
      return current;
    }

    const parsed = parseStoredAuthSession(restored.sessionJson);
    if (!parsed || isExpired(parsed.refreshTokenExpiresAt)) {
      if (!current) clearStoredAuthSession();
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
