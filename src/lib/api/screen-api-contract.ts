// BUBLI-45: screen -> API binding contract (reference constants only).
//
// This file does NOT change any screen import. It records, per screen, which
// API endpoints the screen depends on, the current connection state, and where
// the local preview/fallback data lives. Values mirror the API spec
// (10_API-Design) and the route spec (04_프론트_구현_라우트명세).
//
// Boundaries captured here:
// - Personal resources sync from a local managed folder (Tauri IPC + local
//   file sync API); project-room resources are upload-only and never auto-shared.
// - Normal screens auto-refresh / revalidate; only recovery states re-connect.

export type ApiSurface = "PUBLIC_SITE" | "WEB_APP" | "TAURI_WIDGET";

export type ApiConnectionState =
  | "STATIC_NO_API" // public marketing screens, no data API
  | "API_WIRED" // calls the API and renders server data
  | "PREVIEW_FALLBACK" // calls the API; uses local preview data when the server is unreachable
  | "PENDING_BACKEND"; // contract defined, server endpoint not available yet

export type RefreshMode =
  | "AUTO_REVALIDATE" // refresh on focus / interval; no manual refresh button
  | "RECONNECT_ONLY" // re-connect allowed only from a recovery state
  | "STATIC";

export type ScreenApiBinding = {
  screen: string;
  surface: ApiSurface;
  route: string;
  apis: readonly string[];
  state: ApiConnectionState;
  refresh: RefreshMode;
  fallback: string | null;
  notes?: string;
};

const WORKSPACE_PREVIEW = "src/lib/workspace-preview-data.ts";
const WIDGET_PREVIEW = "src/features/widget/desktop-widget-preview-data.ts";

export const screenApiContract: readonly ScreenApiBinding[] = [
  // Public site (no member data)
  {
    screen: "Landing",
    surface: "PUBLIC_SITE",
    route: "/",
    apis: [],
    state: "STATIC_NO_API",
    refresh: "STATIC",
    fallback: null,
  },
  {
    screen: "Features",
    surface: "PUBLIC_SITE",
    route: "/features",
    apis: [],
    state: "STATIC_NO_API",
    refresh: "STATIC",
    fallback: null,
  },
  {
    screen: "FAQ",
    surface: "PUBLIC_SITE",
    route: "/faq",
    apis: [],
    state: "STATIC_NO_API",
    refresh: "STATIC",
    fallback: null,
  },
  {
    screen: "Sign-in entry",
    surface: "PUBLIC_SITE",
    route: "/login",
    apis: ["/api/auth/google/authorize", "/api/auth/google/callback"],
    state: "PENDING_BACKEND",
    refresh: "STATIC",
    fallback: null,
    notes: "Google OAuth only.",
  },
  // Member web app
  {
    screen: "Dashboard",
    surface: "WEB_APP",
    route: "/app",
    apis: ["/api/dashboard/work", "/api/dashboard/tasks", "/api/me/project-rooms", "/api/notifications"],
    state: "PREVIEW_FALLBACK",
    refresh: "AUTO_REVALIDATE",
    fallback: WORKSPACE_PREVIEW,
  },
  {
    screen: "Project room list",
    surface: "WEB_APP",
    route: "/app/project-rooms",
    apis: ["/api/project-rooms"],
    state: "PREVIEW_FALLBACK",
    refresh: "AUTO_REVALIDATE",
    fallback: WORKSPACE_PREVIEW,
  },
  {
    screen: "Project room home",
    surface: "WEB_APP",
    route: "/app/project-rooms/{roomId}",
    apis: ["/api/project-rooms/{roomId}", "/api/project-rooms/{roomId}/members"],
    state: "PREVIEW_FALLBACK",
    refresh: "AUTO_REVALIDATE",
    fallback: WORKSPACE_PREVIEW,
  },
  {
    screen: "Project room resources",
    surface: "WEB_APP",
    route: "/app/project-rooms/{roomId}/resources",
    apis: ["/api/project-rooms/{roomId}/resources", "/api/resources/{id}/comments"],
    state: "PREVIEW_FALLBACK",
    refresh: "AUTO_REVALIDATE",
    fallback: WORKSPACE_PREVIEW,
    notes: "Upload-only. Never auto-shared from personal resources.",
  },
  {
    screen: "Personal resources",
    surface: "WEB_APP",
    route: "/app/resources",
    apis: ["/api/resources?scope=personal", "/api/local-files", "/api/local-file-events/sync"],
    state: "PREVIEW_FALLBACK",
    refresh: "AUTO_REVALIDATE",
    fallback: WORKSPACE_PREVIEW,
    notes: "Personal library syncs from a local managed folder via Tauri IPC.",
  },
  {
    screen: "Work board (WBS/TODO)",
    surface: "WEB_APP",
    route: "/app/project-rooms/{roomId}/work",
    apis: ["/api/project-rooms/{roomId}/wbs-board", "/api/project-rooms/{roomId}/tasks"],
    state: "PREVIEW_FALLBACK",
    refresh: "AUTO_REVALIDATE",
    fallback: WORKSPACE_PREVIEW,
  },
  {
    screen: "Schedule",
    surface: "WEB_APP",
    route: "/app/schedule",
    apis: ["/api/schedules"],
    state: "PREVIEW_FALLBACK",
    refresh: "AUTO_REVALIDATE",
    fallback: WORKSPACE_PREVIEW,
    notes: "Route spec target is /app/schedule; code currently mounts /app/calendar.",
  },
  {
    screen: "Communication (chat)",
    surface: "WEB_APP",
    route: "/app/chat",
    apis: ["/api/chat/rooms", "/api/chat/rooms/{id}/messages", "/api/chat/rooms/{id}/read"],
    state: "PREVIEW_FALLBACK",
    refresh: "RECONNECT_ONLY",
    fallback: WORKSPACE_PREVIEW,
    notes: "Live updates over WebSocket; Tauri uses local_room_message_cache as cache only.",
  },
  {
    screen: "Agent suggestions",
    surface: "WEB_APP",
    route: "/app/agent",
    apis: ["/api/agent/suggestions", "/api/agent-jobs/{jobId}"],
    state: "PREVIEW_FALLBACK",
    refresh: "AUTO_REVALIDATE",
    fallback: WORKSPACE_PREVIEW,
  },
  {
    screen: "Settings",
    surface: "WEB_APP",
    route: "/app/settings",
    apis: [
      "/api/me",
      "/api/me/preferences",
      "/api/me/notification-preferences",
      "/api/me/privacy-consents",
    ],
    state: "PREVIEW_FALLBACK",
    refresh: "AUTO_REVALIDATE",
    fallback: WORKSPACE_PREVIEW,
  },
  // Tauri widget surface
  {
    screen: "Widget summary",
    surface: "TAURI_WIDGET",
    route: "/desktop-widget",
    apis: ["/api/widget/summary", "/api/widget/context", "/api/widget/items/{id}/state"],
    state: "PREVIEW_FALLBACK",
    refresh: "RECONNECT_ONLY",
    fallback: WIDGET_PREVIEW,
    notes: "Server summary combined with local widget cache; usage rollups stay on device.",
  },
  {
    screen: "Widget preview (in-app)",
    surface: "WEB_APP",
    route: "/app/desktop/widgets",
    apis: ["/api/widget/summary"],
    state: "PREVIEW_FALLBACK",
    refresh: "AUTO_REVALIDATE",
    fallback: WIDGET_PREVIEW,
    notes: "Verification view only; real widget runs as a Tauri window.",
  },
] as const;

export type ScreenName = (typeof screenApiContract)[number]["screen"];
