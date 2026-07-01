//! BUBLI-43: local file index, change candidates, approval, sync staging.
//!
//! Personal-only boundary (Data Model 13.2, 09C): managed folders and their
//! files belong to the user, never to a project room. Nothing here writes a
//! room_id or shares a file into a room. Reflecting approved changes to the
//! server personal library is done by the frontend client (POST
//! /api/local-file-events/sync); this module stages the candidates locally.

use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

use crate::local_db::{ms_to_iso, now_ms, Db};

const MAX_EXTRACT_BYTES: u64 = 1024 * 1024;
const CHECKSUM_HEAD_BYTES: u64 = 1024 * 1024;

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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderListItem {
    created_at: String,
    local_folder_id: String,
    name: String,
    path: String,
    status: String,
    sync_enabled: bool,
    updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderListResult {
    folders: Vec<ManagedFolderListItem>,
    loaded_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderCommandInput {
    local_folder_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderSyncInput {
    enabled: bool,
    local_folder_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderSyncResult {
    local_folder_id: String,
    pending_event_count: i64,
    sync_enabled: bool,
    updated_at: String,
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
pub struct ManagedFolderIndexProgressResult {
    calculated_at: String,
    indexed_files: i64,
    local_folder_id: String,
    pending_event_count: i64,
    pending_files: i64,
    progress_percent: i64,
    sync_enabled: bool,
    total_files: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderWatchResult {
    local_folder_id: String,
    watching: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderWatchEvent {
    changed_count: i64,
    local_folder_id: String,
    observed_at: String,
}

const MANAGED_FOLDER_WATCH_EVENT: &str = "bubli-managed-folder-watch-event";

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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFilePreviewInput {
    local_file_id: String,
    max_chars: Option<usize>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFilePreviewResult {
    local_file_id: String,
    mime_type: Option<String>,
    name: String,
    path: String,
    preview_text: Option<String>,
    read_at: String,
    status: String,
    truncated: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileOpenInput {
    local_file_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileOpenResult {
    local_file_id: String,
    name: String,
    opened_at: String,
    path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileReindexInput {
    local_file_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileReindexResult {
    changed: bool,
    checksum: Option<String>,
    local_file_id: String,
    local_folder_id: String,
    name: String,
    path: String,
    reindexed_at: String,
    status: String,
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

const SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL: &str = "'CREATED', 'UPDATED', 'DELETED'";

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
         VALUES (?1, ?2, ?3, 'ACTIVE', 1, ?4, ?4) \
         ON CONFLICT(path) DO UPDATE SET status = 'ACTIVE', sync_enabled = 1, updated_at = excluded.updated_at",
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

/// Read personal managed folders from the local SQLite registry.
#[tauri::command]
pub fn list_managed_folders(state: State<'_, Db>) -> Result<ManagedFolderListResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let mut statement = conn
        .prepare(
            "SELECT id, name, path, status, sync_enabled, created_at, updated_at \
             FROM managed_folders \
             WHERE status != 'REMOVED' \
             ORDER BY updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let folders = statement
        .query_map([], |row| {
            Ok(ManagedFolderListItem {
                local_folder_id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                status: row.get(3)?,
                sync_enabled: row.get::<_, i64>(4)? != 0,
                created_at: ms_to_iso(row.get(5)?),
                updated_at: ms_to_iso(row.get(6)?),
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    Ok(ManagedFolderListResult {
        folders,
        loaded_at: ms_to_iso(now_ms()),
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
        .set_title("Select managed folder")
        .blocking_pick_folder()
        .ok_or_else(|| "folder selection cancelled".to_string())?
        .into_path()
        .map_err(|error| format!("folder path resolve failed: {error}"))
}

/// Return the current local index progress for one personal managed folder.
#[tauri::command]
pub fn get_index_progress(
    state: State<'_, Db>,
    input: ManagedFolderCommandInput,
) -> Result<ManagedFolderIndexProgressResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    get_index_progress_for_conn(&conn, &input.local_folder_id)
}

/// Toggle whether detected file events from a personal managed folder may be
/// staged for server reflection. Raw file contents still stay local.
#[tauri::command]
pub fn set_folder_sync(
    state: State<'_, Db>,
    input: ManagedFolderSyncInput,
) -> Result<ManagedFolderSyncResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let now = now_ms();
    set_folder_sync_for_conn(&conn, &input.local_folder_id, input.enabled, now)
}

fn set_folder_sync_for_conn(
    conn: &Connection,
    local_folder_id: &str,
    enabled: bool,
    now: i64,
) -> Result<ManagedFolderSyncResult, String> {
    let changed = conn
        .execute(
            "UPDATE managed_folders SET sync_enabled = ?2, updated_at = ?3 \
             WHERE id = ?1 AND status != 'REMOVED'",
            params![local_folder_id, if enabled { 1_i64 } else { 0_i64 }, now],
        )
        .map_err(|error| error.to_string())?;

    if changed == 0 {
        return Err(format!("managed folder not found: {local_folder_id}"));
    }

    let pending_event_count = pending_syncable_event_count(conn, local_folder_id)?;

    Ok(ManagedFolderSyncResult {
        local_folder_id: local_folder_id.to_string(),
        pending_event_count,
        sync_enabled: enabled,
        updated_at: ms_to_iso(now),
    })
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
        let checksum = match sha256_head(&file) {
            Ok(value) => value,
            Err(_) => continue,
        };

        let existing: Option<(String, Option<i64>, Option<i64>, Option<String>)> = conn
            .query_row(
                "SELECT id, size_bytes, modified_at, checksum FROM local_files \
                 WHERE local_folder_id = ?1 AND local_path = ?2",
                params![input.local_folder_id, local_path],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<i64>>(1)?,
                        row.get::<_, Option<i64>>(2)?,
                        row.get::<_, Option<String>>(3)?,
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
                     VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, 'LOCAL_ONLY', ?7, ?8)",
                    params![file_id, input.local_folder_id, file_name, local_path, size_bytes, checksum, modified_ms, now],
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
                    Some(&checksum),
                    size_bytes,
                    modified_ms,
                    now,
                )?;
                changed_count += 1;
            }
            Some((file_id, prev_size, prev_modified, prev_checksum)) => {
                let changed = local_file_changed(
                    prev_size,
                    prev_modified,
                    prev_checksum.as_deref(),
                    size_bytes,
                    modified_ms,
                    &checksum,
                );
                if changed {
                    conn.execute(
                        "UPDATE local_files SET size_bytes = ?2, modified_at = ?3, checksum = ?4, sync_status = 'LOCAL_ONLY', updated_at = ?5 \
                         WHERE id = ?1",
                        params![file_id, size_bytes, modified_ms, checksum, now],
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
                        Some(&checksum),
                        size_bytes,
                        modified_ms,
                        now,
                    )?;
                    changed_count += 1;
                } else if prev_checksum.is_none() {
                    conn.execute(
                        "UPDATE local_files SET checksum = ?2, updated_at = ?3 WHERE id = ?1",
                        params![file_id, checksum, now],
                    )
                    .map_err(|error| error.to_string())?;
                }
            }
        }
    }

    let mut known_files = Vec::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT id, file_name, local_path, COALESCE(size_bytes, 0), modified_at, checksum \
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
                    row.get::<_, Option<String>>(5)?,
                ))
            })
            .map_err(|error| error.to_string())?;
        for row in rows {
            known_files.push(row.map_err(|error| error.to_string())?);
        }
    }

    for (file_id, file_name, local_path, size_bytes, modified_ms, checksum) in known_files {
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
            checksum.as_deref(),
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
    let callback_app = app.clone();
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
        let mut changed_count = 0;

        for path in event.paths {
            match record_watch_path_change(&conn, &callback_folder_id, &path, now) {
                Ok(count) => changed_count += count,
                Err(error) => eprintln!("managed folder watch event failed: {error}"),
            }
        }

        if changed_count > 0 {
            let payload = ManagedFolderWatchEvent {
                changed_count,
                local_folder_id: callback_folder_id.clone(),
                observed_at: ms_to_iso(now),
            };
            if let Err(error) = callback_app.emit(MANAGED_FOLDER_WATCH_EVENT, payload) {
                eprintln!("managed folder watch emit failed: {error}");
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

fn get_index_progress_for_conn(
    conn: &Connection,
    local_folder_id: &str,
) -> Result<ManagedFolderIndexProgressResult, String> {
    let sync_enabled: Option<i64> = conn
        .query_row(
            "SELECT sync_enabled FROM managed_folders WHERE id = ?1 AND status != 'REMOVED'",
            params![local_folder_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let Some(sync_enabled) = sync_enabled else {
        return Err(format!("managed folder not found: {local_folder_id}"));
    };

    let total_files: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM local_files WHERE local_folder_id = ?1",
            params![local_folder_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let indexed_files: i64 = conn
        .query_row(
            "SELECT COUNT(DISTINCT f.id) \
             FROM local_files f \
             INNER JOIN local_file_fts fts ON fts.local_file_id = f.id \
             WHERE f.local_folder_id = ?1",
            params![local_folder_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let pending_event_count = pending_syncable_event_count(conn, local_folder_id)?;
    let pending_files = (total_files - indexed_files).max(0);
    let progress_percent = if total_files == 0 {
        100
    } else {
        ((indexed_files * 100) / total_files).clamp(0, 100)
    };

    Ok(ManagedFolderIndexProgressResult {
        calculated_at: ms_to_iso(now_ms()),
        indexed_files,
        local_folder_id: local_folder_id.to_string(),
        pending_event_count,
        pending_files,
        progress_percent,
        sync_enabled: sync_enabled == 1,
        total_files,
    })
}

fn pending_syncable_event_count(conn: &Connection, local_folder_id: &str) -> Result<i64, String> {
    conn.query_row(
        format!(
            "SELECT COUNT(*) FROM local_file_events \
             WHERE local_folder_id = ?1 \
               AND status IN ('PENDING', 'APPROVED', 'FAILED') \
               AND event_type IN ({SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL})"
        )
        .as_str(),
        params![local_folder_id],
        |row| row.get(0),
    )
    .map_err(|error| error.to_string())
}

fn reindex_file_for_conn(
    conn: &Connection,
    local_file_id: &str,
    now: i64,
) -> Result<LocalFileReindexResult, String> {
    let row: Option<(
        String,
        String,
        String,
        String,
        Option<i64>,
        Option<i64>,
        Option<String>,
    )> = conn
        .query_row(
            "SELECT id, local_folder_id, file_name, local_path, size_bytes, modified_at, checksum \
             FROM local_files WHERE id = ?1",
            params![local_file_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                ))
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let Some((
        local_file_id,
        local_folder_id,
        stored_name,
        local_path,
        prev_size,
        prev_modified,
        prev_checksum,
    )) = row
    else {
        return Err(format!(
            "local file not found in managed index: {local_file_id}"
        ));
    };

    let path = PathBuf::from(&local_path);
    if !path.exists() {
        let changed_count =
            record_watch_path_delete(conn, &local_folder_id, &stored_name, &local_path, now)?;
        return Ok(LocalFileReindexResult {
            changed: changed_count > 0,
            checksum: prev_checksum,
            local_file_id,
            local_folder_id,
            name: stored_name,
            path: local_path,
            reindexed_at: ms_to_iso(now),
            status: "MISSING".to_string(),
        });
    }

    let metadata = std::fs::metadata(&path).map_err(|error| error.to_string())?;
    if !metadata.is_file() {
        return Err(format!("not a file: {local_path}"));
    }

    let file_name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or(stored_name);
    let size_bytes = metadata.len() as i64;
    let modified_ms = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64);
    let checksum = sha256_head(&path)?;
    let changed = local_file_changed(
        prev_size,
        prev_modified,
        prev_checksum.as_deref(),
        size_bytes,
        modified_ms,
        &checksum,
    );

    conn.execute(
        "UPDATE local_files \
         SET file_name = ?2, size_bytes = ?3, modified_at = ?4, checksum = ?5, sync_status = 'LOCAL_ONLY', updated_at = ?6 \
         WHERE id = ?1",
        params![local_file_id, file_name, size_bytes, modified_ms, checksum, now],
    )
    .map_err(|error| error.to_string())?;
    upsert_file_fts_index(conn, &local_file_id, &file_name, &local_path, &path)?;

    if changed {
        record_event(
            conn,
            &local_folder_id,
            Some(local_file_id.as_str()),
            "UPDATED",
            &file_name,
            &local_path,
            Some(&checksum),
            size_bytes,
            modified_ms,
            now,
        )?;
    }

    Ok(LocalFileReindexResult {
        changed,
        checksum: Some(checksum),
        local_file_id,
        local_folder_id,
        name: file_name,
        path: local_path,
        reindexed_at: ms_to_iso(now),
        status: "REINDEXED".to_string(),
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
            let checksum = sha256_head(path)?;

            let existing: Option<(String, Option<i64>, Option<i64>, Option<String>)> = conn
                .query_row(
                    "SELECT id, size_bytes, modified_at, checksum FROM local_files \
                     WHERE local_folder_id = ?1 AND local_path = ?2",
                    params![local_folder_id, local_path],
                    |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, Option<i64>>(1)?,
                            row.get::<_, Option<i64>>(2)?,
                            row.get::<_, Option<String>>(3)?,
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
                         VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, 'LOCAL_ONLY', ?7, ?8)",
                        params![file_id, local_folder_id, file_name, local_path, size_bytes, checksum, modified_ms, now],
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
                        Some(&checksum),
                        size_bytes,
                        modified_ms,
                        now,
                    )?;
                    Ok(1)
                }
                Some((file_id, prev_size, prev_modified, prev_checksum)) => {
                    if !local_file_changed(
                        prev_size,
                        prev_modified,
                        prev_checksum.as_deref(),
                        size_bytes,
                        modified_ms,
                        &checksum,
                    ) {
                        if prev_checksum.is_none() {
                            conn.execute(
                                "UPDATE local_files SET checksum = ?2, updated_at = ?3 WHERE id = ?1",
                                params![file_id, checksum, now],
                            )
                            .map_err(|error| error.to_string())?;
                        }
                        return Ok(0);
                    }
                    conn.execute(
                        "UPDATE local_files SET size_bytes = ?2, modified_at = ?3, checksum = ?4, sync_status = 'LOCAL_ONLY', updated_at = ?5 \
                         WHERE id = ?1",
                        params![file_id, size_bytes, modified_ms, checksum, now],
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
                        Some(&checksum),
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
    let existing: Option<(String, i64, Option<i64>, Option<String>)> = conn
        .query_row(
            "SELECT id, COALESCE(size_bytes, 0), modified_at, checksum FROM local_files \
             WHERE local_folder_id = ?1 AND local_path = ?2",
            params![local_folder_id, local_path],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let Some((file_id, size_bytes, modified_ms, checksum)) = existing else {
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
        checksum.as_deref(),
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

fn sha256_head(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|error| error.to_string())?;
    let mut hasher = Sha256::new();
    let mut remaining = CHECKSUM_HEAD_BYTES;
    let mut buffer = [0_u8; 8192];

    while remaining > 0 {
        let max_read = buffer.len().min(remaining as usize);
        let read_len = file
            .read(&mut buffer[..max_read])
            .map_err(|error| error.to_string())?;
        if read_len == 0 {
            break;
        }
        hasher.update(&buffer[..read_len]);
        remaining -= read_len as u64;
    }

    Ok(format!("{:x}", hasher.finalize()))
}

fn local_file_changed(
    prev_size: Option<i64>,
    prev_modified: Option<i64>,
    prev_checksum: Option<&str>,
    size_bytes: i64,
    modified_ms: Option<i64>,
    checksum: &str,
) -> bool {
    match prev_checksum {
        Some(value) => value != checksum,
        None => prev_size != Some(size_bytes) || prev_modified != modified_ms,
    }
}

fn read_local_text_preview(
    path: &Path,
    max_chars: usize,
) -> Result<(Option<String>, String, bool), String> {
    if !is_supported_text_file(path) {
        return Ok((None, "UNSUPPORTED".to_string(), false));
    }

    let metadata = match std::fs::metadata(path) {
        Ok(value) if value.is_file() => value,
        _ => return Ok((None, "MISSING".to_string(), false)),
    };
    if metadata.len() > MAX_EXTRACT_BYTES {
        return Ok((None, "TOO_LARGE".to_string(), false));
    }

    let bytes = std::fs::read(path).map_err(|error| error.to_string())?;
    let text = String::from_utf8_lossy(&bytes)
        .replace('\0', " ")
        .trim()
        .to_string();
    let total_chars = text.chars().count();
    let truncated = total_chars > max_chars;
    let preview_text = if truncated {
        text.chars().take(max_chars).collect::<String>()
    } else {
        text
    };

    Ok((Some(preview_text), "READY".to_string(), truncated))
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

/// Read a bounded text preview for a file already registered in the personal
/// managed-folder index. This never uploads raw file content.
#[tauri::command]
pub fn read_local_file_preview(
    state: State<'_, Db>,
    input: LocalFilePreviewInput,
) -> Result<LocalFilePreviewResult, String> {
    let max_chars = input.max_chars.unwrap_or(4_000).clamp(200, 12_000);
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let row: Option<(String, String)> = conn
        .query_row(
            "SELECT file_name, local_path FROM local_files WHERE id = ?1",
            params![input.local_file_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    let Some((name, path)) = row else {
        return Err(format!(
            "local file not found in managed index: {}",
            input.local_file_id
        ));
    };

    let path_buf = PathBuf::from(&path);
    let (preview_text, status, truncated) = read_local_text_preview(&path_buf, max_chars)?;

    Ok(LocalFilePreviewResult {
        local_file_id: input.local_file_id,
        mime_type: guess_mime_type(&name),
        name,
        path,
        preview_text,
        read_at: crate::local_db::now_iso(),
        status,
        truncated,
    })
}

/// Open a file that is already registered in the personal managed-folder index.
/// The caller passes only the local file id; arbitrary path opening is rejected
/// by resolving the path from SQLite first.
#[tauri::command]
pub fn open_local_file(
    state: State<'_, Db>,
    input: LocalFileOpenInput,
) -> Result<LocalFileOpenResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let row: Option<(String, String)> = conn
        .query_row(
            "SELECT file_name, local_path FROM local_files WHERE id = ?1",
            params![input.local_file_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    let Some((name, path)) = row else {
        return Err(format!(
            "local file not found in managed index: {}",
            input.local_file_id
        ));
    };

    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format!("local file is no longer available: {path}"));
    }

    tauri_plugin_opener::open_path(&path_buf, None::<&str>).map_err(|error| error.to_string())?;

    Ok(LocalFileOpenResult {
        local_file_id: input.local_file_id,
        name,
        opened_at: crate::local_db::now_iso(),
        path,
    })
}

/// Re-read a locally indexed file and refresh its FTS row. If the content
/// changed, record an UPDATED event so sync-enabled folders can reflect it.
#[tauri::command]
pub fn reindex_file(
    state: State<'_, Db>,
    input: LocalFileReindexInput,
) -> Result<LocalFileReindexResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    reindex_file_for_conn(&conn, &input.local_file_id, now_ms())
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
    let sent_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM local_sync_outbox WHERE status = 'SENT'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(SyncOutboxFlushResult {
        failed_count,
        flushed_at: crate::local_db::now_iso(),
        sent_count,
    })
}

fn local_file_event_outbox_key(local_event_id: &str) -> String {
    format!("local-file-event:{local_event_id}")
}

fn stage_local_file_event_outbox(
    conn: &Connection,
    event: &LocalFileSyncEventCandidate,
    now: i64,
) -> Result<(), String> {
    let idempotency_key = local_file_event_outbox_key(&event.local_event_id);
    let payload_json = json!(event).to_string();

    conn.execute(
        "INSERT INTO local_sync_outbox \
         (id, idempotency_key, operation, payload_json, status, retry_count, created_at, updated_at) \
         VALUES (?1, ?2, 'local_file_event', ?3, 'PENDING', 0, ?4, ?4) \
         ON CONFLICT(idempotency_key) DO UPDATE SET \
           payload_json = excluded.payload_json, status = 'PENDING', updated_at = excluded.updated_at",
        params![Uuid::new_v4().to_string(), idempotency_key, payload_json, now],
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

fn mark_local_file_event_outbox(
    conn: &Connection,
    local_event_id: &str,
    status: &str,
    now: i64,
) -> Result<(), String> {
    let idempotency_key = local_file_event_outbox_key(local_event_id);
    if status == "FAILED" {
        conn.execute(
            "UPDATE local_sync_outbox \
             SET status = 'FAILED', retry_count = retry_count + 1, updated_at = ?2 \
             WHERE idempotency_key = ?1 AND operation = 'local_file_event'",
            params![idempotency_key, now],
        )
        .map_err(|error| error.to_string())?;
    } else {
        conn.execute(
            "UPDATE local_sync_outbox \
             SET status = 'SENT', updated_at = ?2 \
             WHERE idempotency_key = ?1 AND operation = 'local_file_event'",
            params![idempotency_key, now],
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(())
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
                format!(
                    "SELECT e.id, e.local_file_id, e.event_type, e.file_name, e.size_bytes, f.resource_id \
                 FROM local_file_events e \
                 LEFT JOIN local_files f ON f.id = e.local_file_id \
                 INNER JOIN managed_folders m ON m.id = e.local_folder_id \
                 WHERE e.status IN ('PENDING', 'APPROVED', 'FAILED') \
                   AND e.event_type IN ({SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL}) \
                   AND m.status = 'ACTIVE' \
                   AND m.sync_enabled = 1 \
                   AND e.local_folder_id = ?1 \
                 ORDER BY e.created_at ASC LIMIT ?2"
                ),
                true,
            ),
            None => (
                format!(
                    "SELECT e.id, e.local_file_id, e.event_type, e.file_name, e.size_bytes, f.resource_id \
                 FROM local_file_events e \
                 LEFT JOIN local_files f ON f.id = e.local_file_id \
                 INNER JOIN managed_folders m ON m.id = e.local_folder_id \
                 WHERE e.status IN ('PENDING', 'APPROVED', 'FAILED') \
                   AND e.event_type IN ({SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL}) \
                   AND m.status = 'ACTIVE' \
                   AND m.sync_enabled = 1 \
                 ORDER BY e.created_at ASC LIMIT ?1"
                ),
                false,
            ),
        };

        let mut stmt = conn.prepare(&sql).map_err(|error| error.to_string())?;
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
        stage_local_file_event_outbox(&conn, event, now)?;
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
        mark_local_file_event_outbox(&conn, &result.local_event_id, event_status, now)?;
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
    checksum: Option<&str>,
    size_bytes: i64,
    modified_ms: Option<i64>,
    now: i64,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO local_file_events \
         (id, local_file_id, local_folder_id, event_type, file_name, local_path, hash, size_bytes, status, reason, modified_at, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'PENDING', NULL, ?9, ?10)",
        params![
            Uuid::new_v4().to_string(),
            local_file_id,
            local_folder_id,
            event_type,
            file_name,
            local_path,
            checksum,
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
            CREATE TABLE managed_folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                sync_enabled INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE TABLE local_file_events (
                id TEXT PRIMARY KEY,
                local_file_id TEXT,
                local_folder_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                file_name TEXT NOT NULL,
                local_path TEXT NOT NULL,
                hash TEXT,
                size_bytes INTEGER,
                status TEXT NOT NULL DEFAULT 'PENDING',
                reason TEXT,
                modified_at INTEGER,
                created_at INTEGER NOT NULL
            );
            CREATE VIRTUAL TABLE local_file_fts USING fts5 (
                local_file_id UNINDEXED,
                file_name,
                content,
                local_path UNINDEXED,
                tokenize = 'trigram'
            );
            CREATE TABLE local_sync_outbox (
                id TEXT PRIMARY KEY,
                idempotency_key TEXT NOT NULL UNIQUE,
                operation TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                retry_count INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
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

    #[test]
    fn sync_stage_includes_updated_file_events() {
        assert!(SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL.contains("'CREATED'"));
        assert!(SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL.contains("'UPDATED'"));
        assert!(SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL.contains("'DELETED'"));
    }

    #[test]
    fn index_progress_reports_fts_and_pending_events() {
        let conn = test_connection();
        conn.execute(
            "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
             VALUES ('folder-1', 'Docs', '/tmp/docs', 'ACTIVE', 1, 1, 1)",
            [],
        )
        .expect("insert managed folder");
        conn.execute(
            "INSERT INTO local_files (id, local_folder_id, file_name, local_path, updated_at) \
             VALUES ('file-1', 'folder-1', 'a.txt', '/tmp/docs/a.txt', 1), \
                    ('file-2', 'folder-1', 'b.txt', '/tmp/docs/b.txt', 1)",
            [],
        )
        .expect("insert local files");
        conn.execute(
            "INSERT INTO local_file_fts (local_file_id, file_name, content, local_path) \
             VALUES ('file-1', 'a.txt', 'alpha', '/tmp/docs/a.txt')",
            [],
        )
        .expect("insert fts row");
        conn.execute(
            "INSERT INTO local_file_events \
             (id, local_file_id, local_folder_id, event_type, file_name, local_path, status, created_at) \
             VALUES ('event-1', 'file-2', 'folder-1', 'UPDATED', 'b.txt', '/tmp/docs/b.txt', 'PENDING', 1)",
            [],
        )
        .expect("insert event row");

        let progress = get_index_progress_for_conn(&conn, "folder-1").expect("read progress");

        assert_eq!(progress.total_files, 2);
        assert_eq!(progress.indexed_files, 1);
        assert_eq!(progress.pending_files, 1);
        assert_eq!(progress.pending_event_count, 1);
        assert_eq!(progress.progress_percent, 50);
        assert!(progress.sync_enabled);
    }

    #[test]
    fn set_folder_sync_updates_flag_and_keeps_pending_count() {
        let conn = test_connection();
        conn.execute(
            "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
             VALUES ('folder-1', 'Docs', '/tmp/docs', 'ACTIVE', 0, 1, 1)",
            [],
        )
        .expect("insert managed folder");
        conn.execute(
            "INSERT INTO local_file_events \
             (id, local_file_id, local_folder_id, event_type, file_name, local_path, status, created_at) \
             VALUES ('event-1', NULL, 'folder-1', 'CREATED', 'a.txt', '/tmp/docs/a.txt', 'PENDING', 1)",
            [],
        )
        .expect("insert pending event");

        let result = set_folder_sync_for_conn(&conn, "folder-1", true, 10).expect("enable sync");
        let stored: i64 = conn
            .query_row(
                "SELECT sync_enabled FROM managed_folders WHERE id = 'folder-1'",
                [],
                |row| row.get(0),
            )
            .expect("read sync flag");

        assert_eq!(stored, 1);
        assert!(result.sync_enabled);
        assert_eq!(result.pending_event_count, 1);
    }

    #[test]
    fn reindex_file_refreshes_fts_and_records_updated_event() {
        let conn = test_connection();
        let path =
            std::env::temp_dir().join(format!("bubli-local-reindex-test-{}.txt", Uuid::new_v4()));
        std::fs::write(&path, "before text").expect("write first content");
        let first_checksum = sha256_head(&path).expect("first checksum");
        conn.execute(
            "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
             VALUES ('folder-1', 'Docs', ?1, 'ACTIVE', 1, 1, 1)",
            params![path.parent().unwrap().to_string_lossy().to_string()],
        )
        .expect("insert managed folder");
        conn.execute(
            "INSERT INTO local_files \
             (id, local_folder_id, file_name, local_path, size_bytes, checksum, sync_status, modified_at, updated_at) \
             VALUES ('file-1', 'folder-1', 'note.txt', ?1, 11, ?2, 'SYNCED', 1, 1)",
            params![path.to_string_lossy().to_string(), first_checksum],
        )
        .expect("insert local file");
        upsert_file_fts_index(&conn, "file-1", "note.txt", &path.to_string_lossy(), &path)
            .expect("initial fts");

        std::fs::write(&path, "after searchable text").expect("write changed content");
        let result = reindex_file_for_conn(&conn, "file-1", 20).expect("reindex file");
        let items = search_local_files_fts(&conn, "searchable", 10).expect("search changed text");
        let event_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM local_file_events WHERE local_file_id = 'file-1' AND event_type = 'UPDATED'",
                [],
                |row| row.get(0),
            )
            .expect("read updated event count");

        assert!(result.changed);
        assert_eq!(result.status, "REINDEXED");
        assert_eq!(items.len(), 1);
        assert_eq!(event_count, 1);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn local_file_event_outbox_uses_idempotent_retry_state() {
        let conn = test_connection();
        let event = LocalFileSyncEventCandidate {
            event_type: "UPDATED".to_string(),
            file_name: "brief.md".to_string(),
            file_size_bytes: Some(128),
            local_event_id: "event-1".to_string(),
            local_file_id: Some("file-1".to_string()),
            mime_type: Some("text/markdown".to_string()),
            resource_id: Some("resource-1".to_string()),
        };

        stage_local_file_event_outbox(&conn, &event, 10).expect("stage local file event");
        mark_local_file_event_outbox(&conn, &event.local_event_id, "FAILED", 20)
            .expect("mark failed");
        stage_local_file_event_outbox(&conn, &event, 30).expect("restage local file event");
        mark_local_file_event_outbox(&conn, &event.local_event_id, "SYNCED", 40)
            .expect("mark sent");

        let (row_count, status, retry_count, payload): (i64, String, i64, String) = conn
            .query_row(
                "SELECT COUNT(*), MAX(status), MAX(retry_count), MAX(payload_json) \
                 FROM local_sync_outbox WHERE idempotency_key = 'local-file-event:event-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("read outbox row");

        assert_eq!(row_count, 1);
        assert_eq!(status, "SENT");
        assert_eq!(retry_count, 1);
        assert!(payload.contains("\"eventType\":\"UPDATED\""));
        assert!(payload.contains("\"resourceId\":\"resource-1\""));
    }

    #[test]
    fn reads_bounded_preview_for_registered_text_file() {
        let path =
            std::env::temp_dir().join(format!("bubli-local-preview-test-{}.md", Uuid::new_v4()));
        std::fs::write(&path, "first line\nsecond line\nthird line")
            .expect("write temp markdown file");

        let (preview, status, truncated) =
            read_local_text_preview(&path, 7).expect("read local preview");

        assert_eq!(status, "READY");
        assert_eq!(preview.as_deref(), Some("first l"));
        assert!(truncated);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn reports_unsupported_preview_without_reading_binary() {
        let path =
            std::env::temp_dir().join(format!("bubli-local-preview-test-{}.bin", Uuid::new_v4()));
        std::fs::write(&path, [0_u8, 1, 2, 3]).expect("write temp binary file");

        let (preview, status, truncated) =
            read_local_text_preview(&path, 100).expect("read unsupported preview state");

        assert_eq!(status, "UNSUPPORTED");
        assert!(preview.is_none());
        assert!(!truncated);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn checksum_detects_content_change_when_size_and_modified_match() {
        let path =
            std::env::temp_dir().join(format!("bubli-local-checksum-test-{}.txt", Uuid::new_v4()));
        std::fs::write(&path, "alpha").expect("write first temp text file");
        let first_checksum = sha256_head(&path).expect("checksum first content");
        std::fs::write(&path, "bravo").expect("write second temp text file");
        let second_checksum = sha256_head(&path).expect("checksum second content");

        assert_ne!(first_checksum, second_checksum);
        assert!(local_file_changed(
            Some(5),
            Some(100),
            Some(&first_checksum),
            5,
            Some(100),
            &second_checksum,
        ));
        assert!(!local_file_changed(
            Some(5),
            Some(100),
            None,
            5,
            Some(100),
            &second_checksum,
        ));

        let _ = std::fs::remove_file(path);
    }
}
