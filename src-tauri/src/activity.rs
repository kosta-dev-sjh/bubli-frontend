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
