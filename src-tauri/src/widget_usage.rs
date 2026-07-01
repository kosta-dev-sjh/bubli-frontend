//! BUBLI-41: widget item state is persisted on the server (PATCH
//! /api/widget/items/{id}/state). The local-only part lives here: detailed
//! widget usage events, per-date rollups, and staging those rollups into the
//! sync outbox. Raw events never leave the device; only rollups are reflected
//! to the server (POST /api/widget/usage-summaries per the API spec).

use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::local_db::{now_iso, now_ms, Db};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageEventInput {
    bubble_type: String,
    event_type: String,
    item_id: Option<String>,
    item_type: Option<String>,
    occurred_at: String,
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
    rollup_key: String,
    source_event_count: i64,
    summary_date: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetUsageSummarySyncResult {
    failed_count: i64,
    sent_count: i64,
    synced_at: String,
}

/// Record one detailed widget usage event into the local store.
#[tauri::command]
pub fn record_widget_usage_event(
    state: State<'_, Db>,
    input: WidgetUsageEventInput,
) -> Result<WidgetUsageEventRecordResult, String> {
    let conn = state.0.lock().map_err(|_| "db lock failed".to_string())?;
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
            input.occurred_at,
            now_ms(),
        ],
    )
    .map_err(|error| error.to_string())?;

    Ok(WidgetUsageEventRecordResult {
        recorded_at: now_iso(),
    })
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
    let mut grouped: Vec<(String, String, i64)> = Vec::new();
    {
        let (sql, has_filter) = match &summary_date {
            Some(_) => (
                "SELECT substr(occurred_at, 1, 10) AS d, bubble_type, COUNT(*) AS cnt \
                 FROM local_widget_usage_events \
                 WHERE substr(occurred_at, 1, 10) = ?1 \
                 GROUP BY d, bubble_type",
                true,
            ),
            None => (
                "SELECT substr(occurred_at, 1, 10) AS d, bubble_type, COUNT(*) AS cnt \
                 FROM local_widget_usage_events \
                 GROUP BY d, bubble_type",
                false,
            ),
        };

        let mut stmt = conn.prepare(sql).map_err(|error| error.to_string())?;
        let map_row = |row: &rusqlite::Row<'_>| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
            ))
        };
        let rows = if has_filter {
            stmt.query_map(params![summary_date.as_ref().unwrap()], map_row)
        } else {
            stmt.query_map([], map_row)
        }
        .map_err(|error| error.to_string())?;

        for row in rows {
            grouped.push(row.map_err(|error| error.to_string())?);
        }
    }

    let mut results = Vec::with_capacity(grouped.len());
    for (date, bubble_type, count) in grouped {
        let rollup_key = format!("{date}:{bubble_type}");
        conn.execute(
            "INSERT INTO local_widget_usage_rollups \
             (rollup_key, bubble_type, summary_date, source_event_count, sync_status, updated_at) \
             VALUES (?1, ?2, ?3, ?4, 'LOCAL_ONLY', ?5) \
             ON CONFLICT(rollup_key) DO UPDATE SET \
               source_event_count = excluded.source_event_count, \
               updated_at = excluded.updated_at",
            params![rollup_key, bubble_type, date, count, now_ms()],
        )
        .map_err(|error| error.to_string())?;

        results.push(WidgetUsageRollupResult {
            bubble_type,
            rollup_key,
            source_event_count: count,
            summary_date: date,
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

    // Collect rollups that still need to be reflected.
    let mut pending: Vec<(String, String, String, i64)> = Vec::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT rollup_key, bubble_type, summary_date, source_event_count \
                 FROM local_widget_usage_rollups \
                 WHERE sync_status IN ('LOCAL_ONLY', 'FAILED')",
            )
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
    for (rollup_key, bubble_type, summary_date, count) in pending {
        if let Some(keys) = &filter_keys {
            if !keys.contains(&rollup_key) {
                continue;
            }
        }

        let payload = format!(
            "{{\"rollupKey\":\"{rollup_key}\",\"bubbleType\":\"{bubble_type}\",\"summaryDate\":\"{summary_date}\",\"sourceEventCount\":{count}}}"
        );
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
    }

    Ok(WidgetUsageSummarySyncResult {
        failed_count: 0,
        sent_count: queued,
        synced_at: now_iso(),
    })
}
