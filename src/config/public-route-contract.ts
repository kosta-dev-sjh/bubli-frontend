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

/** Public site only handles intro, desktop app guidance, download, sign-in entry. */
export const publicRoutes: readonly RouteContractEntry[] = [
  { path: "/", surface: "PUBLIC_SITE", role: "Service intro and download CTA" },
  { path: "/features", surface: "PUBLIC_SITE", role: "Feature overview" },
  { path: "/download", surface: "PUBLIC_SITE", role: "Desktop app download (macOS, Windows)" },
  { path: "/faq", surface: "PUBLIC_SITE", role: "Permissions, files, security, AI, Tauri FAQ" },
  { path: "/login", surface: "AUTH_ENTRY", role: "Google sign-in entry" },
] as const;

/** Member app lives under /app and is opened by Tauri as a WebView. */
export const memberAppRoutePrefix = "/app" as const;

/** The Tauri widget window route used for desktop widget verification. */
export const tauriWidgetRoute = "/desktop-widget" as const;

/** Public CTAs: download and sign-in only — no member feature detail on the public site. */
export const publicCallToActions = [
  { id: "download", role: "Get the desktop app", target: "/download" },
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
    current: null,
    target: "/download",
    status: "MISSING_IN_CODE",
    note: "Download page route not present yet (directory only).",
  },
  {
    current: "/app/desktop/communication",
    target: "/app/desktop/widgets?autoOpen=chat",
    status: "RENAME_NEEDED",
    note: "Legacy communication route redirects to the widget chat surface.",
  },
  {
    current: "/desktop-widget",
    target: "/desktop-widget",
    status: "MATCHES",
    note: "Tauri widget window route matches the Rust widget window URL.",
  },
] as const;
