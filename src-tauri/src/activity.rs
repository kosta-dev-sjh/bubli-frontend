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

use rusqlite::{params, OptionalExtension};
use serde::Serialize;
use tauri::State;

use crate::local_db::{now_iso, now_ms, Db};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityContextResult {
    app_name: String,
    window_title: Option<String>,
    duration_seconds: Option<i64>,
    captured_at: String,
}

/// Read the current foreground activity context and compute dwell time.
#[tauri::command]
pub fn read_activity_context(state: State<'_, Db>) -> Result<ActivityContextResult, String> {
    let (app_name, window_title) = capture_foreground()?;
    let now = now_ms();

    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;

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

    let same_focus = matches!(
        &previous,
        Some((prev_app, prev_window, _))
            if prev_app == &app_name && prev_window == &window_title
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
        params![app_name, window_title, focus_started_ms, now],
    )
    .map_err(|error| error.to_string())?;

    let duration_seconds = Some(((now - focus_started_ms).max(0)) / 1000);

    Ok(ActivityContextResult {
        app_name,
        window_title,
        duration_seconds,
        captured_at: now_iso(),
    })
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
        return Err(format!(
            "activity capture not permitted or failed: {stderr}"
        ));
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

/// Other platforms: native capture is the remaining step (Windows: GetForegroundWindow,
/// Linux: depends on the window manager). Returns a clear error instead of fake data.
#[cfg(not(target_os = "macos"))]
fn capture_foreground() -> Result<(String, Option<String>), String> {
    Err("activity context capture is implemented on macOS only for now".to_string())
}
