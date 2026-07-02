import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:8080";

function getApiBaseUrl(origin: string) {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? origin : DEFAULT_LOCAL_API_BASE_URL;
}

function loginFallback(origin: string) {
  return NextResponse.redirect(new URL("/login?authError=oauth-start", origin));
}

export async function GET(request: NextRequest) {
  const currentUrl = new URL(request.url);
  const origin = currentUrl.origin;
  const redirectUri = currentUrl.searchParams.get("redirectUri") ?? currentUrl.searchParams.get("redirect_uri") ?? `${origin}/auth/callback`;
  const clientType = currentUrl.searchParams.get("clientType") ?? "WEB";
  const state = currentUrl.searchParams.get("state") ?? "login";
  const params = new URLSearchParams({ clientType, redirectUri, state });

  try {
    const response = await fetch(`${getApiBaseUrl(origin)}/api/auth/google/authorize?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return loginFallback(origin);
    }

    const payload = (await response.json()) as { data?: { authorizeUrl?: string }; success?: boolean };
    const authorizeUrl = payload.success ? payload.data?.authorizeUrl : null;

    if (!authorizeUrl) {
      return loginFallback(origin);
    }

    return NextResponse.redirect(authorizeUrl);
  } catch {
    return loginFallback(origin);
  }
}
