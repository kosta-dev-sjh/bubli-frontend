import { apiRequest } from "@/lib/api/client";
import type { ChatMessageListResponse, ChatMessageResponse, ChatMessageType } from "@/types/api/chat";

export type SendChatMessageRequest = {
  clientMessageId: string;
  messageType?: Extract<ChatMessageType, "TEXT" | "FILE" | "AGENT_COMMAND">;
  body: Record<string, unknown>;
};

export const chatApi = {
  getMessages(chatRoomId: string, params: { afterSequence?: number; beforeSequence?: number; limit?: number } = {}) {
    const searchParams = new URLSearchParams();

    if (params.afterSequence !== undefined) searchParams.set("afterSequence", String(params.afterSequence));
    if (params.beforeSequence !== undefined) searchParams.set("beforeSequence", String(params.beforeSequence));
    if (params.limit !== undefined) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    return apiRequest<ChatMessageListResponse>(`/api/chat/rooms/${chatRoomId}/messages${query ? `?${query}` : ""}`);
  },

  sendMessage(chatRoomId: string, { clientMessageId, ...body }: SendChatMessageRequest) {
    return apiRequest<ChatMessageResponse>(`/api/chat/rooms/${chatRoomId}/messages`, {
      body,
      headers: {
        "Idempotency-Key": clientMessageId,
      },
      method: "POST",
    });
  },

  markRead(chatRoomId: string, lastReadSequence: number) {
    return apiRequest<null>(`/api/chat/rooms/${chatRoomId}/read`, {
      body: {
        lastReadSequence,
      },
      method: "PATCH",
    });
  },
} as const;
