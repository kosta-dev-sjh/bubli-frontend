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
  if (current) {
    return current;
  }

  try {
    const restored = await tauriCommands.readTauriAuthSession();
    if (!restored?.sessionJson) {
      return null;
    }

    const parsed = parseStoredAuthSession(restored.sessionJson);
    if (!parsed || isExpired(parsed.refreshTokenExpiresAt)) {
      clearStoredAuthSession();
      return null;
    }

    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(parsed));
    emitAuthSessionChange();
    return parsed;
  } catch {
    return null;
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
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_BASE_URL
      ? `${process.env.NEXT_PUBLIC_APP_BASE_URL}/auth/callback`
      : "http://localhost:3000/auth/callback";
  }

  return `${window.location.origin}/auth/callback`;
}
