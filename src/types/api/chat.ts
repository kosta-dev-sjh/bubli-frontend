import type { PageResponse, RealtimeActor } from "@/types/api/common";

export type ChatMessageType = "TEXT" | "FILE" | "AGENT_COMMAND" | "AGENT_RESPONSE" | "SYSTEM";

export type ChatMessageResponse = {
  body: Record<string, unknown>;
  chatRoomId: string;
  clientMessageId?: string;
  createdAt: string;
  id: string;
  messageType: ChatMessageType;
  resourceId?: string | null;
  roomSequence: number;
  sender: RealtimeActor;
};

export type ChatMessageListResponse = PageResponse<ChatMessageResponse>;

export type ChatRoomType = "DIRECT" | "ROOM";

export type ChatRoomStatus = "ACTIVE" | "CLOSED";

export type ChatRoomResponse = {
  chatType: ChatRoomType;
  createdAt: string;
  id: string;
  name?: string | null;
  roomId?: string | null;
  status: ChatRoomStatus;
  updatedAt: string;
};

export type ChatRoomPageResponse = PageResponse<ChatRoomResponse>;

export type DirectChatRoomRequest = {
  targetUserId: string;
};

export type RoomAgentCommandRequest = {
  body: Record<string, unknown>;
  clientMessageId: string;
  command: string;
};

export type RoomMemorySummaryCreateRequest = {
  fromSequence?: number;
  toSequence?: number;
  trigger?: "MANUAL" | "AGENT_COMMAND" | "AUTO";
};

export type RoomMemorySummaryResponse = {
  createdAt: string;
  fromSequence: number;
  id: string;
  roomId: string;
  summary: Record<string, unknown>;
  toSequence: number;
};
