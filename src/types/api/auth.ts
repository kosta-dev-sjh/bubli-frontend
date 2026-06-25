export type AuthUser = {
  id: string;
  bubliId: string;
  email?: string | null;
  locale?: string | null;
  name: string;
  profileImageUrl?: string | null;
  timezone?: string | null;
};

export type GoogleAuthorizeResponse = {
  authorizeUrl: string;
  state?: string;
};

export type GoogleCallbackRequest = {
  code: string;
  redirectUri?: string;
  state?: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  expiresAt: string;
  user: AuthUser;
};

export type TauriLoginResponse = LoginResponse & {
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type RefreshResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  expiresAt: string;
};

export type TauriRefreshResponse = RefreshResponse & {
  refreshToken: string;
  refreshTokenExpiresAt: string;
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
