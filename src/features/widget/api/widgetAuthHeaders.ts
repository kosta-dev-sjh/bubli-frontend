import { getAuthAccessToken } from "@/lib/auth/auth-session";

function shouldUseWidgetDevAuthToken() {
  return process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_BUBLI_PREVIEW_DATA === "true";
}

export function withWidgetDevAuthHeaders(headers?: HeadersInit): HeadersInit {
  const next = new Headers(headers);
  const token = process.env.NEXT_PUBLIC_BUBLI_DEV_ACCESS_TOKEN;
  const sessionToken = getAuthAccessToken();

  if (token && !sessionToken && shouldUseWidgetDevAuthToken() && !next.has("Authorization")) {
    next.set("Authorization", `Bearer ${token}`);
  }

  return next;
}
