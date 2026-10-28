#[test]
fn queue_old_database_migration_preserves_old_requests() {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch(TEST_SCHEMA_SQL).unwrap();
    conn.execute("INSERT INTO local_sync_outbox(id,idempotency_key,operation,payload_json,status,created_at,updated_at) VALUES('old','old-key','local_file_event','{}','PENDING',1,1)", []).unwrap();
    crate::local_db::migrate_file_sync_outbox(&conn).unwrap();
    crate::local_db::migrate_file_sync_outbox(&conn).unwrap();
    let row: (i64, Option<i64>) = conn.query_row("SELECT payload_sealed,next_retry_at FROM local_sync_outbox WHERE id='old'", [], |row| Ok((row.get(0)?,row.get(1)?))).unwrap();
    assert_eq!(row, (1, None));
}

#[test]
fn queue_replacement_failure_rolls_back_new_event_and_keeps_old_payload() {
    let conn = test_connection();
    contract_seed(&conn, Some("resource"));
    let id = contract_record(&conn, "UPDATED", "first.md", 10, 1);
    let payload = contract_outbox(&conn, &id).1;
    conn.execute_batch("CREATE TRIGGER fail_queue_delete BEFORE DELETE ON local_sync_outbox BEGIN SELECT RAISE(ABORT,'controlled replacement failure'); END; CREATE TRIGGER fail_queue_update BEFORE UPDATE ON local_sync_outbox BEGIN SELECT RAISE(ABORT,'controlled replacement failure'); END;").unwrap();
    assert!(record_event(&conn,"contract-folder",Some("contract-file"),"UPDATED","latest.md","/contract/original.md",Some("new"),11,Some(2),2).is_err());
    assert_eq!(contract_count(&conn, "local_file_events"), 1);
    assert_eq!(contract_count(&conn, "local_file_event_order"), 1);
    assert_eq!(contract_outbox(&conn, &id).1, payload);
    assert!(conn.is_autocommit());
}

#[test]
fn queue_unknown_legacy_and_failed_requests_are_never_merged() {
    let conn = test_connection();
    contract_seed(&conn, Some("resource"));
    let old = contract_record(&conn, "UPDATED", "legacy.md", 10, 1);
    conn.execute("UPDATE local_sync_outbox SET payload_sealed=1", []).unwrap();
    contract_record(&conn, "UPDATED", "new.md", 11, 2);
    assert_eq!(contract_count(&conn, "local_file_events"), 2);
    assert_eq!(contract_stage(&conn, 3).events[0].local_event_id, old);
    contract_mark(&conn, json!([{"localEventId":old,"status":"FAILED","resourceId":"resource"}]), 4).unwrap();
    let frozen = contract_outbox(&conn, &old).1;
    contract_record(&conn, "UPDATED", "newest.md", 12, 5);
    assert_eq!(contract_count(&conn, "local_file_events"), 2);
    assert_eq!(contract_outbox(&conn, &old).1, frozen);
}

#[test]
fn queue_delete_boundary_and_rejection_are_not_erased() {
    let conn = test_connection();
    contract_seed(&conn, Some("resource"));
    let earlier = contract_record(&conn, "UPDATED", "earlier.md", 10, 1);
    contract_record(&conn, "DELETED", "earlier.md", 10, 2);
    contract_record(&conn, "UPDATED", "later.md", 20, 3);
    assert_eq!(contract_count(&conn, "local_file_events"), 3);
    contract_stage(&conn, 4);
    contract_mark(&conn,json!([{"localEventId":earlier,"status":"REJECTED","resourceId":"resource"}]),5).unwrap();
    contract_record(&conn, "UPDATED", "latest.md", 21, 6);
    assert_eq!(contract_status(&conn, &earlier).0,"REJECTED");
    assert!(contract_stage(&conn, 7).events.is_empty());
}

#[test]
fn queue_different_device_snapshots_are_preserved() {
    let conn = test_connection();
    contract_seed(&conn, Some("resource"));
    let id = contract_record(&conn, "UPDATED", "first.md", 10, 1);
    conn.execute("UPDATE local_device_identity SET device_id='replacement-device'", []).unwrap();
    contract_record(&conn, "UPDATED", "latest.md", 11, 2);
    assert_eq!(contract_count(&conn, "local_file_events"), 2);
    assert!(contract_outbox(&conn, &id).1.contains("first.md"));
}
