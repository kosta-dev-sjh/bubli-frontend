import type { RealtimeActor } from "@/types/api/common";

export type ChatMessageType = "TEXT" | "FILE" | "AGENT_COMMAND" | "AGENT_RESPONSE" | "SYSTEM";

export type ChatMessageResponse = {
  id: string;
  chatRoomId: string;
  sender: RealtimeActor;
  messageType: ChatMessageType;
  body: Record<string, unknown>;
  clientMessageId?: string;
  roomSequence: number;
  createdAt: string;
};

export type ChatMessageListResponse = {
  messages: ChatMessageResponse[];
  oldestSequence: number | null;
  lastReceivedSequence: number | null;
  latestRoomSequence: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export type ChatRoomType = "DIRECT" | "PROJECT_ROOM";

export type ChatRoomResponse = {
  id: string;
  lastMessage?: ChatMessageResponse | null;
  name?: string | null;
  roomId?: string | null;
  type: ChatRoomType;
  unreadCount: number;
  updatedAt: string;
};

export type DirectChatRoomRequest = {
  friendUserId: string;
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
