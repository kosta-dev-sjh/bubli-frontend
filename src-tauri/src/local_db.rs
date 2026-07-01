//! Local SQLite layer for the Bubli desktop app.
//!
//! This is the on-device store described in 09C_DB-Tauri-SQLite. It is NOT the
//! server database: it only holds user-selected folder index, widget usage
//! detail/rollups, an activity-context buffer, and a sync outbox. Server-owned
//! data (chat, todo, schedule, resources) stays on the API server.
//!
//! Boundary rules honored here:
//! - A personal managed folder never carries a roomId. Local files are personal
//!   only; sharing to a project room is a separate, explicit upload flow.
//! - This module never calls the API server or the agent server. It stages
//!   work into `local_sync_outbox`; the authenticated frontend client performs
//!   the actual transmission.

use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

/// Managed Tauri state: a single SQLite connection guarded by a mutex.
pub struct Db(pub Mutex<Connection>);

/// Epoch milliseconds, used for `*_at` INTEGER columns (09C allows epoch INTEGER).
pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// ISO-8601 UTC timestamp, used for camelCase string fields returned to the UI.
pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// Convert stored epoch milliseconds back to an ISO-8601 string for the UI.
pub fn ms_to_iso(ms: i64) -> String {
    chrono::DateTime::from_timestamp_millis(ms)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_default()
}

/// Open the on-device database under the app data dir and run migrations.
pub fn open_and_migrate(app: &AppHandle) -> Result<Connection, String> {
    let db_path = database_path(app)?;
    if let Some(dir) = db_path.parent() {
        std::fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    }

    let conn = Connection::open(db_path).map_err(|error| error.to_string())?;
    configure_connection(&conn);
    conn.execute_batch(SCHEMA_SQL)
        .map_err(|error| error.to_string())?;
    Ok(conn)
}

/// Resolve the canonical on-device SQLite path so background workers can open
/// their own short-lived connection without borrowing Tauri state.
pub fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("app_data_dir resolve failed: {error}"))?;
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join("bubli-local.sqlite3"))
}

/// Apply connection-level pragmas consistently for the main DB and watcher
/// worker connections.
pub fn configure_connection(conn: &Connection) {
    // WAL keeps reads fast while the widget writes usage events frequently.
    let _ = conn.pragma_update(None, "journal_mode", "WAL");
    let _ = conn.pragma_update(None, "foreign_keys", "ON");
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SqliteIntegrityResult {
    checked_at: String,
    ok: bool,
    recovery_required: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalBackupResult {
    backup_id: String,
    created_at: String,
    file_name: String,
    size_bytes: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalBackupRestoreInput {
    backup_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalBackupRestoreResult {
    backup_id: String,
    restored_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalRoomMessageSyncInput {
    after_sequence: Option<i64>,
    room_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalRoomMessageSyncResult {
    cached_count: i64,
    latest_sequence: i64,
    room_id: String,
    synced_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerRecoveryState {
    local_time_log_id: Option<String>,
    recovery_required: bool,
    server_time_log_id: Option<String>,
    status: String,
}

#[tauri::command]
pub fn check_local_sqlite_integrity(
    state: tauri::State<'_, Db>,
) -> Result<SqliteIntegrityResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let quick_check: String = conn
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    let ok = quick_check == "ok";

    Ok(SqliteIntegrityResult {
        checked_at: now_iso(),
        ok,
        recovery_required: !ok,
    })
}

#[tauri::command]
pub fn backup_local_sqlite(
    app: AppHandle,
    state: tauri::State<'_, Db>,
) -> Result<LocalBackupResult, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("app_data_dir resolve failed: {error}"))?;
    let backup_dir = app_data_dir.join("backups");
    std::fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;

    let backup_id = Uuid::new_v4().to_string();
    let file_name = format!("bubli-local-{backup_id}.sqlite3");
    let backup_path = backup_dir.join(&file_name);
    let backup_path_sql = backup_path.to_string_lossy().replace('\'', "''");

    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    conn.execute_batch(&format!("VACUUM main INTO '{backup_path_sql}'"))
        .map_err(|error| error.to_string())?;

    let size_bytes = std::fs::metadata(&backup_path)
        .map_err(|error| error.to_string())?
        .len();
    let created_at = now_iso();
    conn.execute(
        "INSERT INTO local_backup_manifest (id, file_name, path, size_bytes, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            backup_id,
            file_name,
            backup_path.to_string_lossy(),
            size_bytes as i64,
            created_at
        ],
    )
    .map_err(|error| error.to_string())?;

    Ok(LocalBackupResult {
        backup_id,
        created_at,
        file_name,
        size_bytes,
    })
}

#[tauri::command]
pub fn restore_local_sqlite_backup(
    _state: tauri::State<'_, Db>,
    input: LocalBackupRestoreInput,
) -> Result<LocalBackupRestoreResult, String> {
    Err(format!(
        "restore requires an app restart before replacing the open SQLite file: {}",
        input.backup_id
    ))
}

#[tauri::command]
pub fn sync_room_messages(
    state: tauri::State<'_, Db>,
    input: LocalRoomMessageSyncInput,
) -> Result<LocalRoomMessageSyncResult, String> {
    let after_sequence = input.after_sequence.unwrap_or(0);
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    conn.execute(
        "INSERT INTO local_room_cache_state (room_id, latest_sequence, state, synced_at) \
         VALUES (?1, ?2, 'STALE', ?3) \
         ON CONFLICT(room_id) DO UPDATE SET \
           latest_sequence = MAX(local_room_cache_state.latest_sequence, excluded.latest_sequence), \
           state = 'STALE', \
           synced_at = excluded.synced_at",
        params![input.room_id, after_sequence, now_ms()],
    )
    .map_err(|error| error.to_string())?;

    let cached_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM local_room_message_cache WHERE room_id = ?1 AND room_sequence > ?2",
            params![input.room_id, after_sequence],
            |row| row.get(0),
        )
        .unwrap_or(0);
    let latest_sequence: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(room_sequence), ?2) FROM local_room_message_cache WHERE room_id = ?1",
            params![input.room_id, after_sequence],
            |row| row.get(0),
        )
        .unwrap_or(after_sequence);

    Ok(LocalRoomMessageSyncResult {
        cached_count,
        latest_sequence,
        room_id: input.room_id,
        synced_at: now_iso(),
    })
}

#[tauri::command]
pub fn recover_timer_state(state: tauri::State<'_, Db>) -> Result<TimerRecoveryState, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let row: Option<(String, Option<String>, String)> = conn
        .query_row(
            "SELECT id, server_time_log_id, status FROM local_timer_state \
             WHERE status IN ('RUNNING', 'RECOVERY_NEEDED') \
             ORDER BY updated_at DESC LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    match row {
        Some((local_time_log_id, server_time_log_id, status)) => Ok(TimerRecoveryState {
            local_time_log_id: Some(local_time_log_id),
            recovery_required: true,
            server_time_log_id,
            status: if status == "RUNNING" {
                "RECOVERY_NEEDED".to_string()
            } else {
                status
            },
        }),
        None => Ok(TimerRecoveryState {
            local_time_log_id: None,
            recovery_required: false,
            server_time_log_id: None,
            status: "NONE".to_string(),
        }),
    }
}

const SCHEMA_SQL: &str = r#"
-- Personal managed folders (user-selected). Personal-only: no room_id column.
CREATE TABLE IF NOT EXISTS managed_folders (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    path          TEXT NOT NULL UNIQUE,
    status        TEXT NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | PAUSED | REMOVED
    sync_enabled  INTEGER NOT NULL DEFAULT 0,       -- 0/1; only synced folders reach the server
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
);

-- Local file index for a managed folder.
CREATE TABLE IF NOT EXISTS local_files (
    id              TEXT PRIMARY KEY,
    local_folder_id TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    local_path      TEXT NOT NULL,
    resource_id     TEXT,                            -- set only after server reflect
    size_bytes      INTEGER,
    checksum        TEXT,
    sync_status     TEXT NOT NULL DEFAULT 'LOCAL_ONLY', -- LOCAL_ONLY|SYNC_PENDING|SYNCED|CONFLICT
    modified_at     INTEGER,
    updated_at      INTEGER NOT NULL,
    UNIQUE(local_folder_id, local_path)
);
CREATE INDEX IF NOT EXISTS idx_local_files_folder ON local_files(local_folder_id);
CREATE INDEX IF NOT EXISTS idx_local_files_name ON local_files(file_name);

-- File change events detected by scan/watch; PENDING until user approves sync.
CREATE TABLE IF NOT EXISTS local_file_events (
    id              TEXT PRIMARY KEY,
    local_file_id   TEXT,
    local_folder_id TEXT NOT NULL,
    event_type      TEXT NOT NULL,                   -- CREATED|UPDATED|DELETED|MOVED
    file_name       TEXT NOT NULL,
    local_path      TEXT NOT NULL,
    hash            TEXT,
    size_bytes      INTEGER,
    status          TEXT NOT NULL DEFAULT 'PENDING', -- PENDING|APPROVED|REJECTED|SYNCED|FAILED
    reason          TEXT,
    modified_at     INTEGER,
    created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_local_file_events_status ON local_file_events(status);

-- Widget usage detail events (kept local; never sent verbatim to the server).
CREATE TABLE IF NOT EXISTS local_widget_usage_events (
    id          TEXT PRIMARY KEY,
    bubble_type TEXT NOT NULL,
    event_type  TEXT NOT NULL,                       -- OPEN|CLOSE|CLICK|CONFIRM ...
    item_id     TEXT,
    item_type   TEXT,
    occurred_at TEXT NOT NULL,                        -- ISO-8601 from the client
    created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_widget_usage_occurred ON local_widget_usage_events(occurred_at);

-- Per-date, per-bubble rollups; only these (not raw events) reach the server.
CREATE TABLE IF NOT EXISTS local_widget_usage_rollups (
    rollup_key         TEXT PRIMARY KEY,             -- "{summary_date}:{bubble_type}"
    bubble_type        TEXT NOT NULL,
    summary_date       TEXT NOT NULL,                -- YYYY-MM-DD
    source_event_count INTEGER NOT NULL DEFAULT 0,
    sync_status        TEXT NOT NULL DEFAULT 'LOCAL_ONLY', -- LOCAL_ONLY|SYNC_PENDING|SYNCED|FAILED
    updated_at         INTEGER NOT NULL
);

-- Server-reflect queue. Idempotency key prevents double-send after recovery.
CREATE TABLE IF NOT EXISTS local_sync_outbox (
    id              TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    operation       TEXT NOT NULL,                   -- e.g. widget_usage_summary | local_file_event
    payload_json    TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING', -- PENDING|SENDING|SENT|FAILED
    retry_count     INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON local_sync_outbox(status);

-- Recent room message cache. The server remains the source of truth.
CREATE TABLE IF NOT EXISTS local_room_message_cache (
    id                TEXT PRIMARY KEY,
    room_id           TEXT NOT NULL,
    server_message_id TEXT,
    room_sequence     INTEGER NOT NULL,
    body              TEXT,
    cached_at         INTEGER NOT NULL,
    UNIQUE(room_id, room_sequence)
);
CREATE INDEX IF NOT EXISTS idx_room_message_cache_room ON local_room_message_cache(room_id, room_sequence);

CREATE TABLE IF NOT EXISTS local_room_cache_state (
    room_id         TEXT PRIMARY KEY,
    latest_sequence INTEGER NOT NULL DEFAULT 0,
    state           TEXT NOT NULL DEFAULT 'STALE',
    synced_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS local_timer_state (
    id                 TEXT PRIMARY KEY,
    room_id            TEXT,
    server_time_log_id TEXT,
    status             TEXT NOT NULL DEFAULT 'NONE',
    started_at         TEXT,
    updated_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_local_timer_state_status ON local_timer_state(status, updated_at);

CREATE TABLE IF NOT EXISTS local_backup_manifest (
    id         TEXT PRIMARY KEY,
    file_name  TEXT NOT NULL,
    path       TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

-- Activity context focus tracker (single row) to compute dwell time between reads.
CREATE TABLE IF NOT EXISTS local_activity_focus (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    app_name        TEXT NOT NULL,
    window_title    TEXT,
    focus_started_ms INTEGER NOT NULL,
    last_seen_ms    INTEGER NOT NULL
);
"#;
