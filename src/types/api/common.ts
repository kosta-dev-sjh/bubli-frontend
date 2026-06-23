export type ApiSuccess<T> = {
  success: true;
  data: T;
  error: null;
};

export type ApiFailure = {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    traceId: string;
    fields?: ApiFieldError[];
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type ApiFieldError = {
  field: string;
  reason: string;
};

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements?: number;
  totalPages: number;
  hasNext: boolean;
};

export type SequenceListResponse<T> = {
  items: T[];
  lastReceivedSequence: number | null;
  latestSequence: number;
  hasNext: boolean;
};

export type RealtimeActor = {
  type: "USER" | "SYSTEM" | "AGENT";
  id: string | null;
  name: string;
};

export type RealtimeEnvelope<T> = {
  eventId: string;
  eventType: string;
  sequence?: number;
  roomId?: string;
  chatRoomId?: string;
  occurredAt: string;
  actor?: RealtimeActor;
  payload: T;
};
