//! BUBLI-43: local file index, change candidates, approval, sync staging.
//!
//! Personal-only boundary (Data Model 13.2, 09C): managed folders and their
//! files belong to the user, never to a project room. Nothing here writes a
//! room_id or shares a file into a room. Reflecting approved changes to the
//! server personal library is done by the frontend client (POST
//! /api/local-file-events/sync); this module stages the candidates locally.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

use crate::local_db::{ms_to_iso, now_ms, Db};

const MAX_EXTRACT_BYTES: u64 = 1024 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectManagedFolderInput {
    path: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderSelection {
    local_folder_id: String,
    name: String,
    path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderCommandInput {
    local_folder_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderScanResult {
    changed_count: i64,
    local_folder_id: String,
    scanned_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderWatchResult {
    local_folder_id: String,
    watching: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileSearchInput {
    query: String,
    limit: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileSearchItem {
    local_file_id: String,
    matched_text: Option<String>,
    name: String,
    path: String,
    updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileSearchResult {
    items: Vec<LocalFileSearchItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncOutboxFlushResult {
    failed_count: i64,
    flushed_at: String,
    sent_count: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileEventsSyncStageInput {
    limit: Option<i64>,
    local_folder_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileSyncEventCandidate {
    event_type: String,
    file_name: String,
    file_size_bytes: Option<i64>,
    local_event_id: String,
    local_file_id: Option<String>,
    mime_type: Option<String>,
    resource_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileEventsSyncStageResult {
    events: Vec<LocalFileSyncEventCandidate>,
    staged_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileEventSyncResultInput {
    local_event_id: String,
    resource_id: Option<String>,
    status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileEventsMarkSyncedInput {
    results: Vec<LocalFileEventSyncResultInput>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileEventsMarkSyncedResult {
    completed_at: String,
    failed_count: i64,
    synced_count: i64,
}

/// Keeps native file watchers alive for the lifetime of the app process.
pub struct ManagedFolderWatchers(pub Mutex<HashMap<String, RecommendedWatcher>>);

impl Default for ManagedFolderWatchers {
    fn default() -> Self {
        Self(Mutex::new(HashMap::new()))
    }
}

/// Register a personal managed folder. When the frontend does not pass an
/// explicit path, use the native desktop folder picker.
#[tauri::command]
pub fn select_managed_folder(
    app: AppHandle,
    state: State<'_, Db>,
    input: Option<SelectManagedFolderInput>,
) -> Result<ManagedFolderSelection, String> {
    let path_buf = resolve_managed_folder_path(&app, input)?;
    if !path_buf.is_dir() {
        return Err(format!("not a directory: {}", path_buf.display()));
    }
    let path = path_buf.to_string_lossy().to_string();
    let name = path_buf
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = now_ms();
    conn.execute(
        "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
         VALUES (?1, ?2, ?3, 'ACTIVE', 0, ?4, ?4) \
         ON CONFLICT(path) DO UPDATE SET status = 'ACTIVE', updated_at = excluded.updated_at",
        params![id, name, path, now],
    )
    .map_err(|error| error.to_string())?;

    // Resolve the canonical id (existing one wins on conflict).
    let local_folder_id: String = conn
        .query_row(
            "SELECT id FROM managed_folders WHERE path = ?1",
            params![path],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;

    Ok(ManagedFolderSelection {
        local_folder_id,
        name,
        path,
    })
}

fn resolve_managed_folder_path(
    app: &AppHandle,
    input: Option<SelectManagedFolderInput>,
) -> Result<PathBuf, String> {
    if let Some(path) = input
        .and_then(|value| value.path)
        .map(|path| path.trim().to_string())
        .filter(|path| !path.is_empty())
    {
        return Ok(PathBuf::from(path));
    }

    app.dialog()
        .file()
        .set_title("관리 폴더 선택")
        .blocking_pick_folder()
        .ok_or_else(|| "folder selection cancelled".to_string())?
        .into_path()
        .map_err(|error| format!("folder path resolve failed: {error}"))
}

/// Re-scan a managed folder, upsert the file index, and record change events.
#[tauri::command]
pub fn scan_managed_folder(
    state: State<'_, Db>,
    input: ManagedFolderCommandInput,
) -> Result<ManagedFolderScanResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;

    let folder_path: String = conn
        .query_row(
            "SELECT path FROM managed_folders WHERE id = ?1",
            params![input.local_folder_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("managed folder not found: {}", input.local_folder_id))?;

    let mut files: Vec<PathBuf> = Vec::new();
    collect_files(Path::new(&folder_path), &mut files)
        .map_err(|error| format!("scan failed: {error}"))?;
    let current_paths: HashSet<String> = files
        .iter()
        .map(|file| file.to_string_lossy().to_string())
        .collect();

    let now = now_ms();
    let mut changed_count = 0i64;

    for file in files {
        let local_path = file.to_string_lossy().to_string();
        let file_name = file
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_default();
        let metadata = match std::fs::metadata(&file) {
            Ok(value) => value,
            Err(_) => continue,
        };
        let size_bytes = metadata.len() as i64;
        let modified_ms = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64);

        let existing: Option<(String, Option<i64>, Option<i64>)> = conn
            .query_row(
                "SELECT id, size_bytes, modified_at FROM local_files \
                 WHERE local_folder_id = ?1 AND local_path = ?2",
                params![input.local_folder_id, local_path],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<i64>>(1)?,
                        row.get::<_, Option<i64>>(2)?,
                    ))
                },
            )
            .optional()
            .map_err(|error| error.to_string())?;

        match existing {
            None => {
                let file_id = Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO local_files \
                     (id, local_folder_id, file_name, local_path, resource_id, size_bytes, checksum, sync_status, modified_at, updated_at) \
                     VALUES (?1, ?2, ?3, ?4, NULL, ?5, NULL, 'LOCAL_ONLY', ?6, ?7)",
                    params![file_id, input.local_folder_id, file_name, local_path, size_bytes, modified_ms, now],
                )
                .map_err(|error| error.to_string())?;
                upsert_file_fts_index(&conn, &file_id, &file_name, &local_path, &file)?;
                record_event(
                    &conn,
                    &input.local_folder_id,
                    Some(file_id.as_str()),
                    "CREATED",
                    &file_name,
                    &local_path,
                    size_bytes,
                    modified_ms,
                    now,
                )?;
                changed_count += 1;
            }
            Some((file_id, prev_size, prev_modified)) => {
                let changed = prev_size != Some(size_bytes) || prev_modified != modified_ms;
                if changed {
                    conn.execute(
                        "UPDATE local_files SET size_bytes = ?2, modified_at = ?3, sync_status = 'LOCAL_ONLY', updated_at = ?4 \
                         WHERE id = ?1",
                        params![file_id, size_bytes, modified_ms, now],
                    )
                    .map_err(|error| error.to_string())?;
                    upsert_file_fts_index(&conn, &file_id, &file_name, &local_path, &file)?;
                    record_event(
                        &conn,
                        &input.local_folder_id,
                        Some(file_id.as_str()),
                        "UPDATED",
                        &file_name,
                        &local_path,
                        size_bytes,
                        modified_ms,
                        now,
                    )?;
                    changed_count += 1;
                }
            }
        }
    }

    let mut known_files = Vec::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT id, file_name, local_path, COALESCE(size_bytes, 0), modified_at \
                 FROM local_files WHERE local_folder_id = ?1",
            )
            .map_err(|error| error.to_string())?;
        let rows = stmt
            .query_map(params![input.local_folder_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, Option<i64>>(4)?,
                ))
            })
            .map_err(|error| error.to_string())?;
        for row in rows {
            known_files.push(row.map_err(|error| error.to_string())?);
        }
    }

    for (file_id, file_name, local_path, size_bytes, modified_ms) in known_files {
        if current_paths.contains(&local_path) {
            continue;
        }

        let existing_delete: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM local_file_events \
                 WHERE local_file_id = ?1 AND event_type = 'DELETED' AND status IN ('PENDING', 'APPROVED', 'FAILED')",
                params![file_id],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if existing_delete > 0 {
            continue;
        }

        record_event(
            &conn,
            &input.local_folder_id,
            Some(file_id.as_str()),
            "DELETED",
            &file_name,
            &local_path,
            size_bytes,
            modified_ms,
            now,
        )?;
        delete_file_fts_index(&conn, &file_id)?;
        conn.execute(
            "UPDATE local_files SET sync_status = 'LOCAL_ONLY', updated_at = ?2 WHERE id = ?1",
            params![file_id, now],
        )
        .map_err(|error| error.to_string())?;
        changed_count += 1;
    }

    Ok(ManagedFolderScanResult {
        changed_count,
        local_folder_id: input.local_folder_id,
        scanned_at: ms_to_iso(now),
    })
}

/// Start native recursive watching for a managed folder. Changes are reflected
/// into the same local SQLite index/events used by manual scans.
#[tauri::command]
pub fn watch_managed_folder(
    app: AppHandle,
    state: State<'_, Db>,
    watchers: State<'_, ManagedFolderWatchers>,
    input: ManagedFolderCommandInput,
) -> Result<ManagedFolderWatchResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let folder_path: String = conn
        .query_row(
            "SELECT path FROM managed_folders WHERE id = ?1 AND status = 'ACTIVE'",
            params![input.local_folder_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("managed folder not found: {}", input.local_folder_id))?;
    drop(conn);

    let folder = PathBuf::from(&folder_path);
    if !folder.is_dir() {
        return Err(format!("not a directory: {folder_path}"));
    }

    let db_path = crate::local_db::database_path(&app)?;
    let local_folder_id = input.local_folder_id;
    let mut guard = watchers
        .0
        .lock()
        .map_err(|_| "folder watcher state lock failed".to_string())?;

    if guard.contains_key(&local_folder_id) {
        return Ok(ManagedFolderWatchResult {
            local_folder_id,
            watching: true,
        });
    }

    let callback_folder_id = local_folder_id.clone();
    let callback_db_path = db_path.clone();
    let mut watcher = notify::recommended_watcher(move |result: notify::Result<Event>| {
        let event = match result {
            Ok(value) => value,
            Err(error) => {
                eprintln!("managed folder watch error: {error}");
                return;
            }
        };
        if !should_process_watch_event(&event) {
            return;
        }

        let conn = match Connection::open(&callback_db_path) {
            Ok(value) => value,
            Err(error) => {
                eprintln!("managed folder watch db open failed: {error}");
                return;
            }
        };
        crate::local_db::configure_connection(&conn);
        let now = now_ms();

        for path in event.paths {
            if let Err(error) = record_watch_path_change(&conn, &callback_folder_id, &path, now) {
                eprintln!("managed folder watch event failed: {error}");
            }
        }
    })
    .map_err(|error| format!("folder watch setup failed: {error}"))?;

    watcher
        .watch(&folder, RecursiveMode::Recursive)
        .map_err(|error| format!("folder watch failed: {error}"))?;

    guard.insert(local_folder_id.clone(), watcher);

    Ok(ManagedFolderWatchResult {
        local_folder_id,
        watching: true,
    })
}

fn should_process_watch_event(event: &Event) -> bool {
    matches!(
        event.kind,
        EventKind::Any
            | EventKind::Create(_)
            | EventKind::Modify(_)
            | EventKind::Remove(_)
            | EventKind::Other
    )
}

fn record_watch_path_change(
    conn: &Connection,
    local_folder_id: &str,
    path: &Path,
    now: i64,
) -> Result<i64, String> {
    if is_ignored_path(path) {
        return Ok(0);
    }

    let local_path = path.to_string_lossy().to_string();
    let file_name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();
    if file_name.is_empty() {
        return Ok(0);
    }

    match std::fs::metadata(path) {
        Ok(metadata) if metadata.is_file() => {
            let size_bytes = metadata.len() as i64;
            let modified_ms = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as i64);

            let existing: Option<(String, Option<i64>, Option<i64>)> = conn
                .query_row(
                    "SELECT id, size_bytes, modified_at FROM local_files \
                     WHERE local_folder_id = ?1 AND local_path = ?2",
                    params![local_folder_id, local_path],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, Option<i64>>(1)?,
                            row.get::<_, Option<i64>>(2)?,
                        ))
                    },
                )
                .optional()
                .map_err(|error| error.to_string())?;

            match existing {
                None => {
                    let file_id = Uuid::new_v4().to_string();
                    conn.execute(
                        "INSERT INTO local_files \
                         (id, local_folder_id, file_name, local_path, resource_id, size_bytes, checksum, sync_status, modified_at, updated_at) \
                         VALUES (?1, ?2, ?3, ?4, NULL, ?5, NULL, 'LOCAL_ONLY', ?6, ?7)",
                        params![file_id, local_folder_id, file_name, local_path, size_bytes, modified_ms, now],
                    )
                    .map_err(|error| error.to_string())?;
                    upsert_file_fts_index(
                        conn,
                        &file_id,
                        &file_name,
                        &local_path,
                        Path::new(&local_path),
                    )?;
                    record_event(
                        conn,
                        local_folder_id,
                        Some(file_id.as_str()),
                        "CREATED",
                        &file_name,
                        &local_path,
                        size_bytes,
                        modified_ms,
                        now,
                    )?;
                    Ok(1)
                }
                Some((file_id, prev_size, prev_modified)) => {
                    if prev_size == Some(size_bytes) && prev_modified == modified_ms {
                        return Ok(0);
                    }
                    conn.execute(
                        "UPDATE local_files SET size_bytes = ?2, modified_at = ?3, sync_status = 'LOCAL_ONLY', updated_at = ?4 \
                         WHERE id = ?1",
                        params![file_id, size_bytes, modified_ms, now],
                    )
                    .map_err(|error| error.to_string())?;
                    upsert_file_fts_index(
                        conn,
                        &file_id,
                        &file_name,
                        &local_path,
                        Path::new(&local_path),
                    )?;
                    record_event(
                        conn,
                        local_folder_id,
                        Some(file_id.as_str()),
                        "UPDATED",
                        &file_name,
                        &local_path,
                        size_bytes,
                        modified_ms,
                        now,
                    )?;
                    Ok(1)
                }
            }
        }
        Ok(_) => Ok(0),
        Err(_) => record_watch_path_delete(conn, local_folder_id, &file_name, &local_path, now),
    }
}

fn record_watch_path_delete(
    conn: &Connection,
    local_folder_id: &str,
    file_name: &str,
    local_path: &str,
    now: i64,
) -> Result<i64, String> {
    let existing: Option<(String, i64, Option<i64>)> = conn
        .query_row(
            "SELECT id, COALESCE(size_bytes, 0), modified_at FROM local_files \
             WHERE local_folder_id = ?1 AND local_path = ?2",
            params![local_folder_id, local_path],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let Some((file_id, size_bytes, modified_ms)) = existing else {
        return Ok(0);
    };

    let pending_delete_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM local_file_events \
             WHERE local_file_id = ?1 AND event_type = 'DELETED' AND status IN ('PENDING', 'APPROVED', 'FAILED')",
            params![file_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if pending_delete_count > 0 {
        return Ok(0);
    }

    record_event(
        conn,
        local_folder_id,
        Some(file_id.as_str()),
        "DELETED",
        file_name,
        local_path,
        size_bytes,
        modified_ms,
        now,
    )?;
    delete_file_fts_index(conn, &file_id)?;
    conn.execute(
        "UPDATE local_files SET sync_status = 'LOCAL_ONLY', updated_at = ?2 WHERE id = ?1",
        params![file_id, now],
    )
    .map_err(|error| error.to_string())?;

    Ok(1)
}

fn is_ignored_path(path: &Path) -> bool {
    path.components().any(|component| {
        let name = component.as_os_str().to_string_lossy();
        name.starts_with('.') || name == "node_modules"
    })
}

fn upsert_file_fts_index(
    conn: &Connection,
    local_file_id: &str,
    file_name: &str,
    local_path: &str,
    path: &Path,
) -> Result<(), String> {
    let content = extract_text_preview(path).unwrap_or_default();
    conn.execute(
        "DELETE FROM local_file_fts WHERE local_file_id = ?1",
        params![local_file_id],
    )
    .map_err(|error| error.to_string())?;
    conn.execute(
        "INSERT INTO local_file_fts (local_file_id, file_name, content, local_path) \
         VALUES (?1, ?2, ?3, ?4)",
        params![local_file_id, file_name, content, local_path],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn delete_file_fts_index(conn: &Connection, local_file_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM local_file_fts WHERE local_file_id = ?1",
        params![local_file_id],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn extract_text_preview(path: &Path) -> Option<String> {
    if !is_supported_text_file(path) {
        return None;
    }

    let metadata = std::fs::metadata(path).ok()?;
    if metadata.len() > MAX_EXTRACT_BYTES {
        return None;
    }

    let bytes = std::fs::read(path).ok()?;
    let text = String::from_utf8_lossy(&bytes)
        .replace('\0', " ")
        .trim()
        .to_string();
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

fn is_supported_text_file(path: &Path) -> bool {
    let Some(extension) = path
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
    else {
        return false;
    };

    matches!(
        extension.as_str(),
        "csv"
            | "htm"
            | "html"
            | "json"
            | "log"
            | "md"
            | "markdown"
            | "rtf"
            | "tsv"
            | "txt"
            | "xml"
            | "yaml"
            | "yml"
    )
}

fn search_local_files_fts(
    conn: &Connection,
    query: &str,
    limit: i64,
) -> Result<Vec<LocalFileSearchItem>, String> {
    let fts_query = escape_fts_query(query);
    let mut stmt = conn
        .prepare(
            "SELECT f.id, f.file_name, f.local_path, f.updated_at, \
                    snippet(local_file_fts, 2, '[', ']', '...', 12) AS matched_text \
             FROM local_file_fts \
             JOIN local_files f ON f.id = local_file_fts.local_file_id \
             WHERE local_file_fts MATCH ?1 \
             ORDER BY rank, f.updated_at DESC \
             LIMIT ?2",
        )
        .map_err(|error| error.to_string())?;

    let rows = stmt
        .query_map(params![fts_query, limit], |row| {
            let matched_text: Option<String> = row.get(4)?;
            Ok(LocalFileSearchItem {
                local_file_id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                updated_at: ms_to_iso(row.get::<_, i64>(3)?),
                matched_text: matched_text.filter(|value| !value.trim().is_empty()),
            })
        })
        .map_err(|error| error.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|error| error.to_string())?);
    }
    Ok(items)
}

fn escape_fts_query(query: &str) -> String {
    format!("\"{}\"", query.replace('"', "\"\""))
}

/// Search the local file index by name or path (LIKE; FTS5 is an enhancement).
#[tauri::command]
pub fn search_local_files(
    state: State<'_, Db>,
    input: LocalFileSearchInput,
) -> Result<LocalFileSearchResult, String> {
    let limit = input.limit.unwrap_or(50).clamp(1, 500);
    let query = input.query.trim().to_string();
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;

    if !query.is_empty() {
        match search_local_files_fts(&conn, &query, limit) {
            Ok(items) => return Ok(LocalFileSearchResult { items }),
            Err(error) => {
                eprintln!("local file FTS search failed; falling back to LIKE: {error}");
            }
        }
    }

    let needle = format!("%{}%", query);
    let mut stmt = conn
        .prepare(
            "SELECT id, file_name, local_path, updated_at FROM local_files \
             WHERE file_name LIKE ?1 OR local_path LIKE ?1 \
             ORDER BY updated_at DESC LIMIT ?2",
        )
        .map_err(|error| error.to_string())?;

    let rows = stmt
        .query_map(params![needle, limit], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })
        .map_err(|error| error.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        let (id, name, path, updated_ms) = row.map_err(|error| error.to_string())?;
        items.push(LocalFileSearchItem {
            local_file_id: id,
            matched_text: None,
            name,
            path,
            updated_at: ms_to_iso(updated_ms),
        });
    }

    Ok(LocalFileSearchResult { items })
}

/// Report the sync outbox backlog. Actual transmission is done by the frontend
/// API client (auth tokens live there); this returns current counts so the UI
/// can show whether anything is waiting.
#[tauri::command]
pub fn flush_sync_outbox(state: State<'_, Db>) -> Result<SyncOutboxFlushResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let failed_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM local_sync_outbox WHERE status = 'FAILED'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(SyncOutboxFlushResult {
        failed_count,
        flushed_at: crate::local_db::now_iso(),
        sent_count: 0,
    })
}

/// Stage local file events for the authenticated frontend to reflect via
/// POST /api/local-file-events/sync. Raw file contents stay local.
#[tauri::command]
pub fn stage_local_file_events_for_sync(
    state: State<'_, Db>,
    input: Option<LocalFileEventsSyncStageInput>,
) -> Result<LocalFileEventsSyncStageResult, String> {
    let limit = input
        .as_ref()
        .and_then(|value| value.limit)
        .unwrap_or(100)
        .clamp(1, 500);
    let folder_filter = input.and_then(|value| value.local_folder_id);
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;

    let mut candidates = Vec::new();
    {
        let (sql, has_filter) = match &folder_filter {
            Some(_) => (
                "SELECT e.id, e.local_file_id, e.event_type, e.file_name, e.size_bytes, f.resource_id \
                 FROM local_file_events e \
                 LEFT JOIN local_files f ON f.id = e.local_file_id \
                 WHERE e.status IN ('PENDING', 'APPROVED', 'FAILED') \
                   AND e.event_type IN ('CREATED', 'DELETED') \
                   AND e.local_folder_id = ?1 \
                 ORDER BY e.created_at ASC LIMIT ?2",
                true,
            ),
            None => (
                "SELECT e.id, e.local_file_id, e.event_type, e.file_name, e.size_bytes, f.resource_id \
                 FROM local_file_events e \
                 LEFT JOIN local_files f ON f.id = e.local_file_id \
                 WHERE e.status IN ('PENDING', 'APPROVED', 'FAILED') \
                   AND e.event_type IN ('CREATED', 'DELETED') \
                 ORDER BY e.created_at ASC LIMIT ?1",
                false,
            ),
        };

        let mut stmt = conn.prepare(sql).map_err(|error| error.to_string())?;
        let map_row = |row: &rusqlite::Row<'_>| {
            let file_name = row.get::<_, String>(3)?;
            Ok(LocalFileSyncEventCandidate {
                local_event_id: row.get(0)?,
                local_file_id: row.get(1)?,
                event_type: row.get(2)?,
                mime_type: guess_mime_type(&file_name),
                file_name,
                file_size_bytes: row.get(4)?,
                resource_id: row.get(5)?,
            })
        };
        let rows = if has_filter {
            stmt.query_map(params![folder_filter.as_ref().unwrap(), limit], map_row)
        } else {
            stmt.query_map(params![limit], map_row)
        }
        .map_err(|error| error.to_string())?;

        for row in rows {
            candidates.push(row.map_err(|error| error.to_string())?);
        }
    }

    let now = now_ms();
    for event in &candidates {
        conn.execute(
            "UPDATE local_file_events SET status = 'APPROVED' WHERE id = ?1",
            params![event.local_event_id],
        )
        .map_err(|error| error.to_string())?;
        if let Some(local_file_id) = &event.local_file_id {
            conn.execute(
                "UPDATE local_files SET sync_status = 'SYNC_PENDING', updated_at = ?2 WHERE id = ?1",
                params![local_file_id, now],
            )
            .map_err(|error| error.to_string())?;
        }
    }

    Ok(LocalFileEventsSyncStageResult {
        events: candidates,
        staged_at: ms_to_iso(now),
    })
}

/// Apply backend local-file sync results back into the local SQLite index.
#[tauri::command]
pub fn mark_local_file_events_synced(
    state: State<'_, Db>,
    input: LocalFileEventsMarkSyncedInput,
) -> Result<LocalFileEventsMarkSyncedResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let now = now_ms();
    let mut synced_count = 0i64;
    let mut failed_count = 0i64;

    for result in input.results {
        let row: Option<(Option<String>, String)> = conn
            .query_row(
                "SELECT local_file_id, event_type FROM local_file_events WHERE id = ?1",
                params![result.local_event_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        let Some((local_file_id, event_type)) = row else {
            continue;
        };

        let failed = result.status.eq_ignore_ascii_case("FAILED");
        let event_status = if failed { "FAILED" } else { "SYNCED" };
        conn.execute(
            "UPDATE local_file_events SET status = ?2 WHERE id = ?1",
            params![result.local_event_id, event_status],
        )
        .map_err(|error| error.to_string())?;

        if failed {
            failed_count += 1;
            if let Some(local_file_id) = local_file_id {
                conn.execute(
                    "UPDATE local_files SET sync_status = 'FAILED', updated_at = ?2 WHERE id = ?1",
                    params![local_file_id, now],
                )
                .map_err(|error| error.to_string())?;
            }
            continue;
        }

        synced_count += 1;
        if let Some(local_file_id) = local_file_id {
            if event_type == "DELETED" {
                delete_file_fts_index(&conn, &local_file_id)?;
                conn.execute(
                    "DELETE FROM local_files WHERE id = ?1",
                    params![local_file_id],
                )
                .map_err(|error| error.to_string())?;
            } else {
                conn.execute(
                    "UPDATE local_files SET resource_id = COALESCE(?2, resource_id), sync_status = 'SYNCED', updated_at = ?3 \
                     WHERE id = ?1",
                    params![local_file_id, result.resource_id, now],
                )
                .map_err(|error| error.to_string())?;
            }
        }
    }

    Ok(LocalFileEventsMarkSyncedResult {
        completed_at: ms_to_iso(now),
        failed_count,
        synced_count,
    })
}

#[allow(clippy::too_many_arguments)]
fn record_event(
    conn: &rusqlite::Connection,
    local_folder_id: &str,
    local_file_id: Option<&str>,
    event_type: &str,
    file_name: &str,
    local_path: &str,
    size_bytes: i64,
    modified_ms: Option<i64>,
    now: i64,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO local_file_events \
         (id, local_file_id, local_folder_id, event_type, file_name, local_path, hash, size_bytes, status, reason, modified_at, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, 'PENDING', NULL, ?8, ?9)",
        params![
            Uuid::new_v4().to_string(),
            local_file_id,
            local_folder_id,
            event_type,
            file_name,
            local_path,
            size_bytes,
            modified_ms,
            now,
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn collect_files(dir: &Path, out: &mut Vec<PathBuf>) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let name = entry.file_name();
        let name = name.to_string_lossy();
        // Skip hidden files and common noise directories.
        if name.starts_with('.') || name == "node_modules" {
            continue;
        }
        let file_type = entry.file_type()?;
        let path = entry.path();
        if file_type.is_dir() {
            collect_files(&path, out)?;
        } else if file_type.is_file() {
            out.push(path);
        }
    }
    Ok(())
}

fn guess_mime_type(file_name: &str) -> Option<String> {
    let extension = Path::new(file_name)
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())?;
    let mime = match extension.as_str() {
        "csv" => "text/csv",
        "doc" => "application/msword",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "gif" => "image/gif",
        "htm" | "html" => "text/html",
        "jpg" | "jpeg" => "image/jpeg",
        "json" => "application/json",
        "md" => "text/markdown",
        "pdf" => "application/pdf",
        "png" => "image/png",
        "ppt" => "application/vnd.ms-powerpoint",
        "pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "txt" => "text/plain",
        "xls" => "application/vnd.ms-excel",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        _ => return None,
    };
    Some(mime.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_connection() -> Connection {
        let conn = Connection::open_in_memory().expect("open in-memory sqlite");
        conn.execute_batch(
            "
            CREATE TABLE local_files (
                id TEXT PRIMARY KEY,
                local_folder_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                local_path TEXT NOT NULL,
                resource_id TEXT,
                size_bytes INTEGER,
                checksum TEXT,
                sync_status TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
                modified_at INTEGER,
                updated_at INTEGER NOT NULL
            );
            CREATE VIRTUAL TABLE local_file_fts USING fts5 (
                local_file_id UNINDEXED,
                file_name,
                content,
                local_path UNINDEXED,
                tokenize = 'trigram'
            );
            ",
        )
        .expect("create local file schema");
        conn
    }

    #[test]
    fn indexes_supported_text_file_and_returns_snippet() {
        let conn = test_connection();
        let path =
            std::env::temp_dir().join(format!("bubli-local-fts-test-{}.txt", Uuid::new_v4()));
        std::fs::write(
            &path,
            "Local contract renewal note. This should stay on device.",
        )
        .expect("write temp text file");

        let local_file_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO local_files (id, local_folder_id, file_name, local_path, updated_at) \
             VALUES (?1, 'folder-1', 'contract.txt', ?2, 1)",
            params![local_file_id, path.to_string_lossy()],
        )
        .expect("insert local file row");

        upsert_file_fts_index(
            &conn,
            &local_file_id,
            "contract.txt",
            &path.to_string_lossy(),
            &path,
        )
        .expect("index local file text");

        let items = search_local_files_fts(&conn, "renewal", 10).expect("search fts");
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].local_file_id, local_file_id);
        assert!(items[0]
            .matched_text
            .as_deref()
            .unwrap_or("")
            .contains("[renewal]"));

        let _ = std::fs::remove_file(path);
    }
}
