export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

export type NotificationResponse = {
  body?: string | null;
  createdAt: string;
  id: string;
  readAt?: string | null;
  sourceId?: string | null;
  sourceType?: "MESSAGE" | "COMMENT" | "RESOURCE" | "AGENT" | null;
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
