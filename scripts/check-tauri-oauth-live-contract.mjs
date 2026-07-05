const DEFAULT_API_BASE_URL = "http://localhost:8080";
const TAURI_LOOPBACK_REDIRECT_URI = "http://127.0.0.1:3791/auth/callback";
const TEST_STATE = "tauri-oauth-live-contract";
const REQUEST_TIMEOUT_MS = 10_000;

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.BUBLI_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function looksLikePlaceholder(value) {
  return /CHANGE_ME|TODO|YOUR_|PLACEHOLDER|EXAMPLE/i.test(value);
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const text = await response.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Expected JSON response from ${url}, received: ${text.slice(0, 160)}`);
    }

    return { payload, response };
  } finally {
    clearTimeout(timeout);
  }
}

function buildAuthorizeContractUrl() {
  const url = new URL("/api/auth/google/authorize", apiBaseUrl());
  url.searchParams.set("clientType", "TAURI");
  url.searchParams.set("redirectUri", TAURI_LOOPBACK_REDIRECT_URI);
  url.searchParams.set("state", TEST_STATE);
  return url;
}

function validateAuthorizePayload(payload, response) {
  const contentType = response.headers.get("content-type") ?? "";
  const serializedPayload = JSON.stringify(payload);

  assert(response.status === 200, `Expected HTTP 200 from backend authorize contract, received ${response.status}.`);
  assert(contentType.includes("application/json"), "Expected backend authorize contract response to be JSON.");
  assert(!/client_secret|access_token|refresh_token|accessToken|refreshToken/i.test(serializedPayload), "Authorize response must not expose OAuth secrets or tokens.");
  assert(payload?.success === true, "Expected backend authorize contract response success=true.");
  assert(payload?.data && typeof payload.data.authorizeUrl === "string", "Expected data.authorizeUrl string.");
  assert(payload.error === null, "Expected backend authorize contract response error=null.");

  let authorizeUrl;
  try {
    authorizeUrl = new URL(payload.data.authorizeUrl);
  } catch {
    throw new Error("data.authorizeUrl must be an absolute URL.");
  }

  assert(
    authorizeUrl.hostname === "accounts.google.com" && authorizeUrl.pathname === "/o/oauth2/v2/auth",
    "Tauri OAuth authorizeUrl must target Google OAuth v2 authorize endpoint.",
  );

  const clientId = authorizeUrl.searchParams.get("client_id")?.trim() ?? "";
  const redirectUri = authorizeUrl.searchParams.get("redirect_uri");
  const responseType = authorizeUrl.searchParams.get("response_type");
  const state = authorizeUrl.searchParams.get("state");
  const scope = authorizeUrl.searchParams.get("scope") ?? "";
  const includeGrantedScopes = authorizeUrl.searchParams.get("include_granted_scopes");
  const prompt = authorizeUrl.searchParams.get("prompt");
  const scopeTokens = new Set(scope.split(/\s+/).filter(Boolean));

  assert(clientId.length > 0, "Google OAuth authorizeUrl must include client_id.");
  assert(!looksLikePlaceholder(clientId), "Google OAuth client_id must not be a placeholder.");
  assert(redirectUri === TAURI_LOOPBACK_REDIRECT_URI, "Tauri OAuth redirect_uri must match the loopback callback.");
  assert(responseType === "code", "Tauri OAuth response_type must be code.");
  assert(state === TEST_STATE, "Tauri OAuth authorizeUrl must preserve the requested state.");
  assert(includeGrantedScopes === "true", "Tauri OAuth include_granted_scopes must be true.");
  assert(prompt === "select_account", "Tauri OAuth prompt must be select_account.");

  for (const requiredScope of [
    "openid",
    "profile",
    "email",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ]) {
    assert(scopeTokens.has(requiredScope), `Tauri OAuth scope must include ${requiredScope}.`);
  }

  return {
    accessType: authorizeUrl.searchParams.get("access_type"),
    clientIdPresent: true,
    clientIdLooksPlaceholder: false,
    host: authorizeUrl.hostname,
    path: authorizeUrl.pathname,
    includeGrantedScopes,
    prompt,
    redirectUri,
    responseType,
    scopeIncludesCalendarEvents: scopeTokens.has("https://www.googleapis.com/auth/calendar.events"),
    scopeIncludesCalendarReadonly: scopeTokens.has("https://www.googleapis.com/auth/calendar.readonly"),
    state,
  };
}

async function main() {
  const requestUrl = buildAuthorizeContractUrl();
  const { payload, response } = await fetchJson(requestUrl);
  const summary = validateAuthorizePayload(payload, response);

  console.log(
    JSON.stringify(
      {
        apiBaseUrl: apiBaseUrl(),
        endpoint: "/api/auth/google/authorize",
        clientType: "TAURI",
        result: "passed",
        ...summary,
      },
      null,
      2,
    ),
  );
  console.log("Tauri OAuth live backend contract check passed.");
}

main().catch((error) => {
  console.error("Tauri OAuth live backend contract check failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
