import { calendarApi, googleCalendarRedirectUri } from "@/features/calendar/api/calendarApi";
import { tauriCommands } from "@/lib/tauri/commands";
import { isTauriRuntime } from "@/lib/tauri/is-tauri";
import type { GoogleCalendarConnectionResponse } from "@/types/api/calendar";

const TAURI_CALENDAR_LOOPBACK_REDIRECT_URI = "http://127.0.0.1:3791/auth/callback";

export async function startGoogleCalendarConnect(): Promise<GoogleCalendarConnectionResponse | null> {
  if (isTauriRuntime()) {
    const response = await calendarApi.requestGoogleConnectUrl(TAURI_CALENDAR_LOOPBACK_REDIRECT_URI);
    const result = await tauriCommands.startTauriGoogleOauthLoopback({
      authorizeUrl: response.authorizeUrl,
      redirectUri: TAURI_CALENDAR_LOOPBACK_REDIRECT_URI,
    });

    return calendarApi.callbackGoogle({
      code: result.code,
      redirectUri: TAURI_CALENDAR_LOOPBACK_REDIRECT_URI,
    });
  }

  const response = await calendarApi.requestGoogleConnectUrl(googleCalendarRedirectUri());
  window.location.assign(response.authorizeUrl);
  return null;
}
