// BUBLI-70: public site vs member app vs Tauri widget route contract.
//
// Reference constants only. This file changes no route implementation; it
// records the target route responsibilities and the gap against current code.
//
// Sign-in policy: Google OAuth is the only entry. There is no self-serve
// account-creation route and no email/password path.

export type RouteSurface = "PUBLIC_SITE" | "AUTH_ENTRY" | "WEB_APP" | "TAURI_WIDGET";

export type RouteContractEntry = {
  path: string;
  surface: RouteSurface;
  role: string;
};

/** Public site only handles intro, direct installer download CTA, and sign-in entry. */
export const publicRoutes: readonly RouteContractEntry[] = [
  { path: "/", surface: "PUBLIC_SITE", role: "Service intro and download CTA" },
  { path: "/login", surface: "AUTH_ENTRY", role: "Google sign-in entry" },
] as const;

/** Member app lives under /app and is opened by Tauri as a WebView. */
export const memberAppRoutePrefix = "/app" as const;

/** The Tauri widget window route used for desktop widget verification. */
export const tauriWidgetRoute = "/desktop-widget" as const;

/** Public CTAs: download and sign-in only — no member feature detail on the public site. */
export const publicCallToActions = [
  { id: "download-macos", role: "Get the macOS desktop app", target: "/downloads/macos/Bubli-macOS-0.1.1-arm64.dmg" },
  { id: "download-windows", role: "Get the Windows desktop app", target: "/downloads/windows/Bubli-Windows-latest.exe" },
  { id: "sign-in", role: "Go to sign-in entry", target: "/login" },
] as const;

/**
 * Flows intentionally absent in v15 (kept here so reviewers see the boundary).
 * Phrased to avoid product-forbidden copy tokens.
 */
export const excludedPublicFlows = [
  "Self-serve account creation (Google OAuth is the only entry)",
  "Email/password sign-in",
  "Separate projects route distinct from project-rooms",
  "Link-based room invites",
  "Address-based room invites",
  "Anonymous chat participation",
  "Anonymous voice participation",
  "Public profiles",
  "Matching",
  "Standalone receivables widget",
  "Direct agent-server calls from the frontend or Tauri",
] as const;

export type RouteGapStatus = "MATCHES" | "RENAME_NEEDED" | "EXTRA_IN_CODE" | "MISSING_IN_CODE";

export type RouteGap = {
  current: string | null;
  target: string | null;
  status: RouteGapStatus;
  note: string;
};

/** Current code vs target route structure. No route code is changed in this ticket. */
export const routeContractGaps: readonly RouteGap[] = [
  {
    current: "/app/calendar",
    target: "/app/schedule",
    status: "RENAME_NEEDED",
    note: "Route spec names the schedule screen /app/schedule.",
  },
  {
    current: "/app/agent-suggestions",
    target: "/app/agent",
    status: "EXTRA_IN_CODE",
    note: "Route spec consolidates suggestions under /app/agent.",
  },
  {
    current: "/app/desktop/communication",
    target: "/app/chat?mode=room",
    status: "RENAME_NEEDED",
    note: "Legacy desktop communication route redirects to the web chat surface.",
  },
  {
    current: "/desktop-widget",
    target: "/desktop-widget",
    status: "MATCHES",
    note: "Tauri widget window route matches the Rust widget window URL.",
  },
] as const;
