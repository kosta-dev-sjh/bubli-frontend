export type AuthUser = {
  id: string;
  avatarUrl?: string | null;
  bubliId: string;
  email?: string | null;
  googleSub?: string | null;
  locale?: string | null;
  name: string;
  timezone?: string | null;
};

export type AuthClientType = "WEB" | "TAURI";

export type AuthTokenResponse = {
  accessToken: string;
  expiresAt: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenType: "Bearer";
  user: AuthUser;
};

export type GoogleAuthorizeResponse = {
  authorizeUrl: string;
};

export type GoogleCallbackRequest = {
  clientType: AuthClientType;
  code: string;
  redirectUri: string;
};

export type AuthLoginResponse = AuthTokenResponse;

export type AuthRefreshResponse = AuthTokenResponse;

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
