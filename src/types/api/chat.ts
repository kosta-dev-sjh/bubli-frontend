import type { PageResponse, RealtimeActor } from "@/types/api/common";
import type { AgentSuggestionResponse } from "@/types/api/agent";

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

export type GroupChatRoomRequest = {
  memberUserIds: string[];
  name: string;
};

export type RoomAgentCommandRequest = {
  body: Record<string, unknown>;
  clientMessageId: string;
  command: string;
};

export type RoomAgentCommandResponse = {
  message: ChatMessageResponse;
  memorySummary?: RoomMemorySummaryResponse | null;
  suggestions: AgentSuggestionResponse[];
};

export type RoomMemorySummaryCreateRequest = {
  fromSequence: number;
  summaryJson: string;
  toSequence: number;
};

export type RoomMemorySummaryStatus = "DRAFT" | "APPROVED";

export type RoomMemorySummaryResponse = {
  createdAt: string;
  fromSequence: number;
  id: string;
  status: RoomMemorySummaryStatus;
  summaryJson: string;
  toSequence: number;
};
