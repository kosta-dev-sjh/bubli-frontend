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
