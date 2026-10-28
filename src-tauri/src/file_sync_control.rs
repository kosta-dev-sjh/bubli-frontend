use rusqlite::{params, Connection, OptionalExtension, Transaction, TransactionBehavior};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::local_db::{now_ms, Db};

const LEASE_MS: i64 = 60_000;

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileSyncContext {
    pub owner_id: String,
    pub epoch: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSyncLease {
    pub context: FileSyncContext,
    pub token: String,
    pub expires_at: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSyncContextInput {
    pub owner_id: String,
}

pub(crate) fn migrate(conn: &Connection) -> Result<(), String> {
    let tx = Transaction::new_unchecked(conn, TransactionBehavior::Immediate).map_err(|e| e.to_string())?;
    tx.execute_batch(
        "CREATE TABLE IF NOT EXISTS local_file_sync_session (
            id INTEGER PRIMARY KEY CHECK(id = 1), owner_id TEXT, epoch TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS local_file_sync_leases (
            owner_id TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at INTEGER NOT NULL);",
    ).map_err(|e| e.to_string())?;
    let has_owner: bool = tx.prepare("PRAGMA table_info(managed_folders)").map_err(|e| e.to_string())?
        .query_map([], |row| row.get::<_, String>(1)).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
        .iter().any(|name| name == "owner_user_id");
    if !has_owner {
        // Old rows have no reliable owner; retain them without assigning the next login.
        tx.execute_batch(
            "CREATE TABLE managed_folders_scoped (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'ACTIVE', sync_enabled INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, owner_user_id TEXT,
                UNIQUE(owner_user_id, path));
             INSERT INTO managed_folders_scoped(id,name,path,status,sync_enabled,created_at,updated_at)
                SELECT id,name,path,status,sync_enabled,created_at,updated_at FROM managed_folders;
             DROP TABLE managed_folders;
             ALTER TABLE managed_folders_scoped RENAME TO managed_folders;",
        ).map_err(|e| e.to_string())?;
    }
    tx.execute_batch("CREATE INDEX IF NOT EXISTS idx_managed_folders_owner ON managed_folders(owner_user_id,status)")
        .map_err(|e| e.to_string())?;
    let initialized: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM local_file_sync_session WHERE id=1)", [], |row| row.get(0)).map_err(|e| e.to_string())?;
    if !initialized {
        let auth_table: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_schema WHERE name='local_auth_session' AND type='table')", [], |row| row.get(0)).map_err(|e| e.to_string())?;
        let session: Option<String> = if auth_table {
            tx.query_row("SELECT session_json FROM local_auth_session WHERE id=1", [], |row| row.get(0)).optional().map_err(|e| e.to_string())?
        } else { None };
        update_auth_context(&tx, session.as_deref())?;
    }
    tx.commit().map_err(|e| e.to_string())
}

pub(crate) fn update_auth_context(conn: &Connection, session: Option<&str>) -> Result<(), String> {
    let owner = session.and_then(|text| serde_json::from_str::<serde_json::Value>(text).ok())
        .and_then(|value| value.get("user")?.get("id")?.as_str().map(str::to_owned))
        .and_then(|id| Uuid::parse_str(&id).ok()).map(|id| id.to_string());
    conn.execute(
        "INSERT INTO local_file_sync_session(id,owner_id,epoch) VALUES(1,?1,?2)
         ON CONFLICT(id) DO UPDATE SET owner_id=excluded.owner_id, epoch=excluded.epoch
         WHERE local_file_sync_session.owner_id IS NOT excluded.owner_id OR excluded.owner_id IS NULL",
        params![owner, Uuid::new_v4().to_string()],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn current_context(conn: &Connection) -> Result<FileSyncContext, String> {
    conn.query_row("SELECT owner_id,epoch FROM local_file_sync_session WHERE id=1 AND owner_id IS NOT NULL", [], |row| {
        Ok(FileSyncContext { owner_id: row.get(0)?, epoch: row.get(1)? })
    }).optional().map_err(|e| e.to_string())?.ok_or_else(|| "File sync requires an authenticated account".into())
}

pub(crate) fn validate_context(conn: &Connection, context: &FileSyncContext) -> Result<(), String> {
    if current_context(conn)? != *context {
        return Err("File sync account changed".into());
    }
    Ok(())
}

pub(crate) fn require_folder_owner(conn: &Connection, folder_id: &str, context: &FileSyncContext) -> Result<(), String> {
    validate_context(conn, context)?;
    let owned: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM managed_folders WHERE id=?1 AND owner_user_id=?2)",
        params![folder_id, context.owner_id], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    if !owned { return Err("Managed folder does not belong to the signed-in account".into()); }
    Ok(())
}

pub(crate) fn require_file_owner(conn: &Connection, file_id: &str, context: &FileSyncContext) -> Result<(), String> {
    let folder: String = conn.query_row("SELECT local_folder_id FROM local_files WHERE id=?1", params![file_id], |row| row.get(0))
        .map_err(|_| "Local file is not available to the signed-in account".to_string())?;
    require_folder_owner(conn, &folder, context)
}

pub(crate) fn claim(conn: &Connection, context: FileSyncContext, now: i64) -> Result<Option<FileSyncLease>, String> {
    let tx = Transaction::new_unchecked(conn, TransactionBehavior::Immediate).map_err(|e| e.to_string())?;
    validate_context(&tx, &context)?;
    let token = Uuid::new_v4().to_string();
    let expires_at = now.checked_add(LEASE_MS).ok_or("Invalid lease time")?;
    let inserted = tx.execute(
        "INSERT INTO local_file_sync_leases(owner_id,token,expires_at) VALUES(?1,?2,?3)
         ON CONFLICT(owner_id) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at
         WHERE local_file_sync_leases.expires_at <= ?4",
        params![context.owner_id, token, expires_at, now],
    ).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok((inserted == 1).then_some(FileSyncLease { context, token, expires_at }))
}

pub(crate) fn validate_lease(conn: &Connection, lease: &FileSyncLease, now: i64) -> Result<(), String> {
    validate_context(conn, &lease.context)?;
    let held: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM local_file_sync_leases WHERE owner_id=?1 AND token=?2 AND expires_at>?3)",
        params![lease.context.owner_id, lease.token, now], |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    if !held { return Err("File sync sender lease expired or was replaced".into()); }
    Ok(())
}

pub(crate) fn renew(conn: &Connection, mut lease: FileSyncLease, now: i64) -> Result<FileSyncLease, String> {
    let tx = Transaction::new_unchecked(conn, TransactionBehavior::Immediate).map_err(|e| e.to_string())?;
    validate_lease(&tx, &lease, now)?;
    lease.expires_at = now.checked_add(LEASE_MS).ok_or("Invalid lease time")?;
    tx.execute("UPDATE local_file_sync_leases SET expires_at=?3 WHERE owner_id=?1 AND token=?2",
        params![lease.context.owner_id, lease.token, lease.expires_at]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(lease)
}

pub(crate) fn release(conn: &Connection, lease: &FileSyncLease) -> Result<(), String> {
    conn.execute("DELETE FROM local_file_sync_leases WHERE owner_id=?1 AND token=?2",
        params![lease.context.owner_id, lease.token]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_local_file_sync_context(state: State<'_, Db>, input: FileSyncContextInput) -> Result<FileSyncContext, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let context = current_context(&conn)?;
    if context.owner_id != input.owner_id { return Err("File sync account changed".into()); }
    Ok(context)
}

#[tauri::command]
pub fn renew_local_file_sync_lease(state: State<'_, Db>, input: FileSyncLease) -> Result<FileSyncLease, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    renew(&conn, input, now_ms())
}

#[tauri::command]
pub fn release_local_file_sync_lease(state: State<'_, Db>, input: FileSyncLease) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    release(&conn, &input)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn account(conn: &Connection, owner: &str) -> FileSyncContext {
        update_auth_context(conn, Some(&serde_json::json!({"user":{"id":owner}}).to_string())).unwrap();
        current_context(conn).unwrap()
    }
    #[test]
    fn account_switch_and_return_invalidates_old_context_but_token_refresh_does_not() {
        let conn = crate::local_db::test_database_with_production_schema(Path::new(":memory:"));
        let a = account(&conn, "10000000-0000-4000-8000-000000000001");
        assert_eq!(account(&conn, &a.owner_id), a);
        let b = account(&conn, "10000000-0000-4000-8000-000000000002");
        assert!(validate_context(&conn, &a).is_err());
        assert_ne!(account(&conn, &a.owner_id).epoch, a.epoch);
        assert!(validate_context(&conn, &b).is_err());
    }
    #[test]
    fn expired_sender_cannot_renew_mark_or_release_the_new_senders_lease() {
        let conn = crate::local_db::test_database_with_production_schema(Path::new(":memory:"));
        let context = account(&conn, "10000000-0000-4000-8000-000000000001");
        let first = claim(&conn, context.clone(), 10).unwrap().unwrap();
        assert!(claim(&conn, context.clone(), 11).unwrap().is_none());
        let next = claim(&conn, context, first.expires_at).unwrap().unwrap();
        assert!(validate_lease(&conn, &first, first.expires_at).is_err());
        assert!(renew(&conn, first.clone(), first.expires_at).is_err());
        release(&conn, &first).unwrap();
        assert!(validate_lease(&conn, &next, first.expires_at).is_ok());
    }
    #[test]
    fn migration_preserves_unowned_old_folders_and_allows_the_same_path_for_two_accounts() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("CREATE TABLE local_auth_session(id INTEGER PRIMARY KEY,session_json TEXT,saved_at INTEGER);
            CREATE TABLE managed_folders(id TEXT PRIMARY KEY,name TEXT NOT NULL,path TEXT NOT NULL UNIQUE,status TEXT NOT NULL,sync_enabled INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
            INSERT INTO managed_folders VALUES('legacy','original','/same','ACTIVE',1,1,1);").unwrap();
        migrate(&conn).unwrap(); migrate(&conn).unwrap();
        let owner: Option<String> = conn.query_row("SELECT owner_user_id FROM managed_folders WHERE id='legacy'", [], |r| r.get(0)).unwrap();
        assert!(owner.is_none());
        conn.execute_batch("INSERT INTO managed_folders VALUES('new-a','a','/same','ACTIVE',1,1,1,'a');
            INSERT INTO managed_folders VALUES('new-b','b','/same','ACTIVE',1,1,1,'b');").unwrap();
        assert_eq!(conn.query_row("SELECT count(*) FROM managed_folders", [], |r| r.get::<_, i64>(0)).unwrap(), 3);
    }
    use std::path::Path;
}
