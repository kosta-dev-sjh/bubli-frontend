import { apiRequest, getApiBaseUrl } from "@/lib/api/client";
import type { AuthRefreshResponse, AuthUser } from "@/types/api/auth";

export type UpdateMeRequest = Partial<Pick<AuthUser, "avatarUrl" | "locale" | "name" | "timezone">>;

export const authApi = {
  getGoogleAuthorizationUrl() {
    return `${getApiBaseUrl()}/oauth2/authorization/google`;
  },

  logout() {
    return apiRequest<null>("/api/auth/logout", {
      method: "POST",
    });
  },

  refresh() {
    return apiRequest<AuthRefreshResponse>("/api/auth/refresh", {
      method: "POST",
    });
  },

  getMe() {
    return apiRequest<AuthUser>("/api/me");
  },

  updateMe(body: UpdateMeRequest) {
    return apiRequest<AuthUser>("/api/me", {
      body,
      method: "PATCH",
    });
  },
} as const;
