export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

export type NotificationResponse = {
  body?: string | null;
  createdAt: string;
  id: string;
  readAt?: string | null;
  sourceId?: string | null;
  sourceType?:
    | "MESSAGE"
    | "COMMENT"
    | "RESOURCE"
    | "AGENT"
    | "VOICE_CALL"
    | "VOICE_CALL_ROOM"
    | "VOICE_CALL_DECLINED"
    | "VOICE_CALL_CANCELED"
    | "FRIEND_REQUEST"
    | "FRIEND_ACCEPTED"
    | "ROOM_INVITE"
    | "CHAT_INVITE"
    | null;
  status: NotificationStatus;
  title: string;
};

export type NotificationPreferencesResponse = {
  agentEnabled: boolean;
  capacityEnabled: boolean;
  commentEnabled: boolean;
  messageEnabled: boolean;
  resourceVersionEnabled: boolean;
};

export type NotificationPreferencesUpdateRequest = Partial<NotificationPreferencesResponse>;
