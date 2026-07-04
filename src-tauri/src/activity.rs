//! BUBLI-44: activity context (record / query / delete).
//!
//! Scope boundary (Tauri 명세 활동 감지 경계):
//! - Only the foreground app name, window title, and dwell time are read.
//! - Never the full screen contents, keystrokes, or browser body.
//! - Capture must be user-consented; the frontend gates this behind
//!   user_privacy_consents (ACTIVITY_CONTEXT) before calling.
//!
//! This command reads the *current* context (read_activity_context). Persisting
//! to the server (POST /api/activity/current-app, GET /api/activity/today,
//! DELETE /api/activity/{id}) is the frontend's job through the API client; the
//! local focus row here only exists to compute dwell time between reads.

use std::sync::atomic::{AtomicBool, Ordering};

use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use serde::Serialize;
use tauri::State;

use crate::local_db::{now_iso, now_ms, Db};

static ACTIVITY_CONTEXT_CONSENT_GRANTED: AtomicBool = AtomicBool::new(false);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityContextConsentInput {
    enabled: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityContextConsentResult {
    enabled: bool,
    updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityContextResult {
    app_name: String,
    window_title: Option<String>,
    duration_seconds: Option<i64>,
    captured_at: String,
}

/// Mirror the server-backed ACTIVITY_CONTEXT consent into the native process.
/// Native capture is denied by default, so a frontend bug or stale call cannot
/// read the foreground app/window before the latest consent check succeeds.
#[tauri::command]
pub fn set_activity_context_consent(
    input: ActivityContextConsentInput,
) -> ActivityContextConsentResult {
    set_activity_context_consent_enabled(input.enabled);

    ActivityContextConsentResult {
        enabled: activity_context_consent_enabled(),
        updated_at: now_iso(),
    }
}

/// Read the current foreground activity context and compute dwell time.
#[tauri::command]
pub fn read_activity_context(state: State<'_, Db>) -> Result<ActivityContextResult, String> {
    ensure_activity_context_consent()?;

    let (app_name, window_title) = capture_foreground()?;
    let now = now_ms();

    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;

    let duration_seconds = Some(record_activity_focus_for_conn(
        &conn,
        &app_name,
        window_title.as_deref(),
        now,
    )?);

    Ok(ActivityContextResult {
        app_name,
        window_title,
        duration_seconds,
        captured_at: now_iso(),
    })
}

fn record_activity_focus_for_conn(
    conn: &Connection,
    app_name: &str,
    window_title: Option<&str>,
    now: i64,
) -> Result<i64, String> {
    // Previous focus row (single row, id = 1).
    let previous: Option<(String, Option<String>, i64)> = conn
        .query_row(
            "SELECT app_name, window_title, focus_started_ms FROM local_activity_focus WHERE id = 1",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;

    let normalized_window_title = window_title
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    let same_focus = matches!(
        &previous,
        Some((prev_app, prev_window, _))
            if prev_app == app_name && prev_window == &normalized_window_title
    );

    let focus_started_ms = match (&previous, same_focus) {
        (Some((_, _, started)), true) => *started,
        _ => now,
    };

    conn.execute(
        "INSERT INTO local_activity_focus (id, app_name, window_title, focus_started_ms, last_seen_ms) \
         VALUES (1, ?1, ?2, ?3, ?4) \
         ON CONFLICT(id) DO UPDATE SET \
           app_name = excluded.app_name, \
           window_title = excluded.window_title, \
           focus_started_ms = excluded.focus_started_ms, \
           last_seen_ms = excluded.last_seen_ms",
        params![app_name, normalized_window_title, focus_started_ms, now],
    )
    .map_err(|error| error.to_string())?;

    Ok(((now - focus_started_ms).max(0)) / 1000)
}

fn set_activity_context_consent_enabled(enabled: bool) {
    ACTIVITY_CONTEXT_CONSENT_GRANTED.store(enabled, Ordering::SeqCst);
}

fn activity_context_consent_enabled() -> bool {
    ACTIVITY_CONTEXT_CONSENT_GRANTED.load(Ordering::SeqCst)
}

fn ensure_activity_context_consent() -> Result<(), String> {
    if activity_context_consent_enabled() {
        return Ok(());
    }

    Err("activity capture requires ACTIVITY_CONTEXT consent".to_string())
}

/// macOS: read the frontmost app name and front window title via AppleScript.
/// Window title needs Accessibility permission; app name works without it.
#[cfg(target_os = "macos")]
fn capture_foreground() -> Result<(String, Option<String>), String> {
    use std::process::Command;

    const SCRIPT: &str = r#"
tell application "System Events"
    set frontApp to first application process whose frontmost is true
    set appName to name of frontApp
    set winTitle to ""
    try
        set winTitle to name of front window of frontApp
    end try
end tell
return appName & "\n" & winTitle
"#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(SCRIPT)
        .output()
        .map_err(|error| format!("osascript failed: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // macOS TCC: sending Apple events to System Events needs the Automation
        // permission. Error -1743 means the user has not allowed it yet. We name
        // the exact permission so the settings screen can guide the user instead
        // of showing a raw AppleScript error. (Window title also needs the
        // Accessibility permission, but that path is handled below by the empty
        // title, not by this hard failure.)
        if stderr.contains("-1743") || stderr.contains("Not authorized") {
            return Err(
                "activity capture needs the macOS Automation permission for System Events. \
                 Open System Settings > Privacy & Security > Automation and allow Bubli to \
                 control System Events, then try again."
                    .to_string(),
            );
        }
        return Err(format!("activity capture failed: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut lines = stdout.trim_end().splitn(2, '\n');
    let app_name = lines.next().unwrap_or("").trim().to_string();
    let window_title = lines
        .next()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    if app_name.is_empty() {
        return Err("foreground app name was empty".to_string());
    }

    Ok((app_name, window_title))
}

/// Windows: read the foreground window and owning process through Win32 APIs.
#[cfg(target_os = "windows")]
fn capture_foreground() -> Result<(String, Option<String>), String> {
    use std::path::Path;
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd == 0 {
            return Err("foreground window was not available".to_string());
        }

        let title_length = GetWindowTextLengthW(hwnd);
        let window_title = if title_length > 0 {
            let mut buffer = vec![0_u16; title_length as usize + 1];
            let read = GetWindowTextW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32);
            if read > 0 {
                Some(
                    String::from_utf16_lossy(&buffer[..read as usize])
                        .trim()
                        .to_string(),
                )
                .filter(|value| !value.is_empty())
            } else {
                None
            }
        } else {
            None
        };

        let mut process_id = 0_u32;
        GetWindowThreadProcessId(hwnd, &mut process_id);
        if process_id == 0 {
            return Err("foreground process id was not available".to_string());
        }

        let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id);
        if process == 0 {
            return Ok((format!("process-{process_id}"), window_title));
        }

        let mut path_buffer = vec![0_u16; 32768];
        let mut path_size = path_buffer.len() as u32;
        let query_ok =
            QueryFullProcessImageNameW(process, 0, path_buffer.as_mut_ptr(), &mut path_size);
        CloseHandle(process);

        if query_ok == 0 || path_size == 0 {
            return Ok((format!("process-{process_id}"), window_title));
        }

        let process_path = String::from_utf16_lossy(&path_buffer[..path_size as usize]);
        let app_name = Path::new(&process_path)
            .file_stem()
            .or_else(|| Path::new(&process_path).file_name())
            .and_then(|value| value.to_str())
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| format!("process-{process_id}"));

        Ok((app_name, window_title))
    }
}

/// Other platforms: native capture depends on the desktop/window manager.
/// Returns a clear error instead of fake data.
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn capture_foreground() -> Result<(String, Option<String>), String> {
    Err("activity context capture is not implemented on this platform yet".to_string())
}

#[cfg(test)]
mod consent_tests {
    use rusqlite::Connection;

    use super::{
        ensure_activity_context_consent, record_activity_focus_for_conn,
        set_activity_context_consent_enabled,
    };

    #[test]
    fn activity_context_consent_gate_defaults_closed_and_can_be_toggled() {
        set_activity_context_consent_enabled(false);

        let blocked = ensure_activity_context_consent().expect_err("consent should be required");
        assert!(blocked.contains("ACTIVITY_CONTEXT consent"));

        set_activity_context_consent_enabled(true);
        ensure_activity_context_consent().expect("enabled consent should allow capture gate");

        set_activity_context_consent_enabled(false);
        assert!(ensure_activity_context_consent().is_err());
    }

    #[test]
    fn activity_focus_accumulates_same_window_and_resets_on_change() {
        let conn = Connection::open_in_memory().expect("open in-memory sqlite");
        conn.execute_batch(
            "
            CREATE TABLE local_activity_focus (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                app_name TEXT NOT NULL,
                window_title TEXT,
                focus_started_ms INTEGER NOT NULL,
                last_seen_ms INTEGER NOT NULL
            );
            ",
        )
        .expect("create focus table");

        let first =
            record_activity_focus_for_conn(&conn, "Code", Some("Bubli"), 1_000).expect("first");
        let same =
            record_activity_focus_for_conn(&conn, "Code", Some("Bubli"), 6_500).expect("same");
        let changed =
            record_activity_focus_for_conn(&conn, "Chrome", Some("Docs"), 9_000).expect("changed");
        let (app_name, window_title, focus_started_ms, last_seen_ms): (
            String,
            Option<String>,
            i64,
            i64,
        ) = conn
            .query_row(
                "SELECT app_name, window_title, focus_started_ms, last_seen_ms FROM local_activity_focus WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("read focus row");

        assert_eq!(first, 0);
        assert_eq!(same, 5);
        assert_eq!(changed, 0);
        assert_eq!(app_name, "Chrome");
        assert_eq!(window_title.as_deref(), Some("Docs"));
        assert_eq!(focus_started_ms, 9_000);
        assert_eq!(last_seen_ms, 9_000);
    }
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use super::capture_foreground;

    #[test]
    fn windows_foreground_capture_returns_app_name() {
        let (app_name, _window_title) = match capture_foreground() {
            Ok(context) => context,
            Err(error) if error.contains("foreground window was not available") => {
                eprintln!("skipping foreground capture assertion: {error}");
                return;
            }
            Err(error) => panic!("foreground app should be readable on Windows: {error}"),
        };

        assert!(
            !app_name.trim().is_empty(),
            "foreground app name should not be empty"
        );
    }
}
