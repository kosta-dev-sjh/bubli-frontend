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
    traceId?: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type PageResponse<T> = {
  items: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  nextCursor?: string;
};
