export type AuthUser = {
  id: string;
  avatarUrl?: string | null;
  bubliId: string;
  email: string;
  googleSub: string;
  locale?: string | null;
  name: string;
  timezone?: string | null;
};

export type AuthTokenResponse = {
  accessToken: string;
  expiresAt: string;
  expiresIn: number;
  tokenType: "Bearer";
};

export type AuthErrorCode =
  | "AUTH_OAUTH_INVALID_CODE"
  | "AUTH_OAUTH_SUB_MISSING"
  | "AUTH_UNSUPPORTED_PROVIDER"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_INVALID_TOKEN"
  | "AUTH_REFRESH_TOKEN_EXPIRED"
  | "AUTH_REFRESH_TOKEN_REUSED"
  | "AUTH_UNAUTHENTICATED"
  | "AUTH_FORBIDDEN";
