import type { PageResponse, RealtimeActor } from "@/types/api/common";
import type { AgentSuggestionResponse } from "@/types/api/agent";

export type ChatMessageType = "TEXT" | "FILE" | "AGENT_COMMAND" | "AGENT_RESPONSE" | "SYSTEM";

export type AgentCitationRetrievalMode = "SEMANTIC" | "TITLE_MATCH" | "RECENT_SUMMARY";

export type AgentAnswerCompleteness = "ANSWERED" | "PARTIAL" | "NO_EVIDENCE";

export type AgentMissingInfo =
  | "AMBIGUOUS_RESOURCE_INTENT"
  | "NO_RELEVANT_DOCUMENT"
  | "NO_RELEVANT_PERSONAL_DOCUMENT"
  | "NO_RELEVANT_PROJECT_GROUNDING"
  | "PARTIAL_EVIDENCE";

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

export type AgentCitation = {
  chunkIndex?: number | null;
  endLine?: number | null;
  pageNumber?: number | null;
  quote?: string | null;
  retrievalMode?: AgentCitationRetrievalMode | null;
  resourceId?: string | null;
  similarityScore?: number | null;
  startLine?: number | null;
  title: string;
};

export type ChatMessageListResponse = PageResponse<ChatMessageResponse>;

export type ChatRoomType = "DIRECT" | "GROUP" | "ROOM";

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

export type ProjectChatRoomRequest = {
  roomId: string;
};

export type InviteChatRoomMembersRequest = {
  memberUserIds: string[];
};

export type RoomAgentCommandMode = "ANSWER" | "SUMMARIZE" | "SUGGEST";

export type RoomAgentCommandRequest = {
  clientMessageId: string;
  message: string;
  mode?: RoomAgentCommandMode;
  resourceIds?: string[];
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
