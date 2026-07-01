export type ScreenContractStatus = "완료" | "진행" | "예정" | "불일치";

export type ScreenContractBoundary =
  | "member-dashboard"
  | "project-room"
  | "personal-resource"
  | "room-resource"
  | "work-board"
  | "schedule"
  | "communication"
  | "agent"
  | "settings";

export type ScreenApiContract = {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly boundary: ScreenContractBoundary;
  readonly status: ScreenContractStatus;
  readonly requiredApis: readonly string[];
  readonly requiredRealtime?: readonly string[];
  readonly currentCodeNotes: readonly string[];
  readonly missingOrMismatch: readonly string[];
};

export const screenApiContracts = [
  {
    boundary: "member-dashboard",
    currentCodeNotes: [
      "WorkspaceDashboard calls dashboardApi.getWork, dashboardApi.getTasks, and projectRoomApi.list.",
      "Dashboard card order needs a persisted drag-and-drop contract before it can be treated as complete.",
    ],
    id: "dashboard",
    label: "대시보드",
    missingOrMismatch: [
      "/api/dashboard/work is used by the frontend, but 10_API-Design only pins /api/dashboard/tasks.",
      "Dashboard DnD layout persistence is not pinned in 10_API-Design.",
      "Timer and notification summary contracts need to be part of the dashboard aggregate.",
    ],
    requiredApis: [
      "GET /api/dashboard/tasks",
      "GET /api/me/project-rooms",
      "GET /api/schedules",
      "GET /api/notifications",
      "GET /api/activity/today",
      "GET /api/time-logs/current",
    ],
    status: "진행",
    route: "/app",
  },
  {
    boundary: "project-room",
    currentCodeNotes: [
      "Project room list uses projectRoomApi.list.",
      "Project room creation route exists as /app/project-rooms/new.",
    ],
    id: "project-room-list-create",
    label: "프로젝트룸 목록/생성",
    missingOrMismatch: [
      "Creation currently needs attachment-first upload and contract-document analysis to stay visible in the flow.",
      "Session-level selected project-room persistence is local helper based; server preference and widget context must stay separate.",
    ],
    requiredApis: [
      "GET /api/project-rooms",
      "POST /api/project-rooms",
      "POST /api/project-rooms/{roomId}/contract-documents",
      "GET /api/me/project-rooms",
      "GET /api/me/preferences",
      "PATCH /api/me/preferences",
    ],
    status: "진행",
    route: "/app/project-rooms, /app/project-rooms/new",
  },
  {
    boundary: "project-room",
    currentCodeNotes: [
      "Project room home reads room detail, members, WBS board, suggestions, resources, and schedules.",
      "Room context is persisted by workspace-active-room while the user moves across room subroutes.",
    ],
    id: "project-room-detail",
    label: "프로젝트룸 상세",
    missingOrMismatch: [
      "Room-level chat, voice, and project-room events need a single realtime map for detail refresh.",
      "Google Calendar-linked schedules are shown through schedule data, but connection state is not pinned on the room home.",
    ],
    requiredApis: [
      "GET /api/project-rooms/{roomId}",
      "GET /api/project-rooms/{roomId}/members",
      "GET /api/project-rooms/{roomId}/resources",
      "GET /api/project-rooms/{roomId}/wbs-board",
      "GET /api/project-rooms/{roomId}/agent/suggestions",
      "GET /api/schedules?roomId={roomId}",
      "GET /api/project-rooms/{roomId}/events",
    ],
    requiredRealtime: ["/topic/project-rooms/{roomId}/events"],
    status: "진행",
    route: "/app/project-rooms/{roomId}",
  },
  {
    boundary: "personal-resource",
    currentCodeNotes: [
      "Personal resource workspace uses resourcesApi.listPersonal.",
      "Managed-folder selection, scan, watch, local search, single-file reindex, index progress, and sync toggle are Tauri IPC/local adapter responsibilities.",
    ],
    id: "personal-resources",
    label: "개인 자료",
    missingOrMismatch: [
      "Personal resources must be local managed-folder sync, not browser upload or drag-and-drop.",
      "Only POST /api/local-file-events/sync is a server API for approved local file events; local file browsing stays in Tauri.",
    ],
    requiredApis: [
      "GET /api/resources?scope=personal",
      "GET /api/resources/{id}",
      "GET /api/resources/{id}/summary",
      "GET /api/resources/{id}/ai-document",
      "POST /api/local-file-events/sync",
      "GET /api/storage/usage",
    ],
    status: "진행",
    route: "/app/resources",
  },
  {
    boundary: "room-resource",
    currentCodeNotes: [
      "Room resource workspace uses resourcesApi.listRoomResources.",
      "Shared resources are room-scoped through /api/project-rooms/{roomId}/resources.",
    ],
    id: "room-resources",
    label: "룸 자료",
    missingOrMismatch: [
      "Room resources must keep upload and drag-and-drop as the main entry.",
      "Personal local-folder files are not auto-shared into a room.",
    ],
    requiredApis: [
      "GET /api/project-rooms/{roomId}/resources",
      "POST /api/resources",
      "GET /api/resources/{id}",
      "PATCH /api/resources/{id}",
      "GET /api/resources/{id}/download-url",
      "GET /api/resources/{id}/summary",
      "GET /api/resources/{id}/related",
      "GET /api/resources/{id}/versions",
      "POST /api/resources/{id}/versions",
      "GET /api/resources/{id}/comments",
      "POST /api/resources/{id}/comments",
      "DELETE /api/resources/{id}",
    ],
    requiredRealtime: ["/topic/project-rooms/{roomId}/events"],
    status: "진행",
    route: "/app/project-rooms/{roomId}/resources",
  },
  {
    boundary: "work-board",
    currentCodeNotes: [
      "Work board reads projectRoomApi.get, wbsApi.getBoard, and room draft suggestions.",
      "WBS and TODO are represented as confirmed data after user approval.",
    ],
    id: "work-board",
    label: "작업판 WBS/칸반",
    missingOrMismatch: [
      "Kanban move/update actions need to call task and WBS mutation APIs from the board layer.",
      "Candidate approval must remain under agent suggestions instead of directly writing confirmed work.",
    ],
    requiredApis: [
      "GET /api/project-rooms/{roomId}/wbs-board",
      "GET /api/project-rooms/{roomId}/wbs-items",
      "POST /api/project-rooms/{roomId}/wbs-items",
      "PATCH /api/project-rooms/{roomId}/wbs-items/reorder",
      "PATCH /api/wbs-items/{id}",
      "DELETE /api/wbs-items/{id}",
      "GET /api/project-rooms/{roomId}/tasks",
      "POST /api/project-rooms/{roomId}/tasks",
      "PATCH /api/tasks/{id}",
      "PATCH /api/agent/suggestions/{id}",
    ],
    requiredRealtime: ["/topic/project-rooms/{roomId}/events"],
    status: "진행",
    route: "/app/project-rooms/{roomId}/work",
  },
  {
    boundary: "schedule",
    currentCodeNotes: [
      "calendarApi uses /api/schedules for CRUD, which matches 10_API-Design.",
      "The implemented page route is /app/calendar while the route spec names /app/schedule.",
    ],
    id: "schedule",
    label: "일정",
    missingOrMismatch: [
      "Route mismatch: spec is /app/schedule, code currently mounts /app/calendar.",
      "Google Calendar connect/status/disconnect endpoints are not pinned in 10_API-Design, but the screen requires Google Calendar connection state.",
      "Recurring schedule fields need a confirmed request/response shape.",
    ],
    requiredApis: [
      "GET /api/schedules",
      "POST /api/schedules",
      "PATCH /api/schedules/{id}",
      "DELETE /api/schedules/{id}",
      "GET /api/project-rooms/{roomId}/events",
      "GET /api/calendar/google/connect",
      "GET /api/calendar/google/status",
      "DELETE /api/calendar/google/disconnect",
    ],
    requiredRealtime: ["/topic/project-rooms/{roomId}/events"],
    status: "불일치",
    route: "/app/schedule (spec), /app/calendar (code)",
  },
  {
    boundary: "communication",
    currentCodeNotes: [
      "Global chat page uses chatApi.listRooms and chat message APIs.",
      "Project-room chat route redirects to /app/chat?roomId={roomId}.",
      "voiceApi exposes project-room voice token flow.",
    ],
    id: "communication",
    label: "소통",
    missingOrMismatch: [
      "1:1 chat creation is present through /api/chat/direct-rooms, but 1:1 voice is only described as an extension candidate in 10_API-Design.",
      "Project-room scoped chat URL redirects into the global chat surface, so room context must be preserved in query and selected-room state.",
      "Voice mic mute PATCH is not in 10_API-Design; do not depend on it unless backend adds the contract.",
    ],
    requiredApis: [
      "GET /api/chat/rooms",
      "POST /api/chat/direct-rooms",
      "GET /api/chat/rooms/{id}/messages",
      "POST /api/chat/rooms/{id}/messages",
      "PATCH /api/chat/rooms/{id}/read",
      "POST /api/project-rooms/{roomId}/agent/commands",
      "POST /api/project-rooms/{roomId}/memory-summaries",
      "GET /api/project-rooms/{roomId}/memory-summaries",
      "POST /api/voice/rooms",
      "GET /api/voice/rooms/{id}",
      "POST /api/voice/rooms/{id}/token",
      "PATCH /api/voice/rooms/{id}/leave",
      "PATCH /api/voice/rooms/{id}/end",
    ],
    requiredRealtime: ["/topic/chat/{chatRoomId}", "/user/queue/notifications"],
    status: "진행",
    route: "/app/chat, /app/project-rooms/{roomId}/chat",
  },
  {
    boundary: "agent",
    currentCodeNotes: [
      "Agent page lists personal or room suggestions and updates approval state.",
      "Room-scoped candidate review is reachable with roomId query.",
    ],
    id: "agent-suggestions",
    label: "후보",
    missingOrMismatch: [
      "Frontend has generate-requirements, generate-questions, draft-document, summarize-day, and daily-summary endpoints that are not pinned in 10_API-Design.",
      "Candidate edit before approval needs a stable payload contract per suggestionType.",
    ],
    requiredApis: [
      "GET /api/agent/suggestions",
      "GET /api/project-rooms/{roomId}/agent/suggestions",
      "PATCH /api/agent/suggestions/{id}",
      "POST /api/ai/analyze-resource",
      "POST /api/ai/generate-tasks",
      "POST /api/ai/generate-wbs",
      "POST /api/ai/review-contract-documents",
      "GET /api/agent-jobs/{jobId}",
      "GET /api/agent-jobs/{jobId}/events",
      "POST /api/ai/search-resource",
    ],
    requiredRealtime: ["/topic/project-rooms/{roomId}/events"],
    status: "진행",
    route: "/app/agent",
  },
  {
    boundary: "settings",
    currentCodeNotes: [
      "Settings page currently reads authApi.getMe for account display.",
      "settingsApi contains profile-adjacent preferences, privacy consent, notification preference, and storage calls.",
      "Activity logs are consent-gated and surfaced from /api/activity/today with per-log delete.",
      "Managed-folder controls use Tauri IPC/local adapters for folder selection, scan/watch, index progress, sync toggle, local search, and single-file reindex instead of invented server endpoints.",
    ],
    id: "settings",
    label: "설정",
    missingOrMismatch: [
      "The screen needs to wire preferences, notification preferences, privacy consents, managed folders, storage usage, and Google Calendar state.",
      "Managed folders follow the Tauri IPC and sync API boundary; no /api/me/managed-folders backend route is used.",
    ],
    requiredApis: [
      "GET /api/me",
      "PATCH /api/me",
      "GET /api/me/preferences",
      "PATCH /api/me/preferences",
      "GET /api/me/notification-preferences",
      "PATCH /api/me/notification-preferences",
      "GET /api/me/privacy-consents",
      "PATCH /api/me/privacy-consents",
      "GET /api/storage/usage",
      "GET /api/calendar/google/status",
      "GET /api/activity/today",
      "DELETE /api/activity/{id}",
    ],
    status: "진행",
    route: "/app/settings",
  },
] as const satisfies readonly ScreenApiContract[];

export type ScreenApiContractId = (typeof screenApiContracts)[number]["id"];

export const screenApiContractStatusLabels = {
  "완료": "[완료]",
  "진행": "[진행]",
  "예정": "[예정]",
  "불일치": "[불일치]",
} as const satisfies Record<ScreenContractStatus, `[${ScreenContractStatus}]`>;
