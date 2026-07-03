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

use flate2::read::DeflateDecoder;
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
const KEY_SENTENCE_METHOD: &str = "BM25_MMR_KEY_SENTENCE_V1";

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
pub struct ManagedFolderRemoveResult {
    local_folder_id: String,
    removed_at: String,
    status: String,
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderWatchAllResult {
    active_folder_count: i64,
    skipped_count: i64,
    skipped_folder_ids: Vec<String>,
    watched_count: i64,
    watched_folder_ids: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedFolderUnwatchAllResult {
    stopped_count: i64,
    stopped_folder_ids: Vec<String>,
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
pub struct LocalFileKeySentenceInput {
    local_file_id: String,
    max_chars: Option<usize>,
    max_sentence_chars: Option<usize>,
    max_sentences: Option<usize>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileKeySentenceItem {
    end_offset: usize,
    index: usize,
    score: f64,
    start_offset: usize,
    text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileKeySentenceResult {
    analyzed_char_count: usize,
    checksum: Option<String>,
    combined_text: String,
    extracted_at: String,
    extraction_method: String,
    file_name: String,
    key_sentences: Vec<LocalFileKeySentenceItem>,
    local_file_id: String,
    mime_type: Option<String>,
    path: String,
    source_char_count: usize,
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
    pending_count: i64,
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileAnalysisBackfillStageInput {
    limit: Option<i64>,
    max_attempts: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileAnalysisBackfillCandidate {
    attempt_count: i64,
    checksum: Option<String>,
    file_name: String,
    local_file_id: String,
    mime_type: Option<String>,
    resource_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileAnalysisBackfillStageResult {
    candidates: Vec<LocalFileAnalysisBackfillCandidate>,
    staged_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileAnalysisMarkInput {
    checksum: Option<String>,
    error_message: Option<String>,
    local_file_id: String,
    resource_id: String,
    status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileAnalysesMarkInput {
    results: Vec<LocalFileAnalysisMarkInput>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileAnalysesMarkResult {
    completed_at: String,
    failed_count: i64,
    synced_count: i64,
}

/// Keeps native file watchers alive for the lifetime of the app process.
pub struct ManagedFolderWatchers(pub Mutex<HashMap<String, RecommendedWatcher>>);

const SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL: &str = "'CREATED', 'UPDATED', 'DELETED'";
const DEFAULT_ANALYSIS_BACKFILL_MAX_ATTEMPTS: i64 = 3;

impl Default for ManagedFolderWatchers {
    fn default() -> Self {
        Self(Mutex::new(HashMap::new()))
    }
}

/// Register a personal managed folder. When the frontend does not pass an
/// explicit path, use the native desktop folder picker.
#[tauri::command]
pub async fn select_managed_folder(
    app: AppHandle,
    state: State<'_, Db>,
    input: Option<SelectManagedFolderInput>,
) -> Result<ManagedFolderSelection, String> {
    let path_buf = resolve_managed_folder_path(&app, input).await?;
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
    list_managed_folders_for_conn(&conn, now_ms())
}

fn list_managed_folders_for_conn(
    conn: &Connection,
    loaded_at: i64,
) -> Result<ManagedFolderListResult, String> {
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
        loaded_at: ms_to_iso(loaded_at),
    })
}

async fn resolve_managed_folder_path(
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

    let (sender, mut receiver) = tauri::async_runtime::channel(1);
    app.dialog()
        .file()
        .set_title("Select managed folder")
        .pick_folder(move |folder| {
            let _ = sender.blocking_send(folder);
        });

    receiver
        .recv()
        .await
        .ok_or_else(|| "folder selection channel closed".to_string())?
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

/// Stop using a personal managed folder. The local index/event history is kept
/// for audit/retry safety, but the folder no longer watches or stages events.
#[tauri::command]
pub fn remove_managed_folder(
    state: State<'_, Db>,
    watchers: State<'_, ManagedFolderWatchers>,
    input: ManagedFolderCommandInput,
) -> Result<ManagedFolderRemoveResult, String> {
    let now = now_ms();
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let result = remove_managed_folder_for_conn(&conn, &input.local_folder_id, now)?;
    drop(conn);

    let mut guard = watchers
        .0
        .lock()
        .map_err(|_| "folder watcher state lock failed".to_string())?;
    guard.remove(&input.local_folder_id);

    Ok(result)
}

fn remove_managed_folder_for_conn(
    conn: &Connection,
    local_folder_id: &str,
    now: i64,
) -> Result<ManagedFolderRemoveResult, String> {
    let changed = conn
        .execute(
            "UPDATE managed_folders \
             SET status = 'REMOVED', sync_enabled = 0, updated_at = ?2 \
             WHERE id = ?1 AND status != 'REMOVED'",
            params![local_folder_id, now],
        )
        .map_err(|error| error.to_string())?;

    if changed == 0 {
        return Err(format!("managed folder not found: {local_folder_id}"));
    }

    Ok(ManagedFolderRemoveResult {
        local_folder_id: local_folder_id.to_string(),
        removed_at: ms_to_iso(now),
        status: "REMOVED".to_string(),
    })
}

/// Re-scan a managed folder, upsert the file index, and record change events.
#[tauri::command]
pub fn scan_managed_folder(
    state: State<'_, Db>,
    input: ManagedFolderCommandInput,
) -> Result<ManagedFolderScanResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    scan_managed_folder_for_conn(&conn, input)
}

fn scan_managed_folder_for_conn(
    conn: &Connection,
    input: ManagedFolderCommandInput,
) -> Result<ManagedFolderScanResult, String> {
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

    start_managed_folder_watcher(&app, &watchers, input.local_folder_id, folder_path)
}

/// Restore native watching for every registered active managed folder after a
/// Tauri session starts. Server sync still only stages folders with
/// sync_enabled=1; watching keeps the local SQLite index fresh.
#[tauri::command]
pub fn watch_all_managed_folders(
    app: AppHandle,
    state: State<'_, Db>,
    watchers: State<'_, ManagedFolderWatchers>,
) -> Result<ManagedFolderWatchAllResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let folders = active_managed_folders_for_conn(&conn)?;
    drop(conn);

    let active_folder_count = folders.len() as i64;
    let mut watched_folder_ids = Vec::new();
    let mut skipped_folder_ids = Vec::new();

    for (local_folder_id, folder_path) in folders {
        match start_managed_folder_watcher(&app, &watchers, local_folder_id.clone(), folder_path) {
            Ok(result) if result.watching => watched_folder_ids.push(result.local_folder_id),
            Ok(_) => skipped_folder_ids.push(local_folder_id),
            Err(error) => {
                eprintln!("managed folder auto-watch skipped {local_folder_id}: {error}");
                skipped_folder_ids.push(local_folder_id);
            }
        }
    }

    Ok(ManagedFolderWatchAllResult {
        active_folder_count,
        skipped_count: skipped_folder_ids.len() as i64,
        skipped_folder_ids,
        watched_count: watched_folder_ids.len() as i64,
        watched_folder_ids,
    })
}

#[tauri::command]
pub fn unwatch_all_managed_folders(
    watchers: State<'_, ManagedFolderWatchers>,
) -> Result<ManagedFolderUnwatchAllResult, String> {
    let mut guard = watchers
        .0
        .lock()
        .map_err(|_| "folder watcher state lock failed".to_string())?;
    let stopped_folder_ids = guard.keys().cloned().collect::<Vec<_>>();
    let stopped_count = stopped_folder_ids.len() as i64;
    guard.clear();

    Ok(ManagedFolderUnwatchAllResult {
        stopped_count,
        stopped_folder_ids,
    })
}

fn active_managed_folders_for_conn(conn: &Connection) -> Result<Vec<(String, String)>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, path FROM managed_folders WHERE status = 'ACTIVE' ORDER BY updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn start_managed_folder_watcher(
    app: &AppHandle,
    watchers: &ManagedFolderWatchers,
    local_folder_id: String,
    folder_path: String,
) -> Result<ManagedFolderWatchResult, String> {
    let folder = PathBuf::from(&folder_path);
    if !folder.is_dir() {
        return Err(format!("not a directory: {folder_path}"));
    }

    let db_path = crate::local_db::database_path(app)?;
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
    if should_skip_managed_file(path) {
        if !path.exists() {
            let local_path = path.to_string_lossy().to_string();
            let file_name = path
                .file_name()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default();
            if !file_name.is_empty() {
                return record_watch_path_delete(
                    conn,
                    local_folder_id,
                    &file_name,
                    &local_path,
                    now,
                );
            }
        }
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
        name.starts_with('.') || name == "node_modules" || is_temporary_office_file_name(&name)
    })
}

fn should_skip_managed_file(path: &Path) -> bool {
    is_ignored_path(path)
}

fn is_temporary_office_file_name(name: &str) -> bool {
    name.starts_with("~$") || name.ends_with(".tmp") || name.ends_with(".temp")
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
    if is_supported_docx_file(path) {
        return extract_docx_text(path).ok().filter(|text| !text.is_empty());
    }
    if is_supported_pdf_file(path) {
        return extract_pdf_text(path).ok().filter(|text| !text.is_empty());
    }

    if !is_supported_plain_text_file(path) {
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
    is_supported_plain_text_file(path)
        || is_supported_docx_file(path)
        || is_supported_pdf_file(path)
}

fn is_supported_plain_text_file(path: &Path) -> bool {
    let Some(extension) = path
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
    else {
        return false;
    };

    matches!(extension.as_str(), "md" | "markdown" | "txt")
}

fn is_supported_docx_file(path: &Path) -> bool {
    path.extension()
        .map(|value| value.to_string_lossy().eq_ignore_ascii_case("docx"))
        .unwrap_or(false)
}

fn is_supported_pdf_file(path: &Path) -> bool {
    path.extension()
        .map(|value| value.to_string_lossy().eq_ignore_ascii_case("pdf"))
        .unwrap_or(false)
}

fn extract_docx_text(path: &Path) -> Result<String, String> {
    let metadata = match std::fs::metadata(path) {
        Ok(value) if value.is_file() => value,
        _ => return Err("MISSING".to_string()),
    };
    if metadata.len() > MAX_EXTRACT_BYTES {
        return Err("TOO_LARGE".to_string());
    }

    let bytes = std::fs::read(path).map_err(|error| error.to_string())?;
    let document_xml = read_zip_entry(&bytes, "word/document.xml")?;
    let xml = String::from_utf8_lossy(&document_xml);
    let text = extract_docx_xml_text(&xml);
    if text.is_empty() {
        return Err("EMPTY".to_string());
    }

    Ok(text)
}

fn extract_pdf_text(path: &Path) -> Result<String, String> {
    let metadata = match std::fs::metadata(path) {
        Ok(value) if value.is_file() => value,
        _ => return Err("MISSING".to_string()),
    };
    if metadata.len() > MAX_EXTRACT_BYTES {
        return Err("TOO_LARGE".to_string());
    }

    let bytes = std::fs::read(path).map_err(|error| error.to_string())?;
    if !bytes.starts_with(b"%PDF-") {
        return Err("UNSUPPORTED".to_string());
    }

    let extracted = match pdf_extract::extract_text(path) {
        Ok(text) => text,
        Err(primary_error) => {
            let fallback = extract_pdf_text_lossy(&bytes);
            if fallback.trim().is_empty() {
                return Err(primary_error.to_string());
            }
            fallback
        }
    };

    let text = extracted
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string();
    if text.is_empty() {
        return Err("EMPTY".to_string());
    }

    Ok(text)
}

fn extract_pdf_text_lossy(bytes: &[u8]) -> String {
    let mut extracted = String::new();
    let mut cursor = 0usize;
    while let Some(stream_start_relative) = find_bytes(&bytes[cursor..], b"stream") {
        let stream_start = cursor + stream_start_relative;
        let Some(stream_end_relative) = find_bytes(&bytes[stream_start..], b"endstream") else {
            break;
        };
        let stream_end = stream_start + stream_end_relative;
        let dictionary_start = bytes[..stream_start]
            .iter()
            .rposition(|byte| *byte == b'<')
            .unwrap_or(stream_start.saturating_sub(300));
        let dictionary = String::from_utf8_lossy(&bytes[dictionary_start..stream_start]);
        let mut data_start = stream_start + b"stream".len();
        if bytes.get(data_start) == Some(&b'\r') {
            data_start += 1;
        }
        if bytes.get(data_start) == Some(&b'\n') {
            data_start += 1;
        }
        let mut data_end = stream_end;
        while data_end > data_start && matches!(bytes[data_end - 1], b'\r' | b'\n') {
            data_end -= 1;
        }

        let data = &bytes[data_start..data_end];
        let decoded = if dictionary.contains("/FlateDecode") {
            let mut decoder = DeflateDecoder::new(data);
            let mut output = Vec::new();
            decoder.read_to_end(&mut output).unwrap_or(0);
            output
        } else {
            data.to_vec()
        };
        let stream_text = extract_pdf_stream_text(&decoded);
        if !stream_text.is_empty() {
            extracted.push_str(&stream_text);
            extracted.push('\n');
        }

        cursor = stream_end + b"endstream".len();
    }

    extracted
}

fn extract_pdf_stream_text(bytes: &[u8]) -> String {
    let mut text = String::new();
    let mut index = 0usize;

    while index < bytes.len() {
        match bytes[index] {
            b'(' => {
                let (value, next) = read_pdf_literal_string(bytes, index + 1);
                if !value.trim().is_empty() {
                    text.push_str(&value);
                    text.push(' ');
                }
                index = next;
            }
            b'<' if bytes.get(index + 1) != Some(&b'<') => {
                let (value, next) = read_pdf_hex_string(bytes, index + 1);
                if !value.trim().is_empty() {
                    text.push_str(&value);
                    text.push(' ');
                }
                index = next;
            }
            _ => index += 1,
        }
    }

    text
}

fn read_pdf_literal_string(bytes: &[u8], start: usize) -> (String, usize) {
    let mut output = Vec::new();
    let mut index = start;
    let mut depth = 1i32;
    while index < bytes.len() {
        let byte = bytes[index];
        if byte == b'\\' {
            if let Some(next) = bytes.get(index + 1) {
                match *next {
                    b'n' => output.push(b'\n'),
                    b'r' => output.push(b'\r'),
                    b't' => output.push(b'\t'),
                    b'b' => output.push(8),
                    b'f' => output.push(12),
                    b'(' | b')' | b'\\' => output.push(*next),
                    b'\r' | b'\n' => {}
                    value => output.push(value),
                }
                index += 2;
                continue;
            }
        }
        if byte == b'(' {
            depth += 1;
        } else if byte == b')' {
            depth -= 1;
            if depth == 0 {
                return (String::from_utf8_lossy(&output).to_string(), index + 1);
            }
        }
        output.push(byte);
        index += 1;
    }

    (String::from_utf8_lossy(&output).to_string(), index)
}

fn read_pdf_hex_string(bytes: &[u8], start: usize) -> (String, usize) {
    let mut hex = Vec::new();
    let mut index = start;
    while index < bytes.len() {
        let byte = bytes[index];
        if byte == b'>' {
            break;
        }
        if byte.is_ascii_hexdigit() {
            hex.push(byte);
        }
        index += 1;
    }
    if hex.len() % 2 == 1 {
        hex.push(b'0');
    }
    let mut output = Vec::new();
    for chunk in hex.chunks(2) {
        let value = std::str::from_utf8(chunk)
            .ok()
            .and_then(|value| u8::from_str_radix(value, 16).ok())
            .unwrap_or_default();
        if value != 0 {
            output.push(value);
        }
    }

    (String::from_utf8_lossy(&output).to_string(), index + 1)
}

fn find_bytes(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() || haystack.len() < needle.len() {
        return None;
    }

    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn read_zip_entry(bytes: &[u8], entry_name: &str) -> Result<Vec<u8>, String> {
    let Some(eocd_offset) = find_eocd_offset(bytes) else {
        return Err("invalid docx zip: EOCD not found".to_string());
    };
    if eocd_offset + 22 > bytes.len() {
        return Err("invalid docx zip: truncated EOCD".to_string());
    }

    let entry_count = read_u16_le(bytes, eocd_offset + 10)? as usize;
    let central_directory_offset = read_u32_le(bytes, eocd_offset + 16)? as usize;
    let mut offset = central_directory_offset;

    for _ in 0..entry_count {
        if offset + 46 > bytes.len() || read_u32_le(bytes, offset)? != 0x0201_4b50 {
            return Err("invalid docx zip: central directory entry is invalid".to_string());
        }

        let compression_method = read_u16_le(bytes, offset + 10)?;
        let compressed_size = read_u32_le(bytes, offset + 20)? as usize;
        let file_name_length = read_u16_le(bytes, offset + 28)? as usize;
        let extra_length = read_u16_le(bytes, offset + 30)? as usize;
        let comment_length = read_u16_le(bytes, offset + 32)? as usize;
        let local_header_offset = read_u32_le(bytes, offset + 42)? as usize;
        let name_start = offset + 46;
        let name_end = name_start + file_name_length;
        if name_end > bytes.len() {
            return Err("invalid docx zip: entry name is truncated".to_string());
        }

        let name = String::from_utf8_lossy(&bytes[name_start..name_end]);
        if name == entry_name {
            return read_zip_local_entry(
                bytes,
                local_header_offset,
                compressed_size,
                compression_method,
            );
        }

        offset = name_end + extra_length + comment_length;
    }

    Err(format!("docx entry not found: {entry_name}"))
}

fn read_zip_local_entry(
    bytes: &[u8],
    local_header_offset: usize,
    compressed_size: usize,
    compression_method: u16,
) -> Result<Vec<u8>, String> {
    if local_header_offset + 30 > bytes.len()
        || read_u32_le(bytes, local_header_offset)? != 0x0403_4b50
    {
        return Err("invalid docx zip: local file header is invalid".to_string());
    }

    let file_name_length = read_u16_le(bytes, local_header_offset + 26)? as usize;
    let extra_length = read_u16_le(bytes, local_header_offset + 28)? as usize;
    let data_start = local_header_offset + 30 + file_name_length + extra_length;
    let data_end = data_start + compressed_size;
    if data_end > bytes.len() {
        return Err("invalid docx zip: entry data is truncated".to_string());
    }

    let data = &bytes[data_start..data_end];
    match compression_method {
        0 => Ok(data.to_vec()),
        8 => {
            let mut decoder = DeflateDecoder::new(data);
            let mut output = Vec::new();
            decoder
                .read_to_end(&mut output)
                .map_err(|error| error.to_string())?;
            Ok(output)
        }
        method => Err(format!("unsupported docx zip compression method: {method}")),
    }
}

fn find_eocd_offset(bytes: &[u8]) -> Option<usize> {
    let min_offset = bytes.len().saturating_sub(66_000);
    (min_offset..bytes.len().saturating_sub(3))
        .rev()
        .find(|offset| bytes.get(*offset..offset + 4) == Some(&[0x50, 0x4b, 0x05, 0x06]))
}

fn read_u16_le(bytes: &[u8], offset: usize) -> Result<u16, String> {
    let Some(slice) = bytes.get(offset..offset + 2) else {
        return Err("invalid docx zip: unexpected end of data".to_string());
    };
    Ok(u16::from_le_bytes([slice[0], slice[1]]))
}

fn read_u32_le(bytes: &[u8], offset: usize) -> Result<u32, String> {
    let Some(slice) = bytes.get(offset..offset + 4) else {
        return Err("invalid docx zip: unexpected end of data".to_string());
    };
    Ok(u32::from_le_bytes([slice[0], slice[1], slice[2], slice[3]]))
}

fn extract_docx_xml_text(xml: &str) -> String {
    let mut paragraphs = Vec::new();
    let mut rest = xml;

    while let Some(paragraph_start) = rest.find("<w:p") {
        rest = &rest[paragraph_start..];
        let Some(paragraph_end) = rest.find("</w:p>") else {
            break;
        };
        let paragraph_xml = &rest[..paragraph_end];
        let paragraph_text = extract_docx_text_runs(paragraph_xml);
        if !paragraph_text.trim().is_empty() {
            paragraphs.push(clean_sentence(&paragraph_text));
        }
        rest = &rest[paragraph_end + "</w:p>".len()..];
    }

    paragraphs.join("\n")
}

fn extract_docx_text_runs(xml: &str) -> String {
    let mut text = String::new();
    let mut rest = xml;

    while let Some(text_start) = rest.find("<w:t") {
        rest = &rest[text_start..];
        let Some(tag_end) = rest.find('>') else {
            break;
        };
        rest = &rest[tag_end + 1..];
        let Some(text_end) = rest.find("</w:t>") else {
            break;
        };
        text.push_str(&xml_unescape(&rest[..text_end]));
        rest = &rest[text_end + "</w:t>".len()..];
    }

    text
}

fn xml_unescape(value: &str) -> String {
    value
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&amp;", "&")
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
    if is_supported_docx_file(path) {
        let text = match extract_docx_text(path) {
            Ok(value) => value,
            Err(status) if matches!(status.as_str(), "MISSING" | "TOO_LARGE" | "EMPTY") => {
                return Ok((None, status, false));
            }
            Err(error) => return Err(error),
        };
        let total_chars = text.chars().count();
        let truncated = total_chars > max_chars;
        let preview_text = if truncated {
            text.chars().take(max_chars).collect::<String>()
        } else {
            text
        };
        return Ok((Some(preview_text), "READY".to_string(), truncated));
    }
    if is_supported_pdf_file(path) {
        let text = match extract_pdf_text(path) {
            Ok(value) => value,
            Err(status)
                if matches!(
                    status.as_str(),
                    "MISSING" | "TOO_LARGE" | "EMPTY" | "UNSUPPORTED"
                ) =>
            {
                return Ok((None, status, false));
            }
            Err(error) => return Err(error),
        };
        let total_chars = text.chars().count();
        let truncated = total_chars > max_chars;
        let preview_text = if truncated {
            text.chars().take(max_chars).collect::<String>()
        } else {
            text
        };
        return Ok((Some(preview_text), "READY".to_string(), truncated));
    }

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

fn read_local_text_for_key_sentences(path: &Path) -> Result<(Option<String>, String), String> {
    if is_supported_docx_file(path) {
        return match extract_docx_text(path) {
            Ok(value) => Ok((Some(value), "READY".to_string())),
            Err(status) if matches!(status.as_str(), "MISSING" | "TOO_LARGE" | "EMPTY") => {
                Ok((None, status))
            }
            Err(error) => Err(error),
        };
    }
    if is_supported_pdf_file(path) {
        return match extract_pdf_text(path) {
            Ok(value) => Ok((Some(value), "READY".to_string())),
            Err(status)
                if matches!(
                    status.as_str(),
                    "MISSING" | "TOO_LARGE" | "EMPTY" | "UNSUPPORTED"
                ) =>
            {
                Ok((None, status))
            }
            Err(error) => Err(error),
        };
    }

    if !is_supported_text_file(path) {
        return Ok((None, "UNSUPPORTED".to_string()));
    }

    let metadata = match std::fs::metadata(path) {
        Ok(value) if value.is_file() => value,
        _ => return Ok((None, "MISSING".to_string())),
    };
    if metadata.len() > MAX_EXTRACT_BYTES {
        return Ok((None, "TOO_LARGE".to_string()));
    }

    let bytes = std::fs::read(path).map_err(|error| error.to_string())?;
    let text = String::from_utf8_lossy(&bytes)
        .replace('\0', " ")
        .replace('\r', "\n")
        .trim()
        .to_string();

    if text.is_empty() {
        return Ok((None, "EMPTY".to_string()));
    }

    Ok((Some(text), "READY".to_string()))
}

#[derive(Clone)]
struct SentenceCandidate {
    end_offset: usize,
    index: usize,
    text: String,
    token_count: usize,
    tokens: HashMap<String, usize>,
    start_offset: usize,
}

fn split_sentences_with_offsets(text: &str) -> Vec<SentenceCandidate> {
    let mut candidates = Vec::new();
    let mut start = 0usize;
    let chars: Vec<(usize, char)> = text.char_indices().collect();

    for (position, (byte_index, ch)) in chars.iter().enumerate() {
        let next_byte = chars
            .get(position + 1)
            .map(|(next_index, _)| *next_index)
            .unwrap_or(text.len());
        let boundary = matches!(ch, '.' | '!' | '?' | '。' | '！' | '？')
            || (*ch == '\n'
                && chars
                    .get(position + 1)
                    .map(|(_, next_ch)| *next_ch == '\n')
                    .unwrap_or(true));

        if !boundary {
            continue;
        }

        push_sentence_candidate(text, start, next_byte, &mut candidates);
        start = next_byte;

        while start < text.len() {
            let Some(next_ch) = text[start..].chars().next() else {
                break;
            };
            if !next_ch.is_whitespace() {
                break;
            }
            start += next_ch.len_utf8();
        }

        if *byte_index >= text.len() {
            break;
        }
    }

    push_sentence_candidate(text, start, text.len(), &mut candidates);

    candidates
}

fn push_sentence_candidate(
    source: &str,
    start_offset: usize,
    end_offset: usize,
    candidates: &mut Vec<SentenceCandidate>,
) {
    if start_offset >= end_offset || end_offset > source.len() {
        return;
    }

    let text = clean_sentence(&source[start_offset..end_offset]);
    let char_count = text.chars().count();
    if !(12..=700).contains(&char_count) {
        return;
    }

    let tokens = tokenize_sentence(&text);
    if tokens.len() < 2 {
        return;
    }

    candidates.push(SentenceCandidate {
        end_offset,
        index: candidates.len(),
        start_offset,
        text,
        token_count: tokens.values().sum(),
        tokens,
    });
}

fn clean_sentence(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim_matches(|ch: char| ch == '-' || ch == '*' || ch == '•' || ch.is_whitespace())
        .trim()
        .to_string()
}

fn tokenize_sentence(sentence: &str) -> HashMap<String, usize> {
    let mut tokens = HashMap::new();
    let mut current = String::new();

    for ch in sentence.chars().flat_map(|ch| ch.to_lowercase()) {
        if ch.is_alphanumeric() {
            current.push(ch);
            continue;
        }

        push_token(&mut tokens, &mut current);
    }
    push_token(&mut tokens, &mut current);

    tokens
}

fn push_token(tokens: &mut HashMap<String, usize>, current: &mut String) {
    if current.chars().count() < 2 {
        current.clear();
        return;
    }

    if !is_key_sentence_stopword(current) {
        *tokens.entry(current.clone()).or_insert(0) += 1;
    }
    current.clear();
}

fn is_key_sentence_stopword(token: &str) -> bool {
    matches!(
        token,
        "그리고"
            | "그러나"
            | "하지만"
            | "또는"
            | "또한"
            | "대한"
            | "관련"
            | "통해"
            | "위해"
            | "있는"
            | "없는"
            | "한다"
            | "합니다"
            | "됩니다"
            | "되어"
            | "the"
            | "and"
            | "or"
            | "for"
            | "with"
            | "from"
            | "this"
            | "that"
            | "shall"
            | "will"
            | "must"
    )
}

fn sentence_similarity(left: &HashMap<String, usize>, right: &HashMap<String, usize>) -> f64 {
    if left.is_empty() || right.is_empty() {
        return 0.0;
    }

    let overlap = left
        .keys()
        .filter(|token| right.contains_key(*token))
        .count() as f64;
    if overlap == 0.0 {
        return 0.0;
    }

    overlap / ((left.len() as f64 * right.len() as f64).sqrt()).max(1.0)
}

fn domain_keyword_boost(sentence: &str) -> f64 {
    let lower = sentence.to_lowercase();
    let weighted_keywords = [
        ("요구사항", 0.35),
        ("계약", 0.28),
        ("계약조건", 0.32),
        ("프로젝트명", 0.3),
        ("위탁자", 0.22),
        ("수탁자", 0.22),
        ("위탁업무", 0.34),
        ("업무 범위", 0.36),
        ("범위", 0.28),
        ("결과물", 0.34),
        ("산출물", 0.34),
        ("납품", 0.32),
        ("제출", 0.24),
        ("제공", 0.18),
        ("원본자료", 0.28),
        ("기밀정보", 0.26),
        ("납기", 0.34),
        ("납품일", 0.34),
        ("제출일", 0.3),
        ("기한", 0.28),
        ("마감", 0.26),
        ("계약기간", 0.32),
        ("유효기간", 0.3),
        ("자동 갱신", 0.24),
        ("게시 일정표", 0.28),
        ("업로드 예정일", 0.28),
        ("검수", 0.34),
        ("재검수", 0.3),
        ("승인", 0.28),
        ("회신", 0.22),
        ("통과", 0.24),
        ("수정", 0.28),
        ("재작업", 0.28),
        ("오류 수정", 0.28),
        ("결함 수정", 0.28),
        ("변경", 0.22),
        ("계약 변경", 0.34),
        ("추가 협의", 0.34),
        ("별도 협의", 0.32),
        ("별도 정산", 0.3),
        ("포함하지 않는다", 0.3),
        ("비용", 0.24),
        ("금액", 0.28),
        ("수수료", 0.3),
        ("보수", 0.34),
        ("총 보수", 0.38),
        ("월 보수", 0.34),
        ("계약금", 0.32),
        ("착수금", 0.34),
        ("잔금", 0.32),
        ("지급", 0.28),
        ("지급기준", 0.32),
        ("지급 조건", 0.34),
        ("지급 시기", 0.32),
        ("지급명세서", 0.28),
        ("입금", 0.24),
        ("마일스톤", 0.34),
        ("공제", 0.24),
        ("원천징수", 0.28),
        ("원천공제", 0.28),
        ("사회보험료", 0.24),
        ("광고비", 0.3),
        ("사용료", 0.24),
        ("대관료", 0.24),
        ("연동비", 0.24),
        ("위약", 0.3),
        ("해지", 0.3),
        ("시정", 0.26),
        ("미이행", 0.3),
        ("손해", 0.26),
        ("손해배상", 0.32),
        ("분쟁", 0.22),
        ("책임", 0.28),
        ("권한", 0.22),
        ("개인정보", 0.24),
        ("누설", 0.24),
        ("영업정보", 0.24),
        ("영업상 비밀", 0.26),
        ("제외", 0.24),
        ("포함", 0.22),
        ("필수", 0.26),
        ("특약", 0.34),
        ("운영지원", 0.34),
        ("스테이징", 0.28),
        ("API 명세서", 0.28),
        ("테스트 코드", 0.24),
        ("배포", 0.24),
        ("deliverable", 0.34),
        ("deadline", 0.34),
        ("scope", 0.3),
        ("payment", 0.3),
        ("requirement", 0.34),
        ("acceptance", 0.34),
        ("approval", 0.28),
        ("termination", 0.3),
        ("liability", 0.28),
    ];
    let keyword_boost = weighted_keywords
        .iter()
        .filter(|(keyword, _)| lower.contains(*keyword))
        .map(|(_, weight)| *weight)
        .sum::<f64>();
    let numeric_boost = if lower.chars().any(|ch| ch.is_ascii_digit()) {
        0.2
    } else {
        0.0
    };

    (keyword_boost + numeric_boost).min(1.2)
}

fn bm25_sentence_scores(candidates: &[SentenceCandidate]) -> Vec<f64> {
    let total_sentences = candidates.len() as f64;
    let average_length = candidates
        .iter()
        .map(|candidate| candidate.token_count as f64)
        .sum::<f64>()
        / total_sentences.max(1.0);
    let mut document_frequency: HashMap<&str, usize> = HashMap::new();

    for candidate in candidates {
        for token in candidate.tokens.keys() {
            *document_frequency.entry(token.as_str()).or_insert(0) += 1;
        }
    }

    let k1 = 1.5;
    let b = 0.75;
    candidates
        .iter()
        .enumerate()
        .map(|(index, candidate)| {
            let length = (candidate.token_count as f64).max(1.0);
            let mut score = 0.0;
            for (token, frequency) in &candidate.tokens {
                let df = *document_frequency.get(token.as_str()).unwrap_or(&1) as f64;
                let idf = ((total_sentences - df + 0.5) / (df + 0.5) + 1.0).ln();
                let tf = *frequency as f64;
                let denominator = tf + k1 * (1.0 - b + b * length / average_length.max(1.0));
                score += idf * (tf * (k1 + 1.0)) / denominator;
            }

            let position_boost = if index < 3 { 0.25 } else { 0.0 };
            score + position_boost + domain_keyword_boost(&candidate.text)
        })
        .collect()
}

fn select_sentences_with_mmr(
    candidates: &[SentenceCandidate],
    base_scores: &[f64],
    max_sentences: usize,
) -> Vec<(usize, f64)> {
    let mut selected: Vec<(usize, f64)> = Vec::new();
    let mut remaining = (0..candidates.len()).collect::<HashSet<_>>();
    let lambda = 0.72;

    while !remaining.is_empty() && selected.len() < max_sentences {
        let next = remaining
            .iter()
            .map(|index| {
                let redundancy = selected
                    .iter()
                    .map(|(selected_index, _)| {
                        sentence_similarity(
                            &candidates[*index].tokens,
                            &candidates[*selected_index].tokens,
                        )
                    })
                    .fold(0.0, f64::max);
                let mmr_score = lambda * base_scores[*index] - (1.0 - lambda) * redundancy;
                (*index, mmr_score)
            })
            .max_by(|left, right| left.1.total_cmp(&right.1));

        let Some((index, score)) = next else {
            break;
        };
        remaining.remove(&index);
        selected.push((index, score));
    }

    selected
}

fn extract_key_sentences(
    text: &str,
    max_sentences: usize,
    max_sentence_chars: usize,
) -> Vec<LocalFileKeySentenceItem> {
    let candidates = split_sentences_with_offsets(text);
    if candidates.is_empty() {
        return Vec::new();
    }

    if candidates.len() == 1 {
        let only = &candidates[0];
        return vec![LocalFileKeySentenceItem {
            end_offset: only.end_offset,
            index: only.index,
            score: 1.0,
            start_offset: only.start_offset,
            text: truncate_chars(&only.text, max_sentence_chars),
        }];
    }

    let scores = bm25_sentence_scores(&candidates);
    let mut ranked = select_sentences_with_mmr(&candidates, &scores, max_sentences);
    ranked.sort_by_key(|(index, _)| *index);

    ranked
        .into_iter()
        .map(|(index, score)| {
            let candidate = &candidates[index];
            LocalFileKeySentenceItem {
                end_offset: candidate.end_offset,
                index: candidate.index,
                score: (score * 1000.0).round() / 1000.0,
                start_offset: candidate.start_offset,
                text: truncate_chars(&candidate.text, max_sentence_chars),
            }
        })
        .collect()
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    if value.chars().count() <= max_chars {
        return value.to_string();
    }

    value.chars().take(max_chars).collect::<String>()
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

/// Search the local file index by name. Path-like queries can also match paths.
#[tauri::command]
pub fn search_local_files(
    state: State<'_, Db>,
    input: LocalFileSearchInput,
) -> Result<LocalFileSearchResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    search_local_files_for_conn(&conn, input)
}

fn search_local_files_for_conn(
    conn: &Connection,
    input: LocalFileSearchInput,
) -> Result<LocalFileSearchResult, String> {
    let limit = input.limit.unwrap_or(50).clamp(1, 500);
    let query = input.query.trim().to_string();
    if !query.is_empty() {
        match search_local_files_fts(&conn, &query, limit) {
            Ok(items) if !items.is_empty() => return Ok(LocalFileSearchResult { items }),
            Ok(_) => {}
            Err(error) => {
                eprintln!("local file FTS search failed; falling back to LIKE: {error}");
            }
        }
    }

    let needle = format!("%{}%", query);
    let path_like_query = is_path_like_search_query(&query);
    let mut stmt = conn
        .prepare(if path_like_query {
            "SELECT id, file_name, local_path, updated_at FROM local_files \
             WHERE file_name LIKE ?1 OR local_path LIKE ?1 \
             ORDER BY updated_at DESC LIMIT ?2"
        } else {
            "SELECT id, file_name, local_path, updated_at FROM local_files \
             WHERE file_name LIKE ?1 \
             ORDER BY updated_at DESC LIMIT ?2"
        })
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

fn is_path_like_search_query(query: &str) -> bool {
    query.contains('/') || query.contains('\\') || query.starts_with('~')
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

/// Extract important sentences from a locally indexed personal file. This is
/// an extractive, no-LLM preprocessing step for the frontend to pass to the API
/// server; raw file content is not sent by this IPC command.
#[tauri::command]
pub fn extract_local_file_key_sentences(
    state: State<'_, Db>,
    input: LocalFileKeySentenceInput,
) -> Result<LocalFileKeySentenceResult, String> {
    let max_chars = input.max_chars.unwrap_or(80_000).clamp(2_000, 120_000);
    let max_sentence_chars = input.max_sentence_chars.unwrap_or(700).clamp(120, 1_500);
    let max_sentences = input.max_sentences.unwrap_or(18).clamp(3, 40);
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let row: Option<(String, String, Option<String>)> = conn
        .query_row(
            "SELECT file_name, local_path, checksum FROM local_files WHERE id = ?1",
            params![input.local_file_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    let Some((file_name, path, stored_checksum)) = row else {
        return Err(format!(
            "local file not found in managed index: {}",
            input.local_file_id
        ));
    };

    let path_buf = PathBuf::from(&path);
    let (text, status) = read_local_text_for_key_sentences(&path_buf)?;
    let checksum = stored_checksum.or_else(|| sha256_head(&path_buf).ok());
    let Some(source_text) = text else {
        return Ok(LocalFileKeySentenceResult {
            analyzed_char_count: 0,
            checksum,
            combined_text: String::new(),
            extracted_at: crate::local_db::now_iso(),
            extraction_method: KEY_SENTENCE_METHOD.to_string(),
            file_name,
            key_sentences: Vec::new(),
            local_file_id: input.local_file_id,
            mime_type: guess_mime_type(&path),
            path,
            source_char_count: 0,
            status,
            truncated: false,
        });
    };

    let source_char_count = source_text.chars().count();
    let truncated = source_char_count > max_chars;
    let analyzed_text = if truncated {
        source_text.chars().take(max_chars).collect::<String>()
    } else {
        source_text
    };
    let analyzed_char_count = analyzed_text.chars().count();
    let key_sentences = extract_key_sentences(&analyzed_text, max_sentences, max_sentence_chars);
    let combined_text = key_sentences
        .iter()
        .map(|sentence| sentence.text.as_str())
        .collect::<Vec<_>>()
        .join("\n");
    let status = if key_sentences.is_empty() {
        "EMPTY".to_string()
    } else {
        "READY".to_string()
    };

    Ok(LocalFileKeySentenceResult {
        analyzed_char_count,
        checksum,
        combined_text,
        extracted_at: crate::local_db::now_iso(),
        extraction_method: KEY_SENTENCE_METHOD.to_string(),
        file_name,
        key_sentences,
        local_file_id: input.local_file_id,
        mime_type: guess_mime_type(&path),
        path,
        source_char_count,
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
    sync_outbox_summary_for_conn(&conn)
}

fn sync_outbox_count_for_conn(conn: &Connection, status: &str) -> Result<i64, String> {
    conn.query_row(
        "SELECT COUNT(*) FROM local_sync_outbox WHERE status = ?1",
        params![status],
        |row| row.get(0),
    )
    .map_err(|error| error.to_string())
}

fn sync_outbox_summary_for_conn(conn: &Connection) -> Result<SyncOutboxFlushResult, String> {
    let pending_count = sync_outbox_count_for_conn(conn, "PENDING")?;
    let failed_count = sync_outbox_count_for_conn(conn, "FAILED")?;
    let sent_count = sync_outbox_count_for_conn(conn, "SENT")?;

    Ok(SyncOutboxFlushResult {
        failed_count,
        flushed_at: crate::local_db::now_iso(),
        pending_count,
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
    mark_local_file_events_synced_for_conn(&conn, input, now)
}

fn mark_local_file_events_synced_for_conn(
    conn: &Connection,
    input: LocalFileEventsMarkSyncedInput,
    now: i64,
) -> Result<LocalFileEventsMarkSyncedResult, String> {
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

        let normalized_status = result.status.to_ascii_uppercase();
        let failed = normalized_status == "FAILED";
        let skipped = normalized_status == "SKIPPED";
        let skipped_delete = event_type == "DELETED" && skipped;
        let event_status = if failed || skipped_delete {
            "FAILED"
        } else {
            "SYNCED"
        };
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

        if let Some(local_file_id) = local_file_id {
            if skipped_delete {
                failed_count += 1;
                conn.execute(
                    "UPDATE local_files SET sync_status = 'FAILED', updated_at = ?2 WHERE id = ?1",
                    params![local_file_id, now],
                )
                .map_err(|error| error.to_string())?;
                continue;
            }

            if event_type == "DELETED" {
                delete_file_fts_index(&conn, &local_file_id)?;
                conn.execute(
                    "DELETE FROM local_files WHERE id = ?1",
                    params![local_file_id],
                )
                .map_err(|error| error.to_string())?;
                synced_count += 1;
                continue;
            }

            if skipped {
                let existing_resource_id: Option<String> = conn
                    .query_row(
                        "SELECT resource_id FROM local_files WHERE id = ?1",
                        params![local_file_id],
                        |row| row.get::<_, Option<String>>(0),
                    )
                    .optional()
                    .map_err(|error| error.to_string())?
                    .flatten();
                let next_status = if existing_resource_id
                    .as_deref()
                    .is_some_and(|value| !value.trim().is_empty())
                {
                    "SYNCED"
                } else {
                    "LOCAL_ONLY"
                };
                conn.execute(
                    "UPDATE local_files SET sync_status = ?2, updated_at = ?3 WHERE id = ?1",
                    params![local_file_id, next_status, now],
                )
                .map_err(|error| error.to_string())?;
            } else {
                synced_count += 1;
                conn.execute(
                    "UPDATE local_files SET resource_id = COALESCE(?2, resource_id), sync_status = 'SYNCED', updated_at = ?3 \
                     WHERE id = ?1",
                    params![local_file_id, result.resource_id, now],
                )
                .map_err(|error| error.to_string())?;
            }
        } else if !skipped {
            synced_count += 1;
        }
    }

    Ok(LocalFileEventsMarkSyncedResult {
        completed_at: ms_to_iso(now),
        failed_count,
        synced_count,
    })
}

/// Stage a small set of already-synced personal files whose key-sentence
/// analysis has not been sent yet.
#[tauri::command]
pub fn stage_local_file_analysis_backfill(
    state: State<'_, Db>,
    input: Option<LocalFileAnalysisBackfillStageInput>,
) -> Result<LocalFileAnalysisBackfillStageResult, String> {
    let limit = input
        .as_ref()
        .and_then(|value| value.limit)
        .unwrap_or(3)
        .clamp(1, 20);
    let max_attempts = input
        .and_then(|value| value.max_attempts)
        .unwrap_or(DEFAULT_ANALYSIS_BACKFILL_MAX_ATTEMPTS)
        .clamp(1, 10);
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    stage_local_file_analysis_backfill_for_conn(&conn, limit, max_attempts)
}

fn stage_local_file_analysis_backfill_for_conn(
    conn: &Connection,
    limit: i64,
    max_attempts: i64,
) -> Result<LocalFileAnalysisBackfillStageResult, String> {
    let now = now_ms();
    let mut candidates = Vec::new();
    let mut stmt = conn
        .prepare(
            "SELECT f.id, f.file_name, f.local_path, f.resource_id, f.checksum, \
                    COALESCE(a.attempt_count, 0) \
             FROM local_files f \
             INNER JOIN managed_folders m ON m.id = f.local_folder_id \
             LEFT JOIN local_file_analysis_requests a \
               ON a.local_file_id = f.id \
              AND a.resource_id = f.resource_id \
              AND COALESCE(a.checksum, '') = COALESCE(f.checksum, '') \
             WHERE f.resource_id IS NOT NULL \
               AND f.sync_status = 'SYNCED' \
               AND m.status = 'ACTIVE' \
               AND m.sync_enabled = 1 \
               AND (a.id IS NULL OR (a.status = 'FAILED' AND a.attempt_count < ?1)) \
             ORDER BY COALESCE(a.updated_at, 0) ASC, f.updated_at DESC \
             LIMIT ?2",
        )
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map(params![max_attempts, limit * 4], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })
        .map_err(|error| error.to_string())?;

    for row in rows {
        let (local_file_id, file_name, local_path, resource_id, checksum, attempt_count) =
            row.map_err(|error| error.to_string())?;
        let path = PathBuf::from(&local_path);
        if !is_supported_text_file(&path) || !path.exists() {
            continue;
        }

        stage_local_file_analysis_request(
            conn,
            &local_file_id,
            &resource_id,
            checksum.as_deref(),
            now,
        )?;
        candidates.push(LocalFileAnalysisBackfillCandidate {
            attempt_count: attempt_count + 1,
            checksum,
            file_name,
            local_file_id,
            mime_type: guess_mime_type(&path.to_string_lossy()),
            resource_id,
        });
        if candidates.len() as i64 >= limit {
            break;
        }
    }

    Ok(LocalFileAnalysisBackfillStageResult {
        candidates,
        staged_at: ms_to_iso(now),
    })
}

fn stage_local_file_analysis_request(
    conn: &Connection,
    local_file_id: &str,
    resource_id: &str,
    checksum: Option<&str>,
    now: i64,
) -> Result<(), String> {
    let id = local_file_analysis_request_id(local_file_id, resource_id, checksum);
    conn.execute(
        "INSERT INTO local_file_analysis_requests \
         (id, local_file_id, resource_id, checksum, status, attempt_count, error_message, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, 'PENDING', 1, NULL, ?5, ?5) \
         ON CONFLICT(local_file_id, resource_id, checksum) DO UPDATE SET \
            status = 'PENDING', \
            attempt_count = local_file_analysis_requests.attempt_count + 1, \
            error_message = NULL, \
            updated_at = excluded.updated_at",
        params![id, local_file_id, resource_id, checksum, now],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

/// Mark local analysis transmission results after the frontend posts extracted
/// key sentences to /api/local-file-analyses.
#[tauri::command]
pub fn mark_local_file_analyses_sent(
    state: State<'_, Db>,
    input: LocalFileAnalysesMarkInput,
) -> Result<LocalFileAnalysesMarkResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    mark_local_file_analyses_sent_for_conn(&conn, input)
}

fn mark_local_file_analyses_sent_for_conn(
    conn: &Connection,
    input: LocalFileAnalysesMarkInput,
) -> Result<LocalFileAnalysesMarkResult, String> {
    let now = now_ms();
    let mut synced_count = 0;
    let mut failed_count = 0;

    for result in input.results {
        let synced = result.status.eq_ignore_ascii_case("SYNCED");
        let status = if synced { "SYNCED" } else { "FAILED" };
        if synced {
            synced_count += 1;
        } else {
            failed_count += 1;
        }

        let id = local_file_analysis_request_id(
            &result.local_file_id,
            &result.resource_id,
            result.checksum.as_deref(),
        );
        conn.execute(
            "INSERT INTO local_file_analysis_requests \
             (id, local_file_id, resource_id, checksum, status, attempt_count, error_message, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?7) \
             ON CONFLICT(local_file_id, resource_id, checksum) DO UPDATE SET \
                status = excluded.status, \
                error_message = excluded.error_message, \
                updated_at = excluded.updated_at",
            params![
                id,
                result.local_file_id,
                result.resource_id,
                result.checksum,
                status,
                result.error_message,
                now
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(LocalFileAnalysesMarkResult {
        completed_at: ms_to_iso(now),
        failed_count,
        synced_count,
    })
}

fn local_file_analysis_request_id(
    local_file_id: &str,
    resource_id: &str,
    checksum: Option<&str>,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(local_file_id.as_bytes());
    hasher.update(b":");
    hasher.update(resource_id.as_bytes());
    hasher.update(b":");
    hasher.update(checksum.unwrap_or("").as_bytes());
    format!("{:x}", hasher.finalize())
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
        if name.starts_with('.') || name == "node_modules" || is_temporary_office_file_name(&name) {
            continue;
        }
        let file_type = entry.file_type()?;
        let path = entry.path();
        if file_type.is_dir() {
            collect_files(&path, out)?;
        } else if file_type.is_file() && !should_skip_managed_file(&path) {
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
            CREATE TABLE local_file_analysis_requests (
                id TEXT PRIMARY KEY,
                local_file_id TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                checksum TEXT,
                status TEXT NOT NULL DEFAULT 'PENDING',
                attempt_count INTEGER NOT NULL DEFAULT 0,
                error_message TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                UNIQUE(local_file_id, resource_id, checksum)
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

    fn minimal_docx_bytes(document_text: &str) -> Vec<u8> {
        let escaped = document_text
            .replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;");
        let document_xml = format!(
            r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{escaped}</w:t></w:r></w:p></w:body></w:document>"#
        );
        let name = b"word/document.xml";
        let data = document_xml.as_bytes();
        let mut bytes = Vec::new();

        let local_header_offset = bytes.len() as u32;
        push_u32(&mut bytes, 0x0403_4b50);
        push_u16(&mut bytes, 20);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 0);
        push_u32(&mut bytes, 0);
        push_u32(&mut bytes, data.len() as u32);
        push_u32(&mut bytes, data.len() as u32);
        push_u16(&mut bytes, name.len() as u16);
        push_u16(&mut bytes, 0);
        bytes.extend_from_slice(name);
        bytes.extend_from_slice(data);

        let central_directory_offset = bytes.len() as u32;
        push_u32(&mut bytes, 0x0201_4b50);
        push_u16(&mut bytes, 20);
        push_u16(&mut bytes, 20);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 0);
        push_u32(&mut bytes, 0);
        push_u32(&mut bytes, data.len() as u32);
        push_u32(&mut bytes, data.len() as u32);
        push_u16(&mut bytes, name.len() as u16);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 0);
        push_u32(&mut bytes, 0);
        push_u32(&mut bytes, local_header_offset);
        bytes.extend_from_slice(name);

        let central_directory_size = bytes.len() as u32 - central_directory_offset;
        push_u32(&mut bytes, 0x0605_4b50);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 0);
        push_u16(&mut bytes, 1);
        push_u16(&mut bytes, 1);
        push_u32(&mut bytes, central_directory_size);
        push_u32(&mut bytes, central_directory_offset);
        push_u16(&mut bytes, 0);

        bytes
    }

    fn minimal_pdf_bytes(document_text: &str) -> Vec<u8> {
        let escaped = document_text
            .replace('\\', "\\\\")
            .replace('(', "\\(")
            .replace(')', "\\)");
        format!(
            "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n\
             2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n\
             3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n\
             4 0 obj << /Length {} >> stream\nBT /F1 12 Tf 72 720 Td ({}) Tj ET\nendstream\nendobj\n\
             trailer << /Root 1 0 R >>\n%%EOF",
            escaped.len() + 32,
            escaped
        )
        .into_bytes()
    }

    fn push_u16(bytes: &mut Vec<u8>, value: u16) {
        bytes.extend_from_slice(&value.to_le_bytes());
    }

    fn push_u32(bytes: &mut Vec<u8>, value: u32) {
        bytes.extend_from_slice(&value.to_le_bytes());
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
    fn file_name_search_falls_back_when_fts_has_no_match() {
        let conn = test_connection();
        conn.execute(
            "INSERT INTO local_files (id, local_folder_id, file_name, local_path, updated_at) \
             VALUES ('file-ui', 'folder-1', 'UI_contract_notes.bin', '/tmp/UI_contract_notes.bin', 1)",
            [],
        )
        .expect("insert local file row");
        conn.execute(
            "INSERT INTO local_file_fts (local_file_id, file_name, content, local_path) \
             VALUES ('file-ui', 'unrelated.bin', 'no matching content', '/tmp/unrelated.bin')",
            [],
        )
        .expect("insert unrelated fts row");

        let result = search_local_files_for_conn(
            &conn,
            LocalFileSearchInput {
                limit: Some(10),
                query: "UI".to_string(),
            },
        )
        .expect("search local files");

        assert_eq!(result.items.len(), 1);
        assert_eq!(result.items[0].local_file_id, "file-ui");
        assert_eq!(result.items[0].name, "UI_contract_notes.bin");
        assert!(result.items[0].matched_text.is_none());
    }

    #[test]
    fn short_file_name_search_does_not_match_user_home_path() {
        let conn = test_connection();
        conn.execute(
            "INSERT INTO local_files (id, local_folder_id, file_name, local_path, updated_at) \
             VALUES ('file-contract', 'folder-1', 'contract_notes.bin', '/Users/miyeon/contracts/contract_notes.bin', 1)",
            [],
        )
        .expect("insert local file row");
        conn.execute(
            "INSERT INTO local_file_fts (local_file_id, file_name, content, local_path) \
             VALUES ('file-contract', 'contract_notes.bin', 'no matching content', '/Users/miyeon/contracts/contract_notes.bin')",
            [],
        )
        .expect("insert fts row");

        let result = search_local_files_for_conn(
            &conn,
            LocalFileSearchInput {
                limit: Some(10),
                query: "U".to_string(),
            },
        )
        .expect("search local files");

        assert!(result.items.is_empty());

        let path_result = search_local_files_for_conn(
            &conn,
            LocalFileSearchInput {
                limit: Some(10),
                query: "/Users".to_string(),
            },
        )
        .expect("search path-like query");

        assert_eq!(path_result.items.len(), 1);
        assert_eq!(path_result.items[0].local_file_id, "file-contract");
    }

    #[test]
    fn sync_stage_includes_updated_file_events() {
        assert!(SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL.contains("'CREATED'"));
        assert!(SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL.contains("'UPDATED'"));
        assert!(SYNCABLE_LOCAL_FILE_EVENT_TYPES_SQL.contains("'DELETED'"));
    }

    #[test]
    fn managed_folder_scan_ignores_office_lock_but_indexes_unsupported_files() {
        let conn = test_connection();
        let folder_path =
            std::env::temp_dir().join(format!("bubli-managed-ignore-test-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&folder_path).expect("create temp folder");
        let supported_path = folder_path.join("contract.md");
        let office_lock_path = folder_path.join("~$contract.docx");
        let unsupported_path = folder_path.join("draft.pages");
        std::fs::write(&supported_path, "계약 기간과 지급 조건을 확인합니다.")
            .expect("write supported file");
        std::fs::write(&office_lock_path, "temporary lock").expect("write office lock file");
        std::fs::write(&unsupported_path, "unsupported pages").expect("write unsupported file");

        conn.execute(
            "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
             VALUES ('folder-1', 'Docs', ?1, 'ACTIVE', 1, 1, 1)",
            params![folder_path.to_string_lossy().to_string()],
        )
        .expect("insert managed folder");

        let result = scan_managed_folder_for_conn(
            &conn,
            ManagedFolderCommandInput {
                local_folder_id: "folder-1".to_string(),
            },
        )
        .expect("scan managed folder");

        let indexed_names: Vec<String> = {
            let mut stmt = conn
                .prepare("SELECT file_name FROM local_files ORDER BY file_name")
                .expect("prepare local files query");
            stmt.query_map([], |row| row.get::<_, String>(0))
                .expect("query local files")
                .collect::<Result<Vec<_>, _>>()
                .expect("collect local files")
        };

        assert_eq!(result.changed_count, 2);
        assert_eq!(
            indexed_names,
            vec!["contract.md".to_string(), "draft.pages".to_string()]
        );

        let _ = std::fs::remove_dir_all(folder_path);
    }

    #[test]
    fn managed_folder_scan_records_delete_for_previously_indexed_unsupported_file() {
        let conn = test_connection();
        let folder_path =
            std::env::temp_dir().join(format!("bubli-managed-delete-test-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&folder_path).expect("create temp folder");

        conn.execute(
            "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
             VALUES ('folder-1', 'Docs', ?1, 'ACTIVE', 1, 1, 1)",
            params![folder_path.to_string_lossy().to_string()],
        )
        .expect("insert managed folder");
        conn.execute(
            "INSERT INTO local_files (id, local_folder_id, file_name, local_path, sync_status, updated_at) \
             VALUES ('file-pages', 'folder-1', 'draft.pages', ?1, 'SYNCED', 1)",
            params![folder_path.join("draft.pages").to_string_lossy().to_string()],
        )
        .expect("insert stale pages file");

        let result = scan_managed_folder_for_conn(
            &conn,
            ManagedFolderCommandInput {
                local_folder_id: "folder-1".to_string(),
            },
        )
        .expect("scan managed folder");

        let delete_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM local_file_events WHERE local_file_id = 'file-pages' AND event_type = 'DELETED'",
                [],
                |row| row.get(0),
            )
            .expect("read delete events");

        assert_eq!(result.changed_count, 1);
        assert_eq!(delete_count, 1);

        let _ = std::fs::remove_dir_all(folder_path);
    }

    #[test]
    fn lists_managed_folders_for_settings_restore() {
        let conn = test_connection();
        conn.execute(
            "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
             VALUES ('folder-old', 'Old Docs', '/tmp/old-docs', 'ACTIVE', 0, 10, 20), \
                    ('folder-new', 'New Docs', '/tmp/new-docs', 'ACTIVE', 1, 30, 50), \
                    ('folder-paused', 'Paused Docs', '/tmp/paused-docs', 'PAUSED', 1, 25, 40), \
                    ('folder-removed', 'Removed Docs', '/tmp/removed-docs', 'REMOVED', 1, 35, 60)",
            [],
        )
        .expect("insert managed folders");

        let result = list_managed_folders_for_conn(&conn, 70).expect("list managed folders");

        assert_eq!(result.loaded_at, ms_to_iso(70));
        assert_eq!(
            result
                .folders
                .iter()
                .map(|folder| folder.local_folder_id.as_str())
                .collect::<Vec<_>>(),
            vec!["folder-new", "folder-paused", "folder-old"]
        );
        assert!(result.folders[0].sync_enabled);
        assert!(!result.folders[2].sync_enabled);
        assert!(result
            .folders
            .iter()
            .all(|folder| folder.status != "REMOVED"));
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
    fn skipped_updated_sync_keeps_file_local_only() {
        let conn = test_connection();
        conn.execute(
            "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
             VALUES ('folder-1', 'Docs', '/tmp/docs', 'ACTIVE', 1, 1, 1)",
            [],
        )
        .expect("insert managed folder");
        conn.execute(
            "INSERT INTO local_files \
             (id, local_folder_id, file_name, local_path, sync_status, updated_at) \
             VALUES ('file-1', 'folder-1', 'draft.md', '/tmp/docs/draft.md', 'SYNC_PENDING', 1)",
            [],
        )
        .expect("insert pending local file");
        conn.execute(
            "INSERT INTO local_file_events \
             (id, local_file_id, local_folder_id, event_type, file_name, local_path, status, created_at) \
             VALUES ('event-1', 'file-1', 'folder-1', 'UPDATED', 'draft.md', '/tmp/docs/draft.md', 'APPROVED', 1)",
            [],
        )
        .expect("insert approved update event");

        let result = mark_local_file_events_synced_for_conn(
            &conn,
            LocalFileEventsMarkSyncedInput {
                results: vec![LocalFileEventSyncResultInput {
                    local_event_id: "event-1".to_string(),
                    resource_id: None,
                    status: "SKIPPED".to_string(),
                }],
            },
            20,
        )
        .expect("mark skipped update");
        let stored: (String, String) = conn
            .query_row(
                "SELECT f.sync_status, e.status \
                 FROM local_files f \
                 INNER JOIN local_file_events e ON e.local_file_id = f.id \
                 WHERE f.id = 'file-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("read stored statuses");

        assert_eq!(result.synced_count, 0);
        assert_eq!(result.failed_count, 0);
        assert_eq!(stored, ("LOCAL_ONLY".to_string(), "SYNCED".to_string()));
    }

    #[test]
    fn remove_managed_folder_excludes_future_sync_stage() {
        let conn = test_connection();
        conn.execute(
            "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
             VALUES ('folder-1', 'Docs', '/tmp/docs', 'ACTIVE', 1, 1, 1)",
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

        let result =
            remove_managed_folder_for_conn(&conn, "folder-1", 20).expect("remove managed folder");
        let stored: (String, i64) = conn
            .query_row(
                "SELECT status, sync_enabled FROM managed_folders WHERE id = 'folder-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("read removed folder");
        let stageable_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) \
                 FROM local_file_events e \
                 INNER JOIN managed_folders m ON m.id = e.local_folder_id \
                 WHERE e.status IN ('PENDING', 'APPROVED', 'FAILED') \
                   AND e.event_type = 'CREATED' \
                   AND m.status = 'ACTIVE' \
                   AND m.sync_enabled = 1",
                [],
                |row| row.get(0),
            )
            .expect("count stageable events");

        assert_eq!(result.status, "REMOVED");
        assert_eq!(result.removed_at, ms_to_iso(20));
        assert_eq!(stored, ("REMOVED".to_string(), 0));
        assert_eq!(stageable_count, 0);
    }

    #[test]
    fn skipped_delete_result_keeps_local_file_for_retry() {
        let conn = test_connection();
        conn.execute(
            "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
             VALUES ('folder-1', 'Docs', '/tmp/docs', 'ACTIVE', 1, 1, 1)",
            [],
        )
        .expect("insert managed folder");
        conn.execute(
            "INSERT INTO local_files \
             (id, local_folder_id, file_name, local_path, resource_id, sync_status, updated_at) \
             VALUES ('file-1', 'folder-1', '~$contract.docx', '/tmp/docs/~$contract.docx', NULL, 'SYNC_PENDING', 1)",
            [],
        )
        .expect("insert local file");
        conn.execute(
            "INSERT INTO local_file_events \
             (id, local_file_id, local_folder_id, event_type, file_name, local_path, status, created_at) \
             VALUES ('event-1', 'file-1', 'folder-1', 'DELETED', '~$contract.docx', '/tmp/docs/~$contract.docx', 'APPROVED', 1)",
            [],
        )
        .expect("insert delete event");

        let result = mark_local_file_events_synced_for_conn(
            &conn,
            LocalFileEventsMarkSyncedInput {
                results: vec![LocalFileEventSyncResultInput {
                    local_event_id: "event-1".to_string(),
                    resource_id: None,
                    status: "SKIPPED".to_string(),
                }],
            },
            20,
        )
        .expect("mark skipped delete");

        let local_file_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM local_files WHERE id = 'file-1'",
                [],
                |row| row.get(0),
            )
            .expect("read local file count");
        let event_status: String = conn
            .query_row(
                "SELECT status FROM local_file_events WHERE id = 'event-1'",
                [],
                |row| row.get(0),
            )
            .expect("read event status");
        let file_sync_status: String = conn
            .query_row(
                "SELECT sync_status FROM local_files WHERE id = 'file-1'",
                [],
                |row| row.get(0),
            )
            .expect("read file sync status");

        assert_eq!(result.synced_count, 0);
        assert_eq!(result.failed_count, 1);
        assert_eq!(local_file_count, 1);
        assert_eq!(event_status, "FAILED");
        assert_eq!(file_sync_status, "FAILED");
    }

    #[test]
    fn analysis_backfill_stages_synced_analyzable_file_once() {
        let conn = test_connection();
        let folder_path =
            std::env::temp_dir().join(format!("bubli-analysis-backfill-test-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&folder_path).expect("create temp folder");
        let file_path = folder_path.join("contract.md");
        std::fs::write(&file_path, "계약 범위와 지급 조건을 확인합니다.").expect("write file");

        conn.execute(
            "INSERT INTO managed_folders (id, name, path, status, sync_enabled, created_at, updated_at) \
             VALUES ('folder-1', 'Docs', ?1, 'ACTIVE', 1, 1, 1)",
            params![folder_path.to_string_lossy().to_string()],
        )
        .expect("insert managed folder");
        conn.execute(
            "INSERT INTO local_files \
             (id, local_folder_id, file_name, local_path, resource_id, checksum, sync_status, updated_at) \
             VALUES ('file-1', 'folder-1', 'contract.md', ?1, 'resource-1', 'checksum-1', 'SYNCED', 1)",
            params![file_path.to_string_lossy().to_string()],
        )
        .expect("insert synced file");

        let staged =
            stage_local_file_analysis_backfill_for_conn(&conn, 3, 3).expect("stage backfill");

        assert_eq!(staged.candidates.len(), 1);
        assert_eq!(staged.candidates[0].local_file_id, "file-1");
        assert_eq!(staged.candidates[0].resource_id, "resource-1");
        assert_eq!(staged.candidates[0].attempt_count, 1);

        mark_local_file_analyses_sent_for_conn(
            &conn,
            LocalFileAnalysesMarkInput {
                results: vec![LocalFileAnalysisMarkInput {
                    checksum: Some("checksum-1".to_string()),
                    error_message: None,
                    local_file_id: "file-1".to_string(),
                    resource_id: "resource-1".to_string(),
                    status: "SYNCED".to_string(),
                }],
            },
        )
        .expect("mark analysis sent");

        let restaged =
            stage_local_file_analysis_backfill_for_conn(&conn, 3, 3).expect("restage backfill");

        assert!(restaged.candidates.is_empty());

        let _ = std::fs::remove_dir_all(folder_path);
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
    fn skipped_local_file_sync_does_not_mark_unsynced_files_as_synced() {
        let conn = test_connection();
        conn.execute(
            "INSERT INTO local_files \
             (id, local_folder_id, file_name, local_path, resource_id, size_bytes, checksum, sync_status, modified_at, updated_at) \
             VALUES \
             ('file-local-only', 'folder-1', 'draft.md', '/tmp/draft.md', NULL, 10, NULL, 'SYNC_PENDING', 1, 1), \
             ('file-with-resource', 'folder-1', 'brief.md', '/tmp/brief.md', 'resource-1', 10, NULL, 'SYNC_PENDING', 1, 1)",
            [],
        )
        .expect("insert local files");
        conn.execute(
            "INSERT INTO local_file_events \
             (id, local_file_id, local_folder_id, event_type, file_name, local_path, status, created_at) \
             VALUES \
             ('event-local-only', 'file-local-only', 'folder-1', 'UPDATED', 'draft.md', '/tmp/draft.md', 'APPROVED', 1), \
             ('event-with-resource', 'file-with-resource', 'folder-1', 'UPDATED', 'brief.md', '/tmp/brief.md', 'APPROVED', 1)",
            [],
        )
        .expect("insert local file events");

        let result = mark_local_file_events_synced_for_conn(
            &conn,
            LocalFileEventsMarkSyncedInput {
                results: vec![
                    LocalFileEventSyncResultInput {
                        local_event_id: "event-local-only".to_string(),
                        resource_id: None,
                        status: "SKIPPED".to_string(),
                    },
                    LocalFileEventSyncResultInput {
                        local_event_id: "event-with-resource".to_string(),
                        resource_id: Some("resource-1".to_string()),
                        status: "SKIPPED".to_string(),
                    },
                ],
            },
            20,
        )
        .expect("mark skipped sync results");

        let local_only_status: String = conn
            .query_row(
                "SELECT sync_status FROM local_files WHERE id = 'file-local-only'",
                [],
                |row| row.get(0),
            )
            .expect("read local-only sync status");
        let resource_status: String = conn
            .query_row(
                "SELECT sync_status FROM local_files WHERE id = 'file-with-resource'",
                [],
                |row| row.get(0),
            )
            .expect("read resource sync status");
        let synced_event_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM local_file_events WHERE status = 'SYNCED'",
                [],
                |row| row.get(0),
            )
            .expect("read synced event count");

        assert_eq!(result.synced_count, 0);
        assert_eq!(result.failed_count, 0);
        assert_eq!(local_only_status, "LOCAL_ONLY");
        assert_eq!(resource_status, "SYNCED");
        assert_eq!(synced_event_count, 2);
    }

    #[test]
    fn sync_outbox_summary_reports_pending_failed_and_sent_counts() {
        let conn = test_connection();
        conn.execute(
            "INSERT INTO local_sync_outbox \
             (id, idempotency_key, operation, payload_json, status, retry_count, created_at, updated_at) \
             VALUES \
             ('outbox-1', 'key-1', 'local_file_event', '{}', 'PENDING', 0, 1, 1), \
             ('outbox-2', 'key-2', 'local_file_event', '{}', 'PENDING', 0, 1, 1), \
             ('outbox-3', 'key-3', 'local_file_event', '{}', 'FAILED', 1, 1, 1), \
             ('outbox-4', 'key-4', 'local_file_event', '{}', 'SENT', 0, 1, 1)",
            [],
        )
        .expect("insert outbox rows");

        let summary = sync_outbox_summary_for_conn(&conn).expect("read outbox summary");

        assert_eq!(summary.pending_count, 2);
        assert_eq!(summary.failed_count, 1);
        assert_eq!(summary.sent_count, 1);
    }

    #[test]
    fn extracts_korean_contract_key_sentences_without_llm() {
        let text =
            "프리랜서는 프로젝트 요구사항 명세서에 따라 로그인, 결제, 관리자 기능을 구현한다. \
            단순 인사말과 배경 설명은 계약 범위에 포함하지 않는다. \
            납기일은 2026년 8월 31일이며, 검수 승인 후 잔금을 지급한다. \
            추가 수정 요청은 최초 범위에 포함된 오류 수정에 한해 무상으로 처리한다.";

        let sentences = extract_key_sentences(text, 2, 180);
        let combined = sentences
            .iter()
            .map(|sentence| sentence.text.as_str())
            .collect::<Vec<_>>()
            .join(" ");

        assert_eq!(sentences.len(), 2);
        assert!(combined.contains("납기일") || combined.contains("요구사항"));
        assert!(combined.contains("검수") || combined.contains("범위"));
    }

    #[test]
    fn reads_docx_text_for_preview_and_key_sentence_extraction() {
        let path =
            std::env::temp_dir().join(format!("bubli-local-docx-test-{}.docx", Uuid::new_v4()));
        std::fs::write(
            &path,
            minimal_docx_bytes(
                "총 보수 7,500,000원은 요구사항 확정 후 착수금, 스테이징 검수 통과 후 중도금, 최종 배포 문서 납품 후 잔금으로 지급한다.",
            ),
        )
        .expect("write temp docx");

        let (preview, status, truncated) =
            read_local_text_preview(&path, 500).expect("read docx preview");
        let text = read_local_text_for_key_sentences(&path)
            .expect("read docx text")
            .0
            .expect("docx text");
        let sentences = extract_key_sentences(&text, 3, 300);

        assert_eq!(status, "READY");
        assert!(!truncated);
        assert!(preview.unwrap().contains("총 보수"));
        assert!(sentences
            .iter()
            .any(|sentence| sentence.text.contains("스테이징 검수")));

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn reads_pdf_text_for_preview_and_key_sentence_extraction() {
        let path =
            std::env::temp_dir().join(format!("bubli-local-pdf-test-{}.pdf", Uuid::new_v4()));
        std::fs::write(
            &path,
            minimal_pdf_bytes(
                "계약기간은 2026년 7월 1일부터 2026년 8월 15일까지이며 검수 승인 후 잔금을 지급한다.",
            ),
        )
        .expect("write temp pdf");

        let (preview, status, truncated) =
            read_local_text_preview(&path, 500).expect("read pdf preview");
        let text = read_local_text_for_key_sentences(&path)
            .expect("read pdf text")
            .0
            .expect("pdf text");
        let sentences = extract_key_sentences(&text, 3, 300);

        assert_eq!(status, "READY");
        assert!(!truncated);
        assert!(preview.unwrap().contains("계약기간"));
        assert!(sentences
            .iter()
            .any(|sentence| sentence.text.contains("잔금")));

        let _ = std::fs::remove_file(path);
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
