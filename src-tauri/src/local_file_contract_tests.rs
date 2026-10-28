fn contract_seed(conn: &Connection, resource_id: Option<&str>) {
    conn.execute("INSERT INTO managed_folders(id,name,path,status,sync_enabled,created_at,updated_at) VALUES('contract-folder','Contract','/contract','ACTIVE',1,1,1)", []).unwrap();
    conn.execute("INSERT INTO local_files(id,local_folder_id,file_name,local_path,resource_id,size_bytes,checksum,sync_status,updated_at) VALUES('contract-file','contract-folder','original.md','/contract/original.md',?1,10,'old','LOCAL_ONLY',1)", params![resource_id]).unwrap();
}

fn contract_record(conn: &Connection, event_type: &str, name: &str, size: i64, now: i64) -> String {
    record_event(
        conn,
        "contract-folder",
        Some("contract-file"),
        event_type,
        name,
        "/contract/original.md",
        Some("hash"),
        size,
        Some(now),
        now,
    )
    .unwrap();
    conn.query_row(
        "SELECT e.id FROM local_file_events e JOIN local_file_event_order o ON o.local_event_id = e.id ORDER BY o.sequence DESC LIMIT 1",
        [],
        |row| row.get(0),
    )
    .unwrap()
}

fn contract_stage(conn: &Connection, now: i64) -> LocalFileEventsSyncStageResult {
    stage_local_file_events_for_sync_for_conn(conn, None, now).unwrap()
}

fn contract_mark(
    conn: &Connection,
    results: serde_json::Value,
    now: i64,
) -> Result<LocalFileEventsMarkSyncedResult, String> {
    mark_local_file_events_synced_for_conn(
        conn,
        serde_json::from_value(json!({"results": results})).unwrap(),
        now,
    )
}

fn contract_count(conn: &Connection, table: &str) -> i64 {
    conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
        row.get(0)
    })
    .unwrap()
}

fn contract_status(conn: &Connection, id: &str) -> (String, Option<String>) {
    conn.query_row(
        "SELECT status,reason FROM local_file_events WHERE id=?1",
        params![id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .unwrap()
}

fn contract_outbox(conn: &Connection, id: &str) -> (String, String) {
    conn.query_row(
        "SELECT status,payload_json FROM local_sync_outbox WHERE idempotency_key=?1",
        params![local_file_event_outbox_key(id)],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .unwrap()
}

#[test]
fn contract_record_captures_event_and_outgoing_snapshot_together() {
    let conn = test_connection();
    contract_seed(&conn, Some("registered-resource"));
    let id = contract_record(&conn, "UPDATED", "captured.md", 12, 10);
    let (status, payload) = contract_outbox(&conn, &id);
    assert_eq!(status, "PENDING");
    let event: serde_json::Value = serde_json::from_str(&payload).unwrap();
    assert_eq!(event["fileName"], "captured.md");
    assert_eq!(event["fileSizeBytes"], 12);
    assert_eq!(event["resourceId"], "registered-resource");
    assert_eq!(event["localEventId"], id);
    assert!(event["localSequence"].as_i64().unwrap() > 0);
    assert!(event["syncDeviceId"]
        .as_str()
        .is_some_and(|id| !id.is_empty()));
}

#[test]
fn contract_event_and_sequence_roll_back_when_outbox_insert_fails() {
    let conn = test_connection();
    contract_seed(&conn, None);
    conn.execute_batch("CREATE TRIGGER contract_fail_outbox BEFORE INSERT ON local_sync_outbox BEGIN SELECT RAISE(ABORT,'outbox unavailable'); END;").unwrap();
    assert!(record_event(
        &conn,
        "contract-folder",
        Some("contract-file"),
        "CREATED",
        "first.md",
        "/contract/first.md",
        None,
        10,
        None,
        2
    )
    .is_err());
    assert_eq!(contract_count(&conn, "local_file_events"), 0);
    assert_eq!(contract_count(&conn, "local_file_event_order"), 0);
    assert_eq!(contract_count(&conn, "local_sync_outbox"), 0);
    assert!(conn.is_autocommit());
}

#[test]
fn contract_scan_watch_reindex_do_not_advance_index_without_durable_event() {
    for source in ["scan", "watch", "reindex"] {
        let conn = test_connection();
        let folder = std::env::temp_dir().join(format!("bubli-contract-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&folder).unwrap();
        let file = folder.join("contract.md");
        std::fs::write(&file, "old text").unwrap();
        conn.execute("INSERT INTO managed_folders(id,name,path,status,sync_enabled,created_at,updated_at) VALUES('contract-folder','Contract',?1,'ACTIVE',1,1,1)",params![folder.to_string_lossy()]).unwrap();
        scan_managed_folder_for_conn(
            &conn,
            ManagedFolderCommandInput {
                local_folder_id: "contract-folder".into(),
            },
        )
        .unwrap();
        let (file_id, old_size, old_hash): (String, i64, String) = conn
            .query_row(
                "SELECT id,size_bytes,checksum FROM local_files",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        let event_count = contract_count(&conn, "local_file_events");
        let outbox_count = contract_count(&conn, "local_sync_outbox");
        let old_fts: String = conn
            .query_row("SELECT content FROM local_file_fts", [], |row| row.get(0))
            .unwrap();
        std::fs::write(&file, "new and longer text").unwrap();
        conn.execute_batch("CREATE TRIGGER contract_fail_outbox BEFORE INSERT ON local_sync_outbox BEGIN SELECT RAISE(ABORT,'outbox unavailable'); END;").unwrap();
        let result = match source {
            "scan" => scan_managed_folder_for_conn(
                &conn,
                ManagedFolderCommandInput {
                    local_folder_id: "contract-folder".into(),
                },
            )
            .map(|_| ()),
            "watch" => record_watch_path_change(&conn, "contract-folder", &file, 30).map(|_| ()),
            _ => reindex_file_for_conn(&conn, &file_id, 30).map(|_| ()),
        };
        assert!(result.is_err(), "{source} must expose storage failure");
        let stored: (i64, String) = conn
            .query_row("SELECT size_bytes,checksum FROM local_files", [], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .unwrap();
        assert_eq!(stored, (old_size, old_hash), "{source}");
        assert_eq!(
            contract_count(&conn, "local_file_events"),
            event_count,
            "{source}"
        );
        assert_eq!(
            contract_count(&conn, "local_sync_outbox"),
            outbox_count,
            "{source}"
        );
        assert_eq!(
            conn.query_row("SELECT content FROM local_file_fts", [], |row| row
                .get::<_, String>(0))
                .unwrap(),
            old_fts,
            "{source}"
        );
        conn.execute_batch("DROP TRIGGER contract_fail_outbox")
            .unwrap();
        assert!(
            reindex_file_for_conn(&conn, &file_id, 40).unwrap().changed,
            "change remains detectable after rollback"
        );
        std::fs::remove_dir_all(folder).unwrap();
    }
}

#[test]
fn contract_failed_initial_scan_and_watch_leave_no_orphan_index() {
    for source in ["scan", "watch"] {
        let conn = test_connection();
        let folder = std::env::temp_dir().join(format!("bubli-contract-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&folder).unwrap();
        let file = folder.join("new.md");
        std::fs::write(&file, "first content").unwrap();
        conn.execute("INSERT INTO managed_folders(id,name,path,status,sync_enabled,created_at,updated_at) VALUES('contract-folder','Contract',?1,'ACTIVE',1,1,1)",params![folder.to_string_lossy()]).unwrap();
        conn.execute_batch("CREATE TRIGGER contract_fail_event BEFORE INSERT ON local_file_events BEGIN SELECT RAISE(ABORT,'event unavailable'); END;").unwrap();
        let result = if source == "scan" {
            scan_managed_folder_for_conn(
                &conn,
                ManagedFolderCommandInput {
                    local_folder_id: "contract-folder".into(),
                },
            )
            .map(|_| ())
        } else {
            record_watch_path_change(&conn, "contract-folder", &file, 2).map(|_| ())
        };
        assert!(result.is_err());
        assert_eq!(contract_count(&conn, "local_files"), 0, "{source}");
        assert_eq!(contract_count(&conn, "local_file_fts"), 0, "{source}");
        std::fs::remove_dir_all(folder).unwrap();
    }
}

#[test]
fn contract_nested_savepoint_keeps_callers_transaction_and_unrelated_writes() {
    let conn = test_connection();
    conn.execute_batch("BEGIN").unwrap();
    contract_seed(&conn, None);
    conn.execute_batch("CREATE TRIGGER contract_fail_outbox BEFORE INSERT ON local_sync_outbox BEGIN SELECT RAISE(ABORT,'outbox unavailable'); END;").unwrap();
    assert!(record_event(
        &conn,
        "contract-folder",
        Some("contract-file"),
        "CREATED",
        "new.md",
        "/contract/new.md",
        None,
        10,
        None,
        2
    )
    .is_err());
    assert!(!conn.is_autocommit());
    assert_eq!(contract_count(&conn, "local_files"), 1);
    assert_eq!(contract_count(&conn, "local_file_events"), 0);
    conn.execute_batch("ROLLBACK").unwrap();
    assert_eq!(contract_count(&conn, "local_files"), 0);
}

#[test]
fn contract_retry_uses_frozen_payload_not_current_index_event_or_device() {
    let conn = test_connection();
    contract_seed(&conn, Some("original-resource"));
    let id = contract_record(&conn, "UPDATED", "captured.md", 12, 2);
    let first = json!(contract_stage(&conn, 3).events);
    contract_mark(&conn, json!([{"localEventId":id,"status":"FAILED"}]), 4).unwrap();
    conn.execute_batch("UPDATE local_files SET resource_id='replaced-resource',file_name='latest.md',size_bytes=999; UPDATE local_file_events SET file_name='changed-event.md',size_bytes=222; UPDATE local_device_identity SET device_id='other-device';").unwrap();
    assert_eq!(json!(contract_stage(&conn, 5).events), first);
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(&contract_outbox(&conn, &id).1).unwrap(),
        first[0]
    );
}

#[test]
fn contract_update_and_delete_wait_for_registration_then_bind_only_once() {
    for event_type in ["UPDATED", "DELETED"] {
        let conn = test_connection();
        contract_seed(&conn, None);
        let created = contract_record(&conn, "CREATED", "first.md", 10, 2);
        contract_stage(&conn, 3);
        let dependent = contract_record(&conn, event_type, "changed.md", 20, 4);
        let waiting = contract_outbox(&conn, &dependent);
        assert_eq!(waiting.0, "WAITING");
        assert!(
            serde_json::from_str::<serde_json::Value>(&waiting.1).unwrap()["resourceId"].is_null()
        );
        assert_eq!(contract_stage(&conn, 5).events[0].local_event_id, created);
        contract_mark(
            &conn,
            json!([{"localEventId":created,"status":"SYNCED","resourceId":"registered-resource"}]),
            6,
        )
        .unwrap();
        let first = json!(contract_stage(&conn, 7).events);
        assert_eq!(first[0]["localEventId"], dependent);
        assert_eq!(first[0]["resourceId"], "registered-resource");
        assert_eq!(first[0]["fileSizeBytes"], 20);
        contract_mark(
            &conn,
            json!([{"localEventId":dependent,"status":"FAILED"}]),
            8,
        )
        .unwrap();
        conn.execute_batch("UPDATE local_files SET resource_id='replacement-resource'")
            .unwrap();
        assert_eq!(json!(contract_stage(&conn, 9).events), first);
    }
}

#[test]
fn contract_processing_stays_incomplete_and_blocks_next_edit() {
    let conn = test_connection();
    contract_seed(&conn, None);
    let first = contract_record(&conn, "CREATED", "first.md", 10, 2);
    contract_stage(&conn, 3);
    let second = contract_record(&conn, "UPDATED", "second.md", 20, 4);
    contract_mark(
        &conn,
        json!([{"localEventId":first,"status":"PROCESSING"}]),
        5,
    )
    .unwrap();
    assert_eq!(contract_status(&conn, &first).0, "APPROVED");
    assert_eq!(contract_status(&conn, &second).0, "PENDING");
    assert_eq!(contract_stage(&conn, 6).events[0].local_event_id, first);
}

#[test]
fn contract_offered_creation_is_not_collapsed_if_deleted_before_response() {
    let conn = test_connection();
    contract_seed(&conn, None);
    let created = contract_record(&conn, "CREATED", "first.md", 10, 2);
    let first = json!(contract_stage(&conn, 3).events);
    contract_record(&conn, "DELETED", "first.md", 10, 4);
    assert_eq!(json!(contract_stage(&conn, 5).events), first);
    assert_eq!(contract_status(&conn, &created).0, "APPROVED");
    assert_eq!(contract_count(&conn, "local_files"), 1);
}

#[test]
fn contract_never_offered_create_edit_delete_cancels_all_local_events() {
    let conn = test_connection();
    contract_seed(&conn, None);
    let created = contract_record(&conn, "CREATED", "first.md", 10, 2);
    let updated = contract_record(&conn, "UPDATED", "second.md", 20, 3);
    let deleted = contract_record(&conn, "DELETED", "second.md", 20, 4);
    assert!(contract_stage(&conn, 5).events.is_empty());
    for id in [created, updated, deleted] {
        assert_eq!(contract_status(&conn, &id).0, "SYNCED");
        assert_eq!(contract_outbox(&conn, &id).0, "SENT");
    }
    assert_eq!(contract_count(&conn, "local_files"), 0);
}

#[test]
fn contract_duplicate_and_unknown_result_ids_do_not_partially_complete() {
    for invalid in ["duplicate", "unknown"] {
        let conn = test_connection();
        contract_seed(&conn, None);
        let id = contract_record(&conn, "CREATED", "first.md", 10, 2);
        contract_stage(&conn, 3);
        let other = if invalid == "duplicate" {
            id.clone()
        } else {
            "unknown-event".into()
        };
        assert!(
            contract_mark(
                &conn,
                json!([
                    {"localEventId":id,"status":"SYNCED","resourceId":"registered-resource"},
                    {"localEventId":other,"status":"FAILED"}
                ]),
                4
            )
            .is_err(),
            "{invalid}"
        );
        assert_eq!(contract_status(&conn, &id).0, "APPROVED");
        assert_ne!(contract_outbox(&conn, &id).0, "SENT");
        assert!(conn
            .query_row("SELECT resource_id IS NULL FROM local_files", [], |row| row
                .get::<_, bool>(0))
            .unwrap());
    }
}

#[test]
fn contract_terminal_results_still_validate_ids_and_statuses() {
    for status in ["NOT_A_STATUS", "FAILED"] {
        let conn = test_connection();
        contract_seed(&conn, None);
        let id = contract_record(&conn, "CREATED", "first.md", 10, 2);
        contract_stage(&conn, 3);
        contract_mark(
            &conn,
            json!([{"localEventId":id,"status":"SYNCED","resourceId":"registered-resource"}]),
            4,
        )
        .unwrap();
        let results = if status == "FAILED" {
            json!([{"localEventId":id,"status":status},{"localEventId":id,"status":status}])
        } else {
            json!([{"localEventId":id,"status":status}])
        };
        assert!(contract_mark(&conn, results, 5).is_err());
        assert_eq!(contract_status(&conn, &id).0, "SYNCED");
    }
}

#[test]
fn contract_response_cannot_replace_resource_mapping() {
    for status in ["SYNCED", "PROCESSING", "FAILED", "REJECTED", "SUPERSEDED"] {
        let conn = test_connection();
        contract_seed(&conn, Some("original-resource"));
        let id = contract_record(&conn, "UPDATED", "first.md", 10, 2);
        contract_stage(&conn, 3);
        assert!(
            contract_mark(
                &conn,
                json!([{"localEventId":id,"status":status,"resourceId":"different-resource"}]),
                4
            )
            .is_err(),
            "{status}"
        );
        assert_eq!(contract_status(&conn, &id).0, "APPROVED");
        assert_ne!(contract_outbox(&conn, &id).0, "SENT");
        assert_eq!(
            conn.query_row("SELECT resource_id FROM local_files", [], |row| row
                .get::<_, String>(0))
                .unwrap(),
            "original-resource"
        );
    }
}

#[test]
fn contract_completed_event_ignores_late_failure() {
    let conn = test_connection();
    contract_seed(&conn, None);
    let id = contract_record(&conn, "CREATED", "first.md", 10, 2);
    contract_stage(&conn, 3);
    contract_mark(
        &conn,
        json!([{"localEventId":id,"status":"SYNCED","resourceId":"registered-resource"}]),
        4,
    )
    .unwrap();
    contract_mark(
        &conn,
        json!([{"localEventId":id,"status":"FAILED","reason":"late timeout"}]),
        5,
    )
    .unwrap();
    assert_eq!(contract_status(&conn, &id).0, "SYNCED");
    assert_eq!(contract_outbox(&conn, &id).0, "SENT");
    assert_eq!(
        conn.query_row("SELECT sync_status FROM local_files", [], |row| row
            .get::<_, String>(0))
            .unwrap(),
        "SYNCED"
    );
}

#[test]
fn contract_unknown_and_unsafe_skipped_statuses_never_complete() {
    for status in ["UNKNOWN", "SKIPPED"] {
        let conn = test_connection();
        contract_seed(&conn, Some("original-resource"));
        let id = contract_record(&conn, "UPDATED", "first.md", 10, 2);
        contract_stage(&conn, 3);
        assert!(contract_mark(
            &conn,
            json!([{"localEventId":id,"status":status,"resourceId":"original-resource"}]),
            4
        )
        .is_err());
        assert_eq!(contract_status(&conn, &id).0, "APPROVED");
    }
}

#[test]
fn contract_rejected_event_and_outbox_block_later_same_file_changes() {
    let conn = test_connection();
    contract_seed(&conn, Some("original-resource"));
    let first = contract_record(&conn, "UPDATED", "first.md", 10, 2);
    contract_stage(&conn, 3);
    let later = contract_record(&conn, "UPDATED", "later.md", 20, 4);
    contract_mark(
        &conn,
        json!([{"localEventId":first,"status":"REJECTED","reason":"PAYLOAD_MISMATCH"}]),
        5,
    )
    .unwrap();
    assert_eq!(
        contract_status(&conn, &first),
        ("REJECTED".into(), Some("PAYLOAD_MISMATCH".into()))
    );
    assert_eq!(contract_outbox(&conn, &first).0, "REJECTED");
    assert_eq!(
        conn.query_row("SELECT sync_status FROM local_files", [], |row| row
            .get::<_, String>(0))
            .unwrap(),
        "CONFLICT"
    );
    assert!(contract_stage(&conn, 6).events.is_empty());
    contract_mark(&conn, json!([{"localEventId":first,"status":"FAILED"}]), 7).unwrap();
    assert_eq!(contract_status(&conn, &first).0, "REJECTED");
    assert_eq!(contract_status(&conn, &later).0, "PENDING");
    conn.execute_batch("UPDATE local_files SET sync_status='LOCAL_ONLY'")
        .unwrap();
    assert!(
        contract_stage(&conn, 8).events.is_empty(),
        "the rejected predecessor still blocks after a new file change"
    );
}

#[test]
fn contract_rejected_delete_keeps_index_but_safe_skipped_delete_removes_it() {
    for status in ["REJECTED", "SKIPPED"] {
        let conn = test_connection();
        contract_seed(&conn, Some("original-resource"));
        let id = contract_record(&conn, "DELETED", "first.md", 10, 2);
        contract_stage(&conn, 3);
        contract_mark(
            &conn,
            json!([{"localEventId":id,"status":status,"reason":"delete outcome"}]),
            4,
        )
        .unwrap();
        assert_eq!(
            contract_count(&conn, "local_files"),
            if status == "REJECTED" { 1 } else { 0 }
        );
        assert_eq!(
            contract_status(&conn, &id).0,
            if status == "REJECTED" {
                "REJECTED"
            } else {
                "SYNCED"
            }
        );
    }
}

#[test]
fn contract_completion_mapping_failure_rolls_back_event_and_outbox() {
    let conn = test_connection();
    contract_seed(&conn, None);
    let id = contract_record(&conn, "CREATED", "first.md", 10, 2);
    contract_stage(&conn, 3);
    conn.execute_batch("CREATE TRIGGER contract_fail_mapping BEFORE UPDATE OF resource_id ON local_files BEGIN SELECT RAISE(ABORT,'mapping unavailable'); END;").unwrap();
    assert!(contract_mark(
        &conn,
        json!([{"localEventId":id,"status":"SYNCED","resourceId":"registered-resource"}]),
        4
    )
    .is_err());
    assert_eq!(contract_status(&conn, &id).0, "APPROVED");
    assert_ne!(contract_outbox(&conn, &id).0, "SENT");
}

#[test]
fn contract_prepared_legacy_event_without_snapshot_requires_repair() {
    let conn = test_connection();
    contract_seed(&conn, Some("original-resource"));
    let id = contract_record(&conn, "UPDATED", "first.md", 10, 2);
    conn.execute_batch(
        "DELETE FROM local_sync_outbox; UPDATE local_file_events SET status='FAILED'",
    )
    .unwrap();
    assert!(stage_local_file_events_for_sync_for_conn(&conn, None, 3).is_err());
    assert_eq!(contract_status(&conn, &id).0, "FAILED");
    assert_eq!(contract_count(&conn, "local_sync_outbox"), 0);
}

#[test]
fn contract_frozen_payload_survives_sqlite_close_and_reopen() {
    let path = std::env::temp_dir().join(format!("bubli-contract-{}.sqlite", Uuid::new_v4()));
    let conn = test_connection_at_path(&path);
    contract_seed(&conn, Some("original-resource"));
    let id = contract_record(&conn, "UPDATED", "first.md", 10, 2);
    let first = json!(contract_stage(&conn, 3).events);
    contract_mark(&conn, json!([{"localEventId":id,"status":"FAILED"}]), 4).unwrap();
    drop(conn);
    let conn = Connection::open(&path).unwrap();
    conn.execute_batch("UPDATE local_files SET resource_id='replaced-resource'")
        .unwrap();
    assert_eq!(json!(contract_stage(&conn, 5).events), first);
    drop(conn);
    std::fs::remove_file(path).unwrap();
}

#[test]
fn contract_delete_failure_rolls_back_event_outbox_and_search_index() {
    let conn = test_connection();
    contract_seed(&conn, Some("original-resource"));
    conn.execute("INSERT INTO local_file_fts(local_file_id,file_name,content,local_path) VALUES('contract-file','original.md','keep searchable text','/contract/original.md')",[]).unwrap();
    conn.execute_batch("CREATE TRIGGER contract_fail_index BEFORE UPDATE ON local_files BEGIN SELECT RAISE(ABORT,'index unavailable'); END;").unwrap();
    assert!(record_watch_path_delete(
        &conn,
        "contract-folder",
        "original.md",
        "/contract/original.md",
        2
    )
    .is_err());
    assert_eq!(contract_count(&conn, "local_file_events"), 0);
    assert_eq!(contract_count(&conn, "local_sync_outbox"), 0);
    assert_eq!(contract_count(&conn, "local_file_fts"), 1);
}

#[test]
fn contract_binding_failure_keeps_waiting_payload_unbound() {
    let conn = test_connection();
    contract_seed(&conn, None);
    let id = contract_record(&conn, "UPDATED", "waiting.md", 20, 2);
    let before = contract_outbox(&conn, &id);
    conn.execute_batch("UPDATE local_files SET resource_id='registered-resource'; CREATE TRIGGER contract_fail_stage BEFORE UPDATE ON local_files BEGIN SELECT RAISE(ABORT,'index unavailable'); END;").unwrap();
    assert!(stage_local_file_events_for_sync_for_conn(&conn, None, 3).is_err());
    assert_eq!(contract_outbox(&conn, &id), before);
    assert_eq!(contract_status(&conn, &id).0, "PENDING");
}

#[test]
fn contract_reordered_results_are_matched_by_id() {
    let conn = test_connection();
    contract_seed(&conn, None);
    conn.execute("INSERT INTO local_files(id,local_folder_id,file_name,local_path,size_bytes,sync_status,updated_at) VALUES('other-file','contract-folder','other.md','/contract/other.md',20,'LOCAL_ONLY',1)",[]).unwrap();
    let first = contract_record(&conn, "CREATED", "first.md", 10, 2);
    record_event(
        &conn,
        "contract-folder",
        Some("other-file"),
        "CREATED",
        "other.md",
        "/contract/other.md",
        None,
        20,
        None,
        3,
    )
    .unwrap();
    let second: String = conn
        .query_row(
            "SELECT id FROM local_file_events WHERE local_file_id='other-file'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(contract_stage(&conn, 4).events.len(), 2);
    contract_mark(
        &conn,
        json!([
            {"localEventId":second,"status":"SYNCED","resourceId":"other-resource"},
            {"localEventId":first,"status":"SYNCED","resourceId":"first-resource"}
        ]),
        5,
    )
    .unwrap();
    assert_eq!(
        conn.query_row(
            "SELECT resource_id FROM local_files WHERE id='contract-file'",
            [],
            |row| row.get::<_, String>(0)
        )
        .unwrap(),
        "first-resource"
    );
    assert_eq!(
        conn.query_row(
            "SELECT resource_id FROM local_files WHERE id='other-file'",
            [],
            |row| row.get::<_, String>(0)
        )
        .unwrap(),
        "other-resource"
    );
}

#[test]
fn contract_same_file_rejection_stays_conflict_when_reindexed_again() {
    let conn = test_connection();
    let folder = std::env::temp_dir().join(format!("bubli-contract-{}", Uuid::new_v4()));
    std::fs::create_dir_all(&folder).unwrap();
    let file = folder.join("contract.md");
    std::fs::write(&file, "initial").unwrap();
    conn.execute("INSERT INTO managed_folders(id,name,path,status,sync_enabled,created_at,updated_at) VALUES('contract-folder','Contract',?1,'ACTIVE',1,1,1)",params![folder.to_string_lossy()]).unwrap();
    scan_managed_folder_for_conn(
        &conn,
        ManagedFolderCommandInput {
            local_folder_id: "contract-folder".into(),
        },
    )
    .unwrap();
    let stage = contract_stage(&conn, 2);
    let id = stage.events[0].local_event_id.clone();
    let file_id = stage.events[0].local_file_id.clone().unwrap();
    contract_mark(
        &conn,
        json!([{"localEventId":id,"status":"REJECTED","reason":"PAYLOAD_MISMATCH"}]),
        3,
    )
    .unwrap();
    std::fs::write(&file, "new content after rejection").unwrap();
    assert!(reindex_file_for_conn(&conn, &file_id, 4).unwrap().changed);
    assert_eq!(
        conn.query_row("SELECT sync_status FROM local_files", [], |row| row
            .get::<_, String>(0))
            .unwrap(),
        "CONFLICT"
    );
    assert!(contract_stage(&conn, 5).events.is_empty());
    std::fs::remove_dir_all(folder).unwrap();
}

#[test]
#[ignore = "explicit real HTTP session and Node helper required"]
fn contract_live_http_roundtrip() {
    use std::process::Command;
    assert_eq!(std::env::var("BUBLI_CONTRACT_LIVE").as_deref(), Ok("1"));
    let helper = std::env::var("BUBLI_CONTRACT_LIVE_HELPER").expect("absolute helper path");
    assert!(Path::new(&helper).is_absolute() && Path::new(&helper).is_file());
    let folder = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("contract-evidence")
        .join("live")
        .join(Uuid::new_v4().to_string());
    std::fs::create_dir_all(&folder).unwrap();
    let conn = test_connection_at_path(&folder.join("local.sqlite3"));
    let managed = folder.join("files");
    std::fs::create_dir_all(&managed).unwrap();
    let file = managed.join("contract-live.md");
    conn.execute("INSERT INTO managed_folders(id,name,path,status,sync_enabled,created_at,updated_at) VALUES('contract-folder','Contract',?1,'ACTIVE',1,1,1)",params![managed.to_string_lossy()]).unwrap();
    let mut observed_resource = None;
    let mut previous_sequence = 0;
    for (step, event_type, size) in [(1, "CREATED", 10), (2, "UPDATED", 20), (3, "UPDATED", 30)] {
        std::fs::write(&file, vec![b'a'; size as usize]).unwrap();
        scan_managed_folder_for_conn(
            &conn,
            ManagedFolderCommandInput {
                local_folder_id: "contract-folder".into(),
            },
        )
        .unwrap();
        let stage = contract_stage(&conn, step * 10 + 1);
        assert_eq!(stage.events.len(), 1);
        let id = stage.events[0].local_event_id.clone();
        assert_eq!(stage.events[0].event_type, event_type);
        assert_eq!(stage.events[0].file_size_bytes, Some(size));
        assert!(stage.events[0].local_sequence > previous_sequence);
        previous_sequence = stage.events[0].local_sequence;
        let request = json!({"events":stage.events}).to_string();
        let input_path = folder.join(format!("request-{step}.json"));
        let output_path = folder.join(format!("response-{step}.json"));
        std::fs::write(&input_path, &request).unwrap();
        let response =
            Command::new(std::env::var("BUBLI_CONTRACT_NODE").unwrap_or_else(|_| "node".into()))
                .arg(&helper)
                .arg(&input_path)
                .arg(&output_path)
                .output()
                .unwrap();
        assert!(
            response.status.success(),
            "{}",
            String::from_utf8_lossy(&response.stderr)
        );
        let mut results: serde_json::Value =
            serde_json::from_slice(&std::fs::read(output_path).unwrap()).unwrap();
        for result in results["results"].as_array_mut().expect("result array") {
            if result["status"] == "FAILED" && result["retryable"] == false {
                result["status"] = json!("REJECTED");
            }
            if let Some(code) = result.get("errorCode").cloned() {
                result["reason"] = code;
            }
        }
        let mark: LocalFileEventsMarkSyncedInput = serde_json::from_value(results).unwrap();
        assert_eq!(mark.results.len(), 1);
        assert_eq!(mark.results[0].local_event_id, id);
        assert_eq!(mark.results[0].status, "SYNCED");
        let resource = mark.results[0]
            .resource_id
            .clone()
            .expect("actual registered resource ID");
        if let Some(previous) = &observed_resource {
            assert_eq!(previous, &resource);
        } else {
            observed_resource = Some(resource);
        }
        mark_local_file_events_synced_for_conn(&conn, mark, step * 10 + 2).unwrap();
        assert_eq!(contract_status(&conn, &id).0, "SYNCED");
        assert_eq!(contract_outbox(&conn, &id).0, "SENT");
    }
    assert!(contract_stage(&conn, 99).events.is_empty());
    assert_eq!(contract_count(&conn, "local_sync_outbox"), 3);
    let final_file: (i64, String, String) = conn
        .query_row(
            "SELECT size_bytes,resource_id,sync_status FROM local_files",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap();
    assert_eq!(
        final_file,
        (30, observed_resource.unwrap(), "SYNCED".into())
    );
    println!("real HTTP/SQLite evidence: {}", folder.display());
}
