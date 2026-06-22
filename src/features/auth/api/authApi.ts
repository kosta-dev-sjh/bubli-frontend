import { apiRequest } from "@/lib/api/client";
import type { AuthUser, LoginResponse, RefreshResponse, TauriLoginResponse, TauriRefreshResponse } from "@/types/api/auth";

export type SignupRequest = {
  email: string;
  password: string;
  name: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type UpdateMeRequest = Partial<Pick<AuthUser, "name" | "profileImageUrl">>;

export const authApi = {
  signup(body: SignupRequest) {
    return apiRequest<LoginResponse>("/api/auth/signup", {
      body,
      method: "POST",
    });
  },

  login(body: LoginRequest) {
    return apiRequest<LoginResponse>("/api/auth/login", {
      body,
      method: "POST",
    });
  },

  loginForTauri(body: LoginRequest) {
    return apiRequest<TauriLoginResponse>("/api/auth/login", {
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
