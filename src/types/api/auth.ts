export type AuthUser = {
  id: string;
  email: string;
  name: string;
  profileImageUrl?: string | null;
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
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_INVALID_TOKEN"
  | "AUTH_REFRESH_TOKEN_EXPIRED"
  | "AUTH_REFRESH_TOKEN_REUSED"
  | "AUTH_UNAUTHENTICATED"
  | "AUTH_FORBIDDEN";
