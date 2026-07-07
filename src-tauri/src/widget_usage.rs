//! BUBLI-41: widget item state is persisted on the server (PATCH
//! /api/widget/items/{id}/state). The local-only part lives here: detailed
//! widget usage events, per-date rollups, and staging those rollups into the
//! sync outbox. Raw events never leave the device; only rollups are reflected
//! to the server (POST /api/widget/usage-summaries per the API spec).

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::State;
use uuid::Uuid;

use crate::local_db::{now_iso, now_ms, Db};

const PENDING_WIDGET_USAGE_ROLLUPS_SQL: &str =
    "SELECT rollup_key, bubble_type, summary_date, source_event_count \
     FROM local_widget_usage_rollups \
     WHERE sync_status IN ('LOCAL_ONLY', 'FAILED', 'SYNC_PENDING')";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageEventInput {
    bubble_type: String,
    event_type: String,
    item_id: Option<String>,
    item_type: Option<String>,
    occurred_at: String,
    summary_date: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageEventRecordResult {
    recorded_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageRollupInput {
    summary_date: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageRollupResult {
    bubble_type: String,
    interaction_count: i64,
    open_count: i64,
    rollup_key: String,
    source_event_count: i64,
    summary_date: String,
    visible_seconds: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageSummaryStagedRollup {
    bubble_type: String,
    interaction_count: i64,
    open_count: i64,
    rollup_key: String,
    source_event_count: i64,
    summary_date: String,
    visible_seconds: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageSummarySyncResult {
    failed_count: i64,
    rollups: Vec<WidgetUsageSummaryStagedRollup>,
    sent_count: i64,
    synced_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageSummaryMarkSyncedInput {
    rollup_keys: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageSummaryMarkFailedInput {
    rollup_keys: Vec<String>,
    error_message: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageSummaryMarkSyncedResult {
    completed_at: String,
    synced_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageSummaryMarkFailedResult {
    completed_at: String,
    failed_count: i64,
}

/// Record one detailed widget usage event into the local store.
#[tauri::command]
pub fn record_widget_usage_event(
    state: State<'_, Db>,
    input: WidgetUsageEventInput,
) -> Result<WidgetUsageEventRecordResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let occurred_at =
        normalize_widget_usage_occurred_at(&input.occurred_at, input.summary_date.as_deref());
    conn.execute(
        "INSERT INTO local_widget_usage_events \
         (id, bubble_type, event_type, item_id, item_type, occurred_at, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            Uuid::new_v4().to_string(),
            input.bubble_type,
            input.event_type,
            input.item_id,
            input.item_type,
            occurred_at,
            now_ms(),
        ],
    )
    .map_err(|error| error.to_string())?;

    Ok(WidgetUsageEventRecordResult {
        recorded_at: now_iso(),
    })
}

fn normalize_widget_usage_occurred_at(value: &str, summary_date: Option<&str>) -> String {
    if let Some(date) = summary_date.filter(|date| is_iso_calendar_date(date)) {
        if value.len() >= 10 && is_iso_calendar_date(&value[..10]) {
            return format!("{}{}", date, &value[10..]);
        }

        return format!("{date}T00:00:00");
    }

    chrono::DateTime::parse_from_rfc3339(value)
        .map(|parsed| parsed.with_timezone(&chrono::Local).to_rfc3339())
        .unwrap_or_else(|_| value.to_string())
}

fn is_iso_calendar_date(value: &str) -> bool {
    value.len() == 10
        && value.as_bytes()[4] == b'-'
        && value.as_bytes()[7] == b'-'
        && value
            .bytes()
            .enumerate()
            .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
}

fn read_usage_metrics(
    conn: &Connection,
    summary_date: &str,
    bubble_type: &str,
) -> Result<(i64, i64, i64, i64), String> {
    let (source_event_count, open_count, interaction_count): (i64, i64, i64) = if let Some(
        next_date,
    ) =
        next_iso_calendar_date(summary_date)
    {
        conn.query_row(
                "SELECT \
                   COUNT(*) AS source_event_count, \
                   COALESCE(SUM(CASE WHEN lower(event_type) LIKE 'open%' THEN 1 ELSE 0 END), 0) AS open_count, \
                   COALESCE(SUM(CASE \
                     WHEN lower(event_type) LIKE 'open%' THEN 0 \
                     WHEN lower(event_type) LIKE 'summary:%' THEN 0 \
                     WHEN lower(event_type) IN ('timer:heartbeat', 'timer:recover') THEN 0 \
                     ELSE 1 \
                   END), 0) AS interaction_count \
                 FROM local_widget_usage_events \
                 WHERE bubble_type = ?1 AND occurred_at >= ?2 AND occurred_at < ?3",
                params![bubble_type, summary_date, next_date],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|error| error.to_string())?
    } else {
        conn.query_row(
                "SELECT \
                   COUNT(*) AS source_event_count, \
                   COALESCE(SUM(CASE WHEN lower(event_type) LIKE 'open%' THEN 1 ELSE 0 END), 0) AS open_count, \
                   COALESCE(SUM(CASE \
                     WHEN lower(event_type) LIKE 'open%' THEN 0 \
                     WHEN lower(event_type) LIKE 'summary:%' THEN 0 \
                     WHEN lower(event_type) IN ('timer:heartbeat', 'timer:recover') THEN 0 \
                     ELSE 1 \
                   END), 0) AS interaction_count \
                 FROM local_widget_usage_events \
                 WHERE substr(occurred_at, 1, 10) = ?1 AND bubble_type = ?2",
                params![summary_date, bubble_type],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|error| error.to_string())?
    };

    // Raw events stay local. The server only needs aggregate counters, so for
    // now every local event is counted as one visible second unless a later
    // native dwell tracker supplies a real duration. Open events are tracked
    // separately and do not inflate the interaction counter.
    Ok((
        source_event_count,
        open_count,
        interaction_count,
        source_event_count,
    ))
}

fn next_iso_calendar_date(value: &str) -> Option<String> {
    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .ok()
        .and_then(|date| date.succ_opt())
        .map(|date| date.format("%Y-%m-%d").to_string())
}

fn collect_usage_groups(
    conn: &Connection,
    summary_date: Option<&String>,
) -> Result<Vec<(String, String, i64)>, String> {
    let mut grouped: Vec<(String, String, i64)> = Vec::new();
    let map_row = |row: &rusqlite::Row<'_>| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i64>(2)?,
        ))
    };

    match summary_date {
        Some(date) => {
            if let Some(next_date) = next_iso_calendar_date(date) {
                let mut stmt = conn
                    .prepare(
                        "SELECT substr(occurred_at, 1, 10) AS d, bubble_type, COUNT(*) AS cnt \
                         FROM local_widget_usage_events \
                         WHERE occurred_at >= ?1 AND occurred_at < ?2 \
                         GROUP BY d, bubble_type",
                    )
                    .map_err(|error| error.to_string())?;
                let rows = stmt
                    .query_map(params![date, next_date], map_row)
                    .map_err(|error| error.to_string())?;

                for row in rows {
                    grouped.push(row.map_err(|error| error.to_string())?);
                }
            } else {
                let mut stmt = conn
                    .prepare(
                        "SELECT substr(occurred_at, 1, 10) AS d, bubble_type, COUNT(*) AS cnt \
                         FROM local_widget_usage_events \
                         WHERE substr(occurred_at, 1, 10) = ?1 \
                         GROUP BY d, bubble_type",
                    )
                    .map_err(|error| error.to_string())?;
                let rows = stmt
                    .query_map(params![date], map_row)
                    .map_err(|error| error.to_string())?;

                for row in rows {
                    grouped.push(row.map_err(|error| error.to_string())?);
                }
            }
        }
        None => {
            let mut stmt = conn
                .prepare(
                    "SELECT substr(occurred_at, 1, 10) AS d, bubble_type, COUNT(*) AS cnt \
                     FROM local_widget_usage_events \
                     GROUP BY d, bubble_type",
                )
                .map_err(|error| error.to_string())?;
            let rows = stmt
                .query_map([], map_row)
                .map_err(|error| error.to_string())?;

            for row in rows {
                grouped.push(row.map_err(|error| error.to_string())?);
            }
        }
    }

    Ok(grouped)
}

/// Compress detail events into per-date, per-bubble rollups.
#[tauri::command]
pub fn rollup_widget_usage(
    state: State<'_, Db>,
    input: Option<WidgetUsageRollupInput>,
) -> Result<Vec<WidgetUsageRollupResult>, String> {
    let summary_date = input.and_then(|value| value.summary_date);
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;

    // Group events by calendar date (first 10 chars of ISO-8601) and bubble.
    let grouped = collect_usage_groups(&conn, summary_date.as_ref())?;

    let mut results = Vec::with_capacity(grouped.len());
    for (date, bubble_type, count) in grouped {
        let (_, open_count, interaction_count, visible_seconds) =
            read_usage_metrics(&conn, &date, &bubble_type)?;
        let rollup_key = format!("{date}:{bubble_type}");
        conn.execute(
            "INSERT INTO local_widget_usage_rollups \
             (rollup_key, bubble_type, summary_date, source_event_count, sync_status, updated_at) \
             VALUES (?1, ?2, ?3, ?4, 'LOCAL_ONLY', ?5) \
             ON CONFLICT(rollup_key) DO UPDATE SET \
               source_event_count = excluded.source_event_count, \
               sync_status = CASE \
                 WHEN excluded.source_event_count != local_widget_usage_rollups.source_event_count \
                 THEN 'LOCAL_ONLY' \
                 ELSE local_widget_usage_rollups.sync_status \
               END, \
               updated_at = excluded.updated_at",
            params![rollup_key, bubble_type, date, count, now_ms()],
        )
        .map_err(|error| error.to_string())?;

        results.push(WidgetUsageRollupResult {
            bubble_type,
            interaction_count,
            open_count,
            rollup_key,
            source_event_count: count,
            summary_date: date,
            visible_seconds,
        });
    }

    Ok(results)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageSummarySyncInput {
    rollup_keys: Option<Vec<String>>,
}

/// Stage local rollups into the sync outbox for the frontend to POST to
/// /api/widget/usage-summaries. This command does not perform the network call
/// itself (auth tokens live in the frontend / OS secure store), so `sentCount`
/// reflects how many rollups were queued for send.
#[tauri::command]
pub fn sync_widget_usage_summary(
    state: State<'_, Db>,
    input: Option<WidgetUsageSummarySyncInput>,
) -> Result<WidgetUsageSummarySyncResult, String> {
    let filter_keys = input.and_then(|value| value.rollup_keys);
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;

    // Collect rollups that still need to be reflected. SYNC_PENDING is included
    // so a frontend/backend failure after staging can be retried on the next run.
    let mut pending: Vec<(String, String, String, i64)> = Vec::new();
    {
        let mut stmt = conn
            .prepare(PENDING_WIDGET_USAGE_ROLLUPS_SQL)
            .map_err(|error| error.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            })
            .map_err(|error| error.to_string())?;
        for row in rows {
            pending.push(row.map_err(|error| error.to_string())?);
        }
    }

    let mut queued = 0i64;
    let mut staged_rollups = Vec::new();
    for (rollup_key, bubble_type, summary_date, count) in pending {
        if let Some(keys) = &filter_keys {
            if !keys.contains(&rollup_key) {
                continue;
            }
        }

        let (_, open_count, interaction_count, visible_seconds) =
            read_usage_metrics(&conn, &summary_date, &bubble_type)?;
        let payload = json!({
            "rollupKey": rollup_key,
            "bubbleType": bubble_type,
            "summaryDate": summary_date,
            "sourceEventCount": count,
            "interactionCount": interaction_count,
            "openCount": open_count,
            "visibleSeconds": visible_seconds,
        })
        .to_string();
        // Idempotency key = rollup key, so a re-run does not double-insert.
        conn.execute(
            "INSERT INTO local_sync_outbox \
             (id, idempotency_key, operation, payload_json, status, retry_count, created_at, updated_at) \
             VALUES (?1, ?2, 'widget_usage_summary', ?3, 'PENDING', 0, ?4, ?4) \
             ON CONFLICT(idempotency_key) DO UPDATE SET \
               payload_json = excluded.payload_json, updated_at = excluded.updated_at",
            params![Uuid::new_v4().to_string(), rollup_key, payload, now_ms()],
        )
        .map_err(|error| error.to_string())?;

        conn.execute(
            "UPDATE local_widget_usage_rollups SET sync_status = 'SYNC_PENDING', updated_at = ?2 \
             WHERE rollup_key = ?1",
            params![rollup_key, now_ms()],
        )
        .map_err(|error| error.to_string())?;

        queued += 1;
        staged_rollups.push(WidgetUsageSummaryStagedRollup {
            bubble_type,
            interaction_count,
            open_count,
            rollup_key,
            source_event_count: count,
            summary_date,
            visible_seconds,
        });
    }

    Ok(WidgetUsageSummarySyncResult {
        failed_count: 0,
        rollups: staged_rollups,
        sent_count: queued,
        synced_at: now_iso(),
    })
}

/// Mark staged widget usage rollups as reflected by the authenticated frontend.
#[tauri::command]
pub fn mark_widget_usage_summary_synced(
    state: State<'_, Db>,
    input: WidgetUsageSummaryMarkSyncedInput,
) -> Result<WidgetUsageSummaryMarkSyncedResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    let now = now_ms();
    let mut synced = 0i64;

    for rollup_key in input.rollup_keys {
        let updated = conn
            .execute(
                "UPDATE local_widget_usage_rollups SET sync_status = 'SYNCED', updated_at = ?2 \
                 WHERE rollup_key = ?1",
                params![rollup_key, now],
            )
            .map_err(|error| error.to_string())?;

        if updated > 0 {
            synced += 1;
        }

        conn.execute(
            "UPDATE local_sync_outbox SET status = 'SENT', updated_at = ?2 \
             WHERE idempotency_key = ?1 AND operation = 'widget_usage_summary'",
            params![rollup_key, now],
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(WidgetUsageSummaryMarkSyncedResult {
        completed_at: now_iso(),
        synced_count: synced,
    })
}

/// Mark staged widget usage rollups as failed so the next sync tick can retry
/// them without losing the raw local detail events.
#[tauri::command]
pub fn mark_widget_usage_summary_failed(
    state: State<'_, Db>,
    input: WidgetUsageSummaryMarkFailedInput,
) -> Result<WidgetUsageSummaryMarkFailedResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
    mark_widget_usage_summary_failed_for_conn(&conn, input)
}

fn mark_widget_usage_summary_failed_for_conn(
    conn: &Connection,
    input: WidgetUsageSummaryMarkFailedInput,
) -> Result<WidgetUsageSummaryMarkFailedResult, String> {
    let now = now_ms();
    let mut failed = 0i64;
    let error_message = input
        .error_message
        .unwrap_or_else(|| "server sync failed".to_string());

    for rollup_key in input.rollup_keys {
        let updated = conn
            .execute(
                "UPDATE local_widget_usage_rollups SET sync_status = 'FAILED', updated_at = ?2 \
                 WHERE rollup_key = ?1",
                params![rollup_key, now],
            )
            .map_err(|error| error.to_string())?;

        if updated > 0 {
            failed += 1;
        }

        conn.execute(
            "UPDATE local_sync_outbox \
             SET status = 'FAILED', retry_count = retry_count + 1, error_message = ?2, updated_at = ?3 \
             WHERE idempotency_key = ?1 AND operation = 'widget_usage_summary'",
            params![rollup_key, error_message, now],
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(WidgetUsageSummaryMarkFailedResult {
        completed_at: now_iso(),
        failed_count: failed,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        mark_widget_usage_summary_failed_for_conn, normalize_widget_usage_occurred_at,
        read_usage_metrics, PENDING_WIDGET_USAGE_ROLLUPS_SQL,
    };
    use rusqlite::Connection;

    #[test]
    fn staged_widget_usage_rollups_are_retry_candidates() {
        assert!(PENDING_WIDGET_USAGE_ROLLUPS_SQL.contains("'SYNC_PENDING'"));
    }

    #[test]
    fn widget_usage_timestamp_is_stored_with_local_calendar_date() {
        let utc_late_day = "2026-07-05T16:12:45.245Z";
        let normalized = normalize_widget_usage_occurred_at(utc_late_day, None);
        let expected_local_date = chrono::DateTime::parse_from_rfc3339(utc_late_day)
            .expect("parse utc timestamp")
            .with_timezone(&chrono::Local)
            .format("%Y-%m-%d")
            .to_string();

        assert_eq!(&normalized[..10], expected_local_date);
    }

    #[test]
    fn widget_usage_summary_date_overrides_os_timezone_for_rollups() {
        let normalized =
            normalize_widget_usage_occurred_at("2026-07-05T16:12:45.245Z", Some("2026-07-06"));

        assert_eq!(&normalized[..10], "2026-07-06");
        assert!(normalized.ends_with("T16:12:45.245Z"));
    }

    #[test]
    fn invalid_widget_usage_timestamp_is_preserved_for_retry_visibility() {
        assert_eq!(
            normalize_widget_usage_occurred_at("not-a-date", None),
            "not-a-date"
        );
    }

    #[test]
    fn widget_usage_metrics_exclude_passive_events_from_interactions() {
        let conn = Connection::open_in_memory().expect("open sqlite");
        conn.execute_batch(
            "
            CREATE TABLE local_widget_usage_events (
                id TEXT PRIMARY KEY,
                bubble_type TEXT NOT NULL,
                event_type TEXT NOT NULL,
                item_id TEXT,
                item_type TEXT,
                occurred_at TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            INSERT INTO local_widget_usage_events
                (id, bubble_type, event_type, item_id, item_type, occurred_at, created_at)
            VALUES
                ('event-1', 'todo', 'open', NULL, NULL, '2026-07-07T09:00:00+09:00', 1),
                ('event-2', 'todo', 'open:auto-login', NULL, NULL, '2026-07-07T09:01:00+09:00', 2),
                ('event-3', 'todo', 'timer:heartbeat', 'timer-1', 'TIME_LOG', '2026-07-07T09:02:00+09:00', 3),
                ('event-4', 'todo', 'timer:recover', 'timer-1', 'TIME_LOG', '2026-07-07T09:03:00+09:00', 4),
                ('event-5', 'todo', 'summary:server-refresh-failed:not_tauri_runtime', NULL, NULL, '2026-07-07T09:04:00+09:00', 5),
                ('event-6', 'todo', 'task:toggle', 'task-1', 'TASK', '2026-07-07T09:05:00+09:00', 6);
            ",
        )
        .expect("seed usage events");

        let (source_event_count, open_count, interaction_count, visible_seconds) =
            read_usage_metrics(&conn, "2026-07-07", "todo").expect("read usage metrics");

        assert_eq!(source_event_count, 6);
        assert_eq!(open_count, 2);
        assert_eq!(interaction_count, 1);
        assert_eq!(visible_seconds, 6);
    }

    #[test]
    fn failed_widget_usage_rollups_are_retry_candidates() {
        let conn = Connection::open_in_memory().expect("open sqlite");
        conn.execute_batch(
            "
            CREATE TABLE local_widget_usage_rollups (
                rollup_key TEXT PRIMARY KEY,
                bubble_type TEXT NOT NULL,
                summary_date TEXT NOT NULL,
                source_event_count INTEGER NOT NULL,
                sync_status TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE TABLE local_sync_outbox (
                id TEXT PRIMARY KEY,
                idempotency_key TEXT NOT NULL UNIQUE,
                operation TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL,
                retry_count INTEGER NOT NULL DEFAULT 0,
                error_message TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            INSERT INTO local_widget_usage_rollups
                (rollup_key, bubble_type, summary_date, source_event_count, sync_status, updated_at)
            VALUES ('2026-07-03:todo', 'todo', '2026-07-03', 3, 'SYNC_PENDING', 1);
            INSERT INTO local_sync_outbox
                (id, idempotency_key, operation, payload_json, status, retry_count, error_message, created_at, updated_at)
            VALUES ('outbox-1', '2026-07-03:todo', 'widget_usage_summary', '{}', 'PENDING', 0, NULL, 1, 1);
            ",
        )
        .expect("seed widget usage tables");

        let result = mark_widget_usage_summary_failed_for_conn(
            &conn,
            super::WidgetUsageSummaryMarkFailedInput {
                rollup_keys: vec!["2026-07-03:todo".to_string()],
                error_message: Some("settings mismatch".to_string()),
            },
        )
        .expect("mark failed");
        assert_eq!(result.failed_count, 1);

        let status: String = conn
            .query_row(
                "SELECT sync_status FROM local_widget_usage_rollups WHERE rollup_key = '2026-07-03:todo'",
                [],
                |row| row.get(0),
            )
            .expect("read rollup status");
        let (outbox_status, retry_count, error_message): (String, i64, String) = conn
            .query_row(
                "SELECT status, retry_count, error_message FROM local_sync_outbox WHERE idempotency_key = '2026-07-03:todo'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("read outbox status");

        assert_eq!(status, "FAILED");
        assert_eq!(outbox_status, "FAILED");
        assert_eq!(retry_count, 1);
        assert_eq!(error_message, "settings mismatch");
    }
}
