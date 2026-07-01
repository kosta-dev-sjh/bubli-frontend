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
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::local_db::{ms_to_iso, now_iso, now_ms, Db};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityContextResult {
    app_name: String,
    window_title: Option<String>,
    duration_seconds: Option<i64>,
    captured_at: String,
    local_event_id: String,
    sync_status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEventSyncStatusInput {
    local_event_id: String,
    server_activity_id: Option<String>,
    status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEventsSyncStageInput {
    limit: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEventSyncCandidate {
    local_event_id: String,
    app_name: String,
    window_title: Option<String>,
    started_at: String,
    ended_at: String,
    duration_seconds: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEventsSyncStageResult {
    events: Vec<ActivityEventSyncCandidate>,
    staged_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEventSyncStatusResult {
    local_event_id: String,
    status: String,
    updated_at: String,
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

    let duration_seconds = ((now - focus_started_ms).max(0)) / 1000;
    let local_event_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO local_activity_events \
         (id, app_name, window_title, started_at, ended_at, duration_seconds, sync_status, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'LOCAL_ONLY', ?7, ?7)",
        params![
            local_event_id,
            app_name,
            window_title,
            ms_to_iso(focus_started_ms),
            ms_to_iso(now),
            duration_seconds,
            now
        ],
    )
    .map_err(|error| error.to_string())?;

    Ok(ActivityContextResult {
        app_name,
        window_title,
        duration_seconds: Some(duration_seconds),
        captured_at: now_iso(),
        local_event_id,
        sync_status: "LOCAL_ONLY".to_string(),
    })
}

#[tauri::command]
pub fn stage_activity_events_for_sync(
    state: State<'_, Db>,
    input: Option<ActivityEventsSyncStageInput>,
) -> Result<ActivityEventsSyncStageResult, String> {
    let limit = input
        .and_then(|value| value.limit)
        .unwrap_or(25)
        .clamp(1, 100);
    let now = now_ms();
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, app_name, window_title, started_at, ended_at, duration_seconds \
             FROM local_activity_events \
             WHERE sync_status IN ('LOCAL_ONLY', 'FAILED') \
             ORDER BY updated_at ASC LIMIT ?1",
        )
        .map_err(|error| error.to_string())?;

    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(ActivityEventSyncCandidate {
                local_event_id: row.get(0)?,
                app_name: row.get(1)?,
                window_title: row.get(2)?,
                started_at: row.get(3)?,
                ended_at: row.get(4)?,
                duration_seconds: row.get(5)?,
            })
        })
        .map_err(|error| error.to_string())?;

    let mut events = Vec::new();
    for row in rows {
        events.push(row.map_err(|error| error.to_string())?);
    }

    for event in &events {
        conn.execute(
            "UPDATE local_activity_events SET sync_status = 'SYNC_PENDING', updated_at = ?2 WHERE id = ?1",
            params![event.local_event_id, now],
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(ActivityEventsSyncStageResult {
        events,
        staged_at: ms_to_iso(now),
    })
}

#[tauri::command]
pub fn mark_activity_event_sync_status(
    state: State<'_, Db>,
    input: ActivityEventSyncStatusInput,
) -> Result<ActivityEventSyncStatusResult, String> {
    let status = match input.status.as_str() {
        "SYNCED" => "SYNCED",
        "FAILED" => "FAILED",
        value => return Err(format!("unsupported activity sync status: {value}")),
    };
    let now = now_ms();
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let updated = conn
        .execute(
            "UPDATE local_activity_events \
             SET sync_status = ?2, server_activity_id = ?3, updated_at = ?4 \
             WHERE id = ?1",
            params![input.local_event_id, status, input.server_activity_id, now],
        )
        .map_err(|error| error.to_string())?;

    if updated == 0 {
        return Err("activity event was not found".to_string());
    }

    Ok(ActivityEventSyncStatusResult {
        local_event_id: input.local_event_id,
        status: status.to_string(),
        updated_at: ms_to_iso(now),
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
