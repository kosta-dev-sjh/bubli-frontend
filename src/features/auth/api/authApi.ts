import { apiRequest } from "@/lib/api/client";
import type {
  AuthUser,
  GoogleAuthorizeResponse,
  GoogleCallbackRequest,
  LoginResponse,
  RefreshResponse,
  TauriLoginResponse,
  TauriRefreshResponse,
} from "@/types/api/auth";

export type UpdateMeRequest = Partial<Pick<AuthUser, "name" | "profileImageUrl">>;

export const authApi = {
  getGoogleAuthorizeUrl() {
    return apiRequest<GoogleAuthorizeResponse>("/api/auth/google/authorize");
  },

  completeGoogleLogin(body: GoogleCallbackRequest) {
    return apiRequest<LoginResponse>("/api/auth/google/callback", {
      body,
      method: "POST",
    });
  },

  completeGoogleLoginForTauri(body: GoogleCallbackRequest) {
    return apiRequest<TauriLoginResponse>("/api/auth/google/callback", {
      body,
      headers: {
        "X-Bubli-Client": "tauri",
      },
      method: "POST",
    });
  },

  logout() {
    return apiRequest<null>("/api/auth/logout", {
      method: "POST",
    });
  },

  refresh() {
    return apiRequest<RefreshResponse>("/api/auth/refresh", {
      method: "POST",
    });
  },

  refreshForTauri() {
    return apiRequest<TauriRefreshResponse>("/api/auth/refresh", {
      headers: {
        "X-Bubli-Client": "tauri",
      },
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
