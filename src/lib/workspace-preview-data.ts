import type { AuthUser } from "@/types/api/auth";
import type { AgentSuggestionResponse } from "@/types/api/agent";
import type { ChatMessageResponse, ChatRoomResponse } from "@/types/api/chat";
import type { PageResponse } from "@/types/api/common";
import type { ProjectRoomMemberResponse, ProjectRoomResponse } from "@/types/api/projectRoom";
import type { ResourceResponse } from "@/types/api/resource";
import type { DashboardWorkResponse, ScheduleResponse, TaskResponse, WbsBoardResponse, WbsItemResponse } from "@/types/api/work";

const now = new Date("2026-06-30T09:00:00.000+09:00").toISOString();
const todayNoon = new Date("2026-06-30T12:00:00.000+09:00").toISOString();
const todayEvening = new Date("2026-06-30T18:00:00.000+09:00").toISOString();
const tomorrow = new Date("2026-07-01T10:00:00.000+09:00").toISOString();

export function shouldUseWorkspacePreviewData() {
  return process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_BUBLI_PREVIEW_DATA !== "false";
}

export function pageOf<T>(items: T[]): PageResponse<T> {
  return {
    hasNext: false,
    items,
    page: 0,
    size: items.length,
    totalElements: items.length,
    totalPages: items.length > 0 ? 1 : 0,
  };
}

export const workspacePreviewUser: AuthUser = {
  avatarUrl: null,
  bubliId: "local-user",
  email: null,
  googleSub: null,
  id: "11111111-1111-4111-8111-111111111111",
  locale: "ko-KR",
  name: "사용자",
  timezone: "Asia/Seoul",
};

export const workspacePreviewRooms: ProjectRoomResponse[] = [
  {
    clientName: "메인 배너 시안",
    closedAt: null,
    contractAmount: 1800000,
    createdAt: "2026-06-26T10:00:00.000+09:00",
    createdByUserId: workspacePreviewUser.id,
    id: "22222222-2222-4222-8222-222222222222",
    name: "브랜드 상세페이지",
    paidAt: null,
    paymentDueDate: "2026-07-05",
    paymentStatus: "PENDING",
    status: "ACTIVE",
    updatedAt: now,
  },
  {
    clientName: "런칭 준비",
    closedAt: null,
    contractAmount: 2400000,
    createdAt: "2026-06-24T14:20:00.000+09:00",
    createdByUserId: workspacePreviewUser.id,
    id: "33333333-3333-4333-8333-333333333333",
    name: "SaaS 온보딩 개편",
    paidAt: null,
    paymentDueDate: "2026-07-10",
    paymentStatus: "NOT_RECORDED",
    status: "ACTIVE",
    updatedAt: todayNoon,
  },
];

export function workspacePreviewRoomById(roomId: string, fallbackName?: string | null): ProjectRoomResponse {
  const room = workspacePreviewRooms.find((item) => item.id === roomId);
  if (room) return room;

  return {
    clientName: null,
    closedAt: null,
    contractAmount: null,
    createdAt: now,
    createdByUserId: workspacePreviewUser.id,
    id: roomId,
    name: fallbackName?.trim() || "새 프로젝트룸",
    paidAt: null,
    paymentDueDate: null,
    paymentStatus: "NOT_RECORDED",
    status: "ACTIVE",
    updatedAt: now,
  };
}

export const workspacePreviewMembers: ProjectRoomMemberResponse[] = [
  {
    joinedAt: "2026-06-26T10:00:00.000+09:00",
    role: "PROJECT_LEADER",
    status: "ACTIVE",
    user: {
      avatarUrl: null,
      bubliId: workspacePreviewUser.bubliId,
      id: workspacePreviewUser.id,
      name: workspacePreviewUser.name,
    },
  },
];

const personalResourceOwner = workspacePreviewUser.id;
const primaryRoomId = workspacePreviewRooms[0].id;
const primaryChatRoomId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0";
const directChatRoomId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";

export const workspacePreviewPersonalResources: ResourceResponse[] = [
  {
    createdAt: "2026-06-29T09:30:00.000+09:00",
    currentVersion: {
      createdAt: "2026-06-29T09:30:00.000+09:00",
      id: "44444444-4444-4444-8444-444444444401",
      mimeType: "application/pdf",
      originalName: "브랜드_참고자료.pdf",
      resourceId: "44444444-4444-4444-8444-444444444400",
      sizeBytes: 1280000,
      versionNo: 1,
    },
    id: "44444444-4444-4444-8444-444444444400",
    kind: "FILE",
    ownerId: personalResourceOwner,
    roomId: null,
    status: "ANALYZED",
    summaryStatus: "SUCCEEDED",
    title: "브랜드 참고자료.pdf",
    updatedAt: todayNoon,
    visibility: "PERSONAL",
  },
  {
    createdAt: "2026-06-28T16:10:00.000+09:00",
    currentVersion: {
      createdAt: "2026-06-28T16:10:00.000+09:00",
      id: "44444444-4444-4444-8444-444444444411",
      mimeType: "text/markdown",
      originalName: "작업_메모_06-28.md",
      resourceId: "44444444-4444-4444-8444-444444444410",
      sizeBytes: 42000,
      versionNo: 1,
    },
    id: "44444444-4444-4444-8444-444444444410",
    kind: "FILE",
    ownerId: personalResourceOwner,
    roomId: null,
    status: "ANALYZING",
    summaryStatus: "PENDING",
    title: "작업 메모 06-28.md",
    updatedAt: todayEvening,
    visibility: "PERSONAL",
  },
];

export const workspacePreviewRoomResources: ResourceResponse[] = [
  {
    createdAt: "2026-06-27T11:00:00.000+09:00",
    currentVersion: {
      createdAt: "2026-06-27T11:00:00.000+09:00",
      id: "55555555-5555-4555-8555-555555555501",
      mimeType: "application/pdf",
      originalName: "브랜드상세페이지_작업범위.pdf",
      resourceId: "55555555-5555-4555-8555-555555555500",
      sizeBytes: 2200000,
      versionNo: 1,
    },
    id: "55555555-5555-4555-8555-555555555500",
    kind: "FILE",
    ownerId: personalResourceOwner,
    roomId: primaryRoomId,
    status: "READY",
    summaryStatus: "NONE",
    title: "브랜드상세페이지_작업범위.pdf",
    updatedAt: todayNoon,
    visibility: "ROOM_SHARED",
  },
  {
    createdAt: "2026-06-29T17:30:00.000+09:00",
    currentVersion: {
      createdAt: "2026-06-29T17:30:00.000+09:00",
      id: "55555555-5555-4555-8555-555555555511",
      mimeType: "image/png",
      originalName: "메인배너_시안.png",
      resourceId: "55555555-5555-4555-8555-555555555510",
      sizeBytes: 960000,
      versionNo: 1,
    },
    id: "55555555-5555-4555-8555-555555555510",
    kind: "FILE",
    ownerId: personalResourceOwner,
    roomId: primaryRoomId,
    status: "FAILED",
    summaryStatus: "FAILED",
    title: "메인배너_시안.png",
    updatedAt: now,
    visibility: "ROOM_SHARED",
  },
];

const previewTasks: TaskResponse[] = [
  {
    assigneeUserId: workspacePreviewUser.id,
    createdAt: now,
    description: "자료 기준과 납품 범위 확인",
    dueAt: todayEvening,
    id: "66666666-6666-4666-8666-666666666600",
    ownerUserId: workspacePreviewUser.id,
    roomId: primaryRoomId,
    status: "REVIEW",
    title: "작업 범위 확인",
    updatedAt: now,
    wbsItemId: null,
  },
  {
    assigneeUserId: workspacePreviewUser.id,
    createdAt: now,
    description: "메인 배너 화면 구성과 카피 정리",
    dueAt: tomorrow,
    id: "66666666-6666-4666-8666-666666666610",
    ownerUserId: workspacePreviewUser.id,
    roomId: primaryRoomId,
    status: "IN_PROGRESS",
    title: "메인 배너 1차 시안",
    updatedAt: now,
    wbsItemId: null,
  },
  {
    assigneeUserId: workspacePreviewUser.id,
    createdAt: now,
    description: "모바일 기준에서 버튼과 섹션 겹침 확인",
    dueAt: tomorrow,
    id: "66666666-6666-4666-8666-666666666620",
    ownerUserId: workspacePreviewUser.id,
    roomId: primaryRoomId,
    status: "TODO",
    title: "반응형 점검",
    updatedAt: now,
    wbsItemId: null,
  },
  {
    assigneeUserId: workspacePreviewUser.id,
    createdAt: now,
    description: "피드백 반영 후 최종 확인 요청",
    dueAt: "2026-07-02T15:00:00.000+09:00",
    id: "66666666-6666-4666-8666-666666666630",
    ownerUserId: workspacePreviewUser.id,
    roomId: primaryRoomId,
    status: "DONE",
    title: "검수 요청",
    updatedAt: now,
    wbsItemId: null,
  },
  {
    assigneeUserId: workspacePreviewUser.id,
    createdAt: now,
    description: "확인 질문과 답변을 작업 기준에 반영",
    dueAt: "2026-07-02T18:00:00.000+09:00",
    id: "66666666-6666-4666-8666-666666666640",
    ownerUserId: workspacePreviewUser.id,
    roomId: primaryRoomId,
    status: "BLOCKED",
    title: "확인 질문 정리",
    updatedAt: now,
    wbsItemId: null,
  },
  {
    assigneeUserId: workspacePreviewUser.id,
    createdAt: now,
    description: "마감 전 최종 제출 묶음 확인",
    dueAt: "2026-07-03T11:00:00.000+09:00",
    id: "66666666-6666-4666-8666-666666666650",
    ownerUserId: workspacePreviewUser.id,
    roomId: primaryRoomId,
    status: "TODO",
    title: "제출 파일 정리",
    updatedAt: now,
    wbsItemId: null,
  },
];

const previewSchedules: ScheduleResponse[] = [
  {
    allDay: false,
    createdAt: now,
    endsAt: todayEvening,
    id: "77777777-7777-4777-8777-777777777700",
    lastSyncedAt: null,
    ownerUserId: workspacePreviewUser.id,
    roomId: primaryRoomId,
    startsAt: todayNoon,
    syncStatus: "LOCAL_ONLY",
    taskId: null,
    title: "클라이언트 확인 미팅",
    updatedAt: now,
    wbsItemId: null,
  },
];

export function workspacePreviewSchedules(roomId?: string | null): ScheduleResponse[] {
  if (!roomId) return previewSchedules;
  return previewSchedules.map((schedule) => ({ ...schedule, roomId }));
}

function previewWbsItems(roomId: string): WbsItemResponse[] {
  return [
    {
      assigneeUserId: workspacePreviewUser.id,
      createdAt: now,
      dueDate: "2026-06-30",
      id: "88888888-8888-4888-8888-888888888800",
      parentId: null,
      roomId,
      sortOrder: 1,
      status: "IN_PROGRESS",
      title: "자료 기준 정리",
      updatedAt: now,
    },
    {
      assigneeUserId: workspacePreviewUser.id,
      createdAt: now,
      dueDate: "2026-07-01",
      id: "88888888-8888-4888-8888-888888888810",
      parentId: "88888888-8888-4888-8888-888888888800",
      roomId,
      sortOrder: 2,
      status: "REVIEW",
      title: "작업 범위 확인",
      updatedAt: now,
    },
    {
      assigneeUserId: workspacePreviewUser.id,
      createdAt: now,
      dueDate: "2026-07-01",
      id: "88888888-8888-4888-8888-888888888820",
      parentId: null,
      roomId,
      sortOrder: 3,
      status: "IN_PROGRESS",
      title: "1차 시안 정리",
      updatedAt: now,
    },
    {
      assigneeUserId: workspacePreviewUser.id,
      createdAt: now,
      dueDate: "2026-07-02",
      id: "88888888-8888-4888-8888-888888888830",
      parentId: "88888888-8888-4888-8888-888888888820",
      roomId,
      sortOrder: 4,
      status: "TODO",
      title: "반응형 점검",
      updatedAt: now,
    },
    {
      assigneeUserId: workspacePreviewUser.id,
      createdAt: now,
      dueDate: "2026-07-02",
      id: "88888888-8888-4888-8888-888888888840",
      parentId: null,
      roomId,
      sortOrder: 5,
    status: "TODO",
    title: "검수 요청",
    updatedAt: now,
  },
  {
    assigneeUserId: workspacePreviewUser.id,
    createdAt: now,
    dueDate: "2026-07-02",
    id: "88888888-8888-4888-8888-888888888850",
    parentId: "88888888-8888-4888-8888-888888888840",
    roomId,
    sortOrder: 6,
    status: "BLOCKED",
    title: "확인 질문 정리",
    updatedAt: now,
  },
  {
    assigneeUserId: workspacePreviewUser.id,
    createdAt: now,
    dueDate: "2026-07-03",
    id: "88888888-8888-4888-8888-888888888860",
    parentId: "88888888-8888-4888-8888-888888888840",
    roomId,
    sortOrder: 7,
    status: "TODO",
    title: "제출 파일 정리",
    updatedAt: now,
  },
  {
    assigneeUserId: workspacePreviewUser.id,
    createdAt: now,
    dueDate: "2026-07-03",
    id: "88888888-8888-4888-8888-888888888870",
    parentId: null,
    roomId,
    sortOrder: 8,
    status: "TODO",
    title: "최종 공유",
    updatedAt: now,
  },
  ];
}

export function workspacePreviewWbsBoard(roomId = primaryRoomId): WbsBoardResponse {
  const items = previewWbsItems(roomId);

  return {
    roomId,
    tasks: previewTasks.map((task, index) => ({
      ...task,
      roomId,
      wbsItemId: items[[1, 2, 3, 4, 5, 6][index] ?? 0]?.id ?? null,
    })),
    wbsItems: items,
  };
}

export function workspacePreviewRoomSuggestions(roomId = primaryRoomId): AgentSuggestionResponse[] {
  return [
    {
      createdAt: now,
      evidenceJson: { resourceTitle: "브랜드상세페이지_작업범위.pdf" },
      jobId: null,
      payloadJson: { title: "작업 범위 확인을 작업으로 승인" },
      resourceId: workspacePreviewRoomResources[0]?.id ?? null,
      roomId,
      suggestionId: "99999999-9999-4999-8999-999999999900",
      status: "DRAFT",
      suggestionType: "TODO",
      updatedAt: now,
      userId: workspacePreviewUser.id,
    },
    {
      createdAt: now,
      evidenceJson: { resourceTitle: "메인배너_시안.png" },
      jobId: null,
      payloadJson: { title: "시안 확인 질문을 남기기" },
      resourceId: workspacePreviewRoomResources[1]?.id ?? null,
      roomId,
      suggestionId: "99999999-9999-4999-8999-999999999910",
      status: "DRAFT",
      suggestionType: "QUESTION",
      updatedAt: now,
      userId: workspacePreviewUser.id,
    },
  ];
}

export function workspacePreviewPersonalSuggestions(): AgentSuggestionResponse[] {
  return [
    {
      createdAt: todayNoon,
      evidenceJson: { source: "personal-resource" },
      jobId: null,
      payloadJson: { title: "요구사항 정리.pdf를 프로젝트룸에 공유할지 확인" },
      resourceId: workspacePreviewPersonalResources[0]?.id ?? null,
      roomId: null,
      suggestionId: "99999999-9999-4999-8999-999999999920",
      status: "DRAFT",
      suggestionType: "REVIEW_ITEM",
      updatedAt: todayNoon,
      userId: workspacePreviewUser.id,
    },
  ];
}

export const workspacePreviewChatRooms: ChatRoomResponse[] = [
  {
    chatType: "ROOM",
    createdAt: "2026-06-27T11:20:00.000+09:00",
    id: primaryChatRoomId,
    name: "브랜드 상세페이지 대화",
    roomId: primaryRoomId,
    status: "ACTIVE",
    updatedAt: now,
  },
  {
    chatType: "DIRECT",
    createdAt: "2026-06-28T13:00:00.000+09:00",
    id: directChatRoomId,
    name: "디자인 확인",
    roomId: null,
    status: "ACTIVE",
    updatedAt: todayNoon,
  },
];

export function workspacePreviewChatRoomsFor(roomId?: string | null, roomLabel?: string | null): ChatRoomResponse[] {
  if (!roomId || workspacePreviewChatRooms.some((room) => room.roomId === roomId)) {
    return workspacePreviewChatRooms;
  }

  const room = workspacePreviewRoomById(roomId, roomLabel);

  return [
    {
      chatType: "ROOM",
      createdAt: now,
      id: `preview-chat-${roomId}`,
      name: `${room.name} 대화`,
      roomId,
      status: "ACTIVE",
      updatedAt: now,
    },
    ...workspacePreviewChatRooms,
  ];
}

export function workspacePreviewChatMessages(chatRoomId = primaryChatRoomId): ChatMessageResponse[] {
  if (chatRoomId === directChatRoomId) {
    return [
      {
        body: { text: "시안 확인은 프로젝트룸 자료에 붙여둘게요." },
        chatRoomId,
        createdAt: todayNoon,
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb0",
        messageType: "TEXT",
        roomSequence: 1,
        sender: {
          id: "preview-teammate",
          name: "팀원",
          type: "USER",
        },
      },
    ];
  }

  return [
    {
      body: { text: "작업 범위와 메인 배너 시안은 자료보드에 올려뒀습니다." },
      chatRoomId,
      createdAt: "2026-06-30T09:20:00.000+09:00",
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
      messageType: "TEXT",
      roomSequence: 1,
      sender: {
        id: workspacePreviewUser.id,
        name: workspacePreviewUser.name,
        type: "USER",
      },
    },
    {
      body: { text: "확인할 후보 2개가 작업판에 올라왔습니다." },
      chatRoomId,
      createdAt: "2026-06-30T09:32:00.000+09:00",
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
      messageType: "AGENT_RESPONSE",
      roomSequence: 2,
      sender: {
        id: null,
        name: "Bubli 에이전트",
        type: "AGENT",
      },
    },
  ];
}

export const workspacePreviewDashboard: DashboardWorkResponse = {
  todaySchedules: previewSchedules,
  todayTasks: previewTasks.slice(0, 1),
  upcomingDeadlines: previewTasks.slice(1),
};
